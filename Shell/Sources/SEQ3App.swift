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
