// BLONDA AKAI — desktop test bench.
//   akai_test                 run every test (exit code 0 = all passed)
//   akai_test render <dir>    also write WAV demos of every instrument / Bris preset and screen shots (PPM)
//   akai_test bench           CPU benchmark only
#include "akai/app.hpp"
#include "akai/motor_instrument.hpp"
#include "akai/bris_instrument.hpp"
#include "akai/controls.hpp"
#include "akai/engine_instrument.hpp"
#include "akai/screen.hpp"
#include "akai/surface.hpp"
#include "akai/repeat.hpp"
#include "akai/fx.hpp"
#include "blonda/convolver.hpp"
#include "blonda/seq3.hpp"
#include <thread>
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
    v.emplace_back(new MotorInstrument(*findMotorSkin("bris")));
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

// The MPC's surface port delivered timestamp frames on the first hardware run; the bytes below are rebuilt from that
// log (tv_nsec D4 32 67 07 etc.). Read as plain MIDI they produced fake buttons, knobs and encoder moves.
static void testRawMidiFrames() {
    std::puts("raw MIDI timestamp frames");
    auto frame = [](uint8_t* f, std::initializer_list<uint8_t> nsec, std::initializer_list<uint8_t> data) {
        std::memset(f, 0, 32); f[1] = (uint8_t)data.size(); int i = 4; for (uint8_t b : nsec) f[i++] = b; i = 16; for (uint8_t b : data) f[i++] = b; };
    uint8_t in[128], out[128];
    frame(in, {0xD4, 0x32, 0x67, 0x07}, {0x99, 0x24, 0x7F});        // pad 2 down
    frame(in + 32, {0x8E, 0x6D, 0x33, 0x67}, {0x89, 0x24, 0x00});   // pad 2 up
    frame(in + 64, {0xB2, 0x27, 0x68, 0x07}, {0xB0, 0x64, 0x01});   // encoder +1
    frame(in + 96, {0xE2, 0x28, 0x68, 0x07}, {0x90, 0x31, 0x7F});   // SHIFT down
    CHECK(looksFramed(in, 128), "frames detected");
    const int n = unpackRawMidi(in, 128, out);
    const uint8_t want[12] = {0x99, 0x24, 0x7F, 0x89, 0x24, 0x00, 0xB0, 0x64, 0x01, 0x90, 0x31, 0x7F};
    CHECK(n == 12 && std::memcmp(out, want, 12) == 0, "frames unpack to exactly the MIDI bytes (%d bytes)", n);
    MidiParser p; MidiMsg m; mpcs::Event e; int events = 0, fake = 0;
    for (int i = 0; i < n; ++i) if (p.feed(out[i], m)) { if (mpcs::decode(m, e)) ++events; else ++fake; }
    CHECK(events == 4 && fake == 0, "4 real events, no fake ones (%d, %d)", events, fake);
    // the same bytes parsed raw (the bug): fake messages appear
    MidiParser q; int rawMsgs = 0; for (int i = 0; i < 128; ++i) if (q.feed(in[i], m)) ++rawMsgs;
    CHECK(rawMsgs > 4, "raw parsing of frames gives extra messages (%d), which is what the hardware showed", rawMsgs);
    // plain streams pass through untouched
    const uint8_t plainIn[6] = {0x99, 0x25, 0x40, 0x89, 0x25, 0x00};
    CHECK(!looksFramed(plainIn, 6) && unpackRawMidi(plainIn, 6, out) == 6 && std::memcmp(out, plainIn, 6) == 0, "plain MIDI untouched");
    uint8_t plain32[32]; for (int i = 0; i < 32; i += 3) { plain32[i] = 0x99; if (i + 1 < 32) plain32[i + 1] = 0x25; if (i + 2 < 32) plain32[i + 2] = 0x40; }
    CHECK(!looksFramed(plain32, 32), "a 32-byte plain chunk is not mistaken for a frame");
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

// The engines render node by node in segments of up to 128 frames (Core/src/wg.cpp). The result must not depend
// on how the host cuts the audio into blocks, and no graph may run out of cycle-history buffers.
static void testBlockSizes() {
    std::puts("engines: same output for any block size");
    struct Ev { int frame; bool on; int note; };
    const int B = 18944;   // a block start for 128, 37 and 512 frame blocks: note-offs go here (they act at block starts)
    const Ev evs[] = {{0, true, 48}, {5, true, 55}, {300, true, 60}, {2000, true, 64}, {B, false, 48}, {B, false, 55}, {B + 77, true, 67},
                      {B + 4001, true, 43}, {2 * B, false, 60}, {2 * B, false, 64}, {2 * B, false, 67}, {2 * B + 900, true, 72}, {4 * B, false, 43}, {4 * B, false, 72}};
    for (blonda::Eng e : {blonda::Eng::Mini, blonda::Eng::SH101, blonda::Eng::Acid, blonda::Eng::Analog, blonda::Eng::Super,
                          blonda::Eng::FM, blonda::Eng::Pluck, blonda::Eng::Chip, blonda::Eng::Sub}) {
        std::vector<float> ref;
        for (int bs : {128, 37, 512}) {
            EngineInstrument I(e); I.prepare(kSR); I.loadPreset(0); EngineInstrument::noteLimitOff = true;
            const int n = 5 * B; std::vector<float> L(n, 0.f), R(n, 0.f);
            for (int s = 0; s < n; s += bs) {
                const int len = std::min(bs, n - s);
                for (const Ev& v : evs) if (v.frame >= s && v.frame < s + len) { if (v.on) I.noteOn(v.note, .8f, v.frame - s); else I.noteOff(v.note, 0); }
                I.process(&L[s], &R[s], len);
            }
            EngineInstrument::noteLimitOff = false;
            CHECK(!I.track().histOverflow(), "%s: a graph ran out of cycle-history buffers", I.name());
            std::vector<float> both(L); both.insert(both.end(), R.begin(), R.end());
            if (ref.empty()) { ref = both; continue; }
            // The engine clock adds block lengths in double precision, so other block sizes move event times by
            // rounding-level amounts; anything beyond that would be a segmentation error.
            float md = 0; for (size_t k = 0; k < ref.size(); ++k) md = std::max(md, std::fabs(ref[k] - both[k]));
            CHECK(md < 1e-4f, "%s: %d-frame blocks differ from 128-frame blocks by %g", I.name(), bs, md);
            if (md > 0) std::printf("  %s %d-frame blocks: largest difference %.2g (clock rounding)\n", I.name(), bs, md);
        }
    }
}


// ---------------------------------------------------------------- NOTE REPEAT
static void testRepeater() {
    std::puts("note repeat: grid, chords, arpeggios, pressure, no stuck notes");
    struct E { bool on; int note; long long at; float vel; };
    std::vector<E> evs;
    Repeater r; r.prepare(kSR); r.setTempo(120.f); r.setRate(3);   // 1/16 at 120 = 5512.5 samples
    long long t = 0;
    auto run = [&](double sec) { for (int i = 0; i < (int)(sec * kSR / kBlock); ++i) {
        r.process(kBlock, [&](int n, float v, int o) { evs.push_back({true, n, t + o, v}); }, [&](int n, int o) { evs.push_back({false, n, t + o, 0.f}); }); t += kBlock; } };
    auto ons = [&]() { int c = 0; for (auto& e : evs) c += e.on; return c; };
    auto offs = [&]() { int c = 0; for (auto& e : evs) c += !e.on; return c; };
    r.add(60, .7f); run(1.0);
    CHECK(ons() == 8, "1/16 at 120 BPM: 8 hits in a second (%d)", ons());
    bool grid = true; int k = 0;
    for (auto& e : evs) if (e.on) { grid &= e.at == (long long)(k * 5512.5); ++k; }
    CHECK(grid, "hits land on the grid, first one at once");
    CHECK(evs[0].vel == .7f, "repeat keeps the pad velocity (%g)", evs[0].vel);
    r.setPressure(60, 1.f); evs.clear(); run(0.3);
    CHECK(!evs.empty() && evs[0].on && std::fabs(evs[0].vel - 1.f) < 1e-6f, "pad pressure sets the repeat velocity");
    r.remove(60); run(0.5);
    CHECK(ons() == offs(), "every repeat gets its note-off after release (%d on, %d off)", ons(), offs());
    // chord: all notes on each step
    evs.clear(); r.add(60, .8f); r.add(64, .8f); r.add(67, .8f); run(0.2);
    int first = 0; for (auto& e : evs) if (e.on && e.at == evs[0].at) ++first;
    CHECK(first == 3, "REPEAT plays the whole chord on a step (%d)", first);
    r.clear(); r.silence([&](int n, int o) { evs.push_back({false, n, t + o, 0.f}); }); run(0.2);
    CHECK(ons() == offs(), "silence() sends the outstanding note-offs");
    // arpeggios
    auto arp = [&](int mode, std::initializer_list<int> notes, int steps) {
        Repeater a; a.prepare(kSR); a.setTempo(120.f); a.setRate(3); a.setMode(mode);
        for (int n : notes) a.add(n, .8f);
        std::vector<int> seq;
        for (int i = 0; i < 4000 && (int)seq.size() < steps; ++i) a.process(kBlock, [&](int n, float, int) { seq.push_back(n); }, [](int, int) {});
        return seq;
    };
    CHECK((arp(Repeater::Up, {64, 60, 67}, 6) == std::vector<int>{60, 64, 67, 60, 64, 67}), "ARP UP goes up by pitch");
    CHECK((arp(Repeater::Down, {64, 60, 67}, 4) == std::vector<int>{67, 64, 60, 67}), "ARP DOWN goes down");
    CHECK((arp(Repeater::UpDown, {64, 60, 67}, 6) == std::vector<int>{60, 64, 67, 64, 60, 64}), "ARP UP/DN turns without repeating the ends");
    CHECK((arp(Repeater::Order, {64, 60, 67}, 4) == std::vector<int>{64, 60, 67, 64}), "ARP ORDER follows the playing order");
    const auto rnd = arp(Repeater::Random, {60, 64, 67}, 40); bool norep = true; for (size_t i = 1; i < rnd.size(); ++i) norep &= rnd[i] != rnd[i - 1];
    CHECK(rnd.size() == 40 && norep, "ARP RANDOM never plays the same note twice in a row");

    // in the app: tap toggles, hold is momentary, encoder sets the rate while held, SHIFT changes the mode
    auto app = std::make_unique<App>(); App& A = *app; A.prepare(kSR);
    std::vector<float> L(kBlock), R(kBlock);
    auto runA = [&](double sec) { for (int i = 0; i < (int)(sec * kSR / kBlock); ++i) A.render(L.data(), R.data(), kBlock); };
    A.selectInstrument(8);   // PLUCK: short notes, easy to count
    CHECK(std::string(A.instrument().name()) == "PLUCK", "instrument 8 is PLUCK (%s)", A.instrument().name());
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_NOTE_REPEAT)); runA(0.05); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_NOTE_REPEAT));
    CHECK(A.repeatOn(), "tapping NOTE REPEAT switches it on");
    A.handle(ev(mpcs::Event::PadDown, 0, 100)); runA(1.0);
    UiState s; A.snapshot(s);
    CHECK(std::string(s.repeat) == "REPEAT 1/16", "screen shows the repeat (%s)", s.repeat);
    A.handle(ev(mpcs::Event::PadUp, 0)); runA(3.0);
    CHECK(A.instrument().activeVoices() == 0, "no notes left after the pad is released (%d)", A.instrument().activeVoices());
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_NOTE_REPEAT)); runA(0.05); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_NOTE_REPEAT));
    CHECK(!A.repeatOn(), "tapping again switches it off");
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_NOTE_REPEAT));
    A.handle(ev(mpcs::Event::Encoder, mpcs::CC_ENCODER, 0, -2));
    runA(0.6); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_NOTE_REPEAT));
    CHECK(!A.repeatOn() && A.repeater().rate() == 1, "hold + encoder sets the rate (1/8) and releasing ends the repeat (%d)", A.repeater().rate());
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_SHIFT)); A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_NOTE_REPEAT));
    A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_NOTE_REPEAT)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_SHIFT));
    CHECK(A.repeatOn() && A.repeater().mode() == Repeater::Up, "SHIFT + NOTE REPEAT: next mode (ARP UP) and on");
    // a held pad keeps sounding when repeat is switched off under it, and stops normally afterwards
    A.selectInstrument(5);   // ANALOG: sustains while held
    CHECK(std::string(A.instrument().name()) == "ANALOG", "instrument 5 is ANALOG (%s)", A.instrument().name());
    A.handle(ev(mpcs::Event::PadDown, 5, 100)); runA(0.5);
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_NOTE_REPEAT)); runA(0.05); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_NOTE_REPEAT));
    runA(0.5);
    CHECK(!A.repeatOn() && A.instrument().activeVoices() >= 1, "switching repeat off hands the held note back (%d)", A.instrument().activeVoices());
    A.handle(ev(mpcs::Event::PadUp, 5)); runA(4.0);
    CHECK(A.instrument().activeVoices() == 0, "and it stops on release (%d)", A.instrument().activeVoices());
    // latch + arp, then STOP
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_PLAY)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_PLAY));
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_NOTE_REPEAT)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_NOTE_REPEAT));
    for (int p : {0, 4, 7}) A.handle(ev(mpcs::Event::PadDown, p, 100));
    for (int p : {0, 4, 7}) A.handle(ev(mpcs::Event::PadUp, p));
    runA(1.0);
    CHECK(A.repeater().numSources() == 3, "latched chord keeps arpeggiating (%d notes)", A.repeater().numSources());
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_STOP)); runA(4.0);
    CHECK(A.repeater().numSources() == 0 && A.instrument().activeVoices() == 0, "STOP ends the arpeggio (%d voices)", A.instrument().activeVoices());
}

// ---------------------------------------------------------------- KNOB FX
static void testFx() {
    std::puts("knob fx: transparent at rest, echo timing, space = SEQ.3's convolver, threaded = offline, filter, off switch");
    const int n = (int)(3.0 * kSR) / kBlock * kBlock;
    std::vector<float> xL(n, 0.f), xR(n, 0.f);
    blonda::Noise nz; nz.seed(7);
    for (int i = 0; i < 4410; ++i) { xL[i] = nz.next() * .5f; xR[i] = nz.next() * .5f; }   // 0.1 s burst
    auto render = [&](FxBus& F, std::vector<float>& L, std::vector<float>& R, bool realtime) {
        L = xL; R = xR;
        for (int i = 0; i < n; i += kBlock) { F.process(&L[i], &R[i], kBlock); if (realtime) std::this_thread::sleep_for(std::chrono::microseconds(2900)); }
    };
    std::vector<float> L, R;
    { FxBus F; F.prepare(kSR); F.setThreaded(false); render(F, L, R, false);
      CHECK(L == xL && R == xR, "with ECHO and SPACE at 0 and the filter centred the sound is untouched (bit for bit)"); }
    { FxBus F; F.prepare(kSR); F.setThreaded(false); F.setTempo(120.f); F.set(FxBus::P_ECHO, 1.f); F.set(FxBus::P_TIME, 3); F.set(FxBus::P_FEEDBACK, 0.f);
      render(F, L, R, false);
      auto e = [&](int a, int b) { double q = 0; for (int i = a; i < b; ++i) q += (double)(L[i] - xL[i]) * (L[i] - xL[i]); return q; };
      const double before = e(0, 22000), at = e(22050, 22050 + 4410);
      CHECK(at > 100 * (before + 1e-12), "ECHO 1/4 at 120 BPM repeats after 0.5 s (%.3g vs %.3g)", at, before); }
    // SPACE against SEQ.3's own convolver with the same IR
    { FxBus F; F.set(FxBus::P_SPACE, 1.f); F.prepare(kSR); F.setThreaded(false);
      std::vector<float> L1, R1; render(F, L1, R1, false);
      blonda::Convolver C; blonda::buildReverb(C, 2.6f, kSR);
      // reference: the same send chain (250 Hz high-pass, send 1, return 0.7) around SEQ.3's convolver
      float c[5]; { const float f = 250.f, q = 1.f, w = 2.f * 3.14159265358979f * f / kSR, cs = std::cos(w), sn = std::sin(w);
        const float al = sn / (2 * std::pow(10.f, q / 20.f)), a0 = 1 + al; c[0] = (1 + cs) * .5f / a0; c[1] = -(1 + cs) / a0; c[2] = c[0]; c[3] = -2 * cs / a0; c[4] = (1 - al) / a0; }
      std::vector<float> hl(n), hr(n), wl(n, 0.f), wr(n, 0.f); float z[2][2] = {};
      auto bq = [&](float* zz, float x) { const float y = c[0] * x + zz[0]; zz[0] = c[1] * x - c[3] * y + zz[1]; zz[1] = c[2] * x - c[4] * y; return y; };
      for (int i = 0; i < n; ++i) { hl[i] = bq(z[0], xL[i]); hr[i] = bq(z[1], xR[i]); }
      for (int i = 0; i < n; i += kBlock) C.process(&hl[i], &hr[i], &wl[i], &wr[i], kBlock);
      float md = 0, pk = 0; for (int i = 0; i < n; ++i) { const float ref = xL[i] + wl[i] * .7f; md = std::max(md, std::fabs(L1[i] - ref)); pk = std::max(pk, std::fabs(ref)); }
      CHECK(md < 1e-4f * pk + 1e-6f, "SPACE matches SEQ.3's convolution reverb (largest difference %.2g of peak %.2g)", md, pk);
      double tail = 0; for (int i = (int)(0.5 * kSR); i < (int)(2.0 * kSR); ++i) tail += (double)L1[i] * L1[i];
      CHECK(tail > 1e-3, "SPACE has its long tail (%.3g)", tail);
      // the worker thread gives the same result when it keeps up (real-time pacing)
      FxBus G; G.set(FxBus::P_SPACE, 1.f); G.prepare(kSR); std::vector<float> L2, R2; render(G, L2, R2, true);
      CHECK(L2 == L1 && R2 == R1 && G.lateBlocks() == 0, "threaded tail = offline tail, bit for bit (%d late blocks)", G.lateBlocks()); }
    { FxBus F; F.prepare(kSR); F.setThreaded(false); F.set(FxBus::P_FILTER, -0.8f);
      std::vector<float> s(n), sr(n); for (int i = 0; i < n; ++i) s[i] = sr[i] = std::sin(2 * 3.14159265f * 8000.f * i / kSR) * .5f;
      for (int i = 0; i < n; i += kBlock) F.process(&s[i], &sr[i], kBlock);
      float pk = 0; for (int i = n / 2; i < n; ++i) pk = std::max(pk, std::fabs(s[i]));
      CHECK(pk < .05f, "FILTER to the left is a low-pass (8 kHz at %.3f)", pk);
      char buf[16]; F.format(FxBus::P_FILTER, buf, sizeof buf); CHECK(std::string(buf) == "LP 79", "filter label (%s)", buf);
      F.set(FxBus::P_FILTER, 0.02f); F.format(FxBus::P_FILTER, buf, sizeof buf); CHECK(std::string(buf) == "OFF", "centre of the knob is off (%s)", buf); }
    // app: KNOB FX shows the effects on the knobs, SHIFT + KNOB FX switches them off; no allocation
    { auto app = std::make_unique<App>(); App& A = *app; A.prepare(kSR);
      std::vector<float> l(kBlock), r(kBlock);
      A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_KNOB_FX)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_KNOB_FX));
      UiState s; A.snapshot(s);
      CHECK(A.fxView() && std::string(s.page) == "KNOB FX" && std::string(s.paramName[0]) == "ECHO" && std::string(s.paramName[1]) == "SPACE" && std::string(s.paramName[2]) == "FILTER",
            "KNOB FX puts ECHO / SPACE / FILTER on K1-K3 (%s: %s %s %s)", s.page, s.paramName[0], s.paramName[1], s.paramName[2]);
      for (int v = 0; v <= 127; v += 8) A.handle(ev(mpcs::Event::Knob, mpcs::CC_K2, v));
      CHECK(A.fx().get(FxBus::P_SPACE) > .9f, "K2 turns SPACE up (%.2f)", A.fx().get(FxBus::P_SPACE));
      A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_B2)); A.snapshot(s);
      CHECK(std::string(s.page) == "ECHO" && std::string(s.paramName[0]) == "TIME", "B2: echo time / feedback page (%s)", s.page);
      A.handle(ev(mpcs::Event::PadDown, 0, 100));
      gCount = true; gAllocs = 0;
      for (int i = 0; i < 400; ++i) A.render(l.data(), r.data(), kBlock);
      gCount = false;
      CHECK(gAllocs == 0, "no allocation while the effects run (%ld)", (long)gAllocs);
      A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_SHIFT)); A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_KNOB_FX));
      A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_KNOB_FX)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_SHIFT));
      A.snapshot(s);
      CHECK(!A.fx().enabled() && s.fxOff, "SHIFT + KNOB FX switches the effects off");
      A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_KNOB_FX)); A.snapshot(s);
      CHECK(!A.fxView() && std::string(s.page) != "KNOB FX", "KNOB FX again: back to the instrument's pages (%s)", s.page); }
}

// BRIS (blonda-motor) voice modes (bris_voices.js): poly steals the oldest, mono = one voice, unison = all six, sustain pedal
static void testBrisMotorVoices() {
    std::puts("BRIS (blonda-motor) voice modes");
    MotorInstrument I(*findMotorSkin("bris")); I.prepare(kSR);
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
    CHECK(A.instrument().activeVoices() == 1, "pad plays one BRIS voice (%d)", A.instrument().activeVoices());
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
    CHECK(std::string(s.instrument) == "BRIS" && std::string(s.preset) == "init" && s.presetCount == 90, "starts on BRIS / init (%s %s %d)", s.instrument, s.preset, s.presetCount);
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
        // NOTE REPEAT (arp) + KNOB FX page
        A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_SHIFT)); A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_NOTE_REPEAT));
        A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_NOTE_REPEAT)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_SHIFT));
        A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_KNOB_FX));
        A.handle(ev(mpcs::Event::Knob, mpcs::CC_K1, 40)); A.handle(ev(mpcs::Event::Knob, mpcs::CC_K2, 70)); A.handle(ev(mpcs::Event::Knob, mpcs::CC_K3, 30));
        for (int p : {0, 4, 7}) A.handle(ev(mpcs::Event::PadDown, p, 100));
        run(1.6);
        shot("screen_fx_repeat");
        for (int p : {0, 4, 7}) A.handle(ev(mpcs::Event::PadUp, p));
        A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_KNOB_FX));
        A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_NOTE_REPEAT)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_NOTE_REPEAT));
        run(4.0);
    }

    // SHIFT + TAP TEMPO switches the screen colours; the waveform follows the output
    A.snapshot(s); const int th0 = s.theme;
    A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_SHIFT)); A.handle(ev(mpcs::Event::ButtonDown, mpcs::BTN_TAP_TEMPO)); A.handle(ev(mpcs::Event::ButtonUp, mpcs::BTN_SHIFT));
    A.snapshot(s);
    CHECK(s.theme != th0 && std::string(s.toast).find("COLOURS") != std::string::npos, "SHIFT + TAP TEMPO switches colours (%d -> %d)", th0, s.theme);
    A.handle(ev(mpcs::Event::Knob, mpcs::CC_MAIN_VOLUME, 100));
    A.handle(ev(mpcs::Event::PadDown, 3, 110)); run(0.6);
    A.snapshot(s); int span = 0; for (int k = 0; k < UiState::kScopeCols; ++k) span = std::max(span, s.scopeMax[k] - s.scopeMin[k]);
    CHECK(span > 20, "waveform shows the sound (span %d)", span);
    A.handle(ev(mpcs::Event::PadUp, 3)); run(8.0);
    A.snapshot(s); span = 0; for (int k = 0; k < UiState::kScopeCols; ++k) span = std::max(span, s.scopeMax[k] - s.scopeMin[k]);
    CHECK(span < 4, "waveform goes flat after the sound stops (span %d)", span);

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

static void bench(const char* only = nullptr, double seconds = 10) {
    std::puts("CPU: worst case per instrument, 6 held notes, 128-frame blocks at 44.1 kHz (this machine)");
    auto insts = allInstruments();
    for (auto& ip : insts) {
        Instrument& I = *ip; if (only && std::strcmp(only, I.name())) continue;
        I.prepare(kSR); I.loadPreset(0);
        std::vector<float> L(kBlock), R(kBlock);
        for (int n = 0; n < 6; ++n) I.noteOn(48 + n * 4, .8f, 0);
        const int blocks = (int)(seconds * kSR / kBlock);
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

// Sound fingerprint: a fixed phrase per instrument (chords, overlapping notes, releases, a preset change),
// hashed over the exact output bits. Optimisations that must not change the sound are checked with this.
static void fingerprint() {
    auto insts = allInstruments();
    for (auto& ip : insts) {
        Instrument& I = *ip; I.prepare(kSR); I.loadPreset(0); std::vector<float> L, R;
        const int np = I.numPresets();
        renderInst(I, L, R, 4.0, [&](int f) {
            const double t = (double)f / kSR;
            auto at = [&](double s) { return f == (int)(s * kSR) / kBlock * kBlock; };
            if (at(0.0)) { I.noteOn(48, .9f, 0); I.noteOn(55, .7f, 0); I.noteOn(60, .8f, 0); }
            if (at(0.5)) { I.noteOn(64, 1.f, 17); I.noteOff(55, 3); }
            if (at(1.0)) { I.noteOff(48, 0); I.noteOff(60, 0); I.noteOff(64, 50); }
            if (at(1.3)) { I.noteOn(52, .6f, 0); I.noteOn(59, .6f, 0); I.noteOn(67, .6f, 0); I.noteOn(71, .6f, 0); }
            if (at(2.2)) { for (int n : {52, 59, 67, 71}) I.noteOff(n, 0); }
            if (at(2.4) && np > 1) I.loadPreset(np / 2);
            if (at(2.5)) I.noteOn(45, .8f, 0);
            if (at(3.2)) I.noteOff(45, 0);
            (void)t; });
        uint64_t h = 1469598103934665603ull; double e = 0;
        for (size_t k = 0; k < L.size(); ++k) { uint32_t a, b; std::memcpy(&a, &L[k], 4); std::memcpy(&b, &R[k], 4);
            h = (h ^ a) * 1099511628211ull; h = (h ^ b) * 1099511628211ull; e += (double)L[k] * L[k] + (double)R[k] * R[k]; }
        std::printf("%-9s %016llx  energy %.6f\n", I.name(), (unsigned long long)h, e);
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
    if (mode == "bench") { bench(argc > 2 ? argv[2] : nullptr, argc > 3 ? std::atof(argv[3]) : 10); return 0; }
    if (mode == "fingerprint") { fingerprint(); return 0; }
    const char* outDir = mode == "render" && argc > 2 ? argv[2] : nullptr;
    testParser();
    testRawMidiFrames();
    testControls();
    testInstruments(outDir);
    testBrisMotorVoices();
    testBlockSizes();
    testRepeater();
    testFx();
    testApp(outDir);
    renderPresets(outDir);
    bench();
    std::printf("\n%d passed, %d failed\n%s\n", gPass, gFail, gFail ? "AKAI TEST FAIL" : "AKAI TEST OK");
    return gFail ? 1 : 0;
}
