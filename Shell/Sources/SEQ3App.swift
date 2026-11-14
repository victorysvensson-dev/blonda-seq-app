import SwiftUI
import AVFoundation

/// SEQ.3 – the web app in a native shell. The page itself (Web/index.html) is the same file as the web version, so the
/// app looks, sounds and behaves exactly like it. The shell only adds what a browser can't: CoreMIDI, saving files,
/// keeping the screen on while playing, and audio that ignores the silent switch.
@main
struct SEQ3App: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate

    var body: some Scene {
        WindowGroup {
            ShellView()
                .modifier(EdgeToEdge())
                .background(Color(red: 23 / 255, green: 24 / 255, blue: 26 / 255))
                .persistentSystemOverlays(.hidden)
                .statusBarHidden(true)
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        Audio.configure()
        return true
    }
}

enum Audio {
    /// Playback category: the app is heard even with the silent switch on, like an instrument. 48 kHz like the studio,
    /// and a short buffer so pads and keys answer quickly. WebKit plays through this session.
    static func configure() {
        let s = AVAudioSession.sharedInstance()
        do {
            try s.setCategory(.playback, mode: .default, options: [])
            try? s.setPreferredSampleRate(48_000)
            try? s.setPreferredIOBufferDuration(0.005)
            try s.setActive(true)
        } catch {
            NSLog("SEQ3 audio session: %@", String(describing: error))
        }
    }

    /// Sampling: the session records too (USB instruments such as OP-XY / OP-1 field, the built-in mic), in "measurement"
    /// mode so iOS adds no processing (no gain control, no noise suppression) – the sample is what the instrument plays.
    /// Back to plain playback when the sampler is closed.
    static func record(_ on: Bool) {
        let s = AVAudioSession.sharedInstance()
        do {
            if on {
                try s.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
            } else {
                try s.setCategory(.playback, mode: .default, options: [])
            }
            try? s.setPreferredSampleRate(48_000)
            try s.setActive(true)
        } catch {
            NSLog("SEQ3 audio session (record %@): %@", on ? "on" : "off", String(describing: error))
        }
    }

    /// The inputs iOS offers right now (USB instruments show up here as "USB audio").
    static func inputs() -> [[String: Any]] {
        let s = AVAudioSession.sharedInstance()
        let cur = s.currentRoute.inputs.first?.uid
        return (s.availableInputs ?? []).map { p in
            ["uid": p.uid, "name": p.portName, "type": p.portType.rawValue, "usb": p.portType == .usbAudio,
             "channels": p.channels?.count ?? 0, "current": p.uid == cur]
        }
    }

    static func selectInput(_ uid: String) -> Bool {
        let s = AVAudioSession.sharedInstance()
        guard let p = s.availableInputs?.first(where: { $0.uid == uid }) else { return false }
        do { try s.setPreferredInput(p); return true } catch { return false }
    }
}

/// The sampler's recorder in the app. WebKit on the Mac has no recording at all (no getUserMedia), and on iPad it
/// records through WebKit's own processing, so the app records itself: an input tap on AVAudioEngine, the first two
/// channels of the chosen input (an OP-XY in 8-channel mode gives its main out), no processing. The tap is called on
/// AVAudioEngine's own thread (not the real-time audio thread); each block is handed to the page as interleaved
/// stereo 32-bit float.
final class Recorder {
    private var engine: AVAudioEngine?
    var onBlock: ((String, Double) -> Void)?

    func start(_ done: @escaping (String?, Double) -> Void) {
        stop()
        AVCaptureDevice.requestAccess(for: .audio) { granted in
            DispatchQueue.main.async {
                guard granted else { done("denied", 0); return }
                done(self.begin(), self.engine?.inputNode.outputFormat(forBus: 0).sampleRate ?? 0)
            }
        }
    }

    private func begin() -> String? {
        let e = AVAudioEngine()
        let input = e.inputNode
        let fmt = input.outputFormat(forBus: 0)
        guard fmt.sampleRate > 0, fmt.channelCount > 0 else { return "no input" }
        input.installTap(onBus: 0, bufferSize: 4096, format: fmt) { [weak self] buf, _ in
            let n = Int(buf.frameLength), c = Int(buf.format.channelCount)
            guard n > 0, let ch = buf.floatChannelData else { return }
            let inter = buf.format.isInterleaved
            var data = Data(count: n * 8)
            data.withUnsafeMutableBytes { raw in
                guard let p = raw.bindMemory(to: Float.self).baseAddress else { return }
                if inter {
                    let s = ch[0], r = c > 1 ? 1 : 0
                    for i in 0..<n { p[2 * i] = s[i * c]; p[2 * i + 1] = s[i * c + r] }
                } else {
                    let l = ch[0], r = ch[c > 1 ? 1 : 0]
                    for i in 0..<n { p[2 * i] = l[i]; p[2 * i + 1] = r[i] }
                }
            }
            let b64 = data.base64EncodedString(), sr = buf.format.sampleRate
            DispatchQueue.main.async { self?.onBlock?(b64, sr) }
        }
        e.prepare()
        do { try e.start() } catch { input.removeTap(onBus: 0); return String(describing: error) }
        engine = e
        return nil
    }

    func stop() {
        guard let e = engine else { return }
        e.inputNode.removeTap(onBus: 0)
        e.stop()
        engine = nil
    }
}

/// iPad / iPhone: the page goes edge to edge and handles the safe areas itself (notch, home bar).
/// Mac: the page starts below the window's title bar – edge to edge it slid under it and its top 26 points were hidden.
struct EdgeToEdge: ViewModifier {
    func body(content: Content) -> some View {
        #if targetEnvironment(macCatalyst)
        content.ignoresSafeArea(edges: [.bottom, .leading, .trailing])
        #else
        content.ignoresSafeArea()
        #endif
    }
}

struct ShellView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> ShellController { ShellController() }
    func updateUIViewController(_ controller: ShellController, context: Context) {}
}
