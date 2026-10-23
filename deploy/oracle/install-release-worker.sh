#!/usr/bin/env bash
# Run as root from a reviewed bundle containing this directory's release files.
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run this reviewed installer as root.' >&2; exit 2; }
source_dir=$(cd -- "$(dirname -- "$0")" && pwd)
if ! id du-release >/dev/null 2>&1; then
  useradd --system --user-group --home-dir /var/lib/du-platform-release --shell /usr/sbin/nologin du-release
fi
[[ $(id -u du-release) != 0 ]] || exit 2
install -d -o du-release -g du-release -m 0700 /var/lib/du-platform-release
install -d -o root -g root -m 0755 /usr/local/lib/du-platform-release
install -o root -g root -m 0755 "$source_dir/poll-release.py" /usr/local/lib/du-platform-release/poll-release.py
install -o root -g root -m 0755 "$source_dir/deploy.sh" /usr/local/sbin/du-platform-deploy
printf '%s\n' 'du-release ALL=(root) NOPASSWD: /usr/local/sbin/du-platform-deploy *' > /etc/sudoers.d/du-platform-release
chmod 0440 /etc/sudoers.d/du-platform-release
visudo -cf /etc/sudoers.d/du-platform-release
install -o root -g root -m 0644 "$source_dir/du-platform-release.service" /etc/systemd/system/du-platform-release.service
install -o root -g root -m 0644 "$source_dir/du-platform-release.timer" /etc/systemd/system/du-platform-release.timer
systemd-analyze verify /etc/systemd/system/du-platform-release.service /etc/systemd/system/du-platform-release.timer
systemctl daemon-reload
systemctl enable --now du-platform-release.timer
