#include "akai/surface.hpp"

namespace akai::mpcs {

int padIndexFromNote(int note) {
    for (int i = 0; i < 16; ++i) if (kPadNotes[i] == note) return i;
    return -1;
}

namespace {
struct Btn { uint8_t note; const char* name; uint8_t led; };   // led: 0 none, 1 single, 2 bicolour
const Btn kButtons[] = {
    {BTN_KNOB_FX, "KNOB FX", 2}, {BTN_PAD_FX, "PAD FX", 2}, {BTN_SAMPLE, "SAMPLE", 2}, {BTN_SEQ, "SEQ", 2},
    {BTN_ERASE, "ERASE", 2}, {BTN_NOTE_REPEAT, "NOTE REPEAT", 1}, {BTN_B1, "B1", 0}, {BTN_B2, "B2", 0}, {BTN_B3, "B3", 0},
    {BTN_PAD_BANK, "PAD BANK", 1}, {BTN_SAMPLE_SELECT, "SAMPLE SELECT", 2}, {BTN_16_LEVELS, "16 LEVELS", 2},
    {BTN_MUTE, "MUTE", 2}, {BTN_SHIFT, "SHIFT", 1}, {BTN_TAP_TEMPO, "TAP TEMPO", 2}, {BTN_PLUS, "PLUS", 1},
    {BTN_MINUS, "MINUS", 1}, {BTN_SAMPLE_RECORD, "SAMPLE RECORD", 1}, {BTN_LOOP, "LOOP", 2}, {BTN_CHOP, "CHOP", 2},
    {BTN_SEQ_RECORD, "SEQ RECORD", 1}, {BTN_STOP, "STOP", 1}, {BTN_PLAY, "PLAY", 1}, {BTN_ENCODER_PUSH, "ENCODER", 0},
};
const Btn* find(int note) { for (const Btn& b : kButtons) if (b.note == note) return &b; return nullptr; }
} // namespace

const char* buttonName(int note) { const Btn* b = find(note); return b ? b->name : nullptr; }
bool buttonHasLed(int note) { const Btn* b = find(note); return b && b->led; }
bool buttonLedIsBicolour(int note) { const Btn* b = find(note); return b && b->led == 2; }

bool decode(const MidiMsg& m, Event& e) {
    e = Event{};
    const int ch = m.channel(), t = m.type();
    if (ch == 10) {
        const int pad = padIndexFromNote(m.d1);
        if (pad < 0) return false;
        e.id = (uint8_t)pad;
        if (t == 0x90 && m.d2 > 0) { e.type = Event::PadDown; e.value = m.d2; return true; }
        if (t == 0x80 || (t == 0x90 && m.d2 == 0)) { e.type = Event::PadUp; return true; }
        if (t == 0xA0) { e.type = Event::PadPressure; e.value = m.d2; return true; }
        return false;
    }
    if (ch == 1) {
        if (t == 0x90 && m.d2 > 0) { e.type = Event::ButtonDown; e.id = m.d1; return true; }
        if (t == 0x80 || (t == 0x90 && m.d2 == 0)) { e.type = Event::ButtonUp; e.id = m.d1; return true; }
        if (t == 0xB0) {
            e.id = m.d1;
            if (m.d1 == CC_ENCODER) { e.type = Event::Encoder; e.delta = (int8_t)encoderDelta(m.d2); return e.delta != 0; }
            if (m.d1 >= CC_K1 && m.d1 <= CC_FADER) { e.type = Event::Knob; e.value = m.d2; return true; }
        }
    }
    return false;
}

int buttonLed(uint8_t* out, int button, int level) {
    if (level < 0) level = 0;
    if (level > 8) level = 8;
    out[0] = 0xB0; out[1] = (uint8_t)(button & 0x7F); out[2] = (uint8_t)level;
    return 3;
}

int padColour(uint8_t* out, int pad, uint8_t r8, uint8_t g8, uint8_t b8) {
    const uint8_t msg[12] = {0xF0, 0x47, 0x7F, 0x5C, 0x65, 0x00, 0x04, (uint8_t)(pad & 0x0F),
                             (uint8_t)(r8 >> 1), (uint8_t)(g8 >> 1), (uint8_t)(b8 >> 1), 0xF7};
    for (int i = 0; i < 12; ++i) out[i] = msg[i];
    return 12;
}

} // namespace akai::mpcs
