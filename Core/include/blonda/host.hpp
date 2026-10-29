// BLONDA SEQ — platform-independent host glue: a lock-free command queue from the UI thread to the audio thread,
// engine hot-swap and a retire queue so every allocation/free happens off the audio thread.
// Used by the iOS/macOS AVAudioEngine host (App/Sources/Engine/BLONDAEngine.mm) and tested on Linux (tools/hosttest.cpp).
#pragma once
#include "seq3.hpp"
#include "dice.hpp"
#include <array>
#include <atomic>
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
    enum Type : int { Play, BPM, SetCell, SetRoll, Pattern, Mute, NoteOn, NoteOff, Swap, Param, Solo, Len, Inst, EngParam, EngOpt };
    struct Cmd { Type type = Play; int a = 0, b = 0, c = 0; float f = 0; Cell cell; std::vector<RollNote>* roll = nullptr; Seq3* engine = nullptr; };

    ~Host() { shutdown(); }

    // ---- UI thread -------------------------------------------------------------------------------------------
    float sampleRate = 48000;
    bool load(const std::string& json, std::string* err) {
        Project p; if (!p.loadJSON(json, err)) return false;
        base_ = json;
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
            Cmd c; c.type = SetCell; c.a = pat; c.b = t; c.c = s; c.cell = cell; send(c); return;
        }
        auto& roll = ui.roll[pat][t - 6];
        int found = -1; for (size_t i = 0; i < roll.size(); ++i) if ((int)std::floor(roll[i].s + 1e-4f) == s) { found = (int)i; break; }
        if (found < 0) {   // new one-step note, pitched like the nearest note on the track
            int note = t == 6 ? 45 : 57; float best = 1e9f;
            for (const auto& n : roll) { const float d = std::fabs(n.s - s); if (d < best) { best = d; note = n.n; } }
            RollNote n; n.s = (float)s; n.l = 1; n.n = note; n.v = .72f; roll.push_back(n);
        } else if (roll[found].v < .95f) roll[found].v = 1.f;
        else {
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
        const float hi = (e == 3 && f == 0) ? 6.f : 1.f; *x = std::max(0.f, std::min(hi, v));
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
    int currentStep() const { return step_.load(std::memory_order_relaxed); }
    bool isPlaying() const { return playing_.load(std::memory_order_relaxed); }
    void collect() { Cmd c; while (retire_.pop(c)) { delete c.roll; delete c.engine; } }   // free what audio handed back
    // call after the audio callback can no longer run
    void shutdown() { collect(); Cmd c; while (toAudio_.pop(c)) { delete c.roll; delete c.engine; } delete engine_; engine_ = nullptr; }
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
                case EngOpt: if (e) e->setEngOpt(c.a, c.b, c.c, (int)c.f); break;
            }
        }
        if (!engine_) { std::memset(L, 0, sizeof(float) * frames); std::memset(R, 0, sizeof(float) * frames); step_.store(-1); playing_.store(false); return; }
        engine_->render(L, R, frames);
        step_.store(engine_->currentStep(), std::memory_order_relaxed); playing_.store(engine_->playing(), std::memory_order_relaxed);
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
    SPSC<Cmd, 4096> toAudio_, retire_; SPSC<Cmd, 256> midi_;
    std::atomic<int> step_{-1}; std::atomic<bool> playing_{false};
};

} // namespace blonda
