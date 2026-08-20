#!/usr/bin/env bash
# Poor-man's SSG for this TanStack Start app.
# nitro's own prerenderer is broken under the vite builder (see report), so we
# boot the built node server and curl every route into .output/public/.
set -euo pipefail

ROOT="${1:-$PWD}"
PORT="${PORT:-3179}"
ROUTES=("/")            # add more routes here as the app grows

cd "$ROOT"

# 1. Build with a *server* preset (node-server writes .output/public + .output/server)
npm run build

# 2. Boot the built server
PORT="$PORT" node .output/server/index.mjs &
SRV=$!
trap 'kill "$SRV" 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then break; fi
  sleep 0.25
done

# 3. Harvest each route as static HTML into the public dir
for route in "${ROUTES[@]}"; do
  if [ "$route" = "/" ]; then out=".output/public/index.html"
  else out=".output/public${route%/}/index.html"; mkdir -p "$(dirname "$out")"
  fi
  code=$(curl -s -o "$out" -w '%{http_code}' "http://127.0.0.1:$PORT$route")
  [ "$code" = "200" ] || { echo "FAILED $route -> HTTP $code" >&2; exit 1; }
  echo "harvested $route -> $out ($(wc -c < "$out") bytes)"
done

# 4. SPA fallback so deep links don't 404 on a static host
cp .output/public/index.html .output/public/404.html

echo "static site ready: $ROOT/.output/public"
