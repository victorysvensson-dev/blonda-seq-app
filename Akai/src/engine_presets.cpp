// BLONDA AKAI — factory sounds for the nine SEQ.3 engines on the MPC.
//
// Each sound is a set of values on top of the engine's defaults (id=value, the ids in engine_instrument.cpp) and a
// level trim in dB so the sounds of one instrument play at about the same loudness. The pads start at C3: bass
// sounds use OCTAVE / RANGE so the lowest pad already sits where a bass belongs. The lists are ordered so the first
// sound is a strong all-rounder; INIT (the engine defaults) is added at the end.
//
// Checked with tools/preset_lab (preset_lab measure all / render all <dir>): level, peak, brightness, attack,
// sustain and release per sound, and a demo phrase per category.
#include "akai/engine_instrument.hpp"

namespace akai {
using blonda::Eng;

namespace {

// ---------------------------------------------------------------- MINI D (Model D-style, mono)
// o?r: 0 LO 1 32' 2 16' 3 8' 4 4' 5 2'   o1/o2 wave: 0 tri 1 shark 2 saw 3 square 4 wide 5 narrow   o3 wave: 0 tri 1 shark 2 revsaw 3 saw 4 sq 5 wide
const EnginePreset kMini[] = {
    {"Classic Bass", "BASS", -0.5, "o1r=2 o1w=2 o2r=2 o2w=2 o2f=.07 o3r=1 o3w=3 o3f=-.05 m1=1 m2=.8 m3=.6 cut=.3 emph=.35 contour=.5 fA=.03 fD=.32 fS=.25 aA=.03 aD=.15 aS=.85 decSw=1 kt1=1"},
    {"Fat Taurus", "BASS", -1.5, "o1r=1 o1w=2 o2r=2 o2w=2 o2f=.1 o3r=2 o3w=3 o3f=-.1 m1=1 m2=.9 m3=.7 fA=.03 aA=.03 cut=.24 emph=.2 contour=.42 fD=.55 fS=.3 aD=.18 aS=.9 decSw=1 kt1=1"},
    {"Funk Bass", "BASS", 1.5, "o1r=2 o1w=4 o2r=2 o2w=3 o2f=0 m1=1 m2=.6 m3on=0 fA=.03 aA=.03 cut=.22 emph=.55 contour=.62 fD=.24 fS=0 aD=.22 aS=.5 decSw=1 kt1=1"},
    {"Thump Bass", "BASS", 6, "o1r=2 o1w=0 o2r=2 o2w=2 o2f=0 m1=1 m2=.5 m3on=0 fA=.03 aA=.03 cut=.2 emph=.25 contour=.45 fD=.2 fS=0 aD=.2 aS=.15 decSw=1 kt1=1"},
    {"Glide Bass", "BASS", 2.5, "o1r=2 o1w=2 o2r=1 o2w=3 o2f=0 m1=1 m2=.7 m3on=0 fA=.03 aA=.03 cut=.28 emph=.45 contour=.5 fD=.3 fS=.15 aD=.15 aS=.8 decSw=1 kt1=1 glide=.3 glideOn=1"},
    {"Lead Bass", "BASS", 3, "o1r=2 o1w=2 o2r=3 o2w=2 o2f=.1 m1=1 m2=.7 m3on=0 fA=.03 aA=.03 cut=.38 emph=.4 contour=.45 fD=.3 fS=.35 aD=.15 aS=.85 decSw=1 kt1=1 glide=.15 glideOn=1"},
    {"Prog Lead", "LEAD", 3, "o1r=3 o1w=2 o2r=3 o2w=2 o2f=.12 o3r=3 o3w=0 o3f=4 o3lfo=1 m3on=0 m1=.9 m2=.75 cut=.52 emph=.45 contour=.35 fA=.1 fD=.5 fS=.6 aA=.03 aD=.22 aS=.95 decSw=1 kt1=1 kt2=1 glide=.35 glideOn=1 oscMod=1 modAmt=.12"},
    {"Brass Lead", "LEAD", -2, "o1r=3 o1w=2 o2r=3 o2w=2 o2f=.15 o3r=2 o3w=3 m1=.9 m2=.8 m3=.4 cut=.3 emph=.15 contour=.45 fA=.35 fD=.5 fS=.55 aA=.12 aD=.22 aS=.9 decSw=1 kt1=1 kt2=1"},
    {"Fifth Lead", "LEAD", 0.5, "o1r=3 o1w=2 o2r=3 o2w=2 o2f=7 o3r=2 o3w=3 m1=.9 m2=.6 m3=.5 aA=.03 cut=.48 emph=.4 contour=.3 fA=.05 fD=.45 fS=.55 aD=.22 aS=.9 decSw=1 kt1=1 kt2=1 glide=.25 glideOn=1"},
    {"Square Lead", "LEAD", 4, "o1r=3 o1w=3 o2r=4 o2w=3 o2f=.05 m1=.9 m2=.5 m3on=0 fA=.03 aA=.03 cut=.55 emph=.3 contour=.25 fD=.4 fS=.7 aD=.22 aS=.95 decSw=1 kt1=1 kt2=1 glide=.2 glideOn=1"},
    {"Octave Lead", "LEAD", 0, "o1r=3 o1w=1 o2r=4 o2w=2 o2f=.08 o3r=2 o3w=1 m1=.9 m2=.6 m3=.5 aA=.03 cut=.5 emph=.35 contour=.3 fA=.02 fD=.6 fS=.5 aD=.22 aS=.9 decSw=1 kt1=1 kt2=1 glide=.3 glideOn=1"},
    {"Sub Drone", "PAD", -5, "o1r=2 o1w=2 o2r=2 o2w=2 o2f=.22 o3r=1 o3w=0 m1=.9 m2=.85 m3=.7 cut=.33 emph=.3 contour=.25 fA=.55 fD=.7 fS=.6 aA=.45 aD=.75 aS=1 decSw=1 kt1=1"},
    {"Mini Pluck", "PLUCK", 8, "o1r=3 o1w=2 o2r=4 o2w=3 o2f=.07 m1=.9 m2=.5 m3on=0 fA=.03 aA=.03 cut=.25 emph=.5 contour=.6 fD=.25 fS=0 aD=.3 aS=0 decSw=1 kt1=1 kt2=1"},
    {"Wah Sweep", "FX", -5, "o1r=2 o1w=2 o2r=2 o2w=4 o2f=.1 o3r=3 o3w=0 o3f=-3 o3lfo=1 m3on=0 m1=1 m2=.8 fA=.03 aA=.03 cut=.32 emph=.7 contour=.1 fS=1 aS=1 kt1=1 filtMod=1 modAmt=.55"},
};

// ---------------------------------------------------------------- SH-101 (mono)
// range: 0 16' 1 8' 2 4' 3 2'   subMode: 0 -1 oct 1 -2 oct 2 -2 oct 25 %   pwmSrc: 0 LFO 1 MAN 2 ENV
// lfoW: 0 tri 1 square 2 S&H 3 noise   vcaMode: 0 env 1 gate   portaMode: 0 off 1 on 2 auto (legato)
const EnginePreset kSH[] = {
    {"101 Bass", "BASS", -1, "range=0 saw=.8 pulse=.3 pw=.35 pwmSrc=1 sub=.6 subMode=0 cut=.25 res=.35 env=.45 kybd=.5 A=.03 D=.35 S=.35 R=.1 porta=.15 portaMode=2"},
    {"Rubber 101", "BASS", 1.5, "range=0 saw=0 pulse=.8 pw=.4 pwmSrc=1 sub=.5 cut=.22 res=.55 env=.55 kybd=.4 A=.03 D=.3 S=0 R=.08 portaMode=2 porta=.12"},
    {"Zap Bass", "BASS", 5, "range=0 saw=.8 pulse=0 sub=.45 cut=.15 res=.6 env=.8 kybd=.5 A=.03 D=.2 S=0 R=.08 portaMode=0"},
    {"Acid 101", "BASS", 3.5, "range=0 saw=1 pulse=0 sub=.25 cut=.2 res=.8 env=.6 kybd=.5 A=.03 D=.3 S=0 R=.1 porta=.2 portaMode=2"},
    {"Deep Sub", "BASS", -3, "range=0 saw=.2 pulse=0 sub=1 subMode=1 cut=.3 res=.1 env=.2 kybd=.3 A=.03 D=.5 S=.7 R=.12 portaMode=0"},
    {"Wobble", "BASS", -4.5, "range=0 saw=.9 pulse=0 sub=.5 cut=.25 res=.6 env=.1 vcfMod=.6 lfoW=0 lfoR=.45 kybd=.4 A=.03 D=.4 S=1 R=.1 portaMode=0"},
    {"101 Lead", "LEAD", -1, "range=1 saw=.9 pulse=.3 pw=.3 pwmSrc=0 lfoR=.55 vcoMod=.1 sub=0 cut=.45 res=.5 env=.35 kybd=.7 A=.03 D=.5 S=.6 R=.2 porta=.25 portaMode=2"},
    {"PWM Lead", "LEAD", -2.5, "range=1 saw=0 pulse=.9 pw=.55 pwmSrc=0 lfoR=.35 lfoW=0 sub=.2 cut=.5 res=.3 env=.3 kybd=.7 A=.03 D=.5 S=.7 R=.25 portaMode=2 porta=.2"},
    {"Brass 101", "LEAD", -1, "range=1 saw=1 pulse=0 sub=.3 cut=.32 res=.2 env=.45 kybd=.6 A=.25 D=.5 S=.55 R=.2 portaMode=0"},
    {"Hollow Square", "LEAD", -3, "range=1 saw=0 pulse=.9 pw=0 pwmSrc=1 sub=.3 cut=.55 res=.2 env=.2 kybd=.7 A=.03 D=.4 S=.8 R=.2 portaMode=2 porta=.18"},
    {"101 Pluck", "PLUCK", 0, "range=1 saw=.7 pulse=.5 pw=.3 pwmSrc=1 sub=.2 cut=.3 res=.45 env=.6 kybd=.7 A=.03 D=.25 S=0 R=.3 portaMode=0"},
    {"S&H Bleeps", "FX", -9, "range=2 saw=.6 pulse=.5 pw=.2 pwmSrc=1 sub=0 cut=.45 res=.8 env=.1 vcfMod=.7 lfoW=2 lfoR=.7 kybd=.5 A=.03 D=.4 S=1 R=.3 portaMode=0"},
    {"Siren", "FX", -1, "range=1 saw=.8 pulse=0 sub=.3 cut=.5 res=.4 env=.1 vcoMod=.55 lfoW=0 lfoR=.4 A=.03 D=.5 S=1 R=.4 portaMode=0"},
    {"Noise Sweep", "FX", -1.5, "saw=0 pulse=0 sub=0 noise=1 cut=.3 res=.85 env=.9 kybd=0 A=.6 D=.7 S=.2 R=.6 portaMode=0"},
};

// ---------------------------------------------------------------- ACID (303, mono)
const EnginePreset kAcid[] = {
    {"Classic 303", "BASS", 1, "oct=-1 wave=0 cut=.3 res=.72 env=.6 dec=.35 acc=.7 drive=.25 dtone=.5 slide=1 st=.25"},
    {"Squelch", "BASS", 3, "oct=-1 wave=0 cut=.22 res=.88 env=.85 dec=.5 acc=.8 drive=.45 dtone=.55 slide=1 st=.3"},
    {"Rubber Acid", "BASS", 0, "oct=-1 wave=1 cut=.28 res=.65 env=.5 dec=.25 acc=.6 drive=.2 dtone=.45 slide=1 st=.2"},
    {"Distorted 303", "BASS", 4, "oct=-1 wave=0 cut=.3 res=.7 env=.55 dec=.35 acc=.8 drive=.85 dtone=.4 slide=1 st=.25"},
    {"Deep Acid", "BASS", -1, "oct=-1 wave=0 cut=.18 res=.6 env=.4 dec=.6 acc=.5 drive=.1 dtone=.3 slide=1 st=.3"},
    {"Bubble", "BASS", 1, "oct=-1 wave=1 cut=.25 res=.82 env=.7 dec=.15 acc=.6 drive=.15 dtone=.5 slide=0"},
    {"Slow Squeeze", "BASS", 1.5, "oct=-1 wave=0 cut=.26 res=.78 env=.45 dec=1 acc=.6 drive=.3 dtone=.5 slide=1 st=.4"},
    {"Clean Line", "BASS", 0.5, "oct=-1 wave=0 cut=.35 res=.5 env=.45 dec=.3 acc=.5 drive=0 dtone=.6 slide=1 st=.2"},
    {"Acid Lead", "LEAD", 3, "oct=0 wave=0 cut=.38 res=.8 env=.7 dec=.45 acc=.7 drive=.65 dtone=.7 slide=1 st=.35"},
    {"Screamer", "LEAD", 4, "oct=0 wave=0 cut=.45 res=.95 env=.9 dec=.3 acc=.9 drive=.7 dtone=.85 slide=1 st=.3"},
    {"Acid Pluck", "PLUCK", 0.5, "oct=0 wave=0 cut=.2 res=.7 env=.9 dec=.12 acc=.6 drive=.3 dtone=.6 slide=0"},
};

// ---------------------------------------------------------------- ANALOG (2 detuned oscillators, 12 dB filter)
// wave: 0 sine 1 square 2 saw 3 tri; a / d / r in seconds
const EnginePreset kAnalog[] = {
    {"Velvet Pad", "PAD", -8.5, "wave=2 cut=.38 res=.2 env=.35 a=1.2 d=1.5 s=.85 r=2.2"},
    {"Strings", "PAD", -8, "wave=2 cut=.5 res=.05 env=.15 a=.6 d=1 s=.9 r=1.4 tone=.45"},
    {"Sweep Pad", "PAD", -9.5, "wave=2 cut=.2 res=.6 env=.8 a=2 d=2 s=.6 r=2.5"},
    {"Round Bass", "BASS", -7.5, "oct=-1 wave=1 cut=.28 res=.45 env=.6 a=.002 d=.25 s=.25 r=.08"},
    {"Sine Sub", "BASS", -9, "oct=-1 wave=0 cut=.7 res=0 env=0 a=.005 d=.5 s=1 r=.1"},
    {"Mellow Bass", "BASS", -6.5, "oct=-1 wave=3 cut=.5 res=.1 env=.2 a=.003 d=.4 s=.6 r=.1"},
    {"Saw Lead", "LEAD", -4.5, "wave=2 cut=.55 res=.3 env=.4 a=.005 d=.4 s=.7 r=.25"},
    {"Square Lead", "LEAD", -10, "wave=1 cut=.6 res=.25 env=.3 a=.004 d=.3 s=.8 r=.15"},
    {"Soft Keys", "KEYS", -8.5, "wave=3 cut=.55 res=.1 env=.3 a=.003 d=.9 s=.3 r=.5"},
    {"Brass Stab", "KEYS", -5.5, "wave=2 cut=.35 res=.15 env=.75 a=.03 d=.35 s=.55 r=.2"},
    {"House Stab", "KEYS", -5.5, "wave=2 cut=.32 res=.5 env=.55 a=.002 d=.3 s=.05 r=.25"},
    {"Bright Poly", "KEYS", -6.5, "wave=2 cut=.62 res=.2 env=.35 a=.005 d=.6 s=.5 r=.4"},
    {"Reed Organ", "KEYS", -10, "wave=3 cut=.65 res=0 env=.05 a=.02 d=.5 s=1 r=.15"},
    {"Saw Pluck", "PLUCK", -2.5, "wave=2 cut=.3 res=.55 env=.85 a=.001 d=.22 s=0 r=.3"},
};

// ---------------------------------------------------------------- SUPER (7 detuned saws)
const EnginePreset kSuper[] = {
    {"Trance Pad", "PAD", -7.5, "detune=.45 attack=.3 release=.5 bright=.55 width=.9 air=.5"},
    {"Warm Strings", "PAD", -7, "detune=.25 attack=.45 release=.6 bright=.3 width=.8 air=.15 tone=.4"},
    {"Dark Pad", "PAD", -8, "detune=.3 attack=.6 release=.7 bright=.12 width=.7 air=0"},
    {"Air Choir", "PAD", -6.5, "detune=.2 attack=.5 release=.6 bright=.25 width=.8 air=1"},
    {"Shimmer", "PAD", -8.5, "oct=1 detune=.4 attack=.4 release=.8 bright=.6 width=1 air=.9"},
    {"Soft Swell", "PAD", -7.5, "detune=.3 attack=1 release=1 bright=.35 width=.85 air=.3"},
    {"Super Bass", "BASS", -11, "oct=-1 detune=.15 attack=0 release=.05 bright=.35 width=.2 air=0"},
    {"Supersaw Lead", "LEAD", -9, "detune=.35 attack=0 release=.1 bright=.7 width=.6 air=.4"},
    {"Anthem Lead", "LEAD", -8, "detune=.5 attack=0 release=.25 bright=.9 width=.8 air=.7"},
    {"Rave Stab", "KEYS", -9.5, "detune=.6 attack=0 release=.15 bright=.85 width=.9 air=.6"},
    {"Unison Keys", "KEYS", -12, "detune=.2 attack=.01 release=.2 bright=.5 width=.6 air=.3"},
    {"Detuned Chaos", "FX", -8.5, "detune=1 attack=.2 release=.6 bright=.7 width=1 air=.6"},
};

// ---------------------------------------------------------------- FM GLASS (2-operator FM)
// ratio: 0 x0.5 1 x1 2 x1.5 3 x2 4 x3 5 x3.5 6 x7
const EnginePreset kFM[] = {
    {"Glass Keys", "KEYS", -4, "ratio=3 index=.35 decay=.45 bell=.25 rel=.35 bright=.6"},
    {"DX Piano", "KEYS", -3.5, "ratio=1 index=.3 decay=.5 bell=.55 rel=.45 bright=.5"},
    {"FM Clav", "KEYS", -3.5, "ratio=4 index=.7 decay=.2 bell=.1 rel=.1 bright=.9"},
    {"FM Bass", "BASS", -1, "oct=-1 ratio=1 index=.45 decay=.3 bell=0 rel=.1 bright=.5"},
    {"Wood Bass", "BASS", -0.5, "oct=-1 ratio=0 index=.3 decay=.25 bell=0 rel=.1 bright=.4"},
    {"Crystal Pad", "PAD", -1, "ratio=3 index=.2 decay=1 bell=.1 rel=1 bright=.4"},
    {"Marimba", "PLUCK", -1, "ratio=4 index=.3 decay=.15 bell=.4 rel=.2 bright=.6"},
    {"Metal Pluck", "PLUCK", -1, "ratio=6 index=.55 decay=.12 bell=.2 rel=.15 bright=.7"},
    {"FM Bell", "BELL", -3, "ratio=5 index=.5 decay=.9 bell=.3 rel=1 bright=.7"},
    {"Music Box", "BELL", -3, "oct=1 ratio=6 index=.25 decay=.6 bell=.6 rel=.8 bright=.8"},
    {"Tubular", "BELL", -3.5, "ratio=5 index=.65 decay=1 bell=.2 rel=1 bright=.55"},
    {"Soft Vibes", "BELL", -3, "ratio=4 index=.2 decay=.7 bell=.2 rel=.9 bright=.45"},
};

// ---------------------------------------------------------------- PLUCK (Karplus-Strong string)
const EnginePreset kPluck[] = {
    {"Nylon", "PLUCK", 0.5, "damp=.6 bright=.35 body=.4 len=.5 width=.3 drive=.1 tone=.45"},
    {"Steel String", "PLUCK", 1, "damp=.75 bright=.7 body=.3 len=.65 width=.4 drive=.15 tone=.6"},
    {"Koto", "PLUCK", 3, "damp=.5 bright=.8 body=.15 len=.45 width=.2 drive=.1"},
    {"Harp", "PLUCK", 1, "damp=.85 bright=.55 body=.5 len=.8 width=.6 drive=.05"},
    {"Muted Pluck", "PLUCK", 0, "damp=.1 bright=.3 body=.6 len=.15 width=.3 drive=.2"},
    {"Kalimba", "PLUCK", 0, "damp=.4 bright=.2 body=.8 len=.4 width=.3 drive=.1"},
    {"Dream Harp", "PLUCK", 0.5, "damp=.95 bright=.45 body=.4 len=1 width=1 drive=0"},
    {"Dirty Pluck", "PLUCK", -6.5, "damp=.6 bright=.7 body=.3 len=.45 width=.4 drive=.9"},
    {"Pizzicato", "PLUCK", 2, "damp=.3 bright=.45 body=.55 len=.25 width=.5 drive=.1"},
    {"Sitar", "PLUCK", -0.5, "damp=.8 bright=1 body=.05 len=.7 width=.3 drive=.3"},
    {"Bass Pluck", "BASS", -3, "oct=-1 damp=.7 bright=.35 body=.5 len=.5 width=.1 drive=.35 tone=.4"},
};

// ---------------------------------------------------------------- CHIP (8-bit)
// duty: 0 12.5 % 1 25 % 2 50 % 3 triangle   arpm: 0 keys 1 major 2 minor 3 octave 4 off
const EnginePreset kChip[] = {
    {"NES Lead", "LEAD", 1, "duty=1 dec=.6 vib=.3 arpm=4 crush=.2"},
    {"Thin Pulse", "LEAD", 4.5, "duty=0 dec=1 vib=.4 arpm=4 crush=.2"},
    {"8-bit Crunch", "LEAD", -2.5, "duty=2 dec=.5 vib=.2 arpm=4 crush=1"},
    {"Flute", "LEAD", 0, "oct=1 duty=3 dec=.9 vib=.7 arpm=4 crush=0"},
    {"Tri Bass", "BASS", 1, "oct=-1 duty=3 dec=.8 vib=0 arpm=4 crush=.1"},
    {"Square Bass", "BASS", -2.5, "oct=-1 duty=2 dec=.4 vib=0 arpm=4 crush=.3"},
    {"Chip Pluck", "PLUCK", 5, "duty=1 dec=0 vib=0 arpm=4 crush=.3"},
    {"Major Arp", "ARP", -3.5, "duty=2 dec=.5 vib=0 arp=.7 arpm=1 crush=.3"},
    {"Minor Arp", "ARP", 1, "duty=1 dec=.5 vib=0 arp=.7 arpm=2 crush=.3"},
    {"Octave Bounce", "ARP", -3.5, "duty=2 dec=.6 vib=0 arp=.5 arpm=3 crush=.25"},
    {"Fast Arp", "ARP", 1, "duty=1 dec=.4 vib=0 arp=1 arpm=1 crush=.3"},
};

// ---------------------------------------------------------------- SUB 808 (plays an octave below the pad)
const EnginePreset kSub[] = {
    {"Trap 808", "SUB", -2, "oct=-1 decay=.7 punch=.35 drive=.35 tone=.35 glide=.3 click=.25"},
    {"Long 808", "SUB", -2, "oct=-1 decay=1 punch=.3 drive=.2 tone=.3 glide=.4 click=.15"},
    {"Punchy 808", "SUB", -2, "oct=-1 decay=.35 punch=.6 drive=.5 tone=.5 glide=0 click=.5"},
    {"Distorted 808", "SUB", -2.5, "oct=-1 decay=.65 punch=.4 drive=.95 tone=.6 glide=.25 click=.3"},
    {"Clean Sub", "SUB", -1, "oct=0 decay=.55 punch=.1 drive=0 tone=.2 glide=0 click=0"},
    {"Boom Kick", "SUB", -1.5, "oct=0 decay=.3 punch=.9 drive=.3 tone=.45 glide=0 click=.7"},
    {"Slide 808", "SUB", -2, "oct=-1 decay=.85 punch=.3 drive=.3 tone=.35 glide=.7 click=.2"},
    {"Deep Rumble", "SUB", -3, "oct=-1 decay=1 punch=.15 drive=.55 tone=.15 glide=.2 click=0"},
    {"Short Sub", "SUB", -0.5, "oct=0 decay=.15 punch=.5 drive=.2 tone=.4 glide=0 click=.3"},
    {"Tom 808", "SUB", -1, "oct=1 decay=.25 punch=.7 drive=.1 tone=.5 glide=0 click=.4"},
};

#define N(a) (int)(sizeof(a) / sizeof(a[0]))
} // namespace

// INIT (the engine defaults) levelled like the factory sounds
float engineInitTrimDb(Eng e) {
    switch (e) {
    case Eng::Mini: return 0.f;     case Eng::SH101: return -2.5f; case Eng::Acid: return 1.f;
    case Eng::Analog: return -3.5f; case Eng::Super: return -8.f;  case Eng::FM: return -2.f;
    case Eng::Pluck: return -1.5f;  case Eng::Chip: return 1.f;    case Eng::Sub: return -2.f;
    }
    return 0.f;
}

const EnginePreset* enginePresets(Eng e, int& count) {
    switch (e) {
    case Eng::Mini: count = N(kMini); return kMini;
    case Eng::SH101: count = N(kSH); return kSH;
    case Eng::Acid: count = N(kAcid); return kAcid;
    case Eng::Analog: count = N(kAnalog); return kAnalog;
    case Eng::Super: count = N(kSuper); return kSuper;
    case Eng::FM: count = N(kFM); return kFM;
    case Eng::Pluck: count = N(kPluck); return kPluck;
    case Eng::Chip: count = N(kChip); return kChip;
    case Eng::Sub: count = N(kSub); return kSub;
    }
    count = 0; return kSub;
}
#undef N

} // namespace akai
