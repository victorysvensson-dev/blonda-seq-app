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
