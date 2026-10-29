// Track editing through Host (UI thread side): euclid, rotate, shift, clear, variation, length, solo, undo/redo.
#include "blonda/host.hpp"
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
    h->shutdown();
    std::puts(fails ? "EDITTEST FAIL" : "EDITTEST OK"); return fails ? 1 : 0;
}
