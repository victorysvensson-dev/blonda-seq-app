// engprobe <out.f32> <engine> <seconds> <tone> <tune> <decay> <bass 0/1> [k=v ...] notes as n=<midi>@<t>:<len>:<vel>[:iv,iv,...]
#include "blonda/engines.hpp"
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include <memory>
using namespace blonda;
int main(int argc, char** argv) {
    auto P = std::make_unique<EngineParams>(); AnalogP an; auto tr = std::make_unique<MelodicTrack>();
    std::string e = argv[2]; const bool bass = atoi(argv[7]);
    if (bass) an = AnalogP{2, .004f, .22f, .35f, .12f, .42f, .35f, .55f}; else an = AnalogP{2, .012f, .7f, .25f, .35f, .5f, .12f, .35f};
    tr->prepare(48000, bass); tr->params = P.get(); tr->analog = &an;
    tr->engine = e == "acid" ? Eng::Acid : e == "sub" ? Eng::Sub : e == "fm" ? Eng::FM : e == "pluck" ? Eng::Pluck : e == "chip" ? Eng::Chip : e == "super" ? Eng::Super : e == "sh101" ? Eng::SH101 : e == "mini" ? Eng::Mini : Eng::Analog;
    tr->sound = {(float)atof(argv[4]), (float)atof(argv[5]), (float)atof(argv[6])};
    struct N { long f; int n; float v, len; std::vector<int> iv; }; std::vector<N> notes;
    for (int i = 8; i < argc; ++i) {
        std::string a = argv[i]; auto q = a.find('='); std::string k = a.substr(0, q), v = a.substr(q + 1);
        if (k == "n") { N n; float t; char ivs[128] = {0}; int c = sscanf(v.c_str(), "%d@%f:%f:%f:%127s", &n.n, &t, &n.len, &n.v, ivs); n.f = (long)(t * 48000);
            if (c == 5) { char* s = std::strtok(ivs, ","); while (s) { n.iv.push_back(atoi(s)); s = std::strtok(nullptr, ","); } } else n.iv.push_back(0); notes.push_back(n); continue; }
        float x = atof(v.c_str());
        // engine.param=value
        auto dot = k.find('.'); std::string en = k.substr(0, dot), pn = k.substr(dot + 1);
#define F(S, f) if (pn == #f) S.f = x;
#define I(S, f) if (pn == #f) S.f = (int)x;
        if (en == "acid") { F(P->acid, cut) F(P->acid, res) F(P->acid, env) F(P->acid, dec) F(P->acid, acc) F(P->acid, drive) F(P->acid, dtone) F(P->acid, st) I(P->acid, wave) I(P->acid, slide) }
        if (en == "sub") { F(P->sub, decay) F(P->sub, punch) F(P->sub, drive) F(P->sub, tone) F(P->sub, glide) F(P->sub, click) }
        if (en == "fm") { F(P->fm, ratio) F(P->fm, index) F(P->fm, decay) F(P->fm, bell) F(P->fm, rel) F(P->fm, bright) }
        if (en == "pluck") { F(P->pluck, damp) F(P->pluck, bright) F(P->pluck, body) F(P->pluck, len) F(P->pluck, width) F(P->pluck, drive) }
        if (en == "super") { F(P->super_, detune) F(P->super_, attack) F(P->super_, release) F(P->super_, bright) F(P->super_, width) F(P->super_, air) }
        if (en == "chip") { I(P->chip, duty) F(P->chip, dec) F(P->chip, vib) F(P->chip, arp) F(P->chip, crush) I(P->chip, oct) I(P->chip, arpm) }
        if (en == "analog") { I(an, wave) F(an, a) F(an, d) F(an, s) F(an, r) F(an, cut) F(an, res) F(an, env) }
        if (en == "sh101") { auto& S = P->sh101; F(S, lfoR) I(S, lfoW) F(S, vcoMod) I(S, range) F(S, pw) I(S, pwmSrc) F(S, pulse) F(S, saw) F(S, sub) I(S, subMode) F(S, noise) F(S, cut) F(S, res) F(S, env) F(S, vcfMod) F(S, kybd) I(S, vcaMode) F(S, A) F(S, D) F(S, S) F(S, R) F(S, porta) I(S, portaMode) F(S, vol) }
        if (en == "mini") { auto& S = P->mini; I(S, o1r) I(S, o1w) I(S, o2r) I(S, o2w) F(S, o2f) I(S, o3r) I(S, o3w) F(S, o3f) I(S, o3lfo) F(S, m1) I(S, m1on) F(S, m2) I(S, m2on) F(S, m3) I(S, m3on) F(S, mn) I(S, mnon) I(S, ncol)
            F(S, cut) F(S, emph) F(S, contour) F(S, fA) F(S, fD) F(S, fS) F(S, aA) F(S, aD) F(S, aS) I(S, decSw) I(S, kt1) I(S, kt2) F(S, glide) I(S, glideOn) F(S, modmix) I(S, oscMod) I(S, filtMod) F(S, modAmt) F(S, vol) }
        if (en == "bpm") tr->bpm = x;
    }
    const int Nn = (int)(atof(argv[3]) * 48000); std::vector<float> L(Nn), R(Nn);
    for (int i = 0; i < Nn; i += 128) { int fr = std::min(128, Nn - i); for (auto& n : notes) if (n.f >= i && n.f < i + fr) tr->trigger(n.v, n.n, n.len, n.iv.data(), (int)n.iv.size(), (int)(n.f - i)); tr->process(&L[i], &R[i], fr); }
    FILE* f = fopen(argv[1], "wb"); for (int i = 0; i < Nn; ++i) { fwrite(&L[i], 4, 1, f); fwrite(&R[i], 4, 1, f); } fclose(f);
}
