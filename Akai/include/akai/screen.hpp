// BLONDA AKAI — draws the instrument screen from a UiState snapshot.
//
// Layout follows the hardware: B1 B2 B3 sit above the screen, so their tabs are at the top; K1 K2 K3 sit below
// it, so the three parameters are at the bottom. In between: instrument, preset and a live output waveform.
#pragma once
#include "akai/app.hpp"
#include "akai/gfx.hpp"

namespace akai {

constexpr int kScreenW = 320, kScreenH = 240;

struct Theme {
    const char* name;
    uint32_t bg, text, accent, label, dim, line, scope, box, barOn, barOff, hot, tabSelBg, tabSelText;
    bool dotFont;       // dot-matrix letters (BLONDA) or solid pixel letters
    bool boxOutline;    // solid outline around the waveform, or a dotted frame
};
extern const Theme kThemeBlonda;   // BLONDA palette (E9C54A, 17181A, 227E7A, E8E6DC), dot matrix
extern const Theme kThemeMpc;      // look inspired by the MPC Sample's own screen: deep blue-black, white, yellow, cyan

void drawScreen(gfx::Canvas& canvas, const UiState& state, const Theme& theme = kThemeBlonda);

} // namespace akai
