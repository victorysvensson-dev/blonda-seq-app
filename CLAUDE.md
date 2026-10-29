# Notes for Claude

- Owner: Victory (BLONDA). Communicate in Swedish. Do the work yourself; double-check before handing over; clearly mark anything the user must do.
- Source of truth for sound and behaviour: the web prototype "BLONDA SEQ.3 Glass" (claude.ai artifact DR4B6JyXGdcw2QrxNfkKQb). Port engines faithfully, then improve quality (anti-aliasing, smoother filters) without changing the character of presets.
- Audio code must stay real-time safe: no allocation, locks or exceptions in process().
- Verify every engine with the A/B method: render the web engine offline in headless Chromium (OfflineAudioContext) with the same notes, compare level, octave bands, envelope and spectral-centroid correlation.
- Studio runs at 48 kHz; render tests at 48 kHz.
- Shared engines come from BLONDA motor (repo victorysvensson-dev/blonda-motor, read its CLAUDE.md). They are copied at a pinned tag into `External/blonda-motor/` with `tools/update_motor.sh <tag>` (the copy records the tag in `VERSION`). Never edit files under `External/` — change the motor repo, tag it, then update the copy here. Engine "bris6" in SEQ.3 = BLONDA BRIS from the motor; the engine "bris" stays the web SEQ.3 port.
