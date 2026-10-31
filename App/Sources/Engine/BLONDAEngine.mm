// BLONDA SEQ — AVAudioEngine host. All the threading logic lives in blonda::Host (Core/include/blonda/host.hpp),
// which is unit-tested on Linux; this file only wires it to AVAudioSession / AVAudioSourceNode.
#import "BLONDAEngine.h"
#import <AVFoundation/AVFoundation.h>
#import <CoreMIDI/CoreMIDI.h>
#include "blonda/host.hpp"
#include <atomic>
#include <memory>

struct MIDIState { std::shared_ptr<blonda::Host> host; std::atomic<int> track{7}; std::atomic<bool> rec{false}; };

@implementation BLONDAEngine {
    AVAudioEngine *_avEngine;
    AVAudioSourceNode *_source;
    std::shared_ptr<blonda::Host> _host;
    std::shared_ptr<MIDIState> _midi;
    MIDIClientRef _client;
    MIDIPortRef _port;
}

- (instancetype)init {
    if ((self = [super init])) { _host = std::make_shared<blonda::Host>(); }
    return self;
}

- (void)dealloc {
    if (_port) MIDIPortDispose(_port);
    if (_client) MIDIClientDispose(_client);
    [_avEngine stop]; _host->shutdown();
}

- (BOOL)startAudio:(NSError **)error {
    AVAudioSession *s = [AVAudioSession sharedInstance];
    [s setCategory:AVAudioSessionCategoryPlayback mode:AVAudioSessionModeDefault options:AVAudioSessionCategoryOptionMixWithOthers error:nil];
    [s setPreferredSampleRate:48000 error:nil];
    [s setPreferredIOBufferDuration:0.005 error:nil];
    if (![s setActive:YES error:error]) return NO;
    _host->sampleRate = s.sampleRate > 0 ? (float)s.sampleRate : 48000.f;

    _avEngine = [[AVAudioEngine alloc] init];
    AVAudioFormat *fmt = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:_host->sampleRate channels:2];   // float, non-interleaved
    std::shared_ptr<blonda::Host> host = _host;
    _source = [[AVAudioSourceNode alloc] initWithFormat:fmt renderBlock:^OSStatus(BOOL *isSilence, const AudioTimeStamp *ts, AVAudioFrameCount frames, AudioBufferList *out) {
        float *L = (float *)out->mBuffers[0].mData;
        float *R = out->mNumberBuffers > 1 ? (float *)out->mBuffers[1].mData : L;
        host->render(L, R, (int)frames);
        return noErr;
    }];
    [_avEngine attachNode:_source];
    [_avEngine connect:_source to:_avEngine.mainMixerNode format:fmt];
    [_avEngine prepare];
    return [_avEngine startAndReturnError:error];
}

- (BOOL)loadProjectJSON:(NSString *)json error:(NSError **)error {
    std::string err;
    if (!_host->load(json.UTF8String, &err)) {
        if (error) *error = [NSError errorWithDomain:@"BLONDA" code:1 userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithUTF8String:err.c_str()]}];
        return NO;
    }
    return YES;
}

// ---------------------------------------------------------------- MIDI
- (void)connectAllSources {
    const ItemCount n = MIDIGetNumberOfSources();
    for (ItemCount i = 0; i < n; ++i) MIDIPortConnectSource(_port, MIDIGetSource(i), nullptr);   // connecting twice is harmless
}

- (void)startMIDI {
    if (_client) return;
    _midi = std::make_shared<MIDIState>(); _midi->host = _host;
    __weak BLONDAEngine *weakSelf = self;
    MIDIClientCreateWithBlock(CFSTR("BLONDA SEQ"), &_client, ^(const MIDINotification *msg) {
        if (msg->messageID == kMIDIMsgSetupChanged) dispatch_async(dispatch_get_main_queue(), ^{ [weakSelf connectAllSources]; });
    });
    std::shared_ptr<MIDIState> st = _midi;
    MIDIInputPortCreateWithProtocol(_client, CFSTR("in"), kMIDIProtocol_1_0, &_port, ^(const MIDIEventList *list, void *srcRef) {
        // MIDI thread: UMP MIDI 1.0 channel-voice words (type 2) -> host MIDI queue (lock-free, no allocation)
        const MIDIEventPacket *p = &list->packet[0];
        for (UInt32 i = 0; i < list->numPackets; ++i) {
            for (UInt32 w = 0; w < p->wordCount; ++w) {
                const UInt32 word = p->words[w];
                if ((word >> 28) != 0x2) continue;
                const int status = (word >> 16) & 0xF0, d1 = (word >> 8) & 0x7F, d2 = word & 0x7F;
                const int track = st->track.load(std::memory_order_relaxed);
                const bool on = status == 0x90 && d2 > 0, off = status == 0x80 || (status == 0x90 && d2 == 0);
                const float vel = .25f + .75f * d2 / 127.f;   // same curve as the web MIDI input
                if (on) st->host->midiNoteOn(track, d1, vel);
                else if (off) st->host->midiNoteOff(track, d1);
                if ((on || off) && st->rec.load(std::memory_order_relaxed)) {   // MIDI thread, not the audio thread
                    dispatch_async(dispatch_get_main_queue(), ^{
                        BLONDAEngine *s = weakSelf; if (s && s.midiNoteHandler) s.midiNoteHandler(track, d1, vel, on);
                    });
                }
            }
            p = MIDIEventPacketNext(p);
        }
    });
    [self connectAllSources];
}

- (NSInteger)midiTrack { return _midi ? _midi->track.load() : 7; }
- (void)setMidiTrack:(NSInteger)midiTrack { if (!_midi) [self startMIDI]; _midi->track.store((int)std::max<NSInteger>(0, std::min<NSInteger>(9, midiTrack))); }
- (BOOL)midiRecord { return _midi && _midi->rec.load(); }
- (void)setMidiRecord:(BOOL)on { if (!_midi) [self startMIDI]; _midi->rec.store(on); }
- (NSInteger)midiSourceCount { return (NSInteger)MIDIGetNumberOfSources(); }

- (void)togglePlay { _host->togglePlay(); }
- (BOOL)isPlaying { _host->collect(); return _host->isPlaying(); }
- (NSInteger)currentStep { return _host->currentStep(); }

- (float)bpm { return _host->ui.bpm; }
- (void)setBpm:(float)bpm { _host->setBPM(bpm); }

- (NSInteger)pattern { return _host->ui.pat; }
- (void)selectPattern:(NSInteger)pattern { _host->selectPattern((int)pattern); }

- (NSInteger)stepValueForTrack:(NSInteger)track step:(NSInteger)step { return _host->stepValue((int)track, (int)step); }
- (void)cycleStepForTrack:(NSInteger)track step:(NSInteger)step { _host->cycleStep((int)track, (int)step); }

- (void)setMuted:(BOOL)muted track:(NSInteger)track { _host->setMute((int)track, muted); }
- (BOOL)isMutedTrack:(NSInteger)track { return track >= 0 && track < blonda::kTracks && _host->ui.mute[track]; }

- (void)noteOn:(NSInteger)note velocity:(float)velocity track:(NSInteger)track { _host->noteOn((int)track, (int)note, velocity); }
- (void)noteOff:(NSInteger)note track:(NSInteger)track { _host->noteOff((int)track, (int)note); }

- (float)paramGroup:(NSInteger)group track:(NSInteger)track field:(NSInteger)field { return _host->param((int)group, (int)track, (int)field); }
- (void)setParam:(float)value group:(NSInteger)group track:(NSInteger)track field:(NSInteger)field { _host->setParam((int)group, (int)track, (int)field, value); }

- (NSInteger)hitsForTrack:(NSInteger)track { return track >= 0 && track < blonda::kTracks ? _host->hits((int)track) : 0; }
- (NSInteger)lengthForTrack:(NSInteger)track { return track >= 0 && track < blonda::kTracks ? _host->trackLen((int)track) : 16; }
- (NSInteger)rotationForTrack:(NSInteger)track { return _host->rotation((int)track); }
- (void)setLength:(NSInteger)length track:(NSInteger)track { _host->setLen((int)track, (int)length); }
- (void)euclid:(NSInteger)hits track:(NSInteger)track { _host->euclid((int)track, (int)hits); }
- (void)rotate:(NSInteger)delta track:(NSInteger)track { _host->rotate((int)track, (int)delta); }
- (void)shiftTrack:(NSInteger)track { _host->shift((int)track); }
- (void)clearTrack:(NSInteger)track { _host->clearTrack((int)track); }
- (void)variationTrack:(NSInteger)track { _host->variation((int)track, arc4random()); }
- (void)toggleSoloTrack:(NSInteger)track { _host->setSolo((int)track); }
- (NSInteger)soloTrack { return _host->solo(); }
- (void)copyPatternToNext { _host->copyPatternToNext(); }
- (BOOL)patternHasSteps:(NSInteger)p { return _host->patternHasSteps((int)p); }
- (NSString *)rollDice:(NSInteger)n { return [NSString stringWithUTF8String:_host->dice((int)n, arc4random()).c_str()]; }
- (void)setInstrument:(NSString *)name track:(NSInteger)track { if (track >= 6 && track <= 9) _host->setInstrument((int)track - 6, name.UTF8String); }
- (float)engineParam:(NSInteger)f engine:(NSInteger)e track:(NSInteger)t { return (t >= 6 && t <= 9) ? _host->engParam((int)t - 6, (int)e, (int)f) : 0.f; }
- (void)setEngineParam:(NSInteger)f engine:(NSInteger)e track:(NSInteger)t value:(float)v { if (t >= 6 && t <= 9) _host->setEngParam((int)t - 6, (int)e, (int)f, v); }
- (NSInteger)engineOption:(NSInteger)f engine:(NSInteger)e track:(NSInteger)t { return (t >= 6 && t <= 9) ? _host->engOption((int)t - 6, (int)e, (int)f) : 0; }
- (void)setEngineOption:(NSInteger)f engine:(NSInteger)e track:(NSInteger)t value:(NSInteger)v { if (t >= 6 && t <= 9) _host->setEngOption((int)t - 6, (int)e, (int)f, (int)v); }
- (BOOL)songMode { return _host->song(); }
- (void)setSongMode:(BOOL)on { _host->setSong(on); }
- (NSInteger)chainSlot:(NSInteger)k { return _host->chain((int)k); }
- (void)setChainSlot:(NSInteger)k pattern:(NSInteger)p { _host->setChain((int)k, (int)p); }
- (NSInteger)chainIndex { return _host->chainIndex(); }
- (BOOL)followSong { return _host->followSong(); }
- (void)performActive:(BOOL)on filter:(float)f fx:(float)fx { _host->perform(on, f, fx); }
- (void)beatRepeat:(NSInteger)mode division:(NSInteger)div { _host->beatRepeat((int)mode, (int)div); }
- (float)fxValue:(NSInteger)f { return _host->fx((int)f); }
- (void)setFxValue:(NSInteger)f value:(float)v { _host->setFx((int)f, v); }
- (void)rebuildReverb { _host->rebuildReverb(); _host->collect(); }
- (double)sampleRate { return _host->sampleRate; }
- (void)addSample:(NSString *)sid left:(NSData *)l right:(NSData *)r frames:(NSInteger)n {
    const NSInteger m = MIN(n, (NSInteger)MIN(l.length, r.length) / (NSInteger)sizeof(float));
    _host->addSample(sid.UTF8String, (const float *)l.bytes, (const float *)r.bytes, (int)m);
}
- (BOOL)hasSample:(NSString *)sid { return _host->hasSample(sid.UTF8String); }
- (void)removeSample:(NSString *)sid { _host->removeSample(sid.UTF8String); _host->collect(); }
- (void)previewSample:(NSString *)sid rate:(float)rate gain:(float)gain { _host->previewSample(sid.UTF8String, rate, gain); }
- (NSString *)loopSample:(NSInteger)k { return [NSString stringWithUTF8String:_host->loop((int)k).sid.c_str()]; }
- (BOOL)loopOn:(NSInteger)k { return _host->loop((int)k).on; }
- (float)loopVolume:(NSInteger)k { return _host->loop((int)k).vol; }
- (NSInteger)loopBars:(NSInteger)k { return _host->loop((int)k).bars; }
- (void)assignLoop:(NSInteger)k sample:(NSString *)sid { _host->assignLoop((int)k, sid.UTF8String); }
- (void)bindLoop:(NSInteger)k sourceBPM:(float)bpm bars:(NSInteger)bars norm:(float)norm { _host->bindLoop((int)k, bpm, (int)bars, norm); }
- (void)setLoop:(NSInteger)k on:(BOOL)on { _host->setLoopOn((int)k, on); }
- (void)setLoop:(NSInteger)k volume:(float)v { _host->setLoopVol((int)k, v); }
- (void)setLoop:(NSInteger)k bars:(NSInteger)bars { _host->setLoopBars((int)k, (int)bars); }
- (NSString *)drumSample:(NSInteger)t { return [NSString stringWithUTF8String:_host->drumSample((int)t).c_str()]; }
- (void)assignDrum:(NSInteger)t sample:(NSString *)sid { _host->assignDrum((int)t, sid.UTF8String); }
- (NSString *)kit:(NSInteger)t { return [NSString stringWithUTF8String:_host->kit((int)t).c_str()]; }
- (void)setKit:(NSString *)name track:(NSInteger)t { _host->setKit((int)t, name.UTF8String); }
- (void)bindDrum:(NSInteger)t norm:(float)norm { _host->bindDrum((int)t, norm); }
- (float)stepVelocity:(NSInteger)t step:(NSInteger)s { return _host->stepVel((int)t, (int)s); }
- (NSInteger)stepRatchet:(NSInteger)t step:(NSInteger)s { return _host->stepRatchet((int)t, (int)s); }
- (float)stepProbability:(NSInteger)t step:(NSInteger)s { return _host->stepProb((int)t, (int)s); }
- (void)setStepVelocity:(float)v track:(NSInteger)t step:(NSInteger)s { _host->setStepVel((int)t, (int)s, v); }
- (void)setStepRatchet:(NSInteger)r track:(NSInteger)t step:(NSInteger)s { _host->setStepRatchet((int)t, (int)s, (int)r); }
- (float)stepNudge:(NSInteger)t step:(NSInteger)s { return _host->stepNudge((int)t, (int)s); }
- (void)setStepNudge:(float)o track:(NSInteger)t step:(NSInteger)s { _host->setStepNudge((int)t, (int)s, o); }
- (NSInteger)nudgeStep:(NSInteger)t step:(NSInteger)s by:(float)o { return _host->nudgeStep((int)t, (int)s, o); }
- (void)setStepProbability:(float)p track:(NSInteger)t step:(NSInteger)s { _host->setStepProb((int)t, (int)s, p); }
- (void)toggleAccent:(NSInteger)t step:(NSInteger)s { _host->toggleAccent((int)t, (int)s); }
- (void)clearStep:(NSInteger)t step:(NSInteger)s { _host->clearStep((int)t, (int)s); }
- (void)pushUndo { _host->pushHist(); }
- (NSData *)rollData:(NSInteger)t {
    const auto& R = _host->rollNotes((int)t);
    NSMutableData *d = [NSMutableData dataWithLength:R.size() * sizeof(BLRollNote)];
    BLRollNote *o = (BLRollNote *)d.mutableBytes;
    for (size_t i = 0; i < R.size(); ++i) o[i] = {R[i].s, R[i].l, R[i].n, R[i].v, R[i].g};
    return d;
}
- (void)setRollData:(NSData *)data track:(NSInteger)t {
    const BLRollNote *in = (const BLRollNote *)data.bytes; const size_t n = data.length / sizeof(BLRollNote);
    std::vector<blonda::RollNote> R(n);
    for (size_t i = 0; i < n; ++i) { R[i].s = in[i].s; R[i].l = in[i].l; R[i].n = in[i].n; R[i].v = in[i].v; R[i].g = in[i].g; }
    _host->setRollNotes((int)t, R);
}
- (float)glideTime { return _host->glideTime(); }
- (void)setGlideTime:(float)v { _host->setGlideTime(v); }
- (BOOL)chordOn:(NSInteger)t { return _host->chordOn((int)t); }
- (void)setChord:(BOOL)on track:(NSInteger)t { _host->setChord((int)t, on); }
+ (NSInteger)motorParamCount { return blonda::bris::kNumParams; }
+ (NSInteger)motorPresetCount { return blonda::bris::kNumPresets; }
+ (NSString *)motorParamId:(NSInteger)p { return (p >= 0 && p < blonda::bris::kNumParams) ? @(blonda::bris::kParams[p].id) : @""; }
+ (NSString *)motorParamName:(NSInteger)p { return (p >= 0 && p < blonda::bris::kNumParams) ? @(blonda::bris::kParams[p].name) : @""; }
+ (double)motorParamMin:(NSInteger)p { return (p >= 0 && p < blonda::bris::kNumParams) ? blonda::bris::kParams[p].min : 0; }
+ (double)motorParamMax:(NSInteger)p { return (p >= 0 && p < blonda::bris::kNumParams) ? blonda::bris::kParams[p].max : 1; }
+ (BOOL)motorParamInteger:(NSInteger)p { return (p >= 0 && p < blonda::bris::kNumParams) ? blonda::bris::kParams[p].integer : NO; }
+ (NSString *)motorPresetName:(NSInteger)i { return (i >= 0 && i < blonda::bris::kNumPresets) ? @(blonda::bris::kPresets[i].name) : @""; }
- (NSInteger)motorPreset:(NSInteger)t { return (t >= 6 && t <= 9) ? _host->motorPreset((int)t - 6) : 0; }
- (void)setMotorPreset:(NSInteger)i track:(NSInteger)t { if (t >= 6 && t <= 9) _host->setMotorPreset((int)t - 6, (int)i); }
- (double)motorParam:(NSInteger)p track:(NSInteger)t { return (t >= 6 && t <= 9) ? _host->motorParam((int)t - 6, (int)p) : 0; }
- (void)setMotorParam:(NSInteger)p track:(NSInteger)t value:(double)v { if (t >= 6 && t <= 9) _host->setMotorParam((int)t - 6, (int)p, v); }
- (float)motorMeter:(NSInteger)t { return (t >= 6 && t <= 9) ? _host->motorMeter((int)t - 6) : 0; }
- (void)glitchHold:(NSInteger)fx { _host->glitchHold((int)fx); }
- (float)glitchAmount { return _host->glitchAmt(); }
- (void)setGlitchAmount:(float)a { _host->setGlitchAmt(a); }
- (NSInteger)glitchMask { return _host->glitchMask(); }
- (void)setGlitchMask:(NSInteger)m { _host->setGlitchMask((int)m); }
- (NSInteger)glitchActive { return _host->glitchActive(); }
- (NSInteger)scopeLeft:(float *)left right:(float *)right count:(NSInteger)count { return _host->scope(left, right, (int)count); }
- (NSInteger)world { return _host->world(); }
- (void)setWorld:(NSInteger)w { _host->setWorld((int)w); }
- (BOOL)undo { return _host->undo(); }
- (BOOL)redo { return _host->redo(); }

- (NSString *)projectJSON { return [NSString stringWithUTF8String:_host->toJSON().c_str()]; }

- (NSString *)instrumentForTrack:(NSInteger)track {
    if (track < 6 || track > 9) return @"drum";
    return [NSString stringWithUTF8String:_host->ui.inst[track - 6].c_str()];
}

@end
