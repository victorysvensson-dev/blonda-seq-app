// BLONDA AKAI — preset lab: plays the factory sounds the way they are meant to be played on the pads and measures
// them, so presets can be designed and checked without hardware.
//
//   preset_lab list <ENGINE>                 parameters and presets
//   preset_lab measure <ENGINE|all>          per preset: level, peak, brightness, attack, sustain, release
//   preset_lab render <ENGINE|all> <dir>     WAV per preset (the phrase for its category) + one demo per engine
//
// ENGINE is the instrument name as on the MPC screen (ANALOG, ACID, "SUB 808", "FM GLASS", PLUCK, CHIP, SUPER,
// SH-101, "MINI D"). Levels are the instrument output after its trim, before the app's master volume.
#include "akai/engine_instrument.hpp"
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <memory>
#include <string>
#include <vector>

using namespace akai;

namespace {
constexpr float kSR = 44100.f;
constexpr int kBlock = 128;
const blonda::Eng kEngines[] = {blonda::Eng::Mini, blonda::Eng::SH101, blonda::Eng::Acid, blonda::Eng::Analog, blonda::Eng::Super,
                                blonda::Eng::FM, blonda::Eng::Pluck, blonda::Eng::Chip, blonda::Eng::Sub};

struct Ev { double t; bool on; int note; float vel; };
struct Phrase { std::vector<Ev> ev; double len; };

// The phrase for a category, around the pads' C3 (MIDI 48) starting octave, 112 BPM.
Phrase phraseFor(const std::string& cat) {
    Phrase p; const double b = 60.0 / 112.0, s = b / 4;   // beat, 16th
    auto note = [&](double t, double dur, int n, float v) { p.ev.push_back({t, true, n, v}); p.ev.push_back({t + dur, false, n, 0.f}); };
    if (cat == "BASS" || cat == "SUB") {
        const int ns[] = {48, 48, 60, 48, 51, 48, 55, 53, 48, 48, 60, 58, 55, 51, 53, 55};
        const float vs[] = {1.f, .7f, .8f, .7f, .9f, .7f, .8f, .75f, 1.f, .7f, .8f, .7f, .9f, .7f, .8f, .75f};
        for (int i = 0; i < 16; ++i) note(i * s * 2, (i % 4 == 3 ? 2.2 : .8) * s * 2, ns[i], vs[i]);   // some legato overlaps
        p.len = 16 * s * 2 + 1.5;
    } else if (cat == "LEAD") {
        const int ns[] = {60, 63, 67, 70, 72, 70, 67, 63, 65, 67};
        const double ds[] = {1, 1, 1, 1, 3, 1, 1, 1, 2, 4};
        double t = 0; for (int i = 0; i < 10; ++i) { note(t, ds[i] * s * 2 * 1.05, ns[i], i == 4 ? 1.f : .8f); t += ds[i] * s * 2; }   // legato
        p.len = t + 1.5;
    } else if (cat == "PAD") {
        for (int n : {48, 55, 58, 63}) note(0, 3.2, n, .75f);
        for (int n : {44, 51, 55, 60}) note(3.6, 3.2, n, .75f);
        p.len = 9.5;
    } else if (cat == "KEYS") {
        const int ch[2][4] = {{48, 55, 58, 63}, {46, 53, 56, 61}};
        const double ts[] = {0, 3, 6, 8, 10, 14};
        for (int c = 0; c < 2; ++c) for (double t : ts) for (int n : ch[c]) note(c * 16 * s + t * s, 1.6 * s, n, .8f);
        for (int n : ch[0]) note(32 * s, 6 * s, n, .8f);
        p.len = 38 * s + 2.0;
    } else if (cat == "PLUCK" || cat == "ARP") {
        const int ns[] = {60, 63, 67, 72, 75, 72, 67, 63, 58, 62, 65, 70, 74, 70, 65, 62};
        for (int r = 0; r < 2; ++r) for (int i = 0; i < 16; ++i) note((r * 16 + i) * s, s * .9, ns[i], (i % 4 == 0) ? .95f : .7f);
        p.len = 32 * s + 2.5;
    } else if (cat == "BELL") {
        const int ns[] = {72, 79, 75, 84, 77, 72};
        for (int i = 0; i < 6; ++i) note(i * b, b * .9, ns[i], .8f);
        for (int n : {60, 67, 75}) note(6 * b, 2 * b, n, .8f);
        p.len = 8 * b + 3.0;
    } else {   // FX / anything else: one long note, then a high one
        note(0, 2.5, 48, .9f); note(3.0, 1.5, 67, .9f);
        p.len = 6.0;
    }
    std::sort(p.ev.begin(), p.ev.end(), [](const Ev& a, const Ev& b2) { return a.t < b2.t || (a.t == b2.t && !a.on && b2.on); });
    return p;
}

void play(EngineInstrument& I, const Phrase& ph, std::vector<float>& L, std::vector<float>& R) {
    const int n = (int)(ph.len * kSR) / kBlock * kBlock; L.assign(n, 0.f); R.assign(n, 0.f);
    size_t e = 0; const float g = I.outputGain();
    for (int i = 0; i < n; i += kBlock) {
        while (e < ph.ev.size() && ph.ev[e].t * kSR < i + kBlock) {
            const int off = std::max(0, (int)(ph.ev[e].t * kSR) - i);
            if (ph.ev[e].on) I.noteOn(ph.ev[e].note, ph.ev[e].vel, off); else I.noteOff(ph.ev[e].note, off);
            ++e;
        }
        I.process(&L[i], &R[i], kBlock);
    }
    for (int i = 0; i < n; ++i) { L[i] *= g; R[i] *= g; }
}

// single held note: attack / sustain / release / brightness
struct Shape { double rms, mom, peak, attackMs, sus1s, relMs, centroid0, centroid1; bool finite; };
double centroid(const std::vector<float>& x, int at, int len = 4096) {
    if (at + len > (int)x.size()) return 0;
    // DFT magnitude via a simple real FFT-free Goertzel-like sum over 64 bands (enough for a brightness number)
    double num = 0, den = 0;
    for (int k = 1; k < 400; ++k) {
        const double f = k * kSR / (2.0 * 400.0) * 0.5;   // 0 .. 11 kHz in 400 bins
        double re = 0, im = 0; const double w = 2 * M_PI * f / kSR;
        for (int i = 0; i < len; i += 2) { const double h = 0.5 - 0.5 * std::cos(2 * M_PI * i / len); re += x[at + i] * h * std::cos(w * i); im += x[at + i] * h * std::sin(w * i); }
        const double m = std::sqrt(re * re + im * im); num += m * f; den += m;
    }
    return den > 0 ? num / den : 0;
}
Shape shapeOf(EngineInstrument& I, int note) {
    I.reset(); const float g = I.outputGain();
    const int n = (int)(4.5 * kSR) / kBlock * kBlock; std::vector<float> L(n, 0.f), R(n, 0.f);
    I.noteOn(note, .85f, 0);
    const int offAt = (int)(2.0 * kSR) / kBlock * kBlock;
    for (int i = 0; i < n; i += kBlock) { if (i == offAt) I.noteOff(note, 0); I.process(&L[i], &R[i], kBlock); }
    Shape s{}; s.finite = true;
    std::vector<float> env(n / 256 + 1, 0.f), mono(n);
    for (int i = 0; i < n; ++i) { L[i] *= g; R[i] *= g; s.finite &= std::isfinite(L[i]) && std::isfinite(R[i]); mono[i] = .5f * (L[i] + R[i]);
        const float a = std::max(std::fabs(L[i]), std::fabs(R[i])); s.peak = std::max(s.peak, (double)a); env[i / 256] = std::max(env[i / 256], a); }
    double q = 0; for (int i = 0; i < offAt; ++i) q += (double)L[i] * L[i] + (double)R[i] * R[i];
    s.rms = 10 * std::log10(q / (2.0 * offAt) + 1e-20);
    double mq = 0; const int W = (int)(0.1 * kSR);   // momentary loudness: loudest 100 ms while the note is held
    for (int a = 0; a + W <= offAt; a += W / 4) { double w = 0; for (int i = a; i < a + W; ++i) w += (double)L[i] * L[i] + (double)R[i] * R[i]; mq = std::max(mq, w / (2.0 * W)); }
    s.mom = 10 * std::log10(mq + 1e-20);
    float mx = 0; int mxAt = 0; for (int k = 0; k < offAt / 256; ++k) if (env[k] > mx) { mx = env[k]; mxAt = k; }
    int k3 = 0; while (k3 < mxAt && env[k3] < mx * 0.707f) ++k3;
    s.attackMs = k3 * 256 / kSR * 1000;
    s.sus1s = env[(int)(1.5 * kSR) / 256] / (mx + 1e-12);
    const float atOff = env[offAt / 256 - 1]; int kr = offAt / 256;
    while (kr < (int)env.size() - 1 && env[kr] > atOff * 0.001f) ++kr;   // -60 dB from the level at note-off
    s.relMs = atOff > 1e-5f ? (kr - offAt / 256) * 256 / kSR * 1000 : 0;
    s.centroid0 = centroid(mono, 2048); s.centroid1 = centroid(mono, (int)(1.2 * kSR));
    return s;
}

void writeWav(const std::string& path, const std::vector<float>& L, const std::vector<float>& R, float norm) {
    FILE* f = std::fopen(path.c_str(), "wb"); if (!f) { std::printf("cannot write %s\n", path.c_str()); return; }
    const uint32_t n = (uint32_t)L.size(), data = n * 4;
    auto u32 = [&](uint32_t v) { std::fwrite(&v, 4, 1, f); }; auto u16 = [&](uint16_t v) { std::fwrite(&v, 2, 1, f); };
    std::fwrite("RIFF", 1, 4, f); u32(36 + data); std::fwrite("WAVEfmt ", 1, 8, f); u32(16); u16(1); u16(2); u32((uint32_t)kSR); u32((uint32_t)kSR * 4); u16(4); u16(16);
    std::fwrite("data", 1, 4, f); u32(data);
    for (uint32_t i = 0; i < n; ++i) for (float v : {L[i], R[i]}) { float c = v * norm; c = c < -1 ? -1 : (c > 1 ? 1 : c); const int16_t s = (int16_t)std::lround(c * 32767.f); std::fwrite(&s, 2, 1, f); }
    std::fclose(f);
}

std::string safe(const char* s) { std::string o; for (const char* c = s; *c; ++c) o += (std::isalnum((unsigned char)*c) ? *c : '_'); return o; }

std::vector<std::unique_ptr<EngineInstrument>> pick(const char* which) {
    std::vector<std::unique_ptr<EngineInstrument>> v;
    for (blonda::Eng e : kEngines) {
        std::unique_ptr<EngineInstrument> I(new EngineInstrument(e));
        if (!std::strcmp(which, "all") || !strcasecmp(which, I->name())) { I->prepare(kSR); EngineInstrument::noteLimitOff = false; v.push_back(std::move(I)); }
    }
    return v;
}
} // namespace

int main(int argc, char** argv) {
    if (argc < 3) { std::puts("preset_lab list|measure|render <ENGINE|all> [dir]"); return 1; }
    const std::string mode = argv[1];
    auto insts = pick(argv[2]);
    if (insts.empty()) { std::printf("unknown engine %s\n", argv[2]); return 1; }
    for (auto& ip : insts) {
        EngineInstrument& I = *ip;
        std::printf("== %s  (%d presets, %d bad values)\n", I.name(), I.numPresets(), I.badPresetValues());
        if (mode == "list") {
            for (int i = 0; i < I.numParams(); ++i) { const ParamInfo& p = I.param(i); std::printf("  %-8s %-8s %6.3f..%6.3f\n", p.id, p.name, p.min, p.max); }
            for (int k = 0; k < I.numPresets(); ++k) std::printf("  %2d %-6s %s\n", k, I.presetCategory(k), I.presetName(k));
            continue;
        }
        std::vector<float> all;   // engine demo: every preset's phrase in a row
        std::vector<float> allR;
        for (int k = 0; k < I.numPresets(); ++k) {
            I.reset(); I.loadPreset(k);
            const std::string cat = I.presetCategory(k);
            const int testNote = (cat == "BASS" || cat == "SUB") ? 48 : (cat == "BELL" ? 72 : 60);
            Shape s = shapeOf(I, testNote);
            {   // loudness averaged over three notes: Super's random detune and Pluck's noise burst vary per note
                double m = s.mom; for (int d : {5, 7}) { I.reset(); I.loadPreset(k); m += shapeOf(I, testNote + d).mom; } s.mom = m / 3;
            }
            I.reset(); I.loadPreset(k);
            std::vector<float> L, R; play(I, phraseFor(cat), L, R);
            float pk = 0; double q = 0; for (size_t i = 0; i < L.size(); ++i) { pk = std::max(pk, std::max(std::fabs(L[i]), std::fabs(R[i]))); q += (double)L[i] * L[i] + (double)R[i] * R[i]; }
            const double prms = 10 * std::log10(q / (2.0 * L.size()) + 1e-20);
            std::printf("  %2d %-5s %-16s mom %5.1f note %5.1f dB pk %4.2f | phrase %5.1f dB pk %4.2f | att %5.0f ms sus %4.2f rel %5.0f ms | bright %5.0f -> %5.0f Hz%s\n",
                        k, cat.c_str(), I.presetName(k), s.mom, s.rms, s.peak, prms, pk, s.attackMs, s.sus1s, s.relMs, s.centroid0, s.centroid1, s.finite ? "" : "  NaN!");
            if (mode == "render" && argc > 3) {
                writeWav(std::string(argv[3]) + "/" + safe(I.name()) + "_" + (k < 10 ? "0" : "") + std::to_string(k) + "_" + safe(I.presetName(k)) + ".wav", L, R, 1.f);
                all.insert(all.end(), L.begin(), L.end()); allR.insert(allR.end(), R.begin(), R.end());
                all.insert(all.end(), (size_t)(0.4 * kSR), 0.f); allR.insert(allR.end(), (size_t)(0.4 * kSR), 0.f);
            }
        }
        if (mode == "render" && argc > 3 && !all.empty()) {
            float pk = 0; for (size_t i = 0; i < all.size(); ++i) pk = std::max(pk, std::max(std::fabs(all[i]), std::fabs(allR[i])));
            writeWav(std::string(argv[3]) + "/DEMO_" + safe(I.name()) + ".wav", all, allR, pk > 0 ? 0.89f / pk : 1.f);
        }
    }
    return 0;
}
