#!/bin/sh
# Hämtar Abletons LinkKit till Shell/Vendor/LinkKit (ligger inte i git: licensen tillåter inte att SDK:n sprids,
# och repot är publikt). Kör en gång innan `cd Shell && xcodegen`.
set -e
VER="${1:-4.1.3}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/Shell/Vendor/LinkKit"
if [ -f "$DIR/VERSION" ] && [ "$(cat "$DIR/VERSION")" = "$VER" ]; then echo "LinkKit $VER finns redan"; exit 0; fi
TMP="$(mktemp -d)"
curl -fsSL -o "$TMP/lk.zip" "https://github.com/Ableton/LinkKit/releases/download/LinkKit-$VER/LinkKit.zip"
mkdir -p "$TMP/x" && (cd "$TMP/x" && unzip -q ../lk.zip)
SRC="$(dirname "$(find "$TMP/x" -name LinkKit.xcframework -maxdepth 3 | head -1)")"
rm -rf "$DIR" && mkdir -p "$DIR"
cp -R "$SRC/LinkKit.xcframework" "$SRC/LinkKitResources.bundle" "$DIR/"
[ -f "$SRC/LICENSE.md" ] && cp "$SRC/LICENSE.md" "$DIR/"
echo "$VER" > "$DIR/VERSION"
rm -rf "$TMP"
echo "LinkKit $VER -> $DIR"
