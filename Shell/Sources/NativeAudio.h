// The C++ sound engine (Core/: Seq3 + Host) in the SEQ.3 app – "native audio". The page stays the editor and
// sends its project; the engine plays it in the system's audio thread (AVAudioEngine, 48 kHz).
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN
@interface NativeAudio : NSObject
+ (instancetype)shared;
@property (nonatomic, readonly) BOOL running;
- (BOOL)start:(NSError **)error;
- (void)stop;
/// the page's project (the web S object as JSON); the first one loads, later ones update the running engine
- (BOOL)setProjectJSON:(NSString *)json error:(NSError **)error;
- (void)setPlaying:(BOOL)on;
@property (nonatomic, readonly) BOOL playing;
@property (nonatomic, readonly) NSInteger currentStep;
/// share of the audio time the engine used in the last second (0..1)
@property (nonatomic, readonly) double load;
@end
NS_ASSUME_NONNULL_END
