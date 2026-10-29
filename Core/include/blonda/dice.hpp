// BLONDA SEQ — the musical dice ("tärning"), ported from the web version: every throw picks a coherent style and a
// chord progression in A minor, and every part follows it. 1 = small variation, 2 = new feel, 3 = new drum groove,
// 4 = new groove + bass + melody, 5 = everything new, 6 = new world (also new instruments and polymeter perc).
// UI-thread only (allocates).
#pragma once
#include "seq3.hpp"
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <string>
#include <vector>

namespace blonda {

struct DiceStyle {
    const char* name; float sw;
    std::vector<const char*> K, S, C, H, O, P;
    std::vector<const char*> B;            // empty + bassMode
    int bassMode;                          // 0 = patterns, 1 = follow kick, 2 = octaves
    std::vector<const char*> KY, L;
    float pad, bassOct; bool bassLong;
    std::vector<std::pair<int, int>> prog; // empty = use the global list
    std::vector<const char*> eng[4];       // bass keys lead pad
};

class Dice {
public:
    explicit Dice(uint32_t seed) : x_(seed ? seed : 0x9E3779B9u) {}
    std::string message;

    // returns the style index used (kept by the caller between throws)
    int apply(Project& P, int n, int& styleIdx, std::pair<int, int>& prog) {
        const auto& S = styles();
        if (styleIdx < 0 || styleIdx >= (int)S.size()) { styleIdx = (int)(rnd() * S.size()); prog = pick(progs()); }
        const int pi = P.pat;
        auto full = [&] { genDrums(P, pi, styleIdx); genBass(P, pi, styleIdx, prog); genKeys(P, pi, styleIdx, prog); genLead(P, pi, styleIdx, prog, n); genPad(P, pi, styleIdx, prog); };
        if (n == 1) { varyDrums(P, pi, 1 + (int)(rnd() * 2)); varyMel(P, pi, prog, styleIdx, 1); message = "liten variation"; }
        else if (n == 2) { feel(P, pi); varyDrums(P, pi, 1); message = "ny känsla · dynamik och fill"; }
        else if (n == 3) { genDrums(P, pi, styleIdx); if (S[styleIdx].bassMode == 1) genBass(P, pi, styleIdx, prog); message = std::string("nytt trumgroove · ") + S[styleIdx].name; }
        else if (n == 4) { genDrums(P, pi, styleIdx); genBass(P, pi, styleIdx, prog); genLead(P, pi, styleIdx, prog, n); message = "nytt groove · ny bas och melodi · " + chordName(prog); }
        else {
            const int old = styleIdx; int st;
            do { st = (int)(rnd() * S.size()); } while (st == old && rnd() < .8f);
            styleIdx = st; prog = S[st].prog.empty() ? pick(progs()) : pick(S[st].prog);
            full(); P.master.swing = S[st].sw;
            if (n == 5) message = std::string("allt nytt · ") + S[st].name + " · " + chordName(prog);
            else {
                for (int k = 0; k < 4; ++k) if (!S[st].eng[k].empty()) P.inst[k] = pick(S[st].eng[k]);
                for (int t = 0; t < kTracks; ++t) P.len[t] = (t == T_PERC && rnd() < .35f) ? (rnd() < .5f ? 12 : 6) : 16;
                message = std::string("ny värld · ") + S[st].name + " · " + chordName(prog) + " · nya ljud";
            }
        }
        return styleIdx;
    }

    static const std::vector<DiceStyle>& styles() {
        static const std::vector<DiceStyle> S = {
            {"house", .08f, {"X...X...X...X..."}, {"", "", "............g..."}, {"....X.......X...", "....X.......X..g"},
             {"g.g.g.g.g.g.g.g.", "gggggggggggggggg", ".g.g.g.g.g.g.g.g"}, {"..x...x...x...x."}, {"", "......g.......g.", "...g......g..g..", ".......g...g...."},
             {"..x...x...x...x.", "..x..xx...x..xx.", "..x.x.x...x.x.x.", "x.x...x.x.x...x."}, 0,
             {"...x-.....x-....", "..x...x...x...x.", "...x-..x-.....x.", "x--.......x-...."}, {"x.x..x..", "..x.x.x.", "x..x..x.", ".x.x..x.", "x..x.x.."},
             .8f, .2f, false, {}, {{"analog", "sub", "mini", "bris"}, {"analog", "fm", "pluck", "bris"}, {"pluck", "fm", "bris", "chip"}, {"super", "bris"}}},
            {"techno", .03f, {"X...X...X...X..."}, {""}, {"", "....x.......x..."},
             {"ggxgggxgggxgggxg", "g.x.g.x.g.x.g.x.", "gogggogggogggogg"}, {"..x...x...x...x.", "..o...o...o...o."}, {"g..g..g..g..g..g", "..g..g....g..g..", "", ".g.....g.g......"},
             {".xxx.xxx.xxx.xxx", "..x...x...x...x.", "..xx..xx..xx..x."}, 0,
             {"..x.............", "..........x.....", "...x.......x....", "..x....x..x....."}, {"x.......", "x..x....", "..x..x.."},
             .35f, .1f, false, {{0, 0}, {0, 5}, {0, 8}, {0, 10}}, {{"acid", "sh101", "analog"}, {"fm", "pluck", "chip"}, {"sh101", "fm", "acid"}, {"super", "bris"}}},
            {"boom bap", .32f, {"X......x..X.....", "X.........X..x..", "X..x......X.....", "X......x.xX....."}, {"....X.......X...", "....X..g....X..g", "....X.......X.g."}, {"", "", "....x.......x..."},
             {"X.o.x.o.X.o.x.o.", "x.x.x.x.x.x.x.xg", "X.x.x.x.X.x.x.x."}, {"", "", "..............x."}, {"", "...g.......g....", ".......g......g."},
             {}, 1, {"x-----..x-----..", "x--.....x--.....", "x-------x-------"}, {"x...x.x.", "..x...x.", "x.x.....", "...x.x.."},
             .4f, .1f, false, {}, {{"sub", "mini", "analog"}, {"analog", "fm", "bris"}, {"pluck", "mini", "fm"}, {"super", "bris"}}},
            {"electro", .05f, {"X.....x...X.....", "X..x..x...X..x..", "X.....x.x.....x."}, {"....X.......X..."}, {"", "....x.......x..."},
             {"xgxgxgxgxgxgxgxg", "x.x.x.x.x.x.x.x."}, {""}, {"..g...g.g.....g.", "...x......x.....", ""},
             {"x..x..x...x..x..", "x..x..x.x..x..x.", "x.....x...x.x..."}, 0,
             {"x..x..x.........", "..x.......x..x..", "........x..x..x."}, {"x.x.x...", "x..x..x.", "..x.x.x."},
             .5f, .45f, false, {}, {{"sh101", "mini", "fm"}, {"fm", "chip", "analog"}, {"sh101", "chip", "mini"}, {"super", "bris"}}},
            {"halftime", .1f, {"X.........X.....", "X......x..x.....", "X..x......x..x.."}, {""}, {"........X......."},
             {"x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.xxxx", "x.xxx.x.x.x.x.x."}, {"", "..............x."}, {"", "......g.......g."},
             {}, 1, {"x-------........", "", "x-------x-------"}, {"x...x...", "x.x...x.", "..x....."},
             .7f, 0.f, true, {}, {{"sub"}, {"bris", "fm", "pluck"}, {"pluck", "bris", "chip"}, {"super", "bris"}}},
            {"disco", .1f, {"X...X...X...X..."}, {"....x.......x..."}, {"", "....x.......x..."},
             {"gogogogogogogogo", "g.g.g.g.g.g.g.g."}, {"..x...x...x...x."}, {"", "..g...g...g...g.", "...g..g....g..g."},
             {}, 2, {"..x...x...x...x.", "..x-..x-..x-..x-", "x.x...x.x.x...x."}, {"x.x..x..", "..x.x.x.", "x..x.x.x"},
             .6f, 1.f, false, {}, {{"analog", "mini", "sh101", "fm"}, {"analog", "fm", "pluck"}, {"pluck", "chip", "fm"}, {"super", "bris"}}},
            {"breakbeat", .14f, {"X.x.......x.....", "X.........x..x..", "X.x....x..x....."}, {"....X..g.g..X..g", "....X.......X.g.", "....X..g....X..."}, {""},
             {"x.x.x.x.x.x.x.x.", "xgxgxgxgxgxgxgxg"}, {"", "......x.......x."}, {"", "...g......g....."},
             {"x.x.......x.....", "x.........x..x..", "x.....x...x....."}, 0,
             {"x-------........", "x--.....x--.....", "..x.......x....."}, {"x.x..x..", "..x..x.x", "x...x.x."},
             .6f, .15f, false, {}, {{"sub", "analog", "mini"}, {"analog", "bris", "fm"}, {"pluck", "bris", "mini"}, {"super", "bris"}}},
        };
        return S;
    }

private:
    uint32_t x_;
    float rnd() { x_ ^= x_ << 13; x_ ^= x_ >> 17; x_ ^= x_ << 5; return (x_ & 0xFFFFFF) / 16777216.f; }
    bool chance(float p) { return rnd() < p; }
    template <class T> T pick(const std::vector<T>& v) { return v[std::min(v.size() - 1, (size_t)(rnd() * v.size()))]; }
    static const std::vector<std::pair<int, int>>& progs() {
        static const std::vector<std::pair<int, int>> p = {{0, 8}, {0, 5}, {0, 10}, {0, 3}, {8, 10}, {0, 0}, {5, 0}, {8, 7}, {0, 7}, {3, 10}, {8, 0}, {5, 10}};
        return p;
    }
    static const char* chName(int d) { switch (d) { case 0: return "Am"; case 3: return "C"; case 5: return "Dm"; case 7: return "Em"; case 8: return "F"; case 10: return "G"; } return "?"; }
    static std::string chordName(std::pair<int, int> p) { return p.first == p.second ? chName(p.first) : std::string(chName(p.first)) + " – " + chName(p.second); }
    static const std::vector<int>& scale() {
        static std::vector<int> s; if (s.empty()) { const int st[7] = {0, 2, 3, 5, 7, 8, 10}; for (int o = 1; o < 7; ++o) for (int x : st) { int m = 9 + 12 * o + x; if (m >= 33 && m <= 81) s.push_back(m); } }
        return s;
    }
    static int scaleNear(int n, int k) {
        const auto& S = scale(); int i = -1;
        for (size_t j = 0; j < S.size(); ++j) if (S[j] == n) { i = (int)j; break; }
        if (i < 0) { i = (int)S.size() - 1; for (size_t j = 0; j < S.size(); ++j) if (S[j] >= n) { i = (int)j; break; } }
        return S[std::max(0, std::min((int)S.size() - 1, i + k))];
    }
    static int degIdx(int d) { const auto& S = scale(); for (size_t j = 0; j < S.size(); ++j) if (S[j] % 12 == (9 + d) % 12) return (int)j; return 0; }
    static int nearestTone(int n, int d, int lo = 55, int hi = 84) {
        const auto& S = scale(); const int i = degIdx(d); const int pcs[3] = {S[i] % 12, S[i + 2] % 12, S[i + 4] % 12};
        int best = n, bd = 99;
        for (int m : S) { if (m < lo || m > hi || (m % 12 != pcs[0] && m % 12 != pcs[1] && m % 12 != pcs[2])) continue; const int dd = std::abs(m - n); if (dd < bd) { bd = dd; best = m; } }
        return best;
    }
    static int chAt(std::pair<int, int> p, int s) { return s < 8 ? p.first : p.second; }
    static void clr(Cell& c) { c = Cell{}; }
    static void put(Cell* row, const char* str) {
        if (!str) return;
        for (int s = 0; s < 16 && str[s]; ++s) { const char ch = str[s]; if (ch == '.' || ch == '-') continue;
            row[s].v = ch == 'X' ? 2 : 1; if (ch == 'g') row[s].vel = .32f; else if (ch == 'o') row[s].vel = .58f; }
    }
    static void syncCells(Project& P, int pi, int k) {   // melodic step cells follow the roll
        Cell* row = P.cells[pi][6 + k];
        for (int s = 0; s < 16; ++s) { row[s].v = 0; row[s].r = 1; row[s].p = 1; row[s].vel = -1; }
        for (const auto& n : P.roll[pi][k]) { const int s = (int)std::floor(n.s + 1e-4f); if (s >= 0 && s < 16) { row[s].v = std::max(row[s].v, n.v >= .95f ? 2 : 1); row[s].n = n.n; } }
    }
    static RollNote note(float s, float l, int n, float v) { RollNote r; r.s = s; r.l = l; r.n = n; r.v = v; r.id = -1; r.g = -1; return r; }

    void genDrums(Project& P, int pi, int st) {
        const auto& D = styles()[st];
        for (int t = 0; t < 6; ++t) for (auto& c : P.cells[pi][t]) clr(c);
        put(P.cells[pi][T_KICK], pick(D.K)); put(P.cells[pi][T_SNARE], pick(D.S)); put(P.cells[pi][T_CLAP], pick(D.C));
        const char* O = pick(D.O); const char* H = pick(D.H);
        put(P.cells[pi][T_HAT], H); put(P.cells[pi][T_OHAT], O);
        if (O) for (int s = 0; s < 16 && O[s]; ++s) if (O[s] != '.') clr(P.cells[pi][T_HAT][s]);
        put(P.cells[pi][T_PERC], pick(D.P));
        if (std::string(D.name) == "halftime") for (int s : {13, 14, 15}) { Cell& h = P.cells[pi][T_HAT][s]; if (h.v && chance(.35f)) h.r = chance(.5f) ? 2 : 3; }
    }
    void genBass(Project& P, int pi, int st, std::pair<int, int> prog) {
        const auto& D = styles()[st];
        std::string rh;
        if (D.bassMode == 1) { for (int s = 0; s < 16; ++s) rh += P.cells[pi][T_KICK][s].v ? 'x' : '.'; }
        else if (D.bassMode == 2) rh = "x.x.x.x.x.x.x.x.";
        else rh = pick(D.B);
        std::vector<int> on; for (int s = 0; s < 16 && s < (int)rh.size(); ++s) if (rh[s] == 'x') on.push_back(s);
        auto& R = P.roll[pi][0]; R.clear();
        const int lenMax = std::string(D.name) == "halftime" ? 8 : std::string(D.name) == "boom bap" ? 3 : 2;
        for (size_t k = 0; k < on.size(); ++k) {
            const int s = on[k], nx = k + 1 < on.size() ? on[k + 1] : 16;
            int n = 33 + chAt(prog, s);
            if (D.bassMode == 2) { if (k % 2) n += 12; }
            else if (s % 4 != 0 && chance(D.bassOct)) n += 12;
            else if (s % 4 != 0 && chance(.08f)) n = scaleNear(n, 4);
            int l = (D.bassLong || D.bassMode == 1) ? std::min(nx - s, lenMax) : std::min(nx - s, s % 4 == 0 ? 2 : 1);
            if (s < 8 && s + l > 8) l = 8 - s;
            R.push_back(note((float)s, (float)std::max(1, l), n, s % 4 == 0 ? 1.f : .72f));
        }
        syncCells(P, pi, 0);
    }
    void genKeys(Project& P, int pi, int st, std::pair<int, int> prog) {
        const auto& D = styles()[st]; const std::string p = pick(D.KY);
        static const int root[11] = {57, 0, 0, 57, 0, 62, 0, 57, 57, 0, 62};   // KEYS_ROOT by chord degree
        auto& R = P.roll[pi][1]; R.clear();
        for (int s = 0; s < 16 && s < (int)p.size(); ++s) if (p[s] == 'x') {
            int l = 1; while (s + l < 16 && s + l < (int)p.size() && p[s + l] == '-') ++l;
            const int c = chAt(prog, s);
            R.push_back(note((float)s, (float)l, P.chordKeys == 0 ? nearestTone(60, c, 55, 70) : root[c], (s == 0 || s == 8) ? 1.f : .72f));
        }
        syncCells(P, pi, 1);
    }
    void genPad(Project& P, int pi, int st, std::pair<int, int> prog) {
        const auto& D = styles()[st]; auto& R = P.roll[pi][3]; R.clear();
        if (chance(D.pad)) {
            if (prog.first == prog.second) R.push_back(note(0, 16, 45 + prog.first, .72f));
            else { R.push_back(note(0, 8, 45 + prog.first, .72f)); R.push_back(note(8, 8, 45 + prog.second, .72f)); }
        }
        syncCells(P, pi, 3);
    }
    void genLead(Project& P, int pi, int st, std::pair<int, int> prog, int lv) {
        const auto& D = styles()[st]; const std::string rh = pick(D.L);
        std::vector<int> on; for (int s = 0; s < 8 && s < (int)rh.size(); ++s) if (rh[s] == 'x') on.push_back(s);
        const int c1 = prog.first, c2 = prog.second;
        static const std::vector<int> starts = {64, 67, 69, 72}, moves = {-2, -1, -1, 1, 1, 2};
        int n = nearestTone(pick(starts), c1, 62, 76);
        struct SN { int s, n; }; std::vector<SN> A;
        for (size_t k = 0; k < on.size(); ++k) {
            const int s = on[k];
            if (k > 0) { n = scaleNear(n, pick(moves)); if (s % 4 == 0) n = nearestTone(n, c1, 60, 79); }
            n = std::max(60, std::min(79, n)); A.push_back({s, n});
        }
        const int mode = (int)(rnd() * 3);   // repeat / sequence / answer
        int shift = degIdx(c2) - degIdx(c1); while (shift > 3) shift -= 7; while (shift < -3) shift += 7;
        std::vector<SN> B;
        for (size_t k = 0; k < A.size(); ++k) {
            int m = mode == 1 ? scaleNear(A[k].n, shift) : mode == 2 ? scaleNear(A[A.size() - 1 - k].n, 0) : A[k].n;
            B.push_back({A[k].s + 8, std::max(60, std::min(79, m))});
        }
        if (!B.empty()) B.back().n = nearestTone(B.back().n, c2, 60, 79);
        if (mode == 2 && !B.empty()) B.front().n = nearestTone(B.front().n, c2, 60, 79);
        std::vector<SN> all = A; all.insert(all.end(), B.begin(), B.end());
        auto& R = P.roll[pi][2]; R.clear();
        const bool thin = lv <= 3 && chance(.3f);
        for (size_t k = 0; k < all.size(); ++k) {
            const int nx = k + 1 < all.size() ? all[k + 1].s : 16, end = all[k].s < 8 ? 8 : 16;
            int l = std::max(1, std::min(nx, end) - all[k].s); if (l > 3) l = chance(.5f) ? 2 : 3;
            if (thin && !(k % 2 == 0 || all[k].s % 4 == 0)) continue;
            R.push_back(note((float)all[k].s, (float)l, all[k].n, (k == 0 || all[k].s == 8) ? 1.f : .72f));
        }
        syncCells(P, pi, 2);
    }
    void varyDrums(Project& P, int pi, int n) {
        Cell *K = P.cells[pi][T_KICK], *Sn = P.cells[pi][T_SNARE], *H = P.cells[pi][T_HAT], *Pc = P.cells[pi][T_PERC], *O = P.cells[pi][T_OHAT];
        for (int k = 0; k < n; ++k) {
            switch ((int)(rnd() * 5)) {
                case 0: { const int s = pick(std::vector<int>{3, 7, 11, 15}); if (!Sn[s].v) { Sn[s].v = 1; Sn[s].vel = .3f; } break; }
                case 1: { const int s = pick(std::vector<int>{6, 7, 13, 14, 15}); if (!K[s].v) { K[s].v = 1; K[s].vel = .6f; } else if (s % 4) clr(K[s]); break; }
                case 2: { std::vector<int> hs; for (int s = 0; s < 16; ++s) if (H[s].v) hs.push_back(s);
                    if (!hs.empty()) { const int s = pick(hs); if (s >= 12) H[s].r = 2; else { clr(H[s]); const int t = s % 2 ? s - 1 : s + 1; if (!O[t].v) { H[t].v = 1; H[t].vel = .4f; } } } break; }
                case 3: { std::vector<int> ps; for (int s = 0; s < 16; ++s) if (Pc[s].v) ps.push_back(s);
                    if (!ps.empty() && chance(.5f)) clr(Pc[pick(ps)]); else { const int s = pick(std::vector<int>{3, 6, 9, 11, 14}); if (!Pc[s].v) { Pc[s].v = 1; Pc[s].vel = .45f; } } break; }
                default: { const int s = chance(.5f) ? 14 : 15; if (!O[s].v && !H[s].v) { O[s].v = 1; O[s].vel = .5f; } }
            }
        }
    }
    void varyMel(Project& P, int pi, std::pair<int, int> prog, int st, int n) {
        auto& L = P.roll[pi][2]; auto& B = P.roll[pi][0]; (void)st;
        static const std::vector<int> mv = {-1, 1, 2, -2};
        for (int k = 0; k < n; ++k) {
            if (!L.empty() && chance(.7f)) { auto& x = L[(size_t)(rnd() * L.size()) % L.size()]; x.n = scaleNear(x.n, pick(mv)); if ((int)x.s % 4 == 0) x.n = nearestTone(x.n, chAt(prog, (int)x.s), 60, 79); }
            else if (!B.empty()) { std::vector<size_t> off; for (size_t i = 0; i < B.size(); ++i) if ((int)B[i].s % 4 != 0) off.push_back(i);
                if (!off.empty()) { auto& x = B[pick(off)]; x.n += x.n < 45 ? 12 : -12; } }
        }
        syncCells(P, pi, 2); syncCells(P, pi, 0);
    }
    void feel(Project& P, int pi) {
        Cell *H = P.cells[pi][T_HAT], *Sn = P.cells[pi][T_SNARE];
        for (int s = 0; s < 16; ++s) if (H[s].v) { H[s].v = s % 4 == 0 ? 2 : 1; H[s].vel = s % 4 == 0 ? .95f : s % 2 == 0 ? .62f : .38f; }
        switch ((int)(rnd() * 4)) {
            case 0: { const float v[3] = {.3f, .45f, .65f}; int k = 0; for (int s : {13, 14, 15}) { if (!Sn[s].v) { Sn[s].v = 1; Sn[s].vel = v[k]; } ++k; } break; }
            case 1: if (H[15].v) H[15].r = 3; else { H[15].v = 1; H[15].r = 2; H[15].vel = .5f; } break;
            case 2: { Cell* O = P.cells[pi][T_OHAT]; if (!O[14].v) { O[14].v = 1; clr(H[14]); } break; }
            default: { const int s = chance(.5f) ? 7 : 15; if (!Sn[s].v) { Sn[s].v = 1; Sn[s].vel = .3f; } }
        }
        for (auto& b : P.roll[pi][0]) b.v = (int)b.s % 4 == 0 ? 1.f : .72f;
        syncCells(P, pi, 0);
    }
};

} // namespace blonda
