# BLONDA motor

BLONDAs gemensamma bibliotek med ljudmotorer. En motor är en synth utan skal: den tar emot toner,
MIDI och parametrar och ger ut stereoljud. Samma motor kan sedan läggas i Max for Live, VST3/AU,
SEQ.3 på Mac och iOS, på webben eller i hårdvara, och låter likadant överallt.

| Motor | Vad | Röster | Fabriksljud |
|---|---|---|---|
| `bris` | BLONDA BRIS – analog poly efter GS Music Bree6 (oscillator + sub, 4-polig ladder, 2 × ADSR, LFO, chorus, eko) | 6 | 64 i originalets ordning + 25 egna |

## Så hänger det ihop

```
generator/            <- den enda sanningen (Python)
  byggklossar.py         ladder-filter, polyBLEP, tidskonstanter … delas av alla motorer
  bris.py                BRIS-ljudet, skrivet som GenExpr med byggklossarna
  bris_ljud.py           parametrar och fabriksljud
  genexpr2cpp.py         översätter GenExpr till C++
  bygg.py                skriver alla filer i motorer/
motorer/bris/         <- genererat + motorns C++-skal
  bris.genexpr           går rakt in i Max for Live-pluggens gen~
  bris_gen.h             samma kod som C++ (genererad)
  bris_ljud.h            parametrar och fabriksljud i C++ (genererad)
  bris.json              parametrar och fabriksljud för andra språk (genererad)
  bris_presets.js        fabriksljuden för Max-pluggens gränssnitt (genererad)
  bris.h                 motorn: röstfördelning + Motor-gränssnittet (handskriven)
include/blonda/
  motor.h                gränssnittet alla motorer följer
  blonda_c.h             samma sak som C-funktioner (Swift, WebAssembly, C …)
  motorer.h              createMotor("bris")
tester/                tester, facit och referensen som bevisar att C++ = Max-pluggen
verktyg/blonda_render  spela en motor till WAV från terminalen
```

Max-pluggen och C++-motorn byggs från **samma GenExpr-text**. Paritetstestet kör den genererade C++-koden
mot en separat GenExpr-tolk sampel för sampel; skillnaden ligger på ~10⁻¹⁵ (avrundningsbrus), det vill säga
de räknar exakt likadant.

## Använda en motor

**C++ (JUCE, iPlug2, egen app):**

```cmake
add_subdirectory(blonda-motor)
target_link_libraries(min_plugg PRIVATE blonda::motor)
```

```cpp
#include "bris/bris.h"
blonda::bris::Bris motor;
motor.prepare(sampleRate);
motor.loadPreset(motor.findPreset("Poly Magic"));
motor.midi(status, data1, data2);           // eller noteOn/noteOff
motor.setParam(motor.findParam("cut"), 0.4);
motor.process(left, right, numSamples);     // i ljudtråden
```

Alla parametrar finns i `paramInfo(i)` (id, namn, min, max, standard, heltal) – det räcker för att
skapa värdprogrammets parametrar i en VST3/AU automatiskt.

**C / Swift / WebAssembly:** länka `blonda::motor_c` och använd `include/blonda/blonda_c.h`
(`blonda_create("bris")`, `blonda_note_on`, `blonda_process` …). Swift kan anropa C direkt.

**Max for Live:** pluggens bygge läser `generator/` härifrån och kopierar `bris.genexpr` och
`bris_presets.js` in i pluggen.

## Bygga och testa

```bash
./kolla.sh            # genererat aktuellt + bygg + tester + paritet (urval)
./kolla.sh --allt     # paritet för alla fabriksljud
build/blonda-render bris --list
build/blonda-render bris --preset "Unison Bass" --notes 36 -o bas.wav
build/blonda-render bris --all utmapp/
```

Kräver CMake 3.16+, en C++17-kompilator, Python 3 och Node (bara för paritetstestet).
CI kör allt på Linux, macOS och Windows vid varje push.

## Version

0.1.0 – första motorn (BRIS). Taggar (`v0.1.0` …) gör att projekt kan ligga kvar på en version.

© BLONDA. Alla rättigheter förbehållna.
