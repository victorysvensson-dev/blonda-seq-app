// BLONDA AKAI — hardware-independent control helpers: knob takeover and pad note layouts.
#pragma once
#include <cstdint>

namespace akai {

// "Scaled" takeover for absolute knobs: when the knob and the parameter disagree (after a page or preset
// change), turning the knob moves the value proportionally towards the end you turn to, so nothing jumps and
// both meet at the end stops. Positions and values are 0..1.
struct ScaledKnob {
    float last = -1.f;   // last physical position, < 0 = unknown
    // returns the new value for `value` after the knob moved to `pos`
    float move(float pos, float value) {
        if (last < 0.f) { last = pos; return value; }          // first message only tells us where the knob is
        const float from = last; last = pos;
        if (pos > from) return from >= 1.f ? 1.f : value + (1.f - value) * (pos - from) / (1.f - from);
        if (pos < from) return from <= 0.f ? 0.f : value - value * (from - pos) / from;
        return value;
    }
};

// Pads -> notes. Pad index 0..15 (0 = bottom-left, left to right, rows going up, like MPC pad numbers 1..16).
struct Scale { const char* name; int n; int steps[12]; };
constexpr Scale kScales[] = {
    {"MAJOR", 7, {0, 2, 4, 5, 7, 9, 11}},
    {"MINOR", 7, {0, 2, 3, 5, 7, 8, 10}},
    {"DORIAN", 7, {0, 2, 3, 5, 7, 9, 10}},
    {"HARM MIN", 7, {0, 2, 3, 5, 7, 8, 11}},
    {"PENTA", 5, {0, 2, 4, 7, 9}},
    {"MIN PENTA", 5, {0, 3, 5, 7, 10}},
};
constexpr int kNumScales = (int)(sizeof(kScales) / sizeof(kScales[0]));
constexpr const char* kNoteNames[12] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};

struct PadLayout {
    bool inKey = false;   // false: chromatic (16 semitones), true: only notes of the scale
    int root = 0;         // 0 = C
    int octave = 0;       // pad 1 = root + 12 * (4 + octave)  -> octave 0 starts at C3 (MIDI 48)
    int scale = 0;

    int note(int pad) const {
        const int base = 12 * (4 + octave) + root;
        int n;
        if (!inKey) n = base + pad;
        else { const Scale& s = kScales[scale]; n = base + 12 * (pad / s.n) + s.steps[pad % s.n]; }
        return n < 0 ? 0 : (n > 127 ? 127 : n);
    }
    // 0 = not in the scale, 1 = in the scale, 2 = root
    int degree(int pad) const {
        const int pc = ((note(pad) - root) % 12 + 12) % 12;
        if (pc == 0) return 2;
        const Scale& s = kScales[scale];
        for (int i = 0; i < s.n; ++i) if (s.steps[i] == pc) return 1;
        return 0;
    }
};

} // namespace akai
