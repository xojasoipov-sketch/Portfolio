#!/usr/bin/env bash
# Poor-man's SSG for this TanStack Start app.
# nitro's own prerenderer is broken under the vite builder (see report), so we
# boot the built node server and curl every route into .output/public/.
set -euo pipefail

ROOT="${1:-$PWD}"
PORT="${PORT:-3179}"
ROUTES=("/" "/xizmatlar" "/cv" "/demo")
# Prerendered so a direct visit resolves (GitHub Pages has no server-side
# routing, and 404.html -- see step 4 below -- ships with no <script>, so
# there is no client-side fallback to catch an unlisted path). Kept out of
# ROUTES itself because that array also drives the sitemap in step 5, and
# this page carries its own noindex meta and a robots.txt disallow on top of
# the real access control, which is the admin key the page gates on.
EXTRA_ROUTES=("/admin")

cd "$ROOT"

# 1. Build with a *server* preset (node-server writes .output/public + .output/server)
npm run build

# 2. Boot the built server.
#
# Refuse to start if something is already listening: a leftover server from an
# earlier run keeps this one from binding, and every harvest below would then
# silently scrape THAT process instead -- serving a stale build whose lazily
# imported route chunks no longer exist on disk, which yields a valid-looking
# but empty HTML shell. Failing loudly here is much cheaper than shipping it.
if curl -sf -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null; then
  echo "FAILED: port $PORT is already in use; refusing to harvest from it." >&2
  echo "Stop the process on that port (or set PORT=<free port>) and retry." >&2
  exit 1
fi

PORT="$PORT" node .output/server/index.mjs &
SRV=$!
trap 'kill "$SRV" 2>/dev/null || true' EXIT

ready=0
for _ in $(seq 1 40); do
  # Only accept the server we just started; if it died (e.g. it lost a bind
  # race) do not fall through to harvesting whatever else answers.
  if ! kill -0 "$SRV" 2>/dev/null; then
    echo "FAILED: the build server exited before it became ready." >&2
    exit 1
  fi
  if curl -sfL -o /dev/null "http://127.0.0.1:$PORT/"; then ready=1; break; fi
  sleep 0.25
done
if [ "$ready" -ne 1 ]; then
  echo "FAILED: the build server never became ready on port $PORT." >&2
  exit 1
fi

# 3. Harvest each route as static HTML into the public dir
for route in "${ROUTES[@]}" "${EXTRA_ROUTES[@]}"; do
  if [ "$route" = "/" ]; then out=".output/public/index.html"
  else out=".output/public${route%/}/index.html"; mkdir -p "$(dirname "$out")"
  fi
  # -L is required: when SITE_BASE is a subpath (e.g. /Portfolio/ on GitHub
  # Pages) the server answers "/" with a 307 to the base, and without
  # following it we would harvest the redirect body instead of the page.
  code=$(curl -sL -o "$out" -w '%{http_code}' "http://127.0.0.1:$PORT$route")
  [ "$code" = "200" ] || { echo "FAILED $route -> HTTP $code" >&2; exit 1; }
  size=$(wc -c < "$out")
  # Guard against harvesting an error or redirect stub that happens to be 200.
  [ "$size" -gt 2000 ] || { echo "FAILED $route -> only $size bytes, not a real page" >&2; exit 1; }
  echo "harvested $route -> $out ($size bytes)"
done

# 4. 404 page. GitHub Pages serves this (with a real 404 status) for any path
#    it has no file for. Harvesting an actually-missing route renders the
#    branded not-found UI into it; copying index.html instead would flash the
#    whole homepage before the client router corrected itself.
#
#    The scripts are then stripped, which is what makes the page survive being
#    served from the wrong URL. The harvest is a snapshot taken at
#    /__not-found__, but Pages serves that same file for /anything-else, so
#    rehydrating it throws TanStack Router's "Invariant failed" and React
#    unmounts the tree -- a blank black screen where the branded 404 had just
#    rendered. Nothing on this page needs JavaScript: both buttons are real
#    anchors with absolute hrefs, so as static HTML + CSS it is complete.
notfound=$(curl -sL --max-time 20 "http://127.0.0.1:$PORT/__not-found__" || true)
if [ "${#notfound}" -gt 2000 ]; then
  printf '%s' "$notfound" \
    | python3 -c 'import re,sys; sys.stdout.write(re.sub(r"<script\b.*?</script>", "", sys.stdin.read(), flags=re.S|re.I))' \
    > .output/public/404.html
  # A page that still carries a <script> would blank out on the visitor, so
  # fail the build rather than ship it.
  if grep -qi '<script' .output/public/404.html; then
    echo "FAILED: 404.html still contains a <script>; it would blank on hydration." >&2
    exit 1
  fi
  echo "harvested 404 -> .output/public/404.html ($(wc -c < .output/public/404.html) bytes, scripts stripped)"
else
  # Fall back to the SPA shell rather than shipping no 404 page at all.
  cp .output/public/index.html .output/public/404.html
  echo "404 harvest was too small; fell back to the index shell" >&2
fi

# 5. Sitemap, generated from the same ROUTES array the harvest uses.
#
#    It used to be a hand-maintained file in public/, which had already
#    drifted: /demo was missing entirely and the two sub-routes were listed
#    without their trailing slash, so every entry pointed at a URL GitHub
#    Pages 301s away from. Deriving it here means it cannot go stale again.
SITE_URL="${SITE_URL:-https://xojasoipov-sketch.github.io/Portfolio/}"
TODAY="$(date -u +%Y-%m-%d)"
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  for route in "${ROUTES[@]}"; do
    # Trailing slash on every entry: that is the URL Pages actually serves,
    # and a sitemap should list the destination, not the redirect.
    path="${route#/}"
    [ -n "$path" ] && path="$path/"
    case "$route" in
      "/") priority="1.0" ;;
      "/xizmatlar") priority="0.9" ;;
      *) priority="0.7" ;;
    esac
    printf '  <url>\n    <loc>%s%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>%s</priority>\n  </url>\n' \
      "$SITE_URL" "$path" "$TODAY" "$priority"
  done
  echo '</urlset>'
} > .output/public/sitemap.xml
echo "generated sitemap.xml (${#ROUTES[@]} routes, lastmod $TODAY)"

echo "static site ready: $ROOT/.output/public"
