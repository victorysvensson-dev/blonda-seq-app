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
        if hsc == .compact { ContentView() } else { SEQ3View() }
    }
}
