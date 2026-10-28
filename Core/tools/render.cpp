// Offline renderer: plays scripted demos through the engines and writes 24-bit WAV files.
// Usage: render <out_dir>
#include "blonda/bris.hpp"
#include <cstdio>
#include <cstring>
#include <string>
#include <vector>
#include <functional>
#include <cmath>
#include <memory>
using namespace blonda;

static void writeWav(const std::string& path, const std::vector<float>& L, const std::vector<float>& R, int sr) {
    FILE* f = std::fopen(path.c_str(), "wb"); if (!f) { std::perror(path.c_str()); return; }
    const uint32_t n = (uint32_t)L.size(), data = n * 2 * 3;
    auto w32 = [&](uint32_t v) { std::fwrite(&v, 4, 1, f); }; auto w16 = [&](uint16_t v) { std::fwrite(&v, 2, 1, f); };
    std::fwrite("RIFF", 1, 4, f); w32(36 + data); std::fwrite("WAVEfmt ", 1, 8, f); w32(16); w16(1); w16(2); w32(sr); w32(sr * 6); w16(6); w16(24);
    std::fwrite("data", 1, 4, f); w32(data);
    for (uint32_t i = 0; i < n; ++i) for (float s : {L[i], R[i]}) {
        float c = std::max(-1.f, std::min(1.f, s)); int32_t v = (int32_t)std::lrint(c * 8388607.f);
        uint8_t b[3] = {(uint8_t)(v & 255), (uint8_t)((v >> 8) & 255), (uint8_t)((v >> 16) & 255)}; std::fwrite(b, 1, 3, f);
    }
    std::fclose(f);
}

struct Note { double t, len; int n; float v; int chord; };
struct Demo { std::string name, preset; float bpm, tone, seconds; std::vector<Note> notes; std::function<void(Bris&, double)> automate; };

static const BrisParams& preset(const std::string& name) {
    int c; const BrisPreset* p = brisPresets(c);
    for (int i = 0; i < c; ++i) if (name == p[i].name) return p[i].params;
    std::fprintf(stderr, "no preset %s\n", name.c_str()); return p[0].params;
}

static void chords(std::vector<Note>& out, double t0, double beat, const std::vector<std::vector<int>>& prog, double lenBeats) {
    double t = t0; for (auto& ch : prog) { for (int n : ch) out.push_back({t, lenBeats * beat * 0.95, n, 0.72f, (int)ch.size()}); t += lenBeats * beat; }
}
static void line(std::vector<Note>& out, double t0, double step, const char* pat, const std::vector<int>& notes, double gate = 0.8, int reps = 1) {
    int k = 0; for (int r = 0; r < reps; ++r) for (int i = 0; pat[i]; ++i) { if (pat[i] != '.') {
        out.push_back({t0 + (r * (int)std::strlen(pat) + i) * step, step * (pat[i] == '-' ? 2.0 : gate), notes[k % notes.size()], pat[i] == 'X' ? 1.f : 0.72f, 1}); ++k; } }
}

int main(int argc, char** argv) {
    const std::string dir = argc > 1 ? argv[1] : ".";
    const int sr = 48000;
    const std::vector<std::vector<int>> prog = {{57, 60, 64, 67}, {53, 57, 60, 64}, {55, 59, 62, 67}, {52, 55, 59, 62}};
    std::vector<Demo> demos;
    auto beatOf = [](float bpm) { return 60.0 / bpm; };
    { Demo d{"01_bris_pad", "Bris", 96, .45f, 11, {}, {}}; chords(d.notes, .2, beatOf(96), prog, 4); demos.push_back(d); }
    { Demo d{"02_molnbank", "Molnbank", 96, .45f, 11, {}, {}}; chords(d.notes, .2, beatOf(96), prog, 4); demos.push_back(d); }
    { Demo d{"03_juno_drom", "Juno dröm", 96, .45f, 11, {}, {}}; chords(d.notes, .2, beatOf(96), prog, 4); demos.push_back(d); }
    { Demo d{"04_epiano_bris", "Epiano bris", 100, .45f, 9, {}, {}}; double b = beatOf(100);
      for (int bar = 0; bar < 4; ++bar) for (double off : {0.0, 1.5, 3.0}) for (int n : prog[bar]) d.notes.push_back({.2 + (bar * 4 + off) * b, b * (off == 3.0 ? 0.9 : 1.3), n, off == 0 ? 0.9f : 0.7f, 4});
      demos.push_back(d); }
    { Demo d{"05_ladderbas", "Ladderbas", 118, .32f, 8.5f, {}, {}}; double s = beatOf(118) / 4;
      line(d.notes, .2, s, "X.x.x-.xX.x.x.xx", {33, 45, 33, 36, 33, 45, 40, 38, 36}, 0.7, 4); demos.push_back(d); }
    { Demo d{"06_acid", "Acid-ish", 124, .32f, 8.5f, {}, {}}; double s = beatOf(124) / 4;
      line(d.notes, .2, s, "XxxX.xXx.xXxx.Xx", {33, 33, 45, 36, 33, 43, 45, 31, 33, 48}, 0.55, 4);
      d.automate = [](Bris& b, double t) { b.params.cut = 0.12f + 0.25f * (float)(0.5 - 0.5 * std::cos(t * 0.8)); }; demos.push_back(d); }
    { Demo d{"07_glaspluck", "Glaspluck", 118, .45f, 9, {}, {}}; double s = beatOf(118) / 4;
      line(d.notes, .2, s, "x.xx.x.xx.x.x.xx", {69, 72, 76, 79, 81, 79, 76, 72, 65, 69, 72, 76}, 0.6, 4); demos.push_back(d); }
    { Demo d{"08_solo_sag", "Solo såg", 110, .55f, 9.5f, {}, {}}; double b = beatOf(110);
      int mel[] = {69, 72, 76, 74, 72, 71, 69, 67, 69}; double dur[] = {1, .5, 1.5, .5, .5, 1, 1, 1, 3}; double t = .2;
      for (int i = 0; i < 9; ++i) { d.notes.push_back({t, dur[i] * b * 0.98, mel[i], 0.8f, 1}); t += dur[i] * b; } demos.push_back(d); }
    { Demo d{"09_sample_hold", "Sample & hold", 118, .45f, 8, {}, {}}; d.notes.push_back({.2, 6.5, 45, 0.8f, 1}); demos.push_back(d); }
    { Demo d{"10_live_cutoff_sweep", "Bris", 96, .45f, 12, {}, {}}; for (int n : {57, 60, 64, 67, 71}) d.notes.push_back({.2, 10.5, n, 0.75f, 5});
      d.automate = [](Bris& b, double t) { b.params.cut = 0.25f + 0.55f * (float)(0.5 - 0.5 * std::cos(t * 0.9)); b.params.res = 0.3f; }; demos.push_back(d); }

    { FILE* j = std::fopen((dir + "/demos.json").c_str(), "w"); std::fprintf(j, "[");
      for (size_t k = 0; k < demos.size(); ++k) { auto& d = demos[k]; std::fprintf(j, "%s{\"name\":\"%s\",\"preset\":\"%s\",\"bpm\":%g,\"tone\":%g,\"seconds\":%g,\"auto\":%d,\"notes\":[", k ? "," : "", d.name.c_str(), d.preset.c_str(), d.bpm, d.tone, d.seconds, d.automate ? 1 : 0);
        for (size_t i = 0; i < d.notes.size(); ++i) { auto& n = d.notes[i]; std::fprintf(j, "%s[%.6f,%.6f,%d,%g,%d]", i ? "," : "", n.t, n.len, n.n, n.v, n.chord); } std::fprintf(j, "]}"); }
      std::fprintf(j, "]"); std::fclose(j); }
    std::vector<float> AL, AR; const int block = 128;
    std::printf("%-24s %8s %8s %8s %8s\n", "demo", "peak dB", "rms dB", "dc", "nan");
    for (auto& d : demos) {
        auto eng = std::make_unique<Bris>(); eng->prepare((float)sr); eng->params = preset(d.preset); eng->bpm = d.bpm; eng->trackTone = d.tone;
        const int N = (int)(d.seconds * sr); std::vector<float> L(N, 0.f), R(N, 0.f);
        struct Ev { long f; bool on; int n; float v; int c; float len; }; std::vector<Ev> ev;
        for (auto& n : d.notes) { ev.push_back({(long)(n.t * sr), true, n.n, n.v, n.chord, (float)n.len}); ev.push_back({(long)((n.t + n.len) * sr), false, n.n, 0, 1, 0.f}); }
        for (int i = 0; i < N; i += block) {
            const int fr = std::min(block, N - i);
            if (d.automate) d.automate(*eng, (double)i / sr);
            for (auto& e : ev) if (e.f >= i && e.f < i + fr) { if (e.on) eng->noteOn(e.n, e.v, (int)(e.f - i), e.c, e.len); else eng->noteOff(e.n, (int)(e.f - i)); }
            eng->process(&L[i], &R[i], fr);
        }
        double pk = 0, ss = 0, dc = 0; int nan = 0;
        for (int i = 0; i < N; ++i) { for (float s : {L[i], R[i]}) { if (!std::isfinite(s)) { ++nan; continue; } pk = std::max(pk, (double)std::fabs(s)); ss += s * s; dc += s; } }
        std::printf("%-24s %8.1f %8.1f %8.4f %8d\n", d.name.c_str(), 20 * std::log10(pk + 1e-12), 10 * std::log10(ss / (2.0 * N) + 1e-20), dc / (2.0 * N), nan);
        // per-demo file normalised to -3 dBFS peak for listening; concatenated reel keeps relative level
        std::vector<float> nl = L, nr = R; float g = (float)(0.707 / (pk + 1e-9)); for (int i = 0; i < N; ++i) { nl[i] *= g; nr[i] *= g; }
        writeWav(dir + "/" + d.name + ".wav", nl, nr, sr);
        { FILE* r = std::fopen((dir + "/native_" + d.name + ".f32").c_str(), "wb"); for (int i = 0; i < N; ++i) { std::fwrite(&L[i], 4, 1, r); std::fwrite(&R[i], 4, 1, r); } std::fclose(r); }
        for (int i = 0; i < N; ++i) { AL.push_back(L[i]); AR.push_back(R[i]); }
        for (int i = 0; i < sr / 2; ++i) { AL.push_back(0); AR.push_back(0); }
    }
    double pk = 0; for (size_t i = 0; i < AL.size(); ++i) pk = std::max(pk, (double)std::max(std::fabs(AL[i]), std::fabs(AR[i])));
    float g = (float)(0.89 / pk); for (size_t i = 0; i < AL.size(); ++i) { AL[i] *= g; AR[i] *= g; }
    writeWav(dir + "/bris_demo_reel.wav", AL, AR, sr);
    std::printf("reel %.1f s, gain %.1f dB\n", AL.size() / (double)sr, 20 * std::log10(g));
}
