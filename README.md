# BLONDA SEQ — native iOS / iPadOS app

The native version of BLONDA SEQ.3 (the web prototype). Goal: the best possible sound and feel —
a real-time C++ audio engine, a SwiftUI interface with the same design, CoreMIDI, Ableton Link and AUv3.

## Layout

| Folder | What |
|---|---|
| `Core/` | C++17 audio engine. No Apple dependencies, so it builds and is tested on any machine. |
| `Core/include/blonda/dsp.hpp` | DSP building blocks: PolyBLEP oscillators, web-matched pulse wavetables, ZDF state-variable filter, smoothers, delay lines, half-band decimator, drive. |
| `Core/src/bris.cpp` | **Bris** — 6-voice polysynth, ported from the web version (2x oversampled voices, chorus I/II, tempo delay, 29 presets). |
| `Core/tools/render.cpp` | Offline renderer: plays demo phrases through the engine and writes 24-bit WAV files. |
| `Core/tools/probe.cpp` | Renders one preset with parameter overrides — used for A/B tests against the web version. |
| `App/` *(next)* | SwiftUI app + AVAudioEngine host + CoreMIDI. Generated with XcodeGen. |

## Build and listen (Mac or Linux)

```sh
cd Core
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
./build/render ./out      # writes out/*.wav and out/bris_demo_reel.wav
```

## Port fidelity

The engines are A/B-tested against the web version rendered offline (OfflineAudioContext, same notes and presets).
Bris matches within ~1 dB in level and octave-band spectrum, with the web version's exact envelope timeline
(including its quirks, e.g. short attacks holding the level until the gate, filter ramps that start at the gate),
so every preset sounds the way it was tuned. Improvements over the web: alias-free oscillators and drive (2x oversampling),
zero-delay-feedback filters that stay smooth when swept, and cutoff/resonance that act live on held notes.

## Roadmap

1. ✅ Core DSP + Bris
2. Drums (kick/snare/clap/hat/perc kits), Moog (Model D), SH-101, Acid, FM, Pluck, Chip, Super, Sub, Analog
3. Sequencer (sample-accurate, swing, ratchets, probability, polymeter), mixer, track FX, master chain (pump, echo, space, glue, tape)
4. iOS app: AVAudioEngine host, CoreMIDI (notes, CC learn, clock), SwiftUI UI matching SEQ.3
5. Ableton Link (LinkKit), AUv3, TestFlight
