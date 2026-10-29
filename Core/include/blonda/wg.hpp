// BLONDA SEQ — "web graph": a small fixed-capacity signal graph with Web Audio semantics.
// The web version builds each note as a tiny node graph (oscillators, gains, biquads, wave shapers, delays,
// panners, buffer sources) with scheduled automation. Rebuilding the same graphs here lets every engine be
// ported almost line by line and sound identical, while the building blocks themselves are higher quality
// (mip-mapped band-limited oscillators, oversampled shapers, interpolated delays). No allocation at run time.
#pragma once
#include "dsp.hpp"
#include "webparam.hpp"
#include <array>
#include <cstdint>
#include <cstring>

namespace blonda::wg {

using Param = WebParamN<12>;

// ---------------------------------------------------------------- periodic wave tables (mip-mapped)
struct Wave {
    static constexpr int kSize = 2048, kLevels = 30;
    float t[kLevels][kSize + 1];
    int partials[kLevels];
    // Fourier series x(p) = sum re[n] cos(2 pi n p) + im[n] sin(2 pi n p), peak-normalised like createPeriodicWave
    void build(const float* re, const float* im, int n) {
        static float cs[kSize], sn[kSize]; static bool init = false;
        if (!init) { for (int i = 0; i < kSize; ++i) { cs[i] = std::cos(kTwoPi * i / kSize); sn[i] = std::sin(kTwoPi * i / kSize); } init = true; }
        const int maxP = std::min(n - 1, kSize / 2);
        for (int l = 0; l < kLevels; ++l) partials[l] = std::max(1, std::min(maxP, (int)(1024.0 / std::pow(2.0, l / 3.0))));
        float norm = 0;
        for (int l = 0; l < kLevels; ++l) {
            float* tb = t[l]; for (int i = 0; i < kSize; ++i) tb[i] = 0;
            for (int k = 1; k <= partials[l]; ++k) {
                const float a = re ? re[k] : 0.f, b = im ? im[k] : 0.f; if (a == 0.f && b == 0.f) continue;
                for (int i = 0; i < kSize; ++i) { const int j = (int)(((long long)k * i) & (kSize - 1)); tb[i] += a * cs[j] + b * sn[j]; }
            }
            if (l == 0) { for (int i = 0; i < kSize; ++i) norm = std::max(norm, std::fabs(tb[i])); norm = norm > 0 ? 1.f / norm : 0.f; }
        }
        for (int l = 0; l < kLevels; ++l) { for (int i = 0; i < kSize; ++i) t[l][i] *= norm; t[l][kSize] = t[l][0]; }
    }
    inline float read(float phase, float inc) const {
        const float maxP = 0.5f / std::max(inc, 1e-7f); int l = 0;
        while (l < kLevels - 1 && (float)partials[l] * 1.26f > maxP) ++l;
        const float x = phase * kSize; const int i = (int)x; const float f = x - (float)i; const float* tb = t[l];
        return tb[i] + (tb[i + 1] - tb[i]) * f;
    }
};

// Shared tables: built-in types + every custom PeriodicWave the web version uses.
enum WaveId : uint8_t {
    W_SINE, W_SQUARE, W_SAW, W_TRI,
    W_MG_TRI, W_MG_SHARK, W_MG_SAW, W_MG_RSAW, W_MG_SQ, W_MG_WIDE, W_MG_NARROW,   // Minimoog waves (64 coefficients)
    W_CHIP_125, W_CHIP_25, W_CHIP_50,                                              // chip pulses (64 coefficients)
    W_COUNT
};
const Wave& wave(WaveId id);   // builds lazily; call warm() off the audio thread
void warmWaves();

// Shared 1.5 s white-noise buffer (like A.noise in the web version).
const float* noiseBuffer(int& length, float sampleRate);

// ---------------------------------------------------------------- graph
enum NodeType : uint8_t { N_OSC, N_GAIN, N_BIQUAD, N_SHAPER, N_DELAY, N_CONST, N_NOISE, N_PAN, N_KS, N_SH };
enum BqType : uint8_t { BQ_LP, BQ_HP, BQ_BP, BQ_HS };
enum CurveType : uint8_t { C_DIST, C_DRIVE, C_CRUSH };
enum ParamId : uint8_t { P0 = 0, P1 = 1, P2 = 2, P3 = 3 };
// param slots per node type: OSC {freq, detune}; GAIN {gain}; BIQUAD {freq, Q, detune, gain}; DELAY {time};
// CONST {offset}; PAN {pan}; KS {playbackRate}

class Graph {
public:
    static constexpr int kNodes = 112, kIn = 40, kMods = 3;
    void reset(float sampleRate);
    // builders (times are absolute engine seconds)
    int osc(WaveId w, float freq, double start, double stop);
    int gain(float g);
    int biquad(BqType type, float freq, float q = 1.f, float gainDb = 0.f);
    int shaper(CurveType c, float amount, int oversample);   // oversample 1, 2 or 4 (with Chrome's latency)
    int delay(float maxSec, float time);
    int constant(float offset, double start, double stop);
    int noise(double start, double stop, float offsetSec);      // looping shared noise buffer
    int pan(float p);
    int sampleHold(float rate, double start, double stop, uint32_t seed);   // constant source stepping to random values
    int karplus(float freq, float damp, float bright, float body, float len, double start, uint32_t seed);
    void connect(int from, int to);
    void connectParam(int from, int to, ParamId p);
    void toOut(int from);
    Param& param(int node, ParamId p) { return nodes_[node].p[p]; }
    void setStop(int node, double stop) { nodes_[node].stop = stop; }
    // chip arpeggio: frequency steps through base+semis[k % n] every `step` seconds from t0 until tEnd
    void setArp(int node, const float* semis, int n, float baseNote, double t0, double step, double tEnd) {
        Node& nd = nodes_[node]; nd.arpN = (uint8_t)std::min(n, 6); for (int i = 0; i < nd.arpN; ++i) nd.arp[i] = semis[i]; nd.arpBase = baseNote; nd.arpT0 = t0; nd.arpStep = step; nd.arpEnd = tEnd; }
    void setLiveQ(int node, float q) { nodes_[node].qLive = q; }
    void setLiveDetune(int node, float cents) { nodes_[node].p[2].setDefault(cents); }
    float outL(int node) const { return nodes_[node].out[0]; }
    void finalize(double endTime);   // sort nodes; the graph stays alive until endTime
    bool active() const { return active_; }
    double endTime() const { return end_; }
    void kill() { active_ = false; }
    // render one frame at absolute time t, adds stereo into l/r
    void tick(double t, float& l, float& r);
    int nodeCount() const { return n_; }

private:
    struct Node {
        NodeType type = N_GAIN; uint8_t sub = 0, ch = 1, nIn = 0;
        int16_t in[kIn]; Param p[4];
        int16_t mod[4][kMods]; uint8_t nMod[4]{};
        double start = 0, stop = 1e18;
        float out[2]{0, 0};
        // state
        float phase = 0; float z[2][2]{}; float co[5]{1, 0, 0, 0, 0}; float lastF = -1, lastQ = -1, lastG = -1e9f;
        float amt = 0, k1 = 1, k1n = 1, k2 = 1, k2n = 1; float up[2]{0, 0}; int os = 1; int lat = 0, li = 0;
        float* lbuf = nullptr; HalfbandDecimator* dec[2][2]{};
        float* dl = nullptr; int dlSize = 0, dlW = 0;
        uint32_t rng = 1; float shv = 0, shLeft = 0, rate = 0;
        // karplus
        float* ring = nullptr; int ringN = 0, idx = 0; float fb = 0, norm = 1; long len = 0, pos = 0; float fadeN = 0; float ksPrev = 0, ksCur = 0, ksFrac = 0;
        const float* buf = nullptr; int bufLen = 0; double bufPos = 0;
        double qEnd = 0, qStart = 0; const Wave* wv = nullptr; bool muted = false; float qLive = -1.f;
        uint64_t delayedIn = 0; uint16_t delayedMod = 0; float* hist = nullptr; int hpos = 0;  /* cycle edges read 128 frames back (Chrome) */ uint8_t arpN = 0; float arp[6]{}; float arpBase = 0; double arpT0 = 0, arpStep = 1, arpEnd = 0;
    };
    float evalParam(Node& nd, int p, double t);
    void processNode(Node& nd, double t);

    std::array<Node, kNodes> nodes_; int n_ = 0;
    std::array<int16_t, kNodes> order_{}; std::array<int16_t, 16> outs_{}; int nOut_ = 0;
    float sr_ = 48000; double end_ = 0; bool active_ = false;
    // pooled state memory
    std::array<HalfbandDecimator, 24> decPool_; int decUsed_ = 0;
    std::array<float, 8 * 256> latPool_{}; int latUsed_ = 0;
    std::array<float, 2 * 8192> dlPool_{}; int dlUsed_ = 0;
    std::array<float, 8 * 1200> ringPool_{}; int ringUsed_ = 0;
    std::array<float, 6 * 256> histPool_{}; int histUsed_ = 0;
    inline float srcOut(int src, int c, bool delayed) const { const Node& s = nodes_[src]; if (delayed && s.hist) return s.hist[c * 128 + s.hpos]; return s.out[c]; }
};

} // namespace blonda::wg
