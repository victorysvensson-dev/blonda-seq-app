# BLONDA AKAI — BLONDA synths for the Akai MPC Sample (and the coming Sample Key)

The BLONDA SEQ.3 sound engines as playable instruments on the MPC Sample: pads play notes, the knobs edit
the sound, the screen shows it in the BLONDA dot-matrix style. The engines are the exact same code as
SEQ.3 (`../Core`), so a sound is the same on the iPhone, the web prototype and the MPC.

**Status:** runs on a real MPC Sample (firmware 1.3.0.12). Library, app and host pass 914 desktop tests; the
ARM binary passes its self test under emulation. Measured on the device: BRIS with 6 voices uses about 29 % of
one Cortex-A55 core. Open: occasional audio dropouts (the host logs load, slowest block and xruns per
instrument every 10 s) and optimising the heavier SEQ.3 engines for ARM (see *CPU* below).

## What is in it

| Instrument | From | Notes |
|---|---|---|
| **BRIS** | **blonda-motor** (`third_party/blonda-motor`, tag v0.1.0) | BLONDA BRIS, the Bree6-style poly: same GenExpr as the Max for Live device, 90 presets, 36 parameters on 12 pages |
| BRIS SEQ | `Core/src/bris.cpp` | SEQ.3's own 6-voice poly, 29 presets |
| MINI D | `Core/src/engines.cpp` | Model D-style, 38 parameters on 14 pages |
| SH-101 | 〃 | 25 parameters on 9 pages |
| ACID | 〃 | 303-style |
| ANALOG, SUPER, FM GLASS, PLUCK, CHIP, SUB 808 | 〃 | |

The engine instruments start from the SEQ.3 defaults ("INIT"); their web presets are not ported yet.

### The shared engine library

Engines that exist in **victorysvensson-dev/blonda-motor** come from there and nowhere else: the library is a git
submodule pinned to a tag (`git submodule update --init` after cloning; update with
`git -C Akai/third_party/blonda-motor checkout vX.Y.Z`). `src/motor_instrument.cpp` wraps any library engine as an
Akai instrument and holds only MPC presentation (knob pages, 8-character names, value labels, pad pressure ->
filter, level trim) - nothing that changes the sound. New engines are added to blonda-motor (see its CLAUDE.md),
then get a skin here.

## Layout

| Path | What |
|---|---|
| `include/akai/instrument.hpp` | The interface every instrument implements (params, pages, presets, notes). No hardware in it, so the same instrument can move to the Sample Key / Akai's SDK later |
| `src/motor_instrument.cpp` | blonda-motor engines as instruments (MPC skins: pages, names, labels) |
| `src/bris_instrument.cpp`, `src/engine_instrument.cpp` | SEQ.3's Bris and nine engines as instruments (parameter tables, pages, level trims) |
| `include/akai/surface.hpp`, `src/surface.cpp` | MPC Sample control surface: pads, buttons, knobs, encoder, LEDs, pad colours |
| `include/akai/app.hpp`, `src/app.cpp` | The instrument app: controls, latch, scales, tap tempo, lights |
| `src/screen.cpp`, `src/gfx.cpp`, `src/font5x7.cpp` | 320×240 screen with an original 5×7 dot font (Å Ä Ö included) |
| `platform/mpcsample/main.cpp` | Device host: I2S audio (44.1 kHz, 128 frames), surface MIDI, external MIDI in, DRM screen thread |
| `platform/mpcsample/build.sh` | Cross-build a static aarch64 binary with Zig |
| `platform/mpcsample/mpc.sh` | Copy to the MPC's RAM and run / self-test / stop / follow the log |
| `tools/akai_test.cpp` | Desktop tests, level survey, CPU bench, WAV and screenshot renders |

## Controls

| Control | Does |
|---|---|
| Pads | Notes (velocity; pressure opens the filter). Pad colours: yellow = root, teal = in scale |
| K1 K2 K3 | The three parameters on the page (scaled takeover: values never jump) |
| Fader | Filter cutoff (the instrument's performance parameter) |
| MAIN VOLUME | Output level |
| Encoder / SHIFT + encoder | Presets / pages · push: first page |
| B1 / B2 | Previous / next page |
| B3 / SHIFT + B3 | Next / previous instrument |
| MINUS / PLUS | Octave (bank LEDs A–H show it) · SHIFT: transpose |
| 16 LEVELS / SHIFT + 16 LEVELS | Chromatic ↔ in-key pads / next scale |
| PLAY | Latch |
| TAP TEMPO | Tempo for synced LFO and delay (LED blinks on the beat) · SHIFT: screen colours (sharp black / BLONDA) |
| ERASE | Undo edits (reload the preset) |
| STOP / SHIFT + STOP | All notes off / quit back to the MPC Sample software |
| SHIFT (held) | Shows CPU load and voices |

External MIDI (TRS in, USB from a computer) plays the current instrument too; CC 1 moves the cutoff.

## Build and test (Mac or Linux)

```sh
cmake -S Akai -B Akai/build && cmake --build Akai/build -j
./Akai/build/akai_test                  # all tests
./Akai/build/akai_test render out/      # + WAV demos and screenshots
./Akai/build/akai_test levels           # loudness survey (used for the level trims)
Akai/platform/mpcsample/build.sh        # device binary (needs Zig: brew install zig)
```

CI builds and tests all of this and uploads the device binary as the `blonda-akai-mpcsample` artifact.

## Running on the MPC Sample

Uses the community's temporary root access over USB (firmware 1.3.0.12): the MPC's own SD-card autorun
starts an SSH server that listens only on the USB cable, accepts only your key and lives in RAM. The
BLONDA binary is copied to RAM (`/run`) and run *instead of* the stock app; systemd starts the stock app
again when it quits, crashes or after an hour. Nothing is written to flash, a reboot restores everything.

1. SSH kit: github.com/orrpunk-art/mpc-sample-root-ssh (v1.2.0) → `sh setup_unix.sh` on the Mac, copy the
   `autorun/` folder to the root of an exFAT SD card, put the card in the MPC, connect USB, power on.
2. `Akai/platform/mpcsample/mpc.sh check` → `selftest` (safe, the stock app keeps running) → `run`.

Unofficial and at your own risk; Akai has announced official community firmware support with an SDK for the
MPC Sample and Sample Key, and this host is meant to be replaced by that when it ships.

## CPU

The MPC Sample is a Rockchip RK3566 (4 × Cortex-A55, 2 GB RAM). The host runs audio alone on one core.
`mpc.sh selftest` (or `1 Kolla MPC`) measures every instrument on the device. Worst 128-frame block with 6 held
notes, in % of one core: BRIS 35, BRIS SEQ 84, Mini D 31, SH-101 36, Acid 49, Analog 17, Super 24, FM 22,
Pluck 14, Chip 11, Sub 22. The SEQ.3 engines render node by node per block (`Core/src/wg.cpp`), bit-identical
to frame-by-frame rendering; per-engine held-note limits in `src/engine_instrument.cpp` keep the worst case
(notes still ringing out included) below the budget.

## Credits

MPC Sample hardware facts (audio path, control surface protocol, screen) come from the public research in
github.com/gospodindilly-ops/mpc-sample-lab. This is an independent implementation; no code is copied.
