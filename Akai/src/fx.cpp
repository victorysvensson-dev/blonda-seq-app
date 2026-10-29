#include "akai/fx.hpp"
#include "blonda/convolver.hpp"
#include "blonda/dsp.hpp"
#include <chrono>
#include <cmath>
#include <cstring>

namespace akai {

void (*gWorkerThreadInit)() = nullptr;

namespace {
constexpr float kPiF = 3.14159265358979f;
// Web Audio biquad designs, exactly as SEQ.3 (Core/src/seq3.cpp designBQ / runBQ): LP/HP Q in dB, BP linear Q
void designBQ(int type, float f, float q, float sr, float* c) {
    f = f < 1.f ? 1.f : (f > sr * .5f - 1.f ? sr * .5f - 1.f : f);
    const float w = 2.f * kPiF * f / sr, cs = std::cos(w), sn = std::sin(w); float b0, b1, b2, a0, a1, a2;
    if (type == 2) { const float al = sn / (2 * q); b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else { const float al = sn / (2 * std::pow(10.f, q / 20.f)); a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
        if (type == 0) { b0 = (1 - cs) * .5f; b1 = 1 - cs; b2 = b0; } else { b0 = (1 + cs) * .5f; b1 = -(1 + cs); b2 = b0; } }
    c[0] = b0 / a0; c[1] = b1 / a0; c[2] = b2 / a0; c[3] = a1 / a0; c[4] = a2 / a0;
}
inline float runBQ(const float* c, float* z, float x) { const float y = c[0] * x + z[0]; z[0] = c[1] * x - c[3] * y + z[1]; z[1] = c[2] * x - c[4] * y; return y; }
const char* const kTimeNames[] = {"1/16", "1/8", "1/8D", "1/4", "1/4D", "1/2"};
const float kTimeBeats[] = {.25f, .5f, .75f, 1.f, 1.5f, 2.f};
const char* const kOnOff[] = {"OFF", "ON"};
const ParamInfo kInfo[FxBus::kNumParams] = {
    {"echo", "ECHO", 0.f, 1.f, 0.f, 0, nullptr},
    {"space", "SPACE", 0.f, 1.f, 0.f, 0, nullptr},
    {"filter", "FILTER", -1.f, 1.f, 0.f, 0, nullptr},
    {"echoTime", "TIME", 0.f, 5.f, 2.f, 6, kTimeNames},   // 1/8 dotted = SEQ.3's default echo time (0.75 beats)
    {"echoFb", "FEEDBK", 0.f, .85f, .38f, 0, nullptr},    // SEQ.3's default feedback
    {"fxOn", "FX", 0.f, 1.f, 1.f, 2, kOnOff},
};
const Page kPages[2] = {{"KNOB FX", {FxBus::P_ECHO, FxBus::P_SPACE, FxBus::P_FILTER}}, {"ECHO", {FxBus::P_TIME, FxBus::P_FEEDBACK, FxBus::P_ON}}};
} // namespace

// ================================================================ TailReverb
struct TailReverb::Impl {
    struct Ch { std::vector<float> head, hist, ring1, wring; int hp = 0; blonda::ConvStage s1, tail; };
    Ch ch[2];
    std::vector<float> in[kSlots][2], out[kSlots][2];
    long long frame = 0, done = -1;
    int zeroRun = 1 << 30;
    bool ready = false, playValid = false;
    static constexpr int kRing = 1 << 14;
};

TailReverb::TailReverb() : d_(new Impl) { for (auto& s : slotBlock_) s.store(-1); }
TailReverb::~TailReverb() { setThreaded(false); }

void TailReverb::build(float sizeSec, float sr) {
    setThreaded(false);
    // IR exactly like SEQ.3 buildReverb(): noise * (1 - i/len)^2.8, independent channels, Chrome's normalisation
    const int len = std::max(64, (int)(sr * sizeSec));
    std::vector<float> a((size_t)len), b((size_t)len); blonda::Noise n; n.seed(0x5EACEu);
    for (int i = 0; i < len; ++i) { const float e = std::pow(1.f - (float)i / len, 2.8f); a[(size_t)i] = n.next() * e; b[(size_t)i] = n.next() * e; }
    double p = 0; for (int i = 0; i < len; ++i) p += (double)a[(size_t)i] * a[(size_t)i] + (double)b[(size_t)i] * b[(size_t)i];
    float power = (float)std::sqrt(p / (2.0 * len)); if (!std::isfinite(power) || power < 0.000125f) power = 0.000125f;
    float scale = 1.f / power; scale *= std::pow(10.f, -58.f * 0.05f); scale *= 44100.f / sr;
    Impl& D = *d_;
    for (int c = 0; c < 2; ++c) {
        const float* ir = c ? b.data() : a.data(); Impl::Ch& C = D.ch[c];
        C.head.assign(kHead, 0.f); for (int i = 0; i < std::min(kHead, len); ++i) C.head[(size_t)(kHead - 1 - i)] = ir[i] * scale;
        C.hist.assign(2 * kHead, 0.f); C.hp = 0;
        C.s1.init(ir, len, scale, kHead, kTailStart, kB1);
        C.tail.init(ir, len, scale, kTailStart, len, kB2);
        C.ring1.assign(Impl::kRing, 0.f); C.wring.assign(Impl::kRing, 0.f);
        for (int s = 0; s < kSlots; ++s) { D.in[s][c].assign(kB2, 0.f); D.out[s][c].assign(kB2, 0.f); }
    }
    D.frame = 0; D.done = -1; D.zeroRun = 1 << 30; D.playValid = false; D.ready = true;
    inBlock_.store(-1); for (auto& s : slotBlock_) s.store(-1);
}

void TailReverb::setThreaded(bool on) {
    if (on == threaded_) return;
    if (!on) { quit_ = true; if (thread_.joinable()) thread_.join(); threaded_ = false; return; }
    quit_ = false; threaded_ = true;
    d_->done = inBlock_.load();
    thread_ = std::thread([this] { if (gWorkerThreadInit) gWorkerThreadInit(); worker(); });
}

void TailReverb::worker() {
    while (!quit_.load(std::memory_order_relaxed)) {
        const long long target = inBlock_.load(std::memory_order_acquire);
        if (target - d_->done > kSlots - 2) d_->done = target - 1;   // fell far behind: skip to the newest block
        while (d_->done < target) computeTail(++d_->done);
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
}

// The long tail for input block k (frames k*4096 .. +4095): lands at k*4096 + kTailStart.
void TailReverb::computeTail(long long k) {
    Impl& D = *d_; const int s = (int)(k % kSlots); const long long base = k * kB2;
    for (int c = 0; c < 2; ++c) {
        Impl::Ch& C = D.ch[c]; const float* x = D.in[s][c].data(); float* o = D.out[s][c].data();
        for (int j = 0; j < kB2; ++j) C.tail.push(x[j], C.wring.data(), Impl::kRing - 1, base + j);
        for (int j = 0; j < kB2; ++j) { float& r = C.wring[(size_t)((base + kTailStart + j) & (Impl::kRing - 1))]; o[j] = r; r = 0.f; }
    }
    slotBlock_[s].store(k, std::memory_order_release);
}

void TailReverb::process(const float* inL, const float* inR, float* outL, float* outR, int n) {
    Impl& D = *d_; if (!D.ready) return;
    for (int i = 0; i < n; ++i, ++D.frame) {
        const long long f = D.frame;
        const float xs[2] = {inL[i], inR[i]};
        D.zeroRun = (xs[0] == 0.f && xs[1] == 0.f) ? (D.zeroRun < (1 << 30) ? D.zeroRun + 1 : D.zeroRun) : 0;
        // the early part goes quiet once its input has been silent longer than it reaches: skip it (exact)
        const bool early = D.zeroRun <= kTailStart + 2 * kB1 + kHead;
        const int slot = (int)((f / kB2) % kSlots), j = (int)(f % kB2);
        // which tail block plays now
        float tl[2] = {0.f, 0.f};
        if (f >= kTailStart) {
            const long long q = f - kTailStart, kb = q / kB2; const int jj = (int)(q % kB2);
            if (jj == 0) { D.playValid = slotBlock_[kb % kSlots].load(std::memory_order_acquire) == kb; if (!D.playValid && threaded_) ++late_; }
            if (D.playValid) { const int ps = (int)(kb % kSlots); tl[0] = D.out[ps][0][(size_t)jj]; tl[1] = D.out[ps][1][(size_t)jj]; }
        }
        for (int c = 0; c < 2; ++c) {
            Impl::Ch& C = D.ch[c]; const float x = xs[c]; float y = 0.f;
            if (early) {
                C.hist[(size_t)C.hp] = x; C.hist[(size_t)(C.hp + kHead)] = x;
                const float* h = C.head.data(); const float* hx = &C.hist[(size_t)(C.hp + 1)];
                for (int t = 0; t < kHead; ++t) y += h[t] * hx[t];
                C.hp = (C.hp + 1) & (kHead - 1);
                C.s1.push(x, C.ring1.data(), Impl::kRing - 1, f);
                float& r = C.ring1[(size_t)(f & (Impl::kRing - 1))]; y += r; r = 0.f;
            }
            D.in[slot][c][(size_t)j] = x;
            (c ? outR : outL)[i] += y + tl[c];
        }
        if (j == kB2 - 1) {   // an input block for the tail is complete
            const long long k = f / kB2;
            if (threaded_) inBlock_.store(k, std::memory_order_release); else computeTail(k);
        }
    }
}

// ================================================================ FxBus
void FxBus::Smooth::tau(float t, float sr) { coef = t <= 0.f ? 0.f : std::exp(-1.f / (t * sr)); }
float FxBus::Smooth::next() { v = target + (v - target) * coef; if (target == 0.f && std::fabs(v) < 1e-7f) v = 0.f; return v; }

FxBus::FxBus() { for (int i = 0; i < kNumParams; ++i) v_[i] = kInfo[i].def; }
FxBus::~FxBus() = default;

const ParamInfo& FxBus::param(int i) const { return kInfo[i]; }
const Page& FxBus::page(int p) const { return kPages[p < 0 ? 0 : (p > 1 ? 1 : p)]; }

void FxBus::prepare(float sr) {
    sr_ = sr;
    dlL_.assign((size_t)(2.5f * sr), 0.f); dlR_.assign((size_t)(2.5f * sr), 0.f); dlW_ = 0;
    std::memset(dToneZ_, 0, sizeof dToneZ_); std::memset(rHpZ_, 0, sizeof rHpZ_); std::memset(mLpZ_, 0, sizeof mLpZ_); std::memset(mHpZ_, 0, sizeof mHpZ_);
    designBQ(2, 1800, .6f, sr, dToneC_); designBQ(1, 250, 1, sr, rHpC_);
    rev_.build(2.6f, sr);   // SEQ.3's default space size
    dlTime_.tau(.05f, sr); fb_.tau(.05f, sr); eSend_.tau(.03f, sr); sSend_.tau(.03f, sr); eRet_.tau(.01f, sr); sRet_.tau(.01f, sr); lpF_.tau(.03f, sr); hpF_.tau(.03f, sr);
    updateTargets();
    for (Smooth* s : {&dlTime_, &fb_, &eSend_, &sSend_, &eRet_, &sRet_, &lpF_, &hpF_}) s->snap(s->target);
    lastLp_ = lastHp_ = -1;
    rev_.setThreaded(true);
}

float FxBus::filterAmount() const {
    const float f = v_[P_FILTER], a = std::fabs(f);
    if (!on_ || a < 0.04f) return 0.f;   // dead zone around the centre: the knob's middle is "off"
    return (f < 0 ? -1.f : 1.f) * (a - 0.04f) / 0.96f;
}

void FxBus::updateTargets() {
    eSend_.target = on_ ? v_[P_ECHO] : 0.f;
    sSend_.target = on_ ? v_[P_SPACE] : 0.f;
    eRet_.target = on_ ? 1.f : 0.f; sRet_.target = on_ ? .7f : 0.f;   // SEQ.3: echo returns at 1, space at 0.7
    int ti = (int)(v_[P_TIME] + .5f); ti = ti < 0 ? 0 : (ti > 5 ? 5 : ti);
    float dt = 60.f / bpm_ * kTimeBeats[ti];
    const float maxDt = dlL_.empty() ? 2.f : ((float)dlL_.size() - 4.f) / sr_;
    dlTime_.target = dt > maxDt ? maxDt : dt;
    fb_.target = v_[P_FEEDBACK];
    const float f = filterAmount();
    lpF_.target = f < 0 ? 200.f * std::pow(100.f, 1 + f) : 20000.f;
    hpF_.target = f > 0 ? 20.f * std::pow(100.f, f * 1.15f) : 20.f;
}

void FxBus::set(int i, float value) {
    const ParamInfo& p = kInfo[i];
    value = value < p.min ? p.min : (value > p.max ? p.max : value);
    v_[i] = value;
    if (i == P_ON) on_ = value >= .5f;
    updateTargets();
}

void FxBus::format(int i, char* buf, int len) const {
    if (i == P_FILTER) {
        const float f = v_[P_FILTER], a = std::fabs(f);
        if (a < 0.04f) std::snprintf(buf, (size_t)len, "OFF");
        else std::snprintf(buf, (size_t)len, "%s %d", f < 0 ? "LP" : "HP", (int)((a - 0.04f) / 0.96f * 100.f + .5f));
        return;
    }
    Params::format(i, buf, len);
}

bool FxBus::active() const { return on_ && (v_[P_ECHO] > 0.f || v_[P_SPACE] > 0.f || filterAmount() != 0.f); }

void FxBus::process(float* L, float* R, int n) {
    if (dlL_.empty()) return;
    const int DL = (int)dlL_.size();
    for (int pos = 0; pos < n; pos += kBlock) {
        const int m = n - pos < kBlock ? n - pos : kBlock;
        float* l = L + pos; float* r = R + pos;
        // ECHO (SEQ.3: dIn -> delay -> band-pass 1800 -> feedback, delay output returns to the bus)
        for (int x = 0; x < m; ++x) {
            const float dt = std::max(128.f, dlTime_.next() * sr_), fb = fb_.next(), es = eSend_.next(), ss = sSend_.next();
            float rp = (float)dlW_ - dt; while (rp < 0) rp += (float)DL; const int i0 = (int)rp; const float fr = rp - (float)i0; const int i1 = (i0 + 1) % DL;
            const float yl = runBQ(dToneC_, dToneZ_[0], dlL_[(size_t)i0] + (dlL_[(size_t)i1] - dlL_[(size_t)i0]) * fr);
            const float yr = runBQ(dToneC_, dToneZ_[1], dlR_[(size_t)i0] + (dlR_[(size_t)i1] - dlR_[(size_t)i0]) * fr);
            dlL_[(size_t)dlW_] = l[x] * es + yl * fb; dlR_[(size_t)dlW_] = r[x] * es + yr * fb; dlW_ = (dlW_ + 1) % DL;
            // SPACE input: 250 Hz high-pass, then the send (so a closed send feeds the reverb exact silence)
            rInL_[x] = runBQ(rHpC_, rHpZ_[0], l[x]) * ss; rInR_[x] = runBQ(rHpC_, rHpZ_[1], r[x]) * ss;
            const float er = eRet_.next(); wetL_[x] = yl * er; wetR_[x] = yr * er;
        }
        // SPACE
        float rvL[kBlock], rvR[kBlock];
        std::memset(rvL, 0, sizeof(float) * (size_t)m); std::memset(rvR, 0, sizeof(float) * (size_t)m);
        rev_.process(rInL_, rInR_, rvL, rvR, m);
        for (int x = 0; x < m; ++x) { const float rr = sRet_.next(); l[x] += wetL_[x] + rvL[x] * rr; r[x] += wetR_[x] + rvR[x] * rr; }
        // FILTER (SEQ.3 master low-pass / high-pass, Q 0.9 dB); skipped entirely while fully open
        for (int x = 0; x < m; ++x) {
            const float lf = lpF_.next(), hf = hpF_.next();
            if (lf >= 19999.f && hf <= 20.001f && lpF_.target >= 19999.f && hpF_.target <= 20.001f) {
                if (lastLp_ >= 0) { std::memset(mLpZ_, 0, sizeof mLpZ_); std::memset(mHpZ_, 0, sizeof mHpZ_); lastLp_ = lastHp_ = -1; }
                continue;
            }
            if (std::fabs(lf - lastLp_) > 1e-2f) { designBQ(0, lf, .9f, sr_, mLpC_); lastLp_ = lf; }
            if (std::fabs(hf - lastHp_) > 1e-3f) { designBQ(1, hf, .9f, sr_, mHpC_); lastHp_ = hf; }
            l[x] = runBQ(mHpC_, mHpZ_[0], runBQ(mLpC_, mLpZ_[0], l[x]));
            r[x] = runBQ(mHpC_, mHpZ_[1], runBQ(mLpC_, mLpZ_[1], r[x]));
        }
    }
}

} // namespace akai
