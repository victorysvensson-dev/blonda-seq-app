#!/usr/bin/env python3
"""Checks the SEQ.3 app's self-test results (selftest.json from each device and run) and prints a summary.
The last line starts with "ALL OK" when everything passed. Usage: check_selftest.py <folder with *_selftest_N.json>"""
import json, os, sys

d = sys.argv[1] if len(sys.argv) > 1 else 'shell-out'
fails, lines = [], []

def check(dev, run, r):
    def need(ok, what):
        lines.append(f"  {'ok  ' if ok else 'FAIL'} {what}")
        if not ok:
            fails.append(f"{dev} run {run}: {what}")
    if r.get('missing'):
        need(False, 'self-test result missing (the app did not report)')
        return
    need(not r.get('fatal'), f"no fatal error ({r.get('fatal')})")
    need(r.get('secure') is True, f"secure context ({r.get('origin')})")
    need(str(r.get('ver', '')).startswith('v'), f"page loaded, version {r.get('ver')}")
    need(r.get('lang') == 'en', f"English ({r.get('lang')})")
    need(r.get('ls') is True, 'localStorage works')
    need(r.get('idb') is True, f"IndexedDB works ({r.get('idb')})")
    a = r.get('audio') or {}
    need(bool(a.get('workletOk')), f"Web Audio + AudioWorklet (sr {a.get('sr')}, state {a.get('state')}{', ' + r['audioErr'] if r.get('audioErr') else ''})")
    need((r.get('packItems') or 0) > 200 and r.get('packDecoded') is True, f"BLONDA sound pack built in ({r.get('packItems')} sounds, decoded {r.get('packDecoded')}{', ' + r['packErr'] if r.get('packErr') else ''})")
    need(r.get('midiApi') is True, 'Web MIDI API present')
    need(r.get('midiIn') == [144, 60, 100], f"MIDI in: test note reached the page ({r.get('midiIn')}{', ' + r['midiErr'] if r.get('midiErr') else ''})")
    need([144, 64, 90] in (r.get('midiOutReceived') or []), f"MIDI out: page note reached the device ({r.get('midiOutReceived')})")
    need([128, 64, 0] in (r.get('midiOutReceived') or []), 'MIDI out: timed note-off arrived')
    need(r.get('save') is True and r.get('saveBytes') == 17, f"saving a file ({r.get('save')}, {r.get('saveBytes')} bytes)")
    need(r.get('syncPill') == 'local', f"library says local ({r.get('syncPill')})")
    pa = r.get('pageAudio') or {}
    need(r.get('started') is True, f"intro tapped, app shown ({r.get('startErr') or ''})")
    need(pa.get('state') == 'running', f"the page's own sound is running ({pa})")
    need(not r.get('errors'), f"no page errors {r.get('errors') or ''}")
    lines.append(f"  time: IndexedDB {r.get('idbMs')} ms, MIDI access {r.get('midiMs')} ms")
    lines.append(f"  CoreMIDI: {r.get('midiNative')}")
    if run == 2:
        need(r.get('lsPrev') is not None, 'saved data survived a restart')
    lines.append(f"  info: {r.get('platform')} {r.get('system')} {r.get('width')}x{r.get('height')} body='{r.get('body')}' "
                 f"ins={r.get('midiIns')} outs={r.get('midiOuts')}")

devices = sys.argv[2:] or ['ipad', 'iphone', 'mac']
for dev in devices:
    for run in (1, 2):
        p = os.path.join(d, f'{dev}_selftest_{run}.json')
        lines.append(f"{dev} run {run}:")
        try:
            r = json.load(open(p))
        except Exception as e:
            r = {'missing': True}
            lines.append(f"  (could not read {p}: {e})")
        check(dev, run, r)

print('\n'.join(lines))
print()
if fails:
    print(f"{len(fails)} FAILED:")
    for f in fails:
        print('  ' + f)
        print(f"::error::{f}")
else:
    print('ALL OK')
