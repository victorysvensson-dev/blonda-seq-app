// Save/load round trip: edit through Host (like the app), save to the web JSON format, load again —
// the reloaded project must render bit-identically to the edited one.
#include "blonda/host.hpp"
#include <cstdio>
#include <fstream>
#include <memory>
#include <sstream>
#include <vector>

static std::vector<float> renderProj(const blonda::Project& p, double sec) {
    auto s = std::make_unique<blonda::Seq3>(); s->prepare(48000); s->load(p); s->play();
    std::vector<float> out; float L[128], R[128];
    for (int f = 0; f < (int)(sec * 48000); f += 128) { s->render(L, R, 128); out.insert(out.end(), L, L + 128); out.insert(out.end(), R, R + 128); }
    return out;
}

int main(int argc, char** argv) {
    std::ifstream f(argc > 1 ? argv[1] : "../App/Resources/default_project.json"); std::stringstream ss; ss << f.rdbuf();
    auto host = std::make_unique<blonda::Host>(); std::string err;
    if (!host->load(ss.str(), &err)) { std::puts(err.c_str()); return 2; }
    // edits like a user would make
    host->cycleStep(0, 3); host->cycleStep(1, 7); host->cycleStep(1, 7);   // drums: on, accent
    host->cycleStep(6, 0); host->cycleStep(8, 6); host->cycleStep(8, 6);   // melodic: add, accent->remove
    host->setParam(0, 2, 0, .61f); host->setParam(1, 6, 1, -.4f); host->setParam(2, 0, 5, .3f); host->setBPM(124); host->setMute(3, true);
    const std::string saved = host->toJSON();
    blonda::Project back; if (!back.loadJSON(saved, &err)) { std::printf("reload failed: %s\n", err.c_str()); return 1; }
    if (argc > 2) { std::ofstream(argv[2]) << saved; }
    const auto a = renderProj(host->ui, 6), b = renderProj(back, 6);
    double d = 0, e = 0; for (size_t i = 0; i < a.size(); ++i) { d = std::max(d, (double)std::fabs(a[i] - b[i])); e += (double)a[i] * a[i]; }
    std::printf("saved %zu bytes  bpm %.0f  max diff %.3g  rms %.4f\n", saved.size(), back.bpm, d, std::sqrt(e / a.size()));
    const bool ok = d == 0 && back.bpm == 124 && back.mute[3] && back.cells[0][0][3].v == 1;
    std::puts(ok ? "SAVETEST OK" : "SAVETEST FAIL");
    host->shutdown();
    return ok ? 0 : 1;
}
