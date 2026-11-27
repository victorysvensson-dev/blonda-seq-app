#import "NativeAudio.h"
#import <AVFoundation/AVFoundation.h>
#import <QuartzCore/QuartzCore.h>
#include <mach/mach_time.h>
#include <atomic>
#include <memory>
#include <algorithm>
#include <cmath>
#include "blonda/host.hpp"

@implementation NativeAudio {
    std::shared_ptr<blonda::Host> _host;
    AVAudioEngine *_engine;
    AVAudioSourceNode *_source;
    BOOL _loaded, _wanted;
    NSInteger _restarts;
    double _lastFix;
    std::shared_ptr<std::atomic<double>> _load, _peak;
}

+ (instancetype)shared { static NativeAudio *a; static dispatch_once_t once; dispatch_once(&once, ^{ a = [NativeAudio new]; }); return a; }

- (instancetype)init {
    if ((self = [super init])) { _host = std::make_shared<blonda::Host>(); _load = std::make_shared<std::atomic<double>>(0.0); _peak = std::make_shared<std::atomic<double>>(0.0); }
    return self;
}

- (BOOL)running { return _engine.isRunning; }

- (BOOL)start:(NSError **)error {
    _wanted = YES;
    if (_engine.isRunning) return YES;
    // The audio session is left exactly as the shell set it: changing its rate or buffer here interrupted the page's
    // own audio, which stopped the page's clock (playhead, pads) – and the page waking up again then stopped this engine.
    AVAudioSession *s = AVAudioSession.sharedInstance;
    _host->sampleRate = s.sampleRate > 0 ? (float)s.sampleRate : 48000.f;
    _engine = [AVAudioEngine new];
    AVAudioFormat *fmt = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:_host->sampleRate channels:2];
    std::shared_ptr<blonda::Host> host = _host; std::shared_ptr<std::atomic<double>> load = _load, peak = _peak;
    static mach_timebase_info_data_t tb; if (!tb.denom) mach_timebase_info(&tb);
    const double sr = _host->sampleRate;
    _source = [[AVAudioSourceNode alloc] initWithFormat:fmt renderBlock:^OSStatus(BOOL *isSilence, const AudioTimeStamp *ts, AVAudioFrameCount frames, AudioBufferList *out) {
        if (frames == 0 || out->mNumberBuffers == 0) return noErr;   // iOS can ask for nothing: no division by zero below
        const uint64_t t0 = mach_absolute_time();
        float *L = (float *)out->mBuffers[0].mData;
        float *R = out->mNumberBuffers > 1 ? (float *)out->mBuffers[1].mData : L;
        host->render(L, R, (int)frames);
        float pk = 0; for (AVAudioFrameCount i = 0; i < frames; ++i) { pk = std::max(pk, std::max(std::fabs(L[i]), std::fabs(R[i]))); }
        peak->store(std::max((double)pk, peak->load(std::memory_order_relaxed) * .97), std::memory_order_relaxed);   // held, falls slowly; read by the UI
        const double used = (double)(mach_absolute_time() - t0) * tb.numer / tb.denom / 1e9, avail = frames / sr;
        double prev = load->load(std::memory_order_relaxed); if (!std::isfinite(prev)) prev = 0;
        const double r = used / avail; if (std::isfinite(r)) load->store(prev + (r - prev) * .02, std::memory_order_relaxed);
        return noErr;
    }];
    [_engine attachNode:_source];
    [_engine connect:_source to:_engine.mainMixerNode format:fmt];
    [_engine prepare];
    return [_engine startAndReturnError:error];
}

/// When iOS changes the audio (another app, a route or session change, the page's own audio starting) the engine
/// stops and its connections may no longer fit the new hardware format. Restarting it as it was is not enough:
/// build it again from scratch (the C++ engine and its project stay as they are).
- (void)rebuild {
    if (!_wanted) return;
    [_engine stop]; _engine = nil; _source = nil;
    _restarts++;
    [self start:nil];
}
- (void)resumeIfNeeded {
    if (!_wanted || _engine.isRunning) return;
    const double now = CACurrentMediaTime(); if (now - _lastFix < 1.0) return;   // at most once a second
    _lastFix = now;
    [self rebuild];
}
- (NSInteger)restarts { return _restarts; }

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
- (void)setPlaying:(BOOL)on in:(double)delay preroll:(double)pre { _host->setPlayingIn(on, delay, pre); }
- (void)playAtEngineTime:(double)t { _host->setPlayingAtFrame((long long)llround(t * _host->sampleRate)); }
- (double)engineTime { return (double)_host->blockFrame() / _host->sampleRate; }
- (void)noteOn:(NSInteger)track note:(NSInteger)note velocity:(float)vel { _host->noteOn((int)track, (int)note, vel); }
- (void)noteOff:(NSInteger)track note:(NSInteger)note { _host->noteOff((int)track, (int)note); }
- (double)peak { return _peak->load(std::memory_order_relaxed); }
- (double)sampleRate { return _engine.isRunning ? _host->sampleRate : 0; }
- (BOOL)playing { return _host->isPlaying(); }
- (NSInteger)currentStep { return _host->currentStep(); }
- (double)load { return _load->load(std::memory_order_relaxed); }
@end
