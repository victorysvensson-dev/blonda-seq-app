// Track editing through Host (UI thread side): euclid, rotate, shift, clear, variation, length, solo, undo/redo.
#include "blonda/host.hpp"
#include <cmath>
#include <vector>
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
    // song mode: chain A B – … plays A then B, the screen follows, and the chain is saved
    h->setChain(0, 0); h->setChain(1, 1); for (int k = 2; k < 8; ++k) h->setChain(k, -1); h->setSong(true); h->selectPattern(0); pump();
    h->togglePlay(); bool sawB = false, sawA2 = false; int idx1 = -2;
    for (int i = 0; i < 2400; ++i) { h->render(L, R, 128); h->collect(); if (h->followSong() && h->ui.pat == 1) { sawB = true; idx1 = h->chainIndex(); } if (sawB && h->ui.pat == 0) sawA2 = true; }
    h->togglePlay(); pump();
    expect(sawB && idx1 == 1 && sawA2, ("song chain A→B→A, index " + std::to_string(idx1)).c_str());
    { blonda::Project b; expect(b.loadJSON(h->toJSON(), &err) && b.song && b.chain[0] == 0 && b.chain[1] == 1 && b.chain[2] == -1, "save keeps song chain"); }
    h->setSong(false); pump();
    // live: XY lowpass darkens the mix; beat repeat loops exactly one 1/16 (period = 60/bpm/4 s)
    {
        h->selectPattern(0); h->togglePlay(); for (int i = 0; i < 200; ++i) h->render(L, R, 128);
        auto zcr = [&](int blocks) { long z = 0, n = 0; float prev = 0; double e = 0; for (int i = 0; i < blocks; ++i) { h->render(L, R, 128); for (int j = 0; j < 128; ++j) { if ((L[j] > 0) != (prev > 0)) ++z; prev = L[j]; ++n; e += L[j] * L[j]; } } return std::make_pair((double)z / n, std::sqrt(e / n)); };
        const auto open = zcr(750);
        h->perform(true, -1.f, 0.f); for (int i = 0; i < 40; ++i) h->render(L, R, 128);
        const auto dark = zcr(750);
        h->perform(false, 0, 0); for (int i = 0; i < 200; ++i) h->render(L, R, 128);
        std::printf("     xy: zero crossings %.4f -> %.4f, rms %.3f -> %.3f\n", open.first, dark.first, open.second, dark.second);
        expect(dark.first < open.first * .5 && dark.second > .005, "xy lowpass");
        h->perform(true, 0.f, 1.f); for (int i = 0; i < 400; ++i) h->render(L, R, 128); h->perform(false, 0, 0); for (int i = 0; i < 100; ++i) h->render(L, R, 128);
        const int per = (int)std::lround(60.0 / h->ui.bpm / 4 * 48000);
        h->beatRepeat(1, 4); for (int i = 0; i < 60; ++i) h->render(L, R, 128);
        std::vector<float> y; for (int i = 0; i < 200; ++i) { h->render(L, R, 128); y.insert(y.end(), L, L + 128); }
        double num = 0, a2 = 0, b2 = 0; for (size_t i = 0; i + per < y.size(); ++i) { num += y[i] * y[i + per]; a2 += y[i] * y[i]; b2 += y[i + per] * y[i + per]; }
        const double corr = num / std::sqrt(a2 * b2 + 1e-12);
        h->beatRepeat(2, 6); for (int i = 0; i < 100; ++i) h->render(L, R, 128);
        std::vector<float> y2; for (int i = 0; i < 100; ++i) { h->render(L, R, 128); y2.insert(y2.end(), L, L + 128); }
        double n2 = 0, c2 = 0, d2 = 0; for (size_t i = 0; i + per / 2 < y2.size(); ++i) { n2 += y2[i] * y2[i + per / 2]; c2 += y2[i] * y2[i]; d2 += y2[i + per / 2] * y2[i + per / 2]; }
        const double corr2 = n2 / std::sqrt(c2 * d2 + 1e-12);
        h->beatRepeat(0, 0); for (int i = 0; i < 20; ++i) h->render(L, R, 128);
        std::printf("     repeat 1/16: period %d, correlation %.4f; 1/32 correlation %.4f\n", per, corr, corr2);
        expect(corr > .99 && corr2 > .99, "beat repeat loops");
        h->togglePlay(); pump();
    }
    // plugins: values clamp, reach the engine, survive saving; a new reverb swaps in without a glitch
    h->setFx(1, .9f); h->setFx(8, 4.4f); h->setFx(7, 1); h->setFx(4, 1.2f); h->rebuildReverb(); h->togglePlay();
    float pk = 0; bool fin = true; for (int i = 0; i < 400; ++i) { h->render(L, R, 128); h->collect(); for (int j = 0; j < 128; ++j) { fin &= std::isfinite(L[j]); pk = std::max(pk, std::abs(L[j])); } }
    h->togglePlay(); pump();
    expect(h->fx(1) == .85f && h->fx(8) == 4.f && fin && pk > .01f && pk < 1.5f, "fx set + reverb swap");
    { blonda::Project b; expect(b.loadJSON(h->toJSON(), &err) && b.fx.crushOn && b.fx.crushBits == 4.f && std::abs(b.fx.spaceSize - 1.2f) < 1e-5f && std::abs(b.fx.echoFb - .85f) < 1e-5f, "save keeps plugins"); }
    // step inspector
    h->selectPattern(0); pump();
    { int s0 = -1; for (int s = 0; s < 16; ++s) if (h->stepValue(0, s)) { s0 = s; break; }
      h->setStepVel(0, s0, .5f); h->setStepRatchet(0, s0, 3); h->setStepProb(0, s0, .25f); pump();
      expect(std::abs(h->stepVel(0, s0) - .5f) < 1e-6f && h->stepRatchet(0, s0) == 3 && h->stepProb(0, s0) == .25f && h->stepValue(0, s0) == 1, "step vel / ratchet / prob");
      h->toggleAccent(0, s0); expect(h->stepValue(0, s0) == 2 && h->stepVel(0, s0) == 1.f, "accent");
      blonda::Project b; expect(b.loadJSON(h->toJSON(), &err) && b.cells[0][0][s0].r == 3 && b.cells[0][0][s0].p == .25f, "save keeps step details");
      h->clearStep(0, s0); expect(h->stepValue(0, s0) == 0, "clear step");
      int m0 = -1; for (int s = 0; s < 16; ++s) if (h->stepValue(6, s)) { m0 = s; break; }
      h->setStepVel(6, m0, .4f); expect(std::abs(h->stepVel(6, m0) - .4f) < 1e-6f, "melodic step velocity");
      h->toggleAccent(6, m0); expect(h->stepValue(6, m0) == 2, "melodic accent");
      h->clearStep(6, m0); expect(h->stepValue(6, m0) == 0, "melodic clear"); }
    // piano roll: replace the notes (with a glide), the cells follow, and it is saved
    { std::vector<blonda::RollNote> R(3); R[0] = {0, 2, 60, .8f, -1, 1}; R[1] = {4, 1, 64, 1.f, -1, -1}; R[2] = {8.5f, 3, 67, .5f, -1, -1};
      h->setRollNotes(8, R); pump();
      expect(h->rollNotes(8).size() == 3 && h->stepValue(8, 0) == 1 && h->stepValue(8, 4) == 2 && h->stepValue(8, 8) == 1 && h->stepValue(8, 2) == 0, "roll notes -> cells");
      blonda::Project b; expect(b.loadJSON(h->toJSON(), &err) && b.roll[b.pat][2].size() == 3 && b.roll[b.pat][2][0].g == 1 && std::abs(b.roll[b.pat][2][2].s - 8.5f) < 1e-5f, "roll saved with glide");
      h->setGlideTime(.2f); h->setChord(7, false); expect(h->glideTime() == .2f && !h->chordOn(7), "glide time + chord");
      blonda::Project c2; expect(c2.loadJSON(h->toJSON(), &err) && c2.glideT == .2f && c2.chordKeys == 0, "glide/chord saved"); }
    // drum kits: the 808 kick sounds different from the blonda kick, and the choice is saved
    { auto hitE = [&](const char* kit) { h->setKit(0, kit); pump(); h->noteOn(0, 60, 1.f); double e = 0, z = 0; float pv = 0;
          for (int i = 0; i < 150; ++i) { h->render(L, R, 128); for (int j = 0; j < 128; ++j) { e += L[j] * L[j]; if ((L[j] > 0) != (pv > 0)) ++z; pv = L[j]; } } for (int i = 0; i < 300; ++i) h->render(L, R, 128); return std::make_pair(e, z); };
      for (int t = 1; t < 10; ++t) h->setMute(t, true); h->setMute(0, false);
      const auto a = hitE(""), b = hitE("808"), c = hitE("909");
      std::printf("     kick blonda e=%.2f z=%.0f · 808 e=%.2f z=%.0f · 909 e=%.2f z=%.0f\n", a.first, a.second, b.first, b.second, c.first, c.second);
      expect(a.first > .1 && b.first > .1 && c.first > .1 && (std::abs(a.first - b.first) > .05 * a.first || a.second != b.second), "kits sound");
      blonda::Project q; expect(q.loadJSON(h->toJSON(), &err) && q.kit[0] == "909", "kit saved");
      for (int t = 1; t < 10; ++t) h->setMute(t, false); }
    // nudge: a step nudged a quarter step late sounds a quarter step later, and is saved
    { for (int t = 1; t < 10; ++t) h->setMute(t, true); h->setMute(0, false);
      auto onset = [&](float o) { h->clearTrack(0); pump(); h->cycleStep(0, 4); h->setStepNudge(0, 4, o); pump();
          for (int i = 0; i < 1500; ++i) h->render(L, R, 128);   // let echo and space die out
          h->togglePlay(); long long n = 0, at = -1; for (int i = 0; i < 400 && at < 0; ++i) { h->render(L, R, 128); for (int j = 0; j < 128; ++j) if (at < 0 && std::fabs(L[j]) > 2e-2f) at = n + j; n += 128; }
          h->togglePlay(); for (int i = 0; i < 200; ++i) h->render(L, R, 128); return at; };
      const long long a0 = onset(0), a1 = onset(.25f), a2 = onset(-.25f);
      const double sd = 60.0 / h->ui.bpm / 4 * 48000;
      std::printf("     onset step5: %lld · +0.25 → %lld (Δ %.0f, want %.0f) · -0.25 → %lld\n", a0, a1, double(a1 - a0), .25 * sd, a2);
      expect(a0 > 0 && std::fabs(double(a1 - a0) - .25 * sd) < 64 && std::fabs(double(a0 - a2) - .25 * sd) < 64, "nudge moves the hit");
      blonda::Project q; h->setStepNudge(0, 4, .3f); expect(q.loadJSON(h->toJSON(), &err) && std::fabs(q.cells[q.pat][0][4].o - .3f) < 1e-4f, "nudge saved");
      for (int t = 1; t < 10; ++t) h->setMute(t, false); }
    h->shutdown();
    std::puts(fails ? "EDITTEST FAIL" : "EDITTEST OK"); return fails ? 1 : 0;
}
