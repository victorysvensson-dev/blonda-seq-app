// BLONDA SEQ — samples: one-shots on the drum tracks and tempo-synced loops (web: smpVoice, loopsBar).
// Sample data is allocated and freed on the UI thread (Host); the audio thread only reads it through raw pointers
// and hands a pointer back through the retire queue once nothing plays it any more.
#pragma once
#include "dsp.hpp"
#include <cmath>
#include <vector>

namespace blonda {

struct SampleData {
    std::vector<float> L, R;   // at the engine's sample rate
    int frames = 0;
};

// 4-point Hermite read (the web resamples with linear interpolation; this keeps pitched hits cleaner)
inline float hermiteAt(const float* x, int n, double pos) {
    const int i = (int)pos; const float t = (float)(pos - i);
    auto at = [&](int k) { return (k >= 0 && k < n) ? x[k] : 0.f; };
    const float y0 = at(i - 1), y1 = at(i), y2 = at(i + 1), y3 = at(i + 2);
    const float c1 = .5f * (y2 - y0), c2 = y0 - 2.5f * y1 + 2.f * y2 - .5f * y3, c3 = .5f * (y3 - y0) + 1.5f * (y1 - y2);
    return ((c3 * t + c2) * t + c1) * t + y1;
}

// A one-shot on a drum track: rate = 2^(tune/12); tone = LP below the middle, HP above; level held for 55 %
// of the length and then an exponential fade to −80 dB (web: smpVoice).
struct SampleVoice {
    const SampleData* s = nullptr; int track = -1; bool active = false;
    long long start = 0; double pos = 0, rate = 1; double len = 0, holdEnd = 0; float lv = 0;
    float lpc[5]{}, hpc[5]{}, z[2][4]{};
    bool choked = false; long long chokeAt = 0; float chokeG = 1;
};

// A loop: repitched so N bars fill N bars at the current tempo, 4 ms fade in, 8 ms fade out (web: loopsBar).
struct LoopVoice {
    const SampleData* s = nullptr; int slot = -1; bool active = false;
    long long start = 0, end = 0; double pos = 0, rate = 1; float lv = 0, g = 0; bool killing = false;
};

} // namespace blonda
