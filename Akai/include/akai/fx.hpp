// BLONDA AKAI — KNOB FX: the SEQ.3 master effects on the MPC's knobs.
//
//   ECHO    SEQ.3's echo: tempo-synced stereo delay with a 1800 Hz band-pass in the feedback path
//   SPACE   SEQ.3's space: the same convolution reverb (noise IR shaped (1 - t/len)^2.8, 250 Hz high-pass in front)
//   FILTER  SEQ.3's master DJ filter: left of centre low-pass, right of centre high-pass, centre off
//
// The knobs set how much of the sound is sent to ECHO and SPACE, so turning one down lets its tail ring out.
// SHIFT + KNOB FX switches all three off (and on again).
//
// The reverb is split so the audio thread never has a long FFT: the first 6272 taps run on the audio thread
// (128 direct taps + 128-sample FFT partitions), the long tail runs in 4096-sample FFT partitions on a worker
// thread with ~49 ms to deliver each block. setThreaded(false) computes the tail on the audio thread instead
// (used by the tests and offline renders); both give the same output.
#pragma once
#include "akai/instrument.hpp"
#include <atomic>
#include <memory>
#include <thread>
#include <vector>

namespace blonda { class ConvStage; class FFT; }

namespace akai {

// Called at the start of every worker thread (the MPC host uses it to keep workers off the audio core).
extern void (*gWorkerThreadInit)();

class TailReverb {
public:
    TailReverb();
    ~TailReverb();
    void build(float sizeSec, float sampleRate);   // allocates; call before audio starts
    void setThreaded(bool on);                      // starts / stops the worker
    void process(const float* inL, const float* inR, float* outL, float* outR, int n);   // adds the wet signal
    int lateBlocks() const { return late_; }        // tail blocks the worker delivered too late (dropped)

    static constexpr int kHead = 128, kB1 = 128, kTailStart = 6272, kB2 = 4096, kSlots = 4;
private:
    struct Impl; std::unique_ptr<Impl> d_;
    int late_ = 0;
    void worker();
    void computeTail(long long k);
    std::thread thread_; std::atomic<bool> quit_{false};
    std::atomic<long long> inBlock_{-1};
    std::atomic<long long> slotBlock_[kSlots];
    bool threaded_ = false;
};

class FxBus final : public Params {
public:
    enum { P_ECHO, P_SPACE, P_FILTER, P_TIME, P_FEEDBACK, P_ON, kNumParams };
    FxBus();
    ~FxBus() override;
    void prepare(float sampleRate);                 // allocates, builds the reverb, starts the worker
    void setThreaded(bool on) { rev_.setThreaded(on); }
    void setTempo(float bpm) { bpm_ = bpm; updateTargets(); }
    void process(float* L, float* R, int n);        // in place
    bool enabled() const { return on_; }
    void setEnabled(bool on) { set(P_ON, on ? 1.f : 0.f); }
    bool active() const;                            // anything audible (for the light)
    int lateBlocks() const { return rev_.lateBlocks(); }

    int numParams() const override { return kNumParams; }
    const ParamInfo& param(int i) const override;
    float get(int i) const override { return v_[i]; }
    void set(int i, float value) override;
    int numPages() const override { return 2; }
    const Page& page(int p) const override;
    void format(int i, char* buf, int len) const override;

private:
    struct Smooth { float v = 0, target = 0, coef = 0; void tau(float t, float sr); float next(); void snap(float x) { v = target = x; } };
    float sr_ = 44100.f, bpm_ = 120.f;
    float v_[kNumParams];
    bool on_ = true;
    // echo
    std::vector<float> dlL_, dlR_; int dlW_ = 0;
    float dToneC_[5]{}, dToneZ_[2][2]{};
    Smooth dlTime_, fb_, eSend_, sSend_, eRet_, sRet_, lpF_, hpF_;
    // space
    TailReverb rev_;
    float rHpC_[5]{}, rHpZ_[2][2]{};
    // filter
    float mLpC_[5]{}, mHpC_[5]{}, mLpZ_[2][2]{}, mHpZ_[2][2]{}; float lastLp_ = -1, lastHp_ = -1;
    static constexpr int kBlock = 256;
    float rInL_[kBlock]{}, rInR_[kBlock]{}, wetL_[kBlock]{}, wetR_[kBlock]{};
    void updateTargets();
    float filterAmount() const;
};

} // namespace akai
