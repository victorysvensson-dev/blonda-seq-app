// BLONDA AKAI — the 320x240 instrument screen.
#include "akai/screen.hpp"
#include <cstdio>
#include <cstring>

namespace akai {

using namespace gfx;

namespace {
void rightText(Canvas& c, int right, int y, const char* s, int pitch, int dot, uint32_t col) {
    c.text(right - Canvas::textWidth(s, pitch), y, s, pitch, dot, col);
}
void centreText(Canvas& c, int x0, int w, int y, const char* s, int pitch, int dot, uint32_t col) {
    c.text(x0 + (w - Canvas::textWidth(s, pitch)) / 2, y, s, pitch, dot, col);
}
void dottedLine(Canvas& c, int y, uint32_t col) { for (int x = 8; x < c.w - 8; x += 4) c.rect(x, y, 2, 2, col); }
} // namespace

void drawScreen(Canvas& c, const UiState& s) {
    c.fill(kBg);
    char buf[48];

    // header: BLONDA · instrument            octave / scale (SHIFT: cpu, voices)
    int x = c.text(8, 8, "BLONDA", 2, 2, kYellow);
    c.text(x + 12, 8, s.instrument, 2, 2, kCream);
    if (s.shift) std::snprintf(buf, sizeof buf, "CPU %d%% V%d", (int)(s.cpu * 100.f + 0.5f), s.voices);
    else if (s.inKey) std::snprintf(buf, sizeof buf, "%s %s %+d", s.root, s.scale, s.octave);
    else std::snprintf(buf, sizeof buf, "%s OCT %+d", s.root, s.octave);
    rightText(c, c.w - 8, 8, buf, 2, 2, s.shift ? kTeal : kCream);

    // category + preset number
    c.text(8, 32, s.category, 2, 2, kTeal);
    std::snprintf(buf, sizeof buf, "%02d/%02d", s.presetIndex + 1, s.presetCount);
    rightText(c, c.w - 8, 32, buf, 2, 2, kTeal);
    if (s.latch) rightText(c, c.w - 8 - Canvas::textWidth(buf, 2) - 14, 32, "LATCH", 2, 2, kYellow);

    // preset name, large dot matrix (falls back to the small size for long names)
    const int len = Canvas::length(s.preset);
    if (len <= 16) c.text(8, 52, s.preset, 3, 2, kYellow);
    else c.text(8, 58, s.preset, 2, 2, kYellow);

    dottedLine(c, 84, kDimDot);

    // page title, or a short message
    if (s.toast[0]) c.text(8, 96, s.toast, 2, 2, kYellow);
    else {
        c.text(8, 96, s.page, 2, 2, kCream);
        std::snprintf(buf, sizeof buf, "%d/%d", s.pageIndex + 1, s.pageCount);
        rightText(c, c.w - 8, 96, buf, 2, 2, kCream);
    }

    // three parameters on K1 K2 K3
    for (int k = 0; k < 3; ++k) {
        const int x0 = 8 + k * 104, w = 96;
        if (!s.used[k]) { c.bar(x0, 186, 12, 8, 5, 0.f, kDimDot, kDimDot); continue; }
        const bool hot = s.activeKnob == k;
        c.text(x0, 122, s.paramName[k], 2, 2, hot ? kCream : kTeal);
        const int pitch = Canvas::textWidth(s.paramValue[k], 3) <= w ? 3 : 2;
        c.text(x0, 146, s.paramValue[k], pitch, pitch - 1, hot ? kCream : kYellow);
        c.bar(x0, 186, 12, 8, 5, s.paramNorm[k], hot ? kCream : kYellow, kDimYellow);
    }

    // soft-key labels for B1 B2 B3
    const char* tabs[3] = {"< PAGE", "PAGE >", s.shift ? "< INSTR" : "INSTR >"};
    for (int k = 0; k < 3; ++k) {
        const int x0 = 8 + k * 104, w = 96;
        c.rect(x0, 210, w, 22, kTeal);
        centreText(c, x0, w, 214, tabs[k], 2, 2, kBg);
    }

    // output peak: one dot column at the right edge (red-free palette: cream when close to clipping)
    const int lit = (int)(s.peak * 10.f + 0.5f);
    for (int i = 0; i < 10; ++i) c.rect(c.w - 4, 200 - i * 10, 2, 6, i < lit ? (i >= 8 ? kCream : kTeal) : kDimDot);
}

} // namespace akai
