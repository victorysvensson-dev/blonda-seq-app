// BLONDA AKAI — the MPC Sample (AC50) control surface: pads, buttons, knobs, fader, encoder and lights.
//
// The surface is a small microcontroller that speaks plain 3-byte MIDI to the main processor over a serial
// port, which Linux exposes as an ALSA raw-MIDI device. Facts below come from the public protocol notes in
// github.com/gospodindilly-ops/mpc-sample-lab (docs/control-surface-protocol.en.md, verified on hardware
// with firmware 1.3.0.12). This is an independent implementation, no code from that repository.
//
// Pure functions only: nothing here touches the hardware, so everything is unit-tested on the desktop.
#pragma once
#include "akai/midi.hpp"
#include <cstdint>

namespace akai::mpcs {

// ---- pads: channel 10. note per pad index 0..15 (pad 1 = bottom-left, MPC layout, rows go up)
constexpr uint8_t kPadNotes[16] = {37, 36, 42, 82, 40, 38, 46, 44, 48, 47, 45, 43, 49, 55, 51, 53};
int padIndexFromNote(int note);   // -1 if the note is not a pad

// ---- buttons: channel 1, note on 7F = press, note off = release. The LED for a button is CC <same number>.
enum Button : uint8_t {
    BTN_KNOB_FX = 0, BTN_PAD_FX = 1, BTN_SAMPLE = 6, BTN_SEQ = 7, BTN_ERASE = 9, BTN_NOTE_REPEAT = 11,
    BTN_B1 = 12, BTN_B2 = 13, BTN_B3 = 14, BTN_PAD_BANK = 35, BTN_SAMPLE_SELECT = 36, BTN_16_LEVELS = 40,
    BTN_MUTE = 43, BTN_SHIFT = 49, BTN_TAP_TEMPO = 53, BTN_PLUS = 54, BTN_MINUS = 55, BTN_SAMPLE_RECORD = 73,
    BTN_LOOP = 74, BTN_CHOP = 75, BTN_SEQ_RECORD = 80, BTN_STOP = 81, BTN_PLAY = 82, BTN_ENCODER_PUSH = 111,
};
const char* buttonName(int note);          // nullptr for unknown numbers
bool buttonHasLed(int note);
bool buttonLedIsBicolour(int note);
constexpr uint8_t kBankLedCC[8] = {57, 58, 59, 60, 61, 62, 63, 64};   // row of 8 LEDs (bank letters A-H, unverified)

// ---- analog controls: channel 1 CC. Knobs and fader are absolute 0..127, the encoder is relative.
enum Control : uint8_t { CC_K1 = 16, CC_K2 = 17, CC_K3 = 18, CC_MAIN_VOLUME = 19, CC_FADER = 20, CC_ENCODER = 100 };
inline int encoderDelta(int value) { return value > 64 ? value - 128 : value; }

// ---- decoded input
struct Event {
    enum Type : uint8_t { None, PadDown, PadUp, PadPressure, ButtonDown, ButtonUp, Knob, Encoder } type = None;
    uint8_t id = 0;        // pad index 0..15, button note, or CC number
    uint8_t value = 0;     // velocity / pressure / CC value (Knob) ; Encoder: see delta
    int8_t delta = 0;      // Encoder steps (+1 / -1)
};

// Decode one MIDI message from the surface port into a surface event (false if it is not one).
bool decode(const MidiMsg& m, Event& out);

// ---- output messages (return the number of bytes written into `out`)
int buttonLed(uint8_t* out, int button, int level);              // single: 0 off, 1 dim, 2 full ; bicolour: 0..8 = 3*A + B
int padColour(uint8_t* out, int pad, uint8_t r8, uint8_t g8, uint8_t b8);   // 8-bit colour, sent as 7-bit SysEx (12 bytes)

} // namespace akai::mpcs
