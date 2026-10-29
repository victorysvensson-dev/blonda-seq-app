#include "akai/engine_instrument.hpp"
#include <cstddef>
#include <cstring>

namespace akai {

using namespace blonda;

namespace {
enum Grp : unsigned char { G_ANALOG, G_ACID, G_SUB, G_FM, G_PLUCK, G_SUPER, G_CHIP, G_SH, G_MINI, G_SOUND };
enum Kind : unsigned char { F, I };

const char* const kAnaWave[] = {"SINE", "SQUARE", "SAW", "TRI"};
const char* const kSawSqr[] = {"SAW", "SQUARE"};
const char* const kOffOn[] = {"OFF", "ON"};
const char* const kFmRatio[] = {"x0.5", "x1", "x1.5", "x2", "x3", "x3.5", "x7"};
const char* const kDuty[] = {"12.5%", "25%", "50%", "TRI"};
const char* const kArpM[] = {"KEYS", "MAJOR", "MINOR", "OCTAVE", "OFF"};
const char* const kOct5[] = {"-2", "-1", "0", "+1", "+2"};
const char* const kShLfo[] = {"TRI", "SQUARE", "S&H", "NOISE"};
const char* const kShRange[] = {"16'", "8'", "4'", "2'"};
const char* const kPwmSrc[] = {"LFO", "MAN", "ENV"};
const char* const kSubMode[] = {"-1 OCT", "-2 OCT", "-2 25%"};
const char* const kVca[] = {"ENV", "GATE"};
const char* const kPorta[] = {"OFF", "ON", "AUTO"};
const char* const kMgRange[] = {"LO", "32'", "16'", "8'", "4'", "2'"};
const char* const kMgW12[] = {"TRI", "SHARK", "SAW", "SQUARE", "WIDE", "NARROW"};
const char* const kMgW3[] = {"TRI", "SHARK", "REVSAW", "SAW", "SQUARE", "WIDE"};
const char* const kNoise[] = {"WHITE", "PINK"};
} // namespace

struct EngineInstrument::Def { ParamInfo info; Grp grp; Kind kind; size_t off; };
struct EngineInstrument::Table { const char* name; const char* desc; const Def* defs; int n; const Page* pages; int nPages; int fader; float gain; int maxNotes; };

namespace {
using Def = EngineInstrument::Def;
using Table = EngineInstrument::Table;

#define FL(g, S, m, id, nm, lo, hi) Def{{id, nm, lo, hi, 0}, g, F, offsetof(S, m)}
#define IN(g, S, m, id, nm, lo, hi, labels) Def{{id, nm, lo, hi, 0, (hi) - (lo) + 1, labels}, g, I, offsetof(S, m)}
#define FS(g, S, m, id, nm, lo, hi, labels) Def{{id, nm, lo, hi, 0, (hi) - (lo) + 1, labels}, g, F, offsetof(S, m)}
#define TONE FL(G_SOUND, TrackSound, tone, "tone", "TONE", 0, 1)

// ---------------------------------------------------------------- Analog
const Def kAnalog[] = {
    IN(G_ANALOG, AnalogP, wave, "wave", "WAVE", 0, 3, kAnaWave),
    FL(G_ANALOG, AnalogP, cut, "cut", "CUTOFF", 0, 1), FL(G_ANALOG, AnalogP, res, "res", "RESO", 0, 1), FL(G_ANALOG, AnalogP, env, "env", "ENV AMT", 0, 1),
    FL(G_ANALOG, AnalogP, a, "a", "ATTACK", .001f, 2), FL(G_ANALOG, AnalogP, d, "d", "DECAY", .01f, 2),
    FL(G_ANALOG, AnalogP, s, "s", "SUSTAIN", 0, 1), FL(G_ANALOG, AnalogP, r, "r", "RELEASE", .01f, 3), TONE,
};
const Page kAnalogPages[] = {{"OSC", {0, 8, -1}}, {"FILTER", {1, 2, 3}}, {"ENV", {4, 5, 6}}, {"RELEASE", {7, -1, -1}}};

// ---------------------------------------------------------------- Acid (303)
const Def kAcid[] = {
    IN(G_ACID, AcidP, wave, "wave", "WAVE", 0, 1, kSawSqr),
    FL(G_ACID, AcidP, cut, "cut", "CUTOFF", 0, 1), FL(G_ACID, AcidP, res, "res", "RESO", 0, 1), FL(G_ACID, AcidP, env, "env", "ENV MOD", 0, 1),
    FL(G_ACID, AcidP, dec, "dec", "DECAY", 0, 1), FL(G_ACID, AcidP, acc, "acc", "ACCENT", 0, 1), FL(G_ACID, AcidP, drive, "drive", "DRIVE", 0, 1),
    FL(G_ACID, AcidP, dtone, "dtone", "D.TONE", 0, 1), IN(G_ACID, AcidP, slide, "slide", "SLIDE", 0, 1, kOffOn), FL(G_ACID, AcidP, st, "st", "TIME", 0, 1), TONE,
};
const Page kAcidPages[] = {{"FILTER", {1, 2, 3}}, {"ENV", {4, 5, 0}}, {"DRIVE", {6, 7, 10}}, {"SLIDE", {8, 9, -1}}};

// ---------------------------------------------------------------- Sub 808
const Def kSub[] = {
    FL(G_SUB, SubP, decay, "decay", "DECAY", 0, 1), FL(G_SUB, SubP, punch, "punch", "PUNCH", 0, 1), FL(G_SUB, SubP, drive, "drive", "DRIVE", 0, 1),
    FL(G_SUB, SubP, tone, "tone", "TONE", 0, 1), FL(G_SUB, SubP, glide, "glide", "GLIDE", 0, 1), FL(G_SUB, SubP, click, "click", "CLICK", 0, 1),
};
const Page kSubPages[] = {{"808", {0, 1, 2}}, {"TONE", {3, 4, 5}}};

// ---------------------------------------------------------------- FM Glass
const Def kFM[] = {
    FS(G_FM, FMP, ratio, "ratio", "RATIO", 0, 6, kFmRatio), FL(G_FM, FMP, index, "index", "INDEX", 0, 1), FL(G_FM, FMP, decay, "decay", "DECAY", 0, 1),
    FL(G_FM, FMP, bell, "bell", "BELL", 0, 1), FL(G_FM, FMP, rel, "rel", "RELEASE", 0, 1), FL(G_FM, FMP, bright, "bright", "BRIGHT", 0, 1), TONE,
};
const Page kFMPages[] = {{"FM", {0, 1, 2}}, {"TONE", {3, 4, 5}}, {"TRACK", {6, -1, -1}}};

// ---------------------------------------------------------------- Pluck
const Def kPluck[] = {
    FL(G_PLUCK, PluckP, damp, "damp", "DAMP", 0, 1), FL(G_PLUCK, PluckP, bright, "bright", "BRIGHT", 0, 1), FL(G_PLUCK, PluckP, body, "body", "BODY", 0, 1),
    FL(G_PLUCK, PluckP, len, "len", "LENGTH", 0, 1), FL(G_PLUCK, PluckP, width, "width", "WIDTH", 0, 1), FL(G_PLUCK, PluckP, drive, "drive", "DRIVE", 0, 1), TONE,
};
const Page kPluckPages[] = {{"STRING", {0, 1, 2}}, {"SPACE", {3, 4, 5}}, {"TRACK", {6, -1, -1}}};

// ---------------------------------------------------------------- Super Pad
const Def kSuper[] = {
    FL(G_SUPER, SuperP, detune, "detune", "DETUNE", 0, 1), FL(G_SUPER, SuperP, attack, "attack", "ATTACK", 0, 1), FL(G_SUPER, SuperP, release, "release", "RELEASE", 0, 1),
    FL(G_SUPER, SuperP, bright, "bright", "BRIGHT", 0, 1), FL(G_SUPER, SuperP, width, "width", "WIDTH", 0, 1), FL(G_SUPER, SuperP, air, "air", "AIR", 0, 1), TONE,
};
const Page kSuperPages[] = {{"SUPER", {0, 1, 2}}, {"COLOUR", {3, 4, 5}}, {"TRACK", {6, -1, -1}}};

// ---------------------------------------------------------------- Chip
const Def kChip[] = {
    IN(G_CHIP, ChipP, duty, "duty", "DUTY", 0, 3, kDuty), FL(G_CHIP, ChipP, dec, "dec", "DECAY", 0, 1), FL(G_CHIP, ChipP, vib, "vib", "VIBRATO", 0, 1),
    FL(G_CHIP, ChipP, arp, "arp", "ARP SPD", 0, 1), IN(G_CHIP, ChipP, arpm, "arpm", "ARP", 0, 4, kArpM), FL(G_CHIP, ChipP, crush, "crush", "CRUSH", 0, 1),
    IN(G_CHIP, ChipP, oct, "oct", "OCTAVE", -2, 2, kOct5), TONE,
};
const Page kChipPages[] = {{"CHIP", {0, 1, 2}}, {"ARP", {4, 3, 6}}, {"CRUSH", {5, 7, -1}}};

// ---------------------------------------------------------------- SH-101
const Def kSH[] = {
    IN(G_SH, SH101P, range, "range", "RANGE", 0, 3, kShRange),          // 0
    FL(G_SH, SH101P, saw, "saw", "SAW", 0, 1), FL(G_SH, SH101P, pulse, "pulse", "PULSE", 0, 1),
    FL(G_SH, SH101P, sub, "sub", "SUB", 0, 1), IN(G_SH, SH101P, subMode, "subMode", "SUB MOD", 0, 2, kSubMode), FL(G_SH, SH101P, noise, "noise", "NOISE", 0, 1),   // 3-5
    FL(G_SH, SH101P, pw, "pw", "PW", 0, 1), IN(G_SH, SH101P, pwmSrc, "pwmSrc", "PWM SRC", 0, 2, kPwmSrc), FL(G_SH, SH101P, vcoMod, "vcoMod", "VCO MOD", 0, 1),   // 6-8
    FL(G_SH, SH101P, cut, "cut", "CUTOFF", 0, 1), FL(G_SH, SH101P, res, "res", "RESO", 0, 1), FL(G_SH, SH101P, env, "env", "ENV", 0, 1),                          // 9-11
    FL(G_SH, SH101P, vcfMod, "vcfMod", "VCF MOD", 0, 1), FL(G_SH, SH101P, kybd, "kybd", "KYBD", 0, 1), IN(G_SH, SH101P, vcaMode, "vcaMode", "VCA", 0, 1, kVca),  // 12-14
    FL(G_SH, SH101P, A, "A", "ATTACK", 0, 1), FL(G_SH, SH101P, D, "D", "DECAY", 0, 1), FL(G_SH, SH101P, S, "S", "SUSTAIN", 0, 1), FL(G_SH, SH101P, R, "R", "RELEASE", 0, 1),  // 15-18
    FL(G_SH, SH101P, lfoR, "lfoR", "RATE", 0, 1), IN(G_SH, SH101P, lfoW, "lfoW", "WAVE", 0, 3, kShLfo),                                                  // 19-20
    FL(G_SH, SH101P, porta, "porta", "PORTA", 0, 1), IN(G_SH, SH101P, portaMode, "portaMode", "PORTA", 0, 2, kPorta), FL(G_SH, SH101P, vol, "vol", "VOLUME", 0, 1), // 21-23
    TONE,                                                                                                                                                      // 24
};
const Page kSHPages[] = {
    {"VCO", {0, 6, 7}}, {"MIXER", {1, 2, 3}}, {"SUB/NSE", {4, 5, 8}}, {"VCF", {9, 10, 11}}, {"VCF MOD", {12, 13, 24}},
    {"ENV", {15, 16, 17}}, {"VCA", {18, 14, 23}}, {"LFO", {19, 20, -1}}, {"PORTA", {21, 22, -1}},
};

// ---------------------------------------------------------------- Minimoog Model D
const Def kMini[] = {
    IN(G_MINI, MiniP, o1r, "o1r", "RANGE", 0, 5, kMgRange), IN(G_MINI, MiniP, o1w, "o1w", "WAVE", 0, 5, kMgW12),                     // 0-1
    IN(G_MINI, MiniP, o2r, "o2r", "RANGE", 0, 5, kMgRange), IN(G_MINI, MiniP, o2w, "o2w", "WAVE", 0, 5, kMgW12), FL(G_MINI, MiniP, o2f, "o2f", "FREQ", -7, 7),   // 2-4
    IN(G_MINI, MiniP, o3r, "o3r", "RANGE", 0, 5, kMgRange), IN(G_MINI, MiniP, o3w, "o3w", "WAVE", 0, 5, kMgW3), FL(G_MINI, MiniP, o3f, "o3f", "FREQ", -7, 7),    // 5-7
    IN(G_MINI, MiniP, o3lfo, "o3lfo", "AS LFO", 0, 1, kOffOn),                                                                              // 8
    FL(G_MINI, MiniP, m1, "m1", "MIX 1", 0, 1), FL(G_MINI, MiniP, m2, "m2", "MIX 2", 0, 1), FL(G_MINI, MiniP, m3, "m3", "MIX 3", 0, 1),     // 9-11
    FL(G_MINI, MiniP, mn, "mn", "NOISE", 0, 1), IN(G_MINI, MiniP, mnon, "mnon", "NOISE", 0, 1, kOffOn), IN(G_MINI, MiniP, ncol, "ncol", "COLOUR", 0, 1, kNoise),  // 12-14
    FL(G_MINI, MiniP, cut, "cut", "CUTOFF", 0, 1), FL(G_MINI, MiniP, emph, "emph", "EMPHAS", 0, 1), FL(G_MINI, MiniP, contour, "contour", "CONTOUR", 0, 1),    // 15-17
    FL(G_MINI, MiniP, fA, "fA", "ATTACK", 0, 1), FL(G_MINI, MiniP, fD, "fD", "DECAY", 0, 1), FL(G_MINI, MiniP, fS, "fS", "SUSTAIN", 0, 1),                   // 18-20
    FL(G_MINI, MiniP, aA, "aA", "ATTACK", 0, 1), FL(G_MINI, MiniP, aD, "aD", "DECAY", 0, 1), FL(G_MINI, MiniP, aS, "aS", "SUSTAIN", 0, 1),                     // 21-23
    IN(G_MINI, MiniP, decSw, "decSw", "DEC SW", 0, 1, kOffOn), IN(G_MINI, MiniP, kt1, "kt1", "KEY 1/3", 0, 1, kOffOn), IN(G_MINI, MiniP, kt2, "kt2", "KEY 2/3", 0, 1, kOffOn),  // 24-26
    FL(G_MINI, MiniP, glide, "glide", "GLIDE", 0, 1), IN(G_MINI, MiniP, glideOn, "glideOn", "GLIDE", 0, 1, kOffOn),                       // 27-28
    FL(G_MINI, MiniP, modmix, "modmix", "MOD MIX", 0, 1), IN(G_MINI, MiniP, oscMod, "oscMod", "OSC MOD", 0, 1, kOffOn),                        // 29-30
    IN(G_MINI, MiniP, filtMod, "filtMod", "FLT MOD", 0, 1, kOffOn), FL(G_MINI, MiniP, modAmt, "modAmt", "MOD AMT", 0, 1),                     // 31-32
    FL(G_MINI, MiniP, vol, "vol", "VOLUME", 0, 1), IN(G_MINI, MiniP, m1on, "m1on", "OSC 1", 0, 1, kOffOn),                                  // 33-34
    IN(G_MINI, MiniP, m2on, "m2on", "OSC 2", 0, 1, kOffOn), IN(G_MINI, MiniP, m3on, "m3on", "OSC 3", 0, 1, kOffOn), TONE,                // 35-37
};
const Page kMiniPages[] = {
    {"OSC 1", {0, 1, 9}}, {"OSC 2", {2, 3, 4}}, {"OSC 3", {5, 6, 7}}, {"MIXER", {9, 10, 11}}, {"MIX ON", {34, 35, 36}},
    {"NOISE", {12, 13, 14}}, {"FILTER", {15, 16, 17}}, {"FLT ENV", {18, 19, 20}}, {"KEYTRK", {25, 26, 37}},
    {"AMP ENV", {21, 22, 23}}, {"DEC/VOL", {24, 33, -1}}, {"GLIDE", {27, 28, -1}}, {"MOD", {29, 30, 31}}, {"MOD AMT", {32, 8, -1}},
};

#undef FL
#undef IN
#undef FS
#undef TONE
#define N(a) (int)(sizeof(a) / sizeof(a[0]))

// maxNotes: held notes at once on the MPC (oldest is released first). Measured on an MPC Sample (fw 1.3.0.12, 6 held
// notes, worst block): Mini D 113 %, SH-101 157 %, Acid 162 % (4 notes), Super 181 % (4), FM 128 %, Analog 83 % of
// one core; limits keep the worst block near 60 % until the engines are optimised for ARM.
// gain: output trim measured with `akai_test levels` (single note C3 ~ -18 dBFS RMS), like SEQ.3's track levels.
const Table kTables[] = {
    {"ANALOG", "2-osc analog", kAnalog, N(kAnalog), kAnalogPages, N(kAnalogPages), 1, 1.0f, 4},
    {"ACID", "303-style bass", kAcid, N(kAcid), kAcidPages, N(kAcidPages), 1, 0.62f, 2},
    {"SUB 808", "808 sub bass", kSub, N(kSub), kSubPages, N(kSubPages), 3, 1.0f, 6},
    {"FM GLASS", "2-op FM bell", kFM, N(kFM), kFMPages, N(kFMPages), 5, 0.77f, 3},
    {"PLUCK", "Karplus-Strong string", kPluck, N(kPluck), kPluckPages, N(kPluckPages), 1, 1.4f, 6},
    {"CHIP", "8-bit chip", kChip, N(kChip), kChipPages, N(kChipPages), 5, 0.69f, 6},
    {"SUPER", "7-saw super pad", kSuper, N(kSuper), kSuperPages, N(kSuperPages), 3, 3.16f, 2},
    {"SH-101", "SH-101-style mono", kSH, N(kSH), kSHPages, N(kSHPages), 9, 1.25f, 2},
    {"MINI D", "Model D-style mono", kMini, N(kMini), kMiniPages, N(kMiniPages), 15, 0.72f, 3},
};
// Table order follows blonda::Eng.
static_assert((int)Eng::Analog == 0 && (int)Eng::Acid == 1 && (int)Eng::Sub == 2 && (int)Eng::FM == 3 && (int)Eng::Pluck == 4 &&
              (int)Eng::Chip == 5 && (int)Eng::Super == 6 && (int)Eng::SH101 == 7 && (int)Eng::Mini == 8, "table order");
#undef N

constexpr float kLiveHoldSec = 3600.f;   // pads send their own note-off: hold until then
} // namespace

EngineInstrument::EngineInstrument(Eng engine) : eng_(engine), tab_(&kTables[(int)engine]) {}

const char* EngineInstrument::name() const { return tab_->name; }
const char* EngineInstrument::description() const { return tab_->desc; }

void EngineInstrument::prepare(float sampleRate) {
    track_.prepare(sampleRate, false);
    track_.engine = eng_;
    track_.params = &live_;
    track_.analog = &liveA_;
    loadPreset(0);
}

void EngineInstrument::reset() { allNotesOff(); }

void EngineInstrument::noteOn(int note, float velocity, int offset) {
    if (note < 0 || note > 127) return;
    if (held_[note]) noteOff(note, offset);
    // voice budget: release the oldest held note when the limit is reached
    int n = 0; for (int i = 0; i < nOrder_; ++i) n += held_[order_[i]] ? 1 : 0;
    if (n >= tab_->maxNotes) for (int i = 0; i < nOrder_; ++i) if (held_[order_[i]]) { noteOff(order_[i], offset); break; }
    const int iv[1] = {0};
    track_.trigger(velocity, note, kLiveHoldSec, iv, 1, offset, nullptr, true);
    held_[note] = true;
    // remember the order notes started in (compact the list of notes still held, then append)
    int w = 0; for (int i = 0; i < nOrder_; ++i) if (held_[order_[i]] && order_[i] != note) order_[w++] = order_[i];
    order_[w++] = note; nOrder_ = w;
}
void EngineInstrument::noteOff(int note, int) {
    if (note < 0 || note > 127) return;
    track_.releaseLive(note);
    held_[note] = false;
}
void EngineInstrument::allNotesOff() { for (int n = 0; n < 128; ++n) if (held_[n]) noteOff(n, 0); }

void EngineInstrument::process(float* L, float* R, int frames) { track_.process(L, R, frames); }

int EngineInstrument::numParams() const { return tab_->n; }
const ParamInfo& EngineInstrument::param(int i) const { return tab_->defs[i].info; }

void* EngineInstrument::field(const Def& d, bool live) {
    EngineParams& P = live ? live_ : base_;
    char* b = nullptr;
    switch (d.grp) {
    case G_ANALOG: b = (char*)(live ? &liveA_ : &baseA_); break;
    case G_ACID: b = (char*)&P.acid; break;
    case G_SUB: b = (char*)&P.sub; break;
    case G_FM: b = (char*)&P.fm; break;
    case G_PLUCK: b = (char*)&P.pluck; break;
    case G_SUPER: b = (char*)&P.super_; break;
    case G_CHIP: b = (char*)&P.chip; break;
    case G_SH: b = (char*)&P.sh101; break;
    case G_MINI: b = (char*)&P.mini; break;
    case G_SOUND: b = (char*)(live ? &track_.sound : &baseSound_); break;
    }
    return b + d.off;
}
const void* EngineInstrument::field(const Def& d) const { return const_cast<EngineInstrument*>(this)->field(d, false); }

float EngineInstrument::get(int i) const {
    const Def& d = tab_->defs[i];
    return d.kind == F ? *(const float*)field(d) : (float)*(const int*)field(d);
}

void EngineInstrument::set(int i, float value) {
    const Def& d = tab_->defs[i];
    value = value < d.info.min ? d.info.min : (value > d.info.max ? d.info.max : value);
    if (d.kind == F) *(float*)field(d, false) = value;
    else *(int*)field(d, false) = (int)(value + (value < 0 ? -0.5f : 0.5f));
    apply();
}

// live = base + pad pressure on the fader parameter (opens the filter by up to 30 % of its range)
void EngineInstrument::apply() {
    live_ = base_; liveA_ = baseA_; track_.sound = baseSound_;
    if (pressure_ > 0.f && tab_->fader >= 0) {
        const Def& d = tab_->defs[tab_->fader];
        if (d.kind == F) { float& v = *(float*)field(d, true); v += pressure_ * 0.3f * (d.info.max - d.info.min); if (v > d.info.max) v = d.info.max; }
    }
}

void EngineInstrument::pressure(float amount) {
    amount = amount < 0.f ? 0.f : (amount > 1.f ? 1.f : amount);
    if (amount == pressure_) return;
    pressure_ = amount; apply();
}

void EngineInstrument::loadPreset(int) {
    base_ = EngineParams{}; baseA_ = AnalogP{}; baseSound_ = TrackSound{};
    apply();
}

int EngineInstrument::numPages() const { return tab_->nPages; }
const Page& EngineInstrument::page(int p) const { return tab_->pages[p]; }
int EngineInstrument::faderParam() const { return tab_->fader; }
float EngineInstrument::outputGain() const { return tab_->gain; }

} // namespace akai
