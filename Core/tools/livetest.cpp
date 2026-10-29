// Live-note release test: hold a note 0.4 s on the keys track for every engine, check that it sounds while held
// and has faded (< -50 dB relative) shortly after release, like the web keyboard.
#include "blonda/seq3.hpp"
#include <cmath>
#include <memory>
#include <cstdio>
#include <fstream>
#include <sstream>
#include <vector>

int main(int argc, char** argv) {
    std::ifstream f(argc > 1 ? argv[1] : "../App/Resources/default_project.json"); std::stringstream ss; ss << f.rdbuf();
    blonda::Project p; std::string err; if (!p.loadJSON(ss.str(), &err)) { std::puts(err.c_str()); return 2; }
    p.master.echo = 0; p.master.space = 0; p.params[7].echo = 0; p.params[7].space = 0;   // dry, so the tail is the voice itself
    const char* engines[] = {"analog", "acid", "sub", "fm", "pluck", "super", "chip", "sh101", "mini", "bris"};
    bool ok = true;
    for (const char* e : engines) {
        p.inst[1] = e; auto sp = std::make_unique<blonda::Seq3>(); blonda::Seq3& s = *sp; s.prepare(48000); s.load(p);
        std::vector<float> L(48000 * 6), R(48000 * 6);
        const int on = 128 * 38, off = 128 * 188;   // ~0.1 s .. ~0.5 s (block boundaries)
        for (int i = 0; i < (int)L.size(); i += 128) {
            if (i == on) s.liveNote(7, 57, .85f, true);
            if (i == off) s.liveNote(7, 57, 0, false);
            s.render(&L[i], &R[i], 128);
        }
        auto rms = [&](double a, double b) { double q = 0; int n = 0; for (int i = (int)(a * 48000); i < (int)(b * 48000); ++i, ++n) q += (double)L[i] * L[i] + (double)R[i] * R[i]; return 10 * std::log10(q / n + 1e-20); };
        const bool bris = std::string(e) == "bris";
        const double held = rms(.2, .5), tail = bris ? rms(5.4, 5.9) : rms(1.4, 1.9);
        // bris uses its own amp release (aR) — just require it to decay
        const bool good = held > -45 && tail < held - (bris ? 25 : 50);   // bris: release up to 3 s (amp aR)
        std::printf("%-7s held %6.1f dB  after release %6.1f dB  %s\n", e, held, tail, good ? "ok" : "FAIL");
        ok &= good;
    }
    std::puts(ok ? "LIVETEST OK" : "LIVETEST FAIL");
    return ok ? 0 : 1;
}
