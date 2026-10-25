#!/usr/bin/env bash
# Authorised Oracle drill only: read production, restore with no network, retain
# an encrypted original backup. Never start workers or route customers here.
set -euo pipefail
umask 077
if [ "$(id -u)" != 0 ] || [ "$#" != 1 ] || [ ! -f "$1" ]; then
  echo 'Usage (root on Oracle): verify-recovery.sh /private/path/restored-application.mjs' >&2
  exit 2
fi
exec 9>/run/lock/du-platform-recovery.lock
flock -n 9 || { echo 'Another DU recovery drill is running.' >&2; exit 1; }
probe=$(realpath "$1")
source_image=$(docker inspect --format '{{.Image}}' du-platform-app-1)
image='mysql@sha256:76f0358884cb92d9a086d24e5671c38048d3fef40f2588703d73eb55392d6b69'
work=$(mktemp -d /var/tmp/du-recovery-XXXXXXXX)
restore="du-recovery-$(date -u +%Y%m%d%H%M%S)"
cleanup() { docker rm -fv "${restore}-app" "$restore" >/dev/null 2>&1 || true; rm -rf -- "$work"; }
trap cleanup EXIT
mkdir "$work/client"
docker exec -i du-platform-app-1 node --input-type=module > "$work/env.json" <<'JS'
import fs from 'node:fs'; const e=process.env,u=e.AIVEN_MYSQL_URL?new URL(e.AIVEN_MYSQL_URL):null;
console.log(JSON.stringify({host:u?.hostname||e.AIVEN_MYSQL_HOST,port:Number(u?.port||e.AIVEN_MYSQL_PORT||3306),user:u?decodeURIComponent(u.username):e.AIVEN_MYSQL_USER,password:u?decodeURIComponent(u.password):e.AIVEN_MYSQL_PASSWORD,database:u?decodeURIComponent(u.pathname.slice(1)):e.AIVEN_MYSQL_DATABASE,ca:e.AIVEN_CA_CERT||fs.readFileSync(e.AIVEN_CA_CERT_PATH,'utf8')}));
JS
python3 - "$work" <<'PY'
import json,sys,pathlib,secrets,re
p=pathlib.Path(sys.argv[1]);e=json.loads((p/'env.json').read_text())
def q(s): return '"'+str(s).replace('\\','\\\\').replace('"','\\"').replace('\n','\\n').replace('\r','\\r')+'"'
assert re.fullmatch(r'[a-zA-Z0-9_]+',e['database'])
(p/'database').write_text(e['database']);(p/'client'/'ca.pem').write_text(e['ca'])
(p/'client'/'source.cnf').write_text('[client]\nhost='+q(e['host'])+'\nport='+str(e['port'])+'\nuser='+q(e['user'])+'\npassword='+q(e['password'])+'\nssl-mode=VERIFY_IDENTITY\nssl-ca=/run/du-client/ca.pem\n')
pw=secrets.token_hex(32);(p/'client'/'restore-password').write_text(pw);(p/'client'/'restore.cnf').write_text('[client]\nuser=root\npassword='+q(pw)+'\n')
(p/'env.json').unlink()
PY
database=$(cat "$work/database")
client=(docker run --rm --user 0:0 --memory 256m --cpus 0.5 --mount "type=bind,src=$work/client,dst=/run/du-client,readonly" --entrypoint mysqldump "$image" --defaults-extra-file=/run/du-client/source.cnf --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --hex-blob --column-statistics=0 --skip-comments)
"${client[@]}" --compact --no-create-info --skip-extended-insert --order-by-primary "$database" > "$work/before.sql"
"${client[@]}" --routines --events --triggers "$database" > "$work/backup.sql"
"${client[@]}" --compact --no-create-info --skip-extended-insert --order-by-primary "$database" > "$work/after.sql"
cmp -s "$work/before.sql" "$work/after.sql" || { echo 'Source changed during backup; retry required.' >&2; exit 1; }
"${client[@]}" --compact --no-data "$database" > "$work/source-schema.sql"
python3 - "$work/source-schema.sql" <<'PY'
import pathlib,re,sys
schema=pathlib.Path(sys.argv[1]).read_text()
tables=schema.count('CREATE TABLE ')
assert tables > 0 and len(re.findall(r'ENGINE=InnoDB\b', schema)) == tables, 'Transactional InnoDB tables required'
PY
docker run -d --name "$restore" --network none --memory 768m --cpus 1 --mount "type=bind,src=$work/client,dst=/run/du-client,readonly" -e MYSQL_ROOT_PASSWORD_FILE=/run/du-client/restore-password -e MYSQL_DATABASE=du_restore_test "$image" --skip-log-bin --event-scheduler=OFF --innodb-buffer-pool-size=64M --max-connections=10 >/dev/null
for n in $(seq 1 60); do
 if docker exec "$restore" mysql --defaults-extra-file=/run/du-client/restore.cnf -N -B -e "SELECT 1" >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec "$restore" mysql --defaults-extra-file=/run/du-client/restore.cnf -N -B -e 'SELECT 1' >/dev/null
docker exec -i "$restore" mysql --defaults-extra-file=/run/du-client/restore.cnf du_restore_test < "$work/backup.sql"
docker exec "$restore" mysqldump --defaults-extra-file=/run/du-client/restore.cnf --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --hex-blob --column-statistics=0 --skip-comments --compact --no-create-info --skip-extended-insert --order-by-primary du_restore_test > "$work/restored-data.sql"
docker exec "$restore" mysqldump --defaults-extra-file=/run/du-client/restore.cnf --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --hex-blob --column-statistics=0 --skip-comments --compact --no-data du_restore_test > "$work/restored-schema.sql"
cmp -s "$work/before.sql" "$work/restored-data.sql" || { echo 'Restored row comparison failed.' >&2; exit 1; }
cmp -s "$work/source-schema.sql" "$work/restored-schema.sql" || { echo 'Restored schema comparison failed.' >&2; exit 1; }
# Verify a write and rollback in the restored database only; the live database is read-only throughout.
docker exec "$restore" mysql --defaults-extra-file=/run/du-client/restore.cnf du_restore_test -N -B -e 'CREATE TABLE du_recovery_probe (id INT PRIMARY KEY) ENGINE=InnoDB; START TRANSACTION; INSERT INTO du_recovery_probe VALUES (1); ROLLBACK; SELECT COUNT(*) FROM du_recovery_probe; DROP TABLE du_recovery_probe;' > "$work/probe-count"
test "$(cat "$work/probe-count")" = 0
cp "$probe" "$work/app.mjs"
chmod 644 "$work/app.mjs"
python3 - "$work" <<'PYENV'
import pathlib,sys,secrets
p=pathlib.Path(sys.argv[1]);password=(p/'client'/'restore-password').read_text()
(p/'app.env').write_text('NODE_ENV=test\nMYSQL_HOST=127.0.0.1\nMYSQL_PORT=3306\nMYSQL_USER=root\nMYSQL_DATABASE=du_restore_test\nMYSQL_PASSWORD='+password+'\nJWT_SECRET='+secrets.token_hex(48)+'\nAPP_BASE_URL=https://restore.example.test\nFROM_EMAIL=fixture@example.test\nADMIN_EMAILS=recovery@example.test\nSHOP_COMMERCIAL_MODE=observe\n')
PYENV
docker run --rm --name "${restore}-app" --network "container:$restore" --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges --memory 256m --cpus 0.5 --env-file "$work/app.env" --mount "type=bind,src=$work/app.mjs,dst=/app/du-restored-app.mjs,readonly" --entrypoint node "$source_image" /app/du-restored-app.mjs > "$work/app-report.json"
cat "$work/app-report.json"
install -d -m 700 /etc/du-platform-recovery /var/backups/du-platform
key=/etc/du-platform-recovery/backup-passphrase
if [ ! -f "$key" ]; then head -c 48 /dev/urandom | base64 > "$key"; chmod 600 "$key"; fi
stamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="/var/backups/du-platform/$stamp.sql.gpg"
gpg --batch --yes --pinentry-mode loopback --passphrase-file "$key" --symmetric --cipher-algo AES256 --output "$archive" "$work/backup.sql"
gpg --batch --pinentry-mode loopback --passphrase-file "$key" --decrypt "$archive" 2>/dev/null | cmp -s - "$work/backup.sql"
python3 - "$work" "$stamp" "$archive" <<'PY'
import pathlib,hashlib,json,sys
p=pathlib.Path(sys.argv[1]);data=p.joinpath('before.sql').read_bytes();schema=p.joinpath('source-schema.sql').read_bytes()
r={'timestampUtc':sys.argv[2],'source':'production Aiven read-only logical snapshot','image':'mysql@sha256:76f0358884cb92d9a086d24e5671c38048d3fef40f2588703d73eb55392d6b69','tables':schema.count(b'CREATE TABLE '),'rows':sum(l.startswith(b'INSERT INTO ') for l in data.splitlines()),'sourceStableDuringDump':True,'schemaAndRowHashesMatch':True,'schemaSha256':hashlib.sha256(schema).hexdigest(),'rowsSha256':hashlib.sha256(data).hexdigest(),'isolatedNetwork':'none','restoredTransactionRollback':True,'encryptedArchiveRoundTrip':True,'archiveBytes':pathlib.Path(sys.argv[3]).stat().st_size,'liveWrites':False,'providerPitrRestoreTested':False,'applicationRecoveryTested':True,'applicationChecks':json.loads(p.joinpath('app-report.json').read_text())}
out=json.dumps(r,indent=2);pathlib.Path('/var/backups/du-platform/'+sys.argv[2]+'.report.json').write_text(out+'\n');print(out)
PY
