#!/bin/bash
# Puts a new version of the web app into the SEQ.3 app: tools/sync_web.sh <path to the web app's index.html>
# The app shows exactly this file, so after this the app and the web version are the same.
set -e
src="$1"
[ -f "$src" ] || { echo "usage: tools/sync_web.sh <index.html>"; exit 1; }
dst="$(cd "$(dirname "$0")/.." && pwd)/Shell/Web/index.html"
grep -q 'class="ver">v' "$src" || { echo "that doesn't look like the SEQ.3 web app (no version found)"; exit 1; }
cp "$src" "$dst"
# the BLONDA sound pack the page loads from blonda-pack/ (pack.json + sounds) – taken along when it sits next to the page
if [ -f "$(dirname "$src")/blonda-pack/pack.json" ]; then
  rm -rf "$(dirname "$dst")/blonda-pack" && cp -R "$(dirname "$src")/blonda-pack" "$(dirname "$dst")/blonda-pack"
  echo "sound pack: $(ls "$(dirname "$dst")/blonda-pack" | wc -l | tr -d ' ') files"
fi
ver=$(grep -o 'class="ver">v[0-9a-z]*' "$dst" | head -1 | sed 's/.*>//')
num=$(echo "$ver" | tr -dc '0-9')
# the build number follows the web version
sed -i.bak "s/CURRENT_PROJECT_VERSION: \"[0-9]*\"/CURRENT_PROJECT_VERSION: \"$num\"/" "$(dirname "$dst")/../project.yml" && rm -f "$(dirname "$dst")/../project.yml.bak"
echo "SEQ.3 app now has web $ver ($(wc -c < "$dst") bytes), build $num"
