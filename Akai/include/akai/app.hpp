// BLONDA AKAI — the instrument app for the MPC Sample: turns pad, knob and button events into notes and
// parameter changes, keeps the lights in sync and describes the screen. Hardware-independent: the MPC host
// (platform/mpcsample) and the desktop tests feed it the same events.
//
// Controls
//   Pads ............ play notes (velocity, pressure opens the filter)
//   K1 K2 K3 ........ the three parameters on the current page
//   Fader ........... the instrument's performance parameter (filter cutoff)
//   MAIN VOLUME ..... output level
//   Encoder ......... browse presets            SHIFT + encoder: browse pages
//   Encoder push .... back to the first page
//   B1 / B2 ......... previous / next page
//   B3 .............. next instrument           SHIFT + B3: previous instrument
//   MINUS / PLUS .... octave down / up          SHIFT: transpose a semitone
//   16 LEVELS ....... chromatic / in-key pads   SHIFT: next scale
//   PLAY ............ latch (hold notes)
//   TAP TEMPO ....... tap the tempo for synced LFO / delay     SHIFT: switch screen colours (SHARP / BLONDA)
//   ERASE ........... undo edits (reload the preset)
//   STOP ............ all notes off             SHIFT + STOP: quit back to the MPC Sample software
//   NOTE REPEAT ..... tap: repeat on / off; hold: repeat while held; hold + encoder: rate
//                     SHIFT + NOTE REPEAT: next mode (REPEAT, ARP UP, DOWN, UP/DN, ORDER, RANDOM)
//   KNOB FX ......... K1-K3 control the effects (ECHO, SPACE, FILTER; B1/B2: ECHO time / feedback page)
//                     SHIFT + KNOB FX: all effects off / on
#pragma once
#include "akai/controls.hpp"
#include "akai/fx.hpp"
#include "akai/repeat.hpp"
#include "akai/instrument.hpp"
#include "akai/midi.hpp"
#include "akai/surface.hpp"
#include <cstdint>
#include <memory>

namespace akai {

// Everything the screen shows. Plain data so the host can copy it between threads.
struct UiState {
    char instrument[16]{}, instrumentDesc[32]{}, category[16]{}, preset[32]{};
    int presetIndex = 0, presetCount = 0, instrumentIndex = 0, instrumentCount = 0;
    char page[16]{};
    int pageIndex = 0, pageCount = 0;
    bool used[3]{};
    char paramName[3][12]{}, paramValue[3][12]{};
    float paramNorm[3]{};
    int activeKnob = -1;                 // the knob last turned (highlighted for a moment)
    char root[4]{}, scale[12]{};
    int octave = 0;
    bool inKey = false, latch = false, shift = false;
    float bpm = 120.f, volume = 0.f, cpu = 0.f, peak = 0.f;
    int voices = 0, xruns = 0;
    char toast[32]{};                    // short message ("OCTAVE +1"), empty when none
    char prevPage[16]{}, nextPage[16]{}; // neighbour page names for the B1 / B2 tabs
    int theme = 0;                       // 0 SHARP (default), 1 BLONDA (SHIFT + TAP TEMPO)
    char repeat[24]{};                   // "REPEAT 1/16", "ARP UP 1/8T"; empty when NOTE REPEAT is off
    bool fxView = false, fxOff = false;  // knobs on KNOB FX / all effects switched off
    static constexpr int kScopeCols = 152;
    int8_t scopeMin[kScopeCols]{}, scopeMax[kScopeCols]{};   // output waveform, oldest -> newest, -127..127
};

class App {
public:
    App();
    ~App();
    void prepare(float sampleRate);

    void handle(const mpcs::Event& e);   // from the control surface
    void handleMidi(const MidiMsg& m);   // from an external keyboard (TRS / USB MIDI), any channel

    // Clears L/R and renders one block (any size; the MPC host uses 128 frames).
    void render(float* L, float* R, int frames);

    // Light messages for the surface: appends what changed since the last call, returns the byte count.
    int surfaceOutput(uint8_t* out, int maxBytes);
    void forceRefreshLights();           // resend every light on the next surfaceOutput()

    void snapshot(UiState& s) const;
    uint32_t uiVersion() const { return uiVersion_; }   // changes whenever the screen should be redrawn

    bool quitRequested() const { return quit_; }
    void setStats(float cpuLoad, int xruns);

    int numInstruments() const { return nInst_; }
    Instrument& instrument() { return *inst_[cur_]; }
    int current() const { return cur_; }
    void selectInstrument(int i);
    const PadLayout& layout() const { return layout_; }
    FxBus& fx() { return fx_; }
    const Repeater& repeater() const { return rep_; }
    bool repeatOn() const { return repeatOn_; }
    bool fxView() const { return fxView_; }

private:
    static constexpr int kMaxInst = 12;
    std::unique_ptr<Instrument> inst_[kMaxInst];
    int nInst_ = 0, cur_ = 0, prev_ = -1;
    long long prevUntil_ = 0;            // keep rendering the previous instrument's tail until this sample
    float sr_ = 44100.f;
    long long now_ = 0;                  // samples rendered

    PadLayout layout_;
    int padNote_[16];                    // note sounding for each held pad, -1 = none
    uint8_t padPressure_[16]{};
    bool latched_[128]{};
    bool latch_ = false, shift_ = false;
    int page_ = 0, preset_ = 0;
    ScaledKnob knob_[3], fader_;
    float volume_ = 0.7f, volSmooth_ = 0.7f;
    int activeKnob_ = -1; long long activeUntil_ = 0;
    char toast_[32]{}; long long toastUntil_ = 0;
    long long lastTap_ = -1; float tapAvg_ = 0.f; int taps_ = 0;
    float bpm_ = 120.f, cpu_ = 0.f, peakHold_ = 0.f;
    int xruns_ = 0;
    bool quit_ = false;
    uint32_t uiVersion_ = 1;
    int theme_ = 0;
    // live output waveform for the screen
    static constexpr int kScopeCols = UiState::kScopeCols, kScopeSamplesPerCol = 96;   // 152 x 96 samples = 0.33 s
    int8_t scopeMin_[kScopeCols]{}, scopeMax_[kScopeCols]{};
    int scopeW_ = 0, colN_ = 0; float colMin_ = 0.f, colMax_ = 0.f;
    long long scopeTick_ = 0; bool scopeLive_ = false;
    static constexpr int kScratch = 256;
    float sL_[kScratch]{}, sR_[kScratch]{};
    void renderInto(Instrument& I, float* L, float* R, int frames);

    // light state: desired vs. sent (-1 = unknown, forces a send)
    int ledSent_[128];
    uint32_t padSent_[16];
    bool padSentValid_[16]{};
    int ledBtnCursor_ = 0, padCursor_ = 0;

    // NOTE REPEAT
    Repeater rep_;
    bool repeatOn_ = false, nrDown_ = false, nrUsed_ = false, nrWasOn_ = false, nrShift_ = false;
    long long nrAt_ = 0;
    float noteVel_[128];
    void setRepeat(bool on);
    void repeatToast();
    // KNOB FX
    FxBus fx_;
    bool fxView_ = false;
    int fxPage_ = 0;
    Params& view() { return fxView_ ? static_cast<Params&>(fx_) : static_cast<Params&>(instrument()); }
    const Params& view() const { return fxView_ ? static_cast<const Params&>(fx_) : static_cast<const Params&>(*inst_[cur_]); }
    int viewPage() const { return fxView_ ? fxPage_ : page_; }

    void dirty() { ++uiVersion_; }
    void toast(const char* fmt, ...);
    void padDown(int pad, int velocity);
    void padUp(int pad);
    void notePlay(int note, float vel);
    void noteStop(int note);
    void releaseLatched(bool keepHeld);
    void updatePressure();
    void setPage(int p);
    void setPreset(int p);
    void knob(int slot, int value);
    void button(int b, bool down);
    int desiredLed(int button) const;
    uint32_t desiredPad(int pad) const;
};

} // namespace akai
