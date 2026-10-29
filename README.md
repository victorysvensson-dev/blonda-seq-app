# BLONDA SEQ — native iOS / iPadOS app

The native version of BLONDA SEQ.3 (the web prototype). Goal: the best possible sound and feel —
a real-time C++ audio engine, a SwiftUI interface with the same design, CoreMIDI, Ableton Link and AUv3.

## Layout

| Folder | What |
|---|---|
| `Core/` | C++17 audio engine. No Apple dependencies, so it builds and is tested on any machine. |
| `Core/include/blonda/dsp.hpp` | DSP building blocks: PolyBLEP oscillators, web-matched pulse wavetables, ZDF state-variable filter, smoothers, delay lines, half-band decimator, drive. |
| `Core/src/bris.cpp` | **Bris** — 6-voice polysynth, ported from the web version (2x oversampled voices, chorus I/II, tempo delay, 29 presets). |
| `Core/src/drums.cpp`, `engines.cpp`, `wg.cpp` | All drum kits and melodic engines (Analog, Acid, Sub, FM, Pluck, Super, Chip, SH-101, Moog), ported node-for-node from the web graph. |
| `Core/src/seq3.cpp` | The whole groovebox: sequencer, channel strips, echo/space, master chain. Loads the web version's project JSON. |
| `Core/include/blonda/host.hpp` | Thread glue: lock-free UI→audio and MIDI→audio queues, engine hot-swap, retire queue. |
| `Core/tools/` | `songrender` (render a project offline), `hosttest` (threading stress test, also under ThreadSanitizer), `livetest` (held-note release for every engine), probes for A/B tests. |
| `Akai/` | **BLONDA AKAI** — the same engines as instruments for the Akai MPC Sample (and the coming Sample Key): instrument library, MPC app, device host. See `Akai/README.md`. |
| `App/` | iOS/iPadOS app: `BLONDAEngine` (ObjC++ bridge: AVAudioEngine 48 kHz / 5 ms, CoreMIDI), SwiftUI grid, patterns, BPM, sound panel, multi-touch keyboard. `project.yml` is the XcodeGen spec. |

## Build and listen (Mac or Linux)

```sh
cd Core
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
./build/render ./out      # writes out/*.wav and out/bris_demo_reel.wav
```

## Build the app (Mac with Xcode 16+)

```sh
brew install xcodegen
cd App && xcodegen          # creates BLONDA.xcodeproj
open BLONDA.xcodeproj       # pick your team under Signing & Capabilities, run on iPad/iPhone
```

CI (GitHub Actions) builds the core on Linux, runs the tests, builds the app for the iOS simulator,
launches it on an iPad and an iPhone simulator and pushes screenshots to the `ci-shots` branch.

## Port fidelity

The engines are A/B-tested against the web version rendered offline (OfflineAudioContext, same notes and presets).
Bris matches within ~1 dB in level and octave-band spectrum, with the web version's exact envelope timeline
(including its quirks, e.g. short attacks holding the level until the gate, filter ramps that start at the gate),
so every preset sounds the way it was tuned. Improvements over the web: alias-free oscillators and drive (2x oversampling),
zero-delay-feedback filters that stay smooth when swept, and cutoff/resonance that act live on held notes.

## Roadmap

1. ✅ Core DSP + Bris
2. ✅ Drums (all kits), Moog, SH-101, Acid, FM, Pluck, Chip, Super, Sub, Analog
3. ✅ Sequencer (swing, ratchets, probability, polymeter, glide, song chain), mixer, track FX, master chain — full song A/B vs web: level ±0.2 dB, envelope correlation 0.996
4. 🚧 iOS app: ✅ audio host, MIDI notes, grid, patterns, BPM, sound panel, keyboard · next: piano roll, engine/preset pages, save/load, MIDI CC learn + clock, full SEQ.3 design
5. Ableton Link (LinkKit), AUv3, TestFlight
6. Not ported yet: user samples / loops, beat repeat, Bris sequencer glide
