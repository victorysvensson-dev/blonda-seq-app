// dunkab kit.json events.json out.f32 seconds [blocksize]
// Renders DUNK in C++ for the A/B test against the web version (same kit, same hits).
// kit.json: {"p":[{wave,freq,...} x8], "fat":0.3, "trim":0}   events.json: [[ch, time_s, vel], ...]
#include "blonda/dunk.hpp"
#include "blonda/json.hpp"
#include <chrono>
#include <cstdio>
#include <fstream>
#include <sstream>
#include <vector>
#include <algorithm>
using namespace blonda;
static std::string slurp(const char* f) { std::ifstream i(f); std::stringstream s; s << i.rdbuf(); return s.str(); }
int main(int argc, char** argv) {
    if (argc < 5) { std::fprintf(stderr, "usage: dunkab kit.json events.json out.f32 seconds [block]\n"); return 2; }
    json::Value K, E; if (!json::parse(slurp(argv[1]), K) || !json::parse(slurp(argv[2]), E)) { std::fprintf(stderr, "bad json\n"); return 2; }
    dunk::Kit kit; kit.fat = (float)K["fat"].numOr(0); kit.trim = (float)K["trim"].numOr(0);
    for (int c = 0; c < 8; ++c) { const auto& o = K["p"][c]; auto& p = kit.p[c]; auto n = [&](const char* k, float d) { return (float)o[k].numOr(d); };
        p.wave = (int)n("wave", 0); p.freq = n("freq", 60); p.atk = n("atk", 0); p.dcy = n("dcy", 300); p.mod = (int)n("mod", 0); p.rate = n("rate", 50); p.amt = n("amt", 0);
        p.nf = (int)n("nf", 0); p.nfreq = n("nfreq", 2000); p.q = n("q", .7071f); p.st = (int)n("st", 0); p.ne = (int)n("ne", 0); p.natk = n("natk", 0); p.ndcy = n("ndcy", 50);
        p.mix = n("mix", 50); p.dist = n("dist", 0); p.eqf = n("eqf", 1000); p.eqg = n("eqg", 0); p.lvl = n("lvl", 0); p.pan = n("pan", 0);
        p.ov = n("ov", 0); p.nv = n("nv", 0); p.mv = n("mv", 0); p.ck = (int)n("ck", 0); p.sub = n("sub", 0); p.crush = n("crush", 0); }
    const float sr = 48000; const int B = argc > 5 ? std::atoi(argv[5]) : 128; const long long N = (long long)(std::atof(argv[4]) * sr);
    static dunk::Dunk d; d.prepare(sr); d.setKit(kit); d.warm();
    struct Ev { long long f; int ch; float vel; }; std::vector<Ev> ev;
    for (size_t i = 0; i < E.size(); ++i) ev.push_back({(long long)std::llround(E[i][1].numOr(0) * sr), (int)E[i][0].numOr(0), (float)E[i][2].numOr(.8)});
    std::sort(ev.begin(), ev.end(), [](const Ev& a, const Ev& b) { return a.f < b.f; });
    std::vector<float> L(B), R(B), out; out.reserve(N * 2); size_t k = 0; int peak = 0;
    const auto t0 = std::chrono::steady_clock::now();
    for (long long f = 0; f < N; f += B) {
        const int n = (int)std::min<long long>(B, N - f);
        while (k < ev.size() && ev[k].f < f + n) { d.trigger(ev[k].ch, (int)std::max<long long>(0, ev[k].f - f), ev[k].vel, dunk::TrackMod{}); ++k; }
        std::fill(L.begin(), L.end(), 0.f); std::fill(R.begin(), R.end(), 0.f); d.process(L.data(), R.data(), n); peak = std::max(peak, d.active());
        for (int i = 0; i < n; ++i) { out.push_back(L[i]); out.push_back(R[i]); }
    }
    const double secs = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    FILE* o = std::fopen(argv[3], "wb"); std::fwrite(out.data(), 4, out.size(), o); std::fclose(o);
    std::printf("rendered %.1f s in %.3f s (%.1f%% of real time), max voices %d\n", N / sr, secs, secs / (N / sr) * 100, peak);
}
