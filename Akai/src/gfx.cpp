#include "akai/gfx.hpp"

namespace akai::gfx {

namespace {
// Decode one UTF-8 code point (Latin-1 range is all we draw); advances s.
unsigned next(const char*& s) {
    const unsigned char c = (unsigned char)*s;
    if (c < 0x80) { ++s; return c; }
    if ((c & 0xE0) == 0xC0 && s[1]) { const unsigned cp = ((c & 0x1Fu) << 6) | ((unsigned char)s[1] & 0x3Fu); s += 2; return cp; }
    // longer sequences: skip them and draw '?'
    int n = (c & 0xF0) == 0xE0 ? 3 : ((c & 0xF8) == 0xF0 ? 4 : 1);
    while (n-- > 0 && *s) ++s;
    return '?';
}
} // namespace

int Canvas::length(const char* s) { int n = 0; while (*s) { next(s); ++n; } return n; }
int Canvas::textWidth(const char* s, int pitch) { const int n = length(s); return n > 0 ? n * 6 * pitch - pitch : 0; }

int Canvas::text(int x, int y, const char* s, int pitch, int dot, uint32_t c) {
    if (dot < 1) dot = 1;
    while (*s) {
        const unsigned cp = next(s);
        for (int r = 0; r < 7; ++r) {
            const uint8_t bits = glyphRow(cp, r);
            for (int col = 0; col < 5; ++col)
                if (bits & (0x10 >> col)) rect(x + col * pitch, y + r * pitch, dot, dot, c);
        }
        x += 6 * pitch;
    }
    return x;
}

void Canvas::bar(int x, int y, int n, int pitch, int dot, float norm, uint32_t on, uint32_t off) {
    if (norm < 0.f) norm = 0.f;
    if (norm > 1.f) norm = 1.f;
    const int lit = (int)(norm * n + 0.5f);
    for (int i = 0; i < n; ++i) rect(x + i * pitch, y, dot, dot, i < lit ? on : off);
}

} // namespace akai::gfx
