// BLONDA AKAI — BRIS 6: the BLONDA BRIS Max for Live device (six-voice analog poly built like the GS Music
// Bree6: one oscillator + sub per voice, 4-pole ladder, two ADSRs, one LFO, four voice modes, ensemble chorus,
// echo). The sound is the device's own gen~ code, translated by tools/gen2cpp.py (gen/bris6_gen.hpp); the
// voice allocation is bris_voices.js ported line by line; parameters and the 90 presets come from its panel.
#pragma once
#include "akai/instrument.hpp"
#include <cstdint>
#include <memory>

namespace akai {
namespace gen { class Bris6Gen; }

class Bris6Instrument final : public Instrument {
public:
    Bris6Instrument();
    ~Bris6Instrument() override;
    const char* name() const override { return "BRIS 6"; }
    const char* description() const override { return "Bree6-style poly (M4L BRIS)"; }

    void prepare(float sampleRate) override;
    void reset() override;
    void noteOn(int note, float velocity, int offset) override;
    void noteOff(int note, int offset) override;
    void allNotesOff() override;
    void pressure(float amount) override;
    bool controlChange(int cc, int value) override;
    void pitchBend(float bend) override;
    void process(float* L, float* R, int frames) override;
    int activeVoices() const override { return voicesActive_; }

    int numParams() const override;
    const ParamInfo& param(int i) const override;
    float get(int i) const override { return values_[i]; }
    void set(int i, float value) override;

    int numPages() const override;
    const Page& page(int p) const override;

    int numPresets() const override;
    const char* presetName(int i) const override;
    const char* presetCategory(int i) const override { (void)i; return "BRIS 6"; }
    void loadPreset(int i) override;

    int faderParam() const override;
    float outputGain() const override { return 1.4f; }   // measured with `akai_test levels`: single note C3 ~ -18 dBFS RMS

private:
    std::unique_ptr<gen::Bris6Gen> g_;
    float values_[64]{};
    int voicesActive_ = 0;
    float pressure_ = 0.f;
    void applyCutoff();

    // ---- bris_voices.js
    static constexpr int NV = 6;
    struct Voice { int note = -1; bool on = false, sus = false; uint32_t age = 0; };
    Voice vo_[NV];
    uint32_t clock_ = 0, tc_ = 0;
    bool sustain_ = false, monoOn_ = false;
    int mode_ = 0, uni_ = 0;
    int stack_[128]; int nStack_ = 0;
    double monoVel_ = 0.8;
    void trig(int i, int n, double vel, bool retrig);
    void playStack(bool retrig);
    void releaseSus();
    void stackRemove(int n);
    void setGate(int i, double g);
    void setNoteParam(int i, double n);
    void setTrigger(int i, double t);
};

} // namespace akai
