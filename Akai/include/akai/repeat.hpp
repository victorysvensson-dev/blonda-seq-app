// BLONDA AKAI — NOTE REPEAT: note repeat and arpeggiator in time with TAP TEMPO.
//
// The app hands it the notes that are held (pads, latch, external keyboard) instead of playing them, and it
// plays them on a grid: REPEAT retriggers every held note on each step (like an MPC's note repeat), the ARP
// modes play one note per step. The grid starts on the first note, so the first hit is never late. Pad
// pressure sets the velocity of the repeats (MPC style). Real-time safe: fixed arrays, no allocation.
#pragma once
#include <cstdint>

namespace akai {

class Repeater {
public:
    enum Mode : uint8_t { Repeat, Up, Down, UpDown, Order, Random, kNumModes };
    static constexpr int kNumRates = 6;   // 1/4 1/8 1/8T 1/16 1/16T 1/32
    static const char* modeName(int m);
    static const char* rateName(int r);

    void prepare(float sampleRate) { sr_ = sampleRate; }
    void setTempo(float bpm) { bpm_ = bpm < 20.f ? 20.f : bpm; }
    void setRate(int r) { rate_ = r < 0 ? 0 : (r >= kNumRates ? kNumRates - 1 : r); }
    void setMode(int m) { mode_ = (Mode)((m % kNumModes + kNumModes) % kNumModes); idx_ = 0; }
    int rate() const { return rate_; }
    int mode() const { return mode_; }

    // held notes (sources)
    void add(int note, float velocity);
    void remove(int note);
    void setPressure(int note, float pressure);   // 0..1; above a touch it sets the repeat velocity
    void clear();                                 // forget every source (sounding notes still get their note-off)
    int numSources() const { return n_; }
    bool holds(int note) const { return find(note) >= 0; }
    float velocityOf(int note) const { const int k = find(note); return k >= 0 ? src_[k].vel : 0.8f; }

    // Note events for the next block of `frames`: on(note, velocity, offset), off(note, offset).
    template <class On, class Off> void process(int frames, On&& on, Off&& off);
    // Note-offs for everything sounding, now (repeat switched off, instrument change).
    template <class Off> void silence(Off&& off) { for (int i = 0; i < nSnd_; ++i) off(snd_[i], 0); nSnd_ = 0; pending_ = 0; }

    bool flash() const { return running_ && sinceStep_ < stepLen() * 0.25; }   // light on the beat of the grid

private:
    struct Src { int note; float vel, press; uint32_t order; };
    Src src_[16]; int n_ = 0; uint32_t orderCount_ = 0;
    int snd_[16]; int nSnd_ = 0;               // notes sounding from the last step
    int pend_[16]; int pending_ = 0;           // REPEAT: notes added between steps, played at the next block start
    float sr_ = 44100.f, bpm_ = 120.f;
    int rate_ = 3; Mode mode_ = Repeat;
    bool running_ = false;
    double untilStep_ = 0, untilOff_ = -1, sinceStep_ = 0;
    int idx_ = 0, lastArp_ = -1;
    uint32_t rng_ = 0x2545F491u;

    int find(int note) const { for (int i = 0; i < n_; ++i) if (src_[i].note == note) return i; return -1; }
    double stepLen() const;
    float vel(const Src& s) const { return s.press > 0.03f ? 0.15f + 0.85f * s.press : s.vel; }
    int arpNote();
};

// ---------------------------------------------------------------- implementation (templates)
template <class On, class Off> void Repeater::process(int frames, On&& on, Off&& off) {
    // notes added while running in REPEAT mode sound at once, then follow the grid
    for (int k = 0; k < pending_; ++k) {
        const int s = find(pend_[k]); if (s < 0) continue;
        on(src_[s].note, vel(src_[s]), 0);
        if (nSnd_ < 16) snd_[nSnd_++] = src_[s].note;
        if (untilOff_ < 0) untilOff_ = stepLen() * 0.5;
    }
    pending_ = 0;
    double pos = 0;   // position in this block
    for (;;) {
        const bool offDue = nSnd_ > 0 && untilOff_ >= 0;
        const double tOff = offDue ? untilOff_ : 1e300, tStep = running_ ? untilStep_ : 1e300;
        const double t = tOff < tStep ? tOff : tStep;
        if (pos + t >= frames) {   // nothing more in this block
            const double adv = frames - pos;
            if (offDue) untilOff_ -= adv;
            if (running_) untilStep_ -= adv;
            sinceStep_ += adv;
            break;
        }
        pos += t; sinceStep_ += t;
        if (offDue) untilOff_ -= t;
        if (running_) untilStep_ -= t;
        const int at = (int)pos;
        if (offDue && untilOff_ <= 0) { for (int i = 0; i < nSnd_; ++i) off(snd_[i], at); nSnd_ = 0; untilOff_ = -1; }
        if (running_ && untilStep_ <= 0) {
            for (int i = 0; i < nSnd_; ++i) off(snd_[i], at);
            nSnd_ = 0;
            if (n_ == 0) { running_ = false; untilOff_ = -1; continue; }
            if (mode_ == Repeat) { for (int i = 0; i < n_; ++i) { on(src_[i].note, vel(src_[i]), at); snd_[nSnd_++] = src_[i].note; } }
            else { const int k = arpNote(); if (k >= 0) { on(src_[k].note, vel(src_[k]), at); snd_[nSnd_++] = src_[k].note; } }
            const double len = stepLen();
            untilStep_ += len; untilOff_ = len * 0.5; sinceStep_ = 0;
        }
    }
}

} // namespace akai
