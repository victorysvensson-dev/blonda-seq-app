// BLONDA SEQ — Bris: 6-voice analog-style polysynth (two detunable oscillators, sub, noise,
// 24 dB low-pass, filter + amp ADSR, key-synced LFO, Juno-style chorus I/II and tempo delay).
// Voices run at 2x the host rate and are decimated with a half-band FIR before the effects.
#pragma once
#include "dsp.hpp"
#include <array>
#include <cstdint>

namespace blonda {

struct BrisParams {
    // oscillators
    float wave = 0;      // 0 saw, 1 pulse
    float pw = 0.5f, det = 0.42f, sub = 0.18f, noise = 0.0f, glide = 0.0f, drift = 0.45f;
    // filter
    float cut = 0.46f, res = 0.14f, fenv = 0.22f, kt = 0.5f, fvel = 0.3f;
    float fA = 0.55f, fD = 0.6f, fS = 0.55f, fR = 0.6f;
    // amp
    float aA = 0.55f, aD = 0.6f, aS = 0.85f, aR = 0.62f;
    // lfo: wave 0 tri, 1 ramp up, 2 ramp down, 3 square, 4 sample&hold. dest 0 pitch, 1 filter, 2 amp
    float lfoW = 0, lfoR = 0.18f, lfoSync = 0, lfoDest = 1, lfoAmt = 0.22f;
    // effects: cho 0 off, 1 = I, 2 = II
    float cho = 2, choMix = 0.75f, dly = 0.24f, dlyT = 1, dlyFb = 0.38f;
    // voice mode 0 poly 6, 1 mono, 2 unison
    float vmode = 0, vol = 0.8f;
};

struct BrisPreset { const char* category; const char* name; BrisParams params; };
// All 29 factory presets from the web version (defaults + overrides).
const BrisPreset* brisPresets(int& count);

class Bris {
public:
    static constexpr int kMaxVoices = 16;   // slots (6 sound at once, extra slots let stolen voices fade out)
    static constexpr int kOS = 2;           // oversampling factor for the voice section

    void prepare(float sampleRate);
    void reset();

    BrisParams params;          // edited by the host between blocks
    float bpm = 120.0f;         // for synced LFO and delay
    float trackTone = 0.5f;     // the track's "tone" parameter (scales cutoff like the web version)
    float trackTune = 0.0f;     // semitones

    float trackDecay = 0.25f;   // the track's "decay" parameter: gate = length * (0.5 + 2*decay), as in the web version

    // offset = sample position inside the next process() block; chordSize = notes triggered together (level scaling).
    // lengthSec > 0: sequenced note with known length (envelopes follow the web version's scheduled timeline exactly).
    // lengthSec <= 0: live note (keyboard / MIDI) - scheduled like the web keyboard (24 steps) and faded out on noteOff.
    void noteOn(int note, float velocity, int offset = 0, int chordSize = 1, float lengthSec = 0.f);
    void noteOff(int note, int offset = 0);
    void allNotesOff();

    // Adds into L/R.
    void process(float* L, float* R, int frames);
    int activeVoices() const;

private:
    enum Stage : uint8_t { Off, Attack, Decay, Release };
    struct Voice {
        bool used = false, held = false, stealing = false, pendingRelease = false;
        int note = 0; float vel = 0; uint32_t age = 0; int chord = 1;
        // pitch
        float freq = 440.f, glideFrom = 440.f; int glideLeft = 0, glideLen = 0;
        BlepOsc osc[3][2]; float driftC[3][2]{}; BlepOsc subOsc; Noise nz;
        // envelopes: emulate the Web Audio AudioParam timeline the web version schedules at note start
        double t = 0; float gate = 1.f, relAt = 1.f, endAt = 2.f;
        float av = 0, fx = 0;
        bool live = false, liveOff = false; float outer = 1.f;
        float steal = 1.0f;
        // lfo
        float lfoPh = 0, sh = 0; float shLeft = 0;
        // filter
        SvfLP f1, f2; int coefCount = 0;
    };
    struct Event { int frame; int note; float vel; int chord; bool on; float len; };

    void startVoice(int note, float vel, int chord, float lenSec);
    void releaseNote(int note);
    float renderVoice(Voice& v);   // one oversampled sample
    void runEvents(int frame);

    float sr = 48000, osr = 96000;
    std::array<Voice, kMaxVoices> voices{};
    uint32_t ageCounter = 0;
    float lastFreq = 0; double lastTime = -10; double now = 0;
    Noise rng;
    HalfbandDecimator dec;
    float dcX = 0, dcY = 0;                 // DC blocker after the voice sum (asymmetric pulse + drive creates DC)
    Drive shaper;

    // effects
    DelayLine<4096> choL;                   // chorus read taps (mono input)
    float choPh[2]{0, 0};
    DelayLine<262144> dlyL, dlyR;           // up to ~5 s at 48 kHz
    Biquad dHpL, dHpR, dLpL, dLpR;
    Smoother sDry, sWet, sChoBase, sChoDepth, sChoRate[2], sDlyTime, sDlyFb, sDlyOut;
    bool fxInit = false;

    std::array<Event, 256> events{}; int nEvents = 0;
};

} // namespace blonda
