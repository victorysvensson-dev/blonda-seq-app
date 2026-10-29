#include "blonda/convolver.hpp"
#include <cstdio>
#include <vector>
int main(int, char** argv) {   // convtest in.f32(stereo) ir.f32(stereo) out.f32
    auto rd = [](const char* p) { FILE* f = fopen(p, "rb"); std::vector<float> x; float v; while (fread(&v, 4, 1, f) == 1) x.push_back(v); fclose(f); return x; };
    auto x = rd(argv[1]), h = rd(argv[2]); const int n = x.size() / 2, m = h.size() / 2;
    std::vector<float> hl(m), hr(m), l(n), r(n), ol(n, 0), orr(n, 0); for (int i = 0; i < m; ++i) { hl[i] = h[2 * i]; hr[i] = h[2 * i + 1]; } for (int i = 0; i < n; ++i) { l[i] = x[2 * i]; r[i] = x[2 * i + 1]; }
    blonda::Convolver c; c.setIR(hl.data(), hr.data(), m, 48000);
    for (int i = 0; i < n; i += 128) c.process(&l[i], &r[i], &ol[i], &orr[i], std::min(128, n - i));
    FILE* o = fopen(argv[3], "wb"); for (int i = 0; i < n; ++i) { fwrite(&ol[i], 4, 1, o); fwrite(&orr[i], 4, 1, o); } fclose(o);
}
