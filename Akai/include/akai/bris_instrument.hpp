// BLONDA AKAI — Bris (the 6-voice polysynth from BLONDA SEQ.3; the Bree6-style M4L BRIS is BRIS 6) as an Akai library instrument.
// The sound engine is blonda::Bris from Core/ unchanged, so SEQ.3 and the MPC version always sound the same.
#pragma once
#include "akai/instrument.hpp"
#include "blonda/bris.hpp"

namespace akai {

class BrisInstrument final : public Instrument {
public:
    BrisInstrument();
    const char* name() const override { return "BRIS SEQ"; }
    const char* description() const override { return "SEQ.3 Bris 6-voice poly"; }

    void prepare(float sampleRate) override;
    void reset() override;
    void noteOn(int note, float velocity, int offset) override;
    void noteOff(int note, int offset) override;
    void allNotesOff() override;
    void pressure(float amount) override;
    void setTempo(float bpm) override { syn_.bpm = bpm; }
    void process(float* L, float* R, int frames) override;
    int activeVoices() const override { return syn_.activeVoices(); }

    int numParams() const override;
    const ParamInfo& param(int i) const override;
    float get(int i) const override;
    void set(int i, float value) override;

    int numPages() const override;
    const Page& page(int p) const override;

    int numPresets() const override { return nPresets_; }
    const char* presetName(int i) const override;
    const char* presetCategory(int i) const override;
    void loadPreset(int i) override;

    int faderParam() const override;

    blonda::Bris& engine() { return syn_; }

private:
    blonda::Bris syn_;
    blonda::BrisParams base_;     // the edited sound, without pad pressure
    float pressure_ = 0.f;
    const blonda::BrisPreset* presets_ = nullptr;
    int nPresets_ = 0;
    void apply();
};

} // namespace akai
