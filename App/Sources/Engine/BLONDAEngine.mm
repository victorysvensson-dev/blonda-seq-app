// BLONDA SEQ — AVAudioEngine host. All the threading logic lives in blonda::Host (Core/include/blonda/host.hpp),
// which is unit-tested on Linux; this file only wires it to AVAudioSession / AVAudioSourceNode.
#import "BLONDAEngine.h"
#import <AVFoundation/AVFoundation.h>
#import <CoreMIDI/CoreMIDI.h>
#include "blonda/host.hpp"
#include <atomic>
#include <memory>

struct MIDIState { std::shared_ptr<blonda::Host> host; std::atomic<int> track{7}; };

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
                if (status == 0x90 && d2 > 0) st->host->midiNoteOn(track, d1, .25f + .75f * d2 / 127.f);   // same curve as the web MIDI input
                else if (status == 0x80 || (status == 0x90 && d2 == 0)) st->host->midiNoteOff(track, d1);
            }
            p = MIDIEventPacketNext(p);
        }
    });
    [self connectAllSources];
}

- (NSInteger)midiTrack { return _midi ? _midi->track.load() : 7; }
- (void)setMidiTrack:(NSInteger)midiTrack { if (!_midi) [self startMIDI]; _midi->track.store((int)std::max<NSInteger>(0, std::min<NSInteger>(9, midiTrack))); }
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

- (NSString *)instrumentForTrack:(NSInteger)track {
    if (track < 6 || track > 9) return @"drum";
    return [NSString stringWithUTF8String:_host->ui.inst[track - 6].c_str()];
}

@end
