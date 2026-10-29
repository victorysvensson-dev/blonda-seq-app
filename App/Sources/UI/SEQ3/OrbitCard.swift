import SwiftUI

/// "Orbit": every track as a ring of its steps around a dot-matrix "hits/length" readout, with the play-hand
/// sweeping round — a port of drawOrbit().
struct OrbitCard: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let sel = model.selectedTrack
        Card(style: .dark, title: [("Orbit · ", false), (String(format: "%02d ", sel + 1) + kTracks[sel].name, true)]) {
            VStack(alignment: .leading, spacing: 14) {
                // wide: dial + controls side by side; narrow (like the web under 1100 px): big dial, controls below
                ViewThatFits(in: .horizontal) {
                    HStack(alignment: .center, spacing: 16) {
                        OrbitDial().frame(width: 320, height: 320)
                        OrbitSide()
                    }
                    VStack(spacing: 14) {
                        OrbitDial().aspectRatio(1, contentMode: .fit).frame(maxWidth: 420)
                        OrbitSideRow()
                    }
                }
                OrbitTrackButtons()
                TrackTags()
            }
        }
    }
}

struct OrbitDial: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        ZStack {
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { _ in
                Canvas { c, size in drawOrbit(&c, size) }
                    .background(GeometryReader { g in Color.clear.onAppear { dialSize = g.size.width }.onChange(of: g.size.width) { _, v in dialSize = v } })
            }
            VStack(spacing: 6) {
                DotMatrixText(text: "\(model.hits(model.selectedTrack))/\(model.length(model.selectedTrack))", height: 26, color: T.dmInk)
                Text(kTracks[model.selectedTrack].name.lowercased()).font(BFont.mono(9)).tracking(0.54).foregroundColor(T.dmInk.opacity(0.45))
            }
        }
        .id(model.revision)
        .contentShape(Circle())
        .gesture(SpatialTapGesture().onEnded { e in tap(e.location) })
    }

    /// tap a ring to select its track, a dot to switch that step on/off (like the web orbit)
    private func tap(_ p: CGPoint) {
        let w: CGFloat = 320, cx = w / 2, R0 = cx * 0.34, R1 = cx * 0.95, gap = (R1 - R0) / 9
        // the dial may be drawn bigger than 320 in the narrow layout: scale the point into a 320 frame
        let scale = cx / max(1, dialSize / 2)
        let x = (p.x * scale) - cx, y = (p.y * scale) - cx
        let d = sqrt(x * x + y * y)
        let i = Int(((R1 - d) / gap).rounded())
        guard i >= 0 && i < 10, abs(R1 - CGFloat(i) * gap - d) < gap * 0.6 else { return }
        var a = atan2(y, x) + .pi / 2; if a < 0 { a += 2 * .pi }
        let L = model.length(i), s = Int((a / (2 * .pi) * CGFloat(L)).rounded()) % L
        // close to a dot → toggle it; otherwise just select the ring
        let ang = Double(s) / Double(L) * 2 * Double.pi - Double.pi / 2
        let R = R1 - CGFloat(i) * gap
        let dx = cx + cos(ang) * R - (x + cx), dy = cx + sin(ang) * R - (y + cx)
        if sqrt(dx * dx + dy * dy) < gap * 0.7 && i == model.selectedTrack {
            let v = model.value(i, s)
            model.cycle(i, s); if v == 1 { model.cycle(i, s) }
        }
        model.selectedTrack = i
    }
    @State private var dialSize: CGFloat = 320

    private func drawOrbit(_ c: inout GraphicsContext, _ size: CGSize) {
        let w: CGFloat = size.width
        let cx: CGFloat = w / 2
        let R0: CGFloat = cx * 0.34
        let R1: CGFloat = cx * 0.95
        let gap: CGFloat = (R1 - R0) / 9
        let playing: Bool = model.playing
        let step: Int = model.step
        if playing && step >= 0 {
            // smooth hand: interpolate inside the step
            let sd: Double = 60.0 / Double(model.bpm) / 4.0
            let frac: Double = min(1, (CACurrentMediaTime() - model.stepTime) / sd)
            let a: CGFloat = CGFloat((Double(step) + frac) / 16 * 2 * Double.pi - Double.pi / 2)
            var p = Path()
            p.move(to: CGPoint(x: cx + cos(a) * R0 * 0.7, y: cx + sin(a) * R0 * 0.7))
            p.addLine(to: CGPoint(x: cx + cos(a) * (R1 + 6), y: cx + sin(a) * (R1 + 6)))
            let grad = Gradient(colors: [T.dmY.opacity(0), T.dmY.opacity(0.55)])
            c.stroke(p, with: .linearGradient(grad, startPoint: CGPoint(x: cx, y: cx), endPoint: CGPoint(x: cx + cos(a) * R1, y: cx + sin(a) * R1)), lineWidth: 1.5)
        }
        let dot: CGFloat = min(gap * 0.36, 5.5)
        for i in 0..<10 {
            let R: CGFloat = R1 - CGFloat(i) * gap
            let isSel: Bool = i == model.selectedTrack
            let col: Color = model.trackColor(i)
            let flare: Double = model.flash(i, 0.25)
            let ring = Path(ellipseIn: CGRect(x: cx - R, y: cx - R, width: 2 * R, height: 2 * R))
            c.stroke(ring, with: .color(isSel ? T.dmY.opacity(0.35) : T.dmInk.opacity(0.06)), lineWidth: 1)
            let L: Int = model.length(i)
            let pos: Int = playing && step >= 0 ? (L < 16 ? model.globalStep % L : step) : -1
            for s in 0..<L {
                let a: CGFloat = CGFloat(Double(s) / Double(L) * 2 * Double.pi - Double.pi / 2)
                let x: CGFloat = cx + cos(a) * R
                let y: CGFloat = cx + sin(a) * R
                let on: Bool = model.value(i, s) > 0
                let cur: Bool = s == pos
                let r: CGFloat = on ? dot * (cur ? 1.35 : 1) : max(1.2, dot * 0.4)
                let rect = CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)
                if on {
                    var g = c
                    let blur: CGFloat = cur ? 14 : (isSel ? 6 : 3) + CGFloat(flare) * 10
                    g.addFilter(.shadow(color: col.opacity(0.85), radius: blur / 3))
                    g.opacity = cur ? 1 : (isSel ? 1 : 0.82)
                    g.fill(Path(ellipseIn: rect), with: .color(cur ? Color.white : col))
                } else {
                    c.fill(Path(ellipseIn: rect), with: .color(T.dmInk.opacity(cur ? 0.6 : 0.16)))
                }
            }
        }
    }
}

struct OrbitSide: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let t = model.selectedTrack
        VStack(alignment: .leading, spacing: 8) {
            ctl("slag", "\(model.hits(t))") { model.setHits(t, model.hits(t) + $0) }
            ctl("rotera", "\(model.rotation(t))") { model.rotate(t, $0) }
            ctl("längd", "\(model.length(t))") { model.setLength(t, model.length(t) + $0) }
            Text("tryck på en ring för att välja spår · på en prick för att tända")
                .font(BFont.mono(9)).foregroundColor(T.dmInk.opacity(0.32)).lineSpacing(3).padding(.top, 4)
        }
        .frame(width: 150)
    }
    private func ctl(_ l: String, _ v: String, _ step: @escaping (Int) -> Void) -> some View {
        HStack(spacing: 4) {
            Text(l).font(BFont.mono(10)).tracking(0.4).foregroundColor(T.dmInk.opacity(0.5)).frame(width: 48, alignment: .leading)
            SqButton(label: "−") { step(-1) }
            Text(v).font(BFont.linje(15)).foregroundColor(T.dmInk).frame(width: 34)
            SqButton(label: "+") { step(1) }
        }
    }
}

/// The three steppers in a row with captions above (narrow layout).
struct OrbitSideRow: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let t = model.selectedTrack
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                stepper("slag", "\(model.hits(t))") { model.setHits(t, model.hits(t) + $0) }
                stepper("rotera", "\(model.rotation(t))") { model.rotate(t, $0) }
                stepper("längd", "\(model.length(t))") { model.setLength(t, model.length(t) + $0) }
            }
            Text("tryck på en ring för att välja spår · på en prick för att tända")
                .font(BFont.mono(9)).foregroundColor(T.dmInk.opacity(0.32)).multilineTextAlignment(.center)
        }
    }
    private func stepper(_ l: String, _ v: String, _ step: @escaping (Int) -> Void) -> some View {
        VStack(spacing: 6) {
            Text(l).font(BFont.mono(10)).tracking(0.4).foregroundColor(T.dmInk.opacity(0.5))
            HStack(spacing: 0) {
                SqButton(label: "−") { step(-1) }
                Text(v).font(BFont.linje(15)).frame(maxWidth: .infinity)
                SqButton(label: "+") { step(1) }
            }
            .foregroundColor(T.dmInk)
        }
        .frame(maxWidth: .infinity)
    }
}

/// Small square track selectors under the orbit (colour square + name).
struct OrbitTrackButtons: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        FlowLayout(spacing: 4) {
            ForEach(0..<10, id: \.self) { i in
                let on = i == model.selectedTrack
                Button { model.selectedTrack = i } label: {
                    HStack(spacing: 6) {
                        Rectangle().fill(model.trackColor(i)).frame(width: 7, height: 7)
                        Text(kTracks[i].name.lowercased())
                    }
                    .font(BFont.mono(10)).tracking(0.4)
                    .foregroundColor(on ? Color(hex: 0x17181A) : T.dmInk.opacity(0.6))
                    .padding(.horizontal, 9).frame(height: 26)
                    .background(on ? T.dmInk : Color.clear)
                    .overlay(Rectangle().strokeBorder(on ? Color.clear : T.dmLine, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

/// The rounded "1 kick trumma" tags.
struct TrackTags: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4), spacing: 6) {
            ForEach(0..<10, id: \.self) { i in
                let sel = i == model.selectedTrack
                Button { model.selectedTrack = i } label: {
                    HStack(spacing: 6) {
                        Text("\(i + 1)").font(BFont.mono(8, 500)).foregroundColor(sel ? T.fg : Color(hex: 0x111111))
                            .frame(width: 16, height: 16).background(Circle().fill(sel ? Color(hex: 0x111111) : model.trackColor(i)))
                        Text(kTracks[i].name.lowercased()).font(BFont.sans(12, 500)).foregroundColor(sel ? Color(hex: 0x111111) : T.dmInk)
                        Text(model.trackSub(i).lowercased()).font(BFont.sans(11)).foregroundColor(sel ? .black.opacity(0.55) : T.mute).lineLimit(1)
                        Spacer(minLength: 0)
                    }
                    .tracking(0.48)
                    .padding(.horizontal, 5).frame(height: 26)
                    .background(Capsule().fill(sel ? T.fg : Color.white.opacity(0.07)))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

/// Simple wrapping row layout (like flex-wrap).
struct FlowLayout: Layout {
    var spacing: CGFloat = 4
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let w = proposal.width ?? 500
        var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0
        for s in subviews { let sz = s.sizeThatFits(.unspecified); if x + sz.width > w && x > 0 { x = 0; y += rowH + spacing; rowH = 0 }; x += sz.width + spacing; rowH = max(rowH, sz.height) }
        return CGSize(width: w, height: y + rowH)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowH: CGFloat = 0
        for s in subviews { let sz = s.sizeThatFits(.unspecified); if x + sz.width > bounds.maxX && x > bounds.minX { x = bounds.minX; y += rowH + spacing; rowH = 0 }
            s.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(sz)); x += sz.width + spacing; rowH = max(rowH, sz.height) }
    }
}

/// Square ± button of the dark cards.
struct SqButton: View {
    let label: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(label).font(BFont.mono(14)).foregroundColor(T.dmInk).frame(width: 28, height: 28)
                .overlay(Rectangle().strokeBorder(T.dmLine, lineWidth: 1)).contentShape(Rectangle())
        }
        .buttonStyle(PressScale())
    }
}

/// Subtle press feedback for custom buttons.
struct PressScale: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.scaleEffect(configuration.isPressed ? 0.94 : 1).opacity(configuration.isPressed ? 0.8 : 1)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}
