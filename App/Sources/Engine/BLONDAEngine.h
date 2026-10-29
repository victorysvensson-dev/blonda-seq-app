// BLONDA SEQ — Objective-C bridge between SwiftUI and the C++ audio engine.
// All calls are made from the main thread; edits reach the audio thread through a lock-free command queue.
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

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
/// Number of MIDI sources currently connected.
@property (nonatomic, readonly) NSInteger midiSourceCount;

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
@property (nonatomic, readonly) NSInteger soloTrack;
- (void)copyPatternToNext;
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
- (BOOL)undo;
- (BOOL)redo;

/// The current project in the web version's JSON format (for saving / sharing with the web app).
- (NSString *)projectJSON;

/// Engine name loaded on a melodic track ("analog", "bris", "acid" ...).
- (NSString *)instrumentForTrack:(NSInteger)track;

@end

NS_ASSUME_NONNULL_END
