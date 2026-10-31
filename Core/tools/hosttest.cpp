// Stress test for blonda::Host: a UI thread hammers edits while an "audio" thread renders 256-frame blocks.
// Checks: no crash / data race (run under -fsanitize=thread), audio is finite and non-silent, the audible step
// advances in order, and edits made from the UI thread are heard.
#include "blonda/host.hpp"
#include <cstdio>
#include <fstream>
#include <sstream>
#include <thread>

int main(int argc, char** argv) {
    const char* path = argc > 1 ? argv[1] : "../App/Resources/default_project.json";
    std::ifstream f(path); if (!f) { std::fprintf(stderr, "cannot open %s\n", path); return 2; }
    std::stringstream ss; ss << f.rdbuf();
    blonda::Host host; host.sampleRate = 48000; std::string err;
    if (!host.load(ss.str(), &err)) { std::fprintf(stderr, "load: %s\n", err.c_str()); return 2; }

    std::atomic<bool> done{false}; std::atomic<long long> rendered{0};
    int scopeOk = 0;
    double peak = 0, sumsq = 0; bool finite = true; int stepChanges = 0, badOrder = 0, lastStep = -1;
    std::thread midi([&] { int k = 0; while (!done) { host.midiNoteOn(8, 60 + k % 7, .7f); std::this_thread::sleep_for(std::chrono::milliseconds(3)); host.midiNoteOff(8, 60 + k % 7); ++k; std::this_thread::sleep_for(std::chrono::milliseconds(40)); } });
    std::thread audio([&] {
        float L[256], R[256];
        const long long total = 48000LL * 12;   // 12 s
        for (long long fr = 0; fr < total; fr += 256) {
            host.render(L, R, 256);
            for (int i = 0; i < 256; ++i) { if (!std::isfinite(L[i]) || !std::isfinite(R[i])) finite = false; peak = std::max(peak, (double)std::fabs(L[i])); sumsq += (double)L[i] * L[i]; }
            const int s = host.currentStep();
            if (s != lastStep) { if (lastStep >= 0 && s >= 0 && s != (lastStep + 1) % 16) ++badOrder; lastStep = s; ++stepChanges; }
            rendered = fr + 256;
            std::this_thread::sleep_for(std::chrono::microseconds(50));
        }
        done = true;
    });
    // UI thread: start, then edit like a person (fast)
    host.togglePlay();
    int n = 0;
    while (!done) {
        const int k = n++;
        host.cycleStep(k % 10, (k * 7) % 16);
        if (k % 40 == 0) host.setBPM(110 + (k / 40) % 20);
        if (k % 97 == 0) host.setMute(3, (k / 97) % 2);
        if (k % 13 == 0) { host.noteOn(7, 57 + k % 12, .8f); }
        if (k % 300 == 299) host.selectPattern(0);
        if (k % 7 == 0) host.setParam(k % 3, k % 10, k % 7, (k % 100) / 100.f);
        if (k % 50 == 0) { static float sl[8192], sr[8192]; const int got = host.scope(sl, sr, 8192); double m = 0; for (int i = 0; i < got; ++i) m = std::max(m, (double)std::fabs(sl[i])); if (got == 8192 && rendered > 48000 && m > 1e-4) ++scopeOk; }
        host.collect();
        std::this_thread::sleep_for(std::chrono::microseconds(700));
    }
    audio.join(); midi.join(); host.shutdown();
    const double rms = std::sqrt(sumsq / rendered.load());
    std::printf("scope %d  ", scopeOk); std::printf("edits %d  peak %.3f  rms %.4f  finite %d  stepChanges %d  outOfOrder %d\n", n, peak, rms, finite, stepChanges, badOrder);
    const bool ok = finite && rms > 1e-3 && peak <= 1.05 && stepChanges > 80 && badOrder <= 2 && scopeOk > 5;
    std::puts(ok ? "HOSTTEST OK" : "HOSTTEST FAIL");
    return ok ? 0 : 1;
}
