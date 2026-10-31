// BLONDA SEQ — the whole groovebox: project model, sample-accurate sequencer, ten tracks (6 drums + 4 melodic),
// channel strips (drive, filter, crush, comp, pump, fader, pan, sends) and the master chain (echo, space,
// tape drive, crush, filter, glue compressor, limiter) — all matching the web version.
#pragma once
#include "bris.hpp"
#include "convolver.hpp"
#include "drums.hpp"
#include "dynamics.hpp"
#include "engines.hpp"
#include "glitch.hpp"
#include "json.hpp"
#include "sampler.hpp"
#include "bris/bris.h"   // BLONDA motor (External/blonda-motor, pinned tag)
#include <array>
#include <string>
#include <vector>

namespace blonda {

constexpr int kTracks = 10, kSteps = 16, kPatterns = 4;
enum TrackId { T_KICK, T_SNARE, T_CLAP, T_HAT, T_OHAT, T_PERC, T_BASS, T_KEYS, T_LEAD, T_PAD };

struct Cell { int v = 0, n = 0, r = 1; float p = 1.f, vel = -1.f, o = 0.f; };   // o: nudge, share of a step (-0.5 early … +0.5 late)
struct RollNote { float s = 0, l = 1; int n = 60; float v = .72f; int id = -1, g = -1; };
struct TrackParams { float level = .5f, tune = 0, decay = .4f, tone = .5f, pan = 0, echo = 0, space = 0; };
struct TrackFX { float drive = 0, filt = 0, reso = 0, crush = 0, comp = 0, pump = 0; };
struct MasterParams { float filter = 0, echo = .38f, space = .4f, drive = .12f, pump = .4f, swing = .12f, vol = .75f; };
struct FxParams { bool echoOn = true; float echoFb = .38f, echoTime = .75f; bool spaceOn = true; float spaceSize = 2.6f; bool tapeOn = true; float tapeColor = .75f;
                  bool crushOn = false; float crushBits = 6, crushMix = .4f; };

// parameter addressing for the UI / MIDI learn: group 0 = track sound, 1 = track FX, 2 = master
enum ParamGroup { PG_TRACK, PG_TFX, PG_MASTER };

// BLONDA motor state per melodic track: chosen factory sound + every parameter (in the motor's own units)
struct MotorState { int preset = 1; std::array<double, bris::kNumParams> vals{}; bool set = false; };

struct LoopSlot { std::string sid; bool on = true; float vol = .8f; int bars = 0; };   // web: S.loops[k] (bars 0 = the sample's own)

struct Project {
    float bpm = 118; int pat = 0; int solo = -1; std::array<int, kTracks> mute{};
    std::array<TrackParams, kTracks> params; std::array<TrackFX, kTracks> tfx; std::array<int, kTracks> len{};
    MasterParams master; FxParams fx;
    std::array<std::string, 4> inst{"analog", "analog", "pluck", "pad"};
    EngineParams eng; BrisParams bris; std::array<AnalogP, 4> synth;
    int chordKeys = 1, chordPad = 1; std::array<std::string, 6> kit{};
    bool song = false; std::array<int, 8> chain{{-1, -1, -1, -1, -1, -1, -1, -1}}; float glideT = .07f;
    std::array<LoopSlot, 4> loops;
    std::array<MotorState, 4> motor;
    int world = 0;   // web: S.world (colour world, the sound does not change)
    float glitchAmt = 0; int glitchMask = 0x7F;   // BLONDA GLITCH: auto chance per step, which effects auto may pick (bits 0..6)
    Cell cells[kPatterns][kTracks][kSteps];
    std::vector<RollNote> roll[kPatterns][4];
    bool loadJSON(const std::string& text, std::string* err = nullptr);   // the web version's S object
    // writes the project back in the web format; fields the app does not model are kept from `base` (the loaded file)
    std::string toJSON(const std::string& base) const;
};

// field order — track: level tune decay tone pan echo space · fx: drive filt reso crush comp pump ·
// master: filter echo space drive pump swing vol
inline float* paramPtr(Project& p, int group, int track, int field) {
    if (group == PG_MASTER) { MasterParams& m = p.master; float* f[] = {&m.filter, &m.echo, &m.space, &m.drive, &m.pump, &m.swing, &m.vol}; return field >= 0 && field < 7 ? f[field] : nullptr; }
    if (track < 0 || track >= kTracks) return nullptr;
    if (group == PG_TRACK) { TrackParams& t = p.params[track]; float* f[] = {&t.level, &t.tune, &t.decay, &t.tone, &t.pan, &t.echo, &t.space}; return field >= 0 && field < 7 ? f[field] : nullptr; }
    if (group == PG_TFX) { TrackFX& t = p.tfx[track]; float* f[] = {&t.drive, &t.filt, &t.reso, &t.crush, &t.comp, &t.pump}; return field >= 0 && field < 6 ? f[field] : nullptr; }
    return nullptr;
}
// value ranges, as in the web version (SKEY / FXR / master)
inline void paramRange(int group, int field, float& lo, float& hi) {
    lo = 0; hi = 1;
    if (group == PG_TRACK && field == 1) { lo = -12; hi = 12; }
    if (group == PG_TRACK && field == 4) { lo = -1; }
    if (group == PG_TFX && field == 1) { lo = -1; }
    if (group == PG_TFX && field == 5) { hi = 1.5f; }
    if (group == PG_MASTER && field == 0) { lo = -1; }
}

// engine names as stored in projects (S.inst); index = id used by the real-time instrument switch
constexpr int kNumKits = 15;
static const char* const kKitNames[kNumKits] = {"", "808", "909", "thump", "dist", "rim", "lofi", "snap", "stack", "shaker", "tick", "conga", "cowbell", "clave", "tom"};
constexpr int kNumEngines = 11;
// "bris6" = BLONDA BRIS from the shared BLONDA motor library (Bree6 clone, same code as the Max for Live plugin)
static const char* const kEngineNames[kNumEngines] = {"analog", "acid", "sub", "fm", "pluck", "super", "chip", "sh101", "mini", "bris", "bris6"};
inline int engineIndex(const std::string& n) { for (int i = 0; i < kNumEngines; ++i) if (n == kEngineNames[i]) return i; return 0; }

// ---- engine parameters by (engine, field index): the sliders of the synth module (ENG[e].ps in the web version)
inline float* engFloat(Project& p, int k, int e, int f) {
    if (k < 0 || k >= 4 || f < 0) return nullptr;
    auto pick = [f](std::initializer_list<float*> l) -> float* { return f < (int)l.size() ? *(l.begin() + f) : nullptr; };
    switch (e) {
        case 0: { AnalogP& a = p.synth[k]; return pick({&a.cut, &a.res, &a.env, &a.a, &a.d, &a.s, &a.r}); }
        case 1: { AcidP& a = p.eng.acid; return pick({&a.cut, &a.res, &a.env, &a.dec, &a.acc, &a.drive, &a.dtone, &a.st}); }
        case 2: { SubP& a = p.eng.sub; return pick({&a.decay, &a.punch, &a.drive, &a.tone, &a.glide, &a.click}); }
        case 3: { FMP& a = p.eng.fm; return pick({&a.ratio, &a.index, &a.decay, &a.bell, &a.rel, &a.bright}); }
        case 4: { PluckP& a = p.eng.pluck; return pick({&a.damp, &a.bright, &a.body, &a.len, &a.width, &a.drive}); }
        case 5: { SuperP& a = p.eng.super_; return pick({&a.detune, &a.attack, &a.release, &a.bright, &a.width, &a.air}); }
        case 6: { ChipP& a = p.eng.chip; return pick({&a.dec, &a.vib, &a.arp, &a.crush}); }
        case 7: { SH101P& a = p.eng.sh101; return pick({&a.cut, &a.res, &a.env, &a.D, &a.S, &a.saw, &a.pulse, &a.sub, &a.pw, &a.porta}); }
        case 8: { MiniP& a = p.eng.mini; return pick({&a.cut, &a.emph, &a.contour, &a.fD, &a.aD, &a.aS, &a.m1, &a.m2, &a.m3, &a.glide}); }
        case 9: { BrisParams& a = p.bris; return pick({&a.cut, &a.res, &a.fenv, &a.aA, &a.aR, &a.det, &a.sub, &a.choMix, &a.dly}); }
    }
    return nullptr;
}
// slider range per field (web: analog envelope a .001–1 s, d .02–2 s, r .02–3 s; fm ratio is an index 0..6)
inline void engRange(int e, int f, float& lo, float& hi) {
    lo = 0.f; hi = 1.f;
    if (e == 3 && f == 0) hi = 6.f;
    if (e == 0) { if (f == 3) lo = .001f; if (f == 4) { lo = .02f; hi = 2.f; } if (f == 6) { lo = .02f; hi = 3.f; } }
}
// switch-like options (wave, slide, range ...): read/write as int
inline bool engOpt(Project& p, int k, int e, int f, int* get, const int* set) {
    if (k < 0 || k >= 4) return false;
    auto I = [&](int& r) { if (get) *get = r; if (set) r = *set; return true; };
    auto F = [&](float& r) { if (get) *get = (int)r; if (set) r = (float)*set; return true; };
    switch (e) {
        case 0: if (f == 0) return I(p.synth[k].wave); break;
        case 1: if (f == 0) return I(p.eng.acid.wave); if (f == 1) return I(p.eng.acid.slide); break;
        case 6: if (f == 0) return I(p.eng.chip.duty); if (f == 1) return I(p.eng.chip.arpm); if (f == 2) return I(p.eng.chip.oct); break;
        case 7: if (f == 0) return I(p.eng.sh101.range); if (f == 1) return I(p.eng.sh101.subMode); break;
        case 8: if (f == 0) return I(p.eng.mini.glideOn); if (f == 1) return I(p.eng.mini.decSw); break;
        case 9: if (f == 0) return F(p.bris.wave); if (f == 1) return F(p.bris.vmode); break;
    }
    return false;
}

void buildReverb(Convolver& c, float size, float sr);

class Seq3 {
public:
    void prepare(float sampleRate);
    void load(const Project& p);     // call when not rendering (or swap safely between blocks)
    Project& project() { return P_; }
    void applyParams();              // after editing project() parameters
    void play(); void stop(); bool playing() const { return playing_; }
    void queuePattern(int p) { queued_ = p; }
    // real-time safe edits (call from the audio thread, e.g. when draining a command queue)
    void setCell(int pat, int track, int step, const Cell& c) { if (pat >= 0 && pat < kPatterns && track >= 0 && track < kTracks && step >= 0 && step < kSteps) P_.cells[pat][track][step] = c; }
    void swapRoll(int pat, int melTrack, std::vector<RollNote>& notes) { if (pat >= 0 && pat < kPatterns && melTrack >= 0 && melTrack < 4) P_.roll[pat][melTrack].swap(notes); }
    void setBPM(float bpm) { P_.bpm = std::max(40.f, std::min(240.f, bpm)); applyParams(); }
    void setPattern(int p) { if (playing_) queued_ = p; else P_.pat = p; }
    void setMute(int track, bool m) { if (track >= 0 && track < kTracks) { P_.mute[track] = m; applyParams(); } }
    int pattern() const { return P_.pat; }
    // switch a melodic track's instrument (short names fit std::string's small buffer: no allocation)
    void setInstrument(int k, int idx) { if (k >= 0 && k < 4 && idx >= 0 && idx < kNumEngines) { if (P_.inst[k] == "bris6" && idx != 10) mot_[k].allNotesOff(); P_.inst[k] = kEngineNames[idx]; applyParams(); } }
    void setEngParam(int k, int e, int f, float v) { if (float* x = engFloat(P_, k, e, f)) { *x = v; if (e == 9) applyParams(); } }
    void setEngOpt(int k, int e, int f, int v) { if (engOpt(P_, k, e, f, nullptr, &v) && e == 9) applyParams(); }
    // live (web: XY pad + beat repeat). f −1..1 = lowpass/highpass, fx 0..1 = echo + space throw.
    void setPerform(bool on, float f, float fx);
    // beat repeat: mode 1 engage, 2 change length, 0 release; div 0..8 = 1/2 1/4 1/8 1/8T 1/16 1/16T 1/32 1/32T 1/64
    void repeat(int mode, int div);
    bool repeating() const { return rpPh_ != 0; }
    // plugins (web: S.fx) — 0 echo on, 1 echo feedback, 2 echo time, 3 space on, 4 space size, 5 tape on, 6 tape colour, 7 crush on, 8 crush bits, 9 crush mix
    void setFx(int field, float v);
    // a new reverb built off the audio thread (space size); returns the old one to free elsewhere (nullptr if built in)
    Convolver* swapReverb(Convolver* c);
    ~Seq3() { if (rev_ != &revA_) delete rev_; }
    // samples (pointers owned by the Host; see sampler.hpp)
    void setLoop(int k, const SampleData* smp, float srcBpm, int bars, float norm);
    void setLoopOn(int k, bool on);
    void setLoopVol(int k, float v);
    void setDrumSample(int i, const SampleData* smp, float norm);   // nullptr: back to the synth kit
    void previewSample(const SampleData* smp, float rate, float gain);   // nullptr stops the preview
    void dropSample(const SampleData* smp);                          // nothing may play it after this returns
    // BLONDA motor (engine "bris6")
    void setMotorPreset(int k, int i) { if (k < 0 || k >= 4) return; mot_[k].loadPreset(i); P_.motor[k].preset = i; for (int p = 0; p < bris::kNumParams; ++p) P_.motor[k].vals[p] = mot_[k].getParam(p); }
    void setMotorParam(int k, int p, double v) { if (k < 0 || k >= 4 || p < 0 || p >= bris::kNumParams) return; mot_[k].setParam(p, v); P_.motor[k].vals[p] = mot_[k].getParam(p); }
    double motorMeter(int k) const { return (k >= 0 && k < 4) ? motEnv_[k] : 0; }
    // drum kit of track i (web: S.dk[id]); index into kKitNames
    void setKit(int i, int idx) { if (i < 0 || i >= 6 || idx < 0 || idx >= kNumKits) return; dsmp_[i] = nullptr; P_.kit[i] = kKitNames[idx]; drums_[i].setKit(kKitNames[idx]); }
    void setGlideT(float v) { P_.glideT = v; }
    // BLONDA GLITCH (master): hold an effect (0 = let go), auto chance, which effects auto uses
    void glitchHold(int fx) { glitch_.hold(fx, frame_, std::max(64, (int)std::lround(60.0 / P_.bpm / 4 * sr_))); }
    void setGlitchAmt(float a) { P_.glitchAmt = std::max(0.f, std::min(1.f, a)); }
    void setGlitchMask(int m) { P_.glitchMask = m & 0x7F; }
    int glitchActive() const { return glitch_.active(); }
    void setChord(int t, bool on) { if (t == 7) P_.chordKeys = on; else if (t == 9) P_.chordPad = on; }
    void setSong(bool on) { P_.song = on; songStart_ = true; if (!on) chainIdx_ = -1; }
    void setChain(int k, int v) { if (k >= 0 && k < 8) P_.chain[k] = (v >= 0 && v < kPatterns) ? v : -1; }
    int chainIndex() const { return P_.song && playing_ ? chainIdx_ : -1; }
    void setSolo(int t) { P_.solo = (t >= 0 && t < kTracks) ? t : -1; applyParams(); }
    void setLen(int t, int L) { if (t >= 0 && t < kTracks) P_.len[t] = std::max(1, std::min(16, L)); }
    void setParam(int group, int track, int field, float v) {
        if (float* f = paramPtr(P_, group, track, field)) { float lo, hi; paramRange(group, field, lo, hi); *f = std::max(lo, std::min(hi, v)); applyParams(); }
    }
    // live notes from the keyboard / MIDI (lengthSec <= 0: held until noteOff)
    void liveNote(int track, int note, float vel, bool on);
    void render(float* L, float* R, int frames);
    int currentStep() const { return audible_; }   // the step you hear right now (-1 when stopped)
    double timeSec() const { return (double)frame_ / sr_; }
    std::vector<float>* dbgBus = nullptr; const std::vector<float>* dbgInBus = nullptr; size_t dbgInPos = 0;   // tests: capture the bus before the master chain (interleaved)
    void bypassMasterDynamics() { comp_.threshold = 0; comp_.ratio = 1; comp_.knee = 0; }   // tests

private:
    Glitch glitch_;
    double nowT_ = 0;   // start of the block being scheduled (nudged steps never land before it)
    struct Ev { long long f; int track; float vel; int note; float ls; int glide; };   // f = absolute frame
    struct Strip {
        WebParam pg{1.f};                 // pump duck
        Smoother g, pan, se, ss, dpre, dpost, mk, lpf, hpf, lpq, hpq;
        float bq[2][4]{};                 // lp/hp states (2 ch x 2 biquads)
        float lpc[5]{1, 0, 0, 0, 0}, hpc[5]{1, 0, 0, 0, 0}; float lastLp[2]{-1, -1}, lastHp[2]{-1, -1};
        float driveK = 0; float up[2]{}; HalfbandDecimator dec[2]; std::array<float, 2 * 128> lat{}; int li = 0; bool driveOn = false;
        int crushBits = 0; WebCompressor comp;
    };
    void schedule(long long blockEnd);
    void scheduleStep(long long f0);
    void trigger(int i, long long f, float vel, int note, float ls, int glide);
    void dispatch(long long blockStart, int frames);
    void duckAt(WebParam& g, double t, float a, float base);
    void pump(double t);
    static float web2lin(float);
    bool isMuted(int i) const { return P_.solo >= 0 ? P_.solo != i : P_.mute[i] != 0; }
    int trkLen(int i) const { int v = P_.len[i]; return v >= 1 && v <= 16 ? v : 16; }
    double stepDur() const { return 60.0 / P_.bpm / 4.0; }

    struct StepMark { long long f; int step; }; std::array<StepMark, 32> marks_{}; int markW_ = 0; int audible_ = -1;
    Project P_; Noise prob_; float sr_ = 48000; long long frame_ = 0; bool playing_ = false;
    // sequencer
    long long nextF_ = 0; double nextT_ = 0; int step_ = 0, gstep_ = 0, bar_ = 0, curStep_ = -1, queued_ = -1, chainIdx_ = -1; bool songStart_ = true;
    std::vector<Ev> evq_; std::vector<Glide> glides_; int glideN_ = 0;
    // instruments
    std::array<DrumTrack, 6> drums_; std::array<MelodicTrack, 4> mel_; std::array<Bris, 4> bris_;
    // mixing
    std::array<Strip, kTracks> strips_;
    std::vector<float> chL_[kTracks], chR_[kTracks];
    WebParam duck_{1.f};
    // master
    std::array<bris::Bris, 4> mot_;
    struct MotEv { long long f; int note; float vel; bool on; uint32_t gen; };
    std::array<std::array<MotEv, 128>, 4> motQ_{}; std::array<int, 4> motN_{};
    std::array<std::array<uint32_t, 128>, 4> motGen_{}; std::array<double, 4> motEnv_{};
    void motorEvent(int k, long long f, int note, float vel, bool on, uint32_t gen = 0) { if (motN_[k] < 128) motQ_[k][motN_[k]++] = {f, note, vel, on, gen}; }
    void renderMotor(int k, long long b0, int n, float* L, float* R);
    struct LoopRt { const SampleData* s = nullptr; float srcBpm = 120; int bars = 1; float norm = 1; };
    std::array<LoopRt, 4> loopRt_{}; std::array<const SampleData*, 6> dsmp_{}; std::array<float, 6> dnorm_{};
    std::array<SampleVoice, 32> svox_{}; std::array<bool, 6> sampleTail_{}; std::array<LoopVoice, 16> lvox_{}; long long sAge_ = 0;
    void startSample(int i, long long f, float vel);
    void startLoop(int slot, const SampleData* s, long long f, double dur, double rate, float lv);
    void killLoops(int slot);   // -1: every loop, -2: the preview
    void renderSamples(long long b0, int n);
    void renderLoops(long long b0, int n);
    Smoother perf_, rpDry_, rpWet_;
    std::vector<float> rpBuf_[2][2]; int rpPh_ = 0, rpCur_ = 0, rpCap_ = 1, rpW_ = 0, rpPos_ = 0, rpLen_ = 1, rpNew_ = 1, rpShort_ = 0; long long rpT_ = 0; bool rpLoop_ = false;
    std::vector<float> dlL_, dlR_; int dlW_ = 0; Smoother dlTime_, fb_, dRet_, rRet_, pre_, post_, tapeF_, crushWet_, crushDry_, lpF_, hpF_, out_;
    float dToneC_[5]{}, dToneZ_[2][2]{}, rHpC_[5]{}, rHpZ_[2][2]{}, tapeC_[5]{}, tapeZ_[2][2]{}, mLpC_[5]{}, mLpZ_[2][2]{}, mHpC_[5]{}, mHpZ_[2][2]{};
    float lastTape_ = -1, lastMLp_ = -1, lastMHp_ = -1;
    float shUp_[2]{}; HalfbandDecimator shDec_[2]; std::array<float, 2 * 128> shLat_{}; int shLi_ = 0;
    Convolver revA_; Convolver* rev_ = &revA_; WebCompressor comp_, lim_;
    std::vector<float> busL_, busR_, dInL_, dInR_, rInL_, rInR_, tmpL_, tmpR_;
};

} // namespace blonda
