import SwiftUI

@main
struct BlondaApp: App {
    @StateObject private var model = EngineModel()
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
                .preferredColorScheme(.dark)
                .onAppear { model.start() }
        }
    }
}
