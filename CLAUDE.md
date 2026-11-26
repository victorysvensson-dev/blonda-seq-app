# Notes for Claude

- Owner: Victory (BLONDA). Communicate in Swedish. Do the work yourself; double-check before handing over; clearly mark anything the user must do.
- Source of truth for sound and behaviour: the web prototype "BLONDA SEQ.3 Glass" (claude.ai artifact DR4B6JyXGdcw2QrxNfkKQb). Port engines faithfully, then improve quality (anti-aliasing, smoother filters) without changing the character of presets.
- Audio code must stay real-time safe: no allocation, locks or exceptions in process().
- Verify every engine with the A/B method: render the web engine offline in headless Chromium (OfflineAudioContext) with the same notes, compare level, octave bands, envelope and spectral-centroid correlation.
- Studio runs at 48 kHz; render tests at 48 kHz.
- Shared engines come from BLONDA motor (repo victorysvensson-dev/blonda-motor, read its CLAUDE.md). They are copied at a pinned tag into `External/blonda-motor/` with `tools/update_motor.sh <tag>` (the copy records the tag in `VERSION`). Never edit files under `External/` — change the motor repo, tag it, then update the copy here. Engine "bris6" in SEQ.3 = BLONDA BRIS from the motor; the engine "bris" stays the web SEQ.3 port.
- The SEQ.3 app in `Shell/` shows the web app itself (Shell/Web/index.html). After publishing a new web version, run `tools/sync_web.sh <index.html>` so the app gets the same file. Never change how the page looks or sounds in the shell; native additions go in `Shell/Sources/Bridge.swift` (JS) and the Swift files, and page behaviour that differs in the app is gated on `window.BLONDA_NATIVE` in the web source.

- SEQ.3's code lives split in `seq3/src/` (see `seq3/README.md`). Change the pieces there and build with `python3 tools/build_seq3.py`; never edit `Shell/Web/index.html` by hand. One chat (the SEQ.3 chat) owns SEQ.3. The hidden error log opens by holding the version number.
