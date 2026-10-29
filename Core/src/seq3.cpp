#include "blonda/seq3.hpp"
#include <climits>
#include <cstring>
#include <map>
#include <cstdlib>
#include <cstdio>

namespace blonda {

static const char* kTrackIds[kTracks] = {"kick", "snare", "clap", "hat", "ohat", "perc", "bass", "keys", "lead", "pad"};
static const char* kMelIds[4] = {"bass", "keys", "lead", "pad"};

// ---------------------------------------------------------------- helpers
// Web Audio biquad designs (LP/HP: Q in dB; BP: linear Q)
static void designBQ(int type, float f, float q, float sr, float* c) {
    f = clampf(f, 1.f, sr * .5f - 1.f);
    const float w = kTwoPi * f / sr, cs = std::cos(w), sn = std::sin(w); float b0, b1, b2, a0, a1, a2;
    if (type == 2) { const float al = sn / (2 * q); b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else { const float al = sn / (2 * std::pow(10.f, q / 20.f)); a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
        if (type == 0) { b0 = (1 - cs) * .5f; b1 = 1 - cs; b2 = b0; } else { b0 = (1 + cs) * .5f; b1 = -(1 + cs); b2 = b0; } }
    c[0] = b0 / a0; c[1] = b1 / a0; c[2] = b2 / a0; c[3] = a1 / a0; c[4] = a2 / a0;
}
static inline float runBQ(const float* c, float* z, float x) { const float y = c[0] * x + z[0]; z[0] = c[1] * x - c[3] * y + z[1]; z[1] = c[2] * x - c[4] * y; return y; }
static inline float driveCurve(float x, float k, float kn) { x = clampf(x, -1.f, 1.f); return std::tanh(k * x) * kn; }
static float crushCurve(float x, int bits) {   // 2048-point staircase, linearly interpolated like a WaveShaper
    const float st = (float)(1 << std::min(24, std::max(0, bits))) / 2.f; x = clampf(x, -1.f, 1.f);
    const float pos = (x + 1.f) * .5f * 2047.f; const int i0 = (int)pos; const float fr = pos - i0;
    auto cv = [&](int i) { const float u = i / 2047.f * 2.f - 1.f; return std::round(u * st) / st; };
    return i0 >= 2047 ? cv(2047) : cv(i0) + (cv(i0 + 1) - cv(i0)) * fr;
}
static void panStereo(float& l, float& r, float pan) {
    pan = clampf(pan, -1, 1); const float x = pan <= 0 ? pan + 1 : pan, gl = std::cos(x * kPi * .5f), gr = std::sin(x * kPi * .5f);
    if (pan <= 0) { const float L = l + r * gl, R = r * gr; l = L; r = R; } else { const float L = l * gl, R = r + l * gr; l = L; r = R; }
}
static int scaleIndex(const std::vector<int>& sc, int n) { for (size_t i = 0; i < sc.size(); ++i) if (sc[i] == n) return (int)i; for (size_t i = 0; i < sc.size(); ++i) if (sc[i] >= n) return (int)i; return -1; }
static const std::vector<int>& SCALE() { static std::vector<int> s; if (s.empty()) { const int st[7] = {0, 2, 3, 5, 7, 8, 10}; for (int o = 1; o < 7; ++o) for (int x : st) { int m = 9 + 12 * o + x; if (m >= 33 && m <= 81) s.push_back(m); } } return s; }

// ---------------------------------------------------------------- project loading
bool Project::loadJSON(const std::string& text, std::string* err) {
    json::Value S; if (!json::parse(text, S) || S.type != json::Value::Object) { if (err) *err = "invalid JSON"; return false; }
    bpm = (float)S["bpm"].numOr(118); pat = (int)S["pat"].numOr(0); solo = (int)S["solo"].numOr(-1);
    for (int i = 0; i < kTracks; ++i) {
        mute[i] = (int)S["mute"][i].numOr(0);
        const json::Value& p = S["params"][kTrackIds[i]];
        params[i] = {(float)p["level"].numOr(.5), (float)p["tune"].numOr(0), (float)p["decay"].numOr(.4), (float)p["tone"].numOr(.5), (float)p["pan"].numOr(0), (float)p["echo"].numOr(0), (float)p["space"].numOr(0)};
        const json::Value& f = S["tfx"][kTrackIds[i]];
        tfx[i] = {(float)f["drive"].numOr(0), (float)f["filt"].numOr(0), (float)f["reso"].numOr(0), (float)f["crush"].numOr(0), (float)f["comp"].numOr(0), (float)f["pump"].numOr(0)};
        len[i] = (int)S["len"][kTrackIds[i]].numOr(16);
    }
    const json::Value& m = S["master"];
    master = {(float)m["filter"].numOr(0), (float)m["echo"].numOr(.38), (float)m["space"].numOr(.4), (float)m["drive"].numOr(.12), (float)m["pump"].numOr(.4), (float)m["swing"].numOr(.12), (float)m["vol"].numOr(.75)};
    const json::Value& X = S["fx"];
    fx.echoOn = X["echo"]["on"].numOr(1) != 0; fx.echoFb = (float)X["echo"]["fb"].numOr(.38); fx.echoTime = (float)X["echo"]["time"].numOr(.75);
    fx.spaceOn = X["space"]["on"].numOr(1) != 0; fx.spaceSize = (float)X["space"]["size"].numOr(2.6);
    fx.tapeOn = X["tape"]["on"].numOr(1) != 0; fx.tapeColor = (float)X["tape"]["color"].numOr(.75);
    fx.crushOn = X["crush"]["on"].numOr(0) != 0; fx.crushBits = (float)X["crush"]["bits"].numOr(6); fx.crushMix = (float)X["crush"]["mix"].numOr(.4);
    for (int k = 0; k < 4; ++k) {
        inst[k] = S["inst"][kMelIds[k]].strOr(k == 2 ? "pluck" : k == 3 ? "super" : "analog");
        const json::Value& sy = S["synth"][kMelIds[k]]; AnalogP& a = synth[k];
        const std::string w = sy["wave"].strOr("sawtooth"); a.wave = w == "sine" ? 0 : w == "square" ? 1 : w == "triangle" ? 3 : 2;
        a.a = (float)sy["a"].numOr(a.a); a.d = (float)sy["d"].numOr(a.d); a.s = (float)sy["s"].numOr(a.s); a.r = (float)sy["r"].numOr(a.r);
        a.cut = (float)sy["cut"].numOr(a.cut); a.res = (float)sy["res"].numOr(a.res); a.env = (float)sy["env"].numOr(a.env);
    }
    const json::Value& E = S["eng"];
#define NF(o, js, f) o.f = (float)js[#f].numOr(o.f);
#define NI(o, js, f) o.f = (int)js[#f].numOr(o.f);
    { auto& o = eng.acid; const auto& j = E["acid"]; NF(o, j, cut) NF(o, j, res) NF(o, j, env) NF(o, j, dec) NF(o, j, acc) NF(o, j, drive) NF(o, j, dtone) NF(o, j, st) NI(o, j, slide) o.wave = j["wave"].strOr("sawtooth") == "square" ? 1 : 2; }
    { auto& o = eng.sub; const auto& j = E["sub"]; NF(o, j, decay) NF(o, j, punch) NF(o, j, drive) NF(o, j, tone) NF(o, j, glide) NF(o, j, click) }
    { auto& o = eng.fm; const auto& j = E["fm"]; NF(o, j, ratio) NF(o, j, index) NF(o, j, decay) NF(o, j, bell) NF(o, j, rel) NF(o, j, bright) }
    { auto& o = eng.pluck; const auto& j = E["pluck"]; NF(o, j, damp) NF(o, j, bright) NF(o, j, body) NF(o, j, len) NF(o, j, width) NF(o, j, drive) }
    { auto& o = eng.super_; const auto& j = E["super"]; NF(o, j, detune) NF(o, j, attack) NF(o, j, release) NF(o, j, bright) NF(o, j, width) NF(o, j, air) }
    { auto& o = eng.chip; const auto& j = E["chip"]; NI(o, j, duty) NF(o, j, dec) NF(o, j, vib) NF(o, j, arp) NF(o, j, crush) NI(o, j, oct) NI(o, j, arpm) }
    { auto& o = eng.sh101; const auto& j = E["sh101"]; NF(o, j, lfoR) NI(o, j, lfoW) NF(o, j, vcoMod) NI(o, j, range) NF(o, j, pw) NI(o, j, pwmSrc) NF(o, j, pulse) NF(o, j, saw) NF(o, j, sub) NI(o, j, subMode)
      NF(o, j, noise) NF(o, j, cut) NF(o, j, res) NF(o, j, env) NF(o, j, vcfMod) NF(o, j, kybd) NI(o, j, vcaMode) NF(o, j, A) NF(o, j, D) NF(o, j, S) NF(o, j, R) NF(o, j, porta) NI(o, j, portaMode) NF(o, j, vol) }
    { auto& o = eng.mini; const auto& j = E["mini"]; NI(o, j, o1r) NI(o, j, o1w) NI(o, j, o2r) NI(o, j, o2w) NF(o, j, o2f) NI(o, j, o3r) NI(o, j, o3w) NF(o, j, o3f) NI(o, j, o3lfo)
      NF(o, j, m1) NI(o, j, m1on) NF(o, j, m2) NI(o, j, m2on) NF(o, j, m3) NI(o, j, m3on) NF(o, j, mn) NI(o, j, mnon) NI(o, j, ncol) NF(o, j, cut) NF(o, j, emph) NF(o, j, contour)
      NF(o, j, fA) NF(o, j, fD) NF(o, j, fS) NF(o, j, aA) NF(o, j, aD) NF(o, j, aS) NI(o, j, decSw) NI(o, j, kt1) NI(o, j, kt2) NF(o, j, glide) NI(o, j, glideOn) NF(o, j, modmix) NI(o, j, oscMod) NI(o, j, filtMod) NF(o, j, modAmt) NF(o, j, vol) }
    { auto& o = bris; const auto& j = E["bris"]; NF(o, j, wave) NF(o, j, pw) NF(o, j, det) NF(o, j, sub) NF(o, j, noise) NF(o, j, glide) NF(o, j, drift) NF(o, j, cut) NF(o, j, res) NF(o, j, fenv) NF(o, j, kt) NF(o, j, fvel)
      NF(o, j, fA) NF(o, j, fD) NF(o, j, fS) NF(o, j, fR) NF(o, j, aA) NF(o, j, aD) NF(o, j, aS) NF(o, j, aR) NF(o, j, lfoW) NF(o, j, lfoR) NF(o, j, lfoSync) NF(o, j, lfoDest) NF(o, j, lfoAmt)
      NF(o, j, cho) NF(o, j, choMix) NF(o, j, dly) NF(o, j, dlyT) NF(o, j, dlyFb) NF(o, j, vmode) NF(o, j, vol) }
#undef NF
#undef NI
    chordKeys = (int)S["chord"]["keys"].numOr(1); chordPad = (int)S["chord"]["pad"].numOr(1);
    for (int i = 0; i < 6; ++i) kit[i] = S["dk"][kTrackIds[i]].strOr("");
    for (int k = 0; k < 4; ++k) {   // BLONDA motor (app field; the web version keeps it untouched)
        const json::Value& M = S["motor"][kMelIds[k]]; MotorState& o = motor[k];
        bris::Bris tmp; tmp.prepare(48000); o.preset = (int)M["preset"].numOr(1); tmp.loadPreset(o.preset);
        for (int p = 0; p < bris::kNumParams; ++p) { const json::Value& v = M["p"][bris::kParams[p].id]; if (v.type == json::Value::Number) tmp.setParam(p, v.num); o.vals[p] = tmp.getParam(p); }
        o.set = true;
    }
    for (int k = 0; k < 4; ++k) { const json::Value& L = S["loops"][k]; LoopSlot& o = loops[k];
        o.sid = L["sid"].strOr(""); o.on = L["on"].numOr(1) != 0; o.vol = (float)L["vol"].numOr(.8); o.bars = (int)L["bars"].numOr(0); }
    song = S["song"].numOr(0) != 0; for (int k = 0; k < 8; ++k) chain[k] = (int)S["chain"][k].numOr(-1);
    glideT = (float)S["glideT"].numOr(.07);
    for (int pi = 0; pi < kPatterns; ++pi) {
        for (int ti = 0; ti < kTracks; ++ti) for (int s = 0; s < kSteps; ++s) {
            const json::Value& c = S["pats"][pi][ti][s]; Cell& x = cells[pi][ti][s];
            x.v = (int)c["v"].numOr(0); x.n = (int)c["n"].numOr(0); x.r = (int)c["r"].numOr(1); x.p = (float)c["p"].numOr(1); x.vel = (float)c["vel"].numOr(-1);
        }
        for (int k = 0; k < 4; ++k) {
            const json::Value& R = S["roll"][pi][kMelIds[k]]; roll[pi][k].clear(); std::map<std::string, int> ids;
            for (size_t i = 0; i < R.arr.size(); ++i) { const std::string id = R[i]["id"].strOr(""); if (!id.empty()) ids[id] = (int)i; }
            for (size_t i = 0; i < R.arr.size(); ++i) {
                const json::Value& n = R[i]; RollNote r; r.s = (float)n["s"].numOr(0); r.l = (float)n["l"].numOr(1); r.n = (int)n["n"].numOr(60); r.v = (float)n["v"].numOr(.72);
                const std::string id = n["id"].strOr(""), g = n["g"].strOr(""); r.id = id.empty() ? -1 : ids[id]; r.g = (!g.empty() && ids.count(g)) ? ids[g] : -1;
                roll[pi][k].push_back(r);
            }
        }
    }
    return true;
}

std::string Project::toJSON(const std::string& base) const {
    json::Value S; if (!json::parse(base, S) || S.type != json::Value::Object) S = json::Value::object();
    using V = json::Value;
    S.at("bpm") = V::number(std::round(bpm * 100) / 100); S.at("pat") = V::number(pat); S.at("solo") = V::number(solo);
    { V& X = S.at("fx");
      X.at("echo").at("on") = V::number(fx.echoOn ? 1 : 0); X.at("echo").at("fb") = V::number(fx.echoFb); X.at("echo").at("time") = V::number(fx.echoTime);
      X.at("space").at("on") = V::number(fx.spaceOn ? 1 : 0); X.at("space").at("size") = V::number(fx.spaceSize);
      X.at("tape").at("on") = V::number(fx.tapeOn ? 1 : 0); X.at("tape").at("color") = V::number(fx.tapeColor);
      X.at("crush").at("on") = V::number(fx.crushOn ? 1 : 0); X.at("crush").at("bits") = V::number(fx.crushBits); X.at("crush").at("mix") = V::number(fx.crushMix); }
    for (int k = 0; k < 4; ++k) { V& M = S.at("motor").at(kMelIds[k]); M.at("preset") = V::number(motor[k].preset);
        for (int p = 0; p < bris::kNumParams; ++p) M.at("p").at(bris::kParams[p].id) = V::number(motor[k].vals[p]); }
    for (int i = 0; i < 6; ++i) { if (!kit[i].empty()) S.at("dk").at(kTrackIds[i]) = V::string_(kit[i]); else if (S.has("dk")) S.at("dk").erase(kTrackIds[i]); }
    for (int k = 0; k < 4; ++k) { V& L = S.at("loops").at((size_t)k); const LoopSlot& o = loops[k];
        L.at("sid") = o.sid.empty() ? V() : V::string_(o.sid); L.at("on") = V::number(o.on ? 1 : 0); L.at("vol") = V::number(o.vol); L.at("bars") = V::number(o.bars); }
    S.at("glideT") = V::number(glideT); S.at("chord").at("keys") = V::number(chordKeys); S.at("chord").at("pad") = V::number(chordPad);
    S.at("song") = V::number(song ? 1 : 0); for (int k = 0; k < 8; ++k) S.at("chain").at((size_t)k) = V::number(chain[k]);
    for (int i = 0; i < kTracks; ++i) {
        S.at("mute").at((size_t)i) = V::number(mute[i]);
        if (len[i] >= 1 && len[i] < 16) S.at("len").at(kTrackIds[i]) = V::number(len[i]); else if (S.has("len")) S.at("len").erase(kTrackIds[i]);
        V& p = S.at("params").at(kTrackIds[i]); const TrackParams& t = params[i];
        p.at("level") = V::number(t.level); p.at("tune") = V::number(t.tune); p.at("decay") = V::number(t.decay); p.at("tone") = V::number(t.tone);
        p.at("pan") = V::number(t.pan); p.at("echo") = V::number(t.echo); p.at("space") = V::number(t.space);
        V& f = S.at("tfx").at(kTrackIds[i]); const TrackFX& x = tfx[i];
        f.at("drive") = V::number(x.drive); f.at("filt") = V::number(x.filt); f.at("reso") = V::number(x.reso);
        f.at("crush") = V::number(x.crush); f.at("comp") = V::number(x.comp); f.at("pump") = V::number(x.pump);
    }
    V& m = S.at("master");
    m.at("filter") = V::number(master.filter); m.at("echo") = V::number(master.echo); m.at("space") = V::number(master.space); m.at("drive") = V::number(master.drive);
    m.at("pump") = V::number(master.pump); m.at("swing") = V::number(master.swing); m.at("vol") = V::number(master.vol);
    for (int k = 0; k < 4; ++k) S.at("inst").at(kMelIds[k]) = V::string_(inst[k]);
    static const char* kWaves[4] = {"sine", "square", "sawtooth", "triangle"};
    for (int k = 0; k < 4; ++k) {
        V& y = S.at("synth").at(kMelIds[k]); const AnalogP& a = synth[k];
        y.at("wave") = V::string_(kWaves[std::max(0, std::min(3, a.wave))]);
        y.at("a") = V::number(a.a); y.at("d") = V::number(a.d); y.at("s") = V::number(a.s); y.at("r") = V::number(a.r);
        y.at("cut") = V::number(a.cut); y.at("res") = V::number(a.res); y.at("env") = V::number(a.env);
    }
    V& E = S.at("eng");
#define WF(o, js, f) js.at(#f) = V::number(o.f);
    { auto& o = eng.acid; V& j = E.at("acid"); WF(o, j, cut) WF(o, j, res) WF(o, j, env) WF(o, j, dec) WF(o, j, acc) WF(o, j, drive) WF(o, j, dtone) WF(o, j, st) WF(o, j, slide) j.at("wave") = V::string_(o.wave == 1 ? "square" : "sawtooth"); }
    { auto& o = eng.sub; V& j = E.at("sub"); WF(o, j, decay) WF(o, j, punch) WF(o, j, drive) WF(o, j, tone) WF(o, j, glide) WF(o, j, click) }
    { auto& o = eng.fm; V& j = E.at("fm"); WF(o, j, ratio) WF(o, j, index) WF(o, j, decay) WF(o, j, bell) WF(o, j, rel) WF(o, j, bright) }
    { auto& o = eng.pluck; V& j = E.at("pluck"); WF(o, j, damp) WF(o, j, bright) WF(o, j, body) WF(o, j, len) WF(o, j, width) WF(o, j, drive) }
    { auto& o = eng.super_; V& j = E.at("super"); WF(o, j, detune) WF(o, j, attack) WF(o, j, release) WF(o, j, bright) WF(o, j, width) WF(o, j, air) }
    { auto& o = eng.chip; V& j = E.at("chip"); WF(o, j, duty) WF(o, j, dec) WF(o, j, vib) WF(o, j, arp) WF(o, j, crush) WF(o, j, oct) WF(o, j, arpm) }
    { auto& o = eng.sh101; V& j = E.at("sh101"); WF(o, j, lfoR) WF(o, j, lfoW) WF(o, j, vcoMod) WF(o, j, range) WF(o, j, pw) WF(o, j, pwmSrc) WF(o, j, pulse) WF(o, j, saw) WF(o, j, sub) WF(o, j, subMode)
      WF(o, j, noise) WF(o, j, cut) WF(o, j, res) WF(o, j, env) WF(o, j, vcfMod) WF(o, j, kybd) WF(o, j, vcaMode) WF(o, j, A) WF(o, j, D) WF(o, j, S) WF(o, j, R) WF(o, j, porta) WF(o, j, portaMode) WF(o, j, vol) }
    { auto& o = eng.mini; V& j = E.at("mini"); WF(o, j, o1r) WF(o, j, o1w) WF(o, j, o2r) WF(o, j, o2w) WF(o, j, o2f) WF(o, j, o3r) WF(o, j, o3w) WF(o, j, o3f) WF(o, j, o3lfo)
      WF(o, j, m1) WF(o, j, m1on) WF(o, j, m2) WF(o, j, m2on) WF(o, j, m3) WF(o, j, m3on) WF(o, j, mn) WF(o, j, mnon) WF(o, j, ncol) WF(o, j, cut) WF(o, j, emph) WF(o, j, contour)
      WF(o, j, fA) WF(o, j, fD) WF(o, j, fS) WF(o, j, aA) WF(o, j, aD) WF(o, j, aS) WF(o, j, decSw) WF(o, j, kt1) WF(o, j, kt2) WF(o, j, glide) WF(o, j, glideOn) WF(o, j, modmix) WF(o, j, oscMod) WF(o, j, filtMod) WF(o, j, modAmt) WF(o, j, vol) }
    { auto& o = bris; V& j = E.at("bris"); WF(o, j, wave) WF(o, j, pw) WF(o, j, det) WF(o, j, sub) WF(o, j, noise) WF(o, j, glide) WF(o, j, drift) WF(o, j, cut) WF(o, j, res) WF(o, j, fenv) WF(o, j, kt) WF(o, j, fvel)
      WF(o, j, fA) WF(o, j, fD) WF(o, j, fS) WF(o, j, fR) WF(o, j, aA) WF(o, j, aD) WF(o, j, aS) WF(o, j, aR) WF(o, j, lfoW) WF(o, j, lfoR) WF(o, j, lfoSync) WF(o, j, lfoDest) WF(o, j, lfoAmt)
      WF(o, j, cho) WF(o, j, choMix) WF(o, j, dly) WF(o, j, dlyT) WF(o, j, dlyFb) WF(o, j, vmode) WF(o, j, vol) }
#undef WF
    for (int pi = 0; pi < kPatterns; ++pi) {
        for (int ti = 0; ti < kTracks; ++ti) for (int st = 0; st < kSteps; ++st) {
            V& c = S.at("pats").at((size_t)pi).at((size_t)ti).at((size_t)st); const Cell& x = cells[pi][ti][st];
            c.at("v") = V::number(x.v); c.at("n") = V::number(x.n);
            if (x.r > 1) c.at("r") = V::number(x.r); else c.erase("r");
            if (x.p < 1) c.at("p") = V::number(x.p); else c.erase("p");
            if (x.vel >= 0) c.at("vel") = V::number(x.vel); else c.erase("vel");
        }
        for (int k = 0; k < 4; ++k) {
            const auto& R = roll[pi][k]; V arr = V::array();
            std::vector<bool> target(R.size(), false); for (const auto& n : R) if (n.g >= 0 && n.g < (int)R.size()) target[n.g] = true;
            for (size_t i = 0; i < R.size(); ++i) {
                const RollNote& n = R[i]; V o = V::object();
                o.at("s") = V::number(n.s); o.at("l") = V::number(n.l); o.at("n") = V::number(n.n); o.at("v") = V::number(n.v);
                if (target[i] || (n.g >= 0 && n.g < (int)R.size())) o.at("id") = V::string_("r" + std::to_string(i));
                if (n.g >= 0 && n.g < (int)R.size()) o.at("g") = V::string_("r" + std::to_string(n.g));
                arr.arr.push_back(o);
            }
            S.at("roll").at((size_t)pi).at(kMelIds[k]) = arr;
        }
    }
    return json::dump(S);
}

// ---------------------------------------------------------------- engine setup
void Seq3::prepare(float sampleRate) {
    sr_ = sampleRate; frame_ = 0;
    for (int i = 0; i < 6; ++i) drums_[i].prepare(sr_, (DrumKind)i);
    drums_[T_HAT].chokeTarget = &drums_[T_OHAT];
    for (auto& m : mot_) m.prepare(sr_);
    for (int k = 0; k < 4; ++k) { mel_[k].prepare(sr_, k == 0); bris_[k].prepare(sr_); }
    const int maxB = 4096;
    for (int i = 0; i < kTracks; ++i) { chL_[i].assign(maxB, 0); chR_[i].assign(maxB, 0); strips_[i].comp.prepare(sr_); }
    for (auto* v : {&busL_, &busR_, &dInL_, &dInR_, &rInL_, &rInR_, &tmpL_, &tmpR_}) v->assign(maxB, 0);
    dlL_.assign((size_t)(2.5 * sr_), 0); dlR_.assign((size_t)(2.5 * sr_), 0); dlW_ = 0;
    for (auto& b : rpBuf_) for (auto& c : b) c.assign((size_t)(4.1 * sr_), 0.f);
    perf_.setTau(.03f, sr_); perf_.snap(0); rpDry_.setTau(.0025f, sr_); rpDry_.snap(1); rpWet_.setTau(.0025f, sr_); rpWet_.snap(0); rpPh_ = 0; rpLoop_ = false;
    comp_.prepare(sr_); lim_.prepare(sr_);
    evq_.reserve(1024); glides_.resize(64);
    load(P_);
}

void buildReverb(Convolver& c, float size, float sr) {
    const int len = std::max(64, (int)(sr * size)); std::vector<float> a(len), b(len); Noise n; n.seed(0x5EACEu);
    for (int i = 0; i < len; ++i) { const float e = std::pow(1.f - (float)i / len, 2.8f); a[i] = n.next() * e; b[i] = n.next() * e; }
    c.setIR(a.data(), b.data(), len, sr, true);
}

void Seq3::setFx(int f, float v) {
    FxParams& X = P_.fx;
    switch (f) {
        case 0: X.echoOn = v != 0; break;
        case 1: X.echoFb = std::max(0.f, std::min(.85f, v)); break;
        case 2: X.echoTime = v; break;
        case 3: X.spaceOn = v != 0; break;
        case 4: X.spaceSize = std::max(.6f, std::min(6.f, v)); break;   // the new IR arrives through swapReverb
        case 5: X.tapeOn = v != 0; break;
        case 6: X.tapeColor = std::max(0.f, std::min(1.f, v)); break;
        case 7: X.crushOn = v != 0; break;
        case 8: X.crushBits = std::max(2.f, std::min(12.f, std::round(v))); break;
        case 9: X.crushMix = std::max(0.f, std::min(1.f, v)); break;
        default: return;
    }
    applyParams();
}

Convolver* Seq3::swapReverb(Convolver* c) {
    Convolver* old = rev_; rev_ = c ? c : &revA_;
    return old == &revA_ ? nullptr : old;
}

void Seq3::load(const Project& p) {
    P_ = p; playing_ = false; evq_.clear();
    for (int k = 0; k < 4; ++k) { mot_[k].reset(); motN_[k] = 0; for (int q = 0; q < bris::kNumParams; ++q) mot_[k].setParam(q, P_.motor[k].vals[q]); }
    // web: comp threshold -12 ratio 1.8 attack .025 release .25 knee 12; limiter -1.5 / 20 / .002 / .12 / 0
    comp_.threshold = -12; comp_.ratio = 1.8f; comp_.attack = .025f; comp_.release = .25f; comp_.knee = 12;
    lim_.threshold = -1.5f; lim_.ratio = 20; lim_.attack = .002f; lim_.release = .12f; lim_.knee = 0;
    // reverb IR (makeIR: noise * (1 - i/len)^2.8, independent per channel)
    if (rev_ != &revA_) { delete rev_; rev_ = &revA_; }
    buildReverb(revA_, P_.fx.spaceSize, sr_);
    designBQ(2, 1800, .6f, sr_, dToneC_); designBQ(1, 250, 1, sr_, rHpC_);
    applyParams();
    for (auto* s : {&dlTime_, &fb_, &dRet_, &rRet_, &pre_, &post_, &tapeF_, &crushWet_, &crushDry_, &lpF_, &hpF_, &out_}) s->snap(s->target);
    for (auto& s : strips_) for (auto* m : {&s.g, &s.pan, &s.se, &s.ss, &s.dpre, &s.dpost, &s.mk, &s.lpf, &s.hpf, &s.lpq, &s.hpq}) m->snap(m->target);
}

// applyAll(): push parameters to the smoothers (time constants like the web's setTargetAtTime calls)
void Seq3::applyParams() {
    for (int i = 0; i < kTracks; ++i) {
        Strip& s = strips_[i]; const TrackParams& p = P_.params[i]; const TrackFX& F = P_.tfx[i];
        s.g.setTau(.01f, sr_); s.g.target = isMuted(i) ? 0.f : p.level;
        s.pan.setTau(.02f, sr_); s.pan.target = p.pan; s.se.setTau(.02f, sr_); s.se.target = p.echo; s.ss.setTau(.02f, sr_); s.ss.target = p.space;
        s.driveOn = F.drive > .005f; s.driveK = 1 + F.drive * 1.6f * 6;
        s.dpre.setTau(.02f, sr_); s.dpre.target = 1 + F.drive * 1.5f; s.dpost.setTau(.02f, sr_); s.dpost.target = 1 / (1 + F.drive * 4.2f);
        const float f = F.filt, q = .7f + F.reso * 14;
        s.lpf.setTau(.03f, sr_); s.lpf.target = f < -.01f ? std::max(60.f, 180.f * std::pow(110.f, 1 + f)) : 20000.f;
        s.hpf.setTau(.03f, sr_); s.hpf.target = f > .01f ? 20.f * std::pow(110.f, f * 1.1f) : 18.f;
        s.lpq.setTau(.03f, sr_); s.lpq.target = f < -.01f ? q : .7f; s.hpq.setTau(.03f, sr_); s.hpq.target = f > .01f ? q : .7f;
        s.crushBits = F.crush > .01f ? (int)std::lround(14 - F.crush * 11) : 0;
        s.comp.threshold = -F.comp * 34; s.comp.ratio = 1 + F.comp * 9; s.comp.attack = .006f; s.comp.release = .12f; s.comp.knee = 6;
        s.mk.setTau(.03f, sr_); s.mk.target = 1 + F.comp * .55f;
    }
    const MasterParams& m = P_.master; const FxParams& X = P_.fx;
    lpF_.setTau(.03f, sr_); lpF_.target = m.filter < 0 ? 200.f * std::pow(100.f, 1 + m.filter) : 20000.f;
    hpF_.setTau(.03f, sr_); hpF_.target = m.filter > 0 ? 20.f * std::pow(100.f, m.filter * 1.15f) : 20.f;
    const float dr = X.tapeOn ? m.drive : 0.f; pre_.setTau(.03f, sr_); pre_.target = 1 + dr * .8f; post_.setTau(.03f, sr_); post_.target = 1 / (1 + dr * .75f);
    tapeF_.setTau(.05f, sr_); tapeF_.target = X.tapeOn ? 3500.f * std::pow(5.5f, X.tapeColor) : 20000.f;
    crushWet_.setTau(.03f, sr_); crushWet_.target = X.crushOn ? X.crushMix : 0.f; crushDry_.setTau(.03f, sr_); crushDry_.target = X.crushOn ? 1 - X.crushMix * .6f : 1.f;
    fb_.setTau(.05f, sr_); fb_.target = X.echoFb; dRet_.setTau(.03f, sr_); dRet_.target = X.echoOn ? m.echo : 0.f; rRet_.setTau(.03f, sr_); rRet_.target = X.spaceOn ? m.space * .7f : 0.f;
    dlTime_.setTau(.05f, sr_); dlTime_.target = 60.f / P_.bpm * X.echoTime; out_.setTau(.03f, sr_); out_.target = m.vol;
    for (int i = 0; i < 6; ++i) { drums_[i].setKit(P_.kit[i].c_str()); drums_[i].params = {P_.params[i].tune, P_.params[i].decay, P_.params[i].tone}; }   // ohat has its own kit entry (S.dk.ohat)
    for (int k = 0; k < 4; ++k) {
        const std::string& in = P_.inst[k]; MelodicTrack& M = mel_[k];
        M.engine = in == "acid" ? Eng::Acid : in == "sub" ? Eng::Sub : in == "fm" ? Eng::FM : in == "pluck" ? Eng::Pluck : in == "chip" ? Eng::Chip : in == "super" ? Eng::Super :
                   in == "sh101" ? Eng::SH101 : in == "mini" ? Eng::Mini : Eng::Analog;
        M.params = &P_.eng; M.analog = &P_.synth[k]; M.bpm = P_.bpm; const TrackParams& tp = P_.params[6 + k]; M.sound = {tp.tone, tp.tune, tp.decay};
        Bris& B = bris_[k]; B.params = P_.bris; B.bpm = P_.bpm; B.trackTone = tp.tone; B.trackTune = tp.tune; B.trackDecay = tp.decay;
    }
}

void Seq3::setPerform(bool on, float f, float fx) {
    const MasterParams& m = P_.master; const FxParams& X = P_.fx;
    if (!on) {   // web xyEnd: perf 0 (.12), feedback back (.4), filters and returns back to the master settings
        perf_.setTau(.12f, sr_); perf_.target = 0; applyParams(); fb_.setTau(.4f, sr_); fb_.target = X.echoFb; return;
    }
    f = std::max(-1.f, std::min(1.f, f)); fx = std::max(0.f, std::min(1.f, fx));
    lpF_.setTau(.02f, sr_); lpF_.target = f < 0 ? 200.f * std::pow(100.f, 1 + f) : 20000.f;
    hpF_.setTau(.02f, sr_); hpF_.target = f > 0 ? 20.f * std::pow(100.f, f * 1.15f) : 20.f;
    perf_.setTau(.03f, sr_); perf_.target = fx * .45f;
    fb_.setTau(.05f, sr_); fb_.target = std::min(.85f, X.echoFb + fx * .42f);
    dRet_.setTau(.05f, sr_); dRet_.target = m.echo + fx * .45f;
    rRet_.setTau(.05f, sr_); rRet_.target = m.space * .7f + fx * .55f;
}

void Seq3::repeat(int mode, int div) {
    static const double kBeats[9] = {2, 1, .5, 1. / 3, .25, 1. / 6, .125, 1. / 12, .0625};
    if (mode == 0) { if (rpPh_) { rpPh_ = 0; rpDry_.target = 1; rpWet_.target = 0; } return; }
    div = std::max(0, std::min(8, div));
    const int len = std::max(16, std::min((int)rpBuf_[0][0].size() - 1, (int)std::lround(kBeats[div] * 60.0 / P_.bpm * sr_)));
    if (mode == 2 && rpPh_ == 3 && len < rpLen_) { rpShort_ = len; return; }   // shorter: switch at the next loop boundary
    // next 16th on the grid (or right away when stopped), then capture `len` frames into the free buffer
    const double now = (double)frame_ / sr_ + .02, sd = 60.0 / P_.bpm / 4;
    double T = now;
    if (playing_) { T = nextT_ - std::floor((nextT_ - now) / sd) * sd; if (T < now) T += sd; }
    rpT_ = (long long)std::llround(T * sr_); rpNew_ = len; rpShort_ = 0; rpPh_ = 1;
}

// ---------------------------------------------------------------- samples
void Seq3::setLoop(int k, const SampleData* smp, float srcBpm, int bars, float norm) {
    if (k < 0 || k >= 4) return;
    if (loopRt_[k].s != smp) killLoops(k);
    loopRt_[k] = {smp, srcBpm, std::max(1, bars), norm};
}
void Seq3::setLoopOn(int k, bool on) { if (k < 0 || k >= 4) return; P_.loops[k].on = on; if (!on) killLoops(k); }
void Seq3::setLoopVol(int k, float v) {
    if (k < 0 || k >= 4) return; P_.loops[k].vol = std::max(0.f, std::min(1.f, v));
    for (auto& L : lvox_) if (L.active && L.slot == k && !L.killing) L.lv = P_.loops[k].vol * loopRt_[k].norm * .8f;
}
void Seq3::setDrumSample(int i, const SampleData* smp, float norm) {
    if (i < 0 || i >= 6) return;
    dsmp_[i] = smp; dnorm_[i] = norm;
    if (!smp) { P_.kit[i].clear(); drums_[i].setKit(""); }
}
void Seq3::previewSample(const SampleData* smp, float rate, float gain) {
    killLoops(-2);
    if (smp && smp->frames > 0) startLoop(-2, smp, frame_ + 64, smp->frames / (double)sr_ / std::max(.05f, rate), rate, gain);
}
void Seq3::dropSample(const SampleData* smp) {
    for (auto& v : svox_) if (v.s == smp) v.active = false;
    for (auto& v : lvox_) if (v.s == smp) v.active = false;
    for (auto& R : loopRt_) if (R.s == smp) R.s = nullptr;
    for (int i = 0; i < 6; ++i) if (dsmp_[i] == smp) dsmp_[i] = nullptr;
}
void Seq3::startSample(int i, long long f, float vel) {
    const SampleData* s = dsmp_[i]; if (!s || s->frames < 2) return;
    SampleVoice* v = nullptr; long long oldest = LLONG_MAX;
    for (auto& x : svox_) { if (!x.active) { v = &x; break; } if (x.start < oldest) { oldest = x.start; v = &x; } }
    const TrackParams& p = P_.params[i];
    *v = SampleVoice{}; v->s = s; v->track = i; v->active = true; v->start = f;
    v->rate = std::pow(2.0, p.tune / 12.0);
    const double len = s->frames / (double)sr_ / v->rate;
    v->len = p.decay >= .97f ? len : std::min(len, .025 + std::pow((double)p.decay, 1.7) * 2.6); v->holdEnd = v->len * .55;
    v->lv = vel * dnorm_[i] * .95f;
    const float tn = p.tone;
    designBQ(0, tn >= .5f ? 20000.f : 180.f * std::pow(110.f, tn * 2), 1.f, sr_, v->lpc);
    designBQ(1, tn <= .5f ? 18.f : 18.f * std::pow(45.f, (tn - .5f) * 2), 1.f, sr_, v->hpc);
    sampleTail_[i] = true;
    if (i == T_KICK) pump((double)f / sr_);
}
void Seq3::renderSamples(long long b0, int n) {
    for (int i = 0; i < 6; ++i) { bool any = false; for (const auto& v : svox_) if (v.active && v.track == i) any = true; if (!any && !dsmp_[i]) sampleTail_[i] = false; }
    const float chk = std::exp(-1.f / (.008f * sr_));
    for (auto& v : svox_) {
        if (!v.active) continue;
        float* cl = chL_[v.track].data(); float* cr = chR_[v.track].data(); const SampleData& S = *v.s;
        const float lg = std::log(.0001f / std::max(1e-4f, v.lv));
        for (int x = 0; x < n; ++x) {
            const long long f = b0 + x; if (f < v.start) continue;
            const double tau = (double)(f - v.start) / sr_;
            if (tau >= v.len || v.pos >= S.frames - 1) { v.active = false; break; }
            float g = v.lv; if (tau > v.holdEnd) g = v.lv * std::exp(lg * (float)((tau - v.holdEnd) / std::max(1e-4, v.len - v.holdEnd)));
            if (v.choked && f >= v.chokeAt) { v.chokeG *= chk; g *= v.chokeG; if (v.chokeG < 1e-4f) { v.active = false; break; } }
            float l = hermiteAt(S.L.data(), S.frames, v.pos), r = hermiteAt(S.R.data(), S.frames, v.pos); v.pos += v.rate;
            l = runBQ(v.hpc, &v.z[0][2], runBQ(v.lpc, &v.z[0][0], l)); r = runBQ(v.hpc, &v.z[1][2], runBQ(v.lpc, &v.z[1][0], r));
            cl[x] += l * g; cr[x] += r * g;
        }
    }
}
void Seq3::startLoop(int slot, const SampleData* s, long long f, double dur, double rate, float lv) {
    LoopVoice* v = nullptr; long long oldest = LLONG_MAX;
    for (auto& x : lvox_) { if (!x.active) { v = &x; break; } if (x.start < oldest) { oldest = x.start; v = &x; } }
    *v = LoopVoice{}; v->s = s; v->slot = slot; v->active = true; v->start = f; v->end = f + (long long)std::llround(dur * sr_); v->rate = rate; v->lv = lv;
}
void Seq3::killLoops(int slot) {
    for (auto& v : lvox_) if (v.active && (slot == -1 ? v.slot >= 0 : v.slot == slot)) { if (v.start > frame_) v.active = false; else v.killing = true; }
}
void Seq3::renderLoops(long long b0, int n) {
    const float kc = std::exp(-1.f / (.01f * sr_)), up = .004f * sr_, dn = .008f * sr_;
    for (auto& v : lvox_) {
        if (!v.active) continue; const SampleData& S = *v.s;
        for (int x = 0; x < n; ++x) {
            const long long f = b0 + x; if (f < v.start) continue;
            if (f >= v.end) { v.active = false; break; }
            float env = 1; const float a = (float)(f - v.start), b = (float)(v.end - f);
            if (a < up) env = a / up; if (b < dn) env = std::min(env, b / dn);
            if (v.killing) { v.g = v.g == 0 ? 1 : v.g * kc; if (v.g < 1e-4f) { v.active = false; break; } env *= v.g; }
            if (v.pos < S.frames - 1) {
                const float gg = env * v.lv;
                busL_[x] += hermiteAt(S.L.data(), S.frames, v.pos) * gg; busR_[x] += hermiteAt(S.R.data(), S.frames, v.pos) * gg;
            }
            v.pos += v.rate;
        }
    }
}

// ---------------------------------------------------------------- BLONDA motor
void Seq3::renderMotor(int k, long long b0, int n, float* L, float* R) {
    bris::Bris& m = mot_[k];
    if (P_.inst[k] != "bris6" && motN_[k] == 0 && motEnv_[k] < 1e-5) return;   // silent and not in use
    float bl[128], br[128]; int at = 0;
    auto run = [&](int to) { if (to > at) { m.process(bl + at, br + at, to - at); at = to; } };
    for (;;) {   // next event inside this block
        int best = -1; long long bf = LLONG_MAX;
        for (int i = 0; i < motN_[k]; ++i) if (motQ_[k][i].f < b0 + n && motQ_[k][i].f < bf) { bf = motQ_[k][i].f; best = i; }
        if (best < 0) break;
        const MotEv e = motQ_[k][best]; motQ_[k][best] = motQ_[k][--motN_[k]];
        run((int)std::max(0LL, e.f - b0));
        if (e.on) m.noteOn(e.note, std::max(1, std::min(127, (int)std::lround(e.vel * 127))));
        else if (e.gen == 0 || e.gen == motGen_[k][e.note]) m.noteOff(e.note);
    }
    run(n);
    for (int x = 0; x < n; ++x) { L[x] += bl[x]; R[x] += br[x]; }
    motEnv_[k] = m.envelope();
}

void Seq3::play() { if (playing_) { stop(); return; } for (auto& m : marks_) m = {-1, -1}; playing_ = true; step_ = 0; gstep_ = 0; bar_ = 0; songStart_ = true; nextT_ = (double)frame_ / sr_ + .06; nextF_ = (long long)std::llround(nextT_ * sr_); }
void Seq3::stop() { killLoops(-1); playing_ = false; curStep_ = -1; audible_ = -1; for (auto& m : marks_) m = {-1, -1}; if (queued_ >= 0) { P_.pat = queued_; queued_ = -1; } }

// ---------------------------------------------------------------- pump (duckAt)
void Seq3::duckAt(WebParam& g, double t, float a, float base) {
    const float dip = std::min(1.f, std::pow(a, .7f)), floor = dip >= .999f ? 0.f : std::max(0.f, 1 - dip), over = std::max(0.f, a - 1);
    const float hold = .02f + std::min(a, 1.f) * .13f + over * .3f, rel = .04f + std::min(a, 1.f) * .2f + over * 1.1f;
    g.cancelAndHold(t); g.linearRampToValueAtTime(floor * base, t + .004); g.setValueAtTime(floor * base, t + .004 + hold); g.setTargetAtTime(base, t + .004 + hold, rel / 3);
}
void Seq3::pump(double t) {
    for (int i = 1; i < kTracks; ++i) { const float a = P_.tfx[i].pump; if (a > 0) duckAt(strips_[i].pg, t, a, 1); }
    if (P_.master.pump > 0) duckAt(duck_, t, P_.master.pump, 1);
}

// ---------------------------------------------------------------- sequencer (port of schedule())
void Seq3::trigger(int i, long long f, float vel, int note, float ls, int glide) {
    if (i < 6) {   // drums are built at schedule time (like the web), so a later closed hat can choke a scheduled open hat
        if (i == T_KICK && isMuted(i)) return;
        if (i == T_HAT) for (auto& v : svox_) if (v.active && v.track == T_OHAT && !v.choked) { v.choked = true; v.chokeAt = f; }   // web hatChoke
        if (dsmp_[i]) startSample(i, f, vel); else drums_[i].triggerAt(vel, f);
        if (i == T_KICK) pump((double)f / sr_);
        return;
    }
    if (evq_.size() < 1024) evq_.push_back({f, i, vel, note, ls, glide});
}

void Seq3::scheduleStep(long long) {
    if (step_ == 0) {
        if (P_.song && std::any_of(P_.chain.begin(), P_.chain.end(), [](int v) { return v >= 0; })) {
            auto first = [&] { for (int k = 0; k < 8; ++k) if (P_.chain[k] >= 0) return k; return -1; };
            auto next = [&](int i) { for (int k = 1; k <= 8; ++k) { int j = ((i < 0 ? -1 : i) + k + 8) % 8; if (P_.chain[j] >= 0) return j; } return first(); };
            chainIdx_ = songStart_ ? first() : next(chainIdx_); songStart_ = false; P_.pat = P_.chain[chainIdx_]; queued_ = -1;
        } else if (queued_ >= 0) { P_.pat = queued_; queued_ = -1; }
    }
    if (step_ == 0) {   // web loopsBar(t, bar): every N bars each loop restarts on the downbeat
        const long long f0 = (long long)std::llround(nextT_ * sr_);
        for (int k = 0; k < 4; ++k) {
            const LoopRt& R = loopRt_[k]; const LoopSlot& o = P_.loops[k];
            if (!R.s || !o.on) continue; const int bars = std::max(1, R.bars); if (bar_ % bars) continue;
            startLoop(k, R.s, f0, bars * 240.0 / P_.bpm, P_.bpm / std::max(1.f, R.srcBpm), o.vol * R.norm * .8f);
        }
    }
    Noise& prob = prob_;
    const int ps = step_; const double sd = stepDur();
    const double t = nextT_ + ((ps % 2) ? P_.master.swing * sd * .66 : 0.0);
    const int pat = std::min(3, std::max(0, P_.pat));
    for (int i = 0; i < kTracks; ++i) {
        const int L = trkLen(i), q = L < 16 ? gstep_ % L : ps;
        if (i >= 6) {
            const int k = i - 6; const auto& RR = P_.roll[pat][k];
            // glide targets: notes pointed to by an earlier note's g
            std::array<bool, 256> tg{}; for (const auto& m : RR) if (m.g >= 0 && m.g < (int)RR.size() && RR[m.g].s > m.s && m.g < 256) tg[m.g] = true;
            const Cell& cl = P_.cells[pat][i][q]; const bool pass = prob.uni() < cl.p; const int rr = cl.r > 0 ? cl.r : 1;
            for (size_t ni = 0; ni < RR.size(); ++ni) {
                const RollNote& nt = RR[ni];
                if (!pass || (int)std::floor(nt.s + 1e-6) != q || (ni < 256 && tg[ni])) continue;
                const double tt = t + (nt.s - q) * sd;
                Glide G; G.n = 0; float end = nt.s + nt.l; const RollNote* cur = &nt; int guard = 0;
                while (cur->g >= 0 && guard++ < 16) { const RollNote& nx = RR[cur->g]; if (nx.s <= cur->s) break; if (G.n < 16) { G.at[G.n] = nx.s - nt.s; G.note[G.n] = nx.n; ++G.n; } end = nx.s + nx.l; cur = &nx; }
                if (rr > 1 && G.n == 0) {
                    for (int r = 0; r < rr; ++r) trigger(i, (long long)std::llround((tt + r * sd / rr) * sr_), nt.v * (r ? .82f : 1.f), nt.n, nt.l / rr, -1);
                } else {
                    int gi = -1;
                    if (G.n) { G.sd = (float)sd; G.n0 = nt.n; G.gt = (P_.inst[k] == "acid") ? .02f + P_.eng.acid.st * .28f : P_.glideT; gi = glideN_ % (int)glides_.size(); glides_[gi] = G; ++glideN_; }
                    trigger(i, (long long)std::llround(tt * sr_), nt.v, nt.n, end - nt.s, gi);
                }
            }
            continue;
        }
        const Cell& st = P_.cells[pat][i][q];
        if (st.v && prob.uni() < st.p) {
            const float vel = st.vel >= 0 ? st.vel : (st.v == 2 ? 1.f : .72f); const int rr = st.r > 0 ? st.r : 1;
            for (int r = 0; r < rr; ++r) trigger(i, (long long)std::llround((t + r * sd / rr) * sr_), vel * (r ? .8f : 1.f), st.n, 1, -1);
        }
    }
    curStep_ = ps; marks_[markW_++ & 31] = {(long long)std::llround(nextT_ * sr_), ps}; nextT_ += sd; step_ = (step_ + 1) % 16; ++gstep_; if (step_ == 0) ++bar_;
}

void Seq3::schedule(long long blockStart) {
    // like the web scheduler: everything that starts within the next 120 ms is scheduled now
    const double now = (double)blockStart / sr_;
    while (playing_ && nextT_ < now + .12) scheduleStep(blockStart);
}

void Seq3::dispatch(long long blockStart, int frames) {
    const long long blockEnd = blockStart + frames;
    for (size_t e = 0; e < evq_.size();) {
        const Ev ev = evq_[e];
        if (ev.f >= blockEnd) { ++e; continue; }
        const int off = (int)std::max(0LL, ev.f - blockStart);
        const int i = ev.track; const double t = (double)(blockStart + off) / sr_;
        (void)t;
        {
            const int k = i - 6; const float len = (float)(60.0 / P_.bpm / 4.0 * (ev.ls > 0 ? ev.ls : 1));
            int iv[6]; int n = 0;
            const bool single = (k == 1 && P_.chordKeys == 0) || (k == 3 && P_.chordPad == 0);
            if (single || k == 0 || k == 2) { iv[0] = 0; n = 1; }
            else if (k == 1) { const int v[5] = {0, 3, 7, 10, 14}; for (int x = 0; x < 5; ++x) iv[x] = v[x]; n = 5; }
            else { const auto& sc = SCALE(); const int idx = scaleIndex(sc, ev.note);
                   if (idx < 0 || idx + 6 >= (int)sc.size()) { iv[0] = 0; iv[1] = 7; iv[2] = 10; iv[3] = 15; }
                   else { iv[0] = 0; iv[1] = sc[idx + 2] - ev.note; iv[2] = sc[idx + 4] - ev.note; iv[3] = sc[idx + 6] - ev.note; } n = 4; }
            if (P_.inst[k] == "bris6") {   // BLONDA motor: note on now, note off after the note length (a newer hit of the same note wins)
                const long long f0 = blockStart + off, f1 = f0 + std::max<long long>(1, (long long)std::llround(len * sr_));
                const int tr = (int)std::lround(P_.params[6 + k].tune);
                for (int x = 0; x < n; ++x) { const int nn = std::max(0, std::min(127, ev.note + iv[x] + tr)); const uint32_t g = ++motGen_[k][nn];
                    motorEvent(k, f0, nn, ev.vel, true); motorEvent(k, f1, nn, 0, false, g); }
            } else if (P_.inst[k] == "bris") {
                Bris& B = bris_[k]; const int nn = B.params.vmode > .5f && B.params.vmode < 1.5f ? 1 : n;
                for (int x = 0; x < nn; ++x) B.noteOn(ev.note + iv[x], ev.vel, off, nn, len, ev.glide >= 0 ? &glides_[ev.glide] : nullptr);
            } else mel_[k].trigger(ev.vel, ev.note, len, iv, n, off, ev.glide >= 0 ? &glides_[ev.glide] : nullptr);
        }
        evq_.erase(evq_.begin() + e);
    }
}

void Seq3::liveNote(int track, int note, float vel, bool on) {
    if (track < 6) { if (on) trigger(track, frame_, vel, 60, 1, -1); return; }
    const int k = track - 6;
    if (P_.inst[k] == "bris") { if (on) bris_[k].noteOn(note, vel, 0, 1, 0.f); else bris_[k].noteOff(note, 0); return; }
    if (P_.inst[k] == "bris6") { const int nn = std::max(0, std::min(127, note + (int)std::lround(P_.params[6 + k].tune))); if (on) { ++motGen_[k][nn]; motorEvent(k, frame_, nn, vel, true); } else motorEvent(k, frame_, nn, 0, false, motGen_[k][nn]); return; }
    if (on) { const int iv[1] = {0}; mel_[k].trigger(vel, note, (float)(60.0 / P_.bpm / 4.0 * 24), iv, 1, 0, nullptr, true); }
    else mel_[k].releaseLive(note);
}

// ---------------------------------------------------------------- render
void Seq3::render(float* L, float* R, int frames) {
    while (frames > 0) {
        const int n = std::min(frames, 128);
        const long long b0 = frame_;
        schedule(b0); dispatch(b0, n);
        // instruments into their channels
        for (int i = 0; i < kTracks; ++i) { std::memset(chL_[i].data(), 0, sizeof(float) * n); std::memset(chR_[i].data(), 0, sizeof(float) * n); }
        for (int i = 0; i < 6; ++i) drums_[i].process(chL_[i].data(), n);
        for (int i = 0; i < 6; ++i) if (dsmp_[i] || sampleTail_[i]) std::memcpy(chR_[i].data(), chL_[i].data(), sizeof(float) * n);
        renderSamples(b0, n);
        for (int k = 0; k < 4; ++k) { mel_[k].process(chL_[6 + k].data(), chR_[6 + k].data(), n); bris_[k].process(chL_[6 + k].data(), chR_[6 + k].data(), n); }
        for (int k = 0; k < 4; ++k) renderMotor(k, b0, n, chL_[6 + k].data(), chR_[6 + k].data());
        std::memset(busL_.data(), 0, sizeof(float) * n); std::memset(busR_.data(), 0, sizeof(float) * n);
        std::memset(dInL_.data(), 0, sizeof(float) * n); std::memset(dInR_.data(), 0, sizeof(float) * n);
        std::memset(rInL_.data(), 0, sizeof(float) * n); std::memset(rInR_.data(), 0, sizeof(float) * n);
        std::memset(tmpL_.data(), 0, sizeof(float) * n); std::memset(tmpR_.data(), 0, sizeof(float) * n);   // melodic sum (before duck)
        // channel strips
        for (int i = 0; i < kTracks; ++i) {
            Strip& s = strips_[i]; float* cl = chL_[i].data(); float* cr = chR_[i].data();
            const bool stereoSrc = (i >= 6 && (P_.inst[i - 6] == "pluck" || P_.inst[i - 6] == "super" || P_.inst[i - 6] == "bris" || P_.inst[i - 6] == "bris6")) || (i < 6 && (dsmp_[i] || sampleTail_[i]));
            if (!stereoSrc) for (int x = 0; x < n; ++x) cr[x] = cl[x];
            const float kn = 1.f / std::tanh(s.driveK);
            for (int x = 0; x < n; ++x) {
                const float dpre = s.dpre.next(), dpost = s.dpost.next();
                for (int c = 0; c < 2; ++c) {
                    float v = (c ? cr : cl)[x] * dpre;
                    if (s.driveOn) {   // driveCurve(drive*1.6) on a 2x-oversampled WaveShaper (128-frame latency)
                        const float mid = .5f * (s.up[c] + v); s.up[c] = v; float y = s.dec[c].process(driveCurve(mid, s.driveK, kn), driveCurve(v, s.driveK, kn));
                        float* lb = s.lat.data() + c * 128; const float o = lb[s.li]; lb[s.li] = y; v = o;
                    }
                    (c ? cr : cl)[x] = v * dpost;
                }
                if (s.driveOn) s.li = s.li + 1 >= 112 ? 0 : s.li + 1;
                const float lf = s.lpf.next(), hf = s.hpf.next(), lq = s.lpq.next(), hq = s.hpq.next();
                if (std::fabs(lf - s.lastLp[0]) > 1e-3f || std::fabs(lq - s.lastLp[1]) > 1e-5f) { designBQ(0, lf, lq, sr_, s.lpc); s.lastLp[0] = lf; s.lastLp[1] = lq; }
                if (std::fabs(hf - s.lastHp[0]) > 1e-3f || std::fabs(hq - s.lastHp[1]) > 1e-5f) { designBQ(1, hf, hq, sr_, s.hpc); s.lastHp[0] = hf; s.lastHp[1] = hq; }
                for (int c = 0; c < 2; ++c) { float v = (c ? cr : cl)[x]; v = runBQ(s.lpc, &s.bq[c][0], v); v = runBQ(s.hpc, &s.bq[c][2], v); if (s.crushBits) v = crushCurve(v, s.crushBits); (c ? cr : cl)[x] = v; }
            }
            s.comp.process(cl, cr, n);
            for (int x = 0; x < n; ++x) {
                const double t = (double)(b0 + x) / sr_;
                const float g = s.mk.next() * s.pg.valueAt(t) * s.g.next(), se = s.se.next(), ss = s.ss.next(), pan = s.pan.next();
                float l = cl[x] * g, r = cr[x] * g;
                dInL_[x] += l * se; dInR_[x] += r * se; rInL_[x] += l * ss; rInR_[x] += r * ss;
                panStereo(l, r, pan);   // Chrome's per-track compressor always outputs stereo, so every panner sees two channels
                if (i >= 6) { tmpL_[x] += l; tmpR_[x] += r; } else { busL_[x] += l; busR_[x] += r; }
            }
        }
        // duck (melodic) -> dry -> bus
        for (int x = 0; x < n; ++x) { const float d = duck_.valueAt((double)(b0 + x) / sr_); busL_[x] += tmpL_[x] * d; busR_[x] += tmpR_[x] * d; }
        renderLoops(b0, n);   // web: loopBus -> dry
        // live throw (web: dry -> perf -> dIn + rIn)
        for (int x = 0; x < n; ++x) { const float g = perf_.next(); if (g > 1e-5f) { dInL_[x] += busL_[x] * g; dInR_[x] += busR_[x] * g; rInL_[x] += busL_[x] * g; rInR_[x] += busR_[x] * g; } }
        // echo: dIn -> delay -> bandpass 1800 -> feedback; return to bus
        const int DL = (int)dlL_.size();
        for (int x = 0; x < n; ++x) {
            const float dt = std::max(128.f, dlTime_.next() * sr_), fb = fb_.next(), ret = dRet_.next();
            float rp = (float)dlW_ - dt; while (rp < 0) rp += DL; const int i0 = (int)rp; const float fr = rp - i0; const int i1 = (i0 + 1) % DL;
            const float yl = runBQ(dToneC_, dToneZ_[0], dlL_[i0] + (dlL_[i1] - dlL_[i0]) * fr), yr = runBQ(dToneC_, dToneZ_[1], dlR_[i0] + (dlR_[i1] - dlR_[i0]) * fr);
            dlL_[dlW_] = dInL_[x] + yl * fb; dlR_[dlW_] = dInR_[x] + yr * fb; dlW_ = (dlW_ + 1) % DL;
            busL_[x] += yl * ret; busR_[x] += yr * ret;
        }
        // space: rIn -> HP 250 -> convolver -> return
        for (int x = 0; x < n; ++x) { rInL_[x] = runBQ(rHpC_, rHpZ_[0], rInL_[x]); rInR_[x] = runBQ(rHpC_, rHpZ_[1], rInR_[x]); }
        std::memset(tmpL_.data(), 0, sizeof(float) * n); std::memset(tmpR_.data(), 0, sizeof(float) * n);
        rev_->process(rInL_.data(), rInR_.data(), tmpL_.data(), tmpR_.data(), n);
        for (int x = 0; x < n; ++x) { const float g = rRet_.next(); busL_[x] += tmpL_[x] * g; busR_[x] += tmpR_[x] * g; }
        if (dbgInBus) for (int x = 0; x < n; ++x) { busL_[x] = dbgInPos + 1 < dbgInBus->size() ? (*dbgInBus)[dbgInPos] : 0.f; busR_[x] = dbgInPos + 1 < dbgInBus->size() ? (*dbgInBus)[dbgInPos + 1] : 0.f; dbgInPos += 2; }
        if (dbgBus) for (int x = 0; x < n; ++x) { dbgBus->push_back(busL_[x]); dbgBus->push_back(busR_[x]); }
        // beat repeat (web: bus -> rpDry -> pre, bus -> rpIn -> delay(fb) -> rpWet -> pre)
        if (rpPh_ || rpLoop_ || rpWet_.target > 0 || rpDry_.v < .9999f) {
            for (int x = 0; x < n; ++x) {
                const long long f = (long long)(b0 + x);
                if (rpPh_ == 1 && f >= rpT_) { rpPh_ = 2; rpW_ = 0; rpCap_ = rpLoop_ ? 1 - rpCur_ : rpCap_; rpDry_.target = 1; rpWet_.target = 0; }
                const float inL = busL_[x], inR = busR_[x];
                if (rpPh_ == 2) {
                    rpBuf_[rpCap_][0][rpW_] = inL; rpBuf_[rpCap_][1][rpW_] = inR;
                    if (++rpW_ >= rpNew_) { rpPh_ = 3; rpCur_ = rpCap_; rpCap_ = 1 - rpCur_; rpLen_ = rpNew_; rpPos_ = 0; rpLoop_ = true; rpDry_.target = 0; rpWet_.target = 1; }
                }
                float lL = 0, lR = 0;
                if (rpLoop_) {
                    lL = rpBuf_[rpCur_][0][rpPos_]; lR = rpBuf_[rpCur_][1][rpPos_];
                    if (++rpPos_ >= rpLen_) { rpPos_ = 0; if (rpShort_) { rpLen_ = rpShort_; rpShort_ = 0; } }
                }
                const float d = rpDry_.next(), w = rpWet_.next();
                if (rpLoop_ && rpPh_ != 3 && w < 1e-4f && rpWet_.target == 0) rpLoop_ = false;
                busL_[x] = inL * d + lL * w; busR_[x] = inR * d + lR * w;
            }
        }
        // master: pre -> tape drive (2x shaper, 128 latency) -> post -> tape LP -> crush -> filter -> comp -> limiter -> out
        const float dr = P_.fx.tapeOn ? P_.master.drive : 0.f, k = 1 + dr * 6, kn = 1.f / std::tanh(k);
        for (int x = 0; x < n; ++x) {
            const float pre = pre_.next(), post = post_.next(), tf = tapeF_.next(), cw = crushWet_.next(), cd = crushDry_.next(), lf = lpF_.next(), hf = hpF_.next();
            if (std::fabs(tf - lastTape_) > 1e-2f) { designBQ(0, tf, .4f, sr_, tapeC_); lastTape_ = tf; }
            if (std::fabs(lf - lastMLp_) > 1e-2f) { designBQ(0, lf, .9f, sr_, mLpC_); lastMLp_ = lf; }
            if (std::fabs(hf - lastMHp_) > 1e-3f) { designBQ(1, hf, .9f, sr_, mHpC_); lastMHp_ = hf; }
            for (int c = 0; c < 2; ++c) {
                float v = (c ? busR_ : busL_)[x] * pre;
                static const int skipS = getenv("MASTER_SKIP") ? atoi(getenv("MASTER_SKIP")) : 0;
                const float mid = .5f * (shUp_[c] + v); shUp_[c] = v; float y = (skipS & 1) ? v : shDec_[c].process(driveCurve(mid, k, kn), driveCurve(v, k, kn));
                float* lb = shLat_.data() + c * 128; const float o = lb[shLi_]; lb[shLi_] = y; v = o * post;
                if (!(skipS & 2)) v = runBQ(tapeC_, tapeZ_[c], v);
                v = cw > 1e-6f ? v * cd + crushCurve(v, (int)P_.fx.crushBits) * cw : v * cd;
                v = runBQ(mLpC_, mLpZ_[c], v); v = runBQ(mHpC_, mHpZ_[c], v);
                (c ? busR_ : busL_)[x] = v;
            }
            shLi_ = shLi_ + 1 >= 112 ? 0 : shLi_ + 1;
        }
        { static const int skip = getenv("MASTER_SKIP") ? atoi(getenv("MASTER_SKIP")) : 0;
          static FILE* dc = getenv("DUMP_COMPIN") ? fopen(getenv("DUMP_COMPIN"), "wb") : nullptr; if (dc) for (int x = 0; x < n; ++x) { fwrite(&busL_[x], 4, 1, dc); fwrite(&busR_[x], 4, 1, dc); }
          if (!(skip & 4)) comp_.process(busL_.data(), busR_.data(), n); if (!(skip & 8)) lim_.process(busL_.data(), busR_.data(), n); }
        for (int x = 0; x < n; ++x) { const float o = out_.next(); L[x] = busL_[x] * o; R[x] = busR_[x] * o; }
        { long long best = -1; int st = -1; for (const auto& m : marks_) if (m.f <= frame_ + n && m.f > best) { best = m.f; st = m.step; } audible_ = playing_ ? st : -1; }
        L += n; R += n; frames -= n; frame_ += n;
    }
}

} // namespace blonda
