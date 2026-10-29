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
    h->shutdown();
    std::puts(fails ? "SAMPTEST FAIL" : "SAMPTEST OK"); return fails ? 1 : 0;
}
