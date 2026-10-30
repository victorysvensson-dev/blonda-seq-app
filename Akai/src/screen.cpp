// BLONDA AKAI — the 320x240 instrument screen.
#include "akai/screen.hpp"
#include <cstdio>
#include <cstring>

namespace akai {

using namespace gfx;

const Theme kThemeSkarp = {"SKARP", 0x05080B, 0xF2F4F5, 0xF2CF1F, 0x49C9EE, 0x1A232C, 0x2FA9DA, 0xEED52C,
                           0xC9AE1A, 0x49C9EE, 0x173847, 0xFFFFFF, false, true};
const Theme kThemeBlonda = {"BLONDA", 0x17181A, 0xE8E6DC, 0xE9C54A, 0x227E7A, 0x2A2B2E, 0x227E7A, 0xE9C54A,
                            0x3A3B3E, 0xE9C54A, 0x5C4F24, 0xE8E6DC, true, false};
const Theme& themeByIndex(int i) { return i == 1 ? kThemeBlonda : kThemeSkarp; }

namespace {
int dotOf(const Theme& t, int pitch) { return t.dotFont && pitch >= 3 ? pitch - 1 : pitch; }   // dot matrix only for large text
int text(Canvas& c, const Theme& t, int x, int y, const char* s, int pitch, uint32_t col) { return c.text(x, y, s, pitch, dotOf(t, pitch), col); }
void rightText(Canvas& c, const Theme& t, int right, int y, const char* s, int pitch, uint32_t col) { text(c, t, right - Canvas::textWidth(s, pitch), y, s, pitch, col); }
void centreText(Canvas& c, const Theme& t, int x0, int w, int y, const char* s, int pitch, uint32_t col) {
    text(c, t, x0 + (w - Canvas::textWidth(s, pitch)) / 2, y, s, pitch, col);
}
// Fit a label into w pixels: largest pitch that fits (2, then 1).
int fitPitch(const char* s, int w, int want) { for (int p = want; p > 1; --p) if (Canvas::textWidth(s, p) <= w) return p; return 1; }
void hline(Canvas& c, int x0, int x1, int y, int th, uint32_t col) { c.rect(x0, y, x1 - x0, th, col); }
void frame(Canvas& c, int x, int y, int w, int h, uint32_t col, bool solid) {
    if (solid) { c.rect(x, y, w, 1, col); c.rect(x, y + h - 1, w, 1, col); c.rect(x, y, 1, h, col); c.rect(x + w - 1, y, 1, h, col); return; }
    for (int i = x; i < x + w; i += 4) { c.rect(i, y, 2, 1, col); c.rect(i, y + h - 1, 2, 1, col); }
    for (int j = y; j < y + h; j += 4) { c.rect(x, j, 1, 2, col); c.rect(x + w - 1, j, 1, 2, col); }
}
// shorten to n characters (UTF-8 aware enough for Latin-1 names)
void clip(char* dst, size_t cap, const char* src, int n) {
    size_t i = 0; int chars = 0;
    while (src[i] && chars < n && i + 2 < cap) { const unsigned char ch = (unsigned char)src[i]; const int len = ch < 0x80 ? 1 : ((ch & 0xE0) == 0xC0 ? 2 : 1);
        for (int k = 0; k < len && src[i]; ++k) dst[i] = src[i], ++i; ++chars; }
    dst[i] = 0;
}
} // namespace

void drawScreen(Canvas& c, const UiState& s, const Theme& t) {
    c.fill(t.bg);
    char buf[48], a[24];

    // ---- top: tabs for B1 B2 B3 (the buttons above the screen)
    const int tw = 100, gap = 10, x0s[3] = {5, 5 + tw + gap, 5 + 2 * (tw + gap)};
    char tabs[3][24];
    // 7 characters + arrow fit a tab at the same size on all three
    auto trimTo = [](char* d, size_t cap, const char* src) { clip(d, cap, src, 7); size_t n = std::strlen(d); while (n && d[n - 1] == ' ') d[--n] = 0; };
    trimTo(a, sizeof a, s.prevPage); std::snprintf(tabs[0], sizeof tabs[0], "<%s", a);
    trimTo(a, sizeof a, s.nextPage); std::snprintf(tabs[1], sizeof tabs[1], "%s>", a);
    std::snprintf(tabs[2], sizeof tabs[2], "%s", s.shift ? "<INSTR" : "INSTR>");
    for (int k = 0; k < 3; ++k) {
        centreText(c, t, x0s[k], tw, 6, tabs[k], 2, t.text);
        hline(c, x0s[k] + 8, x0s[k] + tw - 8, 23, 2, t.line);
    }

    // ---- instrument line
    int x = text(c, t, 6, 32, s.instrument, 2, t.label);
    if (s.latch) text(c, t, x + 10, 32, "LATCH", 2, t.accent);
    if (s.shift) std::snprintf(buf, sizeof buf, "CPU %d%% V%d", (int)(s.cpu * 100.f + 0.5f), s.voices);
    else std::snprintf(buf, sizeof buf, "%02d/%02d", s.presetIndex + 1, s.presetCount);
    rightText(c, t, kScreenW - 6, 32, buf, 2, s.shift ? t.label : t.text);
    // the sound's category (BASS, PAD ...) left of the counter, when it says more than the instrument name
    if (!s.shift && s.category[0] && std::strcmp(s.category, s.instrument) != 0 && !s.latch) {
        const int cw = Canvas::textWidth(s.category, 2), right = kScreenW - 6 - Canvas::textWidth(buf, 2) - 10;
        if (right - cw > x + 8) text(c, t, right - cw, 32, s.category, 2, t.dim == t.bg ? t.label : t.line);
    }

    // ---- preset name: large yellow dot matrix in every theme
    const int pitch = Canvas::length(s.preset) <= 16 ? 3 : 2;
    c.text(6, 52 + (3 - pitch) * 3, s.preset, pitch, pitch - 1 > 0 ? pitch - 1 : 1, t.accent);

    // ---- waveform box: page name, key, live output
    const int bx = 4, by = 84, bw = kScreenW - 8, bh = 76;
    frame(c, bx, by, bw, bh, t.box, t.boxOutline);
    std::snprintf(buf, sizeof buf, "%s %d/%d", s.page, s.pageIndex + 1, s.pageCount);
    text(c, t, bx + 6, by + 5, buf, 1, t.text);
    if (s.inKey) std::snprintf(buf, sizeof buf, "%s %s %+d", s.root, s.scale, s.octave);
    else std::snprintf(buf, sizeof buf, "%s CHROM %+d", s.root, s.octave);
    rightText(c, t, bx + bw - 6, by + 5, buf, 1, t.label);
    // NOTE REPEAT and FX state in the middle of the box header
    if (s.padFx) centreText(c, t, bx, bw, by + 5, s.padFxText, 1, t.hot);
    else if (s.repeat[0] || s.fxOff) {
        std::snprintf(buf, sizeof buf, "%s%s%s", s.repeat, s.repeat[0] && s.fxOff ? "  " : "", s.fxOff ? "FX OFF" : "");
        centreText(c, t, bx, bw, by + 5, buf, 1, t.accent);
    }
    const int sy = by + 16, sh = bh - 20, mid = sy + sh / 2, sx = bx + (bw - 2 * UiState::kScopeCols) / 2;
    for (int i = sx; i < sx + 2 * UiState::kScopeCols; i += 4) c.rect(i, mid, 2, 1, t.dim);
    int peakv = 24;   // auto-scale so quiet sounds still fill the box (but silence stays flat)
    for (int k = 0; k < UiState::kScopeCols; ++k) { const int m = s.scopeMax[k] > -s.scopeMin[k] ? s.scopeMax[k] : -s.scopeMin[k]; if (m > peakv) peakv = m; }
    for (int k = 0; k < UiState::kScopeCols; ++k) {
        int lo = mid - s.scopeMax[k] * (sh / 2 - 1) / peakv, hi = mid - s.scopeMin[k] * (sh / 2 - 1) / peakv;
        if (hi < lo) { const int tmp = lo; lo = hi; hi = tmp; }
        if (hi == lo) continue;
        c.rect(sx + 2 * k, lo, 2, hi - lo + 1, t.scope);
    }
    if (s.toast[0]) {
        const int w = Canvas::textWidth(s.toast, 2) + 16;
        c.rect(bx + (bw - w) / 2, mid - 11, w, 22, t.bg);
        frame(c, bx + (bw - w) / 2, mid - 11, w, 22, t.accent, true);
        centreText(c, t, bx, bw, mid - 7, s.toast, 2, t.accent);
    }

    // ---- bottom: K1 K2 K3 (the knobs below the screen)
    for (int k = 0; k < 3; ++k) {
        const int kx = x0s[k], kw = tw;
        if (!s.used[k]) { hline(c, kx + 8, kx + kw - 8, 234, 2, t.dim); continue; }
        const bool hot = s.activeKnob == k;
        const uint32_t nameCol = hot ? t.hot : t.label, valCol = hot ? t.hot : t.accent;
        const int pn = fitPitch(s.paramName[k], kw, 2);
        centreText(c, t, kx, kw, 168 + (2 - pn) * 3, s.paramName[k], pn, nameCol);
        const int pv = Canvas::textWidth(s.paramValue[k], 3) <= kw ? 3 : 2;
        centreText(c, t, kx, kw, 186 + (3 - pv) * 3, s.paramValue[k], pv, valCol);
        // value bar: dots (BLONDA) or a cyan line with a filled part (MPC)
        const int barX = kx + 8, barW = kw - 16;
        if (t.dotFont) c.bar(barX + 2, 214, 11, 8, 5, s.paramNorm[k], hot ? t.hot : t.barOn, t.barOff);
        else { hline(c, barX, barX + barW, 216, 3, t.barOff); hline(c, barX, barX + (int)(barW * s.paramNorm[k] + 0.5f), 216, 3, hot ? t.hot : t.barOn); }
        hline(c, kx + 8, kx + kw - 8, 234, 2, t.line);
    }

    // output peak at the right edge
    const int lit = (int)(s.peak * 10.f + 0.5f);
    for (int i = 0; i < 10; ++i) c.rect(kScreenW - 3, by + bh - 8 - i * 7, 2, 5, i < lit ? (i >= 8 ? t.hot : t.line) : t.dim);
}

} // namespace akai
