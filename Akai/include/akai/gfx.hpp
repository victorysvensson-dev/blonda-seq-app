// BLONDA AKAI — tiny software drawing for the 320x240 screen (XRGB8888), in the BLONDA dot-matrix style.
#pragma once
#include <cstdint>

namespace akai::gfx {

// BLONDA palette
constexpr uint32_t kBg = 0x17181A, kYellow = 0xE9C54A, kTeal = 0x227E7A, kCream = 0xE8E6DC;
constexpr uint32_t kDimDot = 0x2A2B2E, kDimYellow = 0x5C4F24, kDimTeal = 0x163F3D;

uint8_t glyphRow(unsigned codepoint, int row);   // 5 bits, MSB = leftmost column (font5x7.cpp)

struct Canvas {
    uint32_t* px = nullptr; int w = 0, h = 0, stride = 0;   // stride in pixels

    void fill(uint32_t c) { for (int y = 0; y < h; ++y) for (int x = 0; x < w; ++x) px[y * stride + x] = c; }
    void rect(int x0, int y0, int rw, int rh, uint32_t c) {
        for (int y = y0 < 0 ? 0 : y0; y < y0 + rh && y < h; ++y)
            for (int x = x0 < 0 ? 0 : x0; x < x0 + rw && x < w; ++x) px[y * stride + x] = c;
    }
    // Text. pitch = pixels per font dot; dot = size of the lit square inside each cell (pitch-1 gives the
    // dot-matrix look, pitch gives solid letters). Returns the x after the last character.
    int text(int x, int y, const char* utf8, int pitch, int dot, uint32_t c);
    static int textWidth(const char* utf8, int pitch);      // width in pixels (6 dots per character)
    static int length(const char* utf8);                    // characters (UTF-8 aware)
    // Dot bar: n dots, the first round(norm*n) lit.
    void bar(int x, int y, int n, int pitch, int dot, float norm, uint32_t on, uint32_t off);
};

} // namespace akai::gfx
