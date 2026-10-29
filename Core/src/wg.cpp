#include "blonda/wg.hpp"
#include <mutex>

namespace blonda::wg {

// ---------------------------------------------------------------- tables
static Wave* gWaves[W_COUNT] = {};
static std::once_flag gOnce;

static void buildAll() {
    const int N = 2048;
    static float re[2049], im[2049];
    auto mk = [&](WaveId id, auto fill, int n) { std::memset(re, 0, sizeof re); std::memset(im, 0, sizeof im); fill(); gWaves[id] = new Wave(); gWaves[id]->build(re, im, n); };
    mk(W_SINE, [&] { im[1] = 1; }, 2);
    mk(W_SQUARE, [&] { for (int k = 1; k < N; k += 2) im[k] = 4.f / (k * kPi); }, N);
    mk(W_SAW, [&] { for (int k = 1; k < N; ++k) im[k] = ((k & 1) ? 2.f : -2.f) / (k * kPi); }, N);
    mk(W_TRI, [&] { for (int k = 1; k < N; k += 2) im[k] = 8.f / (kPi * kPi * k * k) * ((((k - 1) / 2) & 1) ? -1.f : 1.f); }, N);
    // Minimoog waves: 64 coefficients, exactly like mgWave()
    auto tri = [](int n) { return (n % 2) ? 8.f / (kPi * kPi * n * n) * ((((n - 1) / 2) % 2) ? -1.f : 1.f) : 0.f; };
    auto saw = [](int n) { return 2.f / (kPi * n) * ((n % 2) ? 1.f : -1.f); };
    auto pul = [](int n, float d) { return 2.f / (n * kPi) * std::sin(n * kPi * d); };
    mk(W_MG_TRI, [&] { for (int n = 1; n < 64; ++n) im[n] = tri(n); }, 64);
    mk(W_MG_SHARK, [&] { for (int n = 1; n < 64; ++n) im[n] = tri(n) * .6f + saw(n) * .4f; }, 64);
    mk(W_MG_SAW, [&] { for (int n = 1; n < 64; ++n) im[n] = saw(n); }, 64);
    mk(W_MG_RSAW, [&] { for (int n = 1; n < 64; ++n) im[n] = -saw(n); }, 64);
    mk(W_MG_SQ, [&] { for (int n = 1; n < 64; ++n) re[n] = pul(n, .5f); }, 64);
    mk(W_MG_WIDE, [&] { for (int n = 1; n < 64; ++n) re[n] = pul(n, .3f); }, 64);
    mk(W_MG_NARROW, [&] { for (int n = 1; n < 64; ++n) re[n] = pul(n, .1f); }, 64);
    mk(W_CHIP_125, [&] { for (int n = 1; n < 64; ++n) re[n] = pul(n, .125f); }, 64);
    mk(W_CHIP_25, [&] { for (int n = 1; n < 64; ++n) re[n] = pul(n, .25f); }, 64);
    mk(W_CHIP_50, [&] { for (int n = 1; n < 64; ++n) re[n] = pul(n, .5f); }, 64);
}
void warmWaves() { std::call_once(gOnce, buildAll); }
const Wave& wave(WaveId id) { warmWaves(); return *gWaves[id]; }

const float* noiseBuffer(int& length, float sampleRate) {
    static float* buf = nullptr; static int len = 0;
    if (!buf) { len = (int)(sampleRate * 1.5f); buf = new float[len]; Noise n; n.seed(0x5EEDu); for (int i = 0; i < len; ++i) buf[i] = n.next(); }
    length = len; return buf;
}

// ---------------------------------------------------------------- graph building
void Graph::reset(float sampleRate) {
    sr_ = sampleRate; n_ = 0; nOut_ = 0; histOverflow_ = false; decUsed_ = latUsed_ = dlUsed_ = ringUsed_ = histUsed_ = 0; active_ = false; end_ = 0; master_.reset(1.f);
}

template <class NodeT> static void initNode(NodeT& nd, NodeType type) {
    nd.type = type; nd.sub = 0; nd.ch = 1; nd.nIn = 0; nd.start = 0; nd.stop = 1e18; nd.out[0] = nd.out[1] = 0;
    for (int p = 0; p < 4; ++p) { nd.p[p].reset(0.f); nd.nMod[p] = 0; }
    nd.phase = 0; std::memset(nd.z, 0, sizeof nd.z); nd.lastF = nd.lastQ = -1; nd.lastG = -1e9f; nd.up[0] = nd.up[1] = 0; nd.os = 1; nd.lat = 0; nd.li = 0; nd.lbuf = nullptr;
    nd.mF0 = nd.mDet = nd.mPan = -1e30f; nd.mInc = 0; nd.mFac = 1; nd.mGl = nd.mGr = 0; nd.mLvl = 0; nd.srcSt = false;
    nd.dec[0][0] = nd.dec[0][1] = nd.dec[1][0] = nd.dec[1][1] = nullptr; nd.dl = nullptr; nd.ring = nullptr; nd.qLive = -1.f; nd.arpN = 0; nd.muted = false; nd.delayedIn = 0; nd.delayedMod = 0; nd.hist = nullptr; nd.hpos = 0;
}

int Graph::osc(WaveId w, float freq, double start, double stop) {
    if (n_ >= kNodes) { return kNodes - 1; } Node& nd = nodes_[n_]; initNode(nd, N_OSC); nd.sub = w; nd.wv = w == W_SINE ? nullptr : &wave(w); nd.p[0].reset(freq); nd.p[1].reset(0.f); nd.start = start; nd.stop = stop;
    // Chrome quirk: an oscillator started mid render-quantum runs its first partial quantum at the quantum-start
    // frequency (modulation inputs not applied yet). This shifts FM phase relationships, so emulate it.
    { const long long f0 = (long long)std::llround(start * sr_), q0 = (f0 / 128) * 128; nd.qStart = (double)q0 / sr_; nd.qEnd = f0 % 128 ? (double)(q0 + 128) / sr_ - 0.5 / sr_ : start; }
    return n_++;
}
int Graph::gain(float g) { if (n_ >= kNodes) { return kNodes - 1; } Node& nd = nodes_[n_]; initNode(nd, N_GAIN); nd.p[0].reset(g); return n_++; }
int Graph::biquad(BqType type, float freq, float q, float gainDb) {
    if (n_ >= kNodes) { return kNodes - 1; } Node& nd = nodes_[n_]; initNode(nd, N_BIQUAD); nd.sub = type; nd.p[0].reset(freq); nd.p[1].reset(q); nd.p[2].reset(0.f); nd.p[3].reset(gainDb); return n_++;
}
int Graph::shaper(CurveType c, float amount, int oversample) {
    if (n_ >= kNodes) { return kNodes - 1; } Node& nd = nodes_[n_]; initNode(nd, N_SHAPER); nd.sub = c; nd.amt = amount; nd.os = oversample;
    if (c == C_DIST) { const int k = (int)std::lround(amount * 20.f); const float g = 1.f + k / 20.f * 38.f, gn = g * .75f; nd.k1 = g; nd.k1n = 1.f / std::tanh(g); nd.k2 = gn; nd.k2n = 1.f / std::tanh(gn); }
    else if (c == C_DRIVE) { const float k = 1.f + std::round(amount * 20.f) / 20.f * 6.f; nd.k1 = k; nd.k1n = 1.f / std::tanh(k); }
    else { nd.k1 = std::pow(2.f, amount) / 2.f; }   // crush: amount = bits
    if (oversample > 1) {
        // Chrome: 2x adds 128 frames, 4x adds 192. Our half-band chain adds 16 (2x) / 24 (4x); pad the rest.
        nd.lat = oversample == 2 ? 112 : 168;
        if (latUsed_ + 2 * 256 <= (int)latPool_.size()) { nd.lbuf = &latPool_[latUsed_]; latUsed_ += 2 * 256; std::memset(nd.lbuf, 0, sizeof(float) * 512); }
        const int need = oversample == 2 ? 1 : 2;
        for (int c2 = 0; c2 < 2; ++c2) for (int s = 0; s < need; ++s) if (decUsed_ < (int)decPool_.size()) { nd.dec[c2][s] = &decPool_[decUsed_++]; nd.dec[c2][s]->reset(); }
    }
    return n_++;
}
int Graph::delay(float maxSec, float time) {
    if (n_ >= kNodes) { return kNodes - 1; } Node& nd = nodes_[n_]; initNode(nd, N_DELAY); nd.p[0].reset(time);
    const int need = std::min(8192, (int)(maxSec * sr_) + 4);
    if (dlUsed_ + 2 * 8192 <= (int)dlPool_.size()) { nd.dl = &dlPool_[dlUsed_]; dlUsed_ += 2 * 8192; std::memset(nd.dl, 0, sizeof(float) * 2 * 8192); }
    nd.dlSize = 8192; nd.dlW = 0; (void)need; return n_++;
}
int Graph::constant(float offset, double start, double stop) { if (n_ >= kNodes) { return kNodes - 1; } Node& nd = nodes_[n_]; initNode(nd, N_CONST); nd.p[0].reset(offset); nd.start = start; nd.stop = stop; return n_++; }
int Graph::noise(double start, double stop, float offsetSec) {
    if (n_ >= kNodes) { return kNodes - 1; } Node& nd = nodes_[n_]; initNode(nd, N_NOISE); nd.start = start; nd.stop = stop;
    nd.buf = noiseBuffer(nd.bufLen, sr_); nd.bufPos = std::fmod((double)offsetSec * sr_, (double)nd.bufLen); return n_++;
}
int Graph::pan(float p) { if (n_ >= kNodes) { return kNodes - 1; } Node& nd = nodes_[n_]; initNode(nd, N_PAN); nd.p[0].reset(p); return n_++; }
int Graph::sampleHold(float rate, double start, double stop, uint32_t seed) {
    if (n_ >= kNodes) { return kNodes - 1; } Node& nd = nodes_[n_]; initNode(nd, N_SH); nd.start = start; nd.stop = stop; nd.rate = rate; nd.rng = seed | 1u; nd.shLeft = 0; return n_++;
}
// Karplus-Strong exactly like ksBuf(): filtered noise burst, body comb, averaging loop with feedback, peak-normalised, 40 ms fade at the end.
int Graph::karplus(float fr, float damp, float bright, float body, float lenP, double start, uint32_t seed) {
    if (n_ >= kNodes) { return kNodes - 1; } Node& nd = nodes_[n_]; initNode(nd, N_KS); nd.start = start; nd.p[0].reset(1.f);
    const int N = std::max(2, (int)std::lround(sr_ / fr));
    if (ringUsed_ + N > (int)ringPool_.size() || N > 1200) { nd.ringN = 0; return n_++; }
    nd.ring = &ringPool_[ringUsed_]; ringUsed_ += N; nd.ringN = N;
    Noise rn; rn.seed(seed | 1u);
    float y = 0; const float a = .12f + bright * .85f; for (int i = 0; i < N; ++i) { y += (rn.next() - y) * a; nd.ring[i] = y; }
    const int pk = std::max(1, (int)std::floor(N * (.08f + body * .42f)));
    float tmp[1200]; std::memcpy(tmp, nd.ring, sizeof(float) * N); for (int i = 0; i < N; ++i) nd.ring[i] = tmp[i] - tmp[(i + pk) % N] * .6f;
    float m = 0; for (int i = 0; i < N; ++i) m = std::max(m, std::fabs(nd.ring[i]));
    nd.norm = m > 0 ? 1.f / m : 1.f; nd.fb = .985f + damp * .0145f; nd.idx = 0; nd.len = (long)std::floor(sr_ * (.4f + lenP * 2.6f));
    nd.fadeN = (float)std::min<long>(nd.len, (long)std::floor(sr_ * .04f)); nd.pos = 0; nd.ksFrac = 0; nd.ksPrev = 0; nd.ksCur = 0; nd.stop = start + (double)nd.len / sr_;
    return n_++;
}
void Graph::connect(int a, int b) { Node& nd = nodes_[b]; if (nd.nIn < kIn) nd.in[nd.nIn++] = (int16_t)a; }
void Graph::connectParam(int a, int b, ParamId p) { Node& nd = nodes_[b]; if (nd.nMod[p] < kMods) nd.mod[p][nd.nMod[p]++] = (int16_t)a; }
void Graph::toOut(int a) { if (nOut_ < (int)outs_.size()) outs_[nOut_++] = (int16_t)a; }

void Graph::finalize(double endTime) {
    // Pull-order DFS from the outputs, like Chrome renders a graph. An edge that points back into a node
    // still being visited closes a cycle: Chrome feeds it the previous render quantum (128 frames late).
    const int N = n_; uint8_t state[kNodes]{}; int cnt = 0;   // 0 new, 1 on stack, 2 done
    struct Fr { int16_t node; int16_t k; };
    Fr st[kNodes * 2]; int sp = 0;
    auto want = [&](int u) -> int { const Node& nd = nodes_[u]; int t = nd.nIn; for (int p = 0; p < 4; ++p) t += nd.nMod[p]; return t; };
    auto edgeSrc = [&](int u, int k, bool& isMod, int& p, int& j) -> int {
        Node& nd = nodes_[u]; if (k < nd.nIn) { isMod = false; j = k; return nd.in[k]; }
        k -= nd.nIn; for (p = 0; p < 4; ++p) { if (k < nd.nMod[p]) { isMod = true; j = k; return nd.mod[p][k]; } k -= nd.nMod[p]; } return -1; };
    auto markDelayed = [&](int u, bool isMod, int p, int j, int src) {
        Node& nd = nodes_[u]; if (isMod) nd.delayedMod |= (uint16_t)(1u << (p * 4 + j)); else nd.delayedIn |= (1ull << j);
        Node& s = nodes_[src]; if (!s.hist && histUsed_ + 256 <= (int)histPool_.size()) { s.hist = &histPool_[histUsed_]; histUsed_ += 256; std::memset(s.hist, 0, sizeof(float) * 256); s.hpos = 0; }
        if (!s.hist) histOverflow_ = true; };
    auto visit = [&](int root) {
        if (state[root]) { return; }
        st[sp++] = {(int16_t)root, 0}; state[root] = 1;
        while (sp) {
            Fr& f = st[sp - 1]; const int u = f.node;
            if (f.k < want(u)) {
                bool isMod; int p = 0, j = 0; const int src = edgeSrc(u, f.k++, isMod, p, j); if (src < 0) continue;
                if (state[src] == 1) markDelayed(u, isMod, p, j, src);
                else if (state[src] == 0) { state[src] = 1; st[sp++] = {(int16_t)src, 0}; }
            } else { state[u] = 2; order_[cnt++] = (int16_t)u; --sp; }
        }
    };
    for (int k = 0; k < nOut_; ++k) visit(outs_[k]);
    for (int i = 0; i < N; ++i) if (!state[i] && (nodes_[i].type == N_OSC || nodes_[i].type == N_NOISE || nodes_[i].type == N_KS)) { /* unreachable sources: not rendered */ }
    // channel counts: sources mono, panners stereo, others follow their inputs
    for (int k = 0; k < cnt; ++k) { Node& nd = nodes_[order_[k]]; if (nd.type == N_PAN) { nd.ch = 2; continue; }
        if (nd.nIn) { int c = 1; for (int j = 0; j < nd.nIn; ++j) c = std::max<int>(c, nodes_[nd.in[j]].ch); nd.ch = (uint8_t)c; } }
    for (int k = 0; k < cnt; ++k) { Node& nd = nodes_[order_[k]]; if (nd.type != N_PAN) continue;
        nd.srcSt = false; for (int j = 0; j < nd.nIn; ++j) nd.srcSt |= nodes_[nd.in[j]].ch == 2; }
    n_ = cnt; end_ = endTime; active_ = true;
}

// ---------------------------------------------------------------- processing
// Node by node over a block (at most 128 frames), each node running its own tight loop. Every frame is computed
// with exactly the same arithmetic in the same order as frame-by-frame rendering, so the output is bit-identical;
// the speed comes from the switch, the parameter lookups and the trig/exp being hoisted out of the per-frame work.
// Cycle edges read the source's history 128 frames back, which is why a block may not be longer than 128 frames.

// Parameter value for frame r of the block (per-frame automation plus modulation inputs).
inline float Graph::paramAt(Node& nd, int p, double t, int r, int self) {
    float v = nd.p[p].valueAt(t);
    for (int k = 0; k < nd.nMod[p]; ++k) { const int si = nd.mod[p][k]; const bool d = (nd.delayedMod >> (p * 4 + k)) & 1u; const Node& m = nodes_[si];
        v += m.ch == 2 ? 0.5f * (srcAt(si, 0, d, r, self) + srcAt(si, 1, d, r, self)) : srcAt(si, 0, d, r, self); }
    return v;
}

void Graph::processBlock(Node& nd, int self, double now, double dt, int i0, int n) {
    const bool st = nd.ch == 2;
    float* o0 = nd.ob; float* o1 = nd.ob + kBlock;
    // parameters without modulation whose timeline holds one value over the whole block: evaluate once
    bool cst[4]; float cv[4];
    const double tFirst = now + i0 * dt, tLast = now + (i0 + n - 1) * dt;
    for (int p = 0; p < 4; ++p) cst[p] = nd.nMod[p] == 0 && nd.p[p].constantOver(tFirst, tLast, cv[p]);
    auto P = [&](int p, double t, int r) { return cst[p] ? cv[p] : paramAt(nd, p, t, r, self); };
    // inputs without cycle edges: sum them for the whole block up front (same order of additions per frame; a mono
    // source's right channel holds a copy of its left, which is what frame-by-frame rendering read for it)
    float ia[kBlock], ib[kBlock]; const bool fastIn = nd.delayedIn == 0;
    if (fastIn && nd.nIn) {
        for (int r = 0; r < n; ++r) { ia[r] = 0; ib[r] = 0; }
        for (int k = 0; k < nd.nIn; ++k) { const float* sa = nodes_[nd.in[k]].ob; const float* sb = sa + kBlock; for (int r = 0; r < n; ++r) { ia[r] += sa[r]; ib[r] += sb[r]; } }
    }
    auto gather = [&](int r, float& a, float& b) {
        if (fastIn) { if (nd.nIn) { a = ia[r]; b = ib[r]; } else { a = 0; b = 0; } return; }
        a = 0; b = 0;
        for (int k = 0; k < nd.nIn; ++k) { const int si = nd.in[k]; const bool d = (nd.delayedIn >> k) & 1ull; const Node& s = nodes_[si];
            a += srcAt(si, 0, d, r, self); b += s.ch == 2 ? srcAt(si, 1, d, r, self) : srcAt(si, 0, d, r, self); }
    };
    auto finish = [&](int r) {
        if (!st) o1[r] = o0[r];
        if (nd.hist) { nd.hist[nd.hpos] = o0[r]; nd.hist[128 + nd.hpos] = o1[r]; nd.hpos = (nd.hpos + 1) & 127; }
    };
    switch (nd.type) {
    case N_OSC:
        if (!nd.arpN && tFirst >= nd.start && tLast < nd.stop && tFirst >= nd.qEnd && cst[0] && cst[1]) {
            // running for the whole block at a steady pitch
            if (cv[0] != nd.mF0 || cv[1] != nd.mDet) {
                nd.mF0 = cv[0]; nd.mDet = cv[1]; const float f = cv[0] * std::exp2(cv[1] * (1.f / 1200.f));
                nd.mInc = f / sr_; nd.mLvl = nd.wv ? nd.wv->level(std::fabs(nd.mInc)) : 0;
            }
            const float inc = nd.mInc; float ph = nd.phase;
            if (nd.wv) for (int r = 0; r < n; ++r) { o0[r] = nd.wv->readLevel(ph, nd.mLvl); ph += inc; ph -= std::floor(ph); }
            else for (int r = 0; r < n; ++r) { o0[r] = std::sin(kTwoPi * ph); ph += inc; ph -= std::floor(ph); }
            nd.phase = ph;
            for (int r = 0; r < n; ++r) finish(r);
            break;
        }
        for (int r = 0; r < n; ++r) {
            const double t = now + (i0 + r) * dt;
            if (t < nd.start || t >= nd.stop) { o0[r] = 0; finish(r); continue; }
            float f0;
            if (nd.arpN) { double tt = std::min(t, nd.arpEnd); long k = (long)std::floor((tt - nd.arpT0) / nd.arpStep + 1e-9); if (nd.arpN == 1 || k < 0) k = 0;
                           f0 = mtof(nd.arpBase + nd.arp[k % nd.arpN]); for (int m = 0; m < nd.nMod[0]; ++m) f0 += srcAt(nd.mod[0][m], 0, (nd.delayedMod >> m) & 1u, r, self); }
            else if (t < nd.qEnd) f0 = nd.p[0].valueAt(nd.qStart);
            else f0 = P(0, t, r);
            const float det = t < nd.qEnd ? nd.p[1].valueAt(nd.qStart) : P(1, t, r);
            if (f0 != nd.mF0 || det != nd.mDet) {
                nd.mF0 = f0; nd.mDet = det; const float f = f0 * std::exp2(det * (1.f / 1200.f));
                nd.mInc = f / sr_; nd.mLvl = nd.wv ? nd.wv->level(std::fabs(nd.mInc)) : 0;
            }
            const float inc = nd.mInc;
            o0[r] = !nd.wv ? std::sin(kTwoPi * nd.phase) : nd.wv->readLevel(nd.phase, nd.mLvl);
            nd.phase += inc; nd.phase -= std::floor(nd.phase);
            finish(r);
        }
        break;
    case N_GAIN:
        if (fastIn && cst[0]) {
            const float g = cv[0];
            if (nd.nIn) for (int r = 0; r < n; ++r) { o0[r] = ia[r] * g; o1[r] = ib[r] * g; }
            else for (int r = 0; r < n; ++r) { o0[r] = 0.f * g; o1[r] = 0.f * g; }
            for (int r = 0; r < n; ++r) finish(r);
            break;
        }
        for (int r = 0; r < n; ++r) {
            const double t = now + (i0 + r) * dt; float a, b; gather(r, a, b);
            const float g = P(0, t, r); o0[r] = a * g; o1[r] = b * g; finish(r);
        }
        break;
    case N_BIQUAD:
        for (int r = 0; r < n; ++r) {
            const double t = now + (i0 + r) * dt; float in[2]; gather(r, in[0], in[1]);
            const float bdet = P(2, t, r);
            if (bdet != nd.mDet) { nd.mDet = bdet; nd.mFac = std::exp2(bdet * (1.f / 1200.f)); }
            float f = P(0, t, r) * nd.mFac; const float q = nd.qLive >= 0.f ? nd.qLive : P(1, t, r), gdb = P(3, t, r);
            f = clampf(f, 0.f, sr_ * 0.5f);
            if (f != nd.lastF || q != nd.lastQ || gdb != nd.lastG) {
                nd.lastF = f; nd.lastQ = q; nd.lastG = gdb;
                const float w = kTwoPi * std::max(f, 1e-3f) / sr_, cs = std::cos(w), sn = std::sin(w); float b0, b1, b2, a0, a1, a2;
                if (f >= sr_ * 0.5f - 1e-3f && nd.sub == BQ_LP) { b0 = 1; b1 = b2 = a1 = a2 = 0; a0 = 1; }
                else if (nd.sub == BQ_LP || nd.sub == BQ_HP) {
                    const float al = sn / (2.f * std::pow(10.f, q / 20.f)); a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
                    if (nd.sub == BQ_LP) { b0 = (1 - cs) * .5f; b1 = 1 - cs; b2 = b0; } else { b0 = (1 + cs) * .5f; b1 = -(1 + cs); b2 = b0; }
                } else if (nd.sub == BQ_BP) { const float al = sn / (2.f * std::max(q, 1e-4f)); b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
                else { const float A = std::pow(10.f, gdb / 40.f), al = sn / 2.f * std::sqrt(2.f), sa = 2 * std::sqrt(A) * al;
                    b0 = A * ((A + 1) + (A - 1) * cs + sa); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - sa);
                    a0 = (A + 1) - (A - 1) * cs + sa; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - sa; }
                nd.co[0] = b0 / a0; nd.co[1] = b1 / a0; nd.co[2] = b2 / a0; nd.co[3] = a1 / a0; nd.co[4] = a2 / a0;
            }
            for (int c = 0; c < (st ? 2 : 1); ++c) { const float x = in[c], y = nd.co[0] * x + nd.z[c][0]; nd.z[c][0] = nd.co[1] * x - nd.co[3] * y + nd.z[c][1]; nd.z[c][1] = nd.co[2] * x - nd.co[4] * y; (c ? o1 : o0)[r] = y; }
            finish(r);
        }
        break;
    case N_SHAPER: {
        auto curve = [&](float u) {
            u = clampf(u, -1.f, 1.f);
            if (nd.sub == C_DIST) return u >= 0 ? std::tanh(nd.k1 * u) * nd.k1n : std::tanh(nd.k2 * u) * nd.k2n;
            if (nd.sub == C_DRIVE) return std::tanh(nd.k1 * u) * nd.k1n;
            // crushCurve: 2048-point staircase, linearly interpolated by the WaveShaper
            const float pos = (u + 1.f) * 0.5f * 2047.f; const int i0c = (int)pos; const float fr = pos - i0c;
            auto cvv = [&](int i) { const float x = i / 2047.f * 2.f - 1.f; return std::round(x * nd.k1) / nd.k1; };
            return i0c >= 2047 ? cvv(2047) : cvv(i0c) + (cvv(i0c + 1) - cvv(i0c)) * fr;
        };
        for (int r = 0; r < n; ++r) {
            float in[2]; gather(r, in[0], in[1]);
            for (int c = 0; c < (st ? 2 : 1); ++c) {
                float y;
                if (nd.os == 1) y = curve(in[c]);
                else if (nd.os == 2) { const float mid = .5f * (nd.up[c] + in[c]); nd.up[c] = in[c]; y = nd.dec[c][0] ? nd.dec[c][0]->process(curve(mid), curve(in[c])) : curve(in[c]); }
                else { // 4x: two linear-interpolated stages, two half-band decimators
                    const float p0 = nd.up[c], p1 = in[c]; nd.up[c] = in[c];
                    const float a = curve(p0 + (p1 - p0) * .25f), b = curve(p0 + (p1 - p0) * .5f), cc = curve(p0 + (p1 - p0) * .75f), d = curve(p1);
                    const float h1 = nd.dec[c][0] ? nd.dec[c][0]->process(a, b) : b, h2 = nd.dec[c][0] ? nd.dec[c][0]->process(cc, d) : d;
                    y = nd.dec[c][1] ? nd.dec[c][1]->process(h1, h2) : h2;
                }
                if (nd.lbuf && nd.lat > 0) { float* lb = nd.lbuf + c * 256; const float o = lb[nd.li]; lb[nd.li] = y; y = o; }
                (c ? o1 : o0)[r] = y;
            }
            if (nd.lbuf && nd.lat > 0) nd.li = nd.li + 1 >= nd.lat ? 0 : nd.li + 1;
            finish(r);
        }
        break; }
    case N_DELAY:
        for (int r = 0; r < n; ++r) {
            const double t = now + (i0 + r) * dt; float in[2]; gather(r, in[0], in[1]);
            if (!nd.dl) { o0[r] = in[0]; o1[r] = in[1]; finish(r); continue; }
            const float dsec = std::max(0.f, P(0, t, r)); const float d = clampf(dsec * sr_, 0.f, (float)nd.dlSize - 2.f);
            for (int c = 0; c < (st ? 2 : 1); ++c) {
                float* b = nd.dl + c * nd.dlSize; b[nd.dlW] = in[c];
                float rp = (float)nd.dlW - d; if (rp < 0) rp += nd.dlSize; const int j0 = (int)rp; const float fr = rp - j0; const int j1 = (j0 + 1) % nd.dlSize;
                (c ? o1 : o0)[r] = b[j0] + (b[j1] - b[j0]) * fr;   // Web Audio DelayNode: linear interpolation
            }
            nd.dlW = (nd.dlW + 1) % nd.dlSize; finish(r);
        }
        break;
    case N_CONST:
        for (int r = 0; r < n; ++r) { const double t = now + (i0 + r) * dt; o0[r] = (t < nd.start || t >= nd.stop) ? 0.f : P(0, t, r); finish(r); }
        break;
    case N_SH:
        for (int r = 0; r < n; ++r) {
            const double t = now + (i0 + r) * dt;
            if (t < nd.start || t >= nd.stop) { o0[r] = 0; finish(r); continue; }
            if (nd.shLeft <= 0) { nd.rng ^= nd.rng << 13; nd.rng ^= nd.rng >> 17; nd.rng ^= nd.rng << 5; nd.shv = (float)(int32_t)nd.rng / 2147483648.f; nd.shLeft += 1.f; }
            nd.shLeft -= nd.rate / sr_; o0[r] = nd.shv; finish(r);
        }
        break;
    case N_NOISE:
        for (int r = 0; r < n; ++r) {
            const double t = now + (i0 + r) * dt;
            if (t < nd.start || t >= nd.stop) { o0[r] = 0; finish(r); continue; }
            o0[r] = nd.buf[(int)nd.bufPos]; nd.bufPos += 1; if (nd.bufPos >= nd.bufLen) nd.bufPos -= nd.bufLen; finish(r);
        }
        break;
    case N_PAN:
        for (int r = 0; r < n; ++r) {
            const double t = now + (i0 + r) * dt; float a, b; gather(r, a, b);
            const float p = clampf(P(0, t, r), -1.f, 1.f);
            if (p != nd.mPan) { nd.mPan = p; const float x = !nd.srcSt ? (p + 1) * .5f : (p <= 0 ? p + 1 : p); nd.mGl = std::cos(x * kPi * .5f); nd.mGr = std::sin(x * kPi * .5f); }
            if (!nd.srcSt) { o0[r] = a * nd.mGl; o1[r] = a * nd.mGr; }
            else if (p <= 0) { o0[r] = a + b * nd.mGl; o1[r] = b * nd.mGr; } else { o0[r] = a * nd.mGl; o1[r] = b + a * nd.mGr; }
            finish(r);
        }
        break;
    case N_KS:
        for (int r = 0; r < n; ++r) {
            const double t = now + (i0 + r) * dt;
            if (t < nd.start || !nd.ringN || nd.pos >= nd.len) { o0[r] = 0; finish(r); continue; }
            // playbackRate resampling of the generated string (rate 1 = sample by sample)
            const float rate = std::max(0.01f, P(0, t, r));
            nd.ksFrac += rate;
            while (nd.ksFrac >= 1.f) {
                nd.ksFrac -= 1.f; nd.ksPrev = nd.ksCur;
                const int nx = nd.idx + 1 == nd.ringN ? 0 : nd.idx + 1; const float s0 = nd.ring[nd.idx];
                float v = s0 * nd.norm; const long left = nd.len - 1 - nd.pos; if (left < (long)nd.fadeN) v *= (float)left / nd.fadeN;
                nd.ksCur = v; nd.ring[nd.idx] = (s0 + nd.ring[nx]) * .5f * nd.fb; nd.idx = nx; ++nd.pos;
            }
            o0[r] = nd.ksPrev + (nd.ksCur - nd.ksPrev) * nd.ksFrac; finish(r);
        }
        break;
    }
    nd.out[0] = o0[n - 1]; nd.out[1] = o1[n - 1];
}

void Graph::render(double now, double dt, int i0, int i1, float* accL, float* accR, float* scratch) {
    if (!active_) return;
    int iEnd = i0; while (iEnd < i1 && !(now + iEnd * dt >= end_)) ++iEnd;   // the graph ends at the first frame t >= end
    const int n = iEnd - i0;
    if (n > 0) {
        for (int k = 0; k < n_; ++k) { const int idx = order_[k]; nodes_[idx].ob = scratch + idx * 2 * kBlock; }
        for (int k = 0; k < n_; ++k) { const int idx = order_[k]; processBlock(nodes_[idx], idx, now, dt, i0, n); }
        const bool m = !master_.empty();
        for (int r = 0; r < n; ++r) {
            float gl = 0, gr = 0;
            for (int k = 0; k < nOut_; ++k) { const Node& o = nodes_[outs_[k]]; gl += o.ob[r]; gr += o.ob[kBlock + r]; }
            if (m) { const float mv = master_.valueAt(now + (i0 + r) * dt); gl *= mv; gr *= mv; }
            accL[r] += gl; accR[r] += gr;
        }
    }
    if (iEnd < i1) active_ = false;
}

} // namespace blonda::wg
