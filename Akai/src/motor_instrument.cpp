#include "akai/motor_instrument.hpp"
#include "blonda/motorer.h"
#include "bris/bris.h"
#include <cmath>
#include <cstring>

namespace akai {

// ---------------------------------------------------------------- skins
namespace {
const char* const kBrisWave[] = {"SAW", "PULSE", "SAW+PLS"};
const char* const kBrisLfo[] = {"TRI", "RAMP+", "RAMP-", "SQUARE", "S&H"};
const char* const kBrisMode[] = {"POLY ST", "POLY", "MONO", "UNISON"};
const MotorSkin::Label kBrisLabels[] = {
    {"vform", "WAVE", kBrisWave, 3}, {"lfoosc", "LFO>OSC", nullptr, 0}, {"pw", "PW", nullptr, 0}, {"sub", "SUB", nullptr, 0},
    {"lfopwm", "LFO>PWM", nullptr, 0}, {"cut", "CUTOFF", nullptr, 0}, {"res", "RESO", nullptr, 0}, {"eg1", "EG1 MOD", nullptr, 0},
    {"lfocut", "LFO>CUT", nullptr, 0}, {"kbd", "KEYTRK", nullptr, 0}, {"lfoamp", "LFO>AMP", nullptr, 0}, {"kbda", "AMP KEY", nullptr, 0},
    {"vol", "VOLUME", nullptr, 0}, {"lwave", "LFO WAV", kBrisLfo, 5}, {"lrate", "LFO RTE", nullptr, 0},
    {"fa", "ATTACK", nullptr, 0}, {"fd", "DECAY", nullptr, 0}, {"fs", "SUSTAIN", nullptr, 0}, {"fr", "RELEASE", nullptr, 0},
    {"aa", "ATTACK", nullptr, 0}, {"ad", "DECAY", nullptr, 0}, {"asus", "SUSTAIN", nullptr, 0}, {"ar", "RELEASE", nullptr, 0},
    {"lage", "VOICES", kBrisMode, 4}, {"porta", "PORTA", nullptr, 0}, {"detune", "DETUNE", nullptr, 0}, {"uniint", "UNI INT", nullptr, 0},
    {"chorus", "CHORUS", nullptr, 0}, {"dtime", "TIME", nullptr, 0}, {"dfb", "FEEDBK", nullptr, 0}, {"dmix", "MIX", nullptr, 0},
    {"velf", "VEL>EG1", nullptr, 0}, {"vela", "VEL>AMP", nullptr, 0}, {"mwosc", "WHL>LFO", nullptr, 0}, {"mwcut", "WHL>CUT", nullptr, 0},
    {"bendr", "BEND", nullptr, 0},
};
const MotorSkin::PageDef kBrisPages[] = {
    {"OSC", {"vform", "sub", "pw"}},         {"OSC MOD", {"lfoosc", "lfopwm", "detune"}}, {"FILTER", {"cut", "res", "eg1"}},
    {"FLT MOD", {"kbd", "lfocut", "velf"}},  {"FLT ENV", {"fa", "fd", "fs"}},             {"AMP ENV", {"aa", "ad", "asus"}},
    {"RELEASE", {"fr", "ar", "vela"}},       {"LFO", {"lwave", "lrate", "lfoamp"}},       {"VOICES", {"lage", "uniint", "porta"}},
    {"CHORUS", {"chorus", "kbda", "vol"}},   {"ECHO", {"dtime", "dfb", "dmix"}},          {"WHEEL", {"mwosc", "mwcut", "bendr"}},
};
#define N(a) (int)(sizeof(a) / sizeof(a[0]))
const MotorSkin kSkins[] = {
    {"bris", "BRIS", "Bree6-style poly (blonda-motor)", kBrisPages, N(kBrisPages), kBrisLabels, N(kBrisLabels), "cut", 0.3f, 1.4f},
};
#undef N
} // namespace

const MotorSkin* findMotorSkin(const char* motor) {
    for (const MotorSkin& s : kSkins) if (!std::strcmp(s.motor, motor)) return &s;
    return nullptr;
}

// ---------------------------------------------------------------- adapter
MotorInstrument::MotorInstrument(const MotorSkin& skin) : skin_(skin), motor_(blonda::createMotor(skin.motor)) {
    const int n = motor_ ? motor_->numParams() : 0;
    for (int i = 0; i < n && i < kMaxParams; ++i) {
        const blonda::ParamInfo& p = motor_->paramInfo(i);
        ParamInfo& d = info_[i];
        d.id = p.id; d.name = p.id; d.min = (float)p.min; d.max = (float)p.max; d.def = (float)p.def;
        d.steps = p.integer ? (int)std::lround(p.max - p.min) + 1 : 0; d.labels = nullptr;
        for (int k = 0; k < skin.numLabels; ++k) if (!std::strcmp(skin.labels[k].id, p.id)) {
            d.name = skin.labels[k].shortName;
            if (skin.labels[k].values && skin.labels[k].numValues == d.steps) d.labels = skin.labels[k].values;
        }
    }
    for (int pg = 0; pg < skin.numPages && pg < kMaxPages; ++pg) {
        pages_[pg].name = skin.pages[pg].name;
        for (int k = 0; k < 3; ++k) pages_[pg].param[k] = skin.pages[pg].ids[k] && motor_ ? motor_->findParam(skin.pages[pg].ids[k]) : -1;
    }
    fader_ = motor_ && skin.faderParam ? motor_->findParam(skin.faderParam) : -1;
}
MotorInstrument::~MotorInstrument() = default;

void MotorInstrument::prepare(float sampleRate) { motor_->prepare(sampleRate); loadPreset(0); }
void MotorInstrument::reset() { motor_->reset(); voices_ = 0; }

void MotorInstrument::noteOn(int note, float velocity, int) {
    int v = (int)std::lround(velocity * 127.f);
    motor_->noteOn(note, v < 1 ? 1 : (v > 127 ? 127 : v));
}
void MotorInstrument::noteOff(int note, int) { motor_->noteOff(note); }
void MotorInstrument::allNotesOff() { motor_->allNotesOff(); }
void MotorInstrument::pitchBend(float bend) { motor_->pitchBend(bend); }
bool MotorInstrument::controlChange(int cc, int value) {
    if (cc == 1 || cc == 64 || cc == 120 || cc == 123) { motor_->midi(0xB0, (uint8_t)cc, (uint8_t)value); return true; }
    return false;
}

// MPC pads send pressure the whole time they are held. As aftertouch it would drive the engine's vibrato
// ("Wheel > LFO"), which sounds like a constant pitch wobble on pads, so pad pressure opens the filter instead.
void MotorInstrument::pressure(float amount) {
    amount = amount < 0.f ? 0.f : (amount > 1.f ? 1.f : amount);
    if (amount == pressure_) return;
    pressure_ = amount; applyFader();
}
void MotorInstrument::applyFader() {
    if (fader_ < 0) return;
    const blonda::ParamInfo& p = motor_->paramInfo(fader_);
    double v = faderBase_ + pressure_ * skin_.pressureAmount * (p.max - p.min);
    motor_->setParam(fader_, v > p.max ? p.max : v);
}

int MotorInstrument::numParams() const { return motor_->numParams() < kMaxParams ? motor_->numParams() : kMaxParams; }
const ParamInfo& MotorInstrument::param(int i) const { return info_[i]; }
float MotorInstrument::get(int i) const { return i == fader_ ? (float)faderBase_ : (float)motor_->getParam(i); }
void MotorInstrument::set(int i, float value) {
    if (i == fader_) { const blonda::ParamInfo& p = motor_->paramInfo(i); faderBase_ = value < p.min ? p.min : (value > p.max ? p.max : value); applyFader(); return; }
    motor_->setParam(i, value);
}

int MotorInstrument::numPresets() const { return motor_->numPresets(); }
const char* MotorInstrument::presetName(int i) const { return motor_->presetName(i); }
void MotorInstrument::loadPreset(int i) {
    motor_->loadPreset(i);
    if (fader_ >= 0) { faderBase_ = motor_->getParam(fader_); applyFader(); }
}

// The library's process() writes (replaces) its buffers; Akai instruments add into L/R.
void MotorInstrument::process(float* L, float* R, int frames) {
    for (int pos = 0; pos < frames; pos += kScratch) {
        const int n = frames - pos < kScratch ? frames - pos : kScratch;
        motor_->process(sL_, sR_, n);
        for (int k = 0; k < n; ++k) { L[pos + k] += sL_[k]; R[pos + k] += sR_[k]; }
    }
    if (!std::strcmp(skin_.motor, "bris")) {   // voice meter (bit mask of sounding voices)
        const int m = static_cast<blonda::bris::Bris&>(*motor_).voiceMask();
        int c = 0; for (int b = 0; b < 6; ++b) c += (m >> b) & 1;
        voices_ = c;
    }
}

} // namespace akai
