// Samples through Host: a one-shot replaces the kick synth, a loop restarts on the downbeat and is repitched to the
// tempo, the preview plays, removing a sample while it plays is safe, and the slots survive saving.
#include "blonda/host.hpp"
#include <cmath>
#include <cstdio>
#include <fstream>
#include <memory>
#include <sstream>
#include <vector>

static int fails = 0;
static void expect(bool ok, const char* what) { std::printf("%s %s\n", ok ? "ok  " : "FAIL", what); if (!ok) ++fails; }
static double goertzel(const std::vector<float>& x, double f, double sr) {
    const double w = 2 * M_PI * f / sr, c = 2 * std::cos(w); double s1 = 0, s2 = 0;
    for (float v : x) { const double s = v + c * s1 - s2; s2 = s1; s1 = s; }
    return std::sqrt(s1 * s1 + s2 * s2 - c * s1 * s2) / x.size();
}

int main(int argc, char** argv) {
    std::ifstream fi(argc > 1 ? argv[1] : "../App/Resources/default_project.json"); std::stringstream ss; ss << fi.rdbuf();
    auto h = std::make_unique<blonda::Host>(); std::string err; if (!h->load(ss.str(), &err)) { std::puts(err.c_str()); return 2; }
    const double sr = 48000; float L[128], R[128];
    auto run = [&](int blocks) { std::vector<float> y; for (int i = 0; i < blocks; ++i) { h->render(L, R, 128); h->collect(); y.insert(y.end(), L, L + 128); } return y; };
    run(4);
    // only the kick plays
    for (int t = 1; t < 10; ++t) h->setMute(t, true);
    // a 1 kHz one-shot (0.3 s)
    std::vector<float> a(14400), b(14400); for (int i = 0; i < 14400; ++i) a[i] = b[i] = (float)(.5 * std::sin(2 * M_PI * 1000 * i / sr) * std::exp(-i / 6000.0));
    h->addSample("hit1", a.data(), b.data(), (int)a.size());
    h->togglePlay(); const auto synth = run(1500);
    h->assignDrum(0, "hit1"); h->bindDrum(0, 1.f); const auto smp = run(1500);
    const double g0 = goertzel(synth, 1000, sr), g1 = goertzel(smp, 1000, sr);
    std::printf("     kick 1 kHz energy: synth %.5f  sample %.5f\n", g0, g1);
    expect(g1 > g0 * 5, "one-shot replaces the kick synth");
    h->assignDrum(0, ""); h->bindDrum(0, 1.f); h->togglePlay(); run(100);
    // a one-bar loop recorded at half the tempo plays an octave up (rate = bpm / srcBpm)
    h->setMute(0, true);
    const int barF = (int)std::lround(240.0 / h->ui.bpm * sr);
    std::vector<float> l(barF / 2), r(barF / 2); for (size_t i = 0; i < l.size(); ++i) l[i] = r[i] = (float)(.4 * std::sin(2 * M_PI * 440 * i / sr));
    h->addSample("loop1", l.data(), r.data(), (int)l.size());
    h->assignLoop(0, "loop1"); h->bindLoop(0, h->ui.bpm / 2, 1, 1.f);
    h->togglePlay(); const auto lp = run(1600);
    const double g440 = goertzel(lp, 440, sr), g880 = goertzel(lp, 880, sr);
    std::printf("     loop: 440 Hz %.5f  880 Hz %.5f\n", g440, g880);
    expect(g880 > g440 * 10 && g880 > .02, "loop repitched to the tempo");
    // the loop starts on the downbeat: silence before the first downbeat, sound right after
    h->togglePlay(); run(200); h->togglePlay();
    const auto st = run(100); double pre = 0, post = 0; const int d0 = (int)(.06 * sr);
    for (int i = 0; i < d0 - 200; ++i) pre = std::max(pre, (double)std::abs(st[i]));
    for (int i = d0 + 400; i < d0 + 2400; ++i) post = std::max(post, (double)std::abs(st[i]));
    std::printf("     downbeat: before %.4f after %.4f\n", pre, post);
    expect(pre < .002 && post > .05, "loop starts on the downbeat");
    // volume and off
    h->setLoopVol(0, .2f); const auto q = run(800); double pk = 0; for (size_t i = 4000; i < q.size(); ++i) pk = std::max(pk, (double)std::abs(q[i]));
    h->setLoopOn(0, false); const auto off = run(400); double pk2 = 0; for (size_t i = 12000; i < off.size(); ++i) pk2 = std::max(pk2, (double)std::abs(off[i]));
    std::printf("     vol .2 peak %.4f, off peak %.5f\n", pk, pk2);
    expect(pk > .01 && pk < .2 && pk2 < 1e-4, "loop volume and off");
    // saved slots
    { blonda::Project p; expect(p.loadJSON(h->toJSON(), &err) && p.loops[0].sid == "loop1" && !p.loops[0].on && std::abs(p.loops[0].vol - .2f) < 1e-5f, "loops saved"); }
    // remove a sample while it plays
    h->setLoopOn(0, true); run(800); h->removeSample("loop1"); const auto after = run(400);
    bool fin = true; for (float v : after) fin &= std::isfinite(v);
    expect(fin && h->loop(0).sid.empty() && !h->hasSample("loop1"), "remove while playing");
    // preview
    h->togglePlay(); run(50); h->previewSample("hit1", 1.f, .8f); const auto pv = run(60);
    expect(goertzel(pv, 1000, sr) > .01, "preview plays");
    // ---- sample editor + chop on a drum track (web: S.se / S.chop)
    {
        if (h->isPlaying()) h->togglePlay(); run(50);
        for (int t = 0; t < 10; ++t) h->setMute(t, t != 0);
        const int N = 24000;   // 0.5 s: first half 500 Hz, second half 2 kHz
        std::vector<float> x(N), y(N); for (int i = 0; i < N; ++i) x[i] = y[i] = (float)(.5 * std::sin(2 * M_PI * (i < N / 2 ? 500 : 2000) * i / sr));
        h->addSample("two", x.data(), y.data(), N); h->assignDrum(0, "two"); h->bindDrum(0, 1.f);
        h->setParam(0, 0, 2, 1.f);   // decay: whole sample
        auto hit = [&](int note) { h->noteOn(0, note, .9f); return run(150); };
        auto ratio = [&](const std::vector<float>& v) { return goertzel(v, 2000, sr) / std::max(1e-9, goertzel(v, 500, sr)); };
        const double plain = ratio(hit(60));
        h->setChop(0, {0.f, .5f});
        const double s0 = ratio(hit(1000)), s1 = ratio(hit(1001));
        std::printf("     chop: plain %.2f  slice 1 %.2f  slice 2 %.2f\n", plain, s0, s1);
        expect(s0 < .2 && s1 > 5, "chop: a slice plays only its part");
        h->setChop(0, {});
        blonda::SampleEdit e = h->sampleEdit(0); e.st = .5f; h->setSampleEdit(0, e);
        const double tr = ratio(hit(60)); std::printf("     trim start .5: %.2f\n", tr);
        expect(tr > 5, "trim: the start moves");
        // reverse: a 1 kHz tone that grows; backwards it starts loud
        std::vector<float> g(N), g2(N); for (int i = 0; i < N; ++i) g[i] = g2[i] = (float)(std::sin(2 * M_PI * 1000 * i / sr) * i / N);
        h->addSample("grow", g.data(), g2.data(), N); h->assignDrum(0, "grow"); h->bindDrum(0, 1.f);
        expect(h->sampleEdit(0).st == 0, "a new sample starts without the old edit");
        auto early = [&](const std::vector<float>& v) { double pk = 0; size_t i0 = 0; while (i0 < v.size() && std::abs(v[i0]) < 1e-4) ++i0; for (size_t i = i0; i < std::min(v.size(), i0 + 960); ++i) pk = std::max(pk, (double)std::abs(v[i])); return pk; };
        const double fwd = early(hit(60)); e = h->sampleEdit(0); e.rev = 1; h->setSampleEdit(0, e); const double bwd = early(hit(60));
        std::printf("     first 20 ms: forward %.3f  reversed %.3f\n", fwd, bwd);
        expect(bwd > fwd * 4, "reverse plays it backwards");
        // the sequencer: a step plays the slice it picked
        h->assignDrum(0, "two"); h->bindDrum(0, 1.f); h->setChop(0, {0.f, .5f});
        h->clearTrack(0); h->cycleStep(0, 0); h->setStepSlice(0, 0, 1);
        h->togglePlay(); const double sq = ratio(run(400)); h->togglePlay(); run(100);
        std::printf("     step picks slice 2: %.2f\n", sq);
        expect(sq > 5, "a step plays its slice");
        // saved and loaded again
        e = h->sampleEdit(0); e.fo = 12; e.g = 3; h->setSampleEdit(0, e);
        { blonda::Project p; const bool ok = p.loadJSON(h->toJSON(), &err);
          expect(ok && p.chop[0].sid == "two" && p.chop[0].cuts.size() == 2 && std::abs(p.chop[0].cuts[1] - .5f) < .01f && p.cells[p.pat][0][0].c == 1 && p.se[0].sid == "two" && std::abs(p.se[0].fo - 12) < 1e-4f && std::abs(p.se[0].g - 3) < 1e-4f, "edit, chop and step slices saved"); }
        // auto cuts: two hits → two slices
        std::vector<float> hh(N, 0.f), hh2; for (int k : {0, N / 2}) for (int i = 0; i < 4000; ++i) hh[k + i] = (float)(std::sin(2 * M_PI * 300 * i / sr) * std::exp(-i / 800.0));
        hh2 = hh; h->addSample("hits", hh.data(), hh2.data(), N);
        const auto cuts = h->chopAuto("hits", 0); std::printf("     auto cuts:"); for (float c : cuts) std::printf(" %.3f", c); std::printf("\n");
        expect(cuts.size() == 2 && std::abs(cuts[1] - .5f) < .02f, "chop finds the hits");
        // glitch: two pads at once
        h->togglePlay(); run(50); h->glitchHoldSet(1, 1 << 6); run(40);
        const int m = h->glitchActiveMask(); std::printf("     glitch mask %d\n", m);
        expect((m & 2) && (m & 64), "glitch: stutter and crush held together");
        h->glitchHoldSet(0, 0); run(40); expect(h->glitchActiveMask() == 0, "glitch: let go"); h->togglePlay(); run(20);
    }
    // MIDI out: start, a step event every 16th, the notes, stop
    {
        if (h->isPlaying()) h->togglePlay(); run(20);
        for (int t = 0; t < 10; ++t) h->setMute(t, false);
        blonda::MidiOutEv e; while (h->popMidiOut(e)) {}
        h->togglePlay(); run(375); h->togglePlay(); run(5);   // 1 s
        int starts = 0, stops = 0, steps = 0, notes = 0; long long lastStep = -1; bool order = true;
        while (h->popMidiOut(e)) { if (e.kind == 2) ++starts; if (e.kind == 3) ++stops; if (e.kind == 1) { if (e.f <= lastStep) order = false; lastStep = e.f; ++steps; } if (e.kind == 0) ++notes; }
        std::printf("     midi out: start %d stop %d steps %d notes %d\n", starts, stops, steps, notes);
        const int want = (int)(1.0 / (60.0 / h->ui.bpm / 4));
        expect(starts == 1 && stops == 1 && order && steps >= want - 1 && steps <= want + 3 && notes > 0, "midi out: start, steps, notes, stop");
        h->noteOn(0, 60, .9f); run(4); int live = 0; while (h->popMidiOut(e)) live += e.kind == 0; expect(live == 0, "midi out: live pads are not echoed");
    }
    h->shutdown();
    std::puts(fails ? "SAMPTEST FAIL" : "SAMPTEST OK"); return fails ? 1 : 0;
}
