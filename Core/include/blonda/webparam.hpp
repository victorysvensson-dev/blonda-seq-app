// BLONDA SEQ — AudioParam-style automation timeline.
// Implements the Web Audio automation rules (setValueAtTime, linearRampToValueAtTime,
// exponentialRampToValueAtTime, setTargetAtTime) so voices ported from the web version
// keep exactly the same envelopes. Fixed capacity, no allocation.
#pragma once
#include <cmath>
#include <cstdint>

namespace blonda {

class WebParam {
public:
    enum Type : uint8_t { Set, Lin, Exp, Target };
    static constexpr int kMax = 24;

    explicit WebParam(float def = 0.f) : def_(def) {}
    void reset(float def) { def_ = def; n_ = 0; held_ = false; }

    void setValueAtTime(float v, double t) { add({Set, t, v, 0.f}); }
    void linearRampToValueAtTime(float v, double t) { add({Lin, t, v, 0.f}); }
    void exponentialRampToValueAtTime(float v, double t) { add({Exp, t, v, 0.f}); }
    void setTargetAtTime(float v, double t, float tau) { add({Target, t, v, tau}); }
    // cancelAndHoldAtTime: freeze the current value at t, drop later events (no jump, unlike cancelScheduledValues).
    void cancelAndHold(double t) { float v = valueAt(t); int k = 0; while (k < n_ && ev_[k].t <= t) ++k; n_ = k; add({Set, t, v, 0.f}); }

    float valueAt(double t) const {
        int k = -1; while (k + 1 < n_ && ev_[k + 1].t <= t) ++k;
        if (k + 1 < n_ && (ev_[k + 1].type == Lin || ev_[k + 1].type == Exp)) {
            const Ev& e2 = ev_[k + 1]; double T0; float V0;
            if (k < 0) { T0 = 0.0; V0 = def_; }
            else { T0 = ev_[k].t; V0 = ev_[k].type == Target ? startValue(k) : endValue(k); }
            const double span = e2.t - T0; const double x = span > 0 ? (t - T0) / span : 1.0;
            if (e2.type == Lin) return V0 + (e2.v - V0) * (float)x;
            if (V0 == 0.f || e2.v == 0.f || (V0 > 0) != (e2.v > 0)) return V0;
            return V0 * (float)std::pow((double)e2.v / V0, x);
        }
        if (k < 0) return def_;
        const Ev& e = ev_[k];
        if (e.type != Target) return e.v;
        const float v0 = startValue(k);
        return e.v + (v0 - e.v) * (float)std::exp(-(t - e.t) / (e.tau > 0 ? e.tau : 1e-6));
    }
    bool empty() const { return n_ == 0; }

private:
    struct Ev { Type type; double t; float v; float tau; };
    void add(Ev e) {
        if (n_ >= kMax) return;
        int i = n_; while (i > 0 && ev_[i - 1].t > e.t) { ev_[i] = ev_[i - 1]; --i; }   // stable: equal times keep insertion order
        ev_[i] = e; ++n_;
    }
    float endValue(int k) const { return ev_[k].v; }
    // value of the timeline just before event k starts (used by setTarget and ramps that follow a setTarget)
    float startValue(int k) const {
        const double t = ev_[k].t; const int j = k - 1;
        if (j < 0) return def_;
        const Ev& e = ev_[j];
        if (e.type != Target) return e.v;
        return e.v + (startValue(j) - e.v) * (float)std::exp(-(t - e.t) / (e.tau > 0 ? e.tau : 1e-6));
    }
    Ev ev_[kMax]{}; int n_ = 0; float def_ = 0.f; bool held_ = false;
};

} // namespace blonda
