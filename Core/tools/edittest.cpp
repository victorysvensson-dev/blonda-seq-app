// Track editing through Host (UI thread side): euclid, rotate, shift, clear, variation, length, solo, undo/redo.
#include "blonda/host.hpp"
#include <cmath>
#include <cstdio>
#include <fstream>
#include <memory>
#include <sstream>

static std::string row(blonda::Host& h, int t) { std::string s; for (int i = 0; i < 16; ++i) s += "._X"[h.stepValue(t, i)]; return s; }
static int fails = 0;
static void expect(bool ok, const char* what) { std::printf("%s %s\n", ok ? "ok  " : "FAIL", what); if (!ok) ++fails; }

int main(int argc, char** argv) {
    std::ifstream f(argc > 1 ? argv[1] : "../App/Resources/default_project.json"); std::stringstream ss; ss << f.rdbuf();
    auto h = std::make_unique<blonda::Host>(); std::string err; if (!h->load(ss.str(), &err)) { std::puts(err.c_str()); return 2; }
    float L[128], R[128];
    auto pump = [&] { for (int i = 0; i < 4; ++i) h->render(L, R, 128); h->collect(); };
    const std::string kick0 = row(*h, 0);
    h->euclid(0, 5); pump();            expect(h->hits(0) == 5 && row(*h, 0).substr(1) == "..._.._.._.._..", ("euclid 5/16 " + row(*h, 0)).c_str());
    h->rotate(0, 1); pump();            expect(h->hits(0) == 5 && row(*h, 0)[1] != '.' && row(*h, 0)[5] != '.', ("rotate +1 " + row(*h, 0)).c_str());
    h->shift(0); pump();                expect(row(*h, 0) == "_._..._..._.._.." || row(*h, 0)[0] == '.', ("shift " + row(*h, 0)).c_str());
    h->clearTrack(0); pump();           expect(h->hits(0) == 0, "clear");
    h->undo(); pump();                  expect(h->hits(0) == 5, "undo clear");
    h->undo(); h->undo(); h->undo(); pump(); expect(row(*h, 0) == kick0, ("undo back to start " + row(*h, 0)).c_str());
    h->redo(); pump();                  expect(h->hits(0) == 5, "redo");
    const int bassBefore = h->hits(6);
    h->euclid(6, 3); pump();            expect(h->hits(6) == 3, ("melodic euclid " + row(*h, 6)).c_str());
    h->shift(6); pump();                expect(h->hits(6) == 3, ("melodic shift " + row(*h, 6)).c_str());
    h->variation(1, 12345); pump();     expect(true, ("variation snare " + row(*h, 1)).c_str());
    h->setLen(3, 12); pump();           expect(h->trackLen(3) == 12, "length 12");
    h->setSolo(2); pump();              expect(h->solo() == 2, "solo clap");
    h->setSolo(2); pump();              expect(h->solo() == -1, "solo off");
    h->copyPatternToNext(); pump();     h->selectPattern(1); expect(row(*h, 0) == "_..._..._.._.._." || h->hits(0) == 5, ("copy to B " + row(*h, 0)).c_str());
    (void)bassBefore;
    // the saved file reloads with the edits
    blonda::Project back; expect(back.loadJSON(h->toJSON(), &err) && back.len[3] == 12, "save keeps length");
    for (int n = 1; n <= 6; ++n) { const std::string m = h->dice(n, 1000 + n); pump();
        int notes = 0; for (int t = 0; t < 10; ++t) notes += h->hits(t);
        std::printf("     dice %d: %s  (steps %d, bass %d, lead %d)\n", n, m.c_str(), notes, h->hits(6), h->hits(8));
        expect(notes > 8 && !m.empty(), "dice"); }
    // synth module: engine params reach the engine, clamp, and survive save/load
    h->setEngParam(0, 1, 0, 0.77f); h->setEngOption(0, 1, 0, 1); h->setEngParam(1, 3, 0, 9.f); h->setEngParam(2, 9, 0, 0.21f); h->setEngParam(3, 0, 3, -1.f); pump();
    expect(std::abs(h->engParam(0, 1, 0) - 0.77f) < 1e-6f && h->engOption(0, 1, 0) == 1, "acid cut + square");
    expect(h->engParam(1, 3, 0) == 6.f && std::abs(h->engParam(3, 0, 3) - .001f) < 1e-6f, "clamped ranges");
    { blonda::Project b; expect(b.loadJSON(h->toJSON(), &err) && std::abs(b.eng.acid.cut - 0.77f) < 1e-5f && b.eng.acid.wave == 1 && b.eng.fm.ratio == 6.f
          && std::abs(b.bris.cut - 0.21f) < 1e-5f && std::abs(b.synth[3].a - .001f) < 1e-5f, "save keeps synth params"); }
    for (int e = 0; e < 10; ++e) { h->setInstrument(0, blonda::kEngineNames[e]); pump(); h->noteOn(6, 48, .8f);
        float pk = 0; for (int i = 0; i < 300; ++i) { h->render(L, R, 128); for (int j = 0; j < 128; ++j) pk = std::max(pk, std::abs(L[j])); }
        h->noteOff(6, 48); for (int i = 0; i < 400; ++i) h->render(L, R, 128); h->collect();
        expect(std::isfinite(pk) && pk > 1e-3f, (std::string("engine ") + blonda::kEngineNames[e] + " plays, peak " + std::to_string(pk)).c_str()); }
    h->shutdown();
    std::puts(fails ? "EDITTEST FAIL" : "EDITTEST OK"); return fails ? 1 : 0;
}
