// drumprobe <out.f32> <kind 0..5> <kit> <vel> <tune> <decay> <tone> [hitTimes...]
#include "blonda/drums.hpp"
#include <cstdio>
#include <cstdlib>
#include <vector>
using namespace blonda;
int main(int argc, char** argv) {
    DrumTrack d; d.prepare(48000, (DrumKind)atoi(argv[2])); d.setKit(argv[3]);
    d.params = {(float)atof(argv[5]), (float)atof(argv[6]), (float)atof(argv[7])}; float vel = atof(argv[4]);
    std::vector<long> hits; for (int i = 8; i < argc; ++i) hits.push_back((long)(atof(argv[i]) * 48000)); if (hits.empty()) hits.push_back(2400);
    const int N = 48000 * 2; std::vector<float> m(N, 0.f);
    for (int i = 0; i < N; i += 128) { int fr = std::min(128, N - i); for (long h : hits) if (h >= i && h < i + fr) d.trigger(vel, (int)(h - i)); d.process(&m[i], fr); }
    FILE* f = fopen(argv[1], "wb"); for (float s : m) { fwrite(&s, 4, 1, f); fwrite(&s, 4, 1, f); } fclose(f);
}
