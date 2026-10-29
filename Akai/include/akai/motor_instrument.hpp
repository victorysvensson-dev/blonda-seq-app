// BLONDA AKAI — any engine from the shared BLONDA engine library (victorysvensson-dev/blonda-motor, pinned to a
// tag as a submodule in third_party/blonda-motor) as an Akai instrument.
//
// The sound comes unchanged from the library: the same GenExpr as the Max for Live device, so the MPC, Ableton,
// SEQ.3 and the web all sound the same. This adapter only adds what is MPC-specific: knob pages, short screen
// names (8 characters), value labels, which parameter the fader plays, a level trim, and pad pressure.
#pragma once
#include "akai/instrument.hpp"
#include "blonda/motor.h"
#include <memory>

namespace akai {

// The MPC "skin" for one engine: everything here is presentation, nothing changes the sound.
struct MotorSkin {
    const char* motor;                 // engine name in blonda::createMotor(), e.g. "bris"
    const char* screenName;            // e.g. "BRIS"
    const char* description;
    struct PageDef { const char* name; const char* ids[3]; };
    const PageDef* pages; int numPages;
    struct Label { const char* id; const char* shortName; const char* const* values; int numValues; };
    const Label* labels; int numLabels;
    const char* faderParam;            // id the fader and pad pressure move (filter cutoff)
    float pressureAmount;              // pad pressure adds up to this much of the fader parameter's range
    float outputGain;
};
const MotorSkin* findMotorSkin(const char* motor);

class MotorInstrument final : public Instrument {
public:
    explicit MotorInstrument(const MotorSkin& skin);
    ~MotorInstrument() override;
    const char* name() const override { return skin_.screenName; }
    const char* description() const override { return skin_.description; }

    void prepare(float sampleRate) override;
    void reset() override;
    void noteOn(int note, float velocity, int offset) override;
    void noteOff(int note, int offset) override;
    void allNotesOff() override;
    void pressure(float amount) override;
    bool controlChange(int cc, int value) override;
    void pitchBend(float bend) override;
    void process(float* L, float* R, int frames) override;
    int activeVoices() const override { return voices_; }

    int numParams() const override;
    const ParamInfo& param(int i) const override;
    float get(int i) const override;
    void set(int i, float value) override;

    int numPages() const override { return skin_.numPages; }
    const Page& page(int p) const override { return pages_[p]; }

    int numPresets() const override;
    const char* presetName(int i) const override;
    const char* presetCategory(int) const override { return skin_.screenName; }
    void loadPreset(int i) override;

    int faderParam() const override { return fader_; }
    float outputGain() const override { return skin_.outputGain; }

    blonda::Motor& motor() { return *motor_; }

private:
    const MotorSkin& skin_;
    std::unique_ptr<blonda::Motor> motor_;
    static constexpr int kMaxParams = 96, kMaxPages = 24, kScratch = 256;
    ParamInfo info_[kMaxParams];
    Page pages_[kMaxPages];
    int fader_ = -1, voices_ = 0;
    float pressure_ = 0.f;
    double faderBase_ = 0.0;           // the fader parameter without pad pressure (what the screen shows)
    float sL_[kScratch], sR_[kScratch];
    void applyFader();
};

} // namespace akai
