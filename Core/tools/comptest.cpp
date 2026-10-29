#include "blonda/dynamics.hpp"
#include <cstdio>
#include <cstdlib>
#include <vector>
int main(int argc, char** argv) {   // comptest in.f32(stereo) out.f32 thr knee ratio att rel
    FILE* f = fopen(argv[1], "rb"); std::vector<float> x; float v; while (fread(&v, 4, 1, f) == 1) x.push_back(v); fclose(f);
    blonda::WebCompressor c; c.prepare(48000); c.threshold = atof(argv[3]); c.knee = atof(argv[4]); c.ratio = atof(argv[5]); c.attack = atof(argv[6]); c.release = atof(argv[7]);
    const int n = (int)x.size() / 2; std::vector<float> l(n), r(n); for (int i = 0; i < n; ++i) { l[i] = x[2 * i]; r[i] = x[2 * i + 1]; }
    for (int i = 0; i < n; i += 128) c.process(&l[i], &r[i], std::min(128, n - i));
    FILE* o = fopen(argv[2], "wb"); for (int i = 0; i < n; ++i) { fwrite(&l[i], 4, 1, o); fwrite(&r[i], 4, 1, o); } fclose(o);
}
