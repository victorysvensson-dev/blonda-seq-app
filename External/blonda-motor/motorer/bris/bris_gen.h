// GENERERAD FIL – ändra inte för hand.
// Källa: generator/bris.py
// Översatt med generator/genexpr2cpp.py från samma GenExpr som Max for Live-pluggen kör.
#pragma once
#include "blonda/gen_runtime.h"
#include <cstring>

namespace blonda::bris {

struct BrisDsp {
    static constexpr int kNumOutputs = 6;
    static constexpr int kNumGenParams = 58;
    double samplerate = 48000.0;
    gen::Noise rng;

    // Param (sätts utifrån)
    double vform = 0.0;
    double lfoosc = 0.0;
    double pw = 0.5;
    double sub = 0.0;
    double lfopwm = 0.0;
    double cut = 0.6;
    double res = 0.1;
    double eg1 = 0.35;
    double lfocut = 0.0;
    double kbd = 0.5;
    double lfoamp = 0.0;
    double kbda = 0.0;
    double vol = 0.7;
    double lwave = 0.0;
    double lrate = 0.45;
    double fa = 0.05;
    double fd = 0.45;
    double fs = 0.3;
    double fr = 0.4;
    double aa = 0.02;
    double ad = 0.45;
    double asus = 0.8;
    double ar = 0.4;
    double lage = 0.0;
    double porta = 0.0;
    double detune = 0.1;
    double uniint = 0.0;
    double chorus = 0.3;
    double dtime = 0.35;
    double dfb = 0.3;
    double dmix = 0.0;
    double velf = 0.3;
    double vela = 0.5;
    double mwosc = 0.6;
    double mwcut = 0.0;
    double bendr = 2.0;
    double hyll = 0.0;
    double bend = 0.0;
    double mw = 0.0;
    double at = 0.0;
    double n0 = 60.0;
    double g0 = 0.0;
    double t0 = 0.0;
    double n1 = 60.0;
    double g1 = 0.0;
    double t1 = 0.0;
    double n2 = 60.0;
    double g2 = 0.0;
    double t2 = 0.0;
    double n3 = 60.0;
    double g3 = 0.0;
    double t3 = 0.0;
    double n4 = 60.0;
    double g4 = 0.0;
    double t4 = 0.0;
    double n5 = 60.0;
    double g5 = 0.0;
    double t5 = 0.0;

    // History (tillstånd mellan sampel)
    double m_pk = 0.0;
    double m_lph = 0.0;
    double m_lsh = 0.0;
    double m_lsm = 0.0;
    double m_ci = 0.0;
    double m_cp0 = 0.0;
    double m_cp1 = 0.25;
    double m_cp2 = 0.5;
    double m_cp3 = 0.75;
    double m_dw = 0.0;
    double m_sDt = 0.3;
    double m_dlpL = 0.0;
    double m_dlpR = 0.0;
    double m_init = 0.0;
    double m_dcxL = 0.0;
    double m_dcyL = 0.0;
    double m_dcxR = 0.0;
    double m_dcyR = 0.0;
    double m_v0_lt = 0.0;
    double m_v0_s1 = 0.0;
    double m_v0_e1 = 0.0;
    double m_v0_s2 = 0.0;
    double m_v0_e2 = 0.0;
    double m_v0_vel = 0.0;
    double m_v0_pn = 60.0;
    double m_v0_ph = 0.0;
    double m_v0_p2 = 0.0;
    double m_v0_f_s1 = 0.0;
    double m_v0_f_s2 = 0.0;
    double m_v0_f_s3 = 0.0;
    double m_v0_f_s4 = 0.0;
    double m_v0_dp = 0.0;
    double m_v1_lt = 0.0;
    double m_v1_s1 = 0.0;
    double m_v1_e1 = 0.0;
    double m_v1_s2 = 0.0;
    double m_v1_e2 = 0.0;
    double m_v1_vel = 0.0;
    double m_v1_pn = 60.0;
    double m_v1_ph = 0.0;
    double m_v1_p2 = 0.0;
    double m_v1_f_s1 = 0.0;
    double m_v1_f_s2 = 0.0;
    double m_v1_f_s3 = 0.0;
    double m_v1_f_s4 = 0.0;
    double m_v1_dp = 0.173;
    double m_v2_lt = 0.0;
    double m_v2_s1 = 0.0;
    double m_v2_e1 = 0.0;
    double m_v2_s2 = 0.0;
    double m_v2_e2 = 0.0;
    double m_v2_vel = 0.0;
    double m_v2_pn = 60.0;
    double m_v2_ph = 0.0;
    double m_v2_p2 = 0.0;
    double m_v2_f_s1 = 0.0;
    double m_v2_f_s2 = 0.0;
    double m_v2_f_s3 = 0.0;
    double m_v2_f_s4 = 0.0;
    double m_v2_dp = 0.346;
    double m_v3_lt = 0.0;
    double m_v3_s1 = 0.0;
    double m_v3_e1 = 0.0;
    double m_v3_s2 = 0.0;
    double m_v3_e2 = 0.0;
    double m_v3_vel = 0.0;
    double m_v3_pn = 60.0;
    double m_v3_ph = 0.0;
    double m_v3_p2 = 0.0;
    double m_v3_f_s1 = 0.0;
    double m_v3_f_s2 = 0.0;
    double m_v3_f_s3 = 0.0;
    double m_v3_f_s4 = 0.0;
    double m_v3_dp = 0.519;
    double m_v4_lt = 0.0;
    double m_v4_s1 = 0.0;
    double m_v4_e1 = 0.0;
    double m_v4_s2 = 0.0;
    double m_v4_e2 = 0.0;
    double m_v4_vel = 0.0;
    double m_v4_pn = 60.0;
    double m_v4_ph = 0.0;
    double m_v4_p2 = 0.0;
    double m_v4_f_s1 = 0.0;
    double m_v4_f_s2 = 0.0;
    double m_v4_f_s3 = 0.0;
    double m_v4_f_s4 = 0.0;
    double m_v4_dp = 0.692;
    double m_v5_lt = 0.0;
    double m_v5_s1 = 0.0;
    double m_v5_e1 = 0.0;
    double m_v5_s2 = 0.0;
    double m_v5_e2 = 0.0;
    double m_v5_vel = 0.0;
    double m_v5_pn = 60.0;
    double m_v5_ph = 0.0;
    double m_v5_p2 = 0.0;
    double m_v5_f_s1 = 0.0;
    double m_v5_f_s2 = 0.0;
    double m_v5_f_s3 = 0.0;
    double m_v5_f_s4 = 0.0;
    double m_v5_dp = 0.865;

    // Data (minnesbuffertar)
    gen::Data chb{4096, 2};
    gen::Data dlb{52000, 2};

    // nollställ allt tillstånd (som när gen~ laddas)
    void reset() {
        m_pk = 0.0;
        m_lph = 0.0;
        m_lsh = 0.0;
        m_lsm = 0.0;
        m_ci = 0.0;
        m_cp0 = 0.0;
        m_cp1 = 0.25;
        m_cp2 = 0.5;
        m_cp3 = 0.75;
        m_dw = 0.0;
        m_sDt = 0.3;
        m_dlpL = 0.0;
        m_dlpR = 0.0;
        m_init = 0.0;
        m_dcxL = 0.0;
        m_dcyL = 0.0;
        m_dcxR = 0.0;
        m_dcyR = 0.0;
        m_v0_lt = 0.0;
        m_v0_s1 = 0.0;
        m_v0_e1 = 0.0;
        m_v0_s2 = 0.0;
        m_v0_e2 = 0.0;
        m_v0_vel = 0.0;
        m_v0_pn = 60.0;
        m_v0_ph = 0.0;
        m_v0_p2 = 0.0;
        m_v0_f_s1 = 0.0;
        m_v0_f_s2 = 0.0;
        m_v0_f_s3 = 0.0;
        m_v0_f_s4 = 0.0;
        m_v0_dp = 0.0;
        m_v1_lt = 0.0;
        m_v1_s1 = 0.0;
        m_v1_e1 = 0.0;
        m_v1_s2 = 0.0;
        m_v1_e2 = 0.0;
        m_v1_vel = 0.0;
        m_v1_pn = 60.0;
        m_v1_ph = 0.0;
        m_v1_p2 = 0.0;
        m_v1_f_s1 = 0.0;
        m_v1_f_s2 = 0.0;
        m_v1_f_s3 = 0.0;
        m_v1_f_s4 = 0.0;
        m_v1_dp = 0.173;
        m_v2_lt = 0.0;
        m_v2_s1 = 0.0;
        m_v2_e1 = 0.0;
        m_v2_s2 = 0.0;
        m_v2_e2 = 0.0;
        m_v2_vel = 0.0;
        m_v2_pn = 60.0;
        m_v2_ph = 0.0;
        m_v2_p2 = 0.0;
        m_v2_f_s1 = 0.0;
        m_v2_f_s2 = 0.0;
        m_v2_f_s3 = 0.0;
        m_v2_f_s4 = 0.0;
        m_v2_dp = 0.346;
        m_v3_lt = 0.0;
        m_v3_s1 = 0.0;
        m_v3_e1 = 0.0;
        m_v3_s2 = 0.0;
        m_v3_e2 = 0.0;
        m_v3_vel = 0.0;
        m_v3_pn = 60.0;
        m_v3_ph = 0.0;
        m_v3_p2 = 0.0;
        m_v3_f_s1 = 0.0;
        m_v3_f_s2 = 0.0;
        m_v3_f_s3 = 0.0;
        m_v3_f_s4 = 0.0;
        m_v3_dp = 0.519;
        m_v4_lt = 0.0;
        m_v4_s1 = 0.0;
        m_v4_e1 = 0.0;
        m_v4_s2 = 0.0;
        m_v4_e2 = 0.0;
        m_v4_vel = 0.0;
        m_v4_pn = 60.0;
        m_v4_ph = 0.0;
        m_v4_p2 = 0.0;
        m_v4_f_s1 = 0.0;
        m_v4_f_s2 = 0.0;
        m_v4_f_s3 = 0.0;
        m_v4_f_s4 = 0.0;
        m_v4_dp = 0.692;
        m_v5_lt = 0.0;
        m_v5_s1 = 0.0;
        m_v5_e1 = 0.0;
        m_v5_s2 = 0.0;
        m_v5_e2 = 0.0;
        m_v5_vel = 0.0;
        m_v5_pn = 60.0;
        m_v5_ph = 0.0;
        m_v5_p2 = 0.0;
        m_v5_f_s1 = 0.0;
        m_v5_f_s2 = 0.0;
        m_v5_f_s3 = 0.0;
        m_v5_f_s4 = 0.0;
        m_v5_dp = 0.865;
        chb.clear();
        dlb.clear();
        rng = gen::Noise();
    }

    // pekare till en Param via namn (nullptr om den inte finns)
    double* param(const char* name) {
        if (std::strcmp(name, "vform") == 0) return &vform;
        if (std::strcmp(name, "lfoosc") == 0) return &lfoosc;
        if (std::strcmp(name, "pw") == 0) return &pw;
        if (std::strcmp(name, "sub") == 0) return &sub;
        if (std::strcmp(name, "lfopwm") == 0) return &lfopwm;
        if (std::strcmp(name, "cut") == 0) return &cut;
        if (std::strcmp(name, "res") == 0) return &res;
        if (std::strcmp(name, "eg1") == 0) return &eg1;
        if (std::strcmp(name, "lfocut") == 0) return &lfocut;
        if (std::strcmp(name, "kbd") == 0) return &kbd;
        if (std::strcmp(name, "lfoamp") == 0) return &lfoamp;
        if (std::strcmp(name, "kbda") == 0) return &kbda;
        if (std::strcmp(name, "vol") == 0) return &vol;
        if (std::strcmp(name, "lwave") == 0) return &lwave;
        if (std::strcmp(name, "lrate") == 0) return &lrate;
        if (std::strcmp(name, "fa") == 0) return &fa;
        if (std::strcmp(name, "fd") == 0) return &fd;
        if (std::strcmp(name, "fs") == 0) return &fs;
        if (std::strcmp(name, "fr") == 0) return &fr;
        if (std::strcmp(name, "aa") == 0) return &aa;
        if (std::strcmp(name, "ad") == 0) return &ad;
        if (std::strcmp(name, "asus") == 0) return &asus;
        if (std::strcmp(name, "ar") == 0) return &ar;
        if (std::strcmp(name, "lage") == 0) return &lage;
        if (std::strcmp(name, "porta") == 0) return &porta;
        if (std::strcmp(name, "detune") == 0) return &detune;
        if (std::strcmp(name, "uniint") == 0) return &uniint;
        if (std::strcmp(name, "chorus") == 0) return &chorus;
        if (std::strcmp(name, "dtime") == 0) return &dtime;
        if (std::strcmp(name, "dfb") == 0) return &dfb;
        if (std::strcmp(name, "dmix") == 0) return &dmix;
        if (std::strcmp(name, "velf") == 0) return &velf;
        if (std::strcmp(name, "vela") == 0) return &vela;
        if (std::strcmp(name, "mwosc") == 0) return &mwosc;
        if (std::strcmp(name, "mwcut") == 0) return &mwcut;
        if (std::strcmp(name, "bendr") == 0) return &bendr;
        if (std::strcmp(name, "hyll") == 0) return &hyll;
        if (std::strcmp(name, "bend") == 0) return &bend;
        if (std::strcmp(name, "mw") == 0) return &mw;
        if (std::strcmp(name, "at") == 0) return &at;
        if (std::strcmp(name, "n0") == 0) return &n0;
        if (std::strcmp(name, "g0") == 0) return &g0;
        if (std::strcmp(name, "t0") == 0) return &t0;
        if (std::strcmp(name, "n1") == 0) return &n1;
        if (std::strcmp(name, "g1") == 0) return &g1;
        if (std::strcmp(name, "t1") == 0) return &t1;
        if (std::strcmp(name, "n2") == 0) return &n2;
        if (std::strcmp(name, "g2") == 0) return &g2;
        if (std::strcmp(name, "t2") == 0) return &t2;
        if (std::strcmp(name, "n3") == 0) return &n3;
        if (std::strcmp(name, "g3") == 0) return &g3;
        if (std::strcmp(name, "t3") == 0) return &t3;
        if (std::strcmp(name, "n4") == 0) return &n4;
        if (std::strcmp(name, "g4") == 0) return &g4;
        if (std::strcmp(name, "t4") == 0) return &t4;
        if (std::strcmp(name, "n5") == 0) return &n5;
        if (std::strcmp(name, "g5") == 0) return &g5;
        if (std::strcmp(name, "t5") == 0) return &t5;
        return nullptr;
    }

    // ett sampel; out får kNumOutputs värden
    inline void perform(double* out) {
        double f0 = 0.0, f1 = 0.0, f2 = 0.0, f3 = 0.0, m_aA = 0.0, m_aD = 0.0, m_aR = 0.0, m_ampm = 0.0;
        double m_b0 = 0.0, m_b1 = 0.0, m_b2 = 0.0, m_b3 = 0.0, m_bs = 0.0, m_cL = 0.0, m_cR = 0.0, m_cb = 0.0;
        double m_cd = 0.0, m_cg = 0.0, m_cutB = 0.0, m_dd = 0.0, m_dg = 0.0, m_dt = 0.0, m_dt2 = 0.0, m_fA = 0.0;
        double m_fD = 0.0, m_fR = 0.0, m_fbk = 0.0, m_fc = 0.0, m_flt = 0.0, m_fm = 0.0, m_fq = 0.0, m_gv = 0.0;
        double m_i0 = 0.0, m_i1 = 0.0, m_i2 = 0.0, m_i3 = 0.0, m_kk = 0.0, m_lG = 0.0, m_lG2 = 0.0, m_lG4 = 0.0;
        double m_lSg = 0.0, m_lb1 = 0.0, m_lb2 = 0.0, m_lb3 = 0.0, m_lb4 = 0.0, m_lfo = 0.0, m_lg = 0.0, m_lr = 0.0;
        double m_lraw = 0.0, m_lu = 0.0, m_lw = 0.0, m_ly1 = 0.0, m_ly2 = 0.0, m_ly3 = 0.0, m_ly4 = 0.0, m_ly4e = 0.0;
        double m_mask = 0.0, m_md = 0.0, m_me = 0.0, m_oL = 0.0, m_oR = 0.0, m_osc = 0.0, m_pn = 0.0, m_pul = 0.0;
        double m_pwm = 0.0, m_pwv = 0.0, m_q0 = 0.0, m_q1 = 0.0, m_q2 = 0.0, m_q3 = 0.0, m_r0 = 0.0, m_r1 = 0.0;
        double m_r2 = 0.0, m_r3 = 0.0, m_rd = 0.0, m_rf = 0.0, m_ri = 0.0, m_saw = 0.0, m_spread = 0.0, m_sq = 0.0;
        double m_sr = 0.0, m_sv = 0.0, m_tp0 = 0.0, m_tp1 = 0.0, m_tp2 = 0.0, m_tp3 = 0.0, m_ug = 0.0, m_vib = 0.0;
        double m_wL = 0.0, m_wR = 0.0, m_xL = 0.0, m_xR = 0.0;
        m_sr = samplerate;
        m_md = gen::clamp(std::floor(lage + 0.5), 0.0, 3.0);
        m_fA = 0.001 * std::pow(10000.0, fa);
        m_fD = (1.0 - std::exp(-1.0 / (m_sr * 0.0012 * std::pow(10000.0, fd))));
        m_fR = (1.0 - std::exp(-1.0 / (m_sr * 0.0012 * std::pow(10000.0, fr))));
        m_aA = 0.001 * std::pow(10000.0, aa);
        m_aD = (1.0 - std::exp(-1.0 / (m_sr * 0.0012 * std::pow(10000.0, ad))));
        m_aR = (1.0 - std::exp(-1.0 / (m_sr * 0.0012 * std::pow(10000.0, ar))));
        m_cg = porta > 0.001 ? 1.0 - std::exp(-1.0 / (m_sr * 0.0015 * std::pow(1300.0, porta))) : 1.0;
        m_lr = 0.1 * std::pow(1000.0, lrate);
        m_lph = m_lph + m_lr / m_sr;
        if (m_lph >= 1.0) { m_lph = m_lph - std::floor(m_lph); m_lsh = rng.next(); }
        m_lw = gen::clamp(std::floor(lwave + 0.5), 0.0, 4.0);
        m_lraw = m_lw == 0.0 ? 1.0 - 4.0 * std::fabs(m_lph - 0.5) : (m_lw == 1.0 ? 2.0 * m_lph - 1.0 : (m_lw == 2.0 ? 1.0 - 2.0 * m_lph : (m_lw == 3.0 ? (m_lph < 0.5 ? 1.0 : -1.0) : m_lsh)));
        m_lsm = m_lsm + (m_lraw - m_lsm) * (1.0 - std::exp(-1.0 / (m_sr * 0.0007)));
        m_lfo = m_lsm;
        m_vib = (lfoosc * lfoosc + (mw + at) * mwosc * 0.35) * 12.0 * m_lfo;
        m_pwm = m_lfo * lfopwm * 0.45;
        m_bs = bend * bendr;
        m_kk = res * res * 4.3;
        m_cutB = 20.0 * std::pow(1000.0, cut);
        m_spread = m_md == 0.0 ? 1.0 : (m_md == 3.0 ? 0.55 : 0.0);
        m_ug = m_md == 3.0 ? 0.42 : 1.0;
        m_xL = 0.0;
        m_xR = 0.0;
        m_mask = 0.0;
        m_me = 0.0;
        if (t0 != m_v0_lt) { m_v0_lt = t0; m_v0_s1 = 1.0; m_v0_s2 = 1.0; m_v0_vel = g0; }
        if (g0 <= 0.0 && m_v0_s2 > 0.0 && m_v0_s2 < 3.0) { m_v0_s1 = 3.0; m_v0_s2 = 3.0; }
        if (m_v0_s1 == 1.0) { m_v0_e1 = m_v0_e1 + 1.0 / (m_sr * m_fA); if (m_v0_e1 >= 1.0) { m_v0_e1 = 1.0; m_v0_s1 = 2.0; } }
        else if (m_v0_s1 == 2.0) { m_v0_e1 = m_v0_e1 + (fs - m_v0_e1) * m_fD; }
        else if (m_v0_s1 == 3.0) { m_v0_e1 = m_v0_e1 - m_v0_e1 * m_fR; }
        if (m_v0_s2 == 1.0) { m_v0_e2 = m_v0_e2 + 1.0 / (m_sr * m_aA); if (m_v0_e2 >= 1.0) { m_v0_e2 = 1.0; m_v0_s2 = 2.0; } }
        else if (m_v0_s2 == 2.0) { m_v0_e2 = m_v0_e2 + (asus - m_v0_e2) * m_aD; }
        else if (m_v0_s2 == 3.0) { m_v0_e2 = m_v0_e2 - m_v0_e2 * m_aR; if (m_v0_e2 < 0.0002) { m_v0_e2 = 0.0; m_v0_s2 = 0.0; } }
        if (m_v0_s2 > 0.0) {
          m_v0_pn = m_v0_pn + (n0 + detune * detune * 0.6 * -1.0 - m_v0_pn) * m_cg;
          m_v0_dp = gen::wrap(m_v0_dp + 0.070 / m_sr, 0.0, 1.0);
          m_pn = m_v0_pn + m_bs + m_vib + std::sin(gen::kTwoPi * m_v0_dp) * 0.045 + std::sin(gen::kTwoPi * m_v0_dp * 2.7) * 0.02;
          m_fq = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45);
          m_dt = m_fq / m_sr;
          m_v0_ph = m_v0_ph + m_dt;
          if (m_v0_ph >= 1.0) { m_v0_ph = m_v0_ph - 1.0; }
          m_v0_p2 = m_v0_p2 + m_dt * 0.5;
          if (m_v0_p2 >= 1.0) { m_v0_p2 = m_v0_p2 - 1.0; }
          m_q0 = m_v0_ph;
        m_b0 = m_q0 < m_dt ? (m_q0 / m_dt) * 2.0 - (m_q0 / m_dt) * (m_q0 / m_dt) - 1.0 : (m_q0 > 1.0 - m_dt ? ((m_q0 - 1.0) / m_dt) * ((m_q0 - 1.0) / m_dt) + ((m_q0 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_saw = 2.0 * m_q0 - 1.0 - m_b0;
          m_pwv = gen::clamp(pw * 0.96 + 0.02 + m_pwm, 0.02, 0.98);
          m_q1 = m_q0 + 1.0 - m_pwv;
          m_q1 = m_q1 - std::floor(m_q1);
        m_b1 = m_q1 < m_dt ? (m_q1 / m_dt) * 2.0 - (m_q1 / m_dt) * (m_q1 / m_dt) - 1.0 : (m_q1 > 1.0 - m_dt ? ((m_q1 - 1.0) / m_dt) * ((m_q1 - 1.0) / m_dt) + ((m_q1 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_pul = (m_q0 < m_pwv ? 1.0 : -1.0) + m_b0 - m_b1;
          m_q2 = m_v0_p2;
          m_dt2 = m_dt * 0.5;
        m_b2 = m_q2 < m_dt2 ? (m_q2 / m_dt2) * 2.0 - (m_q2 / m_dt2) * (m_q2 / m_dt2) - 1.0 : (m_q2 > 1.0 - m_dt2 ? ((m_q2 - 1.0) / m_dt2) * ((m_q2 - 1.0) / m_dt2) + ((m_q2 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_q3 = m_q2 + 0.5;
          m_q3 = m_q3 - std::floor(m_q3);
        m_b3 = m_q3 < m_dt2 ? (m_q3 / m_dt2) * 2.0 - (m_q3 / m_dt2) * (m_q3 / m_dt2) - 1.0 : (m_q3 > 1.0 - m_dt2 ? ((m_q3 - 1.0) / m_dt2) * ((m_q3 - 1.0) / m_dt2) + ((m_q3 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_sq = (m_q2 < 0.5 ? 1.0 : -1.0) + m_b2 - m_b3;
          m_osc = (vform < 0.5 ? m_saw : (vform < 1.5 ? m_pul : (m_saw + m_pul) * 0.62)) + m_sq * sub * 0.8;
          m_fm = m_v0_e1 * eg1 * (1.0 - velf + velf * m_v0_vel) * 7.0 + m_lfo * lfocut * 3.0 + (m_v0_pn - 60.0) / 12.0 * kbd + (mw + at) * mwcut * 4.0;
          m_fc = gen::clamp(m_cutB * 0.9700 * std::pow(2.0, m_fm), 18.0, m_sr * 0.42);
        m_lg = std::tan(gen::kPi * m_fc / m_sr);
        m_lG = m_lg / (1.0 + m_lg);
        m_lb1 = m_v0_f_s1 / (1.0 + m_lg);
        m_lb2 = m_v0_f_s2 / (1.0 + m_lg);
        m_lb3 = m_v0_f_s3 / (1.0 + m_lg);
        m_lb4 = m_v0_f_s4 / (1.0 + m_lg);
        m_lG2 = m_lG * m_lG;
        m_lG4 = m_lG2 * m_lG2;
        m_lSg = m_lG2 * m_lG * m_lb1 + m_lG2 * m_lb2 + m_lG * m_lb3 + m_lb4;
        m_ly4e = (m_lG4 * (m_osc * 0.5) + m_lSg) / (1.0 + (m_kk) * m_lG4);
        m_lu = std::tanh((m_osc * 0.5) - (m_kk) * m_ly4e);
        m_ly1 = m_lG * m_lu + m_lb1;
        m_v0_f_s1 = 2.0 * m_ly1 - m_v0_f_s1;
        m_ly2 = m_lG * m_ly1 + m_lb2;
        m_v0_f_s2 = 2.0 * m_ly2 - m_v0_f_s2;
        m_ly3 = m_lG * m_ly2 + m_lb3;
        m_v0_f_s3 = 2.0 * m_ly3 - m_v0_f_s3;
        m_ly4 = m_lG * m_ly3 + m_lb4;
        m_v0_f_s4 = 2.0 * m_ly4 - m_v0_f_s4;
        m_flt = m_ly4 * (1.0 + (m_kk) * 0.65);
          m_ampm = m_v0_e2 * (1.0 - vela + vela * m_v0_vel) * (1.0 - lfoamp * 0.5 * (1.0 - m_lfo)) * gen::clamp(std::pow(2.0, (m_v0_pn - 60.0) / 24.0 * kbda), 0.1, 4.0);
          m_sv = m_flt * m_ampm * m_ug;
          m_xL = m_xL + m_sv * (1.0 - m_spread * 0.0);
          m_xR = m_xR + m_sv * (1.0 - m_spread * 0.85);
          m_me = gen::max(m_me, m_v0_e2);
          m_mask = m_mask + 1.0;
        }
        if (t1 != m_v1_lt) { m_v1_lt = t1; m_v1_s1 = 1.0; m_v1_s2 = 1.0; m_v1_vel = g1; }
        if (g1 <= 0.0 && m_v1_s2 > 0.0 && m_v1_s2 < 3.0) { m_v1_s1 = 3.0; m_v1_s2 = 3.0; }
        if (m_v1_s1 == 1.0) { m_v1_e1 = m_v1_e1 + 1.0 / (m_sr * m_fA); if (m_v1_e1 >= 1.0) { m_v1_e1 = 1.0; m_v1_s1 = 2.0; } }
        else if (m_v1_s1 == 2.0) { m_v1_e1 = m_v1_e1 + (fs - m_v1_e1) * m_fD; }
        else if (m_v1_s1 == 3.0) { m_v1_e1 = m_v1_e1 - m_v1_e1 * m_fR; }
        if (m_v1_s2 == 1.0) { m_v1_e2 = m_v1_e2 + 1.0 / (m_sr * m_aA); if (m_v1_e2 >= 1.0) { m_v1_e2 = 1.0; m_v1_s2 = 2.0; } }
        else if (m_v1_s2 == 2.0) { m_v1_e2 = m_v1_e2 + (asus - m_v1_e2) * m_aD; }
        else if (m_v1_s2 == 3.0) { m_v1_e2 = m_v1_e2 - m_v1_e2 * m_aR; if (m_v1_e2 < 0.0002) { m_v1_e2 = 0.0; m_v1_s2 = 0.0; } }
        if (m_v1_s2 > 0.0) {
          m_v1_pn = m_v1_pn + (n1 + detune * detune * 0.6 * 1.0 - m_v1_pn) * m_cg;
          m_v1_dp = gen::wrap(m_v1_dp + 0.093 / m_sr, 0.0, 1.0);
          m_pn = m_v1_pn + m_bs + m_vib + std::sin(gen::kTwoPi * m_v1_dp) * 0.045 + std::sin(gen::kTwoPi * m_v1_dp * 2.7) * 0.02;
          m_fq = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45);
          m_dt = m_fq / m_sr;
          m_v1_ph = m_v1_ph + m_dt;
          if (m_v1_ph >= 1.0) { m_v1_ph = m_v1_ph - 1.0; }
          m_v1_p2 = m_v1_p2 + m_dt * 0.5;
          if (m_v1_p2 >= 1.0) { m_v1_p2 = m_v1_p2 - 1.0; }
          m_q0 = m_v1_ph;
        m_b0 = m_q0 < m_dt ? (m_q0 / m_dt) * 2.0 - (m_q0 / m_dt) * (m_q0 / m_dt) - 1.0 : (m_q0 > 1.0 - m_dt ? ((m_q0 - 1.0) / m_dt) * ((m_q0 - 1.0) / m_dt) + ((m_q0 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_saw = 2.0 * m_q0 - 1.0 - m_b0;
          m_pwv = gen::clamp(pw * 0.96 + 0.02 + m_pwm, 0.02, 0.98);
          m_q1 = m_q0 + 1.0 - m_pwv;
          m_q1 = m_q1 - std::floor(m_q1);
        m_b1 = m_q1 < m_dt ? (m_q1 / m_dt) * 2.0 - (m_q1 / m_dt) * (m_q1 / m_dt) - 1.0 : (m_q1 > 1.0 - m_dt ? ((m_q1 - 1.0) / m_dt) * ((m_q1 - 1.0) / m_dt) + ((m_q1 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_pul = (m_q0 < m_pwv ? 1.0 : -1.0) + m_b0 - m_b1;
          m_q2 = m_v1_p2;
          m_dt2 = m_dt * 0.5;
        m_b2 = m_q2 < m_dt2 ? (m_q2 / m_dt2) * 2.0 - (m_q2 / m_dt2) * (m_q2 / m_dt2) - 1.0 : (m_q2 > 1.0 - m_dt2 ? ((m_q2 - 1.0) / m_dt2) * ((m_q2 - 1.0) / m_dt2) + ((m_q2 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_q3 = m_q2 + 0.5;
          m_q3 = m_q3 - std::floor(m_q3);
        m_b3 = m_q3 < m_dt2 ? (m_q3 / m_dt2) * 2.0 - (m_q3 / m_dt2) * (m_q3 / m_dt2) - 1.0 : (m_q3 > 1.0 - m_dt2 ? ((m_q3 - 1.0) / m_dt2) * ((m_q3 - 1.0) / m_dt2) + ((m_q3 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_sq = (m_q2 < 0.5 ? 1.0 : -1.0) + m_b2 - m_b3;
          m_osc = (vform < 0.5 ? m_saw : (vform < 1.5 ? m_pul : (m_saw + m_pul) * 0.62)) + m_sq * sub * 0.8;
          m_fm = m_v1_e1 * eg1 * (1.0 - velf + velf * m_v1_vel) * 7.0 + m_lfo * lfocut * 3.0 + (m_v1_pn - 60.0) / 12.0 * kbd + (mw + at) * mwcut * 4.0;
          m_fc = gen::clamp(m_cutB * 0.9820 * std::pow(2.0, m_fm), 18.0, m_sr * 0.42);
        m_lg = std::tan(gen::kPi * m_fc / m_sr);
        m_lG = m_lg / (1.0 + m_lg);
        m_lb1 = m_v1_f_s1 / (1.0 + m_lg);
        m_lb2 = m_v1_f_s2 / (1.0 + m_lg);
        m_lb3 = m_v1_f_s3 / (1.0 + m_lg);
        m_lb4 = m_v1_f_s4 / (1.0 + m_lg);
        m_lG2 = m_lG * m_lG;
        m_lG4 = m_lG2 * m_lG2;
        m_lSg = m_lG2 * m_lG * m_lb1 + m_lG2 * m_lb2 + m_lG * m_lb3 + m_lb4;
        m_ly4e = (m_lG4 * (m_osc * 0.5) + m_lSg) / (1.0 + (m_kk) * m_lG4);
        m_lu = std::tanh((m_osc * 0.5) - (m_kk) * m_ly4e);
        m_ly1 = m_lG * m_lu + m_lb1;
        m_v1_f_s1 = 2.0 * m_ly1 - m_v1_f_s1;
        m_ly2 = m_lG * m_ly1 + m_lb2;
        m_v1_f_s2 = 2.0 * m_ly2 - m_v1_f_s2;
        m_ly3 = m_lG * m_ly2 + m_lb3;
        m_v1_f_s3 = 2.0 * m_ly3 - m_v1_f_s3;
        m_ly4 = m_lG * m_ly3 + m_lb4;
        m_v1_f_s4 = 2.0 * m_ly4 - m_v1_f_s4;
        m_flt = m_ly4 * (1.0 + (m_kk) * 0.65);
          m_ampm = m_v1_e2 * (1.0 - vela + vela * m_v1_vel) * (1.0 - lfoamp * 0.5 * (1.0 - m_lfo)) * gen::clamp(std::pow(2.0, (m_v1_pn - 60.0) / 24.0 * kbda), 0.1, 4.0);
          m_sv = m_flt * m_ampm * m_ug;
          m_xL = m_xL + m_sv * (1.0 - m_spread * 0.85);
          m_xR = m_xR + m_sv * (1.0 - m_spread * 0.0);
          m_me = gen::max(m_me, m_v1_e2);
          m_mask = m_mask + 2.0;
        }
        if (t2 != m_v2_lt) { m_v2_lt = t2; m_v2_s1 = 1.0; m_v2_s2 = 1.0; m_v2_vel = g2; }
        if (g2 <= 0.0 && m_v2_s2 > 0.0 && m_v2_s2 < 3.0) { m_v2_s1 = 3.0; m_v2_s2 = 3.0; }
        if (m_v2_s1 == 1.0) { m_v2_e1 = m_v2_e1 + 1.0 / (m_sr * m_fA); if (m_v2_e1 >= 1.0) { m_v2_e1 = 1.0; m_v2_s1 = 2.0; } }
        else if (m_v2_s1 == 2.0) { m_v2_e1 = m_v2_e1 + (fs - m_v2_e1) * m_fD; }
        else if (m_v2_s1 == 3.0) { m_v2_e1 = m_v2_e1 - m_v2_e1 * m_fR; }
        if (m_v2_s2 == 1.0) { m_v2_e2 = m_v2_e2 + 1.0 / (m_sr * m_aA); if (m_v2_e2 >= 1.0) { m_v2_e2 = 1.0; m_v2_s2 = 2.0; } }
        else if (m_v2_s2 == 2.0) { m_v2_e2 = m_v2_e2 + (asus - m_v2_e2) * m_aD; }
        else if (m_v2_s2 == 3.0) { m_v2_e2 = m_v2_e2 - m_v2_e2 * m_aR; if (m_v2_e2 < 0.0002) { m_v2_e2 = 0.0; m_v2_s2 = 0.0; } }
        if (m_v2_s2 > 0.0) {
          m_v2_pn = m_v2_pn + (n2 + detune * detune * 0.6 * -0.6 - m_v2_pn) * m_cg;
          m_v2_dp = gen::wrap(m_v2_dp + 0.116 / m_sr, 0.0, 1.0);
          m_pn = m_v2_pn + m_bs + m_vib + std::sin(gen::kTwoPi * m_v2_dp) * 0.045 + std::sin(gen::kTwoPi * m_v2_dp * 2.7) * 0.02;
          m_fq = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45);
          m_dt = m_fq / m_sr;
          m_v2_ph = m_v2_ph + m_dt;
          if (m_v2_ph >= 1.0) { m_v2_ph = m_v2_ph - 1.0; }
          m_v2_p2 = m_v2_p2 + m_dt * 0.5;
          if (m_v2_p2 >= 1.0) { m_v2_p2 = m_v2_p2 - 1.0; }
          m_q0 = m_v2_ph;
        m_b0 = m_q0 < m_dt ? (m_q0 / m_dt) * 2.0 - (m_q0 / m_dt) * (m_q0 / m_dt) - 1.0 : (m_q0 > 1.0 - m_dt ? ((m_q0 - 1.0) / m_dt) * ((m_q0 - 1.0) / m_dt) + ((m_q0 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_saw = 2.0 * m_q0 - 1.0 - m_b0;
          m_pwv = gen::clamp(pw * 0.96 + 0.02 + m_pwm, 0.02, 0.98);
          m_q1 = m_q0 + 1.0 - m_pwv;
          m_q1 = m_q1 - std::floor(m_q1);
        m_b1 = m_q1 < m_dt ? (m_q1 / m_dt) * 2.0 - (m_q1 / m_dt) * (m_q1 / m_dt) - 1.0 : (m_q1 > 1.0 - m_dt ? ((m_q1 - 1.0) / m_dt) * ((m_q1 - 1.0) / m_dt) + ((m_q1 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_pul = (m_q0 < m_pwv ? 1.0 : -1.0) + m_b0 - m_b1;
          m_q2 = m_v2_p2;
          m_dt2 = m_dt * 0.5;
        m_b2 = m_q2 < m_dt2 ? (m_q2 / m_dt2) * 2.0 - (m_q2 / m_dt2) * (m_q2 / m_dt2) - 1.0 : (m_q2 > 1.0 - m_dt2 ? ((m_q2 - 1.0) / m_dt2) * ((m_q2 - 1.0) / m_dt2) + ((m_q2 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_q3 = m_q2 + 0.5;
          m_q3 = m_q3 - std::floor(m_q3);
        m_b3 = m_q3 < m_dt2 ? (m_q3 / m_dt2) * 2.0 - (m_q3 / m_dt2) * (m_q3 / m_dt2) - 1.0 : (m_q3 > 1.0 - m_dt2 ? ((m_q3 - 1.0) / m_dt2) * ((m_q3 - 1.0) / m_dt2) + ((m_q3 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_sq = (m_q2 < 0.5 ? 1.0 : -1.0) + m_b2 - m_b3;
          m_osc = (vform < 0.5 ? m_saw : (vform < 1.5 ? m_pul : (m_saw + m_pul) * 0.62)) + m_sq * sub * 0.8;
          m_fm = m_v2_e1 * eg1 * (1.0 - velf + velf * m_v2_vel) * 7.0 + m_lfo * lfocut * 3.0 + (m_v2_pn - 60.0) / 12.0 * kbd + (mw + at) * mwcut * 4.0;
          m_fc = gen::clamp(m_cutB * 0.9940 * std::pow(2.0, m_fm), 18.0, m_sr * 0.42);
        m_lg = std::tan(gen::kPi * m_fc / m_sr);
        m_lG = m_lg / (1.0 + m_lg);
        m_lb1 = m_v2_f_s1 / (1.0 + m_lg);
        m_lb2 = m_v2_f_s2 / (1.0 + m_lg);
        m_lb3 = m_v2_f_s3 / (1.0 + m_lg);
        m_lb4 = m_v2_f_s4 / (1.0 + m_lg);
        m_lG2 = m_lG * m_lG;
        m_lG4 = m_lG2 * m_lG2;
        m_lSg = m_lG2 * m_lG * m_lb1 + m_lG2 * m_lb2 + m_lG * m_lb3 + m_lb4;
        m_ly4e = (m_lG4 * (m_osc * 0.5) + m_lSg) / (1.0 + (m_kk) * m_lG4);
        m_lu = std::tanh((m_osc * 0.5) - (m_kk) * m_ly4e);
        m_ly1 = m_lG * m_lu + m_lb1;
        m_v2_f_s1 = 2.0 * m_ly1 - m_v2_f_s1;
        m_ly2 = m_lG * m_ly1 + m_lb2;
        m_v2_f_s2 = 2.0 * m_ly2 - m_v2_f_s2;
        m_ly3 = m_lG * m_ly2 + m_lb3;
        m_v2_f_s3 = 2.0 * m_ly3 - m_v2_f_s3;
        m_ly4 = m_lG * m_ly3 + m_lb4;
        m_v2_f_s4 = 2.0 * m_ly4 - m_v2_f_s4;
        m_flt = m_ly4 * (1.0 + (m_kk) * 0.65);
          m_ampm = m_v2_e2 * (1.0 - vela + vela * m_v2_vel) * (1.0 - lfoamp * 0.5 * (1.0 - m_lfo)) * gen::clamp(std::pow(2.0, (m_v2_pn - 60.0) / 24.0 * kbda), 0.1, 4.0);
          m_sv = m_flt * m_ampm * m_ug;
          m_xL = m_xL + m_sv * (1.0 - m_spread * 0.0);
          m_xR = m_xR + m_sv * (1.0 - m_spread * 0.5);
          m_me = gen::max(m_me, m_v2_e2);
          m_mask = m_mask + 4.0;
        }
        if (t3 != m_v3_lt) { m_v3_lt = t3; m_v3_s1 = 1.0; m_v3_s2 = 1.0; m_v3_vel = g3; }
        if (g3 <= 0.0 && m_v3_s2 > 0.0 && m_v3_s2 < 3.0) { m_v3_s1 = 3.0; m_v3_s2 = 3.0; }
        if (m_v3_s1 == 1.0) { m_v3_e1 = m_v3_e1 + 1.0 / (m_sr * m_fA); if (m_v3_e1 >= 1.0) { m_v3_e1 = 1.0; m_v3_s1 = 2.0; } }
        else if (m_v3_s1 == 2.0) { m_v3_e1 = m_v3_e1 + (fs - m_v3_e1) * m_fD; }
        else if (m_v3_s1 == 3.0) { m_v3_e1 = m_v3_e1 - m_v3_e1 * m_fR; }
        if (m_v3_s2 == 1.0) { m_v3_e2 = m_v3_e2 + 1.0 / (m_sr * m_aA); if (m_v3_e2 >= 1.0) { m_v3_e2 = 1.0; m_v3_s2 = 2.0; } }
        else if (m_v3_s2 == 2.0) { m_v3_e2 = m_v3_e2 + (asus - m_v3_e2) * m_aD; }
        else if (m_v3_s2 == 3.0) { m_v3_e2 = m_v3_e2 - m_v3_e2 * m_aR; if (m_v3_e2 < 0.0002) { m_v3_e2 = 0.0; m_v3_s2 = 0.0; } }
        if (m_v3_s2 > 0.0) {
          m_v3_pn = m_v3_pn + (n3 + detune * detune * 0.6 * 0.6 - m_v3_pn) * m_cg;
          m_v3_dp = gen::wrap(m_v3_dp + 0.139 / m_sr, 0.0, 1.0);
          m_pn = m_v3_pn + m_bs + m_vib + std::sin(gen::kTwoPi * m_v3_dp) * 0.045 + std::sin(gen::kTwoPi * m_v3_dp * 2.7) * 0.02;
          m_fq = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45);
          m_dt = m_fq / m_sr;
          m_v3_ph = m_v3_ph + m_dt;
          if (m_v3_ph >= 1.0) { m_v3_ph = m_v3_ph - 1.0; }
          m_v3_p2 = m_v3_p2 + m_dt * 0.5;
          if (m_v3_p2 >= 1.0) { m_v3_p2 = m_v3_p2 - 1.0; }
          m_q0 = m_v3_ph;
        m_b0 = m_q0 < m_dt ? (m_q0 / m_dt) * 2.0 - (m_q0 / m_dt) * (m_q0 / m_dt) - 1.0 : (m_q0 > 1.0 - m_dt ? ((m_q0 - 1.0) / m_dt) * ((m_q0 - 1.0) / m_dt) + ((m_q0 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_saw = 2.0 * m_q0 - 1.0 - m_b0;
          m_pwv = gen::clamp(pw * 0.96 + 0.02 + m_pwm, 0.02, 0.98);
          m_q1 = m_q0 + 1.0 - m_pwv;
          m_q1 = m_q1 - std::floor(m_q1);
        m_b1 = m_q1 < m_dt ? (m_q1 / m_dt) * 2.0 - (m_q1 / m_dt) * (m_q1 / m_dt) - 1.0 : (m_q1 > 1.0 - m_dt ? ((m_q1 - 1.0) / m_dt) * ((m_q1 - 1.0) / m_dt) + ((m_q1 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_pul = (m_q0 < m_pwv ? 1.0 : -1.0) + m_b0 - m_b1;
          m_q2 = m_v3_p2;
          m_dt2 = m_dt * 0.5;
        m_b2 = m_q2 < m_dt2 ? (m_q2 / m_dt2) * 2.0 - (m_q2 / m_dt2) * (m_q2 / m_dt2) - 1.0 : (m_q2 > 1.0 - m_dt2 ? ((m_q2 - 1.0) / m_dt2) * ((m_q2 - 1.0) / m_dt2) + ((m_q2 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_q3 = m_q2 + 0.5;
          m_q3 = m_q3 - std::floor(m_q3);
        m_b3 = m_q3 < m_dt2 ? (m_q3 / m_dt2) * 2.0 - (m_q3 / m_dt2) * (m_q3 / m_dt2) - 1.0 : (m_q3 > 1.0 - m_dt2 ? ((m_q3 - 1.0) / m_dt2) * ((m_q3 - 1.0) / m_dt2) + ((m_q3 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_sq = (m_q2 < 0.5 ? 1.0 : -1.0) + m_b2 - m_b3;
          m_osc = (vform < 0.5 ? m_saw : (vform < 1.5 ? m_pul : (m_saw + m_pul) * 0.62)) + m_sq * sub * 0.8;
          m_fm = m_v3_e1 * eg1 * (1.0 - velf + velf * m_v3_vel) * 7.0 + m_lfo * lfocut * 3.0 + (m_v3_pn - 60.0) / 12.0 * kbd + (mw + at) * mwcut * 4.0;
          m_fc = gen::clamp(m_cutB * 1.0060 * std::pow(2.0, m_fm), 18.0, m_sr * 0.42);
        m_lg = std::tan(gen::kPi * m_fc / m_sr);
        m_lG = m_lg / (1.0 + m_lg);
        m_lb1 = m_v3_f_s1 / (1.0 + m_lg);
        m_lb2 = m_v3_f_s2 / (1.0 + m_lg);
        m_lb3 = m_v3_f_s3 / (1.0 + m_lg);
        m_lb4 = m_v3_f_s4 / (1.0 + m_lg);
        m_lG2 = m_lG * m_lG;
        m_lG4 = m_lG2 * m_lG2;
        m_lSg = m_lG2 * m_lG * m_lb1 + m_lG2 * m_lb2 + m_lG * m_lb3 + m_lb4;
        m_ly4e = (m_lG4 * (m_osc * 0.5) + m_lSg) / (1.0 + (m_kk) * m_lG4);
        m_lu = std::tanh((m_osc * 0.5) - (m_kk) * m_ly4e);
        m_ly1 = m_lG * m_lu + m_lb1;
        m_v3_f_s1 = 2.0 * m_ly1 - m_v3_f_s1;
        m_ly2 = m_lG * m_ly1 + m_lb2;
        m_v3_f_s2 = 2.0 * m_ly2 - m_v3_f_s2;
        m_ly3 = m_lG * m_ly2 + m_lb3;
        m_v3_f_s3 = 2.0 * m_ly3 - m_v3_f_s3;
        m_ly4 = m_lG * m_ly3 + m_lb4;
        m_v3_f_s4 = 2.0 * m_ly4 - m_v3_f_s4;
        m_flt = m_ly4 * (1.0 + (m_kk) * 0.65);
          m_ampm = m_v3_e2 * (1.0 - vela + vela * m_v3_vel) * (1.0 - lfoamp * 0.5 * (1.0 - m_lfo)) * gen::clamp(std::pow(2.0, (m_v3_pn - 60.0) / 24.0 * kbda), 0.1, 4.0);
          m_sv = m_flt * m_ampm * m_ug;
          m_xL = m_xL + m_sv * (1.0 - m_spread * 0.5);
          m_xR = m_xR + m_sv * (1.0 - m_spread * 0.0);
          m_me = gen::max(m_me, m_v3_e2);
          m_mask = m_mask + 8.0;
        }
        if (t4 != m_v4_lt) { m_v4_lt = t4; m_v4_s1 = 1.0; m_v4_s2 = 1.0; m_v4_vel = g4; }
        if (g4 <= 0.0 && m_v4_s2 > 0.0 && m_v4_s2 < 3.0) { m_v4_s1 = 3.0; m_v4_s2 = 3.0; }
        if (m_v4_s1 == 1.0) { m_v4_e1 = m_v4_e1 + 1.0 / (m_sr * m_fA); if (m_v4_e1 >= 1.0) { m_v4_e1 = 1.0; m_v4_s1 = 2.0; } }
        else if (m_v4_s1 == 2.0) { m_v4_e1 = m_v4_e1 + (fs - m_v4_e1) * m_fD; }
        else if (m_v4_s1 == 3.0) { m_v4_e1 = m_v4_e1 - m_v4_e1 * m_fR; }
        if (m_v4_s2 == 1.0) { m_v4_e2 = m_v4_e2 + 1.0 / (m_sr * m_aA); if (m_v4_e2 >= 1.0) { m_v4_e2 = 1.0; m_v4_s2 = 2.0; } }
        else if (m_v4_s2 == 2.0) { m_v4_e2 = m_v4_e2 + (asus - m_v4_e2) * m_aD; }
        else if (m_v4_s2 == 3.0) { m_v4_e2 = m_v4_e2 - m_v4_e2 * m_aR; if (m_v4_e2 < 0.0002) { m_v4_e2 = 0.0; m_v4_s2 = 0.0; } }
        if (m_v4_s2 > 0.0) {
          m_v4_pn = m_v4_pn + (n4 + detune * detune * 0.6 * -0.2 - m_v4_pn) * m_cg;
          m_v4_dp = gen::wrap(m_v4_dp + 0.162 / m_sr, 0.0, 1.0);
          m_pn = m_v4_pn + m_bs + m_vib + std::sin(gen::kTwoPi * m_v4_dp) * 0.045 + std::sin(gen::kTwoPi * m_v4_dp * 2.7) * 0.02;
          m_fq = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45);
          m_dt = m_fq / m_sr;
          m_v4_ph = m_v4_ph + m_dt;
          if (m_v4_ph >= 1.0) { m_v4_ph = m_v4_ph - 1.0; }
          m_v4_p2 = m_v4_p2 + m_dt * 0.5;
          if (m_v4_p2 >= 1.0) { m_v4_p2 = m_v4_p2 - 1.0; }
          m_q0 = m_v4_ph;
        m_b0 = m_q0 < m_dt ? (m_q0 / m_dt) * 2.0 - (m_q0 / m_dt) * (m_q0 / m_dt) - 1.0 : (m_q0 > 1.0 - m_dt ? ((m_q0 - 1.0) / m_dt) * ((m_q0 - 1.0) / m_dt) + ((m_q0 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_saw = 2.0 * m_q0 - 1.0 - m_b0;
          m_pwv = gen::clamp(pw * 0.96 + 0.02 + m_pwm, 0.02, 0.98);
          m_q1 = m_q0 + 1.0 - m_pwv;
          m_q1 = m_q1 - std::floor(m_q1);
        m_b1 = m_q1 < m_dt ? (m_q1 / m_dt) * 2.0 - (m_q1 / m_dt) * (m_q1 / m_dt) - 1.0 : (m_q1 > 1.0 - m_dt ? ((m_q1 - 1.0) / m_dt) * ((m_q1 - 1.0) / m_dt) + ((m_q1 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_pul = (m_q0 < m_pwv ? 1.0 : -1.0) + m_b0 - m_b1;
          m_q2 = m_v4_p2;
          m_dt2 = m_dt * 0.5;
        m_b2 = m_q2 < m_dt2 ? (m_q2 / m_dt2) * 2.0 - (m_q2 / m_dt2) * (m_q2 / m_dt2) - 1.0 : (m_q2 > 1.0 - m_dt2 ? ((m_q2 - 1.0) / m_dt2) * ((m_q2 - 1.0) / m_dt2) + ((m_q2 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_q3 = m_q2 + 0.5;
          m_q3 = m_q3 - std::floor(m_q3);
        m_b3 = m_q3 < m_dt2 ? (m_q3 / m_dt2) * 2.0 - (m_q3 / m_dt2) * (m_q3 / m_dt2) - 1.0 : (m_q3 > 1.0 - m_dt2 ? ((m_q3 - 1.0) / m_dt2) * ((m_q3 - 1.0) / m_dt2) + ((m_q3 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_sq = (m_q2 < 0.5 ? 1.0 : -1.0) + m_b2 - m_b3;
          m_osc = (vform < 0.5 ? m_saw : (vform < 1.5 ? m_pul : (m_saw + m_pul) * 0.62)) + m_sq * sub * 0.8;
          m_fm = m_v4_e1 * eg1 * (1.0 - velf + velf * m_v4_vel) * 7.0 + m_lfo * lfocut * 3.0 + (m_v4_pn - 60.0) / 12.0 * kbd + (mw + at) * mwcut * 4.0;
          m_fc = gen::clamp(m_cutB * 1.0180 * std::pow(2.0, m_fm), 18.0, m_sr * 0.42);
        m_lg = std::tan(gen::kPi * m_fc / m_sr);
        m_lG = m_lg / (1.0 + m_lg);
        m_lb1 = m_v4_f_s1 / (1.0 + m_lg);
        m_lb2 = m_v4_f_s2 / (1.0 + m_lg);
        m_lb3 = m_v4_f_s3 / (1.0 + m_lg);
        m_lb4 = m_v4_f_s4 / (1.0 + m_lg);
        m_lG2 = m_lG * m_lG;
        m_lG4 = m_lG2 * m_lG2;
        m_lSg = m_lG2 * m_lG * m_lb1 + m_lG2 * m_lb2 + m_lG * m_lb3 + m_lb4;
        m_ly4e = (m_lG4 * (m_osc * 0.5) + m_lSg) / (1.0 + (m_kk) * m_lG4);
        m_lu = std::tanh((m_osc * 0.5) - (m_kk) * m_ly4e);
        m_ly1 = m_lG * m_lu + m_lb1;
        m_v4_f_s1 = 2.0 * m_ly1 - m_v4_f_s1;
        m_ly2 = m_lG * m_ly1 + m_lb2;
        m_v4_f_s2 = 2.0 * m_ly2 - m_v4_f_s2;
        m_ly3 = m_lG * m_ly2 + m_lb3;
        m_v4_f_s3 = 2.0 * m_ly3 - m_v4_f_s3;
        m_ly4 = m_lG * m_ly3 + m_lb4;
        m_v4_f_s4 = 2.0 * m_ly4 - m_v4_f_s4;
        m_flt = m_ly4 * (1.0 + (m_kk) * 0.65);
          m_ampm = m_v4_e2 * (1.0 - vela + vela * m_v4_vel) * (1.0 - lfoamp * 0.5 * (1.0 - m_lfo)) * gen::clamp(std::pow(2.0, (m_v4_pn - 60.0) / 24.0 * kbda), 0.1, 4.0);
          m_sv = m_flt * m_ampm * m_ug;
          m_xL = m_xL + m_sv * (1.0 - m_spread * 0.0);
          m_xR = m_xR + m_sv * (1.0 - m_spread * 0.17);
          m_me = gen::max(m_me, m_v4_e2);
          m_mask = m_mask + 16.0;
        }
        if (t5 != m_v5_lt) { m_v5_lt = t5; m_v5_s1 = 1.0; m_v5_s2 = 1.0; m_v5_vel = g5; }
        if (g5 <= 0.0 && m_v5_s2 > 0.0 && m_v5_s2 < 3.0) { m_v5_s1 = 3.0; m_v5_s2 = 3.0; }
        if (m_v5_s1 == 1.0) { m_v5_e1 = m_v5_e1 + 1.0 / (m_sr * m_fA); if (m_v5_e1 >= 1.0) { m_v5_e1 = 1.0; m_v5_s1 = 2.0; } }
        else if (m_v5_s1 == 2.0) { m_v5_e1 = m_v5_e1 + (fs - m_v5_e1) * m_fD; }
        else if (m_v5_s1 == 3.0) { m_v5_e1 = m_v5_e1 - m_v5_e1 * m_fR; }
        if (m_v5_s2 == 1.0) { m_v5_e2 = m_v5_e2 + 1.0 / (m_sr * m_aA); if (m_v5_e2 >= 1.0) { m_v5_e2 = 1.0; m_v5_s2 = 2.0; } }
        else if (m_v5_s2 == 2.0) { m_v5_e2 = m_v5_e2 + (asus - m_v5_e2) * m_aD; }
        else if (m_v5_s2 == 3.0) { m_v5_e2 = m_v5_e2 - m_v5_e2 * m_aR; if (m_v5_e2 < 0.0002) { m_v5_e2 = 0.0; m_v5_s2 = 0.0; } }
        if (m_v5_s2 > 0.0) {
          m_v5_pn = m_v5_pn + (n5 + detune * detune * 0.6 * 0.2 - m_v5_pn) * m_cg;
          m_v5_dp = gen::wrap(m_v5_dp + 0.185 / m_sr, 0.0, 1.0);
          m_pn = m_v5_pn + m_bs + m_vib + std::sin(gen::kTwoPi * m_v5_dp) * 0.045 + std::sin(gen::kTwoPi * m_v5_dp * 2.7) * 0.02;
          m_fq = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45);
          m_dt = m_fq / m_sr;
          m_v5_ph = m_v5_ph + m_dt;
          if (m_v5_ph >= 1.0) { m_v5_ph = m_v5_ph - 1.0; }
          m_v5_p2 = m_v5_p2 + m_dt * 0.5;
          if (m_v5_p2 >= 1.0) { m_v5_p2 = m_v5_p2 - 1.0; }
          m_q0 = m_v5_ph;
        m_b0 = m_q0 < m_dt ? (m_q0 / m_dt) * 2.0 - (m_q0 / m_dt) * (m_q0 / m_dt) - 1.0 : (m_q0 > 1.0 - m_dt ? ((m_q0 - 1.0) / m_dt) * ((m_q0 - 1.0) / m_dt) + ((m_q0 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_saw = 2.0 * m_q0 - 1.0 - m_b0;
          m_pwv = gen::clamp(pw * 0.96 + 0.02 + m_pwm, 0.02, 0.98);
          m_q1 = m_q0 + 1.0 - m_pwv;
          m_q1 = m_q1 - std::floor(m_q1);
        m_b1 = m_q1 < m_dt ? (m_q1 / m_dt) * 2.0 - (m_q1 / m_dt) * (m_q1 / m_dt) - 1.0 : (m_q1 > 1.0 - m_dt ? ((m_q1 - 1.0) / m_dt) * ((m_q1 - 1.0) / m_dt) + ((m_q1 - 1.0) / m_dt) * 2.0 + 1.0 : 0.0);
          m_pul = (m_q0 < m_pwv ? 1.0 : -1.0) + m_b0 - m_b1;
          m_q2 = m_v5_p2;
          m_dt2 = m_dt * 0.5;
        m_b2 = m_q2 < m_dt2 ? (m_q2 / m_dt2) * 2.0 - (m_q2 / m_dt2) * (m_q2 / m_dt2) - 1.0 : (m_q2 > 1.0 - m_dt2 ? ((m_q2 - 1.0) / m_dt2) * ((m_q2 - 1.0) / m_dt2) + ((m_q2 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_q3 = m_q2 + 0.5;
          m_q3 = m_q3 - std::floor(m_q3);
        m_b3 = m_q3 < m_dt2 ? (m_q3 / m_dt2) * 2.0 - (m_q3 / m_dt2) * (m_q3 / m_dt2) - 1.0 : (m_q3 > 1.0 - m_dt2 ? ((m_q3 - 1.0) / m_dt2) * ((m_q3 - 1.0) / m_dt2) + ((m_q3 - 1.0) / m_dt2) * 2.0 + 1.0 : 0.0);
          m_sq = (m_q2 < 0.5 ? 1.0 : -1.0) + m_b2 - m_b3;
          m_osc = (vform < 0.5 ? m_saw : (vform < 1.5 ? m_pul : (m_saw + m_pul) * 0.62)) + m_sq * sub * 0.8;
          m_fm = m_v5_e1 * eg1 * (1.0 - velf + velf * m_v5_vel) * 7.0 + m_lfo * lfocut * 3.0 + (m_v5_pn - 60.0) / 12.0 * kbd + (mw + at) * mwcut * 4.0;
          m_fc = gen::clamp(m_cutB * 1.0300 * std::pow(2.0, m_fm), 18.0, m_sr * 0.42);
        m_lg = std::tan(gen::kPi * m_fc / m_sr);
        m_lG = m_lg / (1.0 + m_lg);
        m_lb1 = m_v5_f_s1 / (1.0 + m_lg);
        m_lb2 = m_v5_f_s2 / (1.0 + m_lg);
        m_lb3 = m_v5_f_s3 / (1.0 + m_lg);
        m_lb4 = m_v5_f_s4 / (1.0 + m_lg);
        m_lG2 = m_lG * m_lG;
        m_lG4 = m_lG2 * m_lG2;
        m_lSg = m_lG2 * m_lG * m_lb1 + m_lG2 * m_lb2 + m_lG * m_lb3 + m_lb4;
        m_ly4e = (m_lG4 * (m_osc * 0.5) + m_lSg) / (1.0 + (m_kk) * m_lG4);
        m_lu = std::tanh((m_osc * 0.5) - (m_kk) * m_ly4e);
        m_ly1 = m_lG * m_lu + m_lb1;
        m_v5_f_s1 = 2.0 * m_ly1 - m_v5_f_s1;
        m_ly2 = m_lG * m_ly1 + m_lb2;
        m_v5_f_s2 = 2.0 * m_ly2 - m_v5_f_s2;
        m_ly3 = m_lG * m_ly2 + m_lb3;
        m_v5_f_s3 = 2.0 * m_ly3 - m_v5_f_s3;
        m_ly4 = m_lG * m_ly3 + m_lb4;
        m_v5_f_s4 = 2.0 * m_ly4 - m_v5_f_s4;
        m_flt = m_ly4 * (1.0 + (m_kk) * 0.65);
          m_ampm = m_v5_e2 * (1.0 - vela + vela * m_v5_vel) * (1.0 - lfoamp * 0.5 * (1.0 - m_lfo)) * gen::clamp(std::pow(2.0, (m_v5_pn - 60.0) / 24.0 * kbda), 0.1, 4.0);
          m_sv = m_flt * m_ampm * m_ug;
          m_xL = m_xL + m_sv * (1.0 - m_spread * 0.17);
          m_xR = m_xR + m_sv * (1.0 - m_spread * 0.0);
          m_me = gen::max(m_me, m_v5_e2);
          m_mask = m_mask + 32.0;
        }
        m_ci = gen::wrap(m_ci + 1.0, 0.0, 4096.0);
        chb.poke( m_xL, m_ci, 0.0);
        chb.poke( m_xR, m_ci, 1.0);
        m_cp0 = gen::wrap(m_cp0 + 0.31 / m_sr, 0.0, 1.0);
        m_cp1 = gen::wrap(m_cp1 + 0.47 / m_sr, 0.0, 1.0);
        m_cp2 = gen::wrap(m_cp2 + 0.39 / m_sr, 0.0, 1.0);
        m_cp3 = gen::wrap(m_cp3 + 0.53 / m_sr, 0.0, 1.0);
        m_cd = (0.7 + chorus * 2.2) * m_sr / 1000.0;
        m_cb = 7.0 * m_sr / 1000.0;
        m_r0 = gen::wrap(m_ci - (m_cb + std::sin(gen::kTwoPi * m_cp0) * m_cd), 0.0, 4096.0);
        m_r1 = gen::wrap(m_ci - (m_cb + std::sin(gen::kTwoPi * m_cp1) * m_cd * 0.8), 0.0, 4096.0);
        m_r2 = gen::wrap(m_ci - (m_cb + std::sin(gen::kTwoPi * m_cp2) * m_cd), 0.0, 4096.0);
        m_r3 = gen::wrap(m_ci - (m_cb + std::sin(gen::kTwoPi * m_cp3) * m_cd * 0.8), 0.0, 4096.0);
        m_i0 = std::floor(m_r0); f0 = m_r0 - m_i0;
        m_i1 = std::floor(m_r1); f1 = m_r1 - m_i1;
        m_i2 = std::floor(m_r2); f2 = m_r2 - m_i2;
        m_i3 = std::floor(m_r3); f3 = m_r3 - m_i3;
        m_tp0 = chb.peek( m_i0, 0.0) * (1.0 - f0) + chb.peek( gen::wrap(m_i0 + 1.0, 0.0, 4096.0), 0.0) * f0;
        m_tp1 = chb.peek( m_i1, 1.0) * (1.0 - f1) + chb.peek( gen::wrap(m_i1 + 1.0, 0.0, 4096.0), 1.0) * f1;
        m_tp2 = chb.peek( m_i2, 1.0) * (1.0 - f2) + chb.peek( gen::wrap(m_i2 + 1.0, 0.0, 4096.0), 1.0) * f2;
        m_tp3 = chb.peek( m_i3, 0.0) * (1.0 - f3) + chb.peek( gen::wrap(m_i3 + 1.0, 0.0, 4096.0), 0.0) * f3;
        m_cL = m_xL * (1.0 - chorus * 0.35) + (m_tp0 + m_tp1 * 0.6) * chorus * 0.55;
        m_cR = m_xR * (1.0 - chorus * 0.35) + (m_tp2 + m_tp3 * 0.6) * chorus * 0.55;
        m_sDt = m_sDt + ((0.001 + dtime * dtime * 0.999) - m_sDt) * (1.0 - std::exp(-1.0 / (m_sr * 0.12)));
        m_dw = gen::wrap(m_dw + 1.0, 0.0, 52000.0);
        m_dd = gen::clamp(m_sDt * m_sr, 2.0, 51990.0);
        m_rd = gen::wrap(m_dw - m_dd, 0.0, 52000.0);
        m_ri = std::floor(m_rd);
        m_rf = m_rd - m_ri;
        m_wL = dlb.peek( m_ri, 0.0) * (1.0 - m_rf) + dlb.peek( gen::wrap(m_ri + 1.0, 0.0, 52000.0), 0.0) * m_rf;
        m_wR = dlb.peek( m_ri, 1.0) * (1.0 - m_rf) + dlb.peek( gen::wrap(m_ri + 1.0, 0.0, 52000.0), 1.0) * m_rf;
        m_dg = 1.0 - std::exp(-gen::kTwoPi * 6500.0 / m_sr);
        m_dlpL = m_dlpL + (m_wL - m_dlpL) * m_dg;
        m_dlpR = m_dlpR + (m_wR - m_dlpR) * m_dg;
        m_fbk = dfb * 1.02;
        dlb.poke( std::tanh(m_cL + m_dlpL * m_fbk), m_dw, 0.0);
        dlb.poke( std::tanh(m_cR + m_dlpR * m_fbk), m_dw, 1.0);
        m_oL = m_cL + m_dlpL * dmix;
        m_oR = m_cR + m_dlpR * dmix;
        m_gv = vol * vol * 1.25;
        m_oL = std::tanh(m_oL * m_gv);
        m_oR = std::tanh(m_oR * m_gv);
        m_dcyL = m_oL - m_dcxL + 0.9995 * m_dcyL;
        m_dcxL = m_oL;
        m_dcyR = m_oR - m_dcxR + 0.9995 * m_dcyR;
        m_dcxR = m_oR;
        m_oL = m_dcyL;
        m_oR = m_dcyR;
        m_pk = gen::max(gen::max(std::fabs(m_oL), std::fabs(m_oR)), m_pk * 0.9997);
        out[0] = m_oL;
        out[1] = m_oR;
        out[2] = m_me;
        out[3] = m_mask;
        out[4] = m_pk;
        out[5] = m_lfo;
    }
};

}  // namespace blonda::bris
