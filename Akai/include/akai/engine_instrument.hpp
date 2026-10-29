// BLONDA AKAI — the nine SEQ.3 melodic engines (Analog, Acid, Sub 808, FM Glass, Pluck, Super Pad, Chip,
// SH-101 and Minimoog Model D clones) as Akai library instruments. Sound comes from blonda::MelodicTrack in Core/.
#pragma once
#include "akai/instrument.hpp"
#include "blonda/engines.hpp"
#include <cstdint>

namespace akai {

class EngineInstrument final : public Instrument {
public:
    static bool noteLimitOff;   // measurements only: ignore the per-engine held-note limit
    explicit EngineInstrument(blonda::Eng engine);
    const char* name() const override;
    const char* description() const override;

    void prepare(float sampleRate) override;
    void reset() override;
    void noteOn(int note, float velocity, int offset) override;
    void noteOff(int note, int offset) override;
    void allNotesOff() override;
    void pressure(float amount) override;
    void setTempo(float bpm) override { track_.bpm = bpm; }
    const blonda::MelodicTrack& track() const { return track_; }
    int activeVoices() const override { return track_.activeGraphs(); }
    void process(float* L, float* R, int frames) override;

    int numParams() const override;
    const ParamInfo& param(int i) const override;
    float get(int i) const override;
    void set(int i, float value) override;

    int numPages() const override;
    const Page& page(int p) const override;

    int numPresets() const override { return 1; }
    const char* presetName(int) const override { return "INIT"; }
    const char* presetCategory(int) const override { return name(); }
    void loadPreset(int i) override;

    int faderParam() const override;
    float outputGain() const override;

    struct Def;      // parameter table entry (engine_instrument.cpp)
    struct Table;    // one engine's parameters and pages

private:
    blonda::Eng eng_;
    const Table* tab_;
    blonda::MelodicTrack track_;
    blonda::EngineParams live_{}, base_{};    // live_ = what the engine plays (base_ + pad pressure)
    blonda::AnalogP liveA_{}, baseA_{};
    blonda::TrackSound baseSound_{};
    float pressure_ = 0.f;
    bool held_[128]{};
    uint8_t order_[128]{}; int nOrder_ = 0;   // held notes, oldest first
    void apply();
    void* field(const Def& d, bool live);
    const void* field(const Def& d) const;
};

} // namespace akai
