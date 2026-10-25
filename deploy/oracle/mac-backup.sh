#!/usr/bin/env bash
# Root-owned adapter: encrypted archive bytes and redacted metadata only.
set -euo pipefail
umask 077
test "$(id -u)" = 0
case "${1:-}" in
  create)
    test "$#" = 1
    work=$(mktemp /var/tmp/du-backup-status-XXXXXXXX)
    trap 'rm -f -- "$work"' EXIT
    if ! bash /usr/local/lib/du-platform-recovery/verify-recovery.sh /usr/local/lib/du-platform-recovery/restored-application.mjs > "$work" 2>&1; then
      echo 'DU snapshot/isolated restore failed; prior archives retained.' >&2
      exit 1
    fi
    "$0" inventory
    ;;
  inventory)
    test "$#" = 1
    python3 - <<'PY'
import pathlib,json,hashlib,re
root=pathlib.Path('/var/backups/du-platform');rows=[]
for p in sorted(root.glob('*.sql.gpg')):
 if p.is_symlink() or not p.is_file() or not re.fullmatch(r'\d{8}T\d{6}Z\.sql\.gpg',p.name):raise SystemExit('Unsafe archive entry')
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
 report=root/(p.name.removesuffix('.sql.gpg')+'.report.json')
 evidence=json.loads(report.read_text()) if report.is_file() and not report.is_symlink() else None
 rows.append({'name':p.name,'size':p.stat().st_size,'sha256':h.hexdigest(),'recoveryEvidence':evidence})
print(json.dumps(rows))
PY
    ;;
  read)
    test "$#" = 2
    [[ "$2" =~ ^[0-9]{8}T[0-9]{6}Z\.sql\.gpg$ ]]
    archive="/var/backups/du-platform/$2"
    test -f "$archive" && test ! -L "$archive"
    cat -- "$archive"
    ;;
  *) echo 'Usage: du-platform-mac-backup create|inventory|read TIMESTAMP.sql.gpg' >&2; exit 2 ;;
esac
