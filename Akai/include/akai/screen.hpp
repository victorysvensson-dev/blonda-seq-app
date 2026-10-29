// BLONDA AKAI — draws the instrument screen from a UiState snapshot.
#pragma once
#include "akai/app.hpp"
#include "akai/gfx.hpp"

namespace akai {

constexpr int kScreenW = 320, kScreenH = 240;
void drawScreen(gfx::Canvas& canvas, const UiState& state);

} // namespace akai
