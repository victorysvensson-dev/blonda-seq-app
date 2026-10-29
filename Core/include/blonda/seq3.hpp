// BLONDA SEQ — the whole groovebox: project model, sample-accurate sequencer, ten tracks (6 drums + 4 melodic),
// channel strips (drive, filter, crush, comp, pump, fader, pan, sends) and the master chain (echo, space,
// tape drive, crush, filter, glue compressor, limiter) — all matching the web version.
#pragma once
#include "bris.hpp"
#include "convolver.hpp"
#include "drums.hpp"
#include "dynamics.hpp"
#include "engines.hpp"
#include "json.hpp"
#include <array>
#include <string>
#include <vector>

namespace blonda {

constexpr int kTracks = 10, kSteps = 16, kPatterns = 4;
enum TrackId { T_KICK, T_SNARE, T_CLAP, T_HAT, T_OHAT, T_PERC, T_BASS, T_KEYS, T_LEAD, T_PAD };

struct Cell { int v = 0, n = 0, r = 1; float p = 1.f, vel = -1.f; };
struct RollNote { float s = 0, l = 1; int n = 60; float v = .72f; int id = -1, g = -1; };
struct TrackParams { float level = .5f, tune = 0, decay = .4f, tone = .5f, pan = 0, echo = 0, space = 0; };
struct TrackFX { float drive = 0, filt = 0, reso = 0, crush = 0, comp = 0, pump = 0; };
struct MasterParams { float filter = 0, echo = .38f, space = .4f, drive = .12f, pump = .4f, swing = .12f, vol = .75f; };
struct FxParams { bool echoOn = true; float echoFb = .38f, echoTime = .75f; bool spaceOn = true; float spaceSize = 2.6f; bool tapeOn = true; float tapeColor = .75f;
                  bool crushOn = false; float crushBits = 6, crushMix = .4f; };

// parameter addressing for the UI / MIDI learn: group 0 = track sound, 1 = track FX, 2 = master
enum ParamGroup { PG_TRACK, PG_TFX, PG_MASTER };

struct Project {
    float bpm = 118; int pat = 0; int solo = -1; std::array<int, kTracks> mute{};
    std::array<TrackParams, kTracks> params; std::array<TrackFX, kTracks> tfx; std::array<int, kTracks> len{};
    MasterParams master; FxParams fx;
    std::array<std::string, 4> inst{"analog", "analog", "pluck", "pad"};
    EngineParams eng; BrisParams bris; std::array<AnalogP, 4> synth;
    int chordKeys = 1, chordPad = 1; std::array<std::string, 6> kit{};
    bool song = false; std::array<int, 8> chain{{-1, -1, -1, -1, -1, -1, -1, -1}}; float glideT = .07f;
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
    std::vector<float> dlL_, dlR_; int dlW_ = 0; Smoother dlTime_, fb_, dRet_, rRet_, pre_, post_, tapeF_, crushWet_, crushDry_, lpF_, hpF_, out_;
    float dToneC_[5]{}, dToneZ_[2][2]{}, rHpC_[5]{}, rHpZ_[2][2]{}, tapeC_[5]{}, tapeZ_[2][2]{}, mLpC_[5]{}, mLpZ_[2][2]{}, mHpC_[5]{}, mHpZ_[2][2]{};
    float lastTape_ = -1, lastMLp_ = -1, lastMHp_ = -1;
    float shUp_[2]{}; HalfbandDecimator shDec_[2]; std::array<float, 2 * 128> shLat_{}; int shLi_ = 0;
    Convolver reverb_; WebCompressor comp_, lim_;
    std::vector<float> busL_, busR_, dInL_, dInR_, rInL_, rInR_, tmpL_, tmpR_;
};

} // namespace blonda
