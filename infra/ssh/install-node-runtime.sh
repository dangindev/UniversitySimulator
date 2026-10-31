#!/usr/bin/env bash
set -euo pipefail
# Dedicated application runtime, without replacing Node used by other projects.
runtime=/opt/university-simulator-runtime
image=node:24.14.0-bookworm-slim
if [ -x "$runtime/bin/node" ]; then
  [ "$("$runtime/bin/node" --version)" = v24.14.0 ] || { printf 'Unexpected runtime version\n' >&2; exit 1; }
  exit 0
fi
install -d -m 0755 "$runtime/bin" "$runtime/lib/node_modules"
runtime_container=$(docker create --entrypoint /bin/true "$image")
trap 'docker rm -v "$runtime_container" >/dev/null' EXIT
docker cp "$runtime_container:/usr/local/bin/node" "$runtime/bin/node"
docker cp "$runtime_container:/usr/local/lib/node_modules/npm" "$runtime/lib/node_modules/npm"
ln -s ../lib/node_modules/npm/bin/npm-cli.js "$runtime/bin/npm"
ln -s ../lib/node_modules/npm/bin/npx-cli.js "$runtime/bin/npx"
"$runtime/bin/node" --version
PATH="$runtime/bin:$PATH" "$runtime/bin/npm" --version
docker image inspect --format '{{index .RepoDigests 0}}' "$image" > "$runtime/source-image.txt"
