// BLONDA SEQ — drum tracks. Every kit voice from the web version (blonda, 808, 909, thump, dist, rim, lo-fi,
// snap, stack, metal, shaker, tick, conga, cowbell, clave, tom) rebuilt as a tiny fixed-size signal graph:
// sources (band-limited oscillators / noise) -> stages (biquad / drive) -> gain envelope, with web-identical automation.
#pragma once
#include "dsp.hpp"
#include "webparam.hpp"
#include <array>

namespace blonda {

enum class DrumKind : uint8_t { Kick, Snare, Clap, Hat, OpenHat, Perc };

struct DrumParams { float tune = 0, decay = 0.45f, tone = 0.35f; };

class DrumTrack {
public:
    void prepare(float sampleRate, DrumKind kind);
    // kit: "" (blonda), "808", "909", "thump", "dist", "rim", "lofi", "snap", "stack", "shaker", "tick", "conga", "cowbell", "clave", "tom"
    void setKit(const char* kit);
    DrumParams params;
    DrumTrack* chokeTarget = nullptr;   // closed hat -> open hat track
    // Schedule a hit at an absolute frame (the sequencer calls this ahead of time, like the web scheduler does).
    void triggerAt(float velocity, long long startFrame);
    void trigger(float velocity, int offset = 0) { triggerAt(velocity, frame_ + offset); }   // live hits
    void process(float* mono, int frames);   // adds into mono; advances the track clock
    bool lastHitWasKick() const { return kind_ == DrumKind::Kick; }

private:
    enum OscType : uint8_t { Sine, Tri, Square, Saw, NoiseSrc };
    enum StageType : uint8_t { LP, HP, BP, Shape };
    struct Source { OscType type = Sine; WebParam freq{440.f}; float gain = 1.f; int entry = 0; float phase = 0; double stop = 1e9; Noise nz; };
    struct Stage { StageType type = LP; float a = 0, b = 0, c = 0, d = 0, e = 0; float z1 = 0, z2 = 0; float k = 1, kn = 1, nk = 1, nkn = 1; float up = 0; HalfbandDecimator* dec = nullptr; float* lat = nullptr; int li = 0; };
    struct Chain { std::array<Source, 8> src; int nsrc = 0; std::array<Stage, 3> st; int nst = 0; WebParam gain{1.f}; double end = 0; };
    struct Voice { bool active = false; long long start = 0; double end = 0; std::array<Chain, 3> ch; int nch = 0; uint32_t age = 0; bool open = false; double qEnd = 0; int chokeChains = 3; };

    // builder helpers (mirror the web code)
    Chain& chain(Voice& v);
    Source& osc(Chain& c, OscType type, float f, double stop, int entry = 0);
    Source& noise(Chain& c, double dur, int entry = 0, float gain = 1.f);
    void bq(Chain& c, StageType type, float f, float q);   // q in Web Audio units (dB for LP/HP, linear for BP)
    void shp(Chain& c, float amount);                       // distCurve(a) with 2x oversampling
    static void env(WebParam& g, double t, float a, float peak, float dec);

    void build(Voice& v, float vel);
    float renderStage(Stage& s, float x);

    float sr_ = 48000; DrumKind kind_ = DrumKind::Kick; int kit_ = 0; uint32_t age_ = 0;
    std::array<Voice, 8> voices_{};
    std::array<HalfbandDecimator, 8 * 3 * 3> decs_{};
    std::array<std::array<float, 128>, 8 * 3 * 3> lats_{};   // Chrome's WaveShaper 2x adds 128 frames of latency
    Noise rng_;
    long long frame_ = 0; int lastOpen_ = -1; uint32_t lastOpenAge_ = 0;
public:
    // hatChoke(): a closed hat cancels the last open hat's envelope from its own start time (web semantics)
    void chokeAt(long long frame);
private:
};

} // namespace blonda
