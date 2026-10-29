// Ports of the web version's voice functions (synthVoice, acidVoice, subVoice, fmVoice, pluckVoice, superVoice,
// chipVoice, sh101Voice, miniVoice). Each block mirrors the JavaScript line by line so the sound stays identical.
#include "blonda/engines.hpp"

namespace blonda {
using namespace wg;

static inline float hz(float m) { return 440.f * std::exp2((m - 69.f) / 12.f); }
static inline float acidHz(float v) { return 22.f * std::exp2(v * 9.6f); }
static inline float shT(float v, float mx) { return .0015f + v * v * mx; }
static const float FM_R[7] = {.5f, 1.f, 1.5f, 2.f, 3.f, 3.5f, 7.f};
static const WaveId MG_W12[6] = {W_MG_TRI, W_MG_SHARK, W_MG_SAW, W_MG_SQ, W_MG_WIDE, W_MG_NARROW};
static const WaveId MG_W3[6] = {W_MG_TRI, W_MG_SHARK, W_MG_RSAW, W_MG_SAW, W_MG_SQ, W_MG_WIDE};
static WaveId builtinWave(int w) { return w == 0 ? W_SINE : w == 1 ? W_SQUARE : w == 3 ? W_TRI : W_SAW; }

enum LiveKind { L_ANALOG, L_ACID, L_SH101, L_MINI };

void MelodicTrack::prepare(float sampleRate, bool isBassTrack) {
    sr_ = sampleRate; bass_ = isBassTrack; now_ = 0; rng_.seed(isBassTrack ? 0xBA55u : 0x1EADu);
    warmWaves(); int n; noiseBuffer(n, sampleRate);
    for (auto& g : g_) g.reset(sampleRate);
    liveNote_.fill(-1);
}

void MelodicTrack::trigger(float velocity, int note, float lenSec, const int* iv, int n, int offset, const Glide* glide, bool live) {
    if (nPend_ >= (int)pend_.size()) return;
    Pending& p = pend_[nPend_++]; p.off = offset; p.vel = velocity; p.note = note; p.len = lenSec; p.n = std::min(n, 6);
    for (int i = 0; i < p.n; ++i) p.iv[i] = iv[i];
    if (p.n == 0) { p.iv[0] = 0; p.n = 1; }
    if (glide) p.gl = *glide; else p.gl.n = 0;
    p.live = live;
}

void MelodicTrack::releaseLive(int note) {
    // web relTime(): super .35, pluck / chip .05, others .12 (setTargetAtTime(0, at, rel/3), freed after rel*4+.4)
    const float rel = engine == Eng::Super ? .35f : (engine == Eng::Pluck || engine == Eng::Chip) ? .05f : .12f;
    const double at = now_;
    for (int i = 0; i < kGraphs; ++i)
        if (liveNote_[i] == note && g_[i].active()) { g_[i].release(at, rel / 3.f, at + rel * 4.f + .4f); liveNote_[i] = -1; }
    // a note-on queued in this same block that has not started yet: drop it
    for (int k = 0; k < nPend_; ++k) if (pend_[k].live && pend_[k].note == note) pend_[k].live = false, pend_[k].len = std::min(pend_[k].len, .03f);
}

// glideOsc(): slide the parameter through the chain of tied notes
void MelodicTrack::glide(Param& prm, float f0, double t) {
    if (!gl_ || gl_->n == 0) return; float last = f0;
    for (int i = 0; i < gl_->n; ++i) { const double tt = t + gl_->at[i] * gl_->sd; const float f = f0 * std::exp2((gl_->note[i] - gl_->n0) / 12.f);
        prm.setValueAtTime(last, std::max(t + .002, tt - gl_->gt)); prm.exponentialRampToValueAtTime(f, tt); last = f; }
}

int MelodicTrack::newGraph(double t) {
    int slot = -1; uint32_t oa = UINT32_MAX;
    for (int i = 0; i < kGraphs; ++i) { if (!g_[i].active()) { slot = i; break; } if (age_[i] < oa) { oa = age_[i]; slot = i; } }
    g_[slot].reset(sr_); age_[slot] = ++ages_; live_[slot] = Live{}; liveNote_[slot] = -1; lastGraph_ = slot; (void)t;
    return slot;
}

void MelodicTrack::killLast(Last& L, double t, float tau) {
    if (!L.has || L.graph < 0 || L.gnode < 0 || age_[L.graph] != L.age || !g_[L.graph].active() || !(t > L.t)) return;
    Param& p = g_[L.graph].param(L.gnode, P0); p.cancelAndHold(t); p.setTargetAtTime(.0001f, t, tau);
}

float MelodicTrack::liveCents(const Live& L) const {
    const EngineParams& E = *params; const float tone = sound.tone;
    switch (L.kind) {
        case L_ANALOG: return 8786.f * analog->cut + 1200.f * std::log2(.55f + tone * .9f);
        case L_ACID: return 1200.f * std::log2(acidHz(E.acid.cut) * (.6f + tone * .8f));
        case L_SH101: return 1200.f * (9.8f * E.sh101.cut + std::log2(.6f + tone * .8f));
        case L_MINI: return 1200.f * (9.6f * E.mini.cut + std::log2(.6f + tone * .8f));
    }
    return 0;
}
float MelodicTrack::liveQ(const Live& L) const {
    const EngineParams& E = *params;
    switch (L.kind) {
        case L_ANALOG: return .5f + analog->res * 16.f;
        case L_ACID: return (.7f + std::pow(E.acid.res, 1.15f) * 30.f) * (L.acc ? 1.f + E.acid.acc * .35f : 1.f);
        case L_SH101: return .6f + std::pow(E.sh101.res, 1.25f) * 19.f;
        case L_MINI: return .6f + std::pow(E.mini.emph, 1.3f) * 18.f;
    }
    return 1;
}
// cutoff / resonance moves bend notes that are already sounding (like liveReg/liveTick in the web version)
void MelodicTrack::updateLive() {
    for (int i = 0; i < kGraphs; ++i) {
        Live& L = live_[i]; if (L.kind < 0 || !g_[i].active()) continue;
        const float d = liveCents(L) - L.c0;
        if (std::fabs(d - L.lc) > 1.5f) { L.lc = d; for (int k = 0; k < L.nf; ++k) g_[i].setLiveDetune(L.f[k], clampf(d, -9600.f, 9600.f)); }
        if (L.q >= 0) { const float q = liveQ(L); if (std::fabs(q - L.q0) > .01f && std::fabs(q - L.lq) > .005f) { L.lq = q; g_[i].setLiveQ(L.q, q); } }
    }
}

void MelodicTrack::process(float* L, float* R, int frames) {
    updateLive();
    const double dt = 1.0 / sr_;
    for (int i = 0; i < frames; ++i) {
        const double t = now_ + i * dt;
        for (int k = 0; k < nPend_; ++k) if (pend_[k].off == i) { gl_ = pend_[k].gl.n ? &pend_[k].gl : nullptr; build(pend_[k].vel, pend_[k].note, pend_[k].len, pend_[k].iv, pend_[k].n, t); gl_ = nullptr; if (pend_[k].live && lastGraph_ >= 0) liveNote_[lastGraph_] = pend_[k].note; }
        float l = 0, r = 0;
        for (auto& g : g_) if (g.active()) g.tick(t, l, r);
        L[i] += l; R[i] += r;
    }
    nPend_ = 0; now_ += frames * dt;
}

// ============================================================================ voices
void MelodicTrack::build(float v, int note, float len, const int* vc, int nvc, double t) {
    const EngineParams& EP = *params; const TrackSound& p = sound;
    const int gi = newGraph(t); Graph& G = g_[gi]; Live& LV = live_[gi];

    switch (engine) {
    // ------------------------------------------------------------------ Analog (synthVoice)
    case Eng::Analog: {
        const AnalogP& sy = *analog; const bool sub = bass_;
        const float gate = std::max(.06f, len * (.6f + p.decay * 3.4f)), a = sy.a, d = sy.d, s = sy.s, r = sy.r;
        const float base = std::min(16000.f, 70.f * std::pow(160.f, sy.cut) * (.55f + p.tone * .9f)), peak = std::min(18000.f, base * (1 + sy.env * 7) * (.7f + v * .3f));
        const int f = G.biquad(BQ_LP, base, .5f + sy.res * 16.f), g = G.gain(1);
        Param& ff = G.param(f, P0); ff.setValueAtTime(base, t); ff.linearRampToValueAtTime(peak, t + a); ff.setTargetAtTime(base + (peak - base) * s * .5f, t + a, std::max(.01f, d / 3));
        const float lvl = v * (sub ? .5f : .42f) / std::sqrt((float)nvc); const double te = t + std::max(gate, a + .01f), end = te + r + .2;
        Param& gg = G.param(g, P0); gg.setValueAtTime(.0001f, t); gg.linearRampToValueAtTime(lvl, t + a); gg.setTargetAtTime(lvl * std::max(.001f, s), t + a, std::max(.01f, d / 3));
        gg.setTargetAtTime(.0001f, te, std::max(.01f, r / 4)); ff.setTargetAtTime(base, te, std::max(.01f, r / 4));
        for (int k = 0; k < nvc; ++k) {
            const float fr = 440.f * std::exp2((note + vc[k] - 69 + p.tune) / 12.f);
            static const float kDet2[2] = {-7.f, 7.f}, kDet1[1] = {0.f};
            const float* dets = sub ? kDet1 : kDet2; const int nd = sub ? 1 : 2;
            for (int di = 0; di < nd; ++di) { const float dtn = dets[di];
                const int o = G.osc(builtinWave(sy.wave), fr, t, end), og = G.gain(sub ? 1.f : (k == 0 ? .9f : .55f) / (1 + k * .2f));
                G.param(o, P1).setDefault(dtn); glide(G.param(o, P0), fr, t); G.connect(o, og); G.connect(og, f);
            }
        }
        if (sub) { const float f2 = 440.f * std::exp2((note - 81 + p.tune) / 12.f); const int o2 = G.osc(W_SQUARE, f2, t, end), g2 = G.gain(sy.wave == 0 ? .15f : .35f); glide(G.param(o2, P0), f2, t); G.connect(o2, g2); G.connect(g2, f); }
        G.connect(f, g); G.toOut(g); G.finalize(end + .05);
        LV.kind = L_ANALOG; LV.nf = 1; LV.f[0] = (int16_t)f; LV.q = (int16_t)f; LV.c0 = liveCents(LV); LV.q0 = liveQ(LV);
        break; }

    // ------------------------------------------------------------------ Acid (acidVoice)
    case Eng::Acid: {
        const AcidP& E = EP.acid; const float fr = hz(note + p.tune); const bool acc = v >= .95f;
        const int o = G.osc(E.wave == 1 ? W_SQUARE : W_SAW, fr, t, 0);
        Param& of = G.param(o, P0); of.setDefault(440.f);
        if (E.slide && acidLast_.has && t > acidLast_.t && t - acidLast_.t < len * 1.6) { of.setValueAtTime(acidLast_.f, t); of.exponentialRampToValueAtTime(fr, t + .02 + E.st * .28); }
        else of.setValueAtTime(fr, t);
        acidLast_.has = true; acidLast_.t = t; acidLast_.f = fr; glide(of, fr, t);
        const float ny = sr_ * .45f; const bool open = E.cut > .97f; const float rs = std::pow(E.res, 1.15f);
        const float base = std::min(ny, acidHz(E.cut) * (.6f + p.tone * .8f)), peak = std::min(ny, base * (1 + E.env * (acc ? 1 + E.acc : 1) * 14)), dec = (.06f + E.dec * .9f) * (acc ? .7f : 1.f);
        const int f1 = G.biquad(BQ_LP, 350, .55f), f = G.biquad(BQ_LP, 350, 1);
        const float q = .7f + rs * 30.f; G.param(f, P1).setValueAtTime(acc ? q * (1 + E.acc * .35f) : q, t);
        const int dc = G.biquad(BQ_HP, 28, .6f);
        for (int n : {f1, f}) { Param& pf = G.param(n, P0); pf.setValueAtTime(peak, t); pf.setTargetAtTime(base, t + .003, dec / 3); }
        if (open) { Param& pf = G.param(f1, P0); pf.reset(350); pf.setValueAtTime(ny, t); }
        const int sh = G.shaper(C_DIST, E.drive, 4);
        const int dt = G.biquad(BQ_LP, std::min(ny, 2200.f * std::exp2(E.dtone * 3.2f) * (1 + (1 - E.drive) * 1.5f)), .5f);
        const int g = G.gain(1); const float gate = std::max(.05f, len * (.5f + p.decay * 2.2f)), lvl = v * (acc ? .75f + E.acc * .35f : .65f) / (1 + rs * 1.5f) / (1 + E.drive * .9f);
        Param& gg = G.param(g, P0); gg.setValueAtTime(.0001f, t); gg.linearRampToValueAtTime(lvl, t + .004); gg.setValueAtTime(lvl, t + gate); gg.exponentialRampToValueAtTime(.0001f, t + gate + .06);
        G.setStop(o, t + gate + .12);
        G.connect(o, f1); G.connect(f1, f); G.connect(f, sh); G.connect(sh, dt); G.connect(dt, dc); G.connect(dc, g); G.toOut(g);
        G.finalize(t + gate + .12 + .02);
        LV.kind = L_ACID; LV.acc = acc; if (open) { LV.nf = 1; LV.f[0] = (int16_t)f; } else { LV.nf = 2; LV.f[0] = (int16_t)f1; LV.f[1] = (int16_t)f; }
        LV.q = (int16_t)f; LV.c0 = liveCents(LV); LV.q0 = liveQ(LV);
        break; }

    // ------------------------------------------------------------------ Sub 808 (subVoice)
    case Eng::Sub: {
        const SubP& E = EP.sub; const float fr = hz(note - 12 + p.tune);
        const bool gl = E.glide > 0 && subLast_.has && t > subLast_.t && t - subLast_.t < len * 3;
        killLast(subLast_, t, .012f);
        const int o = G.osc(W_SINE, fr, t, 0); Param& of = G.param(o, P0); of.setDefault(440.f);
        of.setValueAtTime(gl ? subLast_.f : fr * std::exp2(E.punch * 2), t); of.exponentialRampToValueAtTime(fr, t + (gl ? .02 + E.glide * .25 : .03 + E.punch * .06)); glide(of, fr, t);
        const int sh = G.shaper(C_DRIVE, E.drive, 1), lp = G.biquad(BQ_LP, 150 + E.tone * E.tone * 6000, 1);
        const int g = G.gain(1); const float dec = .1f + E.decay * 2.5f, lvl = v * .32f;
        Param& gg = G.param(g, P0); gg.setValueAtTime(.0001f, t); gg.linearRampToValueAtTime(lvl, t + .003); gg.setTargetAtTime(.0001f, t + .02, dec / 3);
        const double stop = t + dec * 1.7 + .1; G.setStop(o, stop);
        G.connect(o, sh); G.connect(sh, lp); G.connect(lp, g); G.toOut(g);
        if (E.click > 0) {
            const int n = G.noise(t, t + .02 + .05, rng_.uni() * .4f), nf = G.biquad(BQ_HP, 1800, 1), ng = G.gain(1);
            Param& pg = G.param(ng, P0); pg.setValueAtTime(.0001f, t); pg.linearRampToValueAtTime(v * E.click * .3f, t + .001); pg.exponentialRampToValueAtTime(.0001f, t + .013);
            G.connect(n, nf); G.connect(nf, ng); G.toOut(ng);
        }
        G.finalize(stop + .02);
        subLast_.has = true; subLast_.t = t; subLast_.f = fr; subLast_.graph = gi; subLast_.gnode = g; subLast_.age = age_[gi];
        break; }

    // ------------------------------------------------------------------ FM Glass (fmVoice)
    case Eng::FM: {
        const FMP& E = EP.fm; const float r = FM_R[std::min(6, std::max(0, (int)std::lround(E.ratio)))], dec = .2f + E.decay * 2.5f, rel = .05f + E.rel * 1.5f;
        const double te = t + std::max(.05f, len * (.6f + p.decay * 4));
        const int lp = G.biquad(BQ_LP, (1200 + E.bright * 12000) * (.6f + p.tone * .8f), .3f); G.toOut(lp);
        const double end = te + rel + .25;
        for (int k = 0; k < nvc; ++k) {
            const float fr = hz(note + vc[k] + p.tune), I = E.index * 10 * fr * (.6f + v * .4f);
            const int c = G.osc(W_SINE, fr, t, end), m = G.osc(W_SINE, fr * r, t, end), mg = G.gain(1), g = G.gain(1);
            Param& pm = G.param(mg, P0); pm.setValueAtTime(I, t); pm.setTargetAtTime(I * .12f, t, dec / 2.5f);
            glide(G.param(c, P0), fr, t); glide(G.param(m, P0), fr * r, t);
            G.connect(m, mg); G.connectParam(mg, c, P0);
            if (E.bell > 0) { const int b = G.osc(W_SINE, fr * 14, t, t + .4), bg = G.gain(1); Param& pb = G.param(bg, P0); pb.setValueAtTime(fr * E.bell * 6, t); pb.setTargetAtTime(0, t, .04f);
                              G.connect(b, bg); G.connectParam(bg, c, P0); }
            const float lvl = v * .4f / std::sqrt((float)nvc) * (k ? .8f : 1.f);
            Param& pg = G.param(g, P0); pg.setValueAtTime(.0001f, t); pg.linearRampToValueAtTime(lvl, t + .003); pg.setTargetAtTime(lvl * .25f, t + .01, dec / 3); pg.setTargetAtTime(.0001f, te, rel / 4);
            G.connect(c, g); G.connect(g, lp);
        }
        G.finalize(end + .05);
        break; }

    // ------------------------------------------------------------------ Pluck (pluckVoice + ksBuf)
    case Eng::Pluck: {
        const PluckP& E = EP.pluck;
        const int sh = G.shaper(C_DRIVE, E.drive * .6f, 1), lp = G.biquad(BQ_LP, 2000 + p.tone * 12000, 1); G.connect(sh, lp); G.toOut(lp);
        double end = t;
        for (int k = 0; k < nvc; ++k) {
            const double st = t + k * .012 * E.width;
            const int src = G.karplus(hz(note + vc[k] + p.tune), E.damp, E.bright, E.body, E.len, st, rng_.s ^ (uint32_t)(k * 7919 + note)); rng_.next();
            glide(G.param(src, P0), 1.f, t);
            const int g = G.gain(v * .42f / std::sqrt((float)nvc));
            const float pn = nvc > 1 ? (((float)k / (nvc - 1)) * 2 - 1) * E.width * .7f : (rng_.uni() * 2 - 1) * E.width * .25f;
            const int pnode = G.pan(pn); G.connect(src, g); G.connect(g, pnode); G.connect(pnode, sh);
            end = std::max(end, st + .4 + E.len * 2.6);
        }
        G.finalize(end + .05);
        break; }

    // ------------------------------------------------------------------ Super Pad (superVoice)
    case Eng::Super: {
        const SuperP& E = EP.super_; const float att = .01f + E.attack * 1.5f, rel = .1f + E.release * 3;
        const double te = t + std::max(att + .05f, len * (1 + p.decay * 10)), end = te + rel + .3;
        const int lp = G.biquad(BQ_LP, (400 + E.bright * 7000) * (.6f + p.tone * .8f), .6f), hs = G.biquad(BQ_HS, 6000, 1, E.air * 12), g = G.gain(1);
        const float lvl = v * .62f / std::sqrt((float)nvc);
        Param& pg = G.param(g, P0); pg.setValueAtTime(.0001f, t); pg.linearRampToValueAtTime(lvl, t + att); pg.setTargetAtTime(lvl * .8f, t + att, .3f); pg.setTargetAtTime(.0001f, te, rel / 4);
        G.connect(lp, hs); G.connect(hs, g); G.toOut(g);
        for (int k = 0; k < nvc; ++k) {
            const float fr = hz(note + vc[k] + p.tune);
            for (float dd : {-1.f, -.66f, -.33f, 0.f, .33f, .66f, 1.f}) {
                const int o = G.osc(W_SAW, fr, t, end), og = G.gain(dd == 0 ? .22f : .14f), pn = G.pan(dd * E.width);
                G.param(o, P1).setDefault(dd * E.detune * 40 + (rng_.uni() - .5f) * 3); glide(G.param(o, P0), fr, t);
                G.connect(o, og); G.connect(og, pn); G.connect(pn, lp);
            }
        }
        G.finalize(end + .05);
        break; }

    // ------------------------------------------------------------------ Chip (chipVoice)
    case Eng::Chip: {
        const ChipP& E = EP.chip; const float gate = std::max(.05f, len * (.55f + p.decay * 2.4f)), dec = .05f + E.dec * 1.4f; const double end = t + gate + .15;
        const float base = note + 12 * E.oct + p.tune;
        float arp[6]; int na = 0;
        switch (E.arpm) { case 1: arp[0] = 0; arp[1] = 4; arp[2] = 7; na = 3; break; case 2: arp[0] = 0; arp[1] = 3; arp[2] = 7; na = 3; break; case 3: arp[0] = 0; arp[1] = 12; na = 2; break;
                          case 4: arp[0] = 0; na = 1; break; default: if (nvc > 1) { for (int i = 0; i < nvc && i < 6; ++i) arp[i] = (float)vc[i]; na = std::min(nvc, 6); } else { arp[0] = 0; na = 1; } }
        const WaveId w = E.duty == 3 ? W_TRI : (E.duty == 0 ? W_CHIP_125 : E.duty == 2 ? W_CHIP_50 : W_CHIP_25);
        const int o = G.osc(w, hz(base), t, end); G.param(o, P0).setDefault(440.f);
        const double stp = 1.0 / (10 + E.arp * 40);
        // the web loop schedules steps for tt < t+gate+.1; the last scheduled value then holds
        const double lastStep = t + std::floor((gate + .1 - 1e-9) / stp) * stp;
        if (na > 1) G.setArp(o, arp, na, base, t, stp, lastStep); else { G.param(o, P0).setValueAtTime(hz(base + arp[0]), t); glide(G.param(o, P0), hz(base), t); }
        if (E.vib > 0) { const int l = G.osc(W_SINE, 5.5f, t, end), lg = G.gain(0); Param& pl = G.param(lg, P0); pl.setValueAtTime(0, t); pl.linearRampToValueAtTime(E.vib * 30, t + .18);
                         G.connect(l, lg); G.connectParam(lg, o, P1); }
        const int q = G.shaper(C_CRUSH, (float)std::lround(8 - E.crush * 5), 1), g = G.gain(1);
        const float lvl = v * .42f; Param& pg = G.param(g, P0); pg.setValueAtTime(lvl, t);
        for (int i = 1; i <= 8; ++i) pg.setValueAtTime(lvl * std::max(.25f, 1 - i / 8.f * (1 - std::exp(-gate / dec))), t + gate * i / 8.0);
        pg.setValueAtTime(lvl * .25f, t + gate); pg.linearRampToValueAtTime(0, t + gate + .03);
        G.connect(o, q); G.connect(q, g); G.toOut(g); G.finalize(end + .02);
        break; }

    // ------------------------------------------------------------------ SH-101 (sh101Voice)
    case Eng::SH101: {
        const SH101P& E = EP.sh101; const int octs[4] = {-1, 0, 1, 2}; const int oct = octs[std::min(3, std::max(0, E.range))];
        const float fr = hz(note + p.tune + 12 * oct), gate = std::max(.04f, len * (.55f + p.decay * 2.4f));
        const float aA = shT(E.A, 4), aD = shT(E.D, 10), aR = shT(E.R, 10); const double end = t + gate + aR * 5 + .15; const bool acc = v >= .95f;
        const Last& last = shLast_;
        const bool legato = last.has && t > last.t && t - last.t < (last.gate > 0 ? last.gate : len) + .01;
        const bool glOn = E.portaMode == 1 || (E.portaMode == 2 && legato); const float gt = .004f + E.porta * E.porta * 1.6f;
        killLast(shLast_, t, .006f);
        auto setF = [&](Param& prm, float m) { if (glOn && last.has && E.porta > .01f) { prm.setValueAtTime(last.f * m, t); prm.exponentialRampToValueAtTime(fr * m, t + gt); } else prm.setValueAtTime(fr * m, t); glide(prm, fr * m, t); };
        // LFO (shLfo)
        const float rate = .1f * std::exp2(E.lfoR * 7.2f); int lfo;
        if (E.lfoW == 2) lfo = G.sampleHold(rate, t, end, rng_.s ^ 0x5151u);
        else if (E.lfoW == 3) lfo = G.noise(t, end, 0);
        else lfo = G.osc(E.lfoW == 1 ? W_SQUARE : W_TRI, rate, t, end);
        rng_.next();
        const int mix = G.gain(1);
        // VCO: saw + variable pulse (saw minus delayed saw)
        const int saw = G.osc(W_SAW, fr, t, end), ps = G.osc(W_SAW, fr, t, end), dl = G.delay(.2f, 0), inv = G.gain(-1), pg = G.gain(1), sg = G.gain(E.saw * .5f);
        G.param(saw, P0).setDefault(440.f); G.param(ps, P0).setDefault(440.f); setF(G.param(saw, P0), 1); setF(G.param(ps, P0), 1);
        G.connect(ps, pg); G.connect(ps, dl); G.connect(dl, inv); G.connect(inv, pg);
        const float w0 = E.pwmSrc == 1 ? .5f + E.pw * .45f : .5f; Param& pd = G.param(dl, P0); pd.setValueAtTime(w0 / fr, t);
        if (E.pwmSrc == 0 && E.pw > .01f) { const int lg = G.gain(E.pw * .42f / fr); G.connect(lfo, lg); G.connectParam(lg, dl, P0); }
        if (E.pwmSrc == 2 && E.pw > .01f) { pd.linearRampToValueAtTime((.5f + E.pw * .45f) / fr, t + aA); pd.setTargetAtTime((.5f + E.pw * .45f * E.S) / fr, t + aA, aD / 3); pd.setTargetAtTime(.5f / fr, t + gate, aR / 3); }
        G.param(pg, P0).setDefault(E.pulse * .44f); G.connect(saw, sg); G.connect(sg, mix); G.connect(pg, mix);
        // sub: -1 oct square, -2 oct square, -2 oct 25 % pulse
        const int sub = G.osc(E.subMode == 2 ? W_CHIP_25 : W_SQUARE, fr, t, end), ub = G.gain(E.sub * .45f);
        G.param(sub, P0).setDefault(440.f); setF(G.param(sub, P0), E.subMode == 0 ? .5f : .25f); G.connect(sub, ub); G.connect(ub, mix);
        if (E.noise > .01f) { const int n = G.noise(t, end, rng_.uni() * 1.5f), ng = G.gain(E.noise * .35f); G.connect(n, ng); G.connect(ng, mix); }
        if (E.vcoMod > .01f) { const int vg = G.gain(E.vcoMod * E.vcoMod * 700); G.connect(lfo, vg); for (int oo : {saw, ps, sub}) G.connectParam(vg, oo, P1); }
        // VCF: 24 dB, env, LFO mod, keyboard follow
        const int f1 = G.biquad(BQ_LP, 350, .55f), f2 = G.biquad(BQ_LP, 350, .6f + std::pow(E.res, 1.25f) * 19);
        const float kt = std::exp2((note - 60) / 12.f * E.kybd), base = std::min(18000.f, 22 * std::exp2(E.cut * 9.8f) * kt * (.6f + p.tone * .8f)), oc = E.env * 7 * (acc ? 1.25f : 1.f);
        const float peak = std::min(19000.f, base * std::exp2(oc)), sus = std::min(19000.f, base * std::exp2(oc * E.S));
        for (int f : {f1, f2}) { Param& pf = G.param(f, P0); pf.setValueAtTime(base, t); pf.linearRampToValueAtTime(peak, t + std::max(.003f, aA)); pf.setTargetAtTime(sus, t + aA, aD / 3); pf.setTargetAtTime(base, t + gate, aR / 3); }
        if (E.vcfMod > .01f) { const int fm = G.gain(E.vcfMod * E.vcfMod * base * 3); G.connect(lfo, fm); G.connectParam(fm, f1, P0); G.connectParam(fm, f2, P0); }
        // VCA: envelope or gate
        const int g = G.gain(1); const float lvl = v * (acc ? .66f : .54f) / (1 + E.res * .8f) * (.4f + E.vol * .9f);
        Param& pgg = G.param(g, P0); pgg.setValueAtTime(.0001f, t);
        if (E.vcaMode == 1) { pgg.linearRampToValueAtTime(lvl, t + .003); pgg.setValueAtTime(lvl, t + gate); pgg.linearRampToValueAtTime(.0001f, t + gate + .006); }
        else { pgg.linearRampToValueAtTime(lvl, t + std::max(.003f, aA)); pgg.setTargetAtTime(std::max(.0001f, lvl * E.S), t + aA, aD / 3); pgg.setTargetAtTime(.0001f, t + std::max(gate, aA), aR / 3); }
        G.connect(mix, f1); G.connect(f1, f2); G.connect(f2, g); G.toOut(g); G.finalize(end + .02);
        shLast_.has = true; shLast_.t = t; shLast_.f = fr; shLast_.gate = gate; shLast_.graph = gi; shLast_.gnode = g; shLast_.age = age_[gi];
        LV.kind = L_SH101; LV.nf = 2; LV.f[0] = (int16_t)f1; LV.f[1] = (int16_t)f2; LV.q = (int16_t)f2; LV.c0 = liveCents(LV); LV.q0 = liveQ(LV);
        break; }

    // ------------------------------------------------------------------ Minimoog Model D (miniVoice)
    case Eng::Mini: {
        const MiniP& E = EP.mini; const float gate = std::max(.04f, len * (.6f + p.decay * 3));
        const float fA = shT(E.fA, 6), fD = shT(E.fD, 10), aA = shT(E.aA, 6), aD = shT(E.aD, 10), fR = E.decSw ? fD : .012f, aR = E.decSw ? aD : .012f;
        const double end = t + gate + std::max(aR, fR) * 5 + .15;
        Last& last = mgLast_;
        const bool gl = E.glideOn && E.glide > .01f && last.has && t > last.t && t - last.t < 4; const float gt = .004f + E.glide * E.glide * 2;
        killLast(mgLast_, t, .006f);
        const float key = note + p.tune; const int mix = G.gain(1);
        auto oscF = [&](int r, float fine, bool track) -> float {
            if (!track) return r == 0 ? .12f * std::exp2((fine + 7) / 2) : hz(48 + 12 * (r - 3) + fine);
            return r == 0 ? hz(key) / 256 * std::exp2(fine / 12) : hz(key + 12 * (r - 3) + fine); };
        if (gl) last.f0r = hz(last.key) / hz(key);
        auto mk = [&](int r, int w, float fine, float lvl, int on, const WaveId* waves, bool track) -> int {
            const float f = oscF(r, fine, track); const int o = G.osc(waves[std::min(5, std::max(0, w))], f, t, end), g = G.gain(on ? lvl * lvl * .36f : 0);
            Param& pf = G.param(o, P0); pf.setDefault(440.f);
            if (track && gl) { pf.setValueAtTime(oscF(r, fine, true) * last.f0r, t); pf.exponentialRampToValueAtTime(f, t + gt); } else pf.setValueAtTime(f, t);
            if (track) glide(pf, f, t);
            G.param(o, P1).setDefault((rng_.uni() - .5f) * 4); G.connect(o, g); G.connect(g, mix); return o; };
        const int O1 = mk(E.o1r, E.o1w, 0, E.m1, E.m1on, MG_W12, true), O2 = mk(E.o2r, E.o2w, E.o2f, E.m2, E.m2on, MG_W12, true);
        const int O3 = mk(E.o3r, E.o3w, E.o3f, E.m3, E.m3on, MG_W3, !E.o3lfo);
        int nzOut = -1;
        if ((E.mnon && E.mn > .01f) || E.modmix > .01f) {
            const int nz = G.noise(t, end, rng_.uni() * 1.5f); nzOut = nz;
            if (E.ncol) { const int pk = G.biquad(BQ_LP, 1200, .4f); G.connect(nz, pk); nzOut = pk; }
            if (E.mnon && E.mn > .01f) { const int ng = G.gain(E.mn * E.mn * .3f); G.connect(nzOut, ng); G.connect(ng, mix); }
        }
        // overload: hot mixer levels drive the ladder like the original
        const float hot = (E.m1on ? E.m1 : 0) + (E.m2on ? E.m2 : 0) + (E.m3on ? E.m3 : 0);
        const int pre = G.gain(1 + std::max(0.f, hot - 1.4f) * 1.6f), sh = G.shaper(C_DRIVE, std::min(.9f, .1f + std::max(0.f, hot - 1.2f) * .35f), 1);
        const int fs[3] = {G.biquad(BQ_LP, 350, .5f), G.biquad(BQ_LP, 350, .5f), G.biquad(BQ_LP, 350, .6f + std::pow(E.emph, 1.3f) * 18)};
        const float ktAmt = (E.kt1 ? 1.f / 3 : 0) + (E.kt2 ? 2.f / 3 : 0);
        const float base = std::min(18000.f, 30 * std::exp2(E.cut * 9.6f) * std::exp2((note - 60) / 12.f * ktAmt) * (.6f + p.tone * .8f));
        const float oc = E.contour * 7, peak = std::min(19000.f, base * std::exp2(oc)), sus = std::min(19000.f, base * std::exp2(oc * E.fS));
        for (int f : fs) { Param& pf = G.param(f, P0); pf.setValueAtTime(base, t); pf.linearRampToValueAtTime(peak, t + std::max(.004f, fA)); pf.setTargetAtTime(sus, t + fA, fD / 3); pf.setTargetAtTime(base, t + gate, fR / 3); }
        // modulation mix: osc 3 <-> noise -> osc pitch and/or filter
        if (E.modAmt > .01f && (E.oscMod || E.filtMod)) {
            const int mm = G.gain(1), a3 = G.gain(1 - E.modmix), an = G.gain(E.modmix);
            G.connect(O3, a3); G.connect(a3, mm); if (nzOut >= 0) { G.connect(nzOut, an); G.connect(an, mm); }
            const float a = E.modAmt * E.modAmt;
            if (E.oscMod) { const int og = G.gain(a * 1200); G.connect(mm, og); G.connectParam(og, O1, P1); G.connectParam(og, O2, P1); if (!E.o3lfo) G.connectParam(og, O3, P1); }
            if (E.filtMod) { const int fg = G.gain(a * base * 3); G.connect(mm, fg); for (int f : fs) G.connectParam(fg, f, P0); }
        }
        const int g = G.gain(1); const float lvl = v * .3f * (.4f + E.vol * .9f) / (1 + E.emph * .5f);
        Param& pg = G.param(g, P0); pg.setValueAtTime(.0001f, t); pg.linearRampToValueAtTime(lvl, t + std::max(.003f, aA)); pg.setTargetAtTime(std::max(.0001f, lvl * E.aS), t + aA, aD / 3);
        pg.setTargetAtTime(.0001f, t + std::max(gate, aA), aR / 3);
        G.connect(mix, pre); G.connect(pre, sh); G.connect(sh, fs[0]); G.connect(fs[0], fs[1]); G.connect(fs[1], fs[2]); G.connect(fs[2], g); G.toOut(g);
        G.finalize(end + .02);
        last.has = true; last.t = t; last.key = key; last.graph = gi; last.gnode = g; last.age = age_[gi]; last.f0r = 1;
        LV.kind = L_MINI; LV.nf = 3; for (int k = 0; k < 3; ++k) LV.f[k] = (int16_t)fs[k]; LV.q = (int16_t)fs[2]; LV.c0 = liveCents(LV); LV.q0 = liveQ(LV);
        break; }
    }
}

} // namespace blonda
