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
- (void)noteOn:(NSInteger)note velocity:(float)velocity track:(NSInteger)track;
- (void)noteOff:(NSInteger)note track:(NSInteger)track;

/// CoreMIDI input from every connected source (OP-1 field, OP-XY, keyboards...). Notes play `midiTrack`.
- (void)startMIDI;
@property (nonatomic) NSInteger midiTrack;
/// Number of MIDI sources currently connected.
@property (nonatomic, readonly) NSInteger midiSourceCount;

/// Engine name loaded on a melodic track ("analog", "bris", "acid" ...).
- (NSString *)instrumentForTrack:(NSInteger)track;

@end

NS_ASSUME_NONNULL_END
