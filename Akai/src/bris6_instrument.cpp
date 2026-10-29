#include "akai/bris6_instrument.hpp"
#include "../gen/bris6_gen.hpp"
#include "../gen/bris6_tables.hpp"
#include <cstring>

namespace akai {

namespace T = m4l::bris6;

namespace {
int idx(const char* id) { for (int i = 0; i < T::kNumParams; ++i) if (!std::strcmp(T::kParams[i].info.id, id)) return i; return -1; }

struct PageDef { const char* name; const char* ids[3]; };
// MPC pages: three knobs each, grouped like the device's panel. All 36 panel parameters are reachable.
const PageDef kPageDefs[] = {
    {"OSC", {"vform", "sub", "pw"}},
    {"OSC MOD", {"lfoosc", "lfopwm", "detune"}},
    {"FILTER", {"cut", "res", "eg1"}},
    {"FLT MOD", {"kbd", "lfocut", "velf"}},
    {"FLT ENV", {"fa", "fd", "fs"}},
    {"AMP ENV", {"aa", "ad", "asus"}},
    {"RELEASE", {"fr", "ar", "vela"}},
    {"LFO", {"lwave", "lrate", "lfoamp"}},
    {"VOICES", {"lage", "uniint", "porta"}},
    {"CHORUS", {"chorus", "kbda", "vol"}},
    {"ECHO", {"dtime", "dfb", "dmix"}},
    {"WHEEL", {"mwosc", "mwcut", "bendr"}},
};
constexpr int kNumPages = (int)(sizeof(kPageDefs) / sizeof(kPageDefs[0]));
Page gPages[kNumPages];
bool gPagesBuilt = false;
void buildPages() {
    if (gPagesBuilt) return;
    for (int p = 0; p < kNumPages; ++p) { gPages[p].name = kPageDefs[p].name; for (int k = 0; k < 3; ++k) gPages[p].param[k] = idx(kPageDefs[p].ids[k]); }
    gPagesBuilt = true;
}
} // namespace

Bris6Instrument::Bris6Instrument() : g_(new gen::Bris6Gen()) {
    buildPages();
    for (int i = 0; i < T::kNumParams; ++i) values_[i] = T::kParams[i].info.def;
}
Bris6Instrument::~Bris6Instrument() = default;

void Bris6Instrument::prepare(float sampleRate) {
    g_->prepare(sampleRate);
    for (int i = 0; i < T::kNumParams; ++i) set(i, T::kParams[i].info.def);
    loadPreset(0);
}

void Bris6Instrument::reset() { allNotesOff(); g_->reset(); voicesActive_ = 0; }

int Bris6Instrument::numParams() const { return T::kNumParams; }
const ParamInfo& Bris6Instrument::param(int i) const { return T::kParams[i].info; }
int Bris6Instrument::numPages() const { return kNumPages; }
const Page& Bris6Instrument::page(int p) const { return gPages[p]; }
int Bris6Instrument::numPresets() const { return T::kNumPresets; }
const char* Bris6Instrument::presetName(int i) const { return T::kPresets[i].name; }
int Bris6Instrument::faderParam() const { static const int c = idx("cut"); return c; }

void Bris6Instrument::set(int i, float value) {
    const ParamInfo& p = T::kParams[i].info;
    value = value < p.min ? p.min : (value > p.max ? p.max : value);
    if (p.steps > 0) value = p.min + (float)(int)(value - p.min + 0.5f);
    values_[i] = value;
    // messages the device's js sends alongside the parameter (bris_voices.js: lage / uniint)
    if (!std::strcmp(p.id, "lage")) { const int m = (int)value; if (m != mode_) { allNotesOff(); mode_ = m; } }
    if (!std::strcmp(p.id, "uniint")) { uni_ = (int)value; if (mode_ == 3 && monoOn_) playStack(false); }
    g_->setParam(p.id, value);
    if (!std::strcmp(p.id, "cut")) applyCutoff();
}

// applyPreset() in blonda_bris_ui.js: every parameter not marked "keep" gets the preset value or its default
void Bris6Instrument::loadPreset(int i) {
    if (i < 0 || i >= T::kNumPresets) return;
    const T::Preset& pr = T::kPresets[i];
    for (int k = 0; k < T::kNumParams; ++k) {
        if (T::kParams[k].keep) continue;
        float v = T::kParams[k].info.def;
        for (int j = 0; j < pr.n; ++j) if (pr.values[j].param == k) v = pr.values[j].value;
        set(k, v);
    }
}

// ---------------------------------------------------------------- bris_voices.js
void Bris6Instrument::setNoteParam(int i, double n) {
    switch (i) { case 0: g_->n0 = n; break; case 1: g_->n1 = n; break; case 2: g_->n2 = n; break; case 3: g_->n3 = n; break; case 4: g_->n4 = n; break; default: g_->n5 = n; }
}
void Bris6Instrument::setGate(int i, double v) {
    switch (i) { case 0: g_->g0 = v; break; case 1: g_->g1 = v; break; case 2: g_->g2 = v; break; case 3: g_->g3 = v; break; case 4: g_->g4 = v; break; default: g_->g5 = v; }
}
void Bris6Instrument::setTrigger(int i, double t) {
    switch (i) { case 0: g_->t0 = t; break; case 1: g_->t1 = t; break; case 2: g_->t2 = t; break; case 3: g_->t3 = t; break; case 4: g_->t4 = t; break; default: g_->t5 = t; }
}

void Bris6Instrument::trig(int i, int n, double vel, bool retrig) {
    vo_[i].note = n; vo_[i].on = true; vo_[i].sus = false; vo_[i].age = ++clock_;
    setNoteParam(i, n);
    if (retrig) { setGate(i, vel); setTrigger(i, (double)++tc_); }
}
void Bris6Instrument::playStack(bool retrig) {   // mono and unison: latest note wins, legato without retrigger
    const int n = stack_[nStack_ - 1];
    if (mode_ == 2) { trig(0, n, monoVel_, retrig); return; }
    for (int i = 0; i < NV; ++i) trig(i, n + (i >= 3 ? uni_ : 0), monoVel_, retrig);
}
void Bris6Instrument::stackRemove(int n) {
    int w = 0; for (int s = 0; s < nStack_; ++s) if (stack_[s] != n) stack_[w++] = stack_[s];
    nStack_ = w;
}
void Bris6Instrument::noteOn(int n, float velocity, int) {
    if (n < 0 || n > 127) return;
    const double vel = velocity < 0.05f ? 0.05 : (double)velocity;   // js: max(0.05, vel / 127)
    if (mode_ >= 2) {
        stackRemove(n);
        if (nStack_ < 128) stack_[nStack_++] = n;
        const bool retrig = !monoOn_;
        monoOn_ = true; monoVel_ = vel;
        playStack(retrig);
        return;
    }
    int k = -1;
    for (int i = 0; i < NV; ++i) if (vo_[i].note == n && (vo_[i].on || vo_[i].sus)) { k = i; break; }
    if (k < 0) for (int i = 0; i < NV; ++i) if (!vo_[i].on && !vo_[i].sus && (k < 0 || vo_[i].age < vo_[k].age)) k = i;
    if (k < 0) { k = 0; for (int i = 1; i < NV; ++i) if (vo_[i].age < vo_[k].age) k = i; }
    trig(k, n, vel, true);
}
void Bris6Instrument::noteOff(int n, int) {
    if (mode_ >= 2) {
        stackRemove(n);
        if (nStack_) { playStack(false); return; }
        monoOn_ = false;
        for (int j = 0; j < NV; ++j) if (vo_[j].on) { vo_[j].on = false; if (sustain_) vo_[j].sus = true; else setGate(j, 0); }
        return;
    }
    for (int i = 0; i < NV; ++i) {
        Voice& v = vo_[i];
        if (v.on && v.note == n) { v.on = false; v.age = ++clock_; if (sustain_) v.sus = true; else setGate(i, 0); }
    }
}
void Bris6Instrument::releaseSus() { for (int i = 0; i < NV; ++i) if (vo_[i].sus) { vo_[i].sus = false; setGate(i, 0); } }
void Bris6Instrument::allNotesOff() {
    nStack_ = 0; monoOn_ = false;
    for (int i = 0; i < NV; ++i) { vo_[i].on = false; vo_[i].sus = false; setGate(i, 0); }
}

// MPC pads send pressure the whole time a pad is held. In the device, aftertouch also drives vibrato (Wheel > LFO,
// 0.6 by default), which on pads sounds like a constant pitch wobble. So pad pressure opens the filter instead
// (+30 % of the cutoff range at full pressure), like the other instruments; the "at" input stays at 0.
void Bris6Instrument::pressure(float amount) {
    amount = amount < 0 ? 0 : (amount > 1 ? 1 : amount);
    if (amount == pressure_) return;
    pressure_ = amount;
    applyCutoff();
}
void Bris6Instrument::applyCutoff() {
    static const int c = idx("cut");
    double v = values_[c] + pressure_ * 0.3;
    g_->cut = v > 1.0 ? 1.0 : v;
}
void Bris6Instrument::pitchBend(float bend) { g_->bend = bend < -1 ? -1 : (bend > 1 ? 1 : bend); }
bool Bris6Instrument::controlChange(int cc, int value) {
    if (cc == 1) { g_->mw = value / 127.0; return true; }
    if (cc == 64) { sustain_ = value >= 64; if (!sustain_) releaseSus(); return true; }
    if (cc == 120 || cc == 123) { allNotesOff(); return true; }
    return false;
}

// ---------------------------------------------------------------- audio
void Bris6Instrument::process(float* L, float* R, int frames) {
    double out[gen::Bris6Gen::kOuts], in[1] = {0};
    for (int i = 0; i < frames; ++i) {
        g_->tick(in, out);
        L[i] += (float)out[0]; R[i] += (float)out[1];
    }
    const int mask = (int)out[3];
    int n = 0; for (int b = 0; b < NV; ++b) n += (mask >> b) & 1;
    voicesActive_ = frames > 0 ? n : voicesActive_;
}

} // namespace akai
