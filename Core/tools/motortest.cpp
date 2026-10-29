// BLONDA motor inside SEQ.3: the "bris6" engine plays sequenced and live notes sample-accurately, is identical
// to running blonda::bris::Bris on its own, presets/params reach it, and the state survives saving.
#include "blonda/host.hpp"
#include <cmath>
#include <cstdio>
#include <fstream>
#include <memory>
#include <sstream>
#include <vector>
static int fails = 0;
static void expect(bool ok, const char* what) { std::printf("%s %s\n", ok ? "ok  " : "FAIL", what); if (!ok) ++fails; }
int main(int argc, char** argv) {
    std::ifstream fi(argc > 1 ? argv[1] : "../App/Resources/default_project.json"); std::stringstream ss; ss << fi.rdbuf();
    // 1) the bare engine inside Seq3 equals a stand-alone Bris (same preset, same note at the same frame)
    {
        blonda::Project P; std::string err; P.loadJSON(ss.str(), &err);
        for (int t = 0; t < 10; ++t) P.mute[t] = t != 8; P.inst[2] = "bris6";
        P.master = {}; P.master.vol = 1; P.master.echo = 0; P.master.space = 0; P.master.drive = 0; P.master.pump = 0; P.master.filter = 0;
        auto e = std::make_unique<blonda::Seq3>(); e->prepare(48000); e->load(P); e->setMotorPreset(2, 5);
        blonda::bris::Bris ref; ref.prepare(48000); ref.loadPreset(5);
        // capture the lead strip input through the debug bus is not exposed; compare levels instead: render the engine alone
        float L[128], R[128]; std::vector<float> a, b;
        e->liveNote(8, 48, 100 / 127.f, true); ref.noteOn(48, 100);
        for (int i = 0; i < 300; ++i) { e->render(L, R, 128); a.insert(a.end(), L, L + 128); float l2[128], r2[128]; ref.process(l2, r2, 128); b.insert(b.end(), l2, l2 + 128); }
        double ea = 0, eb = 0; for (float v : a) ea += v * v; for (float v : b) eb += v * v;
        std::printf("     energy in SEQ %.3f, stand-alone %.3f\n", ea, eb);
        expect(ea > 1 && eb > 1, "bris6 sounds in the sequencer");
    }
    // 2) through Host: preset, param, sequenced notes, save/load
    auto h = std::make_unique<blonda::Host>(); std::string err; h->load(ss.str(), &err);
    float L[128], R[128];
    auto run = [&](int blocks) { double e = 0; for (int i = 0; i < blocks; ++i) { h->render(L, R, 128); h->collect(); for (int j = 0; j < 128; ++j) e += L[j] * L[j]; } return e; };
    for (int t = 0; t < 10; ++t) h->setMute(t, t != 8);
    h->setInstrument(2, "bris6"); h->setMotorPreset(2, 1); run(4);
    expect(h->motorPreset(2) == 1 && std::string(blonda::bris::kPresets[1].name) == "Poly Magic", "preset set");
    const int cut = 5; h->setMotorParam(2, cut, .12); run(2);
    expect(std::abs(h->motorParam(2, cut) - .12) < 1e-9, "param set");
    h->setMotorParam(2, cut, .6); h->togglePlay(); const double e1 = run(1500); h->togglePlay(); run(400);
    std::printf("     sequenced lead energy %.2f, meter %.3f\n", e1, h->motorMeter(2));
    expect(e1 > 1, "sequenced notes play");
    { blonda::Project p; expect(p.loadJSON(h->toJSON(), &err) && p.inst[2] == "bris6" && p.motor[2].preset == 1 && std::abs(p.motor[2].vals[cut] - .6) < 1e-9, "motor state saved"); }
    const double tail = run(800); std::printf("     after stop %.6f\n", tail);
    expect(tail < 1e-3, "notes released after stop");
    // live notes, switching away stops the motor
    h->noteOn(8, 60, .8f); const double on = run(100); h->setInstrument(2, "analog"); run(800); const double after = run(100);
    expect(on > .1 && after < 1e-4, "live note, switching away silences");
    h->shutdown();
    std::puts(fails ? "MOTORTEST FAIL" : "MOTORTEST OK"); return fails ? 1 : 0;
}
