// BLONDA SEQ — platform-independent host glue: a lock-free command queue from the UI thread to the audio thread,
// engine hot-swap and a retire queue so every allocation/free happens off the audio thread.
// Used by the iOS/macOS AVAudioEngine host (App/Sources/Engine/BLONDAEngine.mm) and tested on Linux (tools/hosttest.cpp).
#pragma once
#include "seq3.hpp"
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
    enum Type : int { Play, BPM, SetCell, SetRoll, Pattern, Mute, NoteOn, NoteOff, Swap, Param };
    struct Cmd { Type type = Play; int a = 0, b = 0, c = 0; float f = 0; Cell cell; std::vector<RollNote>* roll = nullptr; Seq3* engine = nullptr; };

    ~Host() { shutdown(); }

    // ---- UI thread -------------------------------------------------------------------------------------------
    float sampleRate = 48000;
    bool load(const std::string& json, std::string* err) {
        Project p; if (!p.loadJSON(json, err)) return false;
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
        else roll.erase(roll.begin() + found);
        Cmd c; c.type = SetRoll; c.a = pat; c.b = t - 6; c.roll = new std::vector<RollNote>(roll); send(c);
    }
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
            }
        }
        if (!engine_) { std::memset(L, 0, sizeof(float) * frames); std::memset(R, 0, sizeof(float) * frames); step_.store(-1); playing_.store(false); return; }
        engine_->render(L, R, frames);
        step_.store(engine_->currentStep(), std::memory_order_relaxed); playing_.store(engine_->playing(), std::memory_order_relaxed);
    }

private:
    void send(const Cmd& c) { collect(); if (!toAudio_.push(c)) { delete c.roll; delete c.engine; } }
    Seq3* engine_ = nullptr;   // touched only by the audio thread (and shutdown)
    SPSC<Cmd, 1024> toAudio_, retire_; SPSC<Cmd, 256> midi_;
    std::atomic<int> step_{-1}; std::atomic<bool> playing_{false};
};

} // namespace blonda
