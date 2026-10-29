// BLONDA SEQ — melodic engines ported from the web version as web-graphs:
// Analog, Acid (303), Sub 808, FM Glass, Pluck (Karplus-Strong), Super Pad, Chip, SH-101 clone, Minimoog Model D clone.
// (Bris has its own dedicated implementation in bris.hpp.)
#pragma once
#include "wg.hpp"
#include <array>

namespace blonda {

enum class Eng : uint8_t { Analog, Acid, Sub, FM, Pluck, Chip, Super, SH101, Mini };

struct TrackSound { float tone = 0.5f, tune = 0.f, decay = 0.4f; };

struct AnalogP { int wave = 2; float a = .004f, d = .22f, s = .35f, r = .12f, cut = .42f, res = .35f, env = .55f; };   // wave: 0 sine 1 square 2 saw 3 tri
struct AcidP { float cut = .32f, res = .72f, env = .6f, dec = .3f, acc = .6f, drive = .35f, dtone = .5f, st = .2f; int wave = 2; int slide = 0; };
struct SubP { float decay = .5f, punch = .45f, drive = .3f, tone = .5f, glide = .2f, click = .4f; };
struct FMP { float ratio = 3, index = .42f, decay = .4f, bell = .3f, rel = .25f, bright = .6f; };
struct PluckP { float damp = .55f, bright = .6f, body = .35f, len = .45f, width = .5f, drive = .2f; };
struct SuperP { float detune = .45f, attack = .3f, release = .5f, bright = .5f, width = .75f, air = .4f; };
struct ChipP { int duty = 1; float dec = .4f, vib = .25f, arp = .55f, crush = .5f; int oct = 0, arpm = 0; };
struct SH101P { float lfoR = .45f; int lfoW = 0; float vcoMod = 0; int range = 1; float pw = .35f; int pwmSrc = 0; float pulse = .55f, saw = .7f, sub = .45f; int subMode = 0;
                float noise = 0, cut = .35f, res = .45f, env = .5f, vcfMod = 0, kybd = .5f; int vcaMode = 0; float A = .02f, D = .35f, S = .3f, R = .18f, porta = .2f; int portaMode = 2; float vol = .8f; };
struct MiniP { int o1r = 3, o1w = 2, o2r = 3, o2w = 2; float o2f = .08f; int o3r = 2, o3w = 3; float o3f = -.05f; int o3lfo = 0;
               float m1 = .85f; int m1on = 1; float m2 = .7f; int m2on = 1; float m3 = .5f; int m3on = 1; float mn = .3f; int mnon = 0, ncol = 0;
               float cut = .4f, emph = .35f, contour = .5f, fA = .02f, fD = .42f, fS = .45f, aA = .01f, aD = .45f, aS = .85f; int decSw = 1, kt1 = 1, kt2 = 0;
               float glide = .15f; int glideOn = 0; float modmix = 0; int oscMod = 0, filtMod = 0; float modAmt = .3f, vol = .8f; };

// Sequencer glide chain (the web's GL): note slides to later notes; `at` in steps from the note start.

struct EngineParams { AnalogP analog; AcidP acid; SubP sub; FMP fm; PluckP pluck; SuperP super_; ChipP chip; SH101P sh101; MiniP mini; };

// One melodic track: plays any of the engines, keeps the per-track mono state (slides, glide, legato).
class MelodicTrack {
public:
    static constexpr int kGraphs = 14;
    void prepare(float sampleRate, bool isBassTrack);
    Eng engine = Eng::Analog;
    EngineParams* params = nullptr;   // shared engine parameters (S.eng / S.synth in the web version)
    AnalogP* analog = nullptr;        // this track's own analog settings (S.synth[id])
    TrackSound sound;
    float bpm = 120.f;
    // intervals = chord voicing (semitones from note), len = note length in seconds (sequencer step length * steps)
    void trigger(float velocity, int note, float lenSec, const int* intervals, int nIntervals, int offset = 0, const Glide* glide = nullptr, bool live = false);
    // release a held live note (keyboard / MIDI): fades with the engine's release time, like the web keyboard
    void releaseLive(int note);
    void process(float* L, float* R, int frames);   // adds
    double now() const { return now_; }
    int activeGraphs() const { int c = 0; for (auto& g : g_) c += g.active() ? 1 : 0; return c; }   // sounding notes incl. release tails
    bool histOverflow() const { for (auto& g : g_) if (g.histOverflow()) return true; return false; }   // tests

private:
    struct Live { int kind = -1; int nf = 0; int16_t f[3]{}; int16_t q = -1; float c0 = 0, q0 = 0, lc = 0, lq = 0; bool acc = false; };
    struct Pending { int off; float vel; int note; float len; int iv[6]; int n; Glide gl; bool live; };
    const Glide* gl_ = nullptr;
    void glide(wg::Param& prm, float f0, double t);
    int newGraph(double t);
    void build(float v, int note, float len, const int* iv, int n, double t);
    void updateLive();
    float liveCents(const Live& L) const;
    float liveQ(const Live& L) const;

    std::array<wg::Graph, kGraphs> g_; std::array<Live, kGraphs> live_{}; std::array<int, kGraphs> liveNote_{}; int lastGraph_ = -1; std::array<uint32_t, kGraphs> age_{}; uint32_t ages_ = 0;
    float sr_ = 48000; double now_ = 0; bool bass_ = false; Noise rng_;
    std::array<Pending, 16> pend_{}; int nPend_ = 0;
    std::array<float, wg::Graph::kScratch> scratch_{};   // node outputs while one graph renders a block
    // mono state, like acidLast / subLast / shLast / mgLast
    struct Last { bool has = false; double t = 0; float f = 0, gate = 0, key = 0; int graph = -1; int gnode = -1; uint32_t age = 0; float f0r = 1; };
    Last acidLast_, subLast_, shLast_, mgLast_;
    void killLast(Last& L, double t, float tau);
};

} // namespace blonda
