// BLONDA motor – det lilla som genererad GenExpr-kod behöver för att köras som C++.
// Funktionerna efterliknar gen~ exakt (wrap, clamp, peek/poke utan interpolation, noise -1..1).
#pragma once
#include <cmath>
#include <cstdint>
#include <vector>

namespace blonda::gen {

constexpr double kPi = 3.14159265358979323846;
constexpr double kTwoPi = 6.28318530717958647692;
constexpr double kHalfPi = 1.57079632679489661923;

inline double max(double a, double b) { return a > b ? a : b; }
inline double min(double a, double b) { return a < b ? a : b; }
inline double clamp(double x, double lo, double hi) { return x < lo ? lo : (x > hi ? hi : x); }
inline double fixdenorm(double x) { return std::fabs(x) < 1e-30 ? 0.0 : x; }

// gen~ wrap: x hamnar i [lo, hi)
inline double wrap(double x, double lo, double hi) {
    double r = hi - lo;
    if (r == 0.0) return lo;
    double y = std::fmod(x - lo, r);
    if (y < 0.0) y += r;
    return y + lo;
}

// Deterministiskt brus (xorshift32), -1..1. Samma följd varje gång motorn nollställs,
// vilket gör att tester och referens kan jämföras sampel för sampel.
struct Noise {
    uint32_t s = 2463534242u;
    inline double next() {
        s ^= s << 13;
        s ^= s >> 17;
        s ^= s << 5;
        return (double)s / 4294967296.0 * 2.0 - 1.0;
    }
};

// gen~ Data: fast antal sampel × kanaler. peek/poke utan interpolation, utanför gränserna ignoreras.
struct Data {
    int frames, chans;
    std::vector<double> d;
    Data(int f, int c) : frames(f), chans(c), d((size_t)f * c, 0.0) {}
    void clear() { std::fill(d.begin(), d.end(), 0.0); }
    inline double peek(double i, double c) const {
        long ii = (long)i, cc = (long)c;
        if (ii < 0 || ii >= frames || cc < 0 || cc >= chans) return 0.0;
        return d[(size_t)cc * frames + ii];
    }
    inline void poke(double v, double i, double c) {
        long ii = (long)i, cc = (long)c;
        if (ii < 0 || ii >= frames || cc < 0 || cc >= chans) return;
        d[(size_t)cc * frames + ii] = v;
    }
};

}  // namespace blonda::gen
