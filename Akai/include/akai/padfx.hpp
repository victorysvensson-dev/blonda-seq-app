// BLONDA AKAI — PAD FX: BLONDA's Max for Live effects played from the pads, on top of the synth.
//
// PAD FX turns the 16 pads into effect pads (notes that are latched or arpeggiating keep playing). An effect
// is on while its pad is held; pad pressure pushes it further. Several pads can be held, up to three at once.
// The effects come from the shared engine library (blonda-motor 0.2: the same GenExpr as the plugins):
//
//   row 4  13 EKO       14 RUM        15 SVÄV       16 BAND        (EKO / RUM are throws: the tail rings on)
//   row 3   9 FRYS      10 FRYS BAK   11 OKTAV NER  12 OKTAV UPP
//   row 2   5 SLITEN     6 CRUSH       7 WOBBLE      8 DRIVE
//   row 1   1 LP SWEEP   2 HP SWEEP    3 LP WOBBLE   4 CHOP
//
// Effects fade in and out over ~15 ms; an effect that is let go keeps running silently until its buffers are
// clean, so the next press starts fresh. FRYS listens all the time while PAD FX is on, so it has something
// to freeze the moment its pad is hit. Real-time safe: every effect is created in prepare().
#pragma once
#include <cstdint>
#include <memory>

namespace blonda { class Effect; }

namespace akai {

class PadFx {
public:
    static constexpr int kPads = 16, kMaxHeld = 3;
    PadFx();
    ~PadFx();
    void prepare(float sampleRate);           // allocates every effect
    void setTempo(float bpm);
    void setActive(bool on);                  // PAD FX mode (FRYS starts listening)
    bool active() const { return active_; }
    void press(int pad);
    void release(int pad);
    void releaseAll();
    void pressure(int pad, float amount);     // 0..1
    void process(float* L, float* R, int frames);   // in place

    static const char* label(int pad);
    static uint32_t colour(int pad);          // pad light (RGB) while idle
    static float cost(int pad);               // estimated share of one MPC Sample core while it runs
    float heldCost() const;                   // sum of cost() over the pads held now
    bool releaseOldest();                     // false when nothing is held
    bool held(int pad) const { return pad >= 0 && pad < kPads && slot_[pad].held; }
    bool running(int pad) const { return pad >= 0 && pad < kPads && slot_[pad == 9 ? 8 : pad].run; }
    int heldText(char* buf, int len) const;   // "LP SWEEP + EKO"; returns the number held

private:
    struct Slot {
        int engine = -1;
        bool held = false, run = false;
        float gain = 0.f;                     // insert: wet amount; throw: send
        float press = 0.f, pressS = 0.f;      // pad pressure, smoothed
        long long tail = 0;                   // insert: samples flushed after release; throw: quiet samples
        long long since = 0;                  // throw: samples since release (capped)
        uint32_t order = 0;
    };
    Slot slot_[kPads];
    struct Engine;
    std::unique_ptr<Engine[]> eng_;
    int nEng_ = 0;
    float sr_ = 44100.f;
    bool active_ = false;
    uint32_t order_ = 0;
    static constexpr int kBlock = 128;
    float aL_[kBlock], aR_[kBlock];
    void applyParams(int pad, bool on);
    void runSlot(int pad, float* L, float* R, int n);
};

} // namespace akai
