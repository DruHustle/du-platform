#!/usr/bin/env bash
# Root-owned entrypoint on the Oracle VM. Receives git archive's tar.gz on stdin.
set -Eeuo pipefail
umask 077
revision=${1:-}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || { echo 'A full commit SHA is required.' >&2; exit 2; }
[[ $(uname -m) == aarch64 ]] || { echo 'Expected the ARM64 Oracle VM.' >&2; exit 2; }
root=/opt/du-platform
cd "$root"
# Keep Docker's client state writable inside the service's restricted filesystem.
export DOCKER_CONFIG="$root/.docker-ci"
mkdir -p "$DOCKER_CONFIG"
exec 9>/var/lock/du-platform-deploy.lock
flock -w 900 9
image="du-platform:oracle-$revision"
# Docker handles the archive as build context; it is never extracted on the host.
docker build --build-arg "APP_REVISION=$revision" -f deploy/oracle/Dockerfile -t "$image" -
actual=$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image")
[[ "$actual" == "$revision" ]] || { echo 'Image revision mismatch.' >&2; exit 1; }
backup=$(mktemp -d "$root/release-backup-$revision-XXXXXX")
cp compose.yaml "$backup/compose.yaml"
cp compose.runtime.json "$backup/compose.runtime.json"
compose=(docker compose -f compose.yaml -f compose.runtime.json)
rollback() {
  local code=${1:-$?}
  trap - ERR
  echo 'DU release failed; restoring the previous DU manifests.' >&2
  cp "$backup/compose.yaml" compose.yaml
  cp "$backup/compose.runtime.json" compose.runtime.json
  if ! "${compose[@]}" up -d --no-deps --wait --wait-timeout 180 app; then
    echo 'ROLLBACK FAILED: manual recovery is required.' >&2
  fi
  exit "$code"
}
trap rollback ERR
trap 'rollback 129' HUP
trap 'rollback 130' INT
trap 'rollback 143' TERM
python3 - "$image" "$revision" <<'PY'
import json, os, sys, tempfile
image, revision = sys.argv[1:]
for path in ['compose.yaml', 'compose.runtime.json']:
    with open(path) as source: data = json.load(source)
    app = data['services']['app']
    if path == 'compose.yaml':
        if data.get('name') != 'du-platform': raise RuntimeError('Unexpected Compose project')
        app['image'] = image
    else:
        environment = app.setdefault('environment', {})
        if not isinstance(environment, dict): raise RuntimeError('Expected JSON environment map')
        environment['APP_REVISION'] = revision
    fd, temporary = tempfile.mkstemp(dir='.', prefix='.du-release-')
    with os.fdopen(fd, 'w') as target: json.dump(data, target, indent=2); target.write('\n')
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)
PY
"${compose[@]}" config --quiet
"${compose[@]}" up -d --no-deps --wait --wait-timeout 180 app
curl --fail --silent --show-error --max-time 20 http://127.0.0.1:11000/api/ping |
  python3 -c 'import json,sys; actual=json.load(sys.stdin).get("commit"); assert actual == sys.argv[1], "Published revision mismatch"' "$revision"
curl --fail --silent --show-error --max-time 20 http://127.0.0.1:11000/api/health/db >/dev/null
# Verify ingress as well as loopback, before reporting a successful release.
curl --fail --silent --show-error --max-time 25 https://du-api.152-70-22-84.sslip.io/api/ping |
  python3 -c 'import json,sys; assert json.load(sys.stdin).get("commit") == sys.argv[1], "Ingress revision mismatch"' "$revision"
curl --fail --silent --show-error --max-time 25 https://du-api.152-70-22-84.sslip.io/api/health/db >/dev/null
curl --fail --silent --show-error --max-time 25 https://du-api.152-70-22-84.sslip.io/api/ai/ready |
  python3 -c 'import json,sys; assert json.load(sys.stdin).get("ready") is True, "Onesa is not ready"'
trap - ERR HUP INT TERM
echo "Oracle DU release verified: $revision"
