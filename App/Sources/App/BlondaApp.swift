import SwiftUI
import UIKit

@main
struct BlondaApp: App {
    @StateObject private var model = EngineModel()
    @Environment(\.scenePhase) private var phase
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
                .onChange(of: phase) { _, p in if p != .active { model.flushSave() } }   // nothing is lost when the app goes away
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
    @ObservedObject private var layout = LayoutStore.shared
    var body: some View {
        if ProcessInfo.processInfo.arguments.contains("-widegrid") {
            // CI: the step grid in a very wide card (a big Mac window)
            ZStack(alignment: .topLeading) { LivingBackground(); GridCard().frame(width: 1330).padding(22) }.background(T.bg)
        } else if let i = ProcessInfo.processInfo.arguments.firstIndex(of: "-libdemo"), i + 1 < ProcessInfo.processInfo.arguments.count {
            LibDemo(page: Int(ProcessInfo.processInfo.arguments[i + 1]) ?? 0)
        } else if let i = ProcessInfo.processInfo.arguments.firstIndex(of: "-gallery"), i + 1 < ProcessInfo.processInfo.arguments.count {
            SynthGallery(page: Int(ProcessInfo.processInfo.arguments[i + 1]) ?? 0)
        } else if ProcessInfo.processInfo.arguments.contains("-duofold") {
            // CI: the folded DUO (a phone-wide strip) on the iPad simulator
            HStack { DuoView(canSwitch: false).frame(width: 420) }.frame(maxWidth: .infinity).background(Color.black)
        } else if hsc == .compact { DuoView(canSwitch: false) } else if layout.preview { DuoPreview() } else if layout.duo { DuoView() } else { SEQ3View() }
    }
}

/// Screenshot page for CI: three synth modules side by side, each on its own engine.
struct SynthGallery: View {
    @EnvironmentObject var model: EngineModel
    let page: Int
    private static let pages = [["analog", "acid", "bris"], ["sh101", "mini", "sub"], ["fm", "pluck", "chip"], ["super", "bris6", "analog"]]
    @State private var ready = false
    var body: some View {
        ZStack(alignment: .top) {
            LivingBackground()
            if ready && page >= Self.pages.count {
                HStack(alignment: .top, spacing: 18) {
                    LiveCard().frame(width: 440)
                    VStack(spacing: 14) { SongCard(); PluginsCard() }.frame(width: 440)
                    SynthCard(initialTrack: 9).frame(width: 420)
                }
                .padding(22)
            } else if ready {
                HStack(alignment: .top, spacing: 18) {
                    ForEach(0..<3, id: \.self) { k in SynthCard(initialTrack: 6 + k) }
                }
                .padding(22)
            }
        }
        .background(T.bg)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                if page < Self.pages.count { let p = Self.pages[max(0, page)]; for k in 0..<3 { model.setInstrument(p[k], 6 + k) } }
                else { model.setChainSlot(0, 0); model.setChainSlot(1, 0); model.setChainSlot(2, 1); model.setChainSlot(3, 2); model.toggleSong(); model.togglePlay() }
                ready = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { for k in 0..<3 { model.preview(6 + k) } }
            }
        }
    }
}


/// Screenshot page for CI: makes three test sounds, imports them like dropped files, assigns them and plays.
/// page 0: the library (loops tab) · page 1: the loops card and pads while playing · page 2: one-shots tab aimed at a track
struct LibDemo: View {
    @EnvironmentObject var model: EngineModel
    let page: Int
    @State private var ready = false
    var body: some View {
        ZStack(alignment: .top) {
            LivingBackground()
            if ready {
                if page == 1 {
                    HStack(alignment: .top, spacing: 18) {
                        LoopsCard().frame(width: 640)
                        VStack(spacing: 14) { PadsCard(); SoundCard() }.frame(width: 520)
                    }
                    .padding(22)
                } else { LibraryView() }
            }
        }
        .background(T.bg)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                for m in model.library.items { model.deleteSample(m) }
                let dir = FileManager.default.temporaryDirectory
                let sr = 48000.0
                func wav(_ name: String, _ n: Int, _ f: (Int) -> Float) -> URL {
                    var d = Data(); func u32(_ v: UInt32) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
                    func u16(_ v: UInt16) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
                    d.append(contentsOf: Array("RIFF".utf8)); u32(UInt32(36 + n * 2)); d.append(contentsOf: Array("WAVEfmt ".utf8))
                    u32(16); u16(1); u16(1); u32(48000); u32(96000); u16(2); u16(16); d.append(contentsOf: Array("data".utf8)); u32(UInt32(n * 2))
                    for i in 0..<n { u16(UInt16(bitPattern: Int16(max(-1, min(1, f(i))) * 32000))) }
                    let u = dir.appendingPathComponent(name); try? d.write(to: u); return u
                }
                var seed: UInt32 = 1
                func rnd() -> Float { seed = seed &* 1664525 &+ 1013904223; return Float(seed >> 8) / Float(1 << 24) * 2 - 1 }
                let kick = wav("Fat Kick.wav", 24000) { i in let t = Double(i) / sr; return Float(sin(2 * .pi * (50 * t + 70 * (1 - exp(-t * 30)) / 30)) * exp(-t * 7) * 0.9) }
                let clap = wav("Snap Clap.wav", 12000) { i in rnd() * Float(exp(-Double(i) / sr * 25)) * 0.7 }
                let n = Int(2 * 240 / 100 * sr)
                let loop = wav("Groove 100bpm.wav", n) { i in
                    let beat = 60.0 / 100 * sr, ph = Double(i).truncatingRemainder(dividingBy: beat) / sr
                    let k = sin(2 * .pi * (50 * ph + 70 * (1 - exp(-ph * 30)) / 30)) * exp(-ph * 9)
                    let hp = (Double(i) + beat / 2).truncatingRemainder(dividingBy: beat) / sr
                    return Float(k * 0.7) + rnd() * Float(exp(-hp * 60) * 0.25)
                }
                model.importFiles([kick, clap, loop])
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    let lib = model.library
                    if let l = lib.loops.first { model.assignLoop(l, 0) }
                    if let h = lib.hits.first(where: { $0.name == "Fat Kick" }) { model.assignHit(h, 0) }
                    if page == 0 { model.libTab = "loop" }
                    if page == 2 { model.libTab = "hit"; model.libTarget = .drum(1) }
                    if page == 1 { model.togglePlay() }
                    if page == 3 { for p in model.presets.items { model.presets.remove(p.id) }; model.savePreset(8); model.savePreset(6); model.savePreset(0); model.libTab = "preset" }
                    ready = true
                }
            }
        }
    }
}
