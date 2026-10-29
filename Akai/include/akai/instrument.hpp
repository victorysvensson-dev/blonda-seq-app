// BLONDA AKAI — the instrument interface every synth in the Akai library implements.
//
// An Instrument is a playable sound engine with named parameters, presets and knob pages. It knows nothing
// about the hardware: the MPC Sample host (platform/mpcsample), the desktop test tools and a future
// Sample Key / Akai SDK host all drive it through this interface.
//
// Threading: every call happens on the audio thread (the host applies pad, knob and MIDI events between
// blocks), so implementations must stay real-time safe: no allocation, locks or exceptions after prepare().
#pragma once
#include <cstdio>

namespace akai {

struct ParamInfo {
    const char* id;            // stable key (matches the SEQ.3 project JSON where there is one)
    const char* name;          // short label for the screen (max ~8 chars)
    float min, max, def;
    int steps = 0;             // 0 = continuous, otherwise number of discrete values (min..max in whole steps)
    const char* const* labels = nullptr;   // optional text for each discrete step
};

// One screen page = up to three parameters on K1-K3.
struct Page { const char* name; int param[3]; };   // -1 = slot unused

class Instrument {
public:
    virtual ~Instrument() = default;

    virtual const char* name() const = 0;          // e.g. "BRIS"
    virtual const char* description() const = 0;  // one line, e.g. "6-voice poly (Bree6-style)"

    virtual void prepare(float sampleRate) = 0;    // may allocate; called before audio starts
    virtual void reset() = 0;                      // silence everything

    // Live notes: sustain until noteOff. offset = sample position inside the next process() block.
    virtual void noteOn(int note, float velocity, int offset = 0) = 0;
    virtual void noteOff(int note, int offset = 0) = 0;
    virtual void allNotesOff() = 0;
    virtual void pressure(float amount) { (void)amount; }    // 0..1, strongest pad / channel pressure
    virtual void setTempo(float bpm) { (void)bpm; }
    // Optional MIDI control from an external keyboard: return true if the instrument used the CC itself.
    virtual bool controlChange(int cc, int value) { (void)cc; (void)value; return false; }
    virtual void pitchBend(float bend) { (void)bend; }        // -1..1

    // Adds the instrument's output into L/R (the host clears the buffers).
    virtual void process(float* L, float* R, int frames) = 0;
    virtual int activeVoices() const { return 0; }

    // Parameters, in native units (see ParamInfo::min/max).
    virtual int numParams() const = 0;
    virtual const ParamInfo& param(int i) const = 0;
    virtual float get(int i) const = 0;
    virtual void set(int i, float value) = 0;

    // Knob pages for K1-K3.
    virtual int numPages() const = 0;
    virtual const Page& page(int p) const = 0;

    // Presets.
    virtual int numPresets() const = 0;
    virtual const char* presetName(int i) const = 0;
    virtual const char* presetCategory(int i) const { (void)i; return ""; }
    virtual void loadPreset(int i) = 0;

    // Output trim so every instrument plays at a similar loudness on the MPC (SEQ.3 does this in its mixer).
    // The host multiplies process() output by this.
    virtual float outputGain() const { return 1.f; }

    // The parameter the MPC Sample's fader plays live (usually filter cutoff); -1 = none.
    virtual int faderParam() const { return -1; }

    // ---- helpers shared by all instruments
    float getNorm(int i) const { const ParamInfo& p = param(i); return p.max > p.min ? (get(i) - p.min) / (p.max - p.min) : 0.f; }
    void setNorm(int i, float n) {
        const ParamInfo& p = param(i);
        n = n < 0.f ? 0.f : (n > 1.f ? 1.f : n);
        float v = p.min + n * (p.max - p.min);
        if (p.steps > 0) v = p.min + (float)(int)((v - p.min) + 0.5f);
        set(i, v);
    }
    // Value text for the screen ("62", "SAW", "II").
    void format(int i, char* buf, int len) const {
        const ParamInfo& p = param(i);
        const float v = get(i);
        if (p.steps > 0 && p.labels) {
            int k = (int)(v - p.min + 0.5f); if (k < 0) k = 0; if (k > p.steps - 1) k = p.steps - 1;
            std::snprintf(buf, (size_t)len, "%s", p.labels[k]);
        } else if (p.steps > 0) {
            std::snprintf(buf, (size_t)len, "%d", (int)(v + (v < 0 ? -0.5f : 0.5f)));
        } else {
            std::snprintf(buf, (size_t)len, "%d", (int)(getNorm(i) * 100.f + 0.5f));
        }
    }
};

} // namespace akai
