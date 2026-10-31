#!/usr/bin/env bash
set -euo pipefail
base=/srv/university-simulator
runtime=/opt/university-simulator-runtime/bin
release=${1:?Pass the dated commit release name}
[[ "$release" =~ ^20[0-9]{6}-[a-f0-9]{7,40}$ ]] || { printf 'Invalid release identifier\n' >&2; exit 1; }
target="$base/releases/$release"
[ "$(readlink -f "$target")" = "$target" ] && [ -f "$target/package-lock.json" ] && [ -f "$target/infra/ssh/preview-server.mjs" ] || { printf 'Release is outside the expected directory or incomplete\n' >&2; exit 1; }
getent passwd university-simulator >/dev/null || useradd --system --home-dir "$base/state" --shell /usr/sbin/nologin university-simulator
chgrp university-simulator "$base" "$base/releases"
chmod 0750 "$base" "$base/releases"
install -d -m 0700 -o university-simulator -g university-simulator "$base/state" "$base/state/data" "$base/state/backups"
if [ ! -f "$base/state/runtime.env" ]; then install -m 0640 -o root -g university-simulator "$target/infra/ssh/runtime.env.example" "$base/state/runtime.env"; fi
chown -R --no-dereference university-simulator:university-simulator "$target"
runuser -u university-simulator -- env PATH="$runtime:$PATH" HOME="$base/state" NPM_CONFIG_CACHE="$base/state/npm-cache" bash -e -c 'cd "$1"; npm ci --include=dev; npm run check' _ "$target"
# Keep deployed code and dependencies immutable to the application account.
chown -R --no-dereference root:university-simulator "$target"
chmod -R g+rX,g-w,o-rwx "$target"
if [ -L "$base/current" ]; then
  previous=$(readlink -f "$base/current")
  [[ "$previous" = "$base"/releases/* ]] || { printf 'Unexpected current release target\n' >&2; exit 1; }
  runuser -u university-simulator -- "$runtime/node" "$previous/infra/ssh/backup.mjs"
  printf '%s\n' "$previous" > "$base/state/previous-release.txt"
fi
ln -s "$target" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
for unit in university-simulator-api.service university-simulator-preview.service university-simulator-backup.service university-simulator-backup.timer; do install -m 0644 "$target/infra/ssh/$unit" "/etc/systemd/system/$unit"; done
systemctl daemon-reload
systemctl enable university-simulator-api.service university-simulator-preview.service university-simulator-backup.timer
systemctl restart university-simulator-api.service
systemctl restart university-simulator-preview.service
systemctl start university-simulator-backup.timer
for attempt in $(seq 1 30); do
  if curl --silent --fail http://127.0.0.1:33101/api/v1/health >/dev/null && curl --silent --fail http://127.0.0.1:33173/healthz >/dev/null; then
    printf 'Private release active: %s\n' "$target"
    exit 0
  fi
  sleep 1
done
printf 'Release did not become healthy. State is preserved; inspect the two University Simulator units.\n' >&2
exit 1
