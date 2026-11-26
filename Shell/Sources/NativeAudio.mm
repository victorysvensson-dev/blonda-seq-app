#import "NativeAudio.h"
#import <AVFoundation/AVFoundation.h>
#include <mach/mach_time.h>
#include <atomic>
#include <memory>
#include "blonda/host.hpp"

@implementation NativeAudio {
    std::shared_ptr<blonda::Host> _host;
    AVAudioEngine *_engine;
    AVAudioSourceNode *_source;
    BOOL _loaded, _wanted;
    std::shared_ptr<std::atomic<double>> _load;
}

+ (instancetype)shared { static NativeAudio *a; static dispatch_once_t once; dispatch_once(&once, ^{ a = [NativeAudio new]; }); return a; }

- (instancetype)init {
    if ((self = [super init])) { _host = std::make_shared<blonda::Host>(); _load = std::make_shared<std::atomic<double>>(0.0); }
    return self;
}

- (BOOL)running { return _engine.isRunning; }

- (BOOL)start:(NSError **)error {
    _wanted = YES;
    if (_engine.isRunning) return YES;
    AVAudioSession *s = AVAudioSession.sharedInstance;   // the shell already set Playback; the page's own audio is muted in this mode
    [s setPreferredSampleRate:48000 error:nil];
    [s setPreferredIOBufferDuration:256.0 / 48000.0 error:nil];
    [s setActive:YES error:nil];
    _host->sampleRate = s.sampleRate > 0 ? (float)s.sampleRate : 48000.f;
    _engine = [AVAudioEngine new];
    AVAudioFormat *fmt = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:_host->sampleRate channels:2];
    std::shared_ptr<blonda::Host> host = _host; std::shared_ptr<std::atomic<double>> load = _load;
    static mach_timebase_info_data_t tb; if (!tb.denom) mach_timebase_info(&tb);
    const double sr = _host->sampleRate;
    _source = [[AVAudioSourceNode alloc] initWithFormat:fmt renderBlock:^OSStatus(BOOL *isSilence, const AudioTimeStamp *ts, AVAudioFrameCount frames, AudioBufferList *out) {
        const uint64_t t0 = mach_absolute_time();
        float *L = (float *)out->mBuffers[0].mData;
        float *R = out->mNumberBuffers > 1 ? (float *)out->mBuffers[1].mData : L;
        host->render(L, R, (int)frames);
        const double used = (double)(mach_absolute_time() - t0) * tb.numer / tb.denom / 1e9, avail = frames / sr;
        const double prev = load->load(std::memory_order_relaxed); load->store(prev + (used / avail - prev) * .02, std::memory_order_relaxed);
        return noErr;
    }];
    [_engine attachNode:_source];
    [_engine connect:_source to:_engine.mainMixerNode format:fmt];
    [_engine prepare];
    return [_engine startAndReturnError:error];
}

- (void)resumeIfNeeded {
    if (!_wanted) return;
    if (_engine && !_engine.isRunning) { [_engine prepare]; if ([_engine startAndReturnError:nil]) return; }
    if (!_engine.isRunning) { _engine = nil; _source = nil; [self start:nil]; }
}

- (void)stop {
    _wanted = NO;
    _host->setPlaying(false);
    [_engine stop]; _engine = nil; _source = nil;
}

- (BOOL)setProjectJSON:(NSString *)json error:(NSError **)error {
    std::string err; const std::string j = json.UTF8String ?: "";
    const bool ok = _loaded ? _host->update(j, &err) : _host->load(j, &err);
    if (ok) _loaded = YES;
    else if (error) *error = [NSError errorWithDomain:@"BLONDA" code:1 userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithUTF8String:err.c_str()]}];
    return ok;
}

- (void)setPlaying:(BOOL)on { _host->setPlaying(on); }
- (BOOL)playing { return _host->isPlaying(); }
- (NSInteger)currentStep { return _host->currentStep(); }
- (double)load { return _load->load(std::memory_order_relaxed); }
@end
