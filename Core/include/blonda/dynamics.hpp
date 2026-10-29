// BLONDA SEQ — dynamics: a port of the DynamicsCompressor used by Chrome's Web Audio (knee curve, automatic
// makeup gain, adaptive release, 6 ms look-ahead), so the mix glue and limiter behave like the web version.
#pragma once
#include <cmath>
#include <algorithm>
#include <array>

namespace blonda {

class WebCompressor {
public:
    float threshold = -24, knee = 30, ratio = 12, attack = 0.003f, release = 0.25f;   // Web Audio defaults
    void prepare(float sampleRate) { sr_ = sampleRate; reset(); }
    void reset() {
        detector_ = 0; gain_ = 1; maxAttackDiff_ = -1; L_.fill(0); R_.fill(0);
        preFrames_ = std::min(kMax - 1, (int)(0.006f * sr_)); rd_ = 0; wr_ = preFrames_; divLeft_ = 0;
    }
    float reduction() const { return gain_; }
    // in-place stereo processing
    void process(float* l, float* r, int frames) {
        const float k = updateCurve();
        const float fullRangeGain = saturate(1.f, k);
        const float makeup = std::pow(1.f / fullRangeGain, 0.6f);
        const float attackFrames = std::max(0.001f, attack) * sr_, releaseFrames = sr_ * release;
        const float satReleaseFrames = 0.0025f * sr_;
        const float y1 = releaseFrames * .09f, y2 = releaseFrames * .16f, y3 = releaseFrames * .42f, y4 = releaseFrames * .98f;
        const float a = 0.9999999999999998f * y1 + 1.8432219684323923e-16f * y2 - 1.9373394351676423e-16f * y3 + 8.824516011816245e-18f * y4;
        const float b = -1.5788320352845888f * y1 + 2.3305837032074286f * y2 - 0.9141194204840429f * y3 + 0.1623677525612032f * y4;
        const float c = 0.5334142869106424f * y1 - 1.272736789213631f * y2 + 0.9258856042207512f * y3 - 0.18656310191776226f * y4;
        const float d = 0.08783463138207234f * y1 - 0.1694162967925622f * y2 + 0.08588057951595272f * y3 - 0.00429891410546283f * y4;
        const float e = -0.042416883008123074f * y1 + 0.1115693827987602f * y2 - 0.09764676325265872f * y3 + 0.028494263462021576f * y4;
        for (int i = 0; i < frames; ++i) {
            if (divLeft_ == 0) {   // every 32 frames: new envelope rate
                divLeft_ = 32;
                if (!std::isfinite(detector_)) detector_ = 1;
                const float desired = detector_;
                scaledDesired_ = std::asin(std::min(1.f, desired)) / kHalfPi;
                const bool releasing = scaledDesired_ > gain_;
                float diff = lin2db(gain_ / scaledDesired_);
                if (releasing) {
                    maxAttackDiff_ = -1; if (!std::isfinite(diff)) diff = -1;
                    float x = std::min(0.f, std::max(-12.f, diff)); x = .25f * (x + 12);
                    const float x2 = x * x, x3 = x2 * x, x4 = x2 * x2, rf = a + b * x + c * x2 + d * x3 + e * x4;
                    envRate_ = db2lin(5.f / rf);
                } else {
                    if (!std::isfinite(diff)) diff = 1;
                    if (maxAttackDiff_ == -1 || maxAttackDiff_ < diff) maxAttackDiff_ = diff;
                    const float eff = std::max(.5f, maxAttackDiff_);
                    envRate_ = 1 - std::pow(.25f / eff, 1 / attackFrames);
                }
            }
            --divLeft_;
            L_[wr_] = l[i]; R_[wr_] = r[i];
            const float in = std::max(std::fabs(l[i]), std::fabs(r[i]));
            const float shaped = saturate(in, k), att = in <= .0001f ? 1.f : shaped / in;
            const float attDb = std::max(2.f, -lin2db(att)), satRate = db2lin(attDb / satReleaseFrames) - 1;
            detector_ += (att - detector_) * (att > detector_ ? satRate : 1.f);
            detector_ = std::min(1.f, detector_); if (!std::isfinite(detector_)) detector_ = 1;
            if (envRate_ < 1) gain_ += (scaledDesired_ - gain_) * envRate_;
            else { gain_ *= envRate_; gain_ = std::min(1.f, gain_); }
            const float total = makeup * std::sin(kHalfPi * gain_);
            l[i] = L_[rd_] * total; r[i] = R_[rd_] * total;
            rd_ = (rd_ + 1) & (kMax - 1); wr_ = (wr_ + 1) & (kMax - 1);
        }
    }

private:
    static constexpr int kMax = 1024; static constexpr float kHalfPi = 1.57079632679489661923f;
    static float lin2db(float x) { return x > 0 ? 20.f * std::log10(x) : -1000.f; }
    static float db2lin(float d) { return std::pow(10.f, d / 20.f); }
    float kneeCurve(float x, float k) const { if (x < linThr_) return x; return linThr_ + (1 - std::exp(-k * (x - linThr_))) / k; }
    float saturate(float x, float k) const {
        if (x < kneeThr_) return kneeCurve(x, k);
        return db2lin(yKneeDb_ + slope_ * (lin2db(x) - kneeThrDb_));
    }
    float slopeAt(float x, float k) const {
        if (x < linThr_) return 1;
        const float x2 = x * 1.001f, xd = lin2db(x), x2d = lin2db(x2), yd = lin2db(kneeCurve(x, k)), y2d = lin2db(kneeCurve(x2, k));
        return (y2d - yd) / (x2d - xd);
    }
    float updateCurve() {
        if (threshold != cThr_ || knee != cKnee_ || ratio != cRatio_) {
            cThr_ = threshold; cKnee_ = knee; cRatio_ = ratio;
            linThr_ = db2lin(threshold); slope_ = 1 / ratio;
            const float x = db2lin(threshold + knee); float mn = .1f, mx = 10000, k = 5;
            for (int i = 0; i < 15; ++i) { const float s = slopeAt(x, k); if (s < slope_) mx = k; else mn = k; k = std::sqrt(mn * mx); }
            kneeThrDb_ = threshold + knee; kneeThr_ = db2lin(kneeThrDb_); yKneeDb_ = lin2db(kneeCurve(kneeThr_, k)); K_ = k;
        }
        return K_;
    }
    float sr_ = 48000;
    float cThr_ = 1e9f, cKnee_ = 1e9f, cRatio_ = 1e9f, linThr_ = 1, slope_ = 1, kneeThr_ = 1, kneeThrDb_ = 0, yKneeDb_ = 0, K_ = 1;
    float detector_ = 0, gain_ = 1, maxAttackDiff_ = -1, envRate_ = 1, scaledDesired_ = 1; int divLeft_ = 0;
    std::array<float, kMax> L_{}, R_{}; int rd_ = 0, wr_ = 0, preFrames_ = 288;
};

} // namespace blonda
