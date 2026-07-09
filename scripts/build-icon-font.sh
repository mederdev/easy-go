#!/usr/bin/env bash
#
# Regenerate the self-hosted Material Symbols Outlined SUBSET used by both the
# admin and client apps (apps/*/public/fonts/material-symbols.woff2).
#
# The subset only contains the icons the apps actually use, keyed by ligature
# name. WHENEVER YOU ADD A NEW ICON to either app, add its name to icons.txt
# (next to this script) and re-run this script — otherwise the new icon renders
# as its literal ligature text (e.g. the word "dashboard") instead of a glyph.
#
# We ask Google Fonts to build the subset for us via the css2 `icon_names`
# endpoint: it returns a correct, tiny (~8KB) ligature font. (Subsetting the
# variable font locally with pyftsubset does NOT work for icon fonts — the
# ligature closure over shared letters drags in the whole 3.5MB glyph set.)
#
# Requirements: curl. Needs internet.
#
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Comma-separated icon names for the css2 endpoint.
names="$(paste -sd, "$here/icons.txt")"
ua='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

echo "→ requesting subset for $(wc -l < "$here/icons.txt" | tr -d ' ') icons…"
curl -sS -H "User-Agent: $ua" \
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=${names}&display=block" \
  -o "$work/ms.css"

kit="$(grep -oE 'url\(https://fonts.gstatic.com[^)]*\)' "$work/ms.css" | sed -E 's/url\((.*)\)/\1/')"
[ -n "$kit" ] || { echo "✗ could not find woff2 URL in Google's CSS response" >&2; exit 1; }
curl -sS -o "$work/material-symbols.woff2" "$kit"

for app in admin client; do
  dest="$root/apps/$app/public/fonts/material-symbols.woff2"
  cp "$work/material-symbols.woff2" "$dest"
  echo "✓ wrote $dest ($(wc -c < "$dest" | tr -d ' ') bytes)"
done

echo "Done."
