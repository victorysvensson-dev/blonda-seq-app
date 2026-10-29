import SwiftUI
import UIKit

@main
struct BlondaApp: App {
    @StateObject private var model = EngineModel()
    init() { BFont.registerAll() }
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(model)
                .preferredColorScheme(.dark)
                .onAppear {
                    model.start()
                    configureWindow()
                }
        }
    }

    private func configureWindow() {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene else { return }
        #if targetEnvironment(macCatalyst)
        scene.sizeRestrictions?.minimumSize = CGSize(width: 960, height: 700)
        scene.titlebar?.titleVisibility = .hidden
        scene.titlebar?.toolbar = nil
        #endif
        if ProcessInfo.processInfo.arguments.contains("-landscape") {
            scene.requestGeometryUpdate(.iOS(interfaceOrientations: .landscapeRight)) { _ in }
        }
    }
}

/// SEQ.3 Glass design on iPad / Mac; the compact layout on iPhone.
struct RootView: View {
    @Environment(\.horizontalSizeClass) private var hsc
    var body: some View {
        if let i = ProcessInfo.processInfo.arguments.firstIndex(of: "-gallery"), i + 1 < ProcessInfo.processInfo.arguments.count {
            SynthGallery(page: Int(ProcessInfo.processInfo.arguments[i + 1]) ?? 0)
        } else if hsc == .compact { ContentView() } else { SEQ3View() }
    }
}

/// Screenshot page for CI: three synth modules side by side, each on its own engine.
struct SynthGallery: View {
    @EnvironmentObject var model: EngineModel
    let page: Int
    private static let pages = [["analog", "acid", "bris"], ["sh101", "mini", "sub"], ["fm", "pluck", "chip"], ["super", "acid", "analog"]]
    @State private var ready = false
    var body: some View {
        ZStack(alignment: .top) {
            LivingBackground()
            if ready {
                HStack(alignment: .top, spacing: 18) {
                    ForEach(0..<3, id: \.self) { k in SynthCard(initialTrack: 6 + k) }
                }
                .padding(22)
            }
        }
        .background(T.bg)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                let p = Self.pages[max(0, min(Self.pages.count - 1, page))]
                for k in 0..<3 { model.setInstrument(p[k], 6 + k) }
                ready = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { for k in 0..<3 { model.preview(6 + k) } }
            }
        }
    }
}
