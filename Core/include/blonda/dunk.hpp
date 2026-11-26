// BLONDA SEQ — DUNK, the drum machine (C++ port of seq3/src/233b-dunk-drum-machine.js, v291).
// Eight synthesized channels in the spirit of Microtonic: oscillator (sine/tri/saw) with a pitch modulator
// (decay / sine / noise), filtered noise (LP/BP/HP, stereo, exp/linear/clap envelope), drive, EQ, level, pan,
// plus SUB, CRUSH and the kit's FAT. Ported node for node from the web voice (same Web Audio automation rules
// via WebParam, the same biquad formulas, the same WaveShaper curves), so a kit sounds the same in the app.
// Real-time safe: no allocation, locks or exceptions in trigger()/render().
#pragma once
#include "dsp.hpp"
#include "webparam.hpp"
#include <cmath>
#include <cstring>
#include <new>

namespace blonda::dunk {

constexpr int kCh = 8;

// a channel's sound; units as in Microtonic (Hz, ms, semitones, dB, %)
struct Patch {
    int wave = 0; float freq = 60, atk = 0, dcy = 300; int mod = 0; float rate = 50, amt = 0;
    int nf = 0; float nfreq = 2000, q = .7071f; int st = 0, ne = 0; float natk = 0, ndcy = 50;
    float mix = 50, dist = 0, eqf = 1000, eqg = 0, lvl = 0, pan = 0, ov = 0, nv = 0, mv = 0; int ck = 0; float sub = 0, crush = 0;
};
struct Kit { Patch p[kCh]; float fat = .3f, trim = 0; };
// the drum track's own knobs on top (SEQ.3: tune in semitones, decay and tone 0..1)
struct TrackMod { float tune = 0, decay = .45f, tone = .5f; };

// the constants the web version settled on in its A/B against Microtonic (TUNE in the JS)
struct Tune { float eqQ = .4f, eqQn = .4f, eqK = .85f, eqFree = 6, dcyK = 4.6f, ndcyK = 4.6f, modK = 4.6f; };
constexpr float kCal = .75f;

namespace detail {
// Web Audio biquad (lowpass/highpass take Q in dB, bandpass constant 0 dB peak), coefficients normalised
inline void design(int type, float f, float q, float sr, float* c) {
    f = clampf(f, 1.f, sr * .5f - 1.f);
    const float w = kTwoPi * f / sr, cs = std::cos(w), sn = std::sin(w); float b0, b1, b2, a0, a1, a2;
    if (type == 1) { const float al = sn / (2 * q); b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else { const float al = sn / (2 * std::pow(10.f, q / 20.f)); a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
        if (type == 0) { b0 = (1 - cs) * .5f; b1 = 1 - cs; b2 = b0; } else { b0 = (1 + cs) * .5f; b1 = -(1 + cs); b2 = b0; } }
    c[0] = b0 / a0; c[1] = b1 / a0; c[2] = b2 / a0; c[3] = a1 / a0; c[4] = a2 / a0;
}
// Web Audio peaking (gain dB, Q) and lowshelf (S = 1)
inline void designEQ(bool shelf, float f, float q, float gainDb, float sr, float* c) {
    f = clampf(f, 1.f, sr * .5f - 1.f);
    const float A = std::pow(10.f, gainDb / 40.f), w = kTwoPi * f / sr, cs = std::cos(w), sn = std::sin(w); float b0, b1, b2, a0, a1, a2;
    if (!shelf) { const float al = sn / (2 * q); b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
    else { const float al = sn / 2 * std::sqrt(2.f), k = 2 * std::sqrt(A) * al;
        b0 = A * ((A + 1) - (A - 1) * cs + k); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - k);
        a0 = (A + 1) + (A - 1) * cs + k; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - k; }
    c[0] = b0 / a0; c[1] = b1 / a0; c[2] = b2 / a0; c[3] = a1 / a0; c[4] = a2 / a0;
}
inline float bq(const float* c, float* z, float x) { const float y = c[0] * x + z[0]; z[0] = c[1] * x - c[3] * y + z[1]; z[1] = c[2] * x - c[4] * y; return y; }
// WaveShaper lookup with the Web Audio rule (linear interpolation, ends held)
inline float shape(const float* cv, int n, float x) {
    const float v = (n - 1) * .5f * (x + 1.f); if (v <= 0) return cv[0]; if (v >= n - 1) return cv[n - 1];
    const int k = (int)v; const float fr = v - k; return cv[k] + (cv[k + 1] - cv[k]) * fr;
}
// band-limited-enough oscillators matching Web Audio's phase: sine as cosine (starts at its peak: Microtonic's click),
// triangle and saw start at 0 rising like the Fourier-built Web Audio waves
inline float oscSample(int wave, float ph, float dt) {
    if (wave == 0) return std::cos(kTwoPi * ph);
    if (wave == 1) { const float p = ph + .25f - std::floor(ph + .25f); return 1.f - 4.f * std::fabs(p - .5f); }
    float p = ph + .5f; p -= std::floor(p); return 2.f * p - 1.f - polyBlep(p, dt);
}
} // namespace detail

class Dunk {
public:
    static constexpr int kCurve = 4096, kVoices = 24;
    Tune tune;

    void prepare(float sr) { sr_ = sr; for (auto& v : v_) v.on = false; for (auto& l : last_) l = -1; now_ = 0; }
    void setKit(const Kit& k) { kit_ = k; }   // from the audio thread (the host hands it over)
    const Kit& kit() const { return kit_; }

    // a hit on channel ch, `delay` frames into the next render block
    void trigger(int ch, int delay, float vel, const TrackMod& tm, int track = -1) {
        if (ch < 0 || ch >= kCh) return;
        const Patch& P = kit_.p[ch]; const double t = (double)(now_ + delay) / sr_;
        // the channel's own last hit, and its choke group
        cutCh(ch, t); if (P.ck) for (int j = 0; j < kCh; ++j) if (j != ch && kit_.p[j].ck == P.ck) cutCh(j, t);
        Voice* v = alloc(); if (!v) return; new (v) Voice(); v->on = true; v->ch = ch; v->trk = track; v->t0 = t;
        const float tuneSt = tm.tune, dsc = std::exp2((tm.decay - .45f) * 2.2f), tsc = std::exp2((tm.tone - .5f) * 2.5f);
        vel = clampf(vel, 0, 1); const float mv = vel <= .72f ? vel / .72f * .5f : .5f + (vel - .72f) / .28f * .5f; const bool sens = P.ov != 0 || P.nv != 0 || P.mv != 0;
        auto vs = [&](float s) { return std::max(0.f, 1.f - s / 100.f * (1.f - mv)); };
        const double atk = P.atk / 1000., dcy = std::max(.001, P.dcy / 1000. * dsc), natk = P.natk / 1000., ndcy = std::max(.001, P.ndcy / 1000. * dsc);
        const double oLen = atk + dcy * 1.5, nLen = natk + (P.ne == 1 ? ndcy : ndcy * 1.5) + (P.ne == 2 ? .03 : 0);
        v->end = t + std::max(oLen, nLen) + .06;
        const float mixO = P.mix / 100.f, mixN = 1 - mixO;
        // oscillator (+ sub)
        v->osc = mixO > .0005f;
        if (v->osc) {
            v->wave = P.wave; v->f = clampf(P.freq * std::exp2(tuneSt / 12.f), 5.f, 20000.f); v->sub = P.sub > .001f ? P.sub * 1.2f : 0;
            const float pk = std::max(1e-6f, mixO * vs(P.ov)); auto& g = v->og; g.reset(0); g.setValueAtTime(0, t);
            if (atk > .0005) { g.setValueAtTime(pk * .001f, t); g.exponentialRampToValueAtTime(std::max(1e-5f, pk), t + atk); } else g.setValueAtTime(pk, t);
            g.setTargetAtTime(0, t + std::max(atk, .0004), (float)(dcy / tune.dcyK));
            const float amt = P.amt * vs(P.mv) * 100.f; v->mod = -1;
            if (std::fabs(amt) > .5f) {
                if (P.mod == 0) { v->mod = 0; auto& d = v->det; d.reset(0); d.setValueAtTime(amt, t); d.setTargetAtTime(0, t, (float)(std::max(.0005, P.rate / 1000. * dsc) / tune.modK)); }
                else if (P.mod == 1) { v->mod = 1; v->modAmt = amt; v->modRate = std::max(.01f, P.rate); }
                else { v->mod = 2; v->modRate = clampf(P.rate, 1, 20000); v->modAmt = amt * std::min(6.f, std::sqrt(sr_ / 2.f / std::max(1.f, P.rate)) * .6f);
                    detail::design(0, std::min(v->modRate, sr_ * .5f), .5f, sr_, v->mc); }
            }
        }
        // noise
        v->noise = mixN > .0005f;
        if (v->noise) {
            const float pk = std::max(1e-6f, mixN * vs(P.nv)); auto& g = v->ng; g.reset(0); g.setValueAtTime(0, t);
            if (P.ne == 2) {   // clap: bursts for the attack time, then the tail
                const double span = natk > .002 ? natk : .03; const int nb = std::max(2, std::min(8, (int)std::lround(span / .01))); const double sp = span / nb;
                for (int k = 0; k < nb; ++k) { const double a = t + k * sp; g.setValueAtTime(0, a); g.linearRampToValueAtTime(pk, a + .0006); g.setTargetAtTime(pk * .08f, a + .0006, (float)(sp / 3)); }
                const double a = t + nb * sp; g.setValueAtTime(0, a); g.linearRampToValueAtTime(pk, a + .0006); g.setTargetAtTime(0, a + .0006, (float)(ndcy / 6.9));
            } else {
                if (natk > .0005 && P.ne == 0) { g.setValueAtTime(pk * .001f, t); g.exponentialRampToValueAtTime(std::max(1e-5f, pk), t + natk); }
                else if (natk > .0005) g.linearRampToValueAtTime(pk, t + natk); else g.setValueAtTime(pk, t);
                if (P.ne == 1) g.linearRampToValueAtTime(0, t + natk + ndcy); else g.setTargetAtTime(0, t + std::max(natk, .0004), (float)(ndcy / tune.ndcyK));
            }
            const float nfq = std::min(sr_ * .45f, std::max(20.f, P.nfreq * tsc * std::exp2(tuneSt / 24.f)));
            const float q = P.nf == 1 ? std::min(300.f, std::max(.1f, P.q)) : std::max(-20.f, std::min(40.f, 20.f * std::log10(std::max(.1f, P.q))));
            detail::design(P.nf, nfq, q, sr_, v->nc);
            if (P.nf == 1) { const float qq = std::max(.1f, P.q); v->bpg = qq <= 30 ? qq : 30 * std::sqrt(qq / 30); } else v->bpg = 1;
            v->stereo = P.st != 0;
        }
        // drive → EQ → fat shelf → crush → level → pan
        const float fat = kit_.fat, drv = P.dist / 100.f * 13.f + fat * 4.f;
        v->drv = drv > .05f ? curveFor(1 + drv) : -1;
        v->eq = std::fabs(P.eqg) > .05f; if (v->eq) detail::designEQ(false, std::min(sr_ * .45f, std::max(20.f, P.eqf)), P.eqg < 0 ? tune.eqQn : tune.eqQ, P.eqg, sr_, v->ec);
        const float eqComp = P.eqg > tune.eqFree ? std::pow(10.f, -(P.eqg - tune.eqFree) * tune.eqK / 20.f) : 1.f;
        v->shelf = fat > .01f; if (v->shelf) detail::designEQ(true, 95, 0, fat * 5, sr_, v->sc);
        v->crush = P.crush > .01f ? stepFor(P.crush) : -1;
        v->level = kCal * std::pow(10.f, kit_.trim / 20.f) * eqComp * std::pow(10.f, P.lvl / 20.f) * (sens ? 1.f : .5f + .5f * vel);
        v->panned = std::fabs(P.pan) > .5f; v->pan = clampf(P.pan / 100.f, -1, 1);
        v->vg.reset(v->level);
        last_[ch] = (int)(v - v_);
    }

    // adds channel ch into L/R (n frames); call for each channel, then advance(n)
    void render(int ch, float* L, float* R, int n) {
        for (auto& v : v_) if (v.on && v.ch == ch) runVoice(v, L, R, n);
    }
    // the voices one track started (a channel can play on several tracks)
    void renderTrack(int track, float* L, float* R, int n) {
        for (auto& v : v_) if (v.on && v.trk == track) runVoice(v, L, R, n);
    }
    void advance(int n) { now_ += n; }
    // all channels into one pair
    void process(float* L, float* R, int n) { for (int c = 0; c < kCh; ++c) render(c, L, R, n); advance(n); }
    int active() const { int k = 0; for (auto& v : v_) k += v.on; return k; }

private:
    struct Voice {
        bool on = false; int ch = 0, trk = -1; double t0 = 0, end = 0, cutAt = 1e30;
        bool osc = false; int wave = 0; float f = 60, sub = 0, ph = 0, sph = 0; int mod = -1; float modAmt = 0, modRate = 0, mph = 0, mc[5]{}, mz[2]{};
        WebParamN<8> og, det;
        bool noise = false, stereo = false; float nc[5]{}, nz[2][2]{}, bpg = 1; WebParamN<32> ng;
        int drv = -1, crush = -1; bool eq = false, shelf = false; float ec[5]{}, ez[2][2]{}, sc[5]{}, sz[2][2]{};
        float level = 1; bool panned = false; float pan = 0; WebParamN<4> vg;
    };
    float sr_ = 48000; long long now_ = 0; Kit kit_; Voice v_[kVoices]; int last_[kCh];
    Noise rng_;
    // curves: drive (tanh with a little offset) by k in quarter steps, crush by step count
    static constexpr int kDrv = 64, kStep = 32;
    float drvC_[kDrv][kCurve]; float drvK_[kDrv]; int nDrv_ = 0;
    float stepC_[kStep][kCurve]; int stepL_[kStep]; int nStep_ = 0;

    // curves are built on first use; the kit's values are few, so they are made ahead by warm() from the UI thread
public:
    void warm() { for (const auto& P : kit_.p) { curveFor(1 + P.dist / 100.f * 13.f + kit_.fat * 4.f); if (P.crush > .01f) stepFor(P.crush); } }
private:
    int curveFor(float k) {
        k = std::round(k * 4) / 4; for (int i = 0; i < nDrv_; ++i) if (drvK_[i] == k) return i;
        if (nDrv_ >= kDrv) return nDrv_ - 1;
        const int i = nDrv_; const double a = .12; auto f = [&](double x) { return std::tanh(k * (x + a)) - std::tanh(k * a); };
        const double d = std::max(std::fabs(f(1)), std::fabs(f(-1)));
        for (int j = 0; j < kCurve; ++j) { const double x = j / (double)(kCurve - 1) * 2 - 1; drvC_[i][j] = (float)(f(x) / d); }
        drvK_[i] = k; nDrv_ = i + 1; return i;
    }
    int stepFor(float a) {
        const int L = std::max(3, (int)std::lround(3 + std::pow(1 - a, 2) * 125)); for (int i = 0; i < nStep_; ++i) if (stepL_[i] == L) return i;
        if (nStep_ >= kStep) return nStep_ - 1;
        const int i = nStep_; for (int j = 0; j < kCurve; ++j) { const double x = j / (double)(kCurve - 1) * 2 - 1; stepC_[i][j] = (float)(std::round(x * L) / L); }
        stepL_[i] = L; nStep_ = i + 1; return i;
    }
    void cutCh(int ch, double t) {
        for (auto& v : v_) if (v.on && v.ch == ch && v.cutAt > 1e29) { v.vg.cancelAndHold(t); v.vg.setTargetAtTime(0, t, .003f); v.cutAt = t + .03; }
    }
    Voice* alloc() {
        for (auto& v : v_) if (!v.on) return &v;
        Voice* best = &v_[0]; for (auto& v : v_) if (v.cutAt < best->cutAt || (v.cutAt == best->cutAt && v.t0 < best->t0)) best = &v; return best;   // steal the oldest cut one
    }
    void runVoice(Voice& v, float* L, float* R, int n) {
        const float isr = 1.f / sr_;
        for (int i = 0; i < n; ++i) {
            const double t = (double)(now_ + i) / sr_;
            if (t < v.t0) continue;
            if (t >= v.end || t >= v.cutAt) { v.on = false; return; }
            const double lt = t - v.t0; float sl = 0, sr = 0;
            if (v.osc) {
                float cents = 0;
                if (v.mod == 0) cents = v.det.valueAt(t);
                else if (v.mod == 1) { cents = v.modAmt * std::sin(kTwoPi * v.mph); v.mph += v.modRate * isr; v.mph -= std::floor(v.mph); }
                else if (v.mod == 2) cents = v.modAmt * detail::bq(v.mc, v.mz, rng_.next());
                const float r = cents != 0 ? std::exp2(cents / 1200.f) : 1.f, fq = v.f * r, dt = fq * isr;
                float o = dt < .5f ? detail::oscSample(v.wave, v.ph, dt) : 0.f;
                v.ph += dt; v.ph -= std::floor(v.ph);
                if (v.sub > 0) { const float sdt = dt * .5f; o += v.sub * std::sin(kTwoPi * v.sph); v.sph += sdt; v.sph -= std::floor(v.sph); }
                o *= v.og.valueAt(t); sl += o; sr += o;
            }
            if (v.noise) {
                const float g = v.ng.valueAt(t) * v.bpg;
                const float a = detail::bq(v.nc, v.nz[0], rng_.next()) * g;
                const float b = v.stereo ? detail::bq(v.nc, v.nz[1], rng_.next()) * g : a;
                sl += a; sr += b;
            }
            (void)lt;
            if (v.drv >= 0) { sl = detail::shape(drvC_[v.drv], kCurve, sl); sr = detail::shape(drvC_[v.drv], kCurve, sr); }
            if (v.eq) { sl = detail::bq(v.ec, v.ez[0], sl); sr = detail::bq(v.ec, v.ez[1], sr); }
            if (v.shelf) { sl = detail::bq(v.sc, v.sz[0], sl); sr = detail::bq(v.sc, v.sz[1], sr); }
            if (v.crush >= 0) { sl = detail::shape(stepC_[v.crush], kCurve, sl); sr = detail::shape(stepC_[v.crush], kCurve, sr); }
            const float gv = v.vg.valueAt(t); sl *= gv; sr *= gv;
            if (v.panned) {   // Web Audio StereoPanner: mono input equal power, stereo input as the spec
                const float p = v.pan, x = p <= 0 ? p + 1 : p, gl = std::cos(x * kPi * .5f), gr = std::sin(x * kPi * .5f);
                if (!v.stereo || !v.noise) { const float m = sl, xx = (p + 1) * .5f; sl = m * std::cos(xx * kPi * .5f); sr = m * std::sin(xx * kPi * .5f); }
                else if (p <= 0) { const float l2 = sl + sr * gl, r2 = sr * gr; sl = l2; sr = r2; } else { const float l2 = sl * gl, r2 = sr + sl * gr; sl = l2; sr = r2; }
            }
            L[i] += sl; R[i] += sr;
        }
    }
};

} // namespace blonda::dunk
