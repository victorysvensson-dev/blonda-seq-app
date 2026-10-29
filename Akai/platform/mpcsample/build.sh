#!/bin/sh
# Cross-builds the MPC Sample binary: a static aarch64 Linux (musl) executable, no libraries needed on the device.
# Needs Zig (brew install zig, or: pip install ziglang  ->  ZIG="python3 -m ziglang").
set -e
[ -f "$(dirname "$0")/../../third_party/blonda-motor/include/blonda/motor.h" ] || { echo "blonda-motor missing: git submodule update --init"; exit 1; }
cd "$(dirname "$0")/../.."
ZIG=${ZIG:-zig}
OUT=${1:-build-mpcsample/blonda-akai}
mkdir -p "$(dirname "$OUT")"
$ZIG c++ -target aarch64-linux-musl -mcpu=cortex_a55 -static -O3 -s -std=c++17 -Wall -Wextra \
  -Iinclude -I../Core/include -Ithird_party/blonda-motor/include -Ithird_party/blonda-motor/motorer \
  ../Core/src/bris.cpp ../Core/src/drums.cpp ../Core/src/wg.cpp ../Core/src/engines.cpp ../Core/src/seq3.cpp \
  src/motor_instrument.cpp src/bris_instrument.cpp src/engine_instrument.cpp src/surface.cpp src/app.cpp src/gfx.cpp src/font5x7.cpp src/screen.cpp \
  platform/mpcsample/main.cpp -o "$OUT"
ls -l "$OUT"
