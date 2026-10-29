// BLONDA motor – det gemensamma gränssnittet som alla ljudmotorer följer.
//
// En motor tar emot toner, MIDI och parametrar och ger ut stereoljud. Den vet inget om
// Max, VST, AU, iOS eller webben – de skalen läggs runt motorn.
//
//   blonda::bris::Bris motor;
//   motor.prepare(48000.0);
//   motor.loadPreset(1);              // "Poly Magic"
//   motor.noteOn(60, 100);
//   motor.process(left, right, 512);  // fyll buffertar
//
#pragma once
#include <cstdint>
#include <cstring>

namespace blonda {

struct ParamInfo {
    const char* id;      // kort id, samma som i Max-pluggen (t.ex. "cut")
    const char* name;    // läsbart namn för värdprogram (t.ex. "Cutoff")
    double min, max, def;
    bool integer;        // heltal (val/lägen)
    bool keepOnPreset;   // behåller värdet när man byter ljud (t.ex. volym)
};

struct PresetValue { int param; double value; };
struct PresetInfo { const char* name; int first; int count; };

class Motor {
public:
    virtual ~Motor() = default;

    virtual const char* name() const = 0;

    // ---- livscykel
    virtual void prepare(double sampleRate) = 0;   // nollställer också
    virtual void reset() = 0;                      // tystnad, allt tillstånd nollat

    // ---- spela
    virtual void noteOn(int note, int velocity) = 0;  // velocity 1..127
    virtual void noteOff(int note) = 0;
    virtual void allNotesOff() = 0;
    virtual void pitchBend(double v) = 0;   // -1..1
    virtual void modWheel(double v) = 0;    // 0..1
    virtual void aftertouch(double v) = 0;  // 0..1
    virtual void sustain(bool down) = 0;

    // Ett råmeddelande (status + två databyte). Tolkar not på/av, CC1, CC64, CC120/123, böj och aftertouch.
    void midi(uint8_t status, uint8_t d1, uint8_t d2) {
        uint8_t ty = status & 0xF0;
        if (ty == 0x90 && d2 > 0) noteOn(d1, d2);
        else if (ty == 0x80 || ty == 0x90) noteOff(d1);
        else if (ty == 0xE0) pitchBend((((int)d2 << 7 | d1) - 8192) / 8192.0);
        else if (ty == 0xD0) aftertouch(d1 / 127.0);
        else if (ty == 0xA0) aftertouch(d2 / 127.0);
        else if (ty == 0xB0) {
            if (d1 == 1) modWheel(d2 / 127.0);
            else if (d1 == 64) sustain(d2 >= 64);
            else if (d1 == 120 || d1 == 123) allNotesOff();
        }
    }

    // ---- parametrar
    virtual int numParams() const = 0;
    virtual const ParamInfo& paramInfo(int index) const = 0;
    virtual void setParam(int index, double value) = 0;  // i parameterns egna enheter (min..max)
    virtual double getParam(int index) const = 0;
    int findParam(const char* id) const {
        for (int i = 0; i < numParams(); ++i)
            if (std::strcmp(paramInfo(i).id, id) == 0) return i;
        return -1;
    }
    // normaliserat 0..1, som värdprogram (VST/AU) vill ha det
    void setParamNormalized(int index, double v01) {
        const ParamInfo& p = paramInfo(index);
        setParam(index, p.min + (p.max - p.min) * v01);
    }
    double getParamNormalized(int index) const {
        const ParamInfo& p = paramInfo(index);
        return p.max > p.min ? (getParam(index) - p.min) / (p.max - p.min) : 0.0;
    }

    // ---- fabriksljud
    virtual int numPresets() const = 0;
    virtual const char* presetName(int index) const = 0;
    virtual void loadPreset(int index) = 0;
    int findPreset(const char* name) const {
        for (int i = 0; i < numPresets(); ++i)
            if (std::strcmp(presetName(i), name) == 0) return i;
        return -1;
    }

    // ---- ljud: skriver (ersätter) frames sampel i left/right
    virtual void process(float* left, float* right, int frames) = 0;
};

}  // namespace blonda
