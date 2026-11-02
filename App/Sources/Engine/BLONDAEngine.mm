// BLONDA SEQ — AVAudioEngine host. All the threading logic lives in blonda::Host (Core/include/blonda/host.hpp),
// which is unit-tested on Linux; this file only wires it to AVAudioSession / AVAudioSourceNode.
#import "BLONDAEngine.h"
#import <AVFoundation/AVFoundation.h>
#import <CoreMIDI/CoreMIDI.h>
#include "blonda/host.hpp"
#include <atomic>
#include <memory>

#include <mach/mach_time.h>
struct MIDIState {
    std::shared_ptr<blonda::Host> host; std::atomic<int> track{7}; std::atomic<bool> rec{false};
    std::atomic<bool> follow{false}, sendClock{false}, sendNotes{false};
    std::atomic<uint64_t> lastMsg{0};
    // clock in (MIDI thread only)
    uint64_t lastTick = 0; double iv[48] = {}; int ivN = 0, ivW = 0, tickN = 0; double lastBpm = 0;
    // audio clock: engine frame at the start of the last block and its host time (written by the audio thread)
    std::atomic<long long> blockFrame{0}; std::atomic<uint64_t> blockHost{0}; std::atomic<double> sr{48000}, latency{0};
};
static double hostSeconds(uint64_t t) { static mach_timebase_info_data_t tb; if (!tb.denom) mach_timebase_info(&tb); return (double)t * tb.numer / tb.denom / 1e9; }
static uint64_t hostTicks(double s) { static mach_timebase_info_data_t tb; if (!tb.denom) mach_timebase_info(&tb); return (uint64_t)(s * 1e9 * tb.denom / tb.numer); }

@implementation BLONDAEngine {
    AVAudioEngine *_avEngine;
    AVAudioSourceNode *_source;
    std::shared_ptr<blonda::Host> _host;
    std::shared_ptr<MIDIState> _midi;
    MIDIClientRef _client;
    MIDIPortRef _port, _outPort;
    MIDIEndpointRef _dest;
    dispatch_source_t _outTimer;
    NSInteger _inputID, _outputID;
}

- (instancetype)init {
    if ((self = [super init])) { _host = std::make_shared<blonda::Host>(); }
    return self;
}

- (void)dealloc {
    if (_outTimer) dispatch_source_cancel(_outTimer);
    if (_port) MIDIPortDispose(_port);
    if (_client) MIDIClientDispose(_client);
    [_avEngine stop]; _host->shutdown();
}

- (BOOL)startAudio:(NSError **)error {
    AVAudioSession *s = [AVAudioSession sharedInstance];
    [s setCategory:AVAudioSessionCategoryPlayback mode:AVAudioSessionModeDefault options:AVAudioSessionCategoryOptionMixWithOthers error:nil];
    [s setPreferredSampleRate:48000 error:nil];
    { const NSInteger b = [NSUserDefaults.standardUserDefaults integerForKey:@"ioBuffer"]; [s setPreferredIOBufferDuration:(b > 0 ? (double)b / 48000.0 : 0.005) error:nil]; }
    if (![s setActive:YES error:error]) return NO;
    _host->sampleRate = s.sampleRate > 0 ? (float)s.sampleRate : 48000.f;

    _avEngine = [[AVAudioEngine alloc] init];
    AVAudioFormat *fmt = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:_host->sampleRate channels:2];   // float, non-interleaved
    std::shared_ptr<blonda::Host> host = _host;
    if (!_midi) { _midi = std::make_shared<MIDIState>(); _midi->host = _host; }
    _midi->sr.store(_host->sampleRate); _midi->latency.store(s.outputLatency + s.IOBufferDuration);
    std::shared_ptr<MIDIState> mst = _midi;
    _source = [[AVAudioSourceNode alloc] initWithFormat:fmt renderBlock:^OSStatus(BOOL *isSilence, const AudioTimeStamp *ts, AVAudioFrameCount frames, AudioBufferList *out) {
        float *L = (float *)out->mBuffers[0].mData;
        float *R = out->mNumberBuffers > 1 ? (float *)out->mBuffers[1].mData : L;
        host->render(L, R, (int)frames);
        if (MIDIState *m = mst.get()) { m->blockFrame.store(host->blockFrame(), std::memory_order_relaxed); m->blockHost.store(ts->mHostTime ? ts->mHostTime : mach_absolute_time(), std::memory_order_relaxed); }
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
static NSString *endpointName(MIDIEndpointRef e) { CFStringRef n = nullptr; MIDIObjectGetStringProperty(e, kMIDIPropertyDisplayName, &n); NSString *s = n ? (__bridge_transfer NSString *)n : @"MIDI"; return s; }
static SInt32 endpointID(MIDIEndpointRef e) { SInt32 v = 0; MIDIObjectGetIntegerProperty(e, kMIDIPropertyUniqueID, &v); return v; }

- (void)connectAllSources {
    const ItemCount n = MIDIGetNumberOfSources();
    for (ItemCount i = 0; i < n; ++i) {
        MIDIEndpointRef src = MIDIGetSource(i); MIDIPortDisconnectSource(_port, src);
        if (_inputID == 0 || endpointID(src) == _inputID) MIDIPortConnectSource(_port, src, nullptr);
    }
    _dest = 0;
    for (ItemCount i = 0; _outputID && i < MIDIGetNumberOfDestinations(); ++i) if (endpointID(MIDIGetDestination(i)) == _outputID) _dest = MIDIGetDestination(i);
}

- (void)startMIDI {
    if (_client) return;
    if (!_midi) { _midi = std::make_shared<MIDIState>(); _midi->host = _host; }
    NSUserDefaults *d = NSUserDefaults.standardUserDefaults;
    _inputID = [d integerForKey:@"midiIn"]; _outputID = [d integerForKey:@"midiOut"];
    _midi->follow.store([d boolForKey:@"midiFollow"]); _midi->sendClock.store([d boolForKey:@"midiClockOut"]); _midi->sendNotes.store([d boolForKey:@"midiNotesOut"]);
    __weak BLONDAEngine *weakSelf = self;
    MIDIClientCreateWithBlock(CFSTR("BLONDA SEQ"), &_client, ^(const MIDINotification *msg) {
        if (msg->messageID == kMIDIMsgSetupChanged) dispatch_async(dispatch_get_main_queue(), ^{ BLONDAEngine *s = weakSelf; [s connectAllSources]; if (s.midiSetupHandler) s.midiSetupHandler(); });
    });
    std::shared_ptr<MIDIState> st = _midi;
    MIDIInputPortCreateWithProtocol(_client, CFSTR("in"), kMIDIProtocol_1_0, &_port, ^(const MIDIEventList *list, void *srcRef) {
        // MIDI thread: UMP MIDI 1.0 words -> host MIDI queue (lock-free, no allocation); clock handled here too
        const MIDIEventPacket *p = &list->packet[0];
        for (UInt32 i = 0; i < list->numPackets; ++i) {
            const uint64_t when = p->timeStamp ? p->timeStamp : mach_absolute_time();
            for (UInt32 w = 0; w < p->wordCount; ++w) {
                const UInt32 word = p->words[w], type = word >> 28;
                st->lastMsg.store(mach_absolute_time(), std::memory_order_relaxed);
                if (type == 0x1) {   // system real time: clock, start, continue, stop
                    const int sys = (word >> 16) & 0xFF;
                    if (!st->follow.load(std::memory_order_relaxed)) continue;
                    if (sys == 0xF8) {
                        if (st->lastTick) { const double dt = hostSeconds(when - st->lastTick); if (dt > 0 && dt < .2) { st->iv[st->ivW] = dt; st->ivW = (st->ivW + 1) % 48; st->ivN = std::min(48, st->ivN + 1); } }
                        st->lastTick = when;
                        if (++st->tickN % 24 == 0 && st->ivN >= 24) {
                            double sum = 0; for (int k = 0; k < st->ivN; ++k) sum += st->iv[k];
                            const double bpm = 60.0 / (sum / st->ivN * 24);
                            if (bpm >= 40 && bpm <= 240 && std::fabs(bpm - st->lastBpm) > .05) { st->lastBpm = bpm;
                                dispatch_async(dispatch_get_main_queue(), ^{ BLONDAEngine *s = weakSelf; if (s.midiClockHandler) s.midiClockHandler(bpm); }); }
                        }
                    } else if (sys == 0xFA || sys == 0xFB || sys == 0xFC) {
                        const BOOL start = sys != 0xFC; st->tickN = 0;
                        dispatch_async(dispatch_get_main_queue(), ^{ BLONDAEngine *s = weakSelf; if (s.midiTransportHandler) s.midiTransportHandler(start); });
                    }
                    continue;
                }
                if (type != 0x2) continue;
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
    MIDIOutputPortCreate(_client, CFSTR("out"), &_outPort);
    [self connectAllSources];
    [self startMIDIOut];
}

// MIDI out: a 4 ms timer drains what the sequencer scheduled and sends it time-stamped, so it lands with the audio
- (void)startMIDIOut {
    std::shared_ptr<MIDIState> st = _midi; std::shared_ptr<blonda::Host> host = _host; __weak BLONDAEngine *weakSelf = self;
    _outTimer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, dispatch_get_global_queue(QOS_CLASS_USER_INTERACTIVE, 0));
    dispatch_source_set_timer(_outTimer, DISPATCH_TIME_NOW, 4 * NSEC_PER_MSEC, NSEC_PER_MSEC);
    dispatch_source_set_event_handler(_outTimer, ^{
        BLONDAEngine *s = weakSelf; const MIDIEndpointRef dest = s ? s->_dest : 0; const MIDIPortRef port = s ? s->_outPort : 0;
        const bool clk = st->sendClock.load() && !st->follow.load(), notes = st->sendNotes.load();
        blonda::MidiOutEv e; Byte buf[4096]; MIDIEventList *list = (MIDIEventList *)buf; MIDIEventPacket *pk = MIDIEventListInit(list, kMIDIProtocol_1_0); int count = 0;
        const double sr = st->sr.load(), lat = st->latency.load(); const long long bf = st->blockFrame.load(); const uint64_t bh = st->blockHost.load();
        auto at = [&](long long f) -> uint64_t { if (!bh) return 0; const double sec = (double)(f - bf) / sr + lat; return sec >= 0 ? bh + hostTicks(sec) : bh - std::min(bh, hostTicks(-sec)); };
        auto add = [&](uint64_t t, UInt32 word) { if (!pk) return; pk = MIDIEventListAdd(list, sizeof(buf), pk, t, 1, &word); ++count; };
        static const int kGM[6] = {36, 38, 39, 42, 46, 37};
        while (host->popMidiOut(e)) {
            if (!dest || !port) continue;
            if (e.kind == 1 && clk) { for (int k = 0; k < 6; ++k) add(at(e.f + (long long)std::llround(k * e.len / 6 * sr)), 0x10F80000u); }
            else if (e.kind == 2 && clk) add(at(e.f), 0x10FA0000u);
            else if (e.kind == 3) { if (clk) add(at(e.f), 0x10FC0000u); if (notes) for (int c = 0; c < 16; ++c) add(0, 0x20B07B00u | ((UInt32)c << 16)); }
            else if (e.kind == 0 && notes) {
                const int ch = e.track < 6 ? 9 : e.track - 6, n = e.track < 6 ? kGM[e.track] : std::max(0, std::min(127, e.note));
                const UInt32 v = (UInt32)std::max(1, std::min(127, (int)std::lround(e.vel * 127)));
                add(at(e.f), 0x20900000u | ((UInt32)ch << 16) | ((UInt32)n << 8) | v);
                add(at(e.f + (long long)std::llround(std::max(.03, e.len * .9) * sr)), 0x20800000u | ((UInt32)ch << 16) | ((UInt32)n << 8));
            }
            if (count > 200) { MIDISendEventList(port, dest, list); pk = MIDIEventListInit(list, kMIDIProtocol_1_0); count = 0; }
        }
        if (count && dest && port) MIDISendEventList(port, dest, list);
    });
    dispatch_resume(_outTimer);
}

- (NSArray<NSDictionary<NSString *, id> *> *)midiInputs { NSMutableArray *a = [NSMutableArray array]; for (ItemCount i = 0; i < MIDIGetNumberOfSources(); ++i) { MIDIEndpointRef e = MIDIGetSource(i); [a addObject:@{@"id": @(endpointID(e)), @"name": endpointName(e)}]; } return a; }
- (NSArray<NSDictionary<NSString *, id> *> *)midiOutputs { NSMutableArray *a = [NSMutableArray array]; for (ItemCount i = 0; i < MIDIGetNumberOfDestinations(); ++i) { MIDIEndpointRef e = MIDIGetDestination(i); [a addObject:@{@"id": @(endpointID(e)), @"name": endpointName(e)}]; } return a; }
- (NSInteger)midiInputID { return _inputID; }
- (void)setMidiInputID:(NSInteger)v { _inputID = v; [NSUserDefaults.standardUserDefaults setInteger:v forKey:@"midiIn"]; if (_client) [self connectAllSources]; }
- (NSInteger)midiOutputID { return _outputID; }
- (void)setMidiOutputID:(NSInteger)v { _outputID = v; [NSUserDefaults.standardUserDefaults setInteger:v forKey:@"midiOut"]; if (_client) [self connectAllSources]; }
- (BOOL)midiFollowClock { return _midi && _midi->follow.load(); }
- (void)setMidiFollowClock:(BOOL)v { if (!_midi) [self startMIDI]; _midi->follow.store(v); _midi->ivN = 0; _midi->lastBpm = 0; [NSUserDefaults.standardUserDefaults setBool:v forKey:@"midiFollow"]; }
- (BOOL)midiSendClock { return _midi && _midi->sendClock.load(); }
- (void)setMidiSendClock:(BOOL)v { if (!_midi) [self startMIDI]; _midi->sendClock.store(v); [NSUserDefaults.standardUserDefaults setBool:v forKey:@"midiClockOut"]; }
- (BOOL)midiSendNotes { return _midi && _midi->sendNotes.load(); }
- (void)setMidiSendNotes:(BOOL)v { if (!_midi) [self startMIDI]; _midi->sendNotes.store(v); [NSUserDefaults.standardUserDefaults setBool:v forKey:@"midiNotesOut"]; }
- (double)midiIdleSeconds { const uint64_t t = _midi ? _midi->lastMsg.load() : 0; return t ? hostSeconds(mach_absolute_time() - t) : 1e9; }
// ---------------------------------------------------------------- audio settings
- (NSInteger)ioBufferFrames { AVAudioSession *s = AVAudioSession.sharedInstance; return (NSInteger)std::lround(s.IOBufferDuration * s.sampleRate); }
- (void)setIoBufferFrames:(NSInteger)n {
    AVAudioSession *s = AVAudioSession.sharedInstance; const double sr = s.sampleRate > 0 ? s.sampleRate : 48000;
    [s setPreferredIOBufferDuration:(double)std::max<NSInteger>(32, std::min<NSInteger>(2048, n)) / sr error:nil];
    [NSUserDefaults.standardUserDefaults setInteger:n forKey:@"ioBuffer"];
    if (_midi) _midi->latency.store(s.outputLatency + s.IOBufferDuration);
}
- (NSString *)outputName { AVAudioSessionPortDescription *o = AVAudioSession.sharedInstance.currentRoute.outputs.firstObject; return o ? o.portName : @"–"; }
- (double)outputLatency { AVAudioSession *s = AVAudioSession.sharedInstance; return s.outputLatency + s.IOBufferDuration; }

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
- (void)glitchHoldSource:(NSInteger)src mods:(NSInteger)mods { _host->glitchHoldSet((int)src, (int)mods); }
- (NSInteger)glitchActiveMask { return _host->glitchActiveMask(); }
- (NSDictionary<NSString *, NSNumber *> *)sampleEdit:(NSInteger)t {
    const blonda::SampleEdit e = _host->sampleEdit((int)t);
    return @{@"st": @(e.st), @"en": @(e.en), @"fi": @(e.fi), @"fo": @(e.fo), @"g": @(e.g), @"rev": @(e.rev)};
}
- (void)setSampleEdit:(NSDictionary<NSString *, NSNumber *> *)d track:(NSInteger)t {
    blonda::SampleEdit e = _host->sampleEdit((int)t);
    if (d[@"st"]) e.st = d[@"st"].floatValue; if (d[@"en"]) e.en = d[@"en"].floatValue; if (d[@"fi"]) e.fi = d[@"fi"].floatValue;
    if (d[@"fo"]) e.fo = d[@"fo"].floatValue; if (d[@"g"]) e.g = d[@"g"].floatValue; if (d[@"rev"]) e.rev = d[@"rev"].intValue;
    _host->setSampleEdit((int)t, e);
}
- (void)resetSampleEdit:(NSInteger)t { _host->resetSampleEdit((int)t); }
- (NSArray<NSNumber *> *)chopCuts:(NSInteger)t { NSMutableArray *a = [NSMutableArray array]; for (float f : _host->chopCuts((int)t)) [a addObject:@(f)]; return a; }
- (void)setChopCuts:(NSArray<NSNumber *> *)cuts track:(NSInteger)t { std::vector<float> v; for (NSNumber *n in cuts) v.push_back(n.floatValue); _host->setChop((int)t, v); }
- (NSArray<NSNumber *> *)chopAuto:(NSString *)sid mode:(NSInteger)mode { NSMutableArray *a = [NSMutableArray array]; for (float f : _host->chopAuto(sid.UTF8String, (int)mode)) [a addObject:@(f)]; return a; }
- (void)chopToPattern:(NSInteger)t bars:(NSInteger)bars { _host->chopToPattern((int)t, (int)bars); }
- (NSInteger)stepSlice:(NSInteger)t step:(NSInteger)s { return _host->stepSlice((int)t, (int)s); }
- (void)setStepSlice:(NSInteger)c track:(NSInteger)t step:(NSInteger)s { _host->setStepSlice((int)t, (int)s, (int)c); }
- (double)sampleSeconds:(NSString *)sid { return _host->sampleSeconds(sid.UTF8String); }
- (NSInteger)samplePeaks:(NSString *)sid from:(double)t0 to:(double)t1 columns:(NSInteger)cols min:(float *)mn max:(float *)mx { return _host->samplePeaks(sid.UTF8String, t0, t1, (int)cols, mn, mx); }
- (NSArray<NSNumber *> *)sampleOnsets:(NSString *)sid { NSMutableArray *a = [NSMutableArray array]; for (double t : _host->onsets(sid.UTF8String)) [a addObject:@(t)]; return a; }
- (double)sampleZeroCross:(NSString *)sid at:(double)t { return _host->zeroCross(sid.UTF8String, t); }
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
