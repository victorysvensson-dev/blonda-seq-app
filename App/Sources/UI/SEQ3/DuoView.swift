import SwiftUI

/// Which layout: the SEQ.3 cards, or BLONDA DUO — one window like a program, made for the folding iPhone.
/// Folded (narrow) it is a simple pad machine; unfolded it becomes a step sequencer with everything in reach.
/// Same engines, same project — only the view changes. An app setting, not saved in the project.
final class LayoutStore: ObservableObject {
    static let shared = LayoutStore()
    @Published var duo: Bool { didSet { UserDefaults.standard.set(duo, forKey: "layoutDuo") } }
    private init() { duo = ProcessInfo.processInfo.arguments.contains("-duo") || UserDefaults.standard.bool(forKey: "layoutDuo") }
    func toggle() { withAnimation(.easeInOut(duration: 0.3)) { duo.toggle() } }
    /// Preview of the folding iPhone on a Mac / iPad: the DUO view in a phone-sized frame, folded or unfolded.
    @Published var preview = ProcessInfo.processInfo.arguments.contains("-duopreview")
    @Published var unfolded = ProcessInfo.processInfo.arguments.contains("-unfolded")
}

/// Shows how BLONDA DUO looks on the folding iPhone before you have one: the phone outline at its size in points
/// (folded: the outer screen, unfolded: the inner one), with a button to fold and unfold. The app inside is the real one.
/// Sizes are an estimate from the rumoured screens (outer ≈ 5.5", inner ≈ 7.8" 4:3) — change them here when Apple says.
struct DuoPreview: View {
    @ObservedObject private var layout = LayoutStore.shared
    static let folded = CGSize(width: 420, height: 600), unfolded = CGSize(width: 840, height: 630)
    var body: some View {
        GeometryReader { geo in
            let size = layout.unfolded ? Self.unfolded : Self.folded
            let scale = min(1, (geo.size.width - 40) / (size.width + 24), (geo.size.height - 110) / (size.height + 24))
            VStack(spacing: 16) {
                HStack(spacing: 10) {
                    Text("iPhone Duo · förhandsvisning").font(BFont.mono(10, 500)).foregroundColor(D.ink)
                    Text(layout.unfolded ? "utfälld \(Int(size.width))×\(Int(size.height))" : "hopfälld \(Int(size.width))×\(Int(size.height))").font(BFont.mono(9)).foregroundColor(D.mute)
                    Spacer()
                    PreviewBtn(title: layout.unfolded ? "fäll ihop" : "fäll ut", on: true) { withAnimation(.spring(response: 0.55, dampingFraction: 0.85)) { layout.unfolded.toggle() } }
                    PreviewBtn(title: "stäng") { withAnimation(.easeInOut(duration: 0.3)) { layout.preview = false } }
                }
                .padding(.horizontal, 20)
                ZStack {
                    RoundedRectangle(cornerRadius: 44, style: .continuous).fill(Color(hex: 0x050506))
                        .overlay(RoundedRectangle(cornerRadius: 44, style: .continuous).strokeBorder(Color.white.opacity(0.18), lineWidth: 2))
                    DuoView(canSwitch: false)
                        .frame(width: size.width, height: size.height)
                        .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
                    if layout.unfolded {   // the fold in the middle
                        Rectangle().fill(LinearGradient(colors: [.clear, .white.opacity(0.06), .clear], startPoint: .leading, endPoint: .trailing))
                            .frame(width: 14, height: size.height).allowsHitTesting(false)
                    }
                }
                .frame(width: size.width + 24, height: size.height + 24)
                .scaleEffect(scale)
                .frame(width: (size.width + 24) * scale, height: (size.height + 24) * scale)
                Text("Appen inuti är den riktiga: allt går att spela och ändra. Måtten är en uppskattning tills Apple visar telefonen.")
                    .font(BFont.mono(9)).foregroundColor(D.mute)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color(hex: 0x0B0B0D).ignoresSafeArea())
    }
}

private struct PreviewBtn: View {
    let title: String
    var on = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(BFont.mono(10, 500)).foregroundColor(on ? D.dark : D.ink).padding(.horizontal, 14).frame(height: 32)
                .background(Rectangle().fill(on ? D.y : Color.white.opacity(0.06)))
        }.buttonStyle(PressScale())
    }
}

private enum D {
    static let bg = Color(hex: 0x141517), panel = Color(hex: 0x1B1C1F), line = Color(hex: 0x2E2F33)
    static let ink = Color(hex: 0xEDEAE0), mute = Color(hex: 0x8F8E8A), y = Color(hex: 0xF2C318), dark = Color(hex: 0x17181A)
}

struct DuoView: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var lookStore = LookStore.shared
    var canSwitch = true
    var body: some View {
        GeometryReader { geo in
            let open = geo.size.width >= 700   // unfolded (or iPad / Mac): the full program
            ZStack {
                D.bg.ignoresSafeArea()
                VStack(spacing: 0) {
                    DuoTopBar(open: open, canSwitch: canSwitch)
                    Rectangle().fill(D.line).frame(height: 1)
                    if open { DuoOpen() } else { DuoFolded() }
                }
                .modifier(DotsFilter())
                overlays
            }
        }
        .preferredColorScheme(.dark)
    }

    @ViewBuilder private var overlays: some View {
        if let t = model.drumEdit { DrumEditor(track: t).modifier(DotsFilter()).transition(.opacity).zIndex(3) }
        if let t = model.rollTrack { PianoRoll(track: t).modifier(DotsFilter()).transition(.move(edge: .bottom)).zIndex(4) }
        if model.libOpen { LibraryView().modifier(DotsFilter()).transition(.opacity).zIndex(5) }
        if model.projOpen { ProjectsView().modifier(DotsFilter()).transition(.opacity).zIndex(6) }
        if let k = FullStore.shared.key {
            ZStack {
                Rectangle().fill(.ultraThinMaterial).overlay(Color(rgb: 6, 7, 9, 0.55)).ignoresSafeArea().onTapGesture { FullStore.shared.toggle(k) }
                ScrollView { SEQ3View.card(k).frame(maxWidth: 1100).padding(14) }
            }
            .modifier(DotsFilter()).zIndex(3.2)
        }
        if let t = model.toast {
            VStack { Spacer(); Text(t).font(BFont.mono(10.5, 500)).foregroundColor(D.dark).padding(.horizontal, 16).frame(height: 34).background(Capsule().fill(D.ink)).padding(.bottom, 90) }
                .allowsHitTesting(false).zIndex(7)
        }
    }
}

// MARK: - top bar (both states)

private struct DuoTopBar: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var store = EngineModel.sharedProjects
    let open: Bool
    let canSwitch: Bool
    var body: some View {
        HStack(spacing: 10) {
            Button { model.openProjects() } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Text("BLONDA").font(BFont.pixel(14)).tracking(1.1).foregroundColor(D.ink)
                    Text("duo · " + (store.currentMeta?.name ?? "projekt").lowercased()).font(BFont.mono(8.5)).foregroundColor(D.mute).lineLimit(1)
                }
            }.buttonStyle(.plain)
            Spacer(minLength: 6)
            if open { DuoPatterns(); DuoClock() }
            DuoBPM()
            if open { DuoTransport(size: 40) }
            if canSwitch {
                Button { withAnimation(.easeInOut(duration: 0.3)) { LayoutStore.shared.preview = true } } label: {
                    Text("iphone duo").font(BFont.mono(9.5, 500)).foregroundColor(D.dark).padding(.horizontal, 10).frame(height: 30)
                        .background(Rectangle().fill(D.y))
                }.buttonStyle(.plain)
                Button { LayoutStore.shared.toggle() } label: {
                    Text("kort").font(BFont.mono(9.5, 500)).foregroundColor(D.ink).padding(.horizontal, 10).frame(height: 30)
                        .overlay(Rectangle().strokeBorder(D.line, lineWidth: 1))
                }.buttonStyle(.plain)
            }
            Button { model.openLibrary() } label: {
                Text("lib").font(BFont.mono(9.5, 500)).foregroundColor(D.ink).padding(.horizontal, 10).frame(height: 30)
                    .overlay(Rectangle().strokeBorder(D.line, lineWidth: 1))
            }.buttonStyle(.plain)
        }
        .padding(.horizontal, 14).frame(height: 56)
        .background(D.panel)
    }
}

private struct DuoClock: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.25)) { _ in
            let el = model.playing ? max(0, CACurrentMediaTime() - model.playStart) : 0
            HStack(alignment: .bottom, spacing: 8) {
                DotMatrixText(text: String(format: "%02d:%02d", Int(el) / 60, Int(el) % 60), height: 26, color: D.y, offOpacity: 0.08)
                Text(String(format: "%02d·%d", model.bar + 1, max(0, model.step) / 4 + 1)).font(BFont.mono(9)).foregroundColor(D.mute)
            }
        }
        .padding(.horizontal, 6)
    }
}

private struct DuoBPM: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        HStack(spacing: 0) {
            Button { model.nudgeBPM(-1) } label: { Text("−").frame(width: 28, height: 30) }.buttonStyle(.plain)
            Text("\(Int(model.bpm.rounded()))").font(BFont.linje(17)).frame(minWidth: 38)
            Button { model.nudgeBPM(1) } label: { Text("+").frame(width: 28, height: 30) }.buttonStyle(.plain)
        }
        .font(BFont.mono(13, 500)).foregroundColor(D.ink)
        .overlay(Rectangle().strokeBorder(D.line, lineWidth: 1))
    }
}

private struct DuoPatterns: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<4, id: \.self) { p in
                let on = p == model.pattern, used = model.patternHasSteps(p)
                Button { model.selectPattern(p) } label: {
                    Text(["A", "B", "C", "D"][p]).font(BFont.mono(11, 500))
                        .foregroundColor(on ? D.dark : D.ink.opacity(used ? 0.9 : 0.4))
                        .frame(width: 30, height: 30)
                        .background(Rectangle().fill(on ? D.y : Color.white.opacity(0.05)))
                }.buttonStyle(PressScale())
            }
            Button { model.copyPattern() } label: {
                Text("→ \(["A", "B", "C", "D"][(model.pattern + 1) % 4])").font(BFont.mono(9.5, 500)).foregroundColor(D.ink.opacity(0.85))
                    .padding(.horizontal, 8).frame(height: 30).overlay(Rectangle().strokeBorder(D.line, lineWidth: 1))
            }.buttonStyle(PressScale())
        }
    }
}

private struct DuoTransport: View {
    @EnvironmentObject var model: EngineModel
    var size: CGFloat = 52
    var body: some View {
        HStack(spacing: 8) {
            Button { model.toggleRecord() } label: {
                ZStack { Circle().fill(model.recording ? Color(hex: 0xFF4A33).opacity(0.25) : Color.clear); Circle().strokeBorder(D.ink.opacity(0.5), lineWidth: 1.5)
                    Circle().fill(Color(hex: 0xFF4A33)).frame(width: size * 0.28, height: size * 0.28) }
                .frame(width: size, height: size)
            }.buttonStyle(PressScale())
            Button { model.togglePlay() } label: {
                ZStack {
                    Circle().fill(D.y)
                    if model.playing { HStack(spacing: size * 0.08) { Rectangle().frame(width: size * 0.08, height: size * 0.28); Rectangle().frame(width: size * 0.08, height: size * 0.28) }.foregroundColor(D.dark) }
                    else { SVGIcon(d: "M7 4.5v15l13-7.5z", box: 24, size: size * 0.4, stroke: nil, fill: true).foregroundColor(D.dark) }
                }.frame(width: size, height: size)
            }.buttonStyle(.plain)
        }
    }
}

// MARK: - folded: a simple pad machine

private struct DuoFolded: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        VStack(spacing: 0) {
            ScrollView(.vertical, showsIndicators: false) {   // a short outer screen scrolls; the transport stays put
                VStack(spacing: 0) {
                    DuoScreen().padding(14)
                    Rectangle().fill(D.line).frame(height: 1)
                    HStack {
                        DuoPatterns()
                        Spacer()
                        DuoTool(title: "tärning", fill: D.y) { model.rollDice() }
                    }
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    DuoPadGrid(columns: 2).padding(.horizontal, 14)
                    DuoKnobRow(track: model.selectedTrack, compact: true).padding(.horizontal, 10).padding(.vertical, 12)
                }
            }
            .lockedWhileDragging()
            HStack {
                Text("fäll ut för stegsekvensern").font(BFont.mono(8.5)).foregroundColor(D.mute)
                Spacer()
                DuoTransport(size: 58)
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
            .background(D.panel)
        }
    }
}

/// The "screen" of the pad machine: clock, the selected sound and its 16 steps (tap a step to set it).
private struct DuoScreen: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let t = model.selectedTrack, col = model.trackHex(t)
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(kTracks[t].name.lowercased()).font(BFont.sans(26, 300)).foregroundColor(D.ink)
                    Text(model.trackSub(t).lowercased()).font(BFont.mono(9)).foregroundColor(D.mute)
                }
                Spacer()
                DuoClock()
            }
            GeometryReader { g in
                let gap: CGFloat = 4, cell = (g.size.width - 15 * gap) / 16
                HStack(spacing: gap) {
                    let ph = model.playing && model.step >= 0 ? model.step : -1
                    ForEach(0..<16, id: \.self) { s in
                        let v = model.value(t, s)
                        DotCell(value: v, colorHex: col, playhead: ph == s, dimGroup: (s >= 4 && s < 8) || s >= 12, shift: v > 0 ? model.dotShift(t, s) : 0)
                            .frame(width: cell, height: cell)
                            .onTapGesture { model.cycle(t, s) }
                            .onLongPressGesture(minimumDuration: 0.43) { model.openInspector(t, s) }
                            .modifier(InspectorPopover(ref: EngineModel.StepRef(track: t, step: s)))
                    }
                }
            }
            .frame(height: 30)
        }
        .padding(14)
        .background(D.panel)
        .overlay(Rectangle().strokeBorder(D.line, lineWidth: 1))
    }
}

private struct DuoPadGrid: View {
    @EnvironmentObject var model: EngineModel
    let columns: Int
    var rows: [[Int]] { columns == 2 ? [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]] : [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9]] }
    var body: some View {
        VStack(spacing: 8) {
            ForEach(rows.indices, id: \.self) { r in
                HStack(spacing: 8) { ForEach(rows[r], id: \.self) { i in DuoPad(track: i) } }
            }
        }
    }
}

private struct DuoPad: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var height: CGFloat = 64
    var small = false   // the strip under the sequencer: just the name, shrinking to fit
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30)) { _ in
            let lit = model.flash(track, 0.12) > 0, col = model.trackColor(track), sel = model.selectedTrack == track
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(kTracks[track].name.lowercased()).font(BFont.sans(small ? 13 : 15, 500)).lineLimit(1).minimumScaleFactor(0.6)
                    if !small { Text(model.trackSub(track).lowercased()).font(BFont.mono(8.5)).opacity(0.6).lineLimit(1) }
                }
                Spacer(minLength: 0)
                if !small { Text("\(track + 1 == 10 ? 0 : track + 1)").font(BFont.mono(9)).opacity(0.5) }
            }
            .foregroundColor(lit ? D.dark : D.ink)
            .padding(small ? 7 : 10)
            .frame(maxWidth: .infinity, minHeight: height, maxHeight: height, alignment: .bottomLeading)
            .background(Rectangle().fill(lit ? col : Color.white.opacity(sel ? 0.1 : 0.04)))
            .overlay(Rectangle().strokeBorder(sel ? col : D.line, lineWidth: sel ? 1.5 : 1))
            .overlay(alignment: .topLeading) { Rectangle().fill(col).frame(width: 18, height: 3).padding(8) }
            .contentShape(Rectangle())
            .onTapGesture { model.hitPad(track) }
            .onLongPressGesture(minimumDuration: 0.45) { model.selectedTrack = track; if track < 6 { model.openDrumEditor(track) } else { model.openRoll(track) } }
        }
    }
}

/// Knobs for the selected sound.
private struct DuoKnobRow: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var compact = false
    var body: some View {
        let defs = compact ? [kTrackParams[0], kTrackParams[2], kTrackParams[1], kTrackParams[5], kTrackParams[6]] : kTrackParams
        HStack(spacing: 2) {
            ForEach(defs.indices, id: \.self) { i in DedKnob(def: defs[i], track: track, tint: model.trackColor(track)) }
        }
    }
}

private struct DuoTool: View {
    let title: String
    var fill: Color? = nil
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(BFont.mono(9.5, 500)).foregroundColor(fill == nil ? D.ink : D.dark)
                .padding(.horizontal, 10).frame(height: 30)
                .background(Rectangle().fill(fill ?? Color.white.opacity(0.04)))
                .overlay(Rectangle().strokeBorder(fill == nil ? D.line : Color.clear, lineWidth: 1))
        }.buttonStyle(PressScale())
    }
}

// MARK: - unfolded: the step sequencer program

private struct DuoOpen: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        GeometryReader { geo in
            let side = min(340, max(260, geo.size.width * 0.27))
            HStack(spacing: 0) {
                VStack(spacing: 0) {
                    DuoToolbar()
                    Rectangle().fill(D.line).frame(height: 1)
                    DuoSeq().frame(maxHeight: .infinity, alignment: .top)
                    Rectangle().fill(D.line).frame(height: 1)
                    DuoPadStrip()
                }
                Rectangle().fill(D.line).frame(width: 1)
                DuoInspector().frame(width: side)
            }
        }
    }
}

private struct DuoToolbar: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let t = model.selectedTrack
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                DuoTool(title: "tärning", fill: D.y) { model.rollDice() }
                DuoTool(title: "variation") { model.variation(t) }
                DuoTool(title: "flytta") { model.shift(t) }
                DuoTool(title: "rensa spår") { model.clear(t) }
                DuoTool(title: "piano roll") { model.openRoll(t >= 6 ? t : 6) }
                SwingChip()
                DuoTool(title: "↶") { model.undo() }
                DuoTool(title: "↷") { model.redo() }
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
        }
    }
}

/// The 10 × 16 grid: each row is the track (name, mute, solo) and its steps. Tap = step, drag a step sideways = nudge,
/// hold = details. Fills the space it gets.
private struct DuoSeq: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        GeometryReader { g in
            let head: CGFloat = 150, gap: CGFloat = 4
            let byW = (g.size.width - head - 24 - 15 * gap) / 16, byH = (g.size.height - 34 - 9 * 6) / 10
            let cell = max(14, min(64, min(byW, byH)).rounded(.down))
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: gap) {
                    Color.clear.frame(width: head, height: 14)
                    ForEach(0..<16, id: \.self) { s in
                        Text("\(s + 1)").font(BFont.mono(8.5)).foregroundColor(s % 4 == 0 ? D.ink : D.mute.opacity(0.6))
                            .frame(width: cell)
                            .background(alignment: .bottom) { if model.playing && model.step == s { Rectangle().fill(D.y).frame(height: 2).offset(y: 4) } }
                    }
                }
                ForEach(0..<10, id: \.self) { tr in DuoRow(track: tr, cell: cell, gap: gap, head: head) }
            }
            .padding(12)
        }
    }
}

private struct DuoRow: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let cell: CGFloat
    let gap: CGFloat
    let head: CGFloat
    var body: some View {
        let sel = model.selectedTrack == track, col = model.trackHex(track), muted = model.isMuted(track), solo = model.soloTrack == track
        HStack(spacing: gap) {
            HStack(spacing: 6) {
                Rectangle().fill(Color(hex: col)).frame(width: 3, height: cell * 0.8)
                Text(kTracks[track].name.lowercased()).font(BFont.mono(10.5, sel ? 500 : 400)).foregroundColor(sel ? D.y : D.ink.opacity(muted ? 0.35 : 0.8))
                    .strikethrough(muted).lineLimit(1)
                Spacer(minLength: 2)
                Button { model.toggleMute(track) } label: { Text("m").font(BFont.mono(9, 500)).foregroundColor(muted ? D.dark : D.mute).frame(width: 20, height: 20).background(Rectangle().fill(muted ? Color(hex: 0xC9452F) : Color.white.opacity(0.05))) }.buttonStyle(.plain)
                Button { model.toggleSolo(track) } label: { Text("s").font(BFont.mono(9, 500)).foregroundColor(solo ? D.dark : D.mute).frame(width: 20, height: 20).background(Rectangle().fill(solo ? D.y : Color.white.opacity(0.05))) }.buttonStyle(.plain)
            }
            .padding(.horizontal, 6)
            .frame(width: head, height: cell)
            .background(Rectangle().fill(sel ? Color.white.opacity(0.06) : Color.clear))
            .contentShape(Rectangle())
            .onTapGesture(count: 2) { if track < 6 { model.openDrumEditor(track) } else { model.openRoll(track) } }
            .onTapGesture { model.selectedTrack = track; model.hitPad(track) }
            let L = model.length(track)
            let ph = model.playing && model.step >= 0 ? (L < 16 ? model.globalStep % L : model.step) : -1
            ForEach(0..<16, id: \.self) { s in
                let v = model.value(track, s)
                DotCell(value: v, colorHex: col, playhead: ph == s, dimGroup: (s >= 4 && s < 8) || s >= 12, out: s >= L, shift: v > 0 ? model.dotShift(track, s) : 0)
                    .frame(width: cell, height: cell)
                    .onTapGesture { model.cycle(track, s) }
                    .onLongPressGesture(minimumDuration: 0.43) { model.openInspector(track, s) }
                    .modifier(StepNudgeDrag(track: track, step: s, pitch: cell + gap))
                    .modifier(InspectorPopover(ref: EngineModel.StepRef(track: track, step: s)))
            }
        }
    }
}

/// Bottom of the program: ten pads to play, and the master knobs.
private struct DuoPadStrip: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<10, id: \.self) { i in DuoPad(track: i, height: 54, small: true) }
        }
        .padding(12)
    }
}

/// Right side: everything about the selected sound, and the master.
private struct DuoInspector: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let t = model.selectedTrack, col = model.trackColor(t)
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 10) {
                    Text("\(t + 1)").font(BFont.mono(11, 500)).foregroundColor(D.dark).frame(width: 24, height: 24).background(Circle().fill(col))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(kTracks[t].name.lowercased()).font(BFont.sans(20, 300)).foregroundColor(D.ink)
                        Text(model.trackSub(t).lowercased()).font(BFont.mono(9)).foregroundColor(D.mute).lineLimit(1)
                    }
                    Spacer()
                    DuoTool(title: t < 6 ? "ljud" : "synth") { if t < 6 { model.openDrumEditor(t) } else { FullStore.shared.toggle("synth") } }
                }
                DuoLabel(text: "ljud")
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 4), spacing: 10) {
                    ForEach(kTrackParams.indices, id: \.self) { i in DedKnob(def: kTrackParams[i], track: t, tint: col) }
                }
                DuoLabel(text: "effekter på spåret")
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 4), spacing: 10) {
                    ForEach(kFxParams.indices, id: \.self) { i in DedKnob(def: kFxParams[i], track: t, tint: col) }
                }
                if t < 6 {
                    DuoLabel(text: "ljudmodell")
                    DedKits(track: t, tc: col)
                }
                Rectangle().fill(D.line).frame(height: 1)
                DuoLabel(text: "master")
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 4), spacing: 10) {
                    ForEach(kMasterParams.indices, id: \.self) { i in DedKnob(def: kMasterParams[i], track: 0, tint: D.y) }
                }
                DuoLabel(text: "glitch · håll en pad")
                GlitchPads()
                GlitchAuto()
            }
            .padding(14)
        }
        .background(D.panel)
    }
}

private struct DuoLabel: View {
    let text: String
    var body: some View { Text(text).font(BFont.mono(8.5)).tracking(0.6).foregroundColor(D.mute) }
}
