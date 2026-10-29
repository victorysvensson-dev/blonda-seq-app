// BLONDA AKAI — desktop test bench.
//   akai_test                 run every test (exit code 0 = all passed)
//   akai_test render <dir>    also write WAV demos of every instrument / Bris preset and screen shots (PPM)
//   akai_test bench           CPU benchmark only
#include "akai/app.hpp"
#include "akai/bris6_instrument.hpp"
#include "akai/bris_instrument.hpp"
#include "akai/controls.hpp"
#include "akai/engine_instrument.hpp"
#include "akai/screen.hpp"
#include "akai/surface.hpp"
#include <atomic>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <memory>
#include <new>
#include <string>
#include <vector>

// ---------------------------------------------------------------- allocation counter (real-time check)
static std::atomic<long> gAllocs{0};
static std::atomic<bool> gCount{false};
void* operator new(std::size_t n) { if (gCount) ++gAllocs; if (void* p = std::malloc(n ? n : 1)) return p; throw std::bad_alloc(); }
void* operator new[](std::size_t n) { if (gCount) ++gAllocs; if (void* p = std::malloc(n ? n : 1)) return p; throw std::bad_alloc(); }
void operator delete(void* p) noexcept { std::free(p); }
void operator delete[](void* p) noexcept { std::free(p); }
void operator delete(void* p, std::size_t) noexcept { std::free(p); }
void operator delete[](void* p, std::size_t) noexcept { std::free(p); }

using namespace akai;

static int gFail = 0, gPass = 0;
#define CHECK(cond, ...) do { if (cond) ++gPass; else { ++gFail; std::printf("  FAIL %s:%d: ", __FILE__, __LINE__); std::printf(__VA_ARGS__); std::printf("\n"); } } while (0)

static constexpr float kSR = 44100.f;   // the MPC Sample's fixed rate
static constexpr int kBlock = 128;      // the MPC Sample's period

// ---------------------------------------------------------------- helpers
static void writeWav(const std::string& path, const std::vector<float>& L, const std::vector<float>& R, int sr) {
    FILE* f = std::fopen(path.c_str(), "wb"); if (!f) { std::printf("cannot write %s\n", path.c_str()); return; }
    const uint32_t n = (uint32_t)L.size(), data = n * 4;
    auto u32 = [&](uint32_t v) { std::fwrite(&v, 4, 1, f); }; auto u16 = [&](uint16_t v) { std::fwrite(&v, 2, 1, f); };
    std::fwrite("RIFF", 1, 4, f); u32(36 + data); std::fwrite("WAVEfmt ", 1, 8, f); u32(16); u16(1); u16(2); u32((uint32_t)sr); u32((uint32_t)sr * 4); u16(4); u16(16);
    std::fwrite("data", 1, 4, f); u32(data);
    for (uint32_t i = 0; i < n; ++i) for (float v : {L[i], R[i]}) { const float c = v < -1 ? -1 : (v > 1 ? 1 : v); const int16_t s = (int16_t)std::lround(c * 32767.f); std::fwrite(&s, 2, 1, f); }
    std::fclose(f);
}
static double rmsDb(const std::vector<float>& L, const std::vector<float>& R, double a, double b) {
    double q = 0; int n = 0;
    for (int i = (int)(a * kSR); i < (int)(b * kSR) && i < (int)L.size(); ++i, ++n) q += (double)L[i] * L[i] + (double)R[i] * R[i];
    return 10 * std::log10(q / std::max(1, n) + 1e-20);
}
static bool finite(const std::vector<float>& v) { for (float x : v) if (!std::isfinite(x)) return false; return true; }

// Render an instrument block by block; `events(frame)` is called at every block start.
template <class F> static void renderInst(Instrument& I, std::vector<float>& L, std::vector<float>& R, double seconds, F&& events) {
    const int n = (int)(seconds * kSR) / kBlock * kBlock; L.assign(n, 0.f); R.assign(n, 0.f);
    for (int i = 0; i < n; i += kBlock) { events(i); I.process(&L[i], &R[i], kBlock); }
}
static std::vector<std::unique_ptr<Instrument>> allInstruments() {
    std::vector<std::unique_ptr<Instrument>> v;
    v.emplace_back(new Bris6Instrument());
    v.emplace_back(new BrisInstrument());
    for (blonda::Eng e : {blonda::Eng::Mini, blonda::Eng::SH101, blonda::Eng::Acid, blonda::Eng::Analog, blonda::Eng::Super,
                          blonda::Eng::FM, blonda::Eng::Pluck, blonda::Eng::Chip, blonda::Eng::Sub})
        v.emplace_back(new EngineInstrument(e));
    return v;
}
static mpcs::Event ev(mpcs::Event::Type t, int id, int value = 0, int delta = 0) { mpcs::Event e; e.type = t; e.id = (uint8_t)id; e.value = (uint8_t)value; e.delta = (int8_t)delta; return e; }

// ---------------------------------------------------------------- tests
static void testParser() {
    std::puts("surface protocol");
    MidiParser p; MidiMsg m; mpcs::Event e;
    std::vector<mpcs::Event> got;
    auto feed = [&](std::initializer_list<int> bytes) { for (int b : bytes) if (p.feed((uint8_t)b, m) && mpcs::decode(m, e)) got.push_back(e); };
    // pad 1 (note 37) hit, pressure, release — exactly as captured on the device
    feed({0x99, 37, 100, 0xA9, 37, 40, 0xA9, 37, 0, 0x89, 37, 0});
    CHECK(got.size() == 4, "pad sequence gives 4 events (got %zu)", got.size());
    if (got.size() == 4) {
        CHECK(got[0].type == mpcs::Event::PadDown && got[0].id == 0 && got[0].value == 100, "pad down");
        CHECK(got[1].type == mpcs::Event::PadPressure && got[1].value == 40, "pressure");
        CHECK(got[3].type == mpcs::Event::PadUp && got[3].id == 0, "pad up");
    }
    got.clear();
    feed({0x99, 53, 90});                 // pad 16
    CHECK(got.size() == 1 && got[0].id == 15, "pad 16 is index 15");
    got.clear();
    feed({0x90, 49, 0x7F, 0x80, 49, 0});  // SHIFT
    CHECK(got.size() == 2 && got[0].type == mpcs::Event::ButtonDown && got[0].id == mpcs::BTN_SHIFT && got[1].type == mpcs::Event::ButtonUp, "shift button");
    got.clear();
    feed({0xB0, 16, 64, 0xB0, 100, 0x7F, 0xB0, 100, 0x01, 0xB0, 20, 127});
    CHECK(got.size() == 4, "knob/encoder/fader (got %zu)", got.size());
    if (got.size() == 4) {
        CHECK(got[0].type == mpcs::Event::Knob && got[0].id == mpcs::CC_K1 && got[0].value == 64, "K1");
        CHECK(got[1].type == mpcs::Event::Encoder && got[1].delta == -1, "encoder 7F = -1");
        CHECK(got[2].type == mpcs::Event::Encoder && got[2].delta == 1, "encoder 01 = +1");
        CHECK(got[3].type == mpcs::Event::Knob && got[3].id == mpcs::CC_FADER && got[3].value == 127, "fader");
    }
    got.clear();
    // running status + realtime byte in the middle + a SysEx that must be skipped
    feed({0xB0, 17, 10, 0xF8, 17, 11, 0xF0, 0x47, 0x7F, 0x5C, 0x65, 0x00, 0x04, 1, 2, 3, 4, 0xF7, 0x99, 36, 50});
    CHECK(got.size() == 3 && got[0].value == 10 && got[1].value == 11 && got[2].id == 1, "running status / realtime / sysex");
    // output messages
    uint8_t out[16];
    CHECK(mpcs::buttonLed(out, mpcs::BTN_PLAY, 2) == 3 && out[0] == 0xB0 && out[1] == 82 && out[2] == 2, "button LED message");
    const int n = mpcs::padColour(out, 3, 0xE9, 0xC5, 0x4A);
    const uint8_t want[12] = {0xF0, 0x47, 0x7F, 0x5C, 0x65, 0x00, 0x04, 3, 0x74, 0x62, 0x25, 0xF7};
    CHECK(n == 12 && std::memcmp(out, want, 12) == 0, "pad colour SysEx");
    CHECK(mpcs::buttonHasLed(mpcs::BTN_SHIFT) && !mpcs::buttonHasLed(mpcs::BTN_B1), "LED table");
}

static void testControls() {
    std::puts("knob takeover + pad layout");
    ScaledKnob k; float v = 0.8f;
    v = k.move(0.2f, v);                       // first message only locates the knob
    CHECK(std::fabs(v - 0.8f) < 1e-6f, "first move does not jump");
    for (int i = 21; i <= 127; ++i) v = k.move(i / 127.f, v);
    CHECK(std::fabs(v - 1.f) < 1e-4f, "turning to the end reaches the maximum (%f)", v);
    for (int i = 126; i >= 0; --i) v = k.move(i / 127.f, v);
    CHECK(std::fabs(v) < 1e-4f, "turning back reaches zero (%f)", v);
    PadLayout L;
    CHECK(L.note(0) == 48 && L.note(15) == 63, "chromatic from C3");
    L.inKey = true; L.scale = 1;   // C minor
    CHECK(L.note(0) == 48 && L.note(2) == 51 && L.note(7) == 60, "C minor pads");
    CHECK(L.degree(0) == 2 && L.degree(7) == 2 && L.degree(1) == 1, "root / scale degrees");
    L.octave = -2; L.root = 9;
    CHECK(L.note(0) == 33, "A1 root after octave/transpose (%d)", L.note(0));
}

static void testInstruments(const char* outDir) {
    std::puts("instruments: held notes sustain, release, real-time safety");
    auto insts = allInstruments();
    for (auto& ip : insts) {
        Instrument& I = *ip; I.prepare(kSR);
        CHECK(I.numPages() > 0 && I.numParams() > 0, "%s has pages", I.name());
        for (int p = 0; p < I.numPages(); ++p) for (int k = 0; k < 3; ++k) {
            const int prm = I.page(p).param[k];
            CHECK(prm >= -1 && prm < I.numParams(), "%s page %d slot %d valid", I.name(), p, k);
        }
        // every parameter: set via the normalised path at both ends and the middle, read back in range
        for (int i = 0; i < I.numParams(); ++i) for (float n : {0.f, .5f, 1.f}) {
            I.setNorm(i, n); const float g = I.getNorm(i);
            CHECK(g >= -1e-4f && g <= 1.0001f, "%s %s norm in range", I.name(), I.param(i).id);
        }
        I.loadPreset(0);
        // hold a chord 8 s (longer than the web keyboard's 24-step gate), then release
        std::vector<float> L, R;
        const int notes[3] = {48, 55, 60};
        long allocs = 0;
        renderInst(I, L, R, 14.0, [&](int f) {
            if (f == 0) for (int n : notes) I.noteOn(n, 0.85f, 0);
            if (f == kBlock * 20) { gAllocs = 0; gCount = true; }
            if (f == (int)(8.0 * kSR) / kBlock * kBlock) for (int n : notes) I.noteOff(n, 0);
            if (f == (int)(13.0 * kSR) / kBlock * kBlock) { gCount = false; allocs = gAllocs; }
        });
        const double early = rmsDb(L, R, 0.5, 1.0), late = rmsDb(L, R, 7.0, 7.9), tail = rmsDb(L, R, 13.0, 13.9);
        const bool decays = std::string(I.name()) == "SUB 808" || std::string(I.name()) == "PLUCK";   // naturally decaying sounds
        std::printf("  %-9s early %6.1f dB  held@7s %6.1f dB  tail %6.1f dB  allocs %ld\n", I.name(), early, late, tail, allocs);
        CHECK(finite(L) && finite(R), "%s output finite", I.name());
        CHECK(early > -40, "%s sounds", I.name());
        if (!decays) CHECK(late > early - 20, "%s still sounding after 7 s of holding", I.name());
        CHECK(tail < std::max(early, late) - 40, "%s is silent after release", I.name());
        CHECK(allocs == 0, "%s allocates in process()/noteOn()/noteOff() (%ld)", I.name(), allocs);
        if (outDir) writeWav(std::string(outDir) + "/hold_" + I.name() + ".wav", L, R, (int)kSR);
    }
}

// BRIS 6 voice modes (bris_voices.js): poly steals the oldest, mono = one voice, unison = all six, sustain pedal
static void testBris6Voices() {
    std::puts("BRIS 6 voice modes");
    Bris6Instrument I; I.prepare(kSR);
    std::vector<float> L(kBlock), R(kBlock);
    auto run = [&](double sec) { for (int i = 0; i < (int)(sec * kSR / kBlock); ++i) { std::fill(L.begin(), L.end(), 0.f); std::fill(R.begin(), R.end(), 0.f); I.process(L.data(), R.data(), kBlock); } };
    int lage = -1; for (int i = 0; i < I.numParams(); ++i) if (std::string(I.param(i).id) == "lage") lage = i;
    CHECK(lage >= 0, "lage parameter exists");
    I.loadPreset(0);                                   // init: poly stereo
    for (int n = 0; n < 8; ++n) I.noteOn(48 + n, .8f, 0);
    run(0.3);
    CHECK(I.activeVoices() == 6, "poly: 8 notes use all 6 voices (%d)", I.activeVoices());
    I.allNotesOff(); run(8.0);
    CHECK(I.activeVoices() == 0, "all notes off releases every voice (%d)", I.activeVoices());
    I.set(lage, 2);                                    // mono
    I.noteOn(48, .8f, 0); I.noteOn(52, .8f, 0); run(0.3);
    CHECK(I.activeVoices() == 1, "mono: one voice (%d)", I.activeVoices());
    I.noteOff(52, 0); run(0.3);
    CHECK(I.activeVoices() == 1, "mono: falls back to the held note (%d)", I.activeVoices());
    I.noteOff(48, 0); run(8.0);
    CHECK(I.activeVoices() == 0, "mono: released (%d)", I.activeVoices());
    I.set(lage, 3);                                    // unison
    I.noteOn(48, .8f, 0); run(0.3);
    CHECK(I.activeVoices() == 6, "unison: one note uses all 6 voices (%d)", I.activeVoices());
    I.noteOff(48, 0); run(8.0);
    I.set(lage, 1);                                    // poly + sustain pedal
    I.controlChange(64, 127); I.noteOn(60, .8f, 0); run(0.2); I.noteOff(60, 0); run(2.0);
    CHECK(I.activeVoices() == 1, "sustain pedal holds the note (%d)", I.activeVoices());
    I.controlChange(64, 0); run(8.0);
    CHECK(I.activeVoices() == 0, "pedal up releases (%d)", I.activeVoices());
    CHECK(I.numPresets() == 90 && std::string(I.presetName(48)) == "Hello Bree6", "90 presets incl. Hello Bree6");
}

static void testApp(const char* outDir) {
    std::puts("app: pads, latch, pages, presets, instruments, lights");
    auto app = std::make_unique<App>(); App& A = *app; A.prepare(kSR);
    std::vector<float> L(kBlock), R(kBlock);
    auto run = [&](double sec) { for (int i = 0; i < (int)(sec * kSR / kBlock); ++i) A.render(L.data(), R.data(), kBlock); };
    uint8_t out[4096];
    const int first = A.surfaceOutput(out, sizeof out);
    CHECK(first > 16 * 12, "first light refresh covers every pad (%d bytes)", first);
    run(0.01);
    const int second = A.surfaceOutput(out, sizeof out);
    CHECK(second <= 6, "nothing to resend when nothing changed (%d bytes)", second);   // the tap LED may blink

    A.handle(ev(mpcs::Event::PadDown, 0, 110));
    run(0.3);
    CHECK(A.instrument().activeVoices() == 1, "pad plays one BRIS 6 voice (%d)", A.instrument().activeVoices());
    const int lit = A.surfaceOutput(out, sizeof out);
    CHECK(lit >= 12, "pressed pad lights up (%d bytes)", lit);
    A.handle(ev(mpcs::Event::PadUp, 0));
    run(12.0);
    CHECK(A.instrument().activeVoices() == 0, "voice ends after release (%d)", A.instrument().activeVoices());

    // latch: notes keep sounding after release, a new chord replaces them, PLAY again releases
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_PLAY)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_PLAY));
    A.handle(ev(mpcs::Event::PadDown, 0, 100)); A.handle(ev(mpcs::Event::PadDown, 4, 100));
    A.handle(ev(mpcs::Event::PadUp, 0)); A.handle(ev(mpcs::Event::PadUp, 4));
    run(1.0);
    CHECK(A.instrument().activeVoices() == 2, "latched chord holds (%d)", A.instrument().activeVoices());
    A.handle(ev(mpcs::Event::PadDown, 7, 100)); A.handle(ev(mpcs::Event::PadUp, 7));
    run(12.0);
    CHECK(A.instrument().activeVoices() == 1, "new chord replaces the latched one (%d)", A.instrument().activeVoices());
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_PLAY)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_PLAY));
    run(12.0);
    CHECK(A.instrument().activeVoices() == 0, "latch off releases (%d)", A.instrument().activeVoices());

    // pages, knobs, presets
    UiState s; A.snapshot(s);
    CHECK(std::string(s.instrument) == "BRIS 6" && std::string(s.preset) == "init" && s.presetCount == 90, "starts on BRIS 6 / init (%s %s %d)", s.instrument, s.preset, s.presetCount);
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_B2)); A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_B2));
    A.snapshot(s);
    CHECK(std::string(s.page) == "FILTER", "B2 twice = FILTER page (%s)", s.page);
    A.handle(ev(mpcs::Event::Knob, mpcs::CC_K1, 10));
    for (int v = 11; v <= 127; ++v) A.handle(ev(mpcs::Event::Knob, mpcs::CC_K1, v));
    A.snapshot(s);
    CHECK(std::string(s.paramName[0]) == "CUTOFF" && std::string(s.paramValue[0]) == "100", "K1 opens the cutoff fully (%s %s)", s.paramName[0], s.paramValue[0]);
    A.handle(ev(mpcs::Event::Encoder, mpcs::CC_ENCODER, 0, 2));
    A.snapshot(s);
    CHECK(std::string(s.preset) == "PWM ARP", "encoder +2 = PWM ARP (%s)", s.preset);
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_SHIFT)); A.handle(ev(mpcs::Event::Encoder, mpcs::CC_ENCODER, 0, -1)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_SHIFT));
    A.snapshot(s);
    CHECK(std::string(s.page) == "OSC MOD", "SHIFT + encoder changes page (%s)", s.page);
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_PLUS));
    A.snapshot(s);
    CHECK(s.octave == 1 && std::string(s.toast) == "OCTAVE +1", "PLUS = octave up");
    if (outDir) { // screen shots
        static uint32_t fb[kScreenW * kScreenH];
        gfx::Canvas c{fb, kScreenW, kScreenH, kScreenW};
        auto shot = [&](const char* name) {
            A.snapshot(s); drawScreen(c, s);
            FILE* f = std::fopen((std::string(outDir) + "/" + name + ".ppm").c_str(), "wb");
            std::fprintf(f, "P6 %d %d 255\n", kScreenW, kScreenH);
            for (uint32_t px : fb) { const uint8_t rgb[3] = {(uint8_t)(px >> 16), (uint8_t)(px >> 8), (uint8_t)px}; std::fwrite(rgb, 1, 3, f); }
            std::fclose(f);
        };
        shot("screen_toast");
        run(2.0); A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_B2));
        A.handle(ev(mpcs::Event::Knob, mpcs::CC_K2, 60)); A.handle(ev(mpcs::Event::Knob, mpcs::CC_K2, 70));
        shot("screen_bris");
        A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_B3)); run(2.0);
        A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_16_LEVELS)); run(2.0);
        shot("screen_mini");
        A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_SHIFT)); A.setStats(0.07f, 0);
        shot("screen_shift");
        A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_SHIFT));
    }

    // instruments cycle and come back; quit combo
    A.snapshot(s); const int startInst = s.instrumentIndex;
    for (int i = 0; i < A.numInstruments(); ++i) {
        A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_B3));
        A.handle(ev(mpcs::Event::PadDown, 5, 100)); run(0.2); A.handle(ev(mpcs::Event::PadUp, 5)); run(0.1);
    }
    A.snapshot(s);
    CHECK(s.instrumentIndex == startInst, "B3 cycles through all instruments and back (%d vs %d)", s.instrumentIndex, startInst);
    CHECK(!A.quitRequested(), "not quitting yet");
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_SHIFT)); A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_STOP));
    CHECK(A.quitRequested(), "SHIFT + STOP quits");

    // the whole app must not allocate while playing
    auto app2 = std::make_unique<App>(); App& B = *app2; B.prepare(kSR);
    gAllocs = 0; gCount = true;
    for (int i = 0; i < B.numInstruments(); ++i) {
        for (int p = 0; p < 6; ++p) B.handle(ev(mpcs::Event::PadDown, p * 2, 90));
        for (int v = 0; v < 128; v += 8) { B.handle(ev(mpcs::Event::Knob, mpcs::CC_K1, v)); B.handle(ev(mpcs::Event::Knob, mpcs::CC_FADER, v)); B.render(L.data(), R.data(), kBlock); }
        B.handle(ev(mpcs::Event::Encoder, mpcs::CC_ENCODER, 0, 1));
        for (int p = 0; p < 6; ++p) B.handle(ev(mpcs::Event::PadUp, p * 2));
        for (int k = 0; k < 50; ++k) B.render(L.data(), R.data(), kBlock);
        B.surfaceOutput(out, sizeof out); UiState t; B.snapshot(t);
        B.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_B3));
    }
    gCount = false;
    CHECK(gAllocs == 0, "app allocates while playing (%ld)", (long)gAllocs);
}

// Bris presets: a short phrase per preset at 44.1 kHz
static void renderPresets(const char* outDir) {
    std::puts("rendering Bris presets");
    BrisInstrument I; I.prepare(kSR);
    std::vector<float> L, R, AL, AR;
    for (int p = 0; p < I.numPresets(); ++p) {
        I.reset(); I.loadPreset(p);
        const bool bass = std::string(I.presetCategory(p)) == "Bass", lead = std::string(I.presetCategory(p)) == "Lead";
        renderInst(I, L, R, 4.0, [&](int f) {
            const int beat = (int)(0.5 * kSR) / kBlock * kBlock;
            if (bass || lead) { static const int seq[6] = {0, 3, 7, 10, 7, 3};
                for (int k = 0; k < 6; ++k) { if (f == k * beat / 2) I.noteOn((bass ? 36 : 60) + seq[k], .9f, 0); if (f == k * beat / 2 + beat / 3) I.noteOff((bass ? 36 : 60) + seq[k], 0); } }
            else { if (f == 0) for (int n : {57, 60, 64}) I.noteOn(n, .8f, 0); if (f == beat * 4) for (int n : {57, 60, 64}) I.noteOff(n, 0); }
        });
        AL.insert(AL.end(), L.begin(), L.end()); AR.insert(AR.end(), R.begin(), R.end());
        double pk = 0; for (size_t i = 0; i < L.size(); ++i) pk = std::max(pk, (double)std::max(std::fabs(L[i]), std::fabs(R[i])));
        CHECK(pk > 0.01 && pk < 2.5 && finite(L), "Bris preset %s level (peak %.2f)", I.presetName(p), pk);   // raw engine level; the app trims and soft-clips
    }
    if (outDir) writeWav(std::string(outDir) + "/bris_all_presets_44k.wav", AL, AR, (int)kSR);
}

static void bench() {
    std::puts("CPU: worst case per instrument, 6 held notes, 128-frame blocks at 44.1 kHz (this machine)");
    auto insts = allInstruments();
    for (auto& ip : insts) {
        Instrument& I = *ip; I.prepare(kSR); I.loadPreset(0);
        std::vector<float> L(kBlock), R(kBlock);
        for (int n = 0; n < 6; ++n) I.noteOn(48 + n * 4, .8f, 0);
        const int blocks = (int)(10 * kSR / kBlock);
        double worst = 0, total = 0;
        for (int b = 0; b < blocks; ++b) {
            std::fill(L.begin(), L.end(), 0.f); std::fill(R.begin(), R.end(), 0.f);
            const auto t0 = std::chrono::steady_clock::now();
            I.process(L.data(), R.data(), kBlock);
            const double us = std::chrono::duration<double, std::micro>(std::chrono::steady_clock::now() - t0).count();
            total += us; worst = std::max(worst, us);
        }
        const double budget = kBlock / kSR * 1e6;   // 2902 us
        std::printf("  %-9s avg %6.1f us (%4.1f%% of a core)  worst %6.1f us  budget %.0f us\n", I.name(), total / blocks, 100 * total / blocks / budget, worst, budget);
    }
}

// Loudness survey: single note C3 (and a 3-note chord) per instrument, RMS over 0.05-0.8 s and peak, after outputGain().
static void levels() {
    std::puts("levels after outputGain (single note C3 / 3-note chord): RMS dBFS, peak");
    auto insts = allInstruments();
    for (auto& ip : insts) {
        Instrument& I = *ip; I.prepare(kSR);
        for (int chord = 0; chord < 2; ++chord) {
            I.reset(); I.loadPreset(0); std::vector<float> L, R;
            renderInst(I, L, R, 1.2, [&](int f) { if (f == 0) { I.noteOn(48, .85f, 0); if (chord) { I.noteOn(55, .85f, 0); I.noteOn(60, .85f, 0); } }
                                                   if (f == (int)(0.8 * kSR) / kBlock * kBlock) for (int n : {48, 55, 60}) I.noteOff(n, 0); });
            for (auto* v : {&L, &R}) for (float& x : *v) x *= I.outputGain();
            double pk = 0; for (size_t i = 0; i < L.size(); ++i) pk = std::max(pk, (double)std::max(std::fabs(L[i]), std::fabs(R[i])));
            std::printf("  %-9s %s rms %6.1f dB  peak %5.2f\n", I.name(), chord ? "chord" : "note ", rmsDb(L, R, 0.05, 0.8) - 3.0, pk);
        }
    }
    BrisInstrument B; B.prepare(kSR);
    for (int p = 0; p < B.numPresets(); ++p) {
        B.reset(); B.loadPreset(p); std::vector<float> L, R;
        renderInst(B, L, R, 1.2, [&](int f) { if (f == 0) for (int n : {48, 55, 60}) B.noteOn(n, .85f, 0); if (f == (int)(0.8 * kSR) / kBlock * kBlock) for (int n : {48, 55, 60}) B.noteOff(n, 0); });
        double pk = 0; for (size_t i = 0; i < L.size(); ++i) pk = std::max(pk, (double)std::max(std::fabs(L[i]), std::fabs(R[i])) * B.outputGain());
        std::printf("    bris %-14s chord rms %6.1f dB  peak %5.2f\n", B.presetName(p), rmsDb(L, R, 0.05, 0.8) - 3.0 + 20 * std::log10(B.outputGain()), pk);
    }
}

int main(int argc, char** argv) {
    const std::string mode = argc > 1 ? argv[1] : "";
    if (mode == "levels") { levels(); return 0; }
    if (mode == "bench") { bench(); return 0; }
    const char* outDir = mode == "render" && argc > 2 ? argv[2] : nullptr;
    testParser();
    testControls();
    testInstruments(outDir);
    testBris6Voices();
    testApp(outDir);
    renderPresets(outDir);
    bench();
    std::printf("\n%d passed, %d failed\n%s\n", gPass, gFail, gFail ? "AKAI TEST FAIL" : "AKAI TEST OK");
    return gFail ? 1 : 0;
}
