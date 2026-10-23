#!/usr/bin/env bash
# Forced command for the dedicated, restricted CI SSH key. No shell access.
set -euo pipefail
if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^du-deploy\ ([a-f0-9]{40})$ ]]; then
  exec sudo -n /usr/local/sbin/du-platform-deploy "${BASH_REMATCH[1]}"
fi
echo 'This key only permits a DU deployment of a full commit SHA.' >&2
exit 2
