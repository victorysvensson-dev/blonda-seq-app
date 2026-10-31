#pragma once
// BLONDA GLITCH — master glitch effects on the bus, tempo-synced.
// Hold a pad (stutter, roll, reverse, tape stop, half speed, crush, gate) or let "auto" throw random glitches
// on the steps. Real-time safe: the ring buffer is allocated in prepare(), process() never allocates.
#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdint>
#include <vector>

namespace blonda {

enum GlitchFx : int { GxNone = 0, GxStutter, GxRoll, GxReverse, GxStop, GxHalf, GxCrush, GxGate, GxCount };

class Glitch {
public:
    static constexpr int kRing = 1 << 17;   // ~2.7 s at 48 kHz

    void prepare(double sr) {
        sr_ = sr; L_.assign(kRing, 0.f); R_.assign(kRing, 0.f); xf_ = std::max(16, (int)(sr * .003));
        ev_ = Ev{}; next_ = Ev{}; held_ = 0;
    }
    void reset() { std::fill(L_.begin(), L_.end(), 0.f); std::fill(R_.begin(), R_.end(), 0.f); ev_ = Ev{}; next_ = Ev{}; held_ = 0; }

    // a glitch that starts at frame `start` and lasts `len` frames; `slice` = the repeated piece (stutter/roll/gate)
    void queue(int fx, long long start, long long len, int slice) {
        if (fx <= GxNone || fx >= GxCount || len <= 0) return;
        next_ = Ev{fx, start, start + len, std::max(32, std::min(slice, kRing / 2))};
    }
    // hold (pads): fx > 0 starts now and lasts until hold(0)
    void hold(int fx, long long now, int slice) {
        if (fx > GxNone && fx < GxCount) { held_ = fx; ev_ = Ev{fx, now, (long long)1 << 62, std::max(32, std::min(slice, kRing / 2))}; ev_.pos = 0; ev_.cur = ev_.slice; next_ = Ev{}; }
        else if (held_) { held_ = 0; if (ev_.fx) ev_.end = std::max(ev_.start + 1, now + xf_); }
    }
    bool busy(long long f) const { return (ev_.fx && f < ev_.end) || (next_.fx != 0); }
    int active() const { return shown_.load(std::memory_order_relaxed); }

    void process(float* L, float* R, int n, long long b0) {
        int show = 0;
        for (int x = 0; x < n; ++x) {
            const long long f = b0 + x;
            const int wi = (int)(f & (kRing - 1));
            const float inL = L[x], inR = R[x];
            L_[wi] = inL; R_[wi] = inR;
            if (next_.fx && f >= next_.start && (!ev_.fx || f >= ev_.end)) { ev_ = next_; ev_.pos = 0; ev_.cur = ev_.slice; next_ = Ev{}; }
            if (!ev_.fx) continue;
            if (f >= ev_.end) { ev_ = Ev{}; continue; }
            if (f < ev_.start) continue;
            const long long d = f - ev_.start;
            float wL = inL, wR = inR;
            switch (ev_.fx) {
                case GxStutter: { const long long p = ev_.start - ev_.slice + d % ev_.slice; read(p, wL, wR); break; }
                case GxRoll: {   // repeats get shorter: slice, slice/2, slice/4 … (a build-up roll)
                    const long long p = ev_.start - ev_.cur + ev_.pos; read(p, wL, wR);
                    if (++ev_.pos >= ev_.cur) { ev_.pos = 0; if (++ev_.reps >= 2) { ev_.reps = 0; ev_.cur = std::max<long long>(ev_.slice / 8, ev_.cur / 2); } }
                    break;
                }
                case GxReverse: readFrac((double)ev_.start - 1 - (double)d, wL, wR); break;
                case GxStop: {   // tape stop: speed falls from 1 to 0 over the glitch
                    const double len = held_ ? sr_ * .9 : (double)std::max<long long>(1, ev_.end - ev_.start);
                    const double u = std::min(1.0, d / len); ev_.rpos += std::max(0.0, 1.0 - u);
                    readFrac((double)ev_.start + ev_.rpos - 1, wL, wR);   // falls behind the write head as it slows
                    if (u >= 1) { wL = wR = 0; }
                    break;
                }
                case GxHalf: readFrac((double)ev_.start - ev_.slice + std::fmod(d * .5, (double)ev_.slice * 2), wL, wR); break;
                case GxCrush: {
                    if (ev_.pos-- <= 0) { ev_.pos = 7; ev_.hL = std::round(inL * 12.f) / 12.f; ev_.hR = std::round(inR * 12.f) / 12.f; }
                    wL = ev_.hL; wR = ev_.hR; break;
                }
                case GxGate: { const int half = std::max(16, ev_.slice / 2); if ((d / half) % 2) { wL = wR = 0; } break; }
                default: break;
            }
            // 3 ms crossfade in and out so nothing clicks
            const float e = (float)std::min<long long>(std::min<long long>(d, ev_.end - f), xf_) / (float)xf_;
            L[x] = inL + (wL - inL) * e; R[x] = inR + (wR - inR) * e;
            show = ev_.fx;
        }
        shown_.store(show ? show : (ev_.fx && b0 + n >= ev_.start ? ev_.fx : 0), std::memory_order_relaxed);
    }

private:
    struct Ev { int fx = 0; long long start = 0, end = 0; int slice = 0; long long pos = 0, cur = 0; int reps = 0; double rpos = 0; float hL = 0, hR = 0; };
    void read(long long p, float& l, float& r) const { const int i = (int)(p & (kRing - 1)); l = L_[i]; r = R_[i]; }
    void readFrac(double p, float& l, float& r) const {
        const double fl = std::floor(p); const float fr = (float)(p - fl); const long long i0 = (long long)fl;
        float l0, r0, l1, r1; read(i0, l0, r0); read(i0 + 1, l1, r1); l = l0 + (l1 - l0) * fr; r = r0 + (r1 - r0) * fr;
    }
    double sr_ = 48000; int xf_ = 144;
    std::vector<float> L_, R_;
    Ev ev_, next_; int held_ = 0;
    std::atomic<int> shown_{0};
};

}  // namespace blonda
