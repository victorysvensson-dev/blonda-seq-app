// BLONDA SEQ — DSP building blocks.
// Real-time safe: no allocation, no locks, no exceptions inside process().
#pragma once
#include <cmath>
#include <cstdint>
#include <algorithm>
#include <array>

namespace blonda {

constexpr float kPi = 3.14159265358979323846f;
constexpr float kTwoPi = 6.28318530717958647692f;

inline float clampf(float v, float lo, float hi) { return v < lo ? lo : (v > hi ? hi : v); }
inline float mtof(float note) { return 440.0f * std::exp2((note - 69.0f) / 12.0f); }
inline float centsToRatio(float c) { return std::exp2(c / 1200.0f); }

// Fast, good-quality white noise (xorshift32), deterministic per seed.
struct Noise {
    uint32_t s = 0x9E3779B9u;
    void seed(uint32_t v) { s = v ? v : 0x9E3779B9u; }
    inline float next() { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (float)(int32_t)s * (1.0f / 2147483648.0f); }
    inline float uni() { return next() * 0.5f + 0.5f; }
};

// PolyBLEP residual for band-limited discontinuities. t = phase in [0,1), dt = phase increment.
inline float polyBlep(float t, float dt) {
    if (t < dt) { t /= dt; return t + t - t * t - 1.0f; }
    if (t > 1.0f - dt) { t = (t - 1.0f) / dt; return t * t + t + t + 1.0f; }
    return 0.0f;
}

// Band-limited oscillator: saw, variable-width pulse and square (sub). Phase in [0,1).
struct BlepOsc {
    float phase = 0.0f;
    inline float saw(float dt) {
        float v = 2.0f * phase - 1.0f - polyBlep(phase, dt);
        advance(dt);
        return v;
    }
    // width in (0,1). Output DC-free like a Fourier-built pulse: mean removed.
    inline float pulse(float dt, float width) {
        float v = phase < width ? 1.0f : -1.0f;
        v += polyBlep(phase, dt);
        float t2 = phase - width; if (t2 < 0.0f) t2 += 1.0f;
        v -= polyBlep(t2, dt);
        advance(dt);
        return v - (2.0f * width - 1.0f);
    }
    inline void advance(float dt) { phase += dt; if (phase >= 1.0f) phase -= 1.0f; }
};

// Pulse wavetables that match the web version's createPeriodicWave(48 coefficients): 47 cosine harmonics,
// peak-normalised, width quantised to 1/40 like brPulse(). Mip levels keep every level below Nyquist.
struct PulseTables {
    static constexpr int kSize = 1024, kWidths = 41, kLevels = 12;
    static constexpr int kH[kLevels] = {47, 40, 32, 24, 16, 12, 8, 6, 4, 3, 2, 1};
    float t[kWidths][kLevels][kSize + 1];
    void build() {
        static float cs[kSize]; for (int i = 0; i < kSize; ++i) cs[i] = std::cos(kTwoPi * i / kSize);
        for (int k = 0; k < kWidths; ++k) {
            const double d = k / 40.0; float coef[48] = {0};
            for (int n = 1; n < 48; ++n) coef[n] = (float)(2.0 / (n * M_PI) * std::sin(n * M_PI * d));
            float norm = 0;
            for (int L = 0; L < kLevels; ++L) {
                for (int i = 0; i < kSize; ++i) { float acc = 0; for (int n = 1; n <= kH[L]; ++n) acc += coef[n] * cs[(n * i) & (kSize - 1)]; t[k][L][i] = acc; }
                if (L == 0) { for (int i = 0; i < kSize; ++i) norm = std::max(norm, std::fabs(t[k][0][i])); norm = norm > 1e-9f ? 1.f / norm : 0.f; }
            }
            for (int L = 0; L < kLevels; ++L) { for (int i = 0; i < kSize; ++i) t[k][L][i] *= norm; t[k][L][kSize] = t[k][L][0]; }
        }
    }
    static const PulseTables& get() { static PulseTables* p = [] { auto* x = new PulseTables(); x->build(); return x; }(); return *p; }
    // phase in [0,1), dt = f/sr (for mip selection), width 0..1
    inline float read(float phase, float dt, float width) const {
        const int k = (int)std::lround(clampf(width, 0.f, 1.f) * 40.f);
        const float maxH = 0.5f / std::max(dt, 1e-6f);
        int L = 0; while (L < kLevels - 1 && (float)kH[L] > maxH) ++L;
        const float x = phase * kSize; const int i = (int)x; const float f = x - (float)i;
        const float* tb = t[k][L]; return tb[i] + (tb[i + 1] - tb[i]) * f;
    }
};

// Band-limited wavetables that behave like Web Audio's built-in OscillatorNode types (Chrome): Fourier series,
// peak-normalised, partials culled per 1/3-octave range so nothing folds over Nyquist.
struct WebWaves {
    enum Type { Square = 0, Saw = 1, Tri = 2 };
    static constexpr int kSize = 4096, kLevels = 34;
    float t[3][kLevels][kSize + 1];
    int partials[kLevels];
    void build() {
        static float sn[kSize]; for (int i = 0; i < kSize; ++i) sn[i] = std::sin(kTwoPi * i / kSize);
        for (int l = 0; l < kLevels; ++l) partials[l] = std::max(1, (int)(2048.0 / std::pow(2.0, l / 3.0)));
        for (int ty = 0; ty < 3; ++ty) {
            float norm = 0;
            for (int l = 0; l < kLevels; ++l) {
                float* tb = t[ty][l]; for (int i = 0; i < kSize; ++i) tb[i] = 0;
                for (int n = 1; n <= partials[l]; ++n) {
                    float b;
                    if (ty == Square) b = (n & 1) ? 4.f / (n * kPi) : 0.f;
                    else if (ty == Saw) b = ((n & 1) ? 2.f : -2.f) / (n * kPi);
                    else b = (n & 1) ? 8.f / (kPi * kPi * n * n) * (((n - 1) / 2) & 1 ? -1.f : 1.f) : 0.f;
                    if (b == 0.f) continue;
                    for (int i = 0; i < kSize; ++i) tb[i] += b * sn[(int)(((long long)n * i) & (kSize - 1))];
                }
                if (l == 0) { for (int i = 0; i < kSize; ++i) norm = std::max(norm, std::fabs(tb[i])); norm = 1.f / norm; }
            }
            if (ty == Saw) norm *= 0.842f / 0.918f;   // measured: Chrome's built-in sawtooth sits at +/-0.842
            for (int l = 0; l < kLevels; ++l) { for (int i = 0; i < kSize; ++i) t[ty][l][i] *= norm; t[ty][l][kSize] = t[ty][l][0]; }
        }
    }
    static const WebWaves& get() { static WebWaves* w = [] { auto* x = new WebWaves(); x->build(); return x; }(); return *w; }
    inline float read(int type, float phase, float inc) const {
        const float maxP = 0.5f / std::max(inc, 1e-7f); int l = 0;
        while (l < kLevels - 1 && (float)partials[l] * 1.26f > maxP) ++l;   // whole 1/3-octave range must stay below Nyquist
        const float x = phase * kSize; const int i = (int)x; const float f = x - (float)i; const float* tb = t[type][l];
        return tb[i] + (tb[i + 1] - tb[i]) * f;
    }
};

// Zero-delay-feedback state-variable filter (Simper / Zavalishin TPT). Low-pass output.
// Linear response equals the RBJ/Web-Audio biquad, but it stays smooth and stable under fast modulation.
struct SvfLP {
    float ic1 = 0.0f, ic2 = 0.0f;
    float g = 0.0f, k = 1.0f, a1 = 0.0f, a2 = 0.0f, a3 = 0.0f;
    void reset() { ic1 = ic2 = 0.0f; }
    inline void set(float fc, float q, float sr) {
        fc = clampf(fc, 10.0f, sr * 0.49f);
        g = std::tan(kPi * fc / sr);
        k = 1.0f / q;
        a1 = 1.0f / (1.0f + g * (g + k));
        a2 = g * a1;
        a3 = g * a2;
    }
    inline float process(float v0) {
        float v3 = v0 - ic2;
        float v1 = a1 * ic1 + a2 * v3;
        float v2 = ic2 + a2 * ic1 + a3 * v3;
        ic1 = 2.0f * v1 - ic1;
        ic2 = 2.0f * v2 - ic2;
        return v2;
    }
};

// One-pole RBJ-style biquad, used for fixed tone filters in effects (Direct Form II transposed).
struct Biquad {
    float b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0, z1 = 0, z2 = 0;
    void reset() { z1 = z2 = 0; }
    void lowpass(float fc, float q, float sr) { design(fc, q, sr, true); }
    void highpass(float fc, float q, float sr) { design(fc, q, sr, false); }
    inline float process(float x) { float y = b0 * x + z1; z1 = b1 * x - a1 * y + z2; z2 = b2 * x - a2 * y; return y; }
private:
    void design(float fc, float q, float sr, bool lp) {
        float w = kTwoPi * clampf(fc, 10.0f, sr * 0.49f) / sr, cs = std::cos(w), al = std::sin(w) / (2.0f * q), a0 = 1.0f + al;
        if (lp) { b0 = (1 - cs) * 0.5f / a0; b1 = (1 - cs) / a0; b2 = b0; }
        else { b0 = (1 + cs) * 0.5f / a0; b1 = -(1 + cs) / a0; b2 = b0; }
        a1 = -2.0f * cs / a0; a2 = (1 - al) / a0;
    }
};

// Exponential approach toward a target, identical to Web Audio setTargetAtTime (time constant tau).
struct Smoother {
    float v = 0.0f, target = 0.0f, coef = 0.0f;
    void setTau(float tau, float sr) { coef = tau <= 0.0f ? 0.0f : std::exp(-1.0f / (tau * sr)); }
    inline float next() { v = target + (v - target) * coef; return v; }
    void snap(float x) { v = target = x; }
};

// Fractional delay line with cubic (Hermite) interpolation. Size must be a power of two.
template <int N>
struct DelayLine {
    static_assert((N & (N - 1)) == 0, "power of two");
    std::array<float, N> buf{};
    int w = 0;
    void reset() { buf.fill(0.0f); w = 0; }
    inline void push(float x) { buf[w] = x; w = (w + 1) & (N - 1); }
    // d = delay in samples (>= 1)
    inline float read(float d) const {
        float rp = (float)w - d;
        while (rp < 0) rp += (float)N;
        int i1 = (int)rp; float f = rp - (float)i1;
        int i0 = (i1 - 1) & (N - 1), i2 = (i1 + 1) & (N - 1), i3 = (i1 + 2) & (N - 1);
        i1 &= (N - 1);
        float y0 = buf[i0], y1 = buf[i1], y2 = buf[i2], y3 = buf[i3];
        float c1 = 0.5f * (y2 - y0), c2 = y0 - 2.5f * y1 + 2.0f * y2 - 0.5f * y3, c3 = 0.5f * (y3 - y0) + 1.5f * (y1 - y2);
        return ((c3 * f + c2) * f + c1) * f + y1;
    }
};

// 2x decimator: symmetric half-band FIR (Kaiser-windowed sinc), ~-96 dB stopband above 0.27*fs_os.
struct HalfbandDecimator {
    static constexpr int kTaps = 63;
    std::array<float, kTaps> h{};
    std::array<float, kTaps * 2> hist{};
    int pos = 0;
    HalfbandDecimator() {
        const int M = kTaps - 1; const double beta = 9.0;
        auto i0 = [](double x) { double s = 1, t = 1; for (int k = 1; k < 30; ++k) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; };
        double sum = 0;
        for (int n = 0; n < kTaps; ++n) {
            double m = n - M / 2.0, fc = 0.5 * 0.5; // cutoff at half of the output Nyquist band edge
            double sinc = m == 0 ? 2 * fc : std::sin(2 * M_PI * fc * m) / (M_PI * m);
            double r = 2.0 * n / M - 1.0, w = i0(beta * std::sqrt(std::max(0.0, 1 - r * r))) / i0(beta);
            h[n] = (float)(sinc * w); sum += h[n];
        }
        for (auto& c : h) c = (float)(c / sum);
    }
    void reset() { hist.fill(0.0f); pos = 0; }
    // Takes two oversampled samples, returns one output sample.
    inline float process(float a, float b) {
        push(a); push(b);
        float acc = 0.0f; const float* x = &hist[pos];
        for (int n = 0; n < kTaps; ++n) acc += h[n] * x[n];
        return acc;
    }
private:
    inline void push(float s) { pos = (pos == 0) ? kTaps - 1 : pos - 1; hist[pos] = s; hist[pos + kTaps] = s; }
};

// tanh soft-clip normalised so that +/-1 maps to +/-1 (same curve as the web version's WaveShaper).
struct Drive {
    float k = 1.0f, norm = 1.0f;
    void set(float amt) { k = 1.0f + amt * 6.0f; norm = 1.0f / std::tanh(k); }
    inline float process(float x) const { x = clampf(x, -1.0f, 1.0f); return std::tanh(k * x) * norm; }
};

// Equal-power pan law matching Web Audio StereoPannerNode for a mono source.
inline void panGains(float pan, float& l, float& r) {
    float x = (clampf(pan, -1.0f, 1.0f) + 1.0f) * 0.5f;
    l = std::cos(x * kPi * 0.5f); r = std::sin(x * kPi * 0.5f);
}

// Web Audio lowpass/highpass biquads take Q in dB; convert to linear Q.
inline float qFromDb(float qdb) { return std::pow(10.0f, qdb / 20.0f); }

} // namespace blonda
