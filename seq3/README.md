# SEQ.3 – källkod

SEQ.3 är en enda webbsida (`Shell/Web/index.html`, samma fil som webbversionen och appen visar). Här ligger den
uppdelad i sina avsnitt så att den går att ändra säkert.

- `src/` – avsnitten (html, css, js och inbäddade typsnitt), namngivna efter rubriken i koden.
- `manifest.txt` – ordningen de sätts ihop i.
- Bygg: `python3 tools/build_seq3.py` → `Shell/Web/index.html`. Kontroll: `python3 tools/build_seq3.py --check`.

Arbetssätt:
1. Ändra i `seq3/src/` (aldrig direkt i `Shell/Web/index.html`).
2. Höj versionen på två ställen: `class="ver">vNNN<` och `seq.3 · vNNN` (grep i src).
3. Bygg, testa i headless Chromium (iPad-storlek), committa src + den byggda filen tillsammans.

Felloggen (v283): alla fångade fel samlas dolt. Håll fingret på versionsnumret uppe till vänster i appen för att se och
kopiera den. `window.__elText()` ger samma text.

Uppdelningen gjordes i v283 ur den byggda v282 och ger exakt samma fil (kontrollerat byte för byte). De gamla
modulfilerna försvann med en tidigare molnmiljö; `tools/patches/v282.py` är den sista ändringen som gjordes som lapp.
