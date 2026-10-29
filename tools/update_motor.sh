#!/bin/bash
# Copies BLONDA motor (victorysvensson-dev/blonda-motor) at a tag into External/blonda-motor.
# The motor repo is the single source of truth for these files — never edit the copies here.
#   tools/update_motor.sh v0.1.0 [path to a blonda-motor clone]
set -e
TAG=${1:?tag, e.g. v0.1.0}
SRC=${2:-../blonda-motor}
cd "$(dirname "$0")/.."
git -C "$SRC" fetch -q --depth 1 origin "refs/tags/$TAG:refs/tags/$TAG" 2>/dev/null || true
DST=External/blonda-motor
rm -rf "$DST"; mkdir -p "$DST"
git -C "$SRC" archive "$TAG" include/blonda/motor.h include/blonda/gen_runtime.h motorer/bris/bris.h motorer/bris/bris_gen.h motorer/bris/bris_ljud.h README.md | tar -x -C "$DST"
echo "$TAG $(git -C "$SRC" rev-list -n1 "$TAG")" > "$DST/VERSION"
echo "BLONDA motor $TAG -> $DST"
