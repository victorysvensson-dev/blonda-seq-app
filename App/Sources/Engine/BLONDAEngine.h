// BLONDA SEQ — Objective-C bridge between SwiftUI and the C++ audio engine.
// All calls are made from the main thread; edits reach the audio thread through a lock-free command queue.
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// One piano-roll note as packed in rollData: start and length in steps, MIDI note, velocity, glide target index (-1 none).
typedef struct { float s; float l; int32_t n; float v; int32_t g; } BLRollNote;

@interface BLONDAEngine : NSObject

/// Starts the audio session + engine (48 kHz preferred, ~5 ms buffers).
- (BOOL)startAudio:(NSError * _Nullable * _Nullable)error;
/// Loads a project in the web version's JSON format (the same "S" object SEQ.3 saves).
- (BOOL)loadProjectJSON:(NSString *)json error:(NSError * _Nullable * _Nullable)error;

- (void)togglePlay;
@property (nonatomic, readonly) BOOL isPlaying;
/// Step currently heard (0-15) or -1 when stopped. Safe to poll from the UI.
@property (nonatomic, readonly) NSInteger currentStep;

@property (nonatomic) float bpm;
@property (nonatomic, readonly) NSInteger pattern;
- (void)selectPattern:(NSInteger)pattern;

/// Step value for drums (0 off, 1 on, 2 accent) / melodic step occupancy, for the current pattern.
- (NSInteger)stepValueForTrack:(NSInteger)track step:(NSInteger)step;
/// Cycles a step: off -> on -> accent -> off. Melodic tracks get a one-step note.
- (void)cycleStepForTrack:(NSInteger)track step:(NSInteger)step;
- (void)setMuted:(BOOL)muted track:(NSInteger)track;
- (BOOL)isMutedTrack:(NSInteger)track;

/// Live notes from the on-screen keyboard or MIDI (track 0-5 drums, 6-9 bass/keys/lead/pad).
- (void)noteOn:(NSInteger)note velocity:(float)velocity track:(NSInteger)track NS_SWIFT_NAME(noteOn(_:velocity:track:));
- (void)noteOff:(NSInteger)note track:(NSInteger)track NS_SWIFT_NAME(noteOff(_:track:));

/// CoreMIDI input from every connected source (OP-1 field, OP-XY, keyboards...). Notes play `midiTrack`.
- (void)startMIDI;
@property (nonatomic) NSInteger midiTrack;
/// While true, every MIDI note is also reported on the main thread (for recording into the pattern).
@property (nonatomic) BOOL midiRecord;
@property (nonatomic, copy, nullable) void (^midiNoteHandler)(NSInteger track, NSInteger note, float velocity, BOOL on);
/// Number of MIDI sources currently connected.
@property (nonatomic, readonly) NSInteger midiSourceCount;
/// MIDI devices: each {"id": uniqueID, "name": display name}.
@property (nonatomic, readonly) NSArray<NSDictionary<NSString *, id> *> *midiInputs;
@property (nonatomic, readonly) NSArray<NSDictionary<NSString *, id> *> *midiOutputs;
/// Which input plays (0 = all), which output gets clock / notes (0 = none).
@property (nonatomic) NSInteger midiInputID;
@property (nonatomic) NSInteger midiOutputID;
/// Follow an external MIDI clock (tempo, start, stop); send clock (24 per beat, start/stop); send the sequenced notes
/// (bass ch 1, keys 2, lead 3, pad 4, drums ch 10 with GM notes).
@property (nonatomic) BOOL midiFollowClock;
@property (nonatomic) BOOL midiSendClock;
@property (nonatomic) BOOL midiSendNotes;
/// Main thread: the tempo of an external clock (when following), start (YES) / stop (NO) from it, devices changed.
@property (nonatomic, copy, nullable) void (^midiClockHandler)(double bpm);
@property (nonatomic, copy, nullable) void (^midiTransportHandler)(BOOL start);
@property (nonatomic, copy, nullable) void (^midiSetupHandler)(void);
/// Seconds since the last MIDI message came in (large when nothing has).
@property (nonatomic, readonly) double midiIdleSeconds;
/// Audio: buffer size in frames (64 … 1024), the real one after the system answered, output route and latency.
@property (nonatomic) NSInteger ioBufferFrames;
@property (nonatomic, readonly) NSString *outputName;
@property (nonatomic, readonly) double outputLatency;

/// Sound parameters. group 0 = track (level tune decay tone pan echo space), 1 = track FX (drive filt reso crush comp pump),
/// 2 = master (filter echo space drive pump swing vol; track ignored). Values use the web version's ranges.
- (float)paramGroup:(NSInteger)group track:(NSInteger)track field:(NSInteger)field NS_SWIFT_NAME(param(group:track:field:));
- (void)setParam:(float)value group:(NSInteger)group track:(NSInteger)track field:(NSInteger)field NS_SWIFT_NAME(setParam(_:group:track:field:));

/// Track editing (orbit + grid actions). All undoable.
- (NSInteger)hitsForTrack:(NSInteger)track NS_SWIFT_NAME(hits(track:));
- (NSInteger)lengthForTrack:(NSInteger)track NS_SWIFT_NAME(length(track:));
- (NSInteger)rotationForTrack:(NSInteger)track NS_SWIFT_NAME(rotation(track:));
- (void)setLength:(NSInteger)length track:(NSInteger)track NS_SWIFT_NAME(setLength(_:track:));
- (void)euclid:(NSInteger)hits track:(NSInteger)track NS_SWIFT_NAME(euclid(_:track:));
- (void)rotate:(NSInteger)delta track:(NSInteger)track NS_SWIFT_NAME(rotate(_:track:));
- (void)shiftTrack:(NSInteger)track NS_SWIFT_NAME(shift(track:));
- (void)clearTrack:(NSInteger)track NS_SWIFT_NAME(clear(track:));
- (void)variationTrack:(NSInteger)track NS_SWIFT_NAME(variation(track:));
- (void)toggleSoloTrack:(NSInteger)track NS_SWIFT_NAME(toggleSolo(track:));
/// Several channels can be soloed at once.
- (BOOL)isSoloTrack:(NSInteger)track NS_SWIFT_NAME(isSolo(track:));
/// Buses: 0 trummor (1–6), 1 synth (7–10), 2 loopar. flag 0 = mute, 1 = solo.
- (BOOL)busFlag:(NSInteger)bus flag:(NSInteger)flag NS_SWIFT_NAME(busFlag(_:flag:));
- (void)setBusFlag:(NSInteger)bus flag:(NSInteger)flag on:(BOOL)on NS_SWIFT_NAME(setBusFlag(_:flag:on:));
/// Pump on synth (1) / loopar (2): src 0 follow kick, 1 beat every `rate` 16ths; shape / rel < 0 = classic; amt = loopar amount (synth: master pump).
- (NSDictionary<NSString *, NSNumber *> *)busPump:(NSInteger)bus NS_SWIFT_NAME(busPump(_:));
- (void)setBusPump:(NSInteger)bus src:(NSInteger)src rate:(NSInteger)rate shape:(float)shape rel:(float)rel amt:(float)amt NS_SWIFT_NAME(setBusPump(_:src:rate:shape:rel:amt:));
- (float)pumpCurve:(NSInteger)bus at:(float)u NS_SWIFT_NAME(pumpCurve(_:at:));
- (float)pumpRelease:(NSInteger)bus NS_SWIFT_NAME(pumpRelease(_:));
/// Meters: dB of gain reduction in the master glue + limiter, peak of each bus (linear).
@property (nonatomic, readonly) float masterGR;
- (float)busPeak:(NSInteger)bus NS_SWIFT_NAME(busPeak(_:));
@property (nonatomic, readonly) NSInteger soloTrack;
- (void)copyPatternToNext;
- (BOOL)patternHasSteps:(NSInteger)p NS_SWIFT_NAME(patternHasSteps(_:));
/// The musical dice (1–6). Returns what it did, e.g. "nytt groove · ny bas och melodi · Am – F".
- (NSString *)rollDice:(NSInteger)n NS_SWIFT_NAME(rollDice(_:));
- (void)setInstrument:(NSString *)name track:(NSInteger)track NS_SWIFT_NAME(setInstrument(_:track:));
/// Synth module: engine parameter f (0..1, fm ratio 0..6) of engine e (index in analog, acid, sub, fm, pluck, super, chip, sh101, mini, bris) on melodic track 6..9.
- (float)engineParam:(NSInteger)field engine:(NSInteger)e track:(NSInteger)track NS_SWIFT_NAME(engineParam(_:engine:track:));
- (void)setEngineParam:(NSInteger)field engine:(NSInteger)e track:(NSInteger)track value:(float)v NS_SWIFT_NAME(setEngineParam(_:engine:track:value:));
- (NSInteger)engineOption:(NSInteger)field engine:(NSInteger)e track:(NSInteger)track NS_SWIFT_NAME(engineOption(_:engine:track:));
- (void)setEngineOption:(NSInteger)field engine:(NSInteger)e track:(NSInteger)track value:(NSInteger)v NS_SWIFT_NAME(setEngineOption(_:engine:track:value:));
/// Song mode: a chain of 8 slots (pattern 0–3 or -1 = empty) played one bar each.
@property (nonatomic) BOOL songMode;
- (NSInteger)chainSlot:(NSInteger)k NS_SWIFT_NAME(chainSlot(_:));
- (void)setChainSlot:(NSInteger)k pattern:(NSInteger)p NS_SWIFT_NAME(setChainSlot(_:pattern:));
/// The slot playing right now (-1 when song mode is off or stopped).
@property (nonatomic, readonly) NSInteger chainIndex;
/// Call once per frame: in song mode the pattern on screen follows the playing one. YES when it changed.
- (BOOL)followSong;
/// Live: XY performance (filter −1..1 = lowpass…highpass, fx 0..1 = echo + space throw); on = NO releases it.
- (void)performActive:(BOOL)on filter:(float)f fx:(float)fx NS_SWIFT_NAME(perform(active:filter:fx:));
/// Beat repeat: mode 1 engage, 2 change length, 0 release; division 0..8 = 1/2 1/4 1/8 1/8T 1/16 1/16T 1/32 1/32T 1/64.
- (void)beatRepeat:(NSInteger)mode division:(NSInteger)div NS_SWIFT_NAME(beatRepeat(_:division:));
/// Plugins: 0 echo on, 1 echo feedback, 2 echo time, 3 space on, 4 space size, 5 tape on, 6 tape colour, 7 crush on, 8 crush bits, 9 crush mix.
- (float)fxValue:(NSInteger)field NS_SWIFT_NAME(fxValue(_:));
- (void)setFxValue:(NSInteger)field value:(float)v NS_SWIFT_NAME(setFxValue(_:value:));
/// Builds the reverb for the current space size (allocates; call after the size settles).
- (void)rebuildReverb;
/// Samples. Audio is handed over at the engine's sample rate (see `sampleRate`).
@property (nonatomic, readonly) double sampleRate;
- (void)addSample:(NSString *)sid left:(NSData *)left right:(NSData *)right frames:(NSInteger)frames NS_SWIFT_NAME(addSample(_:left:right:frames:));
- (BOOL)hasSample:(NSString *)sid NS_SWIFT_NAME(hasSample(_:));
- (void)removeSample:(NSString *)sid NS_SWIFT_NAME(removeSample(_:));
- (void)previewSample:(NSString *)sid rate:(float)rate gain:(float)gain NS_SWIFT_NAME(previewSample(_:rate:gain:));
- (NSString *)loopSample:(NSInteger)k NS_SWIFT_NAME(loopSample(_:));
- (BOOL)loopOn:(NSInteger)k NS_SWIFT_NAME(loopOn(_:));
- (float)loopVolume:(NSInteger)k NS_SWIFT_NAME(loopVolume(_:));
- (NSInteger)loopBars:(NSInteger)k NS_SWIFT_NAME(loopBars(_:));
- (void)assignLoop:(NSInteger)k sample:(NSString *)sid NS_SWIFT_NAME(assignLoop(_:sample:));
- (void)bindLoop:(NSInteger)k sourceBPM:(float)bpm bars:(NSInteger)bars norm:(float)norm NS_SWIFT_NAME(bindLoop(_:sourceBPM:bars:norm:));
- (void)setLoop:(NSInteger)k on:(BOOL)on NS_SWIFT_NAME(setLoop(_:on:));
- (void)setLoop:(NSInteger)k volume:(float)v NS_SWIFT_NAME(setLoop(_:volume:));
- (void)setLoop:(NSInteger)k bars:(NSInteger)bars NS_SWIFT_NAME(setLoop(_:bars:));
- (NSString *)drumSample:(NSInteger)track NS_SWIFT_NAME(drumSample(_:));
- (void)assignDrum:(NSInteger)track sample:(NSString *)sid NS_SWIFT_NAME(assignDrum(_:sample:));
/// Synth drum kit of a drum track: "" = blonda, "808", "909", "conga" … (a sample shows as "smp:<id>").
- (NSString *)kit:(NSInteger)track NS_SWIFT_NAME(kit(_:));
- (void)setKit:(NSString *)name track:(NSInteger)track NS_SWIFT_NAME(setKit(_:track:));
- (void)bindDrum:(NSInteger)track norm:(float)norm NS_SWIFT_NAME(bindDrum(_:norm:));
/// Step inspector (current pattern).
- (float)stepVelocity:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(stepVelocity(_:step:));
- (NSInteger)stepRatchet:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(stepRatchet(_:step:));
- (float)stepProbability:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(stepProbability(_:step:));
- (void)setStepVelocity:(float)v track:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(setStepVelocity(_:track:step:));
- (void)setStepRatchet:(NSInteger)r track:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(setStepRatchet(_:track:step:));
/// Nudge of one step: share of a step, -0.5 (early) … +0.5 (late).
- (float)stepNudge:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(stepNudge(_:step:));
- (void)setStepNudge:(float)o track:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(setStepNudge(_:track:step:));
/// Like setStepNudge, but past half a step the step moves into the free neighbour; returns the step it is on now.
- (NSInteger)nudgeStep:(NSInteger)track step:(NSInteger)s by:(float)o NS_SWIFT_NAME(nudgeStep(_:step:by:));
- (void)setStepProbability:(float)p track:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(setStepProbability(_:track:step:));
- (void)toggleAccent:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(toggleAccent(_:step:));
- (void)clearStep:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(clearStep(_:step:));
- (void)pushUndo;
/// Piano roll (current pattern, tracks 6–9): BLRollNote array.
- (NSData *)rollData:(NSInteger)track NS_SWIFT_NAME(rollData(_:));
- (void)setRollData:(NSData *)data track:(NSInteger)track NS_SWIFT_NAME(setRollData(_:track:));
@property (nonatomic) float glideTime;
- (BOOL)chordOn:(NSInteger)track NS_SWIFT_NAME(chordOn(_:));
- (void)setChord:(BOOL)on track:(NSInteger)track NS_SWIFT_NAME(setChord(_:track:));
/// BLONDA motor (engine "bris6", shared library External/blonda-motor) on melodic track 6–9.
@property (class, nonatomic, readonly) NSInteger motorParamCount;
@property (class, nonatomic, readonly) NSInteger motorPresetCount;
+ (NSString *)motorParamId:(NSInteger)p NS_SWIFT_NAME(motorParamId(_:));
+ (NSString *)motorParamName:(NSInteger)p NS_SWIFT_NAME(motorParamName(_:));
+ (double)motorParamMin:(NSInteger)p NS_SWIFT_NAME(motorParamMin(_:));
+ (double)motorParamMax:(NSInteger)p NS_SWIFT_NAME(motorParamMax(_:));
+ (BOOL)motorParamInteger:(NSInteger)p NS_SWIFT_NAME(motorParamInteger(_:));
+ (NSString *)motorPresetName:(NSInteger)i NS_SWIFT_NAME(motorPresetName(_:));
- (NSInteger)motorPreset:(NSInteger)track NS_SWIFT_NAME(motorPreset(_:));
- (void)setMotorPreset:(NSInteger)i track:(NSInteger)track NS_SWIFT_NAME(setMotorPreset(_:track:));
- (double)motorParam:(NSInteger)p track:(NSInteger)track NS_SWIFT_NAME(motorParam(_:track:));
- (void)setMotorParam:(NSInteger)p track:(NSInteger)track value:(double)v NS_SWIFT_NAME(setMotorParam(_:track:value:));
- (float)motorMeter:(NSInteger)track NS_SWIFT_NAME(motorMeter(_:));
/// BLONDA GLITCH: hold an effect (1 stutter … 7 gate, 0 let go), auto chance 0…1, which effects auto may use (bits).
- (void)glitchHold:(NSInteger)fx NS_SWIFT_NAME(glitchHold(_:));
/// Several glitch pads held at once: src 1–5 (stutter … halv, 0 none) plays, mods bit 6 crush / bit 7 gate on top.
- (void)glitchHoldSource:(NSInteger)src mods:(NSInteger)mods NS_SWIFT_NAME(glitchHold(source:mods:));
/// Which glitch effects sound right now (bit fx).
@property (nonatomic, readonly) NSInteger glitchActiveMask;
/// Sample editor on drum track 0–5 (web: S.se): start/end 0…1, fades in ms, gain dB, reverse.
- (NSDictionary<NSString *, NSNumber *> *)sampleEdit:(NSInteger)track NS_SWIFT_NAME(sampleEdit(_:));
- (void)setSampleEdit:(NSDictionary<NSString *, NSNumber *> *)e track:(NSInteger)track NS_SWIFT_NAME(setSampleEdit(_:track:));
- (void)resetSampleEdit:(NSInteger)track NS_SWIFT_NAME(resetSampleEdit(_:));
/// Chop (web: S.chop): slice starts 0…1 on drum track 0–5; empty = not chopped.
- (NSArray<NSNumber *> *)chopCuts:(NSInteger)track NS_SWIFT_NAME(chopCuts(_:));
- (void)setChopCuts:(NSArray<NSNumber *> *)cuts track:(NSInteger)track NS_SWIFT_NAME(setChopCuts(_:track:));
/// Cuts for a sample: mode 0 = one per hit, otherwise that many equal parts.
- (NSArray<NSNumber *> *)chopAuto:(NSString *)sid mode:(NSInteger)mode NS_SWIFT_NAME(chopAuto(_:mode:));
- (void)chopToPattern:(NSInteger)track bars:(NSInteger)bars NS_SWIFT_NAME(chopToPattern(_:bars:));
/// Which slice a drum step plays (-1 = its own step number).
- (NSInteger)stepSlice:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(stepSlice(_:step:));
- (void)setStepSlice:(NSInteger)c track:(NSInteger)track step:(NSInteger)s NS_SWIFT_NAME(setStepSlice(_:track:step:));
/// Sample data for drawing: length in seconds, min/max per column, hits (seconds), nearest zero crossing.
- (double)sampleSeconds:(NSString *)sid NS_SWIFT_NAME(sampleSeconds(_:));
- (NSInteger)samplePeaks:(NSString *)sid from:(double)t0 to:(double)t1 columns:(NSInteger)cols min:(float *)mn max:(float *)mx NS_SWIFT_NAME(samplePeaks(_:from:to:columns:min:max:));
- (NSArray<NSNumber *> *)sampleOnsets:(NSString *)sid NS_SWIFT_NAME(sampleOnsets(_:));
- (double)sampleZeroCross:(NSString *)sid at:(double)t NS_SWIFT_NAME(sampleZeroCross(_:at:));
@property (nonatomic) float glitchAmount;
@property (nonatomic) NSInteger glitchMask;
@property (nonatomic, readonly) NSInteger glitchActive;
/// The last `count` master output samples (≤ 8192), oldest first — for the yellow master deck.
- (NSInteger)scopeLeft:(float *)left right:(float *)right count:(NSInteger)count;
/// Colour world of the project (web: S.world).
@property (nonatomic) NSInteger world;
- (BOOL)undo;
- (BOOL)redo;

/// The current project in the web version's JSON format (for saving / sharing with the web app).
- (NSString *)projectJSON;

/// Engine name loaded on a melodic track ("analog", "bris", "acid" ...).
- (NSString *)instrumentForTrack:(NSInteger)track;

@end

NS_ASSUME_NONNULL_END
