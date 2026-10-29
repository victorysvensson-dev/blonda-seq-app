#include "akai/app.hpp"
#include "akai/motor_instrument.hpp"
#include "akai/bris_instrument.hpp"
#include "akai/engine_instrument.hpp"
#include <cmath>
#include <cstdarg>
#include <cstdio>
#include <cstring>

namespace akai {

using namespace mpcs;

namespace {
constexpr float kToastSec = 1.4f, kKnobHighlightSec = 1.2f, kTailSec = 4.f;
constexpr float kHeadroom = 0.5f;   // -6 dB master headroom: a 6-note chord at full volume lands near 0 dBFS

inline float softClip(float x) {
    const float a = std::fabs(x);
    if (a <= 0.8f) return x;
    const float y = 0.8f + 0.2f * std::tanh((a - 0.8f) / 0.2f);
    return x < 0.f ? -y : y;
}
inline uint32_t rgb(uint32_t c) { return c & 0xFFFFFF; }
// pad colours (8-bit, sent as 7-bit): BLONDA palette, scaled for the pads' brightness
constexpr uint32_t kPadRoot = 0xE9C54A, kPadScale = 0x1F7A74, kPadOther = 0x0C0C0C, kPadHit = 0xE8E6DC, kPadOff = 0x000000;

// Buttons whose lights this app drives (everything else is switched off).
constexpr uint8_t kLitButtons[] = {BTN_SHIFT, BTN_PLUS, BTN_MINUS, BTN_16_LEVELS, BTN_PLAY, BTN_STOP, BTN_TAP_TEMPO, BTN_ERASE,
                                   BTN_KNOB_FX, BTN_PAD_FX, BTN_SAMPLE, BTN_SEQ, BTN_NOTE_REPEAT, BTN_PAD_BANK, BTN_SAMPLE_SELECT,
                                   BTN_MUTE, BTN_SAMPLE_RECORD, BTN_LOOP, BTN_CHOP, BTN_SEQ_RECORD,
                                   kBankLedCC[0], kBankLedCC[1], kBankLedCC[2], kBankLedCC[3], kBankLedCC[4], kBankLedCC[5], kBankLedCC[6], kBankLedCC[7]};
constexpr int kNumLit = (int)sizeof(kLitButtons);
} // namespace

App::App() {
    inst_[nInst_++].reset(new MotorInstrument(*findMotorSkin("bris")));   // BLONDA BRIS from blonda-motor (Bree6-style)
    inst_[nInst_++].reset(new BrisInstrument());    // the SEQ.3 Bris
    const blonda::Eng order[] = {blonda::Eng::Mini, blonda::Eng::SH101, blonda::Eng::Acid, blonda::Eng::Analog, blonda::Eng::Super,
                                 blonda::Eng::FM, blonda::Eng::Pluck, blonda::Eng::Chip, blonda::Eng::Sub};
    for (blonda::Eng e : order) inst_[nInst_++].reset(new EngineInstrument(e));
    for (int& n : padNote_) n = -1;
    for (int& l : ledSent_) l = -1;
    for (float& v : noteVel_) v = 0.8f;
}

App::~App() = default;

void App::prepare(float sampleRate) {
    sr_ = sampleRate;
    for (int i = 0; i < nInst_; ++i) { inst_[i]->prepare(sampleRate); inst_[i]->setTempo(bpm_); }
    rep_.prepare(sampleRate); rep_.setTempo(bpm_);
    fx_.prepare(sampleRate); fx_.setTempo(bpm_);
    cur_ = 0; prev_ = -1; page_ = 0; preset_ = 0;
    forceRefreshLights();
    dirty();
}

void App::toast(const char* fmt, ...) {
    va_list ap; va_start(ap, fmt);
    std::vsnprintf(toast_, sizeof toast_, fmt, ap);
    va_end(ap);
    toastUntil_ = now_ + (long long)(kToastSec * sr_);
    dirty();
}

void App::setStats(float cpuLoad, int xruns) {
    const bool changed = xruns != xruns_ || std::fabs(cpuLoad - cpu_) > 0.01f;
    cpu_ = cpuLoad; xruns_ = xruns;
    if (changed && shift_) dirty();   // CPU is shown while SHIFT is held
}

// ---------------------------------------------------------------- notes
void App::notePlay(int note, float vel) {
    latched_[note] = false;
    noteVel_[note] = vel;
    if (repeatOn_) rep_.add(note, vel); else instrument().noteOn(note, vel, 0);
    dirty();
}
void App::noteStop(int note) { if (repeatOn_) rep_.remove(note); else instrument().noteOff(note, 0); }

// NOTE REPEAT on/off: the notes held right now (pads, latch, keyboard) move between the instrument and the repeater
void App::setRepeat(bool on) {
    if (on == repeatOn_) return;
    bool src[128] = {};
    for (int n : padNote_) if (n >= 0) src[n] = true;
    for (int n = 0; n < 128; ++n) if (latched_[n]) src[n] = true;
    if (!on) for (int n = 0; n < 128; ++n) if (rep_.holds(n)) src[n] = true;   // keyboard notes held through the repeater
    Instrument& I = instrument();
    if (on) {
        for (int n = 0; n < 128; ++n) if (src[n]) I.noteOff(n, 0);
        repeatOn_ = true; rep_.clear();
        for (int n = 0; n < 128; ++n) if (src[n]) rep_.add(n, noteVel_[n]);
    } else {
        rep_.silence([&](int n, int o) { I.noteOff(n, o); });
        rep_.clear(); repeatOn_ = false;
        for (int n = 0; n < 128; ++n) if (src[n]) I.noteOn(n, noteVel_[n], 0);
    }
    updatePressure();
    dirty();
}
void App::repeatToast() {
    if (!repeatOn_) { toast("%s", "REPEAT OFF"); return; }
    toast("%s %s", Repeater::modeName(rep_.mode()), Repeater::rateName(rep_.rate()));
}

void App::padDown(int pad, int velocity) {
    if (latch_) {   // a new chord after all pads were let go replaces the latched one
        bool anyHeld = false;
        for (int n : padNote_) anyHeld |= n >= 0;
        if (!anyHeld) releaseLatched(false);
    }
    if (padNote_[pad] >= 0) noteStop(padNote_[pad]);
    const int note = layout_.note(pad);
    if (latched_[note]) { noteStop(note); latched_[note] = false; }   // re-hit a latched note: restart it
    padNote_[pad] = note;
    const float v = velocity / 127.f;
    notePlay(note, v < 0.05f ? 0.05f : v);
}

void App::padUp(int pad) {
    const int note = padNote_[pad];
    padNote_[pad] = -1; padPressure_[pad] = 0;
    updatePressure();
    if (note < 0) return;
    for (int n : padNote_) if (n == note) return;      // another pad still holds the same note
    if (latch_) latched_[note] = true; else noteStop(note);
    dirty();
}

void App::releaseLatched(bool keepHeld) {
    for (int n = 0; n < 128; ++n) {
        if (!latched_[n]) continue;
        bool held = false;
        if (keepHeld) for (int p : padNote_) held |= p == n;
        if (!held) noteStop(n);
        latched_[n] = false;
    }
}

void App::updatePressure() {
    int mx = 0;
    for (uint8_t p : padPressure_) mx = p > mx ? p : mx;
    instrument().pressure(repeatOn_ ? 0.f : mx / 127.f);   // with NOTE REPEAT, pressure sets the repeat velocity instead
}

// ---------------------------------------------------------------- pages, presets, instruments
void App::setPage(int p) {
    const int n = view().numPages();
    (fxView_ ? fxPage_ : page_) = ((p % n) + n) % n;
    dirty();
}

void App::setPreset(int p) {
    Instrument& I = instrument();
    const int n = I.numPresets();
    preset_ = ((p % n) + n) % n;
    I.loadPreset(preset_);
    updatePressure();
    dirty();
}

void App::selectInstrument(int i) {
    i = ((i % nInst_) + nInst_) % nInst_;
    if (i == cur_) return;
    // let the old instrument's held notes fade, keep rendering its tail for a few seconds
    rep_.silence([&](int n, int o) { instrument().noteOff(n, o); }); rep_.clear();
    instrument().allNotesOff();
    for (int& n : padNote_) n = -1;
    for (bool& l : latched_) l = false;
    for (uint8_t& p : padPressure_) p = 0;
    instrument().pressure(0.f);
    prev_ = cur_; prevUntil_ = now_ + (long long)(kTailSec * sr_);
    cur_ = i; page_ = 0; preset_ = 0;
    instrument().reset();
    instrument().loadPreset(0);
    instrument().setTempo(bpm_);
    dirty();
}

// ---------------------------------------------------------------- knobs and buttons
void App::knob(int slot, int value) {
    Params& I = view();
    const int prm = I.page(viewPage()).param[slot];
    if (prm < 0) { knob_[slot].last = value / 127.f; return; }
    const float pos = value / 127.f;
    const ParamInfo& info = I.param(prm);
    if (info.steps > 0) { knob_[slot].last = pos; I.setNorm(prm, pos); }        // discrete: follow the knob
    else I.setNorm(prm, knob_[slot].move(pos, I.getNorm(prm)));
    activeKnob_ = slot; activeUntil_ = now_ + (long long)(kKnobHighlightSec * sr_);
    dirty();
}

void App::button(int b, bool down) {
    if (b == BTN_SHIFT) { shift_ = down; dirty(); return; }
    if (b == BTN_NOTE_REPEAT) {
        // tap: on / off; hold: on while held (and the encoder picks the rate); SHIFT: next mode
        if (down) {
            if (shift_) { nrShift_ = true; rep_.setMode(rep_.mode() + 1); setRepeat(true); repeatToast(); return; }
            nrDown_ = true; nrUsed_ = false; nrAt_ = now_; nrWasOn_ = repeatOn_;
            setRepeat(true); repeatToast();
        } else {
            if (nrShift_) { nrShift_ = false; return; }
            if (!nrDown_) return;
            nrDown_ = false;
            const bool held = nrUsed_ || (float)(now_ - nrAt_) / sr_ >= 0.35f;
            if (nrWasOn_ ? !held : held) { setRepeat(false); repeatToast(); }
        }
        return;
    }
    if (!down) return;
    Instrument& I = instrument();
    switch (b) {
    case BTN_B1: setPage(viewPage() - 1); break;
    case BTN_B2: setPage(viewPage() + 1); break;
    case BTN_KNOB_FX:
        if (shift_) { fx_.setEnabled(!fx_.enabled()); toast("%s", fx_.enabled() ? "FX ON" : "FX OFF"); break; }
        fxView_ = !fxView_;
        toast("%s", fxView_ ? "KNOB FX" : I.name());
        break;
    case BTN_B3: selectInstrument(cur_ + (shift_ ? -1 : 1)); toast("%s", instrument().name()); break;
    case BTN_ENCODER_PUSH: setPage(0); break;
    case BTN_MINUS:
    case BTN_PLUS: {
        const int d = b == BTN_PLUS ? 1 : -1;
        if (shift_) { layout_.root = (layout_.root + d + 12) % 12; toast("ROOT %s", kNoteNames[layout_.root]); }
        else { const int o = layout_.octave + d; if (o >= -3 && o <= 4) layout_.octave = o; toast("OCTAVE %+d", layout_.octave); }
        break; }
    case BTN_16_LEVELS:
        if (shift_) { layout_.scale = (layout_.scale + 1) % kNumScales; layout_.inKey = true; }
        else layout_.inKey = !layout_.inKey;
        if (layout_.inKey) toast("%s %s", kNoteNames[layout_.root], kScales[layout_.scale].name); else toast("%s", "CHROMATIC");
        break;
    case BTN_PLAY:
        latch_ = !latch_;
        if (!latch_) releaseLatched(true);
        toast("%s", latch_ ? "LATCH ON" : "LATCH OFF");
        break;
    case BTN_TAP_TEMPO: {
        if (shift_) { theme_ = (theme_ + 1) % 2; toast("%s", theme_ ? "BLONDA COLOURS" : "SHARP COLOURS"); break; }
        if (lastTap_ >= 0) {
            const float sec = (float)(now_ - lastTap_) / sr_;
            if (sec > 0.25f && sec < 2.0f) {
                tapAvg_ = taps_ == 0 ? sec : tapAvg_ * 0.6f + sec * 0.4f; ++taps_;
                bpm_ = std::round(60.f / tapAvg_);
                for (int i = 0; i < nInst_; ++i) inst_[i]->setTempo(bpm_);
                rep_.setTempo(bpm_); fx_.setTempo(bpm_);
                toast("TEMPO %d", (int)bpm_);
            } else taps_ = 0;
        }
        lastTap_ = now_;
        break; }
    case BTN_ERASE: setPreset(preset_); toast("%s", "RELOADED"); break;
    case BTN_STOP:
        if (shift_) { quit_ = true; toast("%s", "BYE"); break; }
        rep_.silence([&](int n, int o) { I.noteOff(n, o); }); rep_.clear();
        I.allNotesOff();
        for (int& n : padNote_) n = -1;
        for (bool& l : latched_) l = false;
        toast("%s", "ALL NOTES OFF");
        break;
    default: break;
    }
}

void App::handle(const Event& e) {
    switch (e.type) {
    case Event::PadDown: padDown(e.id, e.value); break;
    case Event::PadUp: padUp(e.id); break;
    case Event::PadPressure:
        if (padNote_[e.id] >= 0) {
            padPressure_[e.id] = e.value; updatePressure();
            if (repeatOn_) rep_.setPressure(padNote_[e.id], e.value / 127.f);
        }
        break;
    case Event::ButtonDown: button(e.id, true); break;
    case Event::ButtonUp: button(e.id, false); break;
    case Event::Knob:
        if (e.id >= CC_K1 && e.id <= CC_K3) knob(e.id - CC_K1, e.value);
        else if (e.id == CC_MAIN_VOLUME) { const float v = e.value / 127.f; volume_ = v * v; dirty(); }
        else if (e.id == CC_FADER) {
            Instrument& I = instrument(); const int prm = I.faderParam();
            if (prm >= 0) { I.setNorm(prm, fader_.move(e.value / 127.f, I.getNorm(prm))); dirty(); }
        }
        break;
    case Event::Encoder:
        if (nrDown_) { rep_.setRate(rep_.rate() + e.delta); nrUsed_ = true; repeatToast(); }
        else if (shift_) setPage(viewPage() + e.delta);
        else setPreset(preset_ + e.delta);
        break;
    default: break;
    }
}

void App::handleMidi(const MidiMsg& m) {
    switch (m.type()) {
    case 0x90: if (m.d2 > 0) { notePlay(m.d1, m.d2 / 127.f); break; } [[fallthrough]];
    case 0x80: noteStop(m.d1); break;
    case 0xD0: instrument().pressure(m.d1 / 127.f); break;
    case 0xE0: instrument().pitchBend((float)(((m.d2 << 7) | m.d1) - 8192) / 8192.f); break;
    case 0xB0:
        if (instrument().controlChange(m.d1, m.d2)) { dirty(); break; }
        if (m.d1 == 123 || m.d1 == 120) instrument().allNotesOff();          // all notes / sound off
        else if (m.d1 == 1) { const int prm = instrument().faderParam(); if (prm >= 0) { instrument().setNorm(prm, m.d2 / 127.f); dirty(); } }   // mod wheel
        break;
    default: break;
    }
}

// ---------------------------------------------------------------- audio
// Adds the instrument, scaled by its output trim, into L/R.
void App::renderInto(Instrument& I, float* L, float* R, int frames) {
    const float g = I.outputGain();
    for (int pos = 0; pos < frames; pos += kScratch) {
        const int n = frames - pos < kScratch ? frames - pos : kScratch;
        std::memset(sL_, 0, sizeof(float) * (size_t)n); std::memset(sR_, 0, sizeof(float) * (size_t)n);
        I.process(sL_, sR_, n);
        for (int i = 0; i < n; ++i) { L[pos + i] += sL_[i] * g; R[pos + i] += sR_[i] * g; }
    }
}

void App::render(float* L, float* R, int frames) {
    std::memset(L, 0, sizeof(float) * (size_t)frames);
    std::memset(R, 0, sizeof(float) * (size_t)frames);
    if (repeatOn_) {   // NOTE REPEAT plays its grid into this block (sample-accurate offsets)
        Instrument& I = instrument();
        rep_.process(frames, [&](int n, float v, int o) { I.noteOn(n, v, o); }, [&](int n, int o) { I.noteOff(n, o); });
    }
    renderInto(instrument(), L, R, frames);
    if (prev_ >= 0) { if (now_ < prevUntil_) renderInto(*inst_[prev_], L, R, frames); else prev_ = -1; }
    fx_.process(L, R, frames);
    const float coef = 1.f - std::exp(-1.f / (0.02f * sr_));   // 20 ms volume smoothing
    float pk = 0.f;
    for (int i = 0; i < frames; ++i) {
        volSmooth_ += (volume_ - volSmooth_) * coef;
        const float g = volSmooth_ * kHeadroom;
        const float l = softClip(L[i] * g), r = softClip(R[i] * g);
        L[i] = l; R[i] = r;
        const float a = std::fabs(l) > std::fabs(r) ? std::fabs(l) : std::fabs(r);
        pk = a > pk ? a : pk;
        const float m = 0.5f * (l + r);   // scope: min / max per column
        if (colN_ == 0) colMin_ = colMax_ = m; else { colMin_ = m < colMin_ ? m : colMin_; colMax_ = m > colMax_ ? m : colMax_; }
        if (++colN_ >= kScopeSamplesPerCol) {
            auto q = [](float v) { v *= 127.f * 4.f; return (int8_t)(v > 127.f ? 127 : (v < -127.f ? -127 : (int)v)); };
            scopeMin_[scopeW_] = q(colMin_); scopeMax_[scopeW_] = q(colMax_);
            scopeW_ = (scopeW_ + 1) % kScopeCols; colN_ = 0;
        }
    }
    peakHold_ = pk > peakHold_ ? pk : peakHold_ * 0.97f;
    now_ += frames;
    // redraw the waveform ~15 times a second while there is sound (and once more after it stops)
    if (now_ >= scopeTick_) {
        scopeTick_ = now_ + (long long)(sr_ / 15.f);
        const bool live = peakHold_ > 0.002f;
        if (live || scopeLive_) dirty();
        scopeLive_ = live;
    }
    if (toast_[0] && now_ >= toastUntil_) { toast_[0] = 0; dirty(); }
    if (activeKnob_ >= 0 && now_ >= activeUntil_) { activeKnob_ = -1; dirty(); }
}

// ---------------------------------------------------------------- lights
int App::desiredLed(int b) const {
    const bool beat = std::fmod((double)now_ * bpm_ / 60.0 / sr_, 1.0) < 0.12;   // tap-tempo blink
    switch (b) {
    case BTN_SHIFT: return shift_ ? 2 : 1;
    case BTN_PLUS: return layout_.octave > 0 ? 2 : 1;
    case BTN_MINUS: return layout_.octave < 0 ? 2 : 1;
    case BTN_16_LEVELS: return layout_.inKey ? 2 : 1;      // bicolour: 3*A + B, one die only (both = pink)
    case BTN_PLAY: return latch_ ? 2 : 1;
    case BTN_STOP: return 1;
    case BTN_TAP_TEMPO: return beat ? 2 : 1;
    case BTN_ERASE: return 1;
    case BTN_NOTE_REPEAT: return repeatOn_ ? (rep_.flash() ? 1 : 2) : 1;   // on: bright, dips on every step
    case BTN_KNOB_FX: return fxView_ ? 2 : (fx_.enabled() ? 1 : 0);
    default: break;
    }
    for (int i = 0; i < 8; ++i) if (b == kBankLedCC[i]) return i == layout_.octave + 3 ? 2 : 0;   // octave A..H
    return 0;
}

uint32_t App::desiredPad(int pad) const {
    if (padNote_[pad] >= 0) return kPadHit;
    const int note = layout_.note(pad);
    if (latched_[note]) return kPadHit;
    switch (layout_.degree(pad)) {
    case 2: return kPadRoot;
    case 1: return kPadScale;
    default: return layout_.inKey ? kPadOff : kPadOther;
    }
}

void App::forceRefreshLights() {
    for (int& l : ledSent_) l = -1;
    for (bool& v : padSentValid_) v = false;
}

int App::surfaceOutput(uint8_t* out, int maxBytes) {
    int n = 0;
    for (int k = 0; k < kNumLit && n + 3 <= maxBytes; ++k) {
        const int b = kLitButtons[(ledBtnCursor_ + k) % kNumLit];
        const int want = desiredLed(b);
        if (ledSent_[b] == want) continue;
        n += buttonLed(out + n, b, want);
        ledSent_[b] = want;
    }
    ledBtnCursor_ = (ledBtnCursor_ + 1) % kNumLit;
    for (int k = 0; k < 16 && n + 12 <= maxBytes; ++k) {
        const int p = (padCursor_ + k) % 16;
        const uint32_t want = rgb(desiredPad(p));
        if (padSentValid_[p] && padSent_[p] == want) continue;
        n += padColour(out + n, p, (uint8_t)(want >> 16), (uint8_t)(want >> 8), (uint8_t)want);
        padSent_[p] = want; padSentValid_[p] = true;
    }
    padCursor_ = (padCursor_ + 1) % 16;
    return n;
}

// ---------------------------------------------------------------- screen
void App::snapshot(UiState& s) const {
    const Instrument& I = *inst_[cur_];
    std::snprintf(s.instrument, sizeof s.instrument, "%s", I.name());
    std::snprintf(s.instrumentDesc, sizeof s.instrumentDesc, "%s", I.description());
    std::snprintf(s.category, sizeof s.category, "%s", I.presetCategory(preset_));
    std::snprintf(s.preset, sizeof s.preset, "%s", I.presetName(preset_));
    s.presetIndex = preset_; s.presetCount = I.numPresets();
    s.instrumentIndex = cur_; s.instrumentCount = nInst_;
    const Params& V = view(); const int vp = viewPage();
    const Page& pg = V.page(vp);
    std::snprintf(s.page, sizeof s.page, "%s", pg.name);
    s.pageIndex = vp; s.pageCount = V.numPages();
    for (int k = 0; k < 3; ++k) {
        const int prm = pg.param[k];
        s.used[k] = prm >= 0;
        if (prm < 0) { s.paramName[k][0] = s.paramValue[k][0] = 0; s.paramNorm[k] = 0; continue; }
        std::snprintf(s.paramName[k], sizeof s.paramName[k], "%s", V.param(prm).name);
        V.format(prm, s.paramValue[k], sizeof s.paramValue[k]);
        s.paramNorm[k] = V.getNorm(prm);
    }
    s.activeKnob = activeKnob_;
    std::snprintf(s.root, sizeof s.root, "%s", kNoteNames[layout_.root]);
    std::snprintf(s.scale, sizeof s.scale, "%s", kScales[layout_.scale].name);
    s.octave = layout_.octave; s.inKey = layout_.inKey; s.latch = latch_; s.shift = shift_;
    s.bpm = bpm_; s.volume = volume_; s.cpu = cpu_; s.peak = peakHold_;
    s.voices = I.activeVoices(); s.xruns = xruns_;
    std::snprintf(s.toast, sizeof s.toast, "%s", toast_);
    s.theme = theme_;
    const int np = V.numPages();
    std::snprintf(s.prevPage, sizeof s.prevPage, "%s", V.page((vp + np - 1) % np).name);
    std::snprintf(s.nextPage, sizeof s.nextPage, "%s", V.page((vp + 1) % np).name);
    if (repeatOn_) std::snprintf(s.repeat, sizeof s.repeat, "%s %s", Repeater::modeName(rep_.mode()), Repeater::rateName(rep_.rate()));
    else s.repeat[0] = 0;
    s.fxView = fxView_; s.fxOff = !fx_.enabled();
    for (int c = 0; c < kScopeCols; ++c) { const int k = (scopeW_ + c) % kScopeCols; s.scopeMin[c] = scopeMin_[k]; s.scopeMax[c] = scopeMax_[k]; }
}

} // namespace akai
