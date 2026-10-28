#include "blonda/drums.hpp"
#include <cstring>

namespace blonda {

namespace {
enum Kit { KBlonda, K808, K909, KThump, KDist, KRim, KLofi, KSnap, KStack, KShaker, KTick, KConga, KCowbell, KClave, KTom };
int kitFromName(const char* s) {
    static const char* names[] = {"", "808", "909", "thump", "dist", "rim", "lofi", "snap", "stack", "shaker", "tick", "conga", "cowbell", "clave", "tom"};
    for (int i = 0; i < 15; ++i) if (!std::strcmp(s ? s : "", names[i])) return i;
    return KBlonda;
}
}

void DrumTrack::prepare(float sampleRate, DrumKind kind) { WebWaves::get(); sr_ = sampleRate; kind_ = kind; rng_.seed(0xD5u + (uint32_t)kind * 7919u); for (auto& v : voices_) v.active = false; }
void DrumTrack::setKit(const char* kit) { kit_ = kitFromName(kit); }

void DrumTrack::trigger(float velocity, int offset) { if (pendingN_ < (int)pending_.size()) pending_[pendingN_++] = {offset, velocity}; }
void DrumTrack::choke(int offset) { chokeAt_ = offset; }

DrumTrack::Chain& DrumTrack::chain(Voice& v) { Chain& c = v.ch[v.nch++]; c.nsrc = 0; c.nst = 0; c.gain.reset(1.f); c.end = 0; return c; }

DrumTrack::Source& DrumTrack::osc(Chain& c, OscType type, float f, double stop, int entry) {
    if (c.nsrc >= (int)c.src.size()) c.nsrc = (int)c.src.size() - 1;
    Source& s = c.src[c.nsrc++]; s.type = type; s.freq.reset(f); s.freq.setValueAtTime(f, 0.0); s.gain = 1.f; s.entry = entry; s.phase = 0.f; s.stop = stop;
    if (stop > c.end) c.end = stop;
    return s;
}
DrumTrack::Source& DrumTrack::noise(Chain& c, double dur, int entry, float gain) {
    if (c.nsrc >= (int)c.src.size()) c.nsrc = (int)c.src.size() - 1;
    Source& s = c.src[c.nsrc++]; s.type = NoiseSrc; s.gain = gain; s.entry = entry; s.stop = dur + 0.05; s.nz.seed(rng_.s ^ (++age_ * 2654435761u)); rng_.next();
    if (s.stop > c.end) c.end = s.stop;
    return s;
}
// Web Audio biquad: LP/HP take Q in dB, BP takes linear Q (constant 0 dB peak).
void DrumTrack::bq(Chain& c, StageType type, float f, float q) {
    if (c.nst >= (int)c.st.size()) return;
    Stage& s = c.st[c.nst++]; s = Stage{}; s.type = type;
    const float w = kTwoPi * clampf(f, 10.f, sr_ * 0.4999f) / sr_, cs = std::cos(w), sn = std::sin(w);
    float b0, b1, b2, a0, a1, a2;
    if (type == BP) { const float al = sn / (2.f * q); b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else { const float al = sn / (2.f * std::pow(10.f, q / 20.f)); a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
           if (type == LP) { b0 = (1 - cs) * 0.5f; b1 = 1 - cs; b2 = b0; } else { b0 = (1 + cs) * 0.5f; b1 = -(1 + cs); b2 = b0; } }
    s.a = b0 / a0; s.b = b1 / a0; s.c = b2 / a0; s.d = a1 / a0; s.e = a2 / a0;
}
// distCurve(a): asymmetric tanh, positive side gain g, negative 0.75 g; the web runs it with oversample '2x'.
void DrumTrack::shp(Chain& c, float amount) {
    if (c.nst >= (int)c.st.size()) return;
    Stage& s = c.st[c.nst++]; s = Stage{}; s.type = Shape;
    const int k = (int)std::lround(amount * 20.f); const float g = 1.f + k / 20.f * 38.f, gn = g * 0.75f;
    s.k = g; s.kn = 1.f / std::tanh(g); s.nk = gn; s.nkn = 1.f / std::tanh(gn);
}
void DrumTrack::env(WebParam& g, double t, float a, float peak, float dec) {
    g.setValueAtTime(0.0001f, t); g.linearRampToValueAtTime(peak, t + a); g.exponentialRampToValueAtTime(0.0001f, t + a + dec);
}

void DrumTrack::build(Voice& v, float vel) {
    const DrumParams& p = params; const float tr = std::exp2(p.tune / 12.f), V = vel;
    v.nch = 0; v.open = kind_ == DrumKind::OpenHat;
    const bool open = v.open;
    switch (kind_) {
    case DrumKind::Kick:
        if (kit_ == K808) { const float d = .45f + p.decay * 1.5f; Chain& c = chain(v); auto& o = osc(c, Sine, 125 * tr, d + .1);
            o.freq.exponentialRampToValueAtTime(52 * tr, .07); o.freq.exponentialRampToValueAtTime(44 * tr, d); env(c.gain, 0, .003f, V * 1.05f, d); shp(c, .08f + p.tone * .25f); }
        else if (kit_ == K909) { const float d = .16f + p.decay * .55f; Chain& c = chain(v); auto& o = osc(c, Tri, 260 * tr, d + .1);
            o.freq.exponentialRampToValueAtTime(58 * tr, .035); o.freq.exponentialRampToValueAtTime(48 * tr, d); env(c.gain, 0, .001f, V, d); shp(c, .3f); bq(c, LP, 2400 + p.tone * 5000, 1);
            Chain& n = chain(v); noise(n, .03); env(n.gain, 0, .001f, V * (.25f + p.tone * .4f), .018f); bq(n, BP, 4200, .8f); }
        else if (kit_ == KThump) { const float d = .1f + p.decay * .32f; Chain& c = chain(v); auto& o = osc(c, Sine, 150 * tr, d + .1);
            o.freq.exponentialRampToValueAtTime(62 * tr, .022); env(c.gain, 0, .001f, V * 1.1f, d); bq(c, LP, 700 + p.tone * 1200, 1);
            Chain& s = chain(v); osc(s, Sine, 48 * tr, d + .15); env(s.gain, 0, .004f, V * .5f, d * 1.4f); }
        else if (kit_ == KDist) { const float d = .3f + p.decay * 1.1f; Chain& c = chain(v); auto& o = osc(c, Sine, 140 * tr, d + .1);
            o.freq.exponentialRampToValueAtTime(50 * tr, .05); o.freq.exponentialRampToValueAtTime(41 * tr, d); env(c.gain, 0, .001f, V * .55f, d); shp(c, .55f + p.tone * .4f); bq(c, LP, 1800 + p.tone * 3000, .9f); }
        else { const float d = .18f + p.decay * .7f; Chain& c = chain(v); auto& o = osc(c, Sine, 165 * tr, d + .05);
            o.freq.exponentialRampToValueAtTime(48 * tr, .045 + p.tone * .05); o.freq.exponentialRampToValueAtTime(38 * tr, d); env(c.gain, 0, .002f, V, d);
            Chain& n = chain(v); noise(n, .02); bq(n, HP, 2500, 1); env(n.gain, 0, .001f, V * .25f * p.tone + .05f, .012f); }
        break;
    case DrumKind::Snare:
        if (kit_ == K808) { const float d = .1f + p.decay * .35f;
            for (auto fa : {std::pair<float, float>{180, .5f}, {330, .35f}}) { Chain& c = chain(v); osc(c, Tri, fa.first * tr, .25); env(c.gain, 0, .001f, V * fa.second, .09f + p.decay * .08f); }
            Chain& n = chain(v); noise(n, d); env(n.gain, 0, .001f, V * .6f, d); bq(n, HP, 1600 + p.tone * 2500, 1); bq(n, LP, 9000, 1); }
        else if (kit_ == K909) { const float d = .14f + p.decay * .4f; Chain& c = chain(v); auto& o = osc(c, Tri, 210 * tr, .15); o.freq.exponentialRampToValueAtTime(160 * tr, .04); env(c.gain, 0, .001f, V * .6f, .07f);
            Chain& n = chain(v); noise(n, d); env(n.gain, 0, .001f, V * .85f, d); bq(n, HP, 600 + p.tone * 1200, 1); bq(n, LP, 7000 + p.tone * 5000, 1); }
        else if (kit_ == KRim) { const float d = .025f + p.decay * .05f; Chain& c = chain(v); osc(c, Square, 1650 * tr, .1); env(c.gain, 0, .0005f, V * 1.1f, d); bq(c, BP, 1650 * tr, 6);
            Chain& c2 = chain(v); osc(c2, Tri, 480 * tr, .08); env(c2.gain, 0, .0005f, V * .9f, .02f + p.tone * .03f); }
        else if (kit_ == KLofi) { const float d = .12f + p.decay * .35f; Chain& n = chain(v); noise(n, d); env(n.gain, 0, .002f, V * .7f, d); bq(n, BP, (1100 + p.tone * 1500) * tr, 1.1f); shp(n, .6f); bq(n, LP, 4500, 1);
            Chain& c = chain(v); osc(c, Sine, 190 * tr, .2); env(c.gain, 0, .002f, V * .5f, .08f); shp(c, .4f); }
        else { const float d = .09f + p.decay * .3f; Chain& c = chain(v); auto& o = osc(c, Tri, 240 * tr, .2); o.freq.exponentialRampToValueAtTime(170 * tr, .05); env(c.gain, 0, .001f, V * .55f, .1f);
            Chain& n = chain(v); noise(n, d); bq(n, HP, 900 + p.tone * 3500, 1); env(n.gain, 0, .001f, V * .7f, d); }
        break;
    case DrumKind::Clap:
        if (kit_ == K808) { const float d = .25f + p.decay * .8f; Chain& n = chain(v); noise(n, d + .06); n.gain.setValueAtTime(.0001f, 0);
            for (float o : {0.f, .01f, .02f, .031f}) { n.gain.setValueAtTime(V * .85f, o); n.gain.exponentialRampToValueAtTime(V * .12f, o + .008); }
            n.gain.setValueAtTime(V * .55f, .04); n.gain.exponentialRampToValueAtTime(.0001f, .04 + d); bq(n, BP, (1000 + p.tone * 900) * tr, 1.2f); bq(n, HP, 600, 1); }
        else if (kit_ == KSnap) { const float d = .04f + p.decay * .12f; Chain& n = chain(v); noise(n, d); env(n.gain, 0, .0008f, V * .9f, d); bq(n, BP, (2400 + p.tone * 2400) * tr, 3.5f);
            Chain& c = chain(v); osc(c, Sine, 1800 * tr, .05); env(c.gain, 0, .0005f, V * .25f, .012f); }
        else if (kit_ == KStack) { const float d = .12f + p.decay * .45f; Chain& n = chain(v); noise(n, d + .08); n.gain.setValueAtTime(.0001f, 0);
            const float os[6] = {0, .007f, .015f, .024f, .034f, .045f};
            for (int k = 0; k < 6; ++k) { n.gain.setValueAtTime(V * (.95f - k * .06f), os[k]); n.gain.exponentialRampToValueAtTime(V * .1f, os[k] + .006); }
            n.gain.setValueAtTime(V * .75f, .052); n.gain.exponentialRampToValueAtTime(.0001f, .052 + d); bq(n, BP, (800 + p.tone * 1600) * tr, .9f); }
        else { const float d = .1f + p.decay * .4f; Chain& n = chain(v); noise(n, d + .04); bq(n, BP, (900 + p.tone * 1400) * tr, 1.6f);
            n.gain.setValueAtTime(.0001f, 0);
            for (float o : {0.f, .011f, .022f}) { n.gain.setValueAtTime(V * .9f, o); n.gain.exponentialRampToValueAtTime(V * .15f, o + .009); }
            n.gain.setValueAtTime(V * .8f, .031); n.gain.exponentialRampToValueAtTime(.0001f, .031 + d); }
        break;
    case DrumKind::Hat: case DrumKind::OpenHat:
        if (kit_ == K909) { const float d = open ? .15f + p.decay * .7f : .03f + p.decay * .08f; Chain& n = chain(v); noise(n, d); env(n.gain, 0, .0008f, V * .55f, d);
            bq(n, BP, 10500 * tr, 1.1f); bq(n, HP, 7000 + p.tone * 3000, 1); }
        else if (kit_ == KShaker) { const float d = open ? .12f + p.decay * .4f : .05f + p.decay * .08f; Chain& n = chain(v); noise(n, d + .02);
            n.gain.setValueAtTime(.0001f, 0); n.gain.linearRampToValueAtTime(V * .95f, .014); n.gain.exponentialRampToValueAtTime(.0001f, .014 + d); bq(n, BP, (5200 + p.tone * 3000) * tr, 2.2f); }
        else if (kit_ == KTick) { const float d = open ? .08f + p.decay * .3f : .008f + p.decay * .03f; Chain& c = chain(v); osc(c, Sine, 8800 * tr, d + .05); env(c.gain, 0, .0004f, V * .32f, d);
            Chain& n = chain(v); noise(n, d); env(n.gain, 0, .0004f, V * .3f, d); bq(n, HP, 9000 + p.tone * 3000, 1); }
        else { const float d = open ? .12f + p.decay * .6f : .025f + p.decay * .09f; Chain& c = chain(v);
            for (float r : {2.f, 3.f, 4.16f, 5.43f, 6.79f, 8.21f}) osc(c, Square, 160 * r * tr, d + .05, 0);
            noise(c, d, 1, .5f); bq(c, BP, 9000 * tr, .8f); bq(c, HP, 6000 + p.tone * 3000, 1); env(c.gain, 0, .001f, V * .5f, d); }
        break;
    case DrumKind::Perc:
        if (kit_ == KConga) { const float d = .16f + p.decay * .35f; Chain& c = chain(v); auto& o = osc(c, Sine, 390 * tr, d + .05); o.freq.exponentialRampToValueAtTime(320 * tr, .03); env(c.gain, 0, .001f, V * .85f, d);
            Chain& n = chain(v); noise(n, .02); env(n.gain, 0, .001f, V * (.15f + p.tone * .4f), .015f); bq(n, BP, 2600, 2); }
        else if (kit_ == KCowbell) { const float d = .18f + p.decay * .5f; Chain& c = chain(v); osc(c, Square, 545 * tr, d + .1); osc(c, Square, 815 * tr, d + .1); bq(c, BP, (820 + p.tone * 500) * tr, 1.3f);
            c.gain.setValueAtTime(.0001f, 0); c.gain.linearRampToValueAtTime(V * .5f, .001); c.gain.exponentialRampToValueAtTime(V * .18f, .04); c.gain.exponentialRampToValueAtTime(.0001f, d); }
        else if (kit_ == KClave) { const float d = .03f + p.decay * .08f; Chain& c = chain(v); osc(c, Sine, 2450 * tr, d + .05); env(c.gain, 0, .0004f, V * 1.15f, d); bq(c, BP, 2450 * tr, 4 + p.tone * 6); }
        else if (kit_ == KTom) { const float d = .22f + p.decay * .6f; Chain& c = chain(v); auto& o = osc(c, Sine, 170 * tr, d + .05); o.freq.exponentialRampToValueAtTime(95 * tr, d); env(c.gain, 0, .002f, V * .95f, d); shp(c, .08f + p.tone * .3f);
            Chain& n = chain(v); noise(n, .03); env(n.gain, 0, .001f, V * .18f * p.tone, .02f); bq(n, BP, 1200, 1); }
        else { const float d = .06f + p.decay * .4f; Chain& c = chain(v); auto& o = osc(c, Sine, 420 * tr, d + .05); o.freq.exponentialRampToValueAtTime(260 * tr, d); env(c.gain, 0, .001f, V * .8f, d);
            Chain& n = chain(v); noise(n, .03); bq(n, BP, 1800 * tr, 3); env(n.gain, 0, .001f, V * p.tone * .9f, .03f); }
        break;
    }
    double end = 0; for (int i = 0; i < v.nch; ++i) end = std::max(end, v.ch[i].end); v.end = end + 0.01;
}

float DrumTrack::renderStage(Stage& s, float x) {
    if (s.type != Shape) { const float y = s.a * x + s.z1; s.z1 = s.b * x - s.d * y + s.z2; s.z2 = s.c * x - s.e * y; return y; }
    // 2x oversampled drive: linear-interpolated midpoint + current sample, half-band decimated
    auto f = [&](float u) { u = clampf(u, -1.f, 1.f); return u >= 0 ? std::tanh(s.k * u) * s.kn : std::tanh(s.nk * u) * s.nkn; };
    const float mid = 0.5f * (s.up + x); s.up = x;
    const float y = s.dec ? s.dec->process(f(mid), f(x)) : f(x);
    if (!s.lat) return y;
    const float o = s.lat[s.li]; s.lat[s.li] = y; s.li = s.li + 1 >= 112 ? 0 : s.li + 1; return o;   // 128 frames total incl. the decimator's 16
}

void DrumTrack::process(float* out, int frames) {
    static const WebWaves& WW = WebWaves::get();
    const double dt = 1.0 / sr_;
    for (int i = 0; i < frames; ++i) {
        if (chokeAt_ == i) {   // closed hat chokes the ringing open hat
            for (auto& v : voices_) if (v.active && v.open) for (int c = 0; c < v.nch; ++c) { v.ch[c].gain.cancelAndHold(v.t); v.ch[c].gain.setTargetAtTime(0.0001f, v.t, 0.008f); v.end = std::min(v.end, v.t + 0.1); }
            chokeAt_ = -1;
        }
        for (int k = 0; k < pendingN_; ++k) if (pending_[k].off == i) {
            int slot = -1; uint32_t oa = UINT32_MAX;
            for (int j = 0; j < (int)voices_.size(); ++j) { if (!voices_[j].active) { slot = j; break; } if (voices_[j].age < oa) { oa = voices_[j].age; slot = j; } }
            Voice& v = voices_[slot]; v = Voice{}; v.active = true; v.age = ++age_; v.t = 0;
            build(v, pending_[k].vel);
            for (int c = 0; c < v.nch; ++c) for (int s = 0; s < v.ch[c].nst; ++s) if (v.ch[c].st[s].type == Shape) { auto* d = &decs_[(slot * 3 + c) * 3 + s]; d->reset(); v.ch[c].st[s].dec = d; auto& L = lats_[(slot * 3 + c) * 3 + s]; L.fill(0.f); v.ch[c].st[s].lat = L.data(); v.ch[c].st[s].li = 0; }
            if (kind_ == DrumKind::Hat && chokeTarget) chokeTarget->choke(i);
        }
        float sum = 0.f;
        for (auto& v : voices_) {
            if (!v.active) continue;
            const double t = v.t;
            for (int c = 0; c < v.nch; ++c) {
                Chain& ch = v.ch[c]; float x = 0.f; float add[4] = {0, 0, 0, 0};
                for (int s = 0; s < ch.nsrc; ++s) {
                    Source& sr = ch.src[s]; if (t >= sr.stop) continue; float y;
                    if (sr.type == NoiseSrc) y = sr.nz.next();
                    else {
                        const float f = sr.freq.valueAt(t), inc = std::min(0.45f, f / sr_), ph = sr.phase;
                        switch (sr.type) {
                            case Sine: y = std::sin(kTwoPi * ph); break;
                            case Tri: y = WW.read(WebWaves::Tri, ph, inc); break;
                            case Square: y = WW.read(WebWaves::Square, ph, inc); break;
                            default: y = WW.read(WebWaves::Saw, ph, inc); break;
                        }
                        sr.phase += inc; if (sr.phase >= 1.f) sr.phase -= 1.f;
                    }
                    add[std::min(3, sr.entry)] += y * sr.gain;
                }
                x = add[0];
                for (int s = 0; s < ch.nst; ++s) { x = renderStage(ch.st[s], x); x += add[std::min(3, s + 1)]; }
                sum += x * ch.gain.valueAt(t);
            }
            v.t += dt; if (v.t >= v.end) v.active = false;
        }
        out[i] += sum;
    }
    pendingN_ = 0;
}

} // namespace blonda
