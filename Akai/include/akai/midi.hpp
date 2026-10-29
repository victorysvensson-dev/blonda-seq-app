// BLONDA AKAI — a small streaming MIDI 1.0 byte parser (running status, realtime bytes, SysEx skipped).
// Used for the MPC Sample's control surface and for external MIDI in (TRS, USB).
#pragma once
#include <cstdint>

namespace akai {

struct MidiMsg {
    uint8_t status = 0, d1 = 0, d2 = 0;
    int type() const { return status & 0xF0; }       // 0x80 note off, 0x90 note on, 0xA0 poly AT, 0xB0 CC, 0xC0 PC, 0xD0 ch AT, 0xE0 bend
    int channel() const { return (status & 0x0F) + 1; }   // 1..16
};

class MidiParser {
public:
    // Feed one byte; returns true and fills `out` when a complete channel message is ready.
    bool feed(uint8_t b, MidiMsg& out) {
        if (b >= 0xF8) return false;                             // realtime: ignore, keep running status
        if (b == 0xF0) { sysex_ = true; status_ = 0; return false; }
        if (b == 0xF7) { sysex_ = false; return false; }
        if (b >= 0xF1) { status_ = 0; sysex_ = false; return false; }   // system common: drop running status
        if (b & 0x80) { sysex_ = false; status_ = b; n_ = 0; return false; }
        if (sysex_ || !status_) return false;
        data_[n_++] = b;
        const int need = (status_ & 0xE0) == 0xC0 ? 1 : 2;      // program change / channel pressure: one data byte
        if (n_ < need) return false;
        out.status = status_; out.d1 = data_[0]; out.d2 = need == 2 ? data_[1] : 0;
        n_ = 0;                                                  // running status: next data bytes reuse status_
        return true;
    }
    void reset() { status_ = 0; n_ = 0; sysex_ = false; }
private:
    uint8_t status_ = 0, data_[2]{};
    int n_ = 0;
    bool sysex_ = false;
};

} // namespace akai
