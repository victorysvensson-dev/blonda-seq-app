# BLONDA AKAI — BLONDA synths for the Akai MPC Sample (and the coming Sample Key)

The BLONDA SEQ.3 sound engines as playable instruments on the MPC Sample: pads play notes, the knobs edit
the sound, the screen shows it in the BLONDA dot-matrix style. The engines are the exact same code as
SEQ.3 (`../Core`), so a sound is the same on the iPhone, the web prototype and the MPC.

**Status:** library, app and MPC Sample host build and pass 745 desktop tests; the ARM binary passes its
self test under emulation. **Not yet run on real hardware** — CPU headroom on the MPC's Cortex-A55 cores is
the open question (see *CPU* below).

## What is in it

| Instrument | From | Notes |
|---|---|---|
| **BRIS** | `Core/src/bris.cpp` | Bree6-style 6-voice poly, 29 presets, 32 parameters on 11 pages |
| MINI D | `Core/src/engines.cpp` | Model D-style, 38 parameters on 14 pages |
| SH-101 | 〃 | 25 parameters on 9 pages |
| ACID | 〃 | 303-style (max 4 notes for now) |
| ANALOG, SUPER, FM GLASS, PLUCK, CHIP, SUB 808 | 〃 | SUPER max 4 notes for now |

The engine instruments start from the SEQ.3 defaults ("INIT"); their web presets are not ported yet.

## Layout

| Path | What |
|---|---|
| `include/akai/instrument.hpp` | The interface every instrument implements (params, pages, presets, notes). No hardware in it, so the same instrument can move to the Sample Key / Akai's SDK later |
| `src/bris_instrument.cpp`, `src/engine_instrument.cpp` | Bris and the nine SEQ.3 engines as instruments (parameter tables, pages, level trims) |
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
| TAP TEMPO | Tempo for synced LFO and delay (LED blinks on the beat) |
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

The MPC Sample is a Rockchip RK3566 (4 × Cortex-A55, 2 GB RAM). The host uses one core for audio.
Desktop numbers (x86, noisy shared VM) for 6 held notes: Bris ~6 % of a core, Mini D ~7 %, SH-101 ~8 %,
Acid ~12 %, Super ~13 %. An A55 is several times slower per core, so `mpc.sh selftest` on the device gives the
real numbers. Next steps when they are in: per-block envelope coefficients in Core (the voices call `exp()`
per sample), NEON-friendly loops, and running voices on a second core.

## Credits

MPC Sample hardware facts (audio path, control surface protocol, screen) come from the public research in
github.com/gospodindilly-ops/mpc-sample-lab. This is an independent implementation; no code is copied.
