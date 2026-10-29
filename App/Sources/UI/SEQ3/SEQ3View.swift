import SwiftUI

/// The SEQ.3 Glass layout: living background, header with the glass dock, two scrolling columns of cards
/// split by a hinge, and the yellow transport — with the blurred "SEQ.3" start screen on launch.
struct SEQ3View: View {
    @EnvironmentObject var model: EngineModel
    @State private var started = false
    @State private var entered = true
    @State private var showKeys = false
    @FocusState private var keysFocused: Bool
    @State private var octave = 4
    @State private var held: [Character: Int] = [:]

    var body: some View {
        ZStack(alignment: .bottom) {
            ZStack(alignment: .bottom) {
                LivingBackground()
                VStack(spacing: 0) {
                    SEQ3Header()
                    GeometryReader { geo in
                        let wide = geo.size.width >= 1100
                        let unit = (geo.size.width - 26) / (wide ? 2.0 : 2.1)
                        HStack(alignment: .top, spacing: 0) {
                            column(width: unit * (wide ? 0.8 : 1.0), cards: [
                                AnyView(OrbitCard()), AnyView(PadsCard()), AnyView(SoundCard()), AnyView(FXCard()), AnyView(SynthCard()),
                            ], base: 0)
                            Hinge().frame(width: 26)
                            column(width: unit * (wide ? 1.2 : 1.1), cards: [
                                AnyView(GridCard()), AnyView(LoopsCard()), AnyView(LiveCard()), AnyView(SongCard()), AnyView(MasterCard()), AnyView(MixerCard()), AnyView(PluginsCard()),
                            ], base: 1)
                        }
                    }
                    .padding(.horizontal, 22)
                    .padding(.top, 8)
                }
                .padding(.bottom, 82)
                TransportBar(showKeys: $showKeys)
                    .padding(.horizontal, 22)
                    .modifier(Enter(index: 7, on: entered))
            }
            .blur(radius: started ? 0 : 36)
            .saturation(started ? 1 : 1.6)

            if !started {
                StartOverlay {
                    entered = false   // cards drop out instantly, then rise in staggered (web: .card.enter)
                    DispatchQueue.main.async {
                        withAnimation(.easeOut(duration: 0.6)) { started = true }
                        entered = true
                    }
                }
                .transition(.opacity.combined(with: .modifier(active: BlurOut(r: 20), identity: BlurOut(r: 0))))
            }
            if let t = model.toast {
                Text(t).font(BFont.mono(10.5, 500)).tracking(0.4).foregroundColor(T.ink)
                    .padding(.horizontal, 16).frame(height: 34)
                    .background(Capsule().fill(T.fg))
                    .shadow(color: .black.opacity(0.35), radius: 14, y: 8)
                    .padding(.bottom, 100)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .id(t)
            }
            if let t = model.rollTrack {
                PianoRoll(track: t).transition(.move(edge: .bottom)).zIndex(4)
            }
            if model.projOpen {
                ProjectsView().transition(.opacity.combined(with: .scale(scale: 0.985))).zIndex(6)
            }
            if model.libOpen {
                LibraryView().transition(.opacity.combined(with: .scale(scale: 0.985)))
                    .zIndex(5)
            }
            if showKeys {
                KeyboardView().frame(height: 150).padding(.horizontal, 22).padding(.bottom, 92)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .ignoresSafeArea(edges: .bottom)
        .background(T.bg)
        // web: dragging audio files onto the app opens the library and imports them
        .dropDestination(for: URL.self) { urls, _ in model.openLibrary(); model.importFiles(urls); return true }
        // computer keyboard, like the web version: A W S E D F T G Y H U J K O L P ; ' play notes, Z/X octave, space play/stop
        .focusable()
        .focusEffectDisabled()
        .focused($keysFocused)
        .onAppear { keysFocused = true }
        .onKeyPress(phases: [.down, .up]) { press in handleKey(press) }
        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: showKeys)
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: model.toast)
        .onAppear {
            let args = ProcessInfo.processInfo.arguments
            if args.contains("-autoplay") || args.contains("-nointro") { started = true; entered = true }
            if args.contains("-projects") { DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {   // CI screenshot with a few projects
                let st = model.projects; while st.items.count < 4 { _ = st.duplicate(st.current) }
                model.openProjects() } }
            if args.contains("-roll") { DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { model.openRoll(8) } }
            if args.contains("-inspect") { DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { model.openInspector(1, 4) } }   // CI screenshot
        }
    }

    private static let keyMap: [Character] = Array("awsedftgyhujkolp;'")

    private func handleKey(_ press: KeyPress) -> KeyPress.Result {
        if model.rollTrack != nil || model.libOpen || model.projOpen || model.textEditing { return .ignored }
        guard let ch = press.characters.lowercased().first else { return .ignored }
        if press.modifiers.contains(.command) {
            if press.phase == .down && ch == "z" { if press.modifiers.contains(.shift) { model.redo() } else { model.undo() }; return .handled }
            return .ignored
        }
        if model.keyboardDirect {   // KeyboardInput plays notes and space; swallow them here so nothing else reacts too
            return press.key == .space || ch == "z" || ch == "x" || Self.keyMap.contains(ch) ? .handled : .ignored
        }
        if press.key == .space { if press.phase == .down { model.togglePlay() }; return .handled }
        if ch == "z" || ch == "x" { if press.phase == .down { octave = max(1, min(7, octave + (ch == "z" ? -1 : 1))) }; return .handled }
        guard let ix = Self.keyMap.firstIndex(of: ch) else { return .ignored }
        if press.phase == .down {
            if held[ch] != nil { return .handled }   // key repeat
            let base = 12 * (octave + 1) - (model.selectedTrack == 6 ? 24 : 12)
            let note = base + ix
            held[ch] = note
            if model.selectedTrack < 6 { model.hitPad(model.selectedTrack) } else { model.noteOn(note) }
        } else if let n = held.removeValue(forKey: ch) {
            if model.selectedTrack >= 6 { model.noteOff(n) }
        }
        return .handled
    }

    private func column(width: CGFloat, cards: [AnyView], base: Int) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 14) {
                ForEach(cards.indices, id: \.self) { k in
                    cards[k].modifier(Enter(index: base + k * 2, on: entered))
                }
            }
            .padding(.bottom, 24)
            .background(ScrollTuner())
        }
        .frame(width: width)
    }
}

/// .card.enter: fade up from 16 pt with a 10 pt blur, staggered 45 ms.
struct Enter: ViewModifier {
    let index: Int
    let on: Bool
    func body(content: Content) -> some View {
        content
            .opacity(on ? 1 : 0)
            .blur(radius: on ? 0 : 10)
            .offset(y: on ? 0 : 16)
            .scaleEffect(on ? 1 : 0.985)
            .animation(on ? .timingCurve(0.2, 0.8, 0.2, 1, duration: 0.55).delay(Double(index) * 0.045) : nil, value: on)
    }
}

struct BlurOut: ViewModifier {
    let r: CGFloat
    func body(content: Content) -> some View { content.blur(radius: r) }
}

/// The vertical hairline between the two columns.
struct Hinge: View {
    var body: some View {
        Rectangle()
            .fill(LinearGradient(stops: [.init(color: Color.clear, location: 0), .init(color: Color.white.opacity(0.25), location: 0.2), .init(color: Color.white.opacity(0.25), location: 0.8), .init(color: Color.clear, location: 1)], startPoint: .top, endPoint: .bottom))
            .frame(width: 1)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// On the Mac a mouse drag inside the card columns should turn knobs and faders, not scroll the column:
/// the columns scroll with the wheel / trackpad only (iPad keeps finger scrolling).
struct ScrollTuner: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let v = UIView(); v.isUserInteractionEnabled = false
        DispatchQueue.main.async { Self.tune(from: v) }
        return v
    }
    func updateUIView(_ v: UIView, context: Context) { DispatchQueue.main.async { Self.tune(from: v) } }
    static func tune(from v: UIView) {
        #if targetEnvironment(macCatalyst)
        var p = v.superview
        while let s = p, !(s is UIScrollView) { p = s.superview }
        guard let sv = p as? UIScrollView else { return }
        sv.panGestureRecognizer.allowedTouchTypes = []                 // no click-drag scrolling
        sv.panGestureRecognizer.allowedScrollTypesMask = .all          // wheel and trackpad still scroll
        #endif
    }
}
