#include "akai/bris_instrument.hpp"
#include <cstring>

namespace akai {

namespace {

using blonda::BrisParams;

const char* const kWave[] = {"SAW", "PULSE"};
const char* const kLfoW[] = {"TRI", "RAMP+", "RAMP-", "SQR", "S&H"};
const char* const kOnOff[] = {"FREE", "SYNC"};
const char* const kDest[] = {"PITCH", "FILTER", "AMP"};
const char* const kCho[] = {"OFF", "I", "II"};
const char* const kDlyT[] = {"1/8", "1/8.", "1/4", "1/16", "1/8T", "1/4."};
const char* const kVoice[] = {"POLY", "MONO", "UNISON"};

struct Def { ParamInfo info; float BrisParams::* field; };

// All 32 Bris parameters. ids match blonda::BrisParams and the SEQ.3 project JSON.
const Def kDefs[] = {
    {{"wave", "WAVE", 0, 1, 0, 2, kWave}, &BrisParams::wave},
    {{"pw", "PW", 0, 1, .5f}, &BrisParams::pw},
    {{"det", "DETUNE", 0, 1, .42f}, &BrisParams::det},
    {{"sub", "SUB", 0, 1, .18f}, &BrisParams::sub},
    {{"noise", "NOISE", 0, 1, 0}, &BrisParams::noise},
    {{"glide", "GLIDE", 0, 1, 0}, &BrisParams::glide},
    {{"drift", "DRIFT", 0, 1, .45f}, &BrisParams::drift},
    {{"cut", "CUTOFF", 0, 1, .46f}, &BrisParams::cut},
    {{"res", "RESO", 0, 1, .14f}, &BrisParams::res},
    {{"fenv", "ENV AMT", 0, 1, .22f}, &BrisParams::fenv},
    {{"kt", "KEYTRK", 0, 1, .5f}, &BrisParams::kt},
    {{"fvel", "VEL>FLT", 0, 1, .3f}, &BrisParams::fvel},
    {{"fA", "ATTACK", 0, 1, .55f}, &BrisParams::fA},
    {{"fD", "DECAY", 0, 1, .6f}, &BrisParams::fD},
    {{"fS", "SUSTAIN", 0, 1, .55f}, &BrisParams::fS},
    {{"fR", "F.REL", 0, 1, .6f}, &BrisParams::fR},
    {{"aA", "ATTACK", 0, 1, .55f}, &BrisParams::aA},
    {{"aD", "DECAY", 0, 1, .6f}, &BrisParams::aD},
    {{"aS", "SUSTAIN", 0, 1, .85f}, &BrisParams::aS},
    {{"aR", "RELEASE", 0, 1, .62f}, &BrisParams::aR},
    {{"lfoW", "LFO WAV", 0, 4, 0, 5, kLfoW}, &BrisParams::lfoW},
    {{"lfoR", "RATE", 0, 1, .18f}, &BrisParams::lfoR},
    {{"lfoSync", "SYNC", 0, 1, 0, 2, kOnOff}, &BrisParams::lfoSync},
    {{"lfoDest", "DEST", 0, 2, 1, 3, kDest}, &BrisParams::lfoDest},
    {{"lfoAmt", "DEPTH", 0, 1, .22f}, &BrisParams::lfoAmt},
    {{"cho", "CHORUS", 0, 2, 2, 3, kCho}, &BrisParams::cho},
    {{"choMix", "CHO MIX", 0, 1, .75f}, &BrisParams::choMix},
    {{"dly", "DELAY", 0, 1, .24f}, &BrisParams::dly},
    {{"dlyT", "TIME", 0, 5, 1, 6, kDlyT}, &BrisParams::dlyT},
    {{"dlyFb", "FEEDBK", 0, 1, .38f}, &BrisParams::dlyFb},
    {{"vmode", "VOICES", 0, 2, 0, 3, kVoice}, &BrisParams::vmode},
    {{"vol", "VOLUME", 0, 1, .8f}, &BrisParams::vol},
};
constexpr int kNum = (int)(sizeof(kDefs) / sizeof(kDefs[0]));
static_assert(kNum == 32, "Bris has 32 parameters");

enum { WAVE, PW, DET, SUB, NOISE, GLIDE, DRIFT, CUT, RES, FENV, KT, FVEL, FA, FD, FS, FR, AA, AD, AS, AR,
       LFOW, LFOR, LFOSYNC, LFODEST, LFOAMT, CHO, CHOMIX, DLY, DLYT, DLYFB, VMODE, VOL };

const Page kPages[] = {
    {"OSC", {WAVE, DET, SUB}},
    {"TONE", {PW, NOISE, DRIFT}},
    {"FILTER", {CUT, RES, FENV}},
    {"FLT ENV", {FA, FD, FS}},
    {"FLT MOD", {FR, KT, FVEL}},
    {"AMP ENV", {AA, AD, AS}},
    {"AMP", {AR, VOL, VMODE}},
    {"LFO", {LFOW, LFOR, LFOAMT}},
    {"LFO RTE", {LFODEST, LFOSYNC, GLIDE}},
    {"CHORUS", {CHO, CHOMIX, -1}},
    {"DELAY", {DLY, DLYT, DLYFB}},
};
constexpr int kNumPages = (int)(sizeof(kPages) / sizeof(kPages[0]));

inline float clamp01(float v) { return v < 0.f ? 0.f : (v > 1.f ? 1.f : v); }

} // namespace

BrisInstrument::BrisInstrument() { presets_ = blonda::brisPresets(nPresets_); }

void BrisInstrument::prepare(float sampleRate) {
    syn_.prepare(sampleRate);
    // Pads and MIDI keys send their own note-off, so held notes sustain (instead of the web keyboard's 24 steps).
    syn_.liveHoldSec = 3600.f;
    loadPreset(0);
}

void BrisInstrument::reset() { syn_.reset(); }

void BrisInstrument::noteOn(int note, float velocity, int offset) { syn_.noteOn(note, velocity, offset, 1, 0.f); }
void BrisInstrument::noteOff(int note, int offset) { syn_.noteOff(note, offset); }
void BrisInstrument::allNotesOff() { syn_.allNotesOff(); }

void BrisInstrument::pressure(float amount) {
    amount = clamp01(amount);
    if (amount == pressure_) return;
    pressure_ = amount;
    apply();
}

// Pressure opens the filter (up to +0.3 of the cutoff range) on top of the edited sound.
void BrisInstrument::apply() {
    syn_.params = base_;
    syn_.params.cut = clamp01(base_.cut + pressure_ * 0.3f);
}

void BrisInstrument::process(float* L, float* R, int frames) { syn_.process(L, R, frames); }

int BrisInstrument::numParams() const { return kNum; }
const ParamInfo& BrisInstrument::param(int i) const { return kDefs[i].info; }
float BrisInstrument::get(int i) const { return base_.*(kDefs[i].field); }
void BrisInstrument::set(int i, float value) {
    const ParamInfo& p = kDefs[i].info;
    value = value < p.min ? p.min : (value > p.max ? p.max : value);
    base_.*(kDefs[i].field) = value;
    apply();
}

int BrisInstrument::numPages() const { return kNumPages; }
const Page& BrisInstrument::page(int p) const { return kPages[p]; }

const char* BrisInstrument::presetName(int i) const { return presets_[i].name; }
const char* BrisInstrument::presetCategory(int i) const { return presets_[i].category; }
void BrisInstrument::loadPreset(int i) {
    if (i < 0 || i >= nPresets_) return;
    base_ = presets_[i].params;
    apply();
}

int BrisInstrument::faderParam() const { return CUT; }

} // namespace akai
