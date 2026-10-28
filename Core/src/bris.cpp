#include "blonda/bris.hpp"
#include <cstring>

namespace blonda {

// envelope time curve shared with the web version: 2 ms .. mx seconds, squared response
static inline float brT(float v, float mx) { return 0.002f + v * v * mx; }
static const float kLfoDiv[6] = {4.f, 2.f, 1.f, 0.5f, 0.25f, 1.f / 6.f};          // beats per LFO cycle when synced
static const float kDlyBeats[6] = {0.5f, 0.75f, 1.f, 0.25f, 1.f / 3.f, 1.5f};    // 1/8, 1/8., 1/4, 1/16, 1/8T, 1/4.

void Bris::prepare(float sampleRate) {
    sr = sampleRate; osr = sampleRate * kOS;
    PulseTables::get();          // build tables outside the audio thread
    shaper.set(0.1f);              // web: dCurve(.12) -> driveCurve(round(.12*20)/20)
    rng.seed(0xB215u);
    reset();
}

void Bris::reset() {
    for (auto& v : voices) v = Voice{};
    dec.reset(); dcX = dcY = 0; choL.reset(); dlyL.reset(); dlyR.reset();
    dHpL.reset(); dHpR.reset(); dLpL.reset(); dLpR.reset();
    dHpL.highpass(180.f, qFromDb(1.f), sr); dHpR.highpass(180.f, qFromDb(1.f), sr);
    dLpL.lowpass(3800.f, qFromDb(1.f), sr); dLpR.lowpass(3800.f, qFromDb(1.f), sr);
    choPh[0] = choPh[1] = 0; fxInit = false; nEvents = 0; now = 0;
}

void Bris::noteOn(int note, float velocity, int offset, int chordSize, float lengthSec) {
    if (nEvents < (int)events.size()) events[nEvents++] = {offset, note, velocity, chordSize, true, lengthSec};
}
void Bris::noteOff(int note, int offset) {
    if (nEvents < (int)events.size()) events[nEvents++] = {offset, note, 0.f, 1, false, 0.f};
}
void Bris::allNotesOff() { for (auto& v : voices) if (v.used && v.held) { v.held = false; if (v.live) v.liveOff = true; } }

int Bris::activeVoices() const { int n = 0; for (auto& v : voices) if (v.used && !v.stealing) ++n; return n; }

void Bris::startVoice(int note, float vel, int chord, float lenSec) {
    const BrisParams& E = params;
    const int mode = (int)E.vmode;
    const int limit = mode == 1 ? 1 : 6;
    // steal oldest sounding voices beyond the limit (8 ms fade like the web version)
    for (;;) {
        int n = 0, oldest = -1; uint32_t oa = UINT32_MAX;
        for (int i = 0; i < kMaxVoices; ++i) { auto& v = voices[i]; if (v.used && !v.stealing) { ++n; if (v.age < oa) { oa = v.age; oldest = i; } } }
        if (n < limit || oldest < 0) break;
        voices[oldest].stealing = true;
    }
    int slot = -1;
    for (int i = 0; i < kMaxVoices; ++i) if (!voices[i].used) { slot = i; break; }
    if (slot < 0) { // all slots busy fading: take the quietest
        float q = 1e9f; for (int i = 0; i < kMaxVoices; ++i) { float a = voices[i].av * voices[i].steal; if (a < q) { q = a; slot = i; } }
    }
    Voice& v = voices[slot];
    v = Voice{};
    v.used = true; v.held = true; v.note = note; v.vel = vel; v.age = ++ageCounter; v.chord = chord < 1 ? 1 : chord;
    rng.next(); v.nz.seed(rng.s ^ (ageCounter * 2654435761u));
    const float fr = mtof((float)note + trackTune);
    v.freq = fr;
    const bool gl = E.glide > 0.f && lastFreq > 0.f && (now - lastTime) < 4.0;
    if (gl) {
        v.glideFrom = lastFreq;
        v.glideLen = v.glideLeft = (int)((0.005f + E.glide * E.glide * 1.2f) * osr);
    }
    lastFreq = fr; lastTime = now;
    // per-oscillator analog drift (static per note) and free-running phases
    for (int u = 0; u < 3; ++u) for (int k = 0; k < 2; ++k) {
        v.driftC[u][k] = (rng.uni() - 0.5f) * E.drift * 14.f;
        v.osc[u][k].phase = E.drift > 0.f ? rng.uni() : 0.f;
    }
    v.subOsc.phase = 0.f;
    // timeline: gate from the note length (live notes use the web keyboard's 24-step length and an outer fade on release)
    v.live = lenSec <= 0.f;
    const float len = v.live ? 60.f / bpm / 4.f * 24.f : lenSec;
    v.gate = std::max(0.03f, len * (0.5f + trackDecay * 2.f));
    const float aA = brT(E.aA, 6.f), aR = brT(E.aR, 10.f);
    v.relAt = std::max(v.gate, aA);
    v.endAt = v.gate + aR * 5.f + 0.2f;   // oscillators stop here, like osc.stop(end)
    v.t = 0; v.av = 0.f; v.fx = 0.f;
    v.lfoPh = 0.f; v.shLeft = 0.f; v.sh = 0.f;
}

void Bris::releaseNote(int note) {
    // sequenced notes already carry their gate; live notes get the outer fade
    for (auto& v : voices) if (v.used && v.held && v.note == note) { v.held = false; if (v.live) v.liveOff = true; }
}

void Bris::runEvents(int frame) {
    for (int i = 0; i < nEvents; ++i) {
        if (events[i].frame != frame) continue;
        if (events[i].on) startVoice(events[i].note, events[i].vel, events[i].chord, events[i].len);
        else releaseNote(events[i].note);
    }
}

static inline float pulseTab(const PulseTables& PT, BlepOsc& o, float dt, float width) { const float v = PT.read(o.phase, dt, width); o.advance(dt); return v; }

// One oversampled sample of one voice.
float Bris::renderVoice(Voice& v) {
    const BrisParams& E = params;
    const float dtOs = 1.0f / osr;

    // ---- envelopes (shapes identical to the web version's linear ramp + setTargetAtTime)
    const float aA = brT(E.aA, 6.f), aD = brT(E.aD, 8.f), aR = brT(E.aR, 10.f);
    const float fA = brT(E.fA, 6.f), fD = brT(E.fD, 8.f), fR = brT(E.fR, 10.f);
    const float lvl = v.vel * 0.4f * (0.4f + E.vol * 0.9f) / std::sqrt((float)v.chord) * (1.f / (1.f + E.res * 0.5f));

    // amp: linearRamp(lvl, aA2) + setTarget(sus, aA) + setTarget(0, max(gate, aA)).
    // When aA < 5 ms the web timeline lets the ramp replace the decay, so the level holds until release.
    const float t = (float)v.t, aA2 = std::max(0.005f, aA);
    if (t < v.relAt) {
        if (aA < 0.005f) v.av = t < aA ? 0.f : (t < aA2 ? lvl * (t - aA) / (aA2 - aA) : lvl);
        else if (t < aA) v.av = lvl * t / aA;
        else { const float tgt = std::max(0.0001f, lvl * E.aS); v.av = tgt + (v.av - tgt) * std::exp(-dtOs / std::max(1e-4f, aD / 3.f)); }
    } else {
        v.av = 0.0001f + (v.av - 0.0001f) * std::exp(-dtOs / std::max(1e-4f, aR / 3.f));
    }
    if (t >= v.endAt) { v.used = false; return 0.f; }
    if (v.stealing) { v.steal *= std::exp(-dtOs / 0.008f); if (v.steal < 1e-4f) { v.used = false; return 0.f; } }
    if (v.live && v.liveOff) {   // web keyboard: outer gain setTarget(0, rel/3) with rel = min(3, aR)
        v.outer *= std::exp(-dtOs / (std::min(3.f, aR) / 3.f));
        if (v.outer < 1e-5f) { v.used = false; return 0.f; }
    }

    // filter env as a 0..1 position between base and peak (so cutoff moves act live): setValue(base) +
    // linearRamp(peak, max(8ms, fA)) + setTarget(sus, fA) + setTarget(base, gate) - including the web timeline's
    // quirks: a short fA holds the peak until the gate; a gate before fA starts the ramp at the gate and never releases.
    const float velF = 1.f - E.fvel + E.fvel * v.vel, oct = E.fenv * 7.f * velF;
    {
        const float fAe = std::max(0.008f, fA), g = v.gate;
        const float pk = std::exp2(oct) - 1.f, xs = pk > 1e-6f ? (std::exp2(oct * E.fS) - 1.f) / pk : 0.f;
        const float cD = std::exp(-dtOs / std::max(1e-4f, fD / 3.f)), cR = std::exp(-dtOs / std::max(1e-4f, fR / 3.f));
        if (fA < 0.008f) {
            if (t < fA) v.fx = 0.f; else if (t < fAe) v.fx = (t - fA) / (fAe - fA); else if (t < g) v.fx = 1.f; else v.fx *= cR;
        } else if (g >= fA) {
            if (t < fA) v.fx = t / fA; else if (t < g) v.fx = xs + (v.fx - xs) * cD; else v.fx *= cR;
        } else {
            if (t < g) v.fx = 0.f; else if (t < fA) v.fx = (t - g) / (fA - g); else v.fx = xs + (v.fx - xs) * cD;
        }
    }
    v.t += dtOs;

    // ---- LFO (per voice, key-synced)
    float lfo = 0.f;
    const float a2 = E.lfoAmt * E.lfoAmt;
    if (E.lfoAmt > 0.01f) {
        float rate = E.lfoSync > 0.5f ? 1.f / (60.f / bpm * kLfoDiv[std::min(5, (int)std::lround(E.lfoR * 5.f))]) : 0.08f * std::exp2(E.lfoR * 7.5f);
        const int w = (int)E.lfoW; const float p = v.lfoPh;
        if (w == 4) { if (v.shLeft <= 0.f) { v.sh = v.nz.next(); v.shLeft += 1.f; } v.shLeft -= rate * dtOs; lfo = v.sh; }
        else if (w == 0) lfo = p < 0.25f ? 4.f * p : (p < 0.75f ? 2.f - 4.f * p : 4.f * p - 4.f);
        else if (w == 1 || w == 2) { float s = p + 0.5f; s -= (float)(int)s; lfo = 2.f * s - 1.f; if (w == 2) lfo = -lfo; }
        else lfo = p < 0.5f ? 1.f : -1.f;
        v.lfoPh += rate * dtOs; if (v.lfoPh >= 1.f) v.lfoPh -= 1.f;
    }
    const int dest = (int)E.lfoDest;

    // ---- pitch (glide is an exponential ramp, like exponentialRampToValueAtTime)
    float f = v.freq;
    if (v.glideLeft > 0) { float t = 1.f - (float)v.glideLeft / (float)v.glideLen; f = v.glideFrom * std::pow(v.freq / v.glideFrom, t); --v.glideLeft; }
    const float pitchC = (E.lfoAmt > 0.01f && dest == 0) ? lfo * a2 * 120.f : 0.f;

    // ---- oscillators
    const int mode = (int)E.vmode; const int nu = mode == 2 ? 3 : 1;
    const bool pulse = E.wave > 0.5f; const float width = 0.08f + E.pw * 0.84f;
    static const PulseTables& PT = PulseTables::get();
    constexpr float kSawNorm = 0.918f, kSqNorm = 0.848f;                    // same normalisation for the built-in saw/square
    float mix = 0.f;
    const float g1 = (0.5f / nu) * (nu > 1 ? 1.4f : 1.f), g2 = std::min(1.f, E.det * 2.6f) * 0.34f / nu;
    for (int ui = 0; ui < nu; ++ui) {
        const float u = nu > 1 ? (float)(ui - 1) : 0.f;
        {   float c = v.driftC[ui][0] + u * E.det * 22.f - E.det * 4.f + pitchC;
            float dt = f * centsToRatio(c) * dtOs; dt = std::min(dt, 0.45f);
            mix += g1 * (pulse ? pulseTab(PT, v.osc[ui][0], dt, width) : v.osc[ui][0].saw(dt) * kSawNorm); }
        if (E.det > 0.02f) {
            float c = v.driftC[ui][1] + E.det * 16.f + u * E.det * 22.f + pitchC;
            float dt = f * centsToRatio(c) * dtOs; dt = std::min(dt, 0.45f);
            mix += g2 * (pulse ? pulseTab(PT, v.osc[ui][1], dt, width) : v.osc[ui][1].saw(dt) * kSawNorm); }
    }
    if (E.sub > 0.01f) { float dt = std::min(0.45f, f * 0.5f * centsToRatio(pitchC) * dtOs); mix += E.sub * 0.42f * v.subOsc.pulse(dt, 0.5f) * kSqNorm; }
    if (E.noise > 0.01f) mix += E.noise * 0.3f * v.nz.next();
    if (E.lfoAmt > 0.01f && dest == 2) mix *= (1.f - a2 * 0.5f) + a2 * 0.5f * lfo;

    // ---- drive + 24 dB low-pass (two cascaded 12 dB stages, resonance on the second, Q in dB like Web Audio)
    float x = shaper.process(mix);
    if (v.coefCount-- <= 0) {
        v.coefCount = 3;
        const float kt = std::exp2(((float)v.note - 60.f) / 12.f * E.kt);
        const float base = std::min(18000.f, 24.f * std::exp2(E.cut * 9.6f) * kt * (0.6f + trackTone * 0.8f));
        const float peak = std::min(19000.f, base * std::exp2(oct));
        float fc = base + (peak - base) * v.fx;
        if (E.lfoAmt > 0.01f && dest == 1) fc += a2 * base * 2.2f * lfo;
        fc = std::max(20.f, fc);
        v.f1.set(fc, qFromDb(0.5f), osr);
        v.f2.set(fc, qFromDb(0.5f + std::pow(E.res, 1.5f) * 16.f), osr);
    }
    x = v.f2.process(v.f1.process(x));
    return x * v.av * v.steal * v.outer;
}

void Bris::process(float* L, float* R, int frames) {
    const BrisParams& E = params;
    // effect targets
    const float m = E.cho > 0.5f ? E.choMix : 0.f; const bool II = E.cho > 1.5f;
    const float dTime = std::min(2.9f, 60.f / bpm * kDlyBeats[std::min(5, std::max(0, (int)E.dlyT))]);
    if (!fxInit) {
        sDry.snap(1.f - m * 0.35f); sWet.snap(m * 0.75f); sChoBase.snap(II ? 0.0052f : 0.0042f); sChoDepth.snap(II ? 0.0028f : 0.0018f);
        sChoRate[0].snap(II ? 0.83f : 0.51f); sChoRate[1].snap((II ? 0.83f : 0.51f) * 1.07f);
        sDlyTime.snap(dTime); sDlyFb.snap(E.dlyFb * 0.85f); sDlyOut.snap(E.dly * 0.7f); fxInit = true;
        for (Smoother* s : {&sDry, &sWet}) s->setTau(0.02f, sr);
        for (Smoother* s : {&sChoBase, &sChoDepth, &sChoRate[0], &sChoRate[1]}) s->setTau(0.05f, sr);
        sDlyTime.setTau(0.04f, sr); sDlyFb.setTau(0.03f, sr); sDlyOut.setTau(0.03f, sr);
    }
    sDry.target = 1.f - m * 0.35f; sWet.target = m * 0.75f; sChoBase.target = II ? 0.0052f : 0.0042f; sChoDepth.target = II ? 0.0028f : 0.0018f;
    sChoRate[0].target = II ? 0.83f : 0.51f; sChoRate[1].target = sChoRate[0].target * 1.07f;
    sDlyTime.target = dTime; sDlyFb.target = E.dlyFb * 0.85f; sDlyOut.target = E.dly * 0.7f;
    float panL[2], panR[2]; panGains(-0.85f, panL[0], panR[0]); panGains(0.85f, panL[1], panR[1]);

    for (int i = 0; i < frames; ++i) {
        if (nEvents) runEvents(i);
        float os[2] = {0.f, 0.f};
        for (int k = 0; k < kOS; ++k) for (auto& v : voices) if (v.used) os[k] += renderVoice(v);
        float mono = dec.process(os[0], os[1]);
        { const float y = mono - dcX + 0.99948f * dcY; dcX = mono; dcY = y; mono = y; }   // ~4 Hz high-pass

        // chorus: two modulated taps, hard-ish panned, plus dry in the centre
        choL.push(mono);
        const float dry = sDry.next(), wet = sWet.next(), base = sChoBase.next(), depth = sChoDepth.next();
        float l = mono * dry, r = mono * dry;
        for (int c = 0; c < 2; ++c) {
            const float rate = sChoRate[c].next();
            const float p = choPh[c]; const float tri = p < 0.25f ? 4.f * p : (p < 0.75f ? 2.f - 4.f * p : 4.f * p - 4.f);
            choPh[c] += rate / sr; if (choPh[c] >= 1.f) choPh[c] -= 1.f;
            if (wet > 1e-5f) { const float s = choL.read((base + depth * tri) * sr) * wet; l += s * panL[c]; r += s * panR[c]; }
        }
        // tempo delay: HP 180 Hz in, LP 3.8 kHz in the feedback loop (per channel, like the web graph)
        const float dt = sDlyTime.next() * sr, fb = sDlyFb.next(), out = sDlyOut.next();
        const float yl = dLpL.process(dlyL.read(std::max(1.f, dt))), yr = dLpR.process(dlyR.read(std::max(1.f, dt)));
        dlyL.push(dHpL.process(l) + yl * fb); dlyR.push(dHpR.process(r) + yr * fb);
        L[i] += l + yl * out; R[i] += r + yr * out;
        now += 1.0 / sr;
    }
    nEvents = 0;
}

// ---------------------------------------------------------------- presets
static BrisParams P(std::initializer_list<std::pair<const char*, float>> kv) {
    BrisParams p;
    for (auto& [k, val] : kv) {
#define F(n) if (!std::strcmp(k, #n)) { p.n = val; continue; }
        F(wave) F(pw) F(det) F(sub) F(noise) F(glide) F(drift) F(cut) F(res) F(fenv) F(kt) F(fvel) F(fA) F(fD) F(fS) F(fR)
        F(aA) F(aD) F(aS) F(aR) F(lfoW) F(lfoR) F(lfoSync) F(lfoDest) F(lfoAmt) F(cho) F(choMix) F(dly) F(dlyT) F(dlyFb) F(vmode) F(vol)
#undef F
    }
    return p;
}

const BrisPreset* brisPresets(int& count) {
    static const BrisPreset kP[] = {
        {"Pad","Bris",P({{"wave",0},{"det",.42f},{"sub",.18f},{"cut",.46f},{"res",.14f},{"fenv",.22f},{"fA",.55f},{"fD",.6f},{"fS",.55f},{"fR",.6f},{"aA",.55f},{"aD",.6f},{"aS",.85f},{"aR",.62f},{"lfoDest",1},{"lfoAmt",.22f},{"lfoR",.18f},{"cho",2},{"choMix",.75f},{"dly",.24f},{"dlyT",1},{"dlyFb",.38f},{"drift",.45f}})},
        {"Pad","Molnbank",P({{"wave",0},{"det",.55f},{"sub",.1f},{"cut",.38f},{"res",.2f},{"fenv",.3f},{"fA",.7f},{"fD",.7f},{"fS",.4f},{"fR",.7f},{"aA",.72f},{"aD",.7f},{"aS",.9f},{"aR",.75f},{"lfoW",0},{"lfoDest",1},{"lfoAmt",.3f},{"lfoR",.08f},{"cho",2},{"choMix",.85f},{"dly",.3f},{"dlyT",2},{"dlyFb",.45f},{"drift",.5f}})},
        {"Pad","Juno dröm",P({{"wave",1},{"pw",.35f},{"det",.18f},{"sub",.25f},{"cut",.5f},{"res",.25f},{"fenv",.18f},{"fA",.4f},{"fD",.5f},{"fS",.5f},{"fR",.5f},{"aA",.42f},{"aD",.5f},{"aS",.85f},{"aR",.55f},{"lfoW",0},{"lfoDest",0},{"lfoAmt",.12f},{"lfoR",.35f},{"cho",1},{"choMix",.9f},{"dly",.12f},{"drift",.3f}})},
        {"Pad","Varmt glas",P({{"wave",0},{"det",.3f},{"sub",0},{"cut",.6f},{"res",.35f},{"fenv",.15f},{"fA",.6f},{"fS",.6f},{"aA",.5f},{"aS",.8f},{"aR",.6f},{"lfoDest",1},{"lfoAmt",.18f},{"lfoR",.25f},{"cho",2},{"choMix",.6f},{"dly",.28f},{"dlyT",5},{"dlyFb",.4f}})},
        {"Pad","Nattsjö",P({{"wave",0},{"det",.35f},{"sub",.35f},{"noise",.08f},{"cut",.3f},{"res",.42f},{"fenv",.35f},{"fA",.8f},{"fD",.8f},{"fS",.3f},{"fR",.8f},{"aA",.8f},{"aD",.8f},{"aS",.85f},{"aR",.85f},{"lfoW",4},{"lfoDest",1},{"lfoAmt",.2f},{"lfoR",.2f},{"lfoSync",1},{"cho",1},{"choMix",.6f},{"dly",.35f},{"dlyT",2},{"dlyFb",.55f}})},
        {"Pad","Strings 77",P({{"wave",0},{"det",.48f},{"sub",0},{"cut",.55f},{"res",.05f},{"fenv",.08f},{"aA",.45f},{"aD",.4f},{"aS",.9f},{"aR",.5f},{"lfoDest",0},{"lfoAmt",.1f},{"lfoR",.42f},{"cho",2},{"choMix",.9f},{"dly",.1f}})},
        {"Keys","Poly keys",P({{"wave",0},{"det",.15f},{"sub",.2f},{"cut",.42f},{"res",.15f},{"fenv",.42f},{"fA",0},{"fD",.42f},{"fS",.15f},{"fR",.3f},{"aA",.01f},{"aD",.55f},{"aS",.35f},{"aR",.3f},{"cho",1},{"choMix",.55f},{"dly",.12f}})},
        {"Keys","Epiano bris",P({{"wave",1},{"pw",.5f},{"det",.08f},{"sub",.12f},{"cut",.32f},{"res",.1f},{"fenv",.45f},{"fD",.38f},{"fS",.05f},{"fR",.25f},{"aA",0},{"aD",.62f},{"aS",.2f},{"aR",.32f},{"lfoDest",2},{"lfoAmt",.28f},{"lfoR",.38f},{"cho",1},{"choMix",.7f},{"dly",.1f}})},
        {"Keys","Clav-ish",P({{"wave",1},{"pw",.18f},{"det",0},{"sub",0},{"cut",.48f},{"res",.4f},{"fenv",.5f},{"fD",.2f},{"fS",0},{"fR",.12f},{"aA",0},{"aD",.32f},{"aS",.1f},{"aR",.12f},{"cho",0},{"dly",0}})},
        {"Keys","Orgel lite",P({{"wave",1},{"pw",.5f},{"det",.1f},{"sub",.6f},{"cut",.62f},{"res",0},{"fenv",0},{"aA",.02f},{"aD",.2f},{"aS",1},{"aR",.12f},{"lfoDest",0},{"lfoAmt",.1f},{"lfoR",.55f},{"cho",2},{"choMix",.8f},{"dly",0}})},
        {"Brass","Brass 6",P({{"wave",0},{"det",.2f},{"sub",.15f},{"cut",.34f},{"res",.12f},{"fenv",.5f},{"fA",.3f},{"fD",.45f},{"fS",.45f},{"fR",.3f},{"aA",.18f},{"aD",.4f},{"aS",.85f},{"aR",.3f},{"cho",1},{"choMix",.45f},{"dly",.08f}})},
        {"Brass","Mjuk brass",P({{"wave",0},{"det",.25f},{"sub",.1f},{"cut",.28f},{"res",.08f},{"fenv",.42f},{"fA",.42f},{"fD",.55f},{"fS",.5f},{"aA",.3f},{"aS",.85f},{"aR",.4f},{"cho",2},{"choMix",.55f},{"dly",.15f},{"dlyT",1}})},
        {"Bass","Ladderbas",P({{"wave",0},{"det",.05f},{"sub",.55f},{"cut",.3f},{"res",.35f},{"fenv",.42f},{"fD",.28f},{"fS",.1f},{"fR",.2f},{"aA",0},{"aD",.4f},{"aS",.6f},{"aR",.14f},{"cho",0},{"dly",0},{"vmode",1},{"glide",.15f},{"drift",.2f}})},
        {"Bass","Sub moog",P({{"wave",1},{"pw",.5f},{"det",0},{"sub",.75f},{"cut",.22f},{"res",.2f},{"fenv",.25f},{"fD",.3f},{"fS",.2f},{"aA",0},{"aD",.4f},{"aS",.8f},{"aR",.12f},{"cho",0},{"dly",0},{"vmode",1},{"glide",.12f}})},
        {"Bass","Acid-ish",P({{"wave",0},{"det",0},{"sub",.1f},{"cut",.22f},{"res",.72f},{"fenv",.6f},{"fD",.25f},{"fS",0},{"fR",.15f},{"aA",0},{"aD",.3f},{"aS",.5f},{"aR",.1f},{"cho",0},{"dly",.12f},{"dlyT",4},{"vmode",1},{"glide",.2f}})},
        {"Bass","Plockbas",P({{"wave",1},{"pw",.3f},{"det",.06f},{"sub",.5f},{"cut",.25f},{"res",.25f},{"fenv",.5f},{"fD",.22f},{"fS",0},{"fR",.12f},{"aA",0},{"aD",.32f},{"aS",0},{"aR",.12f},{"cho",0},{"dly",0},{"vmode",0}})},
        {"Bass","Unison bas",P({{"wave",0},{"det",.4f},{"sub",.4f},{"cut",.28f},{"res",.3f},{"fenv",.4f},{"fD",.3f},{"fS",.15f},{"aA",0},{"aD",.35f},{"aS",.7f},{"aR",.14f},{"cho",0},{"dly",0},{"vmode",2},{"glide",.08f}})},
        {"Lead","Solo såg",P({{"wave",0},{"det",.22f},{"sub",.2f},{"cut",.5f},{"res",.3f},{"fenv",.35f},{"fD",.4f},{"fS",.4f},{"aA",.02f},{"aD",.4f},{"aS",.85f},{"aR",.25f},{"lfoDest",0},{"lfoAmt",.18f},{"lfoR",.55f},{"cho",1},{"choMix",.35f},{"dly",.25f},{"dlyT",1},{"dlyFb",.35f},{"vmode",1},{"glide",.18f}})},
        {"Lead","Fyrkant lead",P({{"wave",1},{"pw",.3f},{"det",.1f},{"sub",.3f},{"cut",.55f},{"res",.22f},{"fenv",.25f},{"aA",.01f},{"aS",.9f},{"aR",.22f},{"lfoDest",0},{"lfoAmt",.15f},{"lfoR",.5f},{"cho",0},{"dly",.28f},{"dlyT",0},{"dlyFb",.3f},{"vmode",1},{"glide",.22f}})},
        {"Lead","Unison skrik",P({{"wave",0},{"det",.55f},{"sub",.25f},{"cut",.6f},{"res",.4f},{"fenv",.3f},{"aA",.01f},{"aS",.9f},{"aR",.25f},{"cho",1},{"choMix",.4f},{"dly",.22f},{"dlyT",1},{"vmode",2},{"glide",.1f}})},
        {"Lead","Visslan",P({{"wave",1},{"pw",.5f},{"det",0},{"sub",0},{"noise",.05f},{"cut",.48f},{"res",.62f},{"fenv",.1f},{"kt",1},{"aA",.12f},{"aS",.9f},{"aR",.35f},{"lfoDest",0},{"lfoAmt",.2f},{"lfoR",.6f},{"cho",0},{"dly",.32f},{"dlyT",5},{"dlyFb",.45f},{"vmode",1},{"glide",.3f}})},
        {"Pluck","Glaspluck",P({{"wave",1},{"pw",.4f},{"det",.12f},{"sub",0},{"cut",.36f},{"res",.3f},{"fenv",.62f},{"fD",.22f},{"fS",0},{"fR",.2f},{"aA",0},{"aD",.38f},{"aS",0},{"aR",.3f},{"cho",2},{"choMix",.6f},{"dly",.32f},{"dlyT",1},{"dlyFb",.42f}})},
        {"Pluck","Arp-klocka",P({{"wave",1},{"pw",.22f},{"det",.05f},{"sub",0},{"cut",.44f},{"res",.45f},{"fenv",.55f},{"fD",.2f},{"fS",0},{"fR",.25f},{"aA",0},{"aD",.32f},{"aS",0},{"aR",.38f},{"cho",1},{"choMix",.5f},{"dly",.38f},{"dlyT",4},{"dlyFb",.5f}})},
        {"Pluck","Stab 90",P({{"wave",0},{"det",.3f},{"sub",.2f},{"cut",.4f},{"res",.38f},{"fenv",.55f},{"fD",.25f},{"fS",.05f},{"fR",.2f},{"aA",0},{"aD",.3f},{"aS",.1f},{"aR",.2f},{"cho",1},{"choMix",.4f},{"dly",.2f},{"dlyT",1}})},
        {"Pluck","House-ackord",P({{"wave",0},{"det",.2f},{"sub",.15f},{"cut",.35f},{"res",.32f},{"fenv",.45f},{"fD",.28f},{"fS",.08f},{"fR",.22f},{"aA",0},{"aD",.35f},{"aS",.15f},{"aR",.25f},{"cho",2},{"choMix",.5f},{"dly",.22f},{"dlyT",1},{"dlyFb",.35f}})},
        {"FX","Vind",P({{"wave",0},{"det",.6f},{"sub",0},{"noise",.55f},{"cut",.3f},{"res",.55f},{"fenv",.3f},{"fA",.8f},{"fD",.8f},{"fS",.4f},{"fR",.85f},{"aA",.8f},{"aS",.8f},{"aR",.85f},{"lfoW",0},{"lfoDest",1},{"lfoAmt",.45f},{"lfoR",.1f},{"cho",2},{"choMix",.7f},{"dly",.4f},{"dlyT",2},{"dlyFb",.6f}})},
        {"FX","Sample & hold",P({{"wave",0},{"det",.1f},{"sub",.2f},{"cut",.4f},{"res",.62f},{"fenv",.15f},{"aA",.01f},{"aS",.85f},{"aR",.3f},{"lfoW",4},{"lfoDest",1},{"lfoAmt",.62f},{"lfoR",.8f},{"lfoSync",1},{"cho",1},{"choMix",.4f},{"dly",.3f},{"dlyT",4},{"dlyFb",.45f}})},
        {"FX","Drönare",P({{"wave",0},{"det",.7f},{"sub",.6f},{"noise",.1f},{"cut",.25f},{"res",.5f},{"fenv",.2f},{"fA",.9f},{"fS",.6f},{"aA",.85f},{"aS",1},{"aR",.9f},{"lfoW",0},{"lfoDest",1},{"lfoAmt",.35f},{"lfoR",.05f},{"cho",2},{"choMix",.8f},{"dly",.45f},{"dlyT",5},{"dlyFb",.7f},{"vmode",2}})},
        {"FX","Ringping",P({{"wave",1},{"pw",.12f},{"det",0},{"sub",0},{"cut",.6f},{"res",.5f},{"fenv",.4f},{"fD",.12f},{"fS",0},{"aA",0},{"aD",.18f},{"aS",0},{"aR",.18f},{"cho",0},{"dly",.55f},{"dlyT",3},{"dlyFb",.75f}})},
    };
    count = (int)(sizeof(kP) / sizeof(kP[0]));
    return kP;
}

} // namespace blonda
