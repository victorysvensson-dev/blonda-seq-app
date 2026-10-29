// BLONDA SEQ — zero-latency stereo convolution reverb with the same IR normalisation as Web Audio's ConvolverNode.
// Non-uniform partitioning: 128 direct taps, then 128-sample FFT partitions, then 4096-sample FFT partitions for the
// long tail, all summed into a time-aligned output ring - so the cost stays low even for multi-second IRs.
#pragma once
#include <vector>
#include <complex>
#include <cmath>
#include <cstring>
#include <algorithm>

namespace blonda {

class FFT {
public:
    void init(int n) {
        n_ = n; rev_.resize(n); tw_.resize(n / 2);
        int lg = 0; while ((1 << lg) < n) ++lg;
        for (int i = 0; i < n; ++i) { int r = 0; for (int b = 0; b < lg; ++b) if (i & (1 << b)) r |= 1 << (lg - 1 - b); rev_[i] = r; }
        for (int i = 0; i < n / 2; ++i) tw_[i] = std::polar(1.0f, -2.f * 3.14159265358979f * i / n);
    }
    void forward(std::complex<float>* a) const { run(a, false); }
    void inverse(std::complex<float>* a) const { run(a, true); const float s = 1.f / n_; for (int i = 0; i < n_; ++i) a[i] *= s; }
    int size() const { return n_; }
private:
    void run(std::complex<float>* a, bool inv) const {
        for (int i = 0; i < n_; ++i) if (i < rev_[i]) std::swap(a[i], a[rev_[i]]);
        for (int len = 2; len <= n_; len <<= 1) {
            const int half = len >> 1, step = n_ / len;
            for (int i = 0; i < n_; i += len) for (int j = 0; j < half; ++j) {
                std::complex<float> w = tw_[j * step]; if (inv) w = std::conj(w);
                const std::complex<float> u = a[i + j], v = a[i + j + half] * w; a[i + j] = u + v; a[i + j + half] = u - v;
            }
        }
    }
    int n_ = 0; std::vector<int> rev_; std::vector<std::complex<float>> tw_;
};

// One uniformly partitioned FFT stage covering taps [start, end); start >= block size.
class ConvStage {
public:
    void init(const float* ir, int irLen, float scale, int start, int end, int B) {
        B_ = B; start_ = start; fft_.init(2 * B); end = std::min(end, irLen);
        P_ = end > start ? (end - start + B - 1) / B : 0;
        H_.assign((size_t)std::max(1, P_) * (B + 1), {0, 0}); X_.assign((size_t)std::max(1, P_) * (B + 1), {0, 0});
        std::vector<std::complex<float>> buf(2 * B);
        for (int p = 0; p < P_; ++p) {
            std::fill(buf.begin(), buf.end(), std::complex<float>(0, 0));
            for (int j = 0; j < B; ++j) { const int idx = start + p * B + j; if (idx < end) buf[j] = ir[idx] * scale; }
            fft_.forward(buf.data()); std::copy(buf.begin(), buf.begin() + B + 1, H_.begin() + (size_t)p * (B + 1));
        }
        in_.assign(2 * B, 0.f); fill_ = 0; xi_ = 0; scratch_.assign(2 * B, {0, 0}); acc_.assign(B + 1, {0, 0});
    }
    bool active() const { return P_ > 0; }
    // push one input sample; when a block completes, add its contribution into ring at (blockStartFrame + start)
    void push(float x, float* ring, int ringMask, long long frame) {
        in_[B_ + fill_] = x;
        if (++fill_ < B_) return;
        fill_ = 0; const long long blockStart = frame - B_ + 1;
        xi_ = (xi_ + P_ - 1) % P_;
        for (int j = 0; j < 2 * B_; ++j) scratch_[j] = in_[j];
        fft_.forward(scratch_.data());
        std::copy(scratch_.begin(), scratch_.begin() + B_ + 1, X_.begin() + (size_t)xi_ * (B_ + 1));
        std::fill(acc_.begin(), acc_.end(), std::complex<float>(0, 0));
        for (int p = 0; p < P_; ++p) {
            const std::complex<float>* X = &X_[(size_t)((xi_ + p) % P_) * (B_ + 1)]; const std::complex<float>* H = &H_[(size_t)p * (B_ + 1)];
            for (int k = 0; k <= B_; ++k) acc_[k] += X[k] * H[k];
        }
        for (int k = 0; k <= B_; ++k) scratch_[k] = acc_[k];
        for (int k = 1; k < B_; ++k) scratch_[2 * B_ - k] = std::conj(acc_[k]);
        fft_.inverse(scratch_.data());
        const long long t0 = blockStart + start_;
        for (int j = 0; j < B_; ++j) ring[(t0 + j) & ringMask] += scratch_[B_ + j].real();
        std::memmove(in_.data(), in_.data() + B_, sizeof(float) * B_);
    }
private:
    FFT fft_; int B_ = 128, start_ = 0, P_ = 0, fill_ = 0, xi_ = 0;
    std::vector<std::complex<float>> H_, X_, scratch_, acc_; std::vector<float> in_;
};

class Convolver {
public:
    static constexpr int kHead = 128, kB1 = 128, kSplit = 4224, kB2 = 4096, kRing = 1 << 14;
    void setIR(const float* irL, const float* irR, int len, float sampleRate, bool normalize = true) {
        float scale = 1.f;
        if (normalize) {   // Chrome: calculateNormalizationScale
            double p = 0; for (int i = 0; i < len; ++i) p += (double)irL[i] * irL[i] + (double)irR[i] * irR[i];
            float power = (float)std::sqrt(p / (2.0 * len)); if (!std::isfinite(power) || power < 0.000125f) power = 0.000125f;
            scale = 1.f / power; scale *= std::pow(10.f, -58.f * 0.05f); scale *= 44100.f / sampleRate;
        }
        for (int c = 0; c < 2; ++c) {
            const float* ir = c ? irR : irL; Ch& ch = ch_[c];
            ch.head.assign(kHead, 0.f); for (int i = 0; i < std::min(kHead, len); ++i) ch.head[kHead - 1 - i] = ir[i] * scale;   // reversed: forward dot product
            ch.hist.assign(2 * kHead, 0.f); ch.hp = 0;
            ch.s1.init(ir, len, scale, kHead, kSplit, kB1); ch.s2.init(ir, len, scale, kSplit, len, kB2);
            ch.ring.assign(kRing, 0.f);
        }
        frame_ = 0; ready_ = true;
    }
    // adds the wet signal into outL/outR
    void process(const float* inL, const float* inR, float* outL, float* outR, int n) {
        if (!ready_) return;
        for (int i = 0; i < n; ++i, ++frame_) {
            for (int c = 0; c < 2; ++c) {
                Ch& ch = ch_[c]; const float x = c ? inR[i] : inL[i];
                // direct head (mirrored history so the inner loop has no wrap)
                ch.hist[ch.hp] = x; ch.hist[ch.hp + kHead] = x;
                const float* h = ch.head.data(); const float* hx = &ch.hist[ch.hp + 1];
                float y = 0; for (int j = 0; j < kHead; ++j) y += h[j] * hx[j];
                ch.hp = (ch.hp + 1) & (kHead - 1);
                ch.s1.push(x, ch.ring.data(), kRing - 1, frame_); if (ch.s2.active()) ch.s2.push(x, ch.ring.data(), kRing - 1, frame_);
                float& r = ch.ring[frame_ & (kRing - 1)]; y += r; r = 0.f;
                (c ? outR : outL)[i] += y;
            }
        }
    }
private:
    struct Ch { std::vector<float> head, hist, ring; int hp = 0; ConvStage s1, s2; };
    Ch ch_[2]; long long frame_ = 0; bool ready_ = false;
};

} // namespace blonda
