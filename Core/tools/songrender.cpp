// songrender <project.json> <seconds> <out.f32> [pattern]  -- plays the project from the top and writes stereo float32
#include "blonda/seq3.hpp"
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <sstream>
#include <memory>
#include <chrono>
int main(int argc, char** argv) {
    std::ifstream f(argv[1]); std::stringstream ss; ss << f.rdbuf();
    blonda::Project p; std::string err; if (!p.loadJSON(ss.str(), &err)) { fprintf(stderr, "load: %s\n", err.c_str()); return 1; }
    if (argc > 4) p.pat = atoi(argv[4]);
    auto e = std::make_unique<blonda::Seq3>(); e->prepare(48000); e->load(p);
    const int N = (int)(atof(argv[2]) * 48000); std::vector<float> L(N), R(N);
    std::vector<float> bus; if (getenv("DUMP_BUS")) e->dbgBus = &bus;
    std::vector<float> inb; if (getenv("IN_BUS")) { FILE* fi = fopen(getenv("IN_BUS"), "rb"); float v; while (fread(&v, 4, 1, fi) == 1) inb.push_back(v); fclose(fi); e->dbgInBus = &inb; }
    e->play();
    auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < N; i += 256) e->render(&L[i], &R[i], std::min(256, N - i));
    double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
    fprintf(stderr, "rendered %.1f s in %.0f ms (%.1fx realtime)\n", N / 48000.0, ms, N / 48000.0 / (ms / 1000));
    if (getenv("DUMP_BUS")) { FILE* b = fopen(getenv("DUMP_BUS"), "wb"); fwrite(bus.data(), 4, bus.size(), b); fclose(b); }
    FILE* o = fopen(argv[3], "wb"); for (int i = 0; i < N; ++i) { fwrite(&L[i], 4, 1, o); fwrite(&R[i], 4, 1, o); } fclose(o);
}
