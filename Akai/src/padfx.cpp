#include "akai/padfx.hpp"
#include "blonda/effekter.h"
#include <cmath>
#include <cstdio>
#include <cstring>

namespace akai {

namespace {
struct KV { const char* id; double v; };
struct Def {
    const char* label; int engine; bool thrw;
    KV base[6];        // set when the pad is pressed (and at start)
    KV hold[2];        // set while held, cleared to `off` on release (FRYS: frys 1 / 0)
    double off[2];
    const char* pp; double pLo, pHi;   // pad pressure moves this parameter from pLo to pHi
    uint32_t colour;
};
// engines: one effect each, FRYS is shared by pads 9 and 10
const char* const kEngines[] = {"filter", "filter", "filter", "filter", "sliten", "vibe", "vibe", "vibe", "frys", "skift", "skift", "eko", "rum", "svav", "vibe"};
constexpr int kNumEngines = 15;
constexpr uint32_t kTeal = 0x227E7A, kYellow = 0xE9C54A, kCream = 0x9C9A92, kCyan = 0x2FA9DA;
const Def kDefs[PadFx::kPads] = {
    {"LP SWEEP", 0, false, {{"res", .55}, {"drive", .25}, {"wet", 1}, {"pos", -.45}}, {}, {}, "pos", -.45, -.95, kTeal},
    {"HP SWEEP", 1, false, {{"res", .5}, {"wet", 1}, {"pos", .35}}, {}, {}, "pos", .35, .9, kTeal},
    {"LP WOBBLE", 2, false, {{"pos", -.45}, {"res", .6}, {"lfor", 1}, {"lfos", 0}, {"wet", 1}, {"lfod", .5}}, {}, {}, "lfod", .5, 1., kTeal},
    {"CHOP", 3, false, {{"res", .25}, {"lfod", 1}, {"lfor", 0}, {"lfos", 1}, {"wet", 1}, {"pos", -.4}}, {}, {}, "pos", -.4, -.9, kTeal},
    {"SLITEN", 4, false, {{"wow", .6}, {"flut", .5}, {"avbr", .4}, {"wet", 1}, {"age", .6}}, {}, {}, "age", .6, 1., kYellow},
    {"CRUSH", 5, false, {{"mixp", 100}, {"crush", 55}}, {}, {}, "crush", 55, 100, kYellow},
    {"WOBBLE", 6, false, {{"wobrate", 45}, {"wobble", 55}}, {}, {}, "wobble", 55, 100, kYellow},
    {"DRIVE", 7, false, {{"dtype", 1}, {"outdb", -7}, {"drive", 45}}, {}, {}, "drive", 45, 100, kYellow},
    {"FRYS", 8, false, {{"rev", 0}, {"drift", .15}}, {{"frys", 1}}, {0}, "drift", .15, .8, kCream},
    {"FRYS BAK", 8, false, {{"rev", 1}, {"drift", .15}}, {{"frys", 1}}, {0}, "drift", .15, .8, kCream},
    {"OKTAV NER", 9, false, {{"semi1", -12}, {"lev1", 1}, {"lev2", 0}, {"wet", 1}}, {}, {}, nullptr, 0, 0, kCream},
    {"OKTAV UPP", 10, false, {{"semi1", 12}, {"lev1", 1}, {"lev2", 0}, {"wet", 1}}, {}, {}, nullptr, 0, 0, kCream},
    {"EKO", 11, true, {{"sync", 1}, {"div", 7}, {"wet", 1}, {"fb", .45}}, {}, {}, "fb", .45, .85, kCyan},
    {"RUM", 12, true, {{"size", .85}, {"decay", .8}, {"wet", 1}}, {}, {}, nullptr, 0, 0, kCyan},
    {"SVÄV", 13, false, {{"spread", 1.6}, {"wet", .75}, {"depth", .6}}, {}, {}, "depth", .6, 1., kCyan},
    {"BAND", 14, false, {{"glue", 50}, {"wobble", 20}, {"tape", 60}}, {}, {}, "tape", 60, 100, kCyan},
};
constexpr int kFrysEngine = 8;
// Share of one Cortex-A55 core per effect at 44.1 kHz (desktop measurement x 3.5, the BRIS ratio between the two);
// FRYS is listening anyway while PAD FX is on, so pressing it costs nothing extra.
const float kCost[PadFx::kPads] = {.03f, .03f, .03f, .03f, .06f, .11f, .11f, .11f, 0.f, 0.f, .07f, .07f, .05f, .13f, .21f, .11f};
} // namespace

struct PadFx::Engine { std::unique_ptr<blonda::Effect> fx; int pressIdx = -1; float lastP = -1.f; };

PadFx::PadFx() = default;
PadFx::~PadFx() = default;

const char* PadFx::label(int pad) { return pad >= 0 && pad < kPads ? kDefs[pad].label : ""; }
uint32_t PadFx::colour(int pad) { return pad >= 0 && pad < kPads ? kDefs[pad].colour : 0; }
float PadFx::cost(int pad) { return pad >= 0 && pad < kPads ? kCost[pad] : 0.f; }
float PadFx::heldCost() const { float c = 0.f; for (int p = 0; p < kPads; ++p) if (slot_[p].held) c += kCost[p]; return c; }
bool PadFx::releaseOldest() {
    int oldest = -1;
    for (int p = 0; p < kPads; ++p) if (slot_[p].held && (oldest < 0 || slot_[p].order < slot_[oldest].order)) oldest = p;
    if (oldest < 0) return false;
    release(oldest); return true;
}

void PadFx::prepare(float sr) {
    sr_ = sr; nEng_ = kNumEngines;
    eng_.reset(new Engine[kNumEngines]);
    for (int e = 0; e < kNumEngines; ++e) { eng_[e].fx = blonda::createEffect(kEngines[e]); eng_[e].fx->prepare(sr); eng_[e].fx->setTempo(120.0); }
    for (int p = 0; p < kPads; ++p) { slot_[p] = Slot(); slot_[p].engine = kDefs[p].engine; applyParams(p, false); }
    active_ = false;
}

void PadFx::setTempo(float bpm) { for (int e = 0; e < nEng_; ++e) eng_[e].fx->setTempo(bpm); }

// base settings of a pad (pressure parameter at its resting value); `on`: the while-held settings
void PadFx::applyParams(int pad, bool on) {
    const Def& d = kDefs[pad]; blonda::Effect& fx = *eng_[d.engine].fx;
    for (const KV& kv : d.base) if (kv.id) fx.setParam(fx.findParam(kv.id), kv.v);
    for (int k = 0; k < 2; ++k) if (d.hold[k].id) fx.setParam(fx.findParam(d.hold[k].id), on ? d.hold[k].v : d.off[k]);
    eng_[d.engine].pressIdx = d.pp ? fx.findParam(d.pp) : -1; eng_[d.engine].lastP = -1.f;
}

void PadFx::setActive(bool on) {
    if (on == active_) return;
    active_ = on;
    if (on) slot_[8].run = true;   // FRYS listens (pads 9 and 10 share it; slot 9 carries the engine's running state)
    else releaseAll();
}

void PadFx::press(int pad) {
    if (pad < 0 || pad >= kPads || slot_[pad].held) return;
    int held = 0, oldest = -1;
    for (int p = 0; p < kPads; ++p) if (slot_[p].held) { ++held; if (oldest < 0 || slot_[p].order < slot_[oldest].order) oldest = p; }
    if (held >= kMaxHeld && oldest >= 0) release(oldest);   // CPU guard: three effects at a time
    const Def& d = kDefs[pad];
    if (d.engine == kFrysEngine) for (int p = 0; p < kPads; ++p) if (p != pad && kDefs[p].engine == kFrysEngine && slot_[p].held) release(p);
    Slot& s = slot_[pad];
    // an insert effect that has finished its silent flush starts clean; one still fading out just turns around
    applyParams(pad, true);
    s.held = true; s.tail = 0; s.since = 0; s.order = ++order_; s.press = 0.f; s.pressS = 0.f;
    if (d.engine == kFrysEngine) { slot_[8].run = true; slot_[8].tail = 0; } else s.run = true;
}

void PadFx::release(int pad) {
    if (pad < 0 || pad >= kPads || !slot_[pad].held) return;
    const Def& d = kDefs[pad]; blonda::Effect& fx = *eng_[d.engine].fx;
    slot_[pad].held = false;
    for (int k = 0; k < 2; ++k) if (d.hold[k].id) fx.setParam(fx.findParam(d.hold[k].id), d.off[k]);
}

void PadFx::releaseAll() { for (int p = 0; p < kPads; ++p) release(p); }

void PadFx::pressure(int pad, float amount) {
    if (pad >= 0 && pad < kPads && slot_[pad].held) slot_[pad].press = amount < 0.f ? 0.f : (amount > 1.f ? 1.f : amount);
}

int PadFx::heldText(char* buf, int len) const {
    int n = 0, w = 0; buf[0] = 0;
    for (int p = 0; p < kPads; ++p) if (slot_[p].held && w < len - 1) {
        w += std::snprintf(buf + w, (size_t)(len - w), "%s%s", n ? " + " : "", kDefs[p].label); ++n;
        if (w >= len) { w = len - 1; break; }
    }
    return n;
}

// One pad's effect over m frames of the bus (in place).
void PadFx::runSlot(int pad, float* L, float* R, int m) {
    const Def& d = kDefs[pad]; Engine& E = eng_[d.engine];
    const bool frys = d.engine == kFrysEngine;
    Slot& st = frys ? slot_[8] : slot_[pad];   // the engine's state (FRYS: both of its pads share slot 9's)
    Slot& ps = slot_[pad];                      // the pad that plays it now
    const bool held = frys ? (slot_[8].held || slot_[9].held) : ps.held;
    const float step = 1.f / (0.015f * sr_);
    float g = st.gain;
    if (ps.held) {   // pad pressure, smoothed per block
        ps.pressS += (ps.press - ps.pressS) * 0.25f;
        if (E.pressIdx >= 0 && std::fabs(ps.pressS - E.lastP) > 1e-3f) { E.lastP = ps.pressS; E.fx->setParam(E.pressIdx, d.pLo + (d.pHi - d.pLo) * ps.pressS); }
    }
    if (d.thrw) {   // send while held; the tail returns until it has been quiet for a second
        float pk = 0.f;
        for (int i = 0; i < m; ++i) { g += held ? step : -step; g = g < 0.f ? 0.f : (g > 1.f ? 1.f : g); aL_[i] = L[i] * g; aR_[i] = R[i] * g; }
        E.fx->process(aL_, aR_, m);
        for (int i = 0; i < m; ++i) { L[i] += aL_[i]; R[i] += aR_[i]; const float a = std::fabs(aL_[i]) > std::fabs(aR_[i]) ? std::fabs(aL_[i]) : std::fabs(aR_[i]); pk = a > pk ? a : pk; }
        st.gain = g;
        if (!held && g == 0.f) {   // quiet for a second, or 20 s after release at the latest (very long feedback)
            st.tail = pk < 1e-5f ? st.tail + m : 0; st.since += m;
            if (st.tail > (long long)sr_ || st.since > (long long)(20.f * sr_)) { st.run = false; st.tail = 0; st.since = 0; }
        }
        return;
    }
    if (!held && g == 0.f && !(frys && active_)) {   // let go and faded out: run on silence until the buffers are clean
        std::memset(aL_, 0, sizeof(float) * (size_t)m); std::memset(aR_, 0, sizeof(float) * (size_t)m);
        E.fx->process(aL_, aR_, m);
        st.tail += m;
        if (st.tail > (long long)sr_) { st.run = false; st.tail = 0; }
        return;
    }
    st.tail = 0;
    std::memcpy(aL_, L, sizeof(float) * (size_t)m); std::memcpy(aR_, R, sizeof(float) * (size_t)m);
    E.fx->process(aL_, aR_, m);   // FRYS also runs while nobody holds it: it keeps listening
    for (int i = 0; i < m; ++i) {
        g += held ? step : -step; g = g < 0.f ? 0.f : (g > 1.f ? 1.f : g);
        if (g > 0.f) { L[i] += g * (aL_[i] - L[i]); R[i] += g * (aR_[i] - R[i]); }
    }
    st.gain = g;
}

void PadFx::process(float* L, float* R, int n) {
    if (!eng_) return;
    for (int pos = 0; pos < n; pos += kBlock) {
        const int m = n - pos < kBlock ? n - pos : kBlock;
        for (int p = 0; p < kPads; ++p) {
            if (p == 9) continue;   // FRYS BAK shares FRYS's engine: processed once, with pad 9's state
            if (p == 8) { if (slot_[8].run || slot_[8].held || slot_[9].held) runSlot(slot_[9].held ? 9 : 8, L + pos, R + pos, m); continue; }
            if (slot_[p].run) runSlot(p, L + pos, R + pos, m);
        }
    }
}

} // namespace akai
