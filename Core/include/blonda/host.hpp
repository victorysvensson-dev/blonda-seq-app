// BLONDA SEQ — platform-independent host glue: a lock-free command queue from the UI thread to the audio thread,
// engine hot-swap and a retire queue so every allocation/free happens off the audio thread.
// Used by the iOS/macOS AVAudioEngine host (App/Sources/Engine/BLONDAEngine.mm) and tested on Linux (tools/hosttest.cpp).
#pragma once
#include "seq3.hpp"
#include "dice.hpp"
#include <array>
#include <atomic>
#include <unordered_map>
#include <cmath>
#include <cstring>
#include <memory>
#include <vector>

namespace blonda {

template <class T, int N> struct SPSC {   // single producer / single consumer ring
    T buf[N]; std::atomic<int> w{0}, r{0};
    bool push(const T& v) { const int i = w.load(std::memory_order_relaxed), n = (i + 1) % N; if (n == r.load(std::memory_order_acquire)) return false; buf[i] = v; w.store(n, std::memory_order_release); return true; }
    bool pop(T& v) { const int i = r.load(std::memory_order_relaxed); if (i == w.load(std::memory_order_acquire)) return false; v = buf[i]; r.store((i + 1) % N, std::memory_order_release); return true; }
};

class Host {
public:
    enum Type : int { Play, BPM, SetCell, SetRoll, Pattern, Mute, NoteOn, NoteOff, Swap, Param, Solo, Len, Inst, EngParam, EngOpt, Song, Chain, Perform, Repeat, Fx, Reverb, Loop, LoopOn, LoopVol, DrumSmp, Preview, Drop, GlideT, Chord, MotPreset, MotParam, Kit };
    struct Cmd { Type type = Play; int a = 0, b = 0, c = 0; float f = 0, g = 0; Cell cell; std::vector<RollNote>* roll = nullptr; Seq3* engine = nullptr; Convolver* rev = nullptr; SampleData* smp = nullptr; };

    ~Host() { shutdown(); }

    // ---- UI thread -------------------------------------------------------------------------------------------
    float sampleRate = 48000;
    bool load(const std::string& json, std::string* err) {
        Project p; if (!p.loadJSON(json, err)) return false;
        base_ = json; hist_.clear(); redo_.clear();   // undo does not reach into another project
        ui = p; auto* e = new Seq3(); e->prepare(sampleRate); e->load(p);   // allocations happen here, not in audio
        Cmd c; c.type = Swap; c.engine = e; send(c); return true;
    }
    void togglePlay() { Cmd c; c.type = Play; send(c); }
    void setBPM(float bpm) { ui.bpm = std::max(40.f, std::min(240.f, bpm)); Cmd c; c.type = BPM; c.f = ui.bpm; send(c); }
    void selectPattern(int p) { if (p < 0 || p >= kPatterns) return; ui.pat = p; Cmd c; c.type = Pattern; c.a = p; send(c); }
    void setMute(int t, bool m) { if (t < 0 || t >= kTracks) return; ui.mute[t] = m; Cmd c; c.type = Mute; c.a = t; c.b = m; send(c); }
    float param(int group, int track, int field) { const float* f = paramPtr(ui, group, track, field); return f ? *f : 0.f; }
    void setParam(int group, int track, int field, float v) {
        float* f = paramPtr(ui, group, track, field); if (!f) return; float lo, hi; paramRange(group, field, lo, hi); *f = std::max(lo, std::min(hi, v));
        Cmd c; c.type = Param; c.a = group; c.b = track; c.c = field; c.f = *f; send(c);
    }
    void noteOn(int track, int note, float vel) { Cmd c; c.type = NoteOn; c.a = track; c.b = note; c.f = vel; send(c); }
    void noteOff(int track, int note) { Cmd c; c.type = NoteOff; c.a = track; c.b = note; send(c); }
    // from the MIDI thread (a second producer, so it gets its own queue; notes never allocate)
    void midiNoteOn(int track, int note, float vel) { Cmd c; c.type = NoteOn; c.a = track; c.b = note; c.f = vel; midi_.push(c); }
    void midiNoteOff(int track, int note) { Cmd c; c.type = NoteOff; c.a = track; c.b = note; midi_.push(c); }

    // 0 off, 1 on, 2 accent (drums) / 0 empty, 1 note, 2 loud note (melodic) — for the current pattern
    int stepValue(int t, int s) const {
        if (t < 0 || t >= kTracks || s < 0 || s >= kSteps) return 0;
        if (t >= 6) { for (const auto& n : ui.roll[ui.pat][t - 6]) if ((int)std::floor(n.s + 1e-4f) == s) return n.v >= .95f ? 2 : 1; return 0; }
        return ui.cells[ui.pat][t][s].v;
    }
    // off -> on -> accent -> off
    void cycleStep(int t, int s) {
        if (t < 0 || t >= kTracks || s < 0 || s >= kSteps) return;
        pushHist();
        const int pat = ui.pat;
        if (t < 6) {
            Cell& cell = ui.cells[pat][t][s]; cell.v = (cell.v + 1) % 3; cell.vel = -1;
            if (cell.v != 2) cell.o = 0;   // a removed or new step is back on the grid (accenting keeps its nudge)
            Cmd c; c.type = SetCell; c.a = pat; c.b = t; c.c = s; c.cell = cell; send(c); return;
        }
        auto& roll = ui.roll[pat][t - 6];
        int found = -1; for (size_t i = 0; i < roll.size(); ++i) if ((int)std::floor(roll[i].s + 1e-4f) == s) { found = (int)i; break; }
        if (found < 0) {   // new one-step note, pitched like the nearest note on the track
            int note = t == 6 ? 45 : 57; float best = 1e9f;
            for (const auto& n : roll) { const float d = std::fabs(n.s - s); if (d < best) { best = d; note = n.n; } }
            RollNote n; n.s = (float)s; n.l = 1; n.n = note; n.v = .72f; roll.push_back(n);
            ui.cells[pat][t][s].o = 0;
        } else if (roll[found].v < .95f) roll[found].v = 1.f;
        else {
            ui.cells[pat][t][s].o = 0;
            roll.erase(roll.begin() + found);
            for (auto& n : roll) { if (n.g == found) n.g = -1; else if (n.g > found) --n.g; }   // glide links are indices
        }
        Cmd c; c.type = SetRoll; c.a = pat; c.b = t - 6; c.roll = new std::vector<RollNote>(roll); send(c);
        syncCell(pat, t, s);
    }
    // the web keeps a step cell per melodic step in sync with the piano roll (it reconciles them on load)
    void syncCell(int pat, int t, int s) {
        Cell& cell = ui.cells[pat][t][s]; const Cell before = cell; cell.v = 0;
        for (const auto& n : ui.roll[pat][t - 6]) if ((int)std::floor(n.s + 1e-4f) == s) { cell.v = std::max(cell.v, n.v >= .95f ? 2 : 1); cell.n = n.n; }
        if (cell.v != before.v || cell.n != before.n) { Cmd c; c.type = SetCell; c.a = pat; c.b = t; c.c = s; c.cell = cell; send(c); }
    }
    // ---- BLONDA motor (engine "bris6") on melodic track k 0..3: factory sound + parameters in the motor's units
    int motorPreset(int k) const { return (k >= 0 && k < 4) ? ui.motor[k].preset : 0; }
    double motorParam(int k, int p) const { return (k >= 0 && k < 4 && p >= 0 && p < bris::kNumParams) ? ui.motor[k].vals[p] : 0; }
    void setMotorPreset(int k, int i) {
        if (k < 0 || k >= 4 || i < 0 || i >= bris::kNumPresets) return;
        MotorState& m = ui.motor[k]; m.preset = i;   // same rule as Bris::loadPreset: unnamed parameters go to default, kept ones stay
        for (int p = 0; p < bris::kNumParams; ++p) if (!bris::kParams[p].keepOnPreset) m.vals[p] = bris::kParams[p].def;
        const PresetInfo& pr = bris::kPresets[i];
        for (int j = 0; j < pr.count; ++j) { const PresetValue& v = bris::kPresetValues[pr.first + j]; if (!bris::kParams[v.param].keepOnPreset) m.vals[v.param] = v.value; }
        for (int p = 0; p < bris::kNumParams; ++p) { const ParamInfo& q = bris::kParams[p]; m.vals[p] = std::min(q.max, std::max(q.min, q.integer ? std::round(m.vals[p]) : m.vals[p])); }
        Cmd c; c.type = MotPreset; c.a = k; c.b = i; send(c);
    }
    void setMotorParam(int k, int p, double v) {
        if (k < 0 || k >= 4 || p < 0 || p >= bris::kNumParams) return;
        const ParamInfo& q = bris::kParams[p]; v = std::min(q.max, std::max(q.min, v)); if (q.integer) v = std::round(v);
        ui.motor[k].vals[p] = v; Cmd c; c.type = MotParam; c.a = k; c.b = p; c.f = (float)v; send(c);
    }
    float motorMeter(int k) const { return (k >= 0 && k < 4) ? motMeter_[k].load(std::memory_order_relaxed) : 0.f; }   // loudest voice envelope 0..1
    // drum kits: "" (blonda) or a kit name; "smp:<id>" is a sample (see assignDrum)
    std::string kit(int i) const { return (i >= 0 && i < 6) ? ui.kit[i] : std::string(); }
    void setKit(int i, const std::string& name) {
        if (i < 0 || i >= 6) return; int idx = -1; for (int k = 0; k < kNumKits; ++k) if (name == kKitNames[k]) idx = k; if (idx < 0) return;
        ui.kit[i] = kKitNames[idx]; Cmd c; c.type = Kit; c.a = i; c.b = idx; send(c);
    }
    int world() const { return ui.world; }
    void setWorld(int w) { ui.world = w; }   // colour only: nothing for the audio thread
    // ---- piano roll: the whole note list of a melodic track (current pattern); g = index of the glide target or -1
    const std::vector<RollNote>& rollNotes(int t) const { static const std::vector<RollNote> none; return (t >= 6 && t < kTracks) ? ui.roll[ui.pat][t - 6] : none; }
    void setRollNotes(int t, const std::vector<RollNote>& notes) {
        if (t < 6 || t >= kTracks) return;
        auto& R = ui.roll[ui.pat][t - 6]; R = notes;
        for (auto& n : R) { n.s = std::max(0.f, std::min(15.9375f, n.s)); n.l = std::max(.0625f, std::min(16.f - n.s, n.l)); n.n = std::max(0, std::min(127, n.n)); n.v = std::max(.05f, std::min(1.f, n.v));
                            if (n.g < -1 || n.g >= (int)R.size()) n.g = -1; }
        commitTrack(t);
        for (int s = 0; s < 16; ++s) sendCell(t, s);
    }
    float glideTime() const { return ui.glideT; }
    void setGlideTime(float v) { ui.glideT = std::max(.01f, std::min(1.f, v)); Cmd c; c.type = GlideT; c.f = ui.glideT; send(c); }
    bool chordOn(int t) const { return t == 7 ? ui.chordKeys != 0 : t == 9 ? ui.chordPad != 0 : false; }
    void setChord(int t, bool on) { if (t == 7) ui.chordKeys = on; else if (t == 9) ui.chordPad = on; else return; Cmd c; c.type = Chord; c.a = t; c.b = on; send(c); }
    // ---- step inspector (web: sins) — velocity, ratchet, probability, accent for one step -------------------
    float stepVel(int t, int s) const {
        if (t < 0 || t >= kTracks || s < 0 || s >= kSteps) return 0;
        if (t >= 6) { float v = -1; for (const auto& n : ui.roll[ui.pat][t - 6]) if ((int)std::floor(n.s + 1e-4f) == s) v = std::max(v, n.v); return v < 0 ? .72f : v; }
        const Cell& c = ui.cells[ui.pat][t][s]; return c.vel >= 0 ? c.vel : (c.v == 2 ? 1.f : .72f);
    }
    int stepRatchet(int t, int s) const { return (t >= 0 && t < kTracks && s >= 0 && s < kSteps) ? std::max(1, ui.cells[ui.pat][t][s].r) : 1; }
    float stepProb(int t, int s) const { return (t >= 0 && t < kTracks && s >= 0 && s < kSteps) ? ui.cells[ui.pat][t][s].p : 1.f; }
    void setStepVel(int t, int s, float v) {
        if (t < 0 || t >= kTracks || s < 0 || s >= kSteps) return; v = std::max(.05f, std::min(1.f, v));
        if (t >= 6) { for (auto& n : ui.roll[ui.pat][t - 6]) if ((int)std::floor(n.s + 1e-4f) == s) n.v = v; commitTrack(t); sendCell(t, s); return; }
        Cell& c = ui.cells[ui.pat][t][s]; if (!c.v) return; c.vel = v; c.v = v >= .95f ? 2 : 1; sendCell(t, s);
    }
    void setStepRatchet(int t, int s, int r) { if (t < 0 || t >= kTracks || s < 0 || s >= kSteps) return; ui.cells[ui.pat][t][s].r = std::max(1, std::min(4, r)); sendCell(t, s); }
    // nudge past half a step: the step moves into the free neighbour and keeps the rest as nudge; returns where it is now
    int nudgeStep(int t, int s, float o) {
        if (t < 0 || t >= kTracks || s < 0 || s >= kSteps) return s;
        const int d = o > .5f ? 1 : (o < -.5f ? -1 : 0);
        if (!d) { setStepNudge(t, s, o); return s; }
        const int s2 = (s + d + kSteps) % kSteps, pat = ui.pat;
        if (stepValue(t, s2) != 0) { setStepNudge(t, s, d * .5f); return s; }   // the neighbour is taken: stop at the edge
        Cell c = ui.cells[pat][t][s]; c.o = std::max(-.5f, std::min(.5f, o - d));
        ui.cells[pat][t][s] = Cell{}; ui.cells[pat][t][s2] = c;
        if (t >= 6) {
            for (auto& n : ui.roll[pat][t - 6]) if ((int)std::floor(n.s + 1e-4f) == s) { n.s += d; if (n.s >= kSteps) n.s -= kSteps; if (n.s < 0) n.s += kSteps; }
            commitTrack(t);
        }
        sendCell(t, s); sendCell(t, s2);
        return s2;
    }
    // nudge: move one step early or late (share of a step, -0.5 … +0.5); 0 = on the grid
    float stepNudge(int t, int s) const { return (t >= 0 && t < kTracks && s >= 0 && s < kSteps) ? ui.cells[ui.pat][t][s].o : 0.f; }
    void setStepNudge(int t, int s, float o) { if (t < 0 || t >= kTracks || s < 0 || s >= kSteps) return; ui.cells[ui.pat][t][s].o = std::round(std::max(-.5f, std::min(.5f, o)) * 100.f) / 100.f; sendCell(t, s); }
    void setStepProb(int t, int s, float p) { if (t < 0 || t >= kTracks || s < 0 || s >= kSteps) return; ui.cells[ui.pat][t][s].p = std::max(0.f, std::min(1.f, p)); sendCell(t, s); }
    void toggleAccent(int t, int s) {
        if (t < 0 || t >= kTracks || s < 0 || s >= kSteps) return;
        if (t >= 6) { const bool acc = stepValue(t, s) != 2; for (auto& n : ui.roll[ui.pat][t - 6]) if ((int)std::floor(n.s + 1e-4f) == s) n.v = acc ? 1.f : .72f; commitTrack(t); sendCell(t, s); return; }
        Cell& c = ui.cells[ui.pat][t][s]; const bool acc = c.v != 2; c.v = acc ? 2 : 1; c.vel = acc ? 1.f : .72f; sendCell(t, s);
    }
    void clearStep(int t, int s) {
        if (t < 0 || t >= kTracks || s < 0 || s >= kSteps) return;
        if (t >= 6) { auto& R = ui.roll[ui.pat][t - 6]; std::vector<RollNote> keep; for (const auto& n : R) if ((int)std::floor(n.s + 1e-4f) != s) keep.push_back(n); R.swap(keep); for (auto& n : R) n.g = -1; }
        ui.cells[ui.pat][t][s] = Cell{}; if (t >= 6) commitTrack(t); sendCell(t, s);
    }
    // ---- track editing (the grid / orbit actions in the web version) ----------------------------------------
    int trackLen(int t) const { const int v = ui.len[t]; return v >= 1 && v <= 16 ? v : 16; }
    int hits(int t) const { int k = 0; for (int s = 0; s < trackLen(t); ++s) k += stepValue(t, s) > 0; return k; }
    int rotation(int t) const { return t >= 0 && t < kTracks ? rot_[t] : 0; }
    void setSolo(int t) { ui.solo = ui.solo == t ? -1 : t; Cmd c; c.type = Solo; c.a = ui.solo; send(c); }
    int solo() const { return ui.solo; }
    void setLen(int t, int L) {
        if (t < 0 || t >= kTracks) return; pushHist(); ui.len[t] = std::max(1, std::min(16, L));
        Cmd c; c.type = Len; c.a = t; c.b = ui.len[t]; send(c);
    }
    // Euclidean rhythm: k hits spread over the track length, rotated (orbApply / euclid in the web version)
    void euclid(int t, int k) {
        if (t < 0 || t >= kTracks) return; pushHist();
        const int L = trackLen(t); k = std::max(0, std::min(L, k));
        bool want[16]{};
        for (int i = 0; i < L; ++i) want[(((i + rot_[t]) % L) + L) % L] = k > 0 && (i * k) % L < k;
        setSteps(t, want, L);
    }
    void rotate(int t, int d) {
        if (t < 0 || t >= kTracks) return; pushHist();
        const int L = trackLen(t); rot_[t] = ((rot_[t] + d) % L + L) % L;
        if (t < 6) {
            Cell row[16]; for (int s = 0; s < 16; ++s) row[s] = ui.cells[ui.pat][t][s];
            for (int s = 0; s < L; ++s) ui.cells[ui.pat][t][s] = row[((s - d) % L + L) % L];
            commitTrack(t);
        } else moveNotes(t, d, L);
    }
    void shift(int t) { if (t < 0 || t >= kTracks) return; pushHist();
        if (t < 6) { Cell last = ui.cells[ui.pat][t][15]; for (int s = 15; s > 0; --s) ui.cells[ui.pat][t][s] = ui.cells[ui.pat][t][s - 1]; ui.cells[ui.pat][t][0] = last; commitTrack(t); }
        else moveNotes(t, 1, 16);
    }
    void clearTrack(int t) { if (t < 0 || t >= kTracks) return; pushHist();
        for (auto& c : ui.cells[ui.pat][t]) c = Cell{};
        if (t >= 6) ui.roll[ui.pat][t - 6].clear();
        commitTrack(t);
    }
    // random variation: drop / add / accent steps; melodic notes may move two scale steps
    void variation(int t, uint32_t seed) {
        if (t < 0 || t >= kTracks) return; pushHist();
        uint32_t x = seed | 1; auto rnd = [&] { x ^= x << 13; x ^= x >> 17; x ^= x << 5; return (x & 0xFFFFFF) / 16777216.f; };
        if (t < 6) {
            for (auto& c : ui.cells[ui.pat][t]) { const float p = rnd();
                if (c.v && p < .18f) c = Cell{}; else if (!c.v && p < .12f) { c.v = 1; c.vel = -1; } else if (c.v && p < .3f) { c.v = c.v == 2 ? 1 : 2; c.vel = -1; } }
        } else {
            static const int sc[7] = {0, 2, 3, 5, 7, 8, 10};   // A natural minor
            auto& R = ui.roll[ui.pat][t - 6];
            for (int s = 0; s < 16; ++s) {
                int idx = -1; for (size_t i = 0; i < R.size(); ++i) if ((int)std::floor(R[i].s + 1e-4f) == s) { idx = (int)i; break; }
                const float p = rnd();
                if (idx >= 0 && p < .18f) { R.erase(R.begin() + idx); for (auto& n : R) { if (n.g == idx) n.g = -1; else if (n.g > idx) --n.g; } continue; }
                if (idx < 0 && p < .12f) { int note = t == 6 ? 45 : 57; float best = 1e9f; for (const auto& n : R) { const float d = std::fabs(n.s - s); if (d < best) { best = d; note = n.n; } }
                    RollNote n; n.s = (float)s; n.l = 1; n.n = note; n.v = .72f; R.push_back(n); continue; }
                if (idx >= 0 && p < .3f) R[idx].v = R[idx].v >= .95f ? .72f : 1.f;
                if (idx >= 0 && rnd() < .25f) {   // move ±2 scale degrees, staying in key
                    int deg = 0, oct = 0, best = 99; for (int o = 2; o < 8; ++o) for (int k = 0; k < 7; ++k) { const int m = 9 + 12 * o + sc[k]; if (std::abs(m - R[idx].n) < best) { best = std::abs(m - R[idx].n); deg = k; oct = o; } }
                    int d = deg + (rnd() < .5f ? -2 : 2); if (d < 0) { d += 7; --oct; } if (d > 6) { d -= 7; ++oct; }
                    R[idx].n = std::max(28, std::min(96, 9 + 12 * oct + sc[d]));
                }
            }
        }
        commitTrack(t);
    }
    void setInstrument(int k, const std::string& name) {
        if (k < 0 || k >= 4) return; const int idx = engineIndex(name); ui.inst[k] = kEngineNames[idx];
        Cmd c; c.type = Inst; c.a = k; c.b = idx; send(c);
    }
    // synth module: engine parameters of melodic track k (0..3); e = engine index (kEngineNames)
    float engParam(int k, int e, int f) { const float* x = engFloat(ui, k, e, f); return x ? *x : 0.f; }
    void setEngParam(int k, int e, int f, float v) {
        float* x = engFloat(ui, k, e, f); if (!x) return;
        float lo, hi; engRange(e, f, lo, hi); if (e == 3 && f == 0) v = std::round(v); *x = std::max(lo, std::min(hi, v));
        Cmd c; c.type = EngParam; c.a = k; c.b = e; c.c = f; c.f = *x; send(c);
    }
    int engOption(int k, int e, int f) { int v = 0; engOpt(ui, k, e, f, &v, nullptr); return v; }
    void setEngOption(int k, int e, int f, int v) { if (!engOpt(ui, k, e, f, nullptr, &v)) return; Cmd c; c.type = EngOpt; c.a = k; c.b = e; c.c = f; c.f = (float)v; send(c); }
    // the musical dice (1–6); returns a short description of what happened
    std::string dice(int n, uint32_t seed) {
        pushHist();
        const Project before = ui;
        Dice d(seed); d.apply(ui, std::max(1, std::min(6, n)), diceStyle_, diceProg_);
        for (int t = 0; t < kTracks; ++t) commitTrack(t);
        if (ui.master.swing != before.master.swing) { const float sw = ui.master.swing; ui.master.swing = before.master.swing; setParam(PG_MASTER, 0, 5, sw); }
        for (int k = 0; k < 4; ++k) if (ui.inst[k] != before.inst[k]) setInstrument(k, ui.inst[k]);
        for (int t = 0; t < kTracks; ++t) if (ui.len[t] != before.len[t]) { Cmd c; c.type = Len; c.a = t; c.b = trackLen(t); send(c); }
        return d.message;
    }
    bool patternHasSteps(int p) const {
        if (p < 0 || p >= kPatterns) return false;
        for (int t = 0; t < kTracks; ++t) for (int s = 0; s < kSteps; ++s) if (ui.cells[p][t][s].v) return true;
        for (int k = 0; k < 4; ++k) if (!ui.roll[p][k].empty()) return true;
        return false;
    }
    // dock "copy": this pattern into the next one
    void copyPatternToNext() {
        pushHist(); const int a = ui.pat, b = (a + 1) % kPatterns;
        for (int t = 0; t < kTracks; ++t) { for (int s = 0; s < 16; ++s) ui.cells[b][t][s] = ui.cells[a][t][s]; }
        for (int k = 0; k < 4; ++k) ui.roll[b][k] = ui.roll[a][k];
        for (int t = 0; t < kTracks; ++t) commitTrack(t, b);
    }
    // ---- undo / redo (pattern data, lengths, mutes) --------------------------------------------------------
    void pushHist() { hist_.push_back(snap()); if (hist_.size() > 50) hist_.erase(hist_.begin()); redo_.clear(); }
    bool undo() { if (hist_.empty()) return false; redo_.push_back(snap()); restore(hist_.back()); hist_.pop_back(); return true; }
    bool redo() { if (redo_.empty()) return false; hist_.push_back(snap()); restore(redo_.back()); redo_.pop_back(); return true; }
    bool canUndo() const { return !hist_.empty(); }
    bool canRedo() const { return !redo_.empty(); }

    // the project in the web format (for saving); `base` keeps fields the app does not model
    std::string toJSON() const { return ui.toJSON(base_); }
    // ---- samples (UI thread). The bank owns the audio; the engine only borrows pointers.
    /// Adds (or replaces) a sample; L/R at `sampleRate`. Allocates here, never on the audio thread.
    void addSample(const std::string& id, const float* L, const float* R, int frames) {
        auto* d = new SampleData(); d->frames = std::max(0, frames); d->L.assign(L, L + d->frames); d->R.assign(R, R + d->frames);
        auto it = bank_.find(id); if (it != bank_.end()) dropPtr(it->second);
        bank_[id] = d;
    }
    bool hasSample(const std::string& id) const { return bank_.count(id) != 0; }
    void removeSample(const std::string& id) {
        auto it = bank_.find(id); if (it == bank_.end()) return;
        dropPtr(it->second); bank_.erase(it);
        for (auto& L : ui.loops) if (L.sid == id) L.sid.clear();
        for (auto& k : ui.kit) if (k == "smp:" + id) k.clear();
    }
    // loops: the slot remembers the sample id; bindLoop hands the engine the pointer plus the tempo data
    const LoopSlot& loop(int k) const { static LoopSlot none; return (k >= 0 && k < 4) ? ui.loops[k] : none; }
    void assignLoop(int k, const std::string& sid) { if (k < 0 || k >= 4) return; ui.loops[k].sid = sid; ui.loops[k].on = true; ui.loops[k].bars = 0; Cmd c; c.type = LoopOn; c.a = k; c.b = 1; send(c); }
    void bindLoop(int k, float srcBpm, int bars, float norm) {
        if (k < 0 || k >= 4) return; auto it = bank_.find(ui.loops[k].sid);
        Cmd c; c.type = Loop; c.a = k; c.b = bars; c.f = srcBpm; c.g = norm; c.smp = it == bank_.end() ? nullptr : it->second; send(c);
    }
    void setLoopOn(int k, bool on) { if (k < 0 || k >= 4) return; ui.loops[k].on = on; Cmd c; c.type = LoopOn; c.a = k; c.b = on ? 1 : 0; send(c); }
    void setLoopVol(int k, float v) { if (k < 0 || k >= 4) return; ui.loops[k].vol = std::max(0.f, std::min(1.f, v)); Cmd c; c.type = LoopVol; c.a = k; c.f = ui.loops[k].vol; send(c); }
    void setLoopBars(int k, int bars) { if (k >= 0 && k < 4) ui.loops[k].bars = std::max(0, bars); }
    // one-shots on drum tracks (web: S.dk[id] = "smp:<id>")
    std::string drumSample(int i) const { return (i >= 0 && i < 6 && ui.kit[i].rfind("smp:", 0) == 0) ? ui.kit[i].substr(4) : std::string(); }
    void assignDrum(int i, const std::string& sid) { if (i >= 0 && i < 6) ui.kit[i] = sid.empty() ? std::string() : "smp:" + sid; }
    void bindDrum(int i, float norm) {
        if (i < 0 || i >= 6) return; const std::string sid = drumSample(i); auto it = sid.empty() ? bank_.end() : bank_.find(sid);
        Cmd c; c.type = DrumSmp; c.a = i; c.f = norm; c.smp = it == bank_.end() ? nullptr : it->second; send(c);
    }
    void previewSample(const std::string& id, float rate, float gain) {
        auto it = bank_.find(id); Cmd c; c.type = Preview; c.smp = it == bank_.end() ? nullptr : it->second; c.f = rate; c.g = gain; send(c);
    }
    // plugins: echo / space / tape / crush (fields as Seq3::setFx)
    float fx(int f) const {
        const FxParams& X = ui.fx;
        switch (f) { case 0: return X.echoOn; case 1: return X.echoFb; case 2: return X.echoTime; case 3: return X.spaceOn; case 4: return X.spaceSize;
                     case 5: return X.tapeOn; case 6: return X.tapeColor; case 7: return X.crushOn; case 8: return X.crushBits; case 9: return X.crushMix; }
        return 0;
    }
    void setFx(int f, float v) {
        FxParams& X = ui.fx;
        switch (f) {
            case 0: X.echoOn = v != 0; break; case 1: X.echoFb = std::max(0.f, std::min(.85f, v)); break; case 2: X.echoTime = v; break;
            case 3: X.spaceOn = v != 0; break; case 4: X.spaceSize = std::max(.6f, std::min(6.f, v)); break;
            case 5: X.tapeOn = v != 0; break; case 6: X.tapeColor = std::max(0.f, std::min(1.f, v)); break;
            case 7: X.crushOn = v != 0; break; case 8: X.crushBits = std::max(2.f, std::min(12.f, std::round(v))); break; case 9: X.crushMix = std::max(0.f, std::min(1.f, v)); break;
            default: return;
        }
        Cmd c; c.type = Fx; c.a = f; c.f = fx(f); send(c);
    }
    /// After the space size settles: build the new reverb here (allocates) and hand it to the audio thread.
    void rebuildReverb() { auto* r = new Convolver(); buildReverb(*r, ui.fx.spaceSize, sampleRate); Cmd c; c.type = Reverb; c.rev = r; send(c); }
    // live: XY performance (f −1..1 lowpass/highpass, fx 0..1 echo + space) and beat repeat (mode 1 engage, 2 change, 0 release)
    void perform(bool on, float f, float fx) { Cmd c; c.type = Perform; c.a = on ? 1 : 0; c.f = f; c.g = fx; send(c); }
    void beatRepeat(int mode, int div) { Cmd c; c.type = Repeat; c.a = mode; c.b = div; send(c); }
    // song mode: the chain of patterns (A–D or empty) played bar by bar
    bool song() const { return ui.song; }
    void setSong(bool on) { ui.song = on; Cmd c; c.type = Song; c.a = on ? 1 : 0; send(c); }
    int chain(int k) const { return (k >= 0 && k < 8) ? ui.chain[k] : -1; }
    void setChain(int k, int v) { if (k < 0 || k >= 8) return; ui.chain[k] = (v >= 0 && v < kPatterns) ? v : -1; Cmd c; c.type = Chain; c.a = k; c.b = ui.chain[k]; send(c); }
    int chainIndex() const { return chainIdx_.load(std::memory_order_relaxed); }
    /// UI thread, once per frame: in song mode the pattern on screen follows the one playing. Returns true when it changed.
    bool followSong() {
        if (!ui.song || !isPlaying()) return false;
        const int p = audioPat_.load(std::memory_order_relaxed);
        if (p == ui.pat || p < 0 || p >= kPatterns) return false;
        ui.pat = p; return true;
    }
    int currentStep() const { return step_.load(std::memory_order_relaxed); }
    bool isPlaying() const { return playing_.load(std::memory_order_relaxed); }
    void collect() { Cmd c; while (retire_.pop(c)) { delete c.roll; delete c.engine; delete c.rev; delete c.smp; } }   // free what audio handed back
    // call after the audio callback can no longer run
    void shutdown() {
        collect(); Cmd c; while (toAudio_.pop(c)) { delete c.roll; delete c.engine; delete c.rev; if (c.type == Drop) delete c.smp; }
        delete engine_; engine_ = nullptr;
        for (auto& kv : bank_) delete kv.second; bank_.clear();
    }
    Project ui;   // UI-thread mirror

    // ---- audio thread ----------------------------------------------------------------------------------------
    void render(float* L, float* R, int frames) {
        Cmd c;
        while (toAudio_.pop(c) || midi_.pop(c)) {
            Seq3* e = engine_;
            switch (c.type) {
                case Swap: { Cmd r; r.type = Swap; r.engine = engine_; engine_ = c.engine; if (r.engine) retire_.push(r); break; }
                case Play: if (e) e->play(); break;
                case BPM: if (e) e->setBPM(c.f); break;
                case SetCell: if (e) e->setCell(c.a, c.b, c.c, c.cell); break;
                case SetRoll: if (e) e->swapRoll(c.a, c.b, *c.roll); { Cmd r; r.type = SetRoll; r.roll = c.roll; retire_.push(r); } break;
                case Pattern: if (e) e->setPattern(c.a); break;
                case Mute: if (e) e->setMute(c.a, c.b != 0); break;
                case NoteOn: if (e) e->liveNote(c.a, c.b, c.f, true); break;
                case NoteOff: if (e) e->liveNote(c.a, c.b, 0, false); break;
                case Param: if (e) e->setParam(c.a, c.b, c.c, c.f); break;
                case Solo: if (e) e->setSolo(c.a); break;
                case Len: if (e) e->setLen(c.a, c.b); break;
                case Inst: if (e) e->setInstrument(c.a, c.b); break;
                case EngParam: if (e) e->setEngParam(c.a, c.b, c.c, c.f); break;
                case Loop: if (e) e->setLoop(c.a, c.smp, c.f, c.b, c.g); break;
                case LoopOn: if (e) e->setLoopOn(c.a, c.b != 0); break;
                case LoopVol: if (e) e->setLoopVol(c.a, c.f); break;
                case DrumSmp: if (e) e->setDrumSample(c.a, c.smp, c.f); break;
                case Preview: if (e) e->previewSample(c.smp, c.f, c.g); break;
                case Drop: { if (e) e->dropSample(c.smp); Cmd r; r.type = Drop; r.smp = c.smp; retire_.push(r); break; }
                case Kit: if (e) e->setKit(c.a, c.b); break;
                case MotPreset: if (e) e->setMotorPreset(c.a, c.b); break;
                case MotParam: if (e) e->setMotorParam(c.a, c.b, c.f); break;
                case GlideT: if (e) e->setGlideT(c.f); break;
                case Chord: if (e) e->setChord(c.a, c.b != 0); break;
                case Fx: if (e) e->setFx(c.a, c.f); break;
                case Reverb: { Cmd r; r.type = Reverb; r.rev = e ? e->swapReverb(c.rev) : c.rev; if (r.rev) retire_.push(r); break; }
                case Perform: if (e) e->setPerform(c.a != 0, c.f, c.g); break;
                case Repeat: if (e) e->repeat(c.a, c.b); break;
                case Song: if (e) e->setSong(c.a != 0); break;
                case Chain: if (e) e->setChain(c.a, c.b); break;
                case EngOpt: if (e) e->setEngOpt(c.a, c.b, c.c, (int)c.f); break;
            }
        }
        if (!engine_) { std::memset(L, 0, sizeof(float) * frames); std::memset(R, 0, sizeof(float) * frames); step_.store(-1); playing_.store(false); return; }
        engine_->render(L, R, frames);
        step_.store(engine_->currentStep(), std::memory_order_relaxed); playing_.store(engine_->playing(), std::memory_order_relaxed);
        for (int k = 0; k < 4; ++k) motMeter_[k].store((float)engine_->motorMeter(k), std::memory_order_relaxed);
        audioPat_.store(engine_->pattern(), std::memory_order_relaxed); chainIdx_.store(engine_->chainIndex(), std::memory_order_relaxed);
    }

private:
    struct Snap { Cell cells[kPatterns][kTracks][kSteps]; std::vector<RollNote> roll[kPatterns][4]; std::array<int, kTracks> len, mute; int solo; };
    Snap snap() const { Snap s; std::memcpy(s.cells, ui.cells, sizeof(ui.cells)); for (int p = 0; p < kPatterns; ++p) for (int k = 0; k < 4; ++k) s.roll[p][k] = ui.roll[p][k];
        s.len = ui.len; s.mute = ui.mute; s.solo = ui.solo; return s; }
    void restore(const Snap& s) {
        for (int p = 0; p < kPatterns; ++p) {
            for (int t = 0; t < kTracks; ++t) for (int st = 0; st < kSteps; ++st) {
                const Cell& a = s.cells[p][t][st]; Cell& b = ui.cells[p][t][st];
                if (a.v != b.v || a.n != b.n || a.r != b.r || a.p != b.p || a.vel != b.vel) { b = a; Cmd c; c.type = SetCell; c.a = p; c.b = t; c.c = st; c.cell = b; send(c); }
            }
            for (int k = 0; k < 4; ++k) {
                bool same = s.roll[p][k].size() == ui.roll[p][k].size();
                for (size_t i = 0; same && i < s.roll[p][k].size(); ++i) { const auto &x = s.roll[p][k][i], &y = ui.roll[p][k][i]; same = x.s == y.s && x.l == y.l && x.n == y.n && x.v == y.v && x.g == y.g; }
                if (!same) { ui.roll[p][k] = s.roll[p][k]; Cmd c; c.type = SetRoll; c.a = p; c.b = k; c.roll = new std::vector<RollNote>(ui.roll[p][k]); send(c); }
            }
        }
        for (int t = 0; t < kTracks; ++t) {
            if (s.len[t] != ui.len[t]) { ui.len[t] = s.len[t]; Cmd c; c.type = Len; c.a = t; c.b = trackLen(t); send(c); }
            if (s.mute[t] != ui.mute[t]) { ui.mute[t] = s.mute[t]; Cmd c; c.type = Mute; c.a = t; c.b = ui.mute[t]; send(c); }
        }
        if (s.solo != ui.solo) { ui.solo = s.solo; Cmd c; c.type = Solo; c.a = ui.solo; send(c); }
    }
    // set a drum track's steps (or the melodic notes on those steps) from a mask
    void setSteps(int t, const bool* want, int L) {
        if (t < 6) {
            for (int s = 0; s < 16; ++s) { Cell& c = ui.cells[ui.pat][t][s]; const bool w = s < L && want[s];
                if (w && !c.v) { c.v = 1; c.vel = -1; } else if (!w && c.v) c = Cell{}; }
        } else {
            auto& R = ui.roll[ui.pat][t - 6];
            std::vector<RollNote> keep; int note = t == 6 ? 45 : 57; if (!R.empty()) note = R.front().n;
            for (int s = 0; s < 16; ++s) {
                const bool w = s < L && want[s]; bool had = false;
                for (const auto& n : R) if ((int)std::floor(n.s + 1e-4f) == s) { had = true; if (w) { RollNote m = n; m.g = -1; keep.push_back(m); } }
                if (w && !had) { RollNote n; n.s = (float)s; n.l = 1; n.n = note; n.v = .72f; keep.push_back(n); }
            }
            R.swap(keep);
        }
        commitTrack(t);
    }
    void moveNotes(int t, int d, int L) {
        auto& R = ui.roll[ui.pat][t - 6];
        for (auto& n : R) { const float s = n.s; if (s < L) { float m = std::fmod(s + d, (float)L); if (m < 0) m += L; n.s = m; } }
        commitTrack(t);
    }
    // send a whole track (cells, and the roll for melodic tracks) to the engine
    void sendCell(int t, int s) { Cmd c; c.type = SetCell; c.a = ui.pat; c.b = t; c.c = s; c.cell = ui.cells[ui.pat][t][s]; send(c); }
    void commitTrack(int t, int pat = -1) {
        if (pat < 0) pat = ui.pat;
        if (t >= 6) {
            for (int s = 0; s < 16; ++s) {   // keep the step cells in sync with the roll, like the web version
                Cell& cell = ui.cells[pat][t][s]; cell.v = 0;
                for (const auto& n : ui.roll[pat][t - 6]) if ((int)std::floor(n.s + 1e-4f) == s) { cell.v = std::max(cell.v, n.v >= .95f ? 2 : 1); cell.n = n.n; }
            }
            Cmd c; c.type = SetRoll; c.a = pat; c.b = t - 6; c.roll = new std::vector<RollNote>(ui.roll[pat][t - 6]); send(c);
        }
        for (int s = 0; s < 16; ++s) { Cmd c; c.type = SetCell; c.a = pat; c.b = t; c.c = s; c.cell = ui.cells[pat][t][s]; send(c); }
    }
    std::array<int, kTracks> rot_{};
    int diceStyle_ = -1; std::pair<int, int> diceProg_{0, 8};
    std::vector<Snap> hist_, redo_;
    void send(const Cmd& c) { collect(); if (!toAudio_.push(c)) { delete c.roll; delete c.engine; } }
    Seq3* engine_ = nullptr;   // touched only by the audio thread (and shutdown)
    std::string base_;
    std::unordered_map<std::string, SampleData*> bank_;
    void dropPtr(SampleData* d) { Cmd c; c.type = Drop; c.smp = d; send(c); }
    SPSC<Cmd, 4096> toAudio_, retire_; SPSC<Cmd, 256> midi_;
    std::atomic<int> step_{-1}; std::atomic<bool> playing_{false}; std::atomic<int> audioPat_{0}, chainIdx_{-1}; std::atomic<float> motMeter_[4] = {};
};

} // namespace blonda
