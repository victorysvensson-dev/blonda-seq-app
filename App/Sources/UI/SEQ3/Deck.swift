import SwiftUI
import Accelerate
import UniformTypeIdentifiers

/// Open/closed state of the two drawers: the yellow master deck (bottom tab) and the dock drawer (top tab).
final class DrawerState: ObservableObject {
    static let shared = DrawerState()
    @Published var deck = false
    @Published var dock = false
    func setDeck(_ v: Bool) { withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) { deck = v; if v { dock = false } } }
    func setDock(_ v: Bool) { withAnimation(.spring(response: 0.42, dampingFraction: 0.84)) { dock = v; if v { deck = false } } }
}

// MARK: - analysis of the master output (UI thread, ~30 fps)

final class DeckScope {
    static let n = 2048
    private var l = [Float](repeating: 0, count: 2048), r = [Float](repeating: 0, count: 2048)
    private var win = [Float](repeating: 0, count: 2048)
    private var re = [Float](repeating: 0, count: 1024), im = [Float](repeating: 0, count: 1024)
    private let fft = vDSP.FFT(log2n: 11, radix: .radix2, ofType: DSPSplitComplex.self)
    private(set) var peakDb: Float = -90, rmsDb: Float = -90, hold: Float = -90
    private(set) var wave: [Float] = []        // peak per frame, newest last (the scrolling waveform)
    private(set) var loud: [Float] = []        // rms dB per frame for the last 30 s
    private(set) var spec = [Float](repeating: 0, count: 64)   // 0..1 per log band 40 Hz – 16 kHz
    private(set) var gonX: [Float] = [], gonY: [Float] = []
    private var lastT: Double = 0

    init() { vDSP_hann_window(&win, vDSP_Length(DeckScope.n), Int32(vDSP_HANN_NORM)) }

    func update(_ engine: BLONDAEngine, sampleRate: Double, t: Double) {
        guard t - lastT > 1.0 / 40 else { return }
        lastT = t
        let got = l.withUnsafeMutableBufferPointer { lp in r.withUnsafeMutableBufferPointer { rp in engine.scopeLeft(lp.baseAddress!, right: rp.baseAddress!, count: DeckScope.n) } }
        guard got == DeckScope.n else { return }
        var pk: Float = 0, ms: Float = 0
        vDSP_maxmgv(l, 1, &pk, vDSP_Length(DeckScope.n)); var pr: Float = 0; vDSP_maxmgv(r, 1, &pr, vDSP_Length(DeckScope.n)); pk = max(pk, pr)
        vDSP_measqv(l, 1, &ms, vDSP_Length(DeckScope.n))
        let pdb = 20 * log10(max(pk, 1e-5)), rdb = 10 * log10(max(ms, 1e-10))
        peakDb = max(pdb, peakDb - 1.2); rmsDb = rdb; hold = max(pdb, hold - 0.25)
        wave.append(pk); if wave.count > 240 { wave.removeFirst(wave.count - 240) }
        loud.append(rdb); if loud.count > 1200 { loud.removeFirst(loud.count - 1200) }
        // stereo: the last 512 samples as mid/side points
        let k0 = DeckScope.n - 512
        gonX = (0..<512).map { (l[k0 + $0] - r[k0 + $0]) * 0.7071 }
        gonY = (0..<512).map { (l[k0 + $0] + r[k0 + $0]) * 0.7071 }
        spectrum(sampleRate)
    }

    private func spectrum(_ sr: Double) {
        guard let fft = fft else { return }
        var mono = [Float](repeating: 0, count: DeckScope.n)
        vDSP_vadd(l, 1, r, 1, &mono, 1, vDSP_Length(DeckScope.n))
        vDSP_vmul(mono, 1, win, 1, &mono, 1, vDSP_Length(DeckScope.n))
        var mags = [Float](repeating: 0, count: DeckScope.n / 2)
        re.withUnsafeMutableBufferPointer { rp in im.withUnsafeMutableBufferPointer { ip in
            var sc = DSPSplitComplex(realp: rp.baseAddress!, imagp: ip.baseAddress!)
            mono.withUnsafeBufferPointer { mp in mp.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: DeckScope.n / 2) { vDSP_ctoz($0, 2, &sc, 1, vDSP_Length(DeckScope.n / 2)) } }
            fft.forward(input: sc, output: &sc)
            vDSP_zvabs(&sc, 1, &mags, 1, vDSP_Length(DeckScope.n / 2))
        } }
        let bins = spec.count, hz = sr / Double(DeckScope.n)
        for b in 0..<bins {
            let f0 = 40 * pow(400.0, Double(b) / Double(bins)), f1 = 40 * pow(400.0, Double(b + 1) / Double(bins))
            let i0 = max(1, Int(f0 / hz)), i1 = max(i0 + 1, min(DeckScope.n / 2, Int(f1 / hz)))
            var m: Float = 0; for i in i0..<i1 { m = max(m, mags[i]) }
            let db = 20 * log10(max(m / Float(DeckScope.n) * 4, 1e-6))
            let v = Float(max(0, min(1, (Double(db) + 72) / 66)))
            spec[b] = max(v, spec[b] * 0.86)
        }
    }
}

// MARK: - the yellow master deck (pulls up from the transport)

struct MasterDeck: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var drawers = DrawerState.shared
    @State private var scope = DeckScope()
    @State private var drag: CGFloat = 0
    var body: some View {
        GeometryReader { geo in
            let wide = geo.size.width >= 820
            VStack(spacing: 0) {
                DeckHead(drag: $drag)
                TimelineView(.animation(minimumInterval: 1.0 / 30)) { tl in
                    let t = tl.date.timeIntervalSinceReferenceDate
                    let _ = scope.update(model.engine, sampleRate: 48000, t: t)
                    Group {
                        if wide {
                            HStack(alignment: .top, spacing: 30) {
                                DeckLeft(scope: scope, t: t, fill: true).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                                DeckRight(scope: scope, t: t, fill: true).frame(width: min(560, geo.size.width * 0.42)).frame(maxHeight: .infinity, alignment: .top)
                            }
                            .padding(.bottom, 14)
                        } else {
                            ScrollView(.vertical, showsIndicators: false) {
                                VStack(spacing: 14) { DeckLeft(scope: scope, t: t); DeckRight(scope: scope, t: t) }
                            }
                        }
                    }
                }
                .frame(maxHeight: .infinity, alignment: .top)
                .padding(.horizontal, 22)
                DeckFoot().padding(.horizontal, 22).padding(.bottom, 14)
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
            .background(UnevenRoundedRectangle(cornerRadii: .init(topLeading: 26, topTrailing: 26)).fill(T.yellow).shadow(color: .black.opacity(0.45), radius: 30, y: -12))
            .offset(y: max(0, drag))
        }
        .foregroundColor(T.ink)
    }
}

private struct DeckHead: View {
    @EnvironmentObject var model: EngineModel
    @Binding var drag: CGFloat
    var body: some View {
        ZStack {
            Capsule().fill(T.ink.opacity(0.3)).frame(width: 40, height: 5).frame(maxHeight: .infinity, alignment: .top).padding(.top, 6)
            HStack {
                Text("master · ").font(BFont.mono(10)).foregroundColor(T.ink.opacity(0.55)) + Text(kWorlds[model.world].name.lowercased()).font(BFont.mono(10, 500))
                Spacer()
                Button { DrawerState.shared.setDeck(false) } label: {
                    SVGIcon(d: "M3 5l4 4 4-4", box: 14, size: 14, stroke: 1.6).frame(width: 34, height: 34).background(Circle().fill(T.ink.opacity(0.1)))
                }.buttonStyle(.plain).keyboardShortcut(.cancelAction)
            }
            .padding(.horizontal, 22).padding(.top, 10)
        }
        .frame(height: 54)
        .contentShape(Rectangle())
        .gesture(DragGesture(minimumDistance: 4)
            .onChanged { g in drag = max(0, g.translation.height) }
            .onEnded { g in
                if g.translation.height > 90 || g.predictedEndTranslation.height > 220 { DrawerState.shared.setDeck(false) }
                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) { drag = 0 }
            })
    }
}

/// a captioned box in the deck
private struct DBox<C: View>: View {
    let title: String
    var right: String = ""
    @ViewBuilder var content: () -> C
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title).font(BFont.mono(9)).tracking(0.5).foregroundColor(T.ink.opacity(0.55))
                Spacer()
                Text(right).font(BFont.mono(9)).tracking(0.5).foregroundColor(T.ink.opacity(0.75))
            }
            content()
        }
        .padding(.top, 8)
        .overlay(alignment: .top) { Rectangle().fill(T.ink.opacity(0.2)).frame(height: 1) }
    }
}

private struct DeckLeft: View {
    @EnvironmentObject var model: EngineModel
    let scope: DeckScope
    let t: Double
    var fill = false
    var body: some View {
        let el = model.playing ? max(0, CACurrentMediaTime() - model.playStart) : 0
        let beat = model.step >= 0 && model.playing ? model.step / 4 : -1
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .bottom, spacing: 16) {
                DotMatrixText(text: String(format: "%02d:%02d", Int(el) / 60, Int(el) % 60), height: 74, color: T.ink, offOpacity: 0.08)
                Spacer()
                HStack(spacing: 8) { ForEach(0..<4, id: \.self) { k in Circle().fill(T.ink.opacity(k == beat ? 1 : 0.18)).frame(width: 12, height: 12) } }.padding(.bottom, 6)
            }
            DBox(title: "master · vågform", right: model.playing ? "spelar" : "stopp") {
                Canvas { c, size in
                    // dot matrix like the web: the newest audio on the right, each column lit from the middle out
                    let pitch: CGFloat = 6, cols = Int(size.width / pitch), rows = Int(size.height / pitch)
                    let w = scope.wave, n = w.count, per = max(1, n / max(1, cols))
                    var on = Path(), off = Path()
                    for col in 0..<cols {
                        var v: Float = 0
                        let i1 = n - (cols - col - 1) * per
                        if i1 > 0 { for i in max(0, i1 - per)..<min(n, i1) { v = max(v, w[i]) } }
                        let half = CGFloat(min(1, v)) * CGFloat(rows) / 2
                        for r in 0..<rows {
                            let d = abs(CGFloat(r) + 0.5 - CGFloat(rows) / 2)
                            let rc = CGRect(x: CGFloat(col) * pitch + pitch / 2 - 1.9, y: CGFloat(r) * pitch + pitch / 2 - 1.9, width: 3.8, height: 3.8)
                            if d < max(0.5, half) && v > 0.004 { on.addEllipse(in: rc) } else { off.addRect(rc.insetBy(dx: 1.3, dy: 1.3)) }
                        }
                    }
                    c.fill(off, with: .color(T.ink.opacity(0.16))); c.fill(on, with: .color(T.ink))
                }
                .frame(minHeight: 96, maxHeight: fill ? .infinity : 96)
            }
            DBox(title: "spår · mönster \(["A", "B", "C", "D"][model.pattern].lowercased())", right: "10 × 16") {
                Canvas { c, size in
                    let cw = size.width / 16, ch = size.height / 10, now = CACurrentMediaTime()
                    for tr in 0..<10 {
                        let flash = max(0, 1 - (now - model.hitTime[tr]) * 4)
                        for s in 0..<16 {
                            let v = model.value(tr, s)
                            let r = CGRect(x: CGFloat(s) * cw + 1.5, y: CGFloat(tr) * ch + 1.5, width: cw - 3, height: ch - 3)
                            let on = s == model.step && model.playing
                            if v == 0 {   // an empty step is a small dot, like the web deck
                                let d: CGFloat = on ? 4 : 2.6
                                c.fill(Path(ellipseIn: CGRect(x: r.midX - d / 2, y: r.midY - d / 2, width: d, height: d)), with: .color(T.ink.opacity(on ? 0.7 : 0.28)))
                                continue
                            }
                            let a: Double = v == 2 ? 1 : 0.62
                            c.fill(Path(roundedRect: r, cornerRadius: 2), with: .color(T.ink.opacity(on ? 1 : a * (0.85 + 0.15 * flash))))
                        }
                    }
                }
                .frame(minHeight: 150, maxHeight: fill ? .infinity : 150)
            }
        }
    }
}

/// the dot-matrix ground the web deck draws under its scopes
private func deckDots(_ c: GraphicsContext, _ size: CGSize, pitch: CGFloat = 6) {
    var p = Path()
    var y = pitch / 2
    while y < size.height { var x = pitch / 2; while x < size.width { p.addRect(CGRect(x: x - 0.6, y: y - 0.6, width: 1.2, height: 1.2)); x += pitch }; y += pitch }
    c.fill(p, with: .color(T.ink.opacity(0.16)))
}

private struct DeckRight: View {
    @EnvironmentObject var model: EngineModel
    let scope: DeckScope
    let t: Double
    var fill = false
    private func p(_ f: Int) -> Float { let d = kMasterParams.first { $0.field == f }!; return model.param(d, 0) }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 16) {
                DBox(title: "stereo", right: "l · r") {
                    Canvas { c, size in
                        let m = min(size.width, size.height) / 2 - 1, cx = size.width / 2, cy = size.height / 2
                        c.stroke(Path(ellipseIn: CGRect(x: cx - m, y: cy - m, width: 2 * m, height: 2 * m)), with: .color(T.ink.opacity(0.3)), style: StrokeStyle(lineWidth: 1.2, dash: [1.2, 4]))
                        var cross = Path(); cross.move(to: CGPoint(x: cx - m, y: cy)); cross.addLine(to: CGPoint(x: cx + m, y: cy)); cross.move(to: CGPoint(x: cx, y: cy - m)); cross.addLine(to: CGPoint(x: cx, y: cy + m))
                        c.stroke(cross, with: .color(T.ink.opacity(0.22)), style: StrokeStyle(lineWidth: 1, dash: [1, 5]))
                        var path = Path()
                        for i in 0..<scope.gonX.count {
                            let x = cx + CGFloat(max(-1, min(1, scope.gonX[i]))) * m, y = cy - CGFloat(max(-1, min(1, scope.gonY[i]))) * m
                            path.addRect(CGRect(x: x, y: y, width: 1.4, height: 1.4))
                        }
                        c.fill(path, with: .color(T.ink.opacity(0.75)))
                    }
                    .frame(minHeight: 110, maxHeight: fill ? 170 : 110)
                }
                .frame(maxWidth: .infinity)
                DBox(title: "spektrum", right: "40 hz – 16 khz") {
                    Canvas { c, size in
                        // dot columns, lit from the bottom (web)
                        let pitch: CGFloat = 6, cols = Int(size.width / pitch), rows = Int(size.height / pitch), n = scope.spec.count
                        var on = Path(), off = Path()
                        for col in 0..<cols {
                            let a = col * n / max(1, cols), b = max(a + 1, (col + 1) * n / max(1, cols))
                            var v: Float = 0; for i in a..<min(n, b) { v = max(v, scope.spec[i]) }
                            let lit = Int((CGFloat(v) * CGFloat(rows)).rounded())
                            for r in 0..<rows {
                                let rc = CGRect(x: CGFloat(col) * pitch + pitch / 2 - 1.9, y: size.height - CGFloat(r + 1) * pitch + pitch / 2 - 1.9, width: 3.8, height: 3.8)
                                if r < lit { on.addEllipse(in: rc) } else { off.addRect(rc.insetBy(dx: 1.3, dy: 1.3)) }
                            }
                        }
                        c.fill(off, with: .color(T.ink.opacity(0.16))); c.fill(on, with: .color(T.ink))
                    }
                    .frame(minHeight: 110, maxHeight: fill ? 170 : 110)
                }
                .frame(maxWidth: .infinity)
                .layoutPriority(1.4)
            }
            DeckStats(items: [("peak db", String(format: "%.1f", max(-60, scope.peakDb))), ("rms db", String(format: "%.1f", max(-60, scope.rmsDb))),
                              ("bpm", "\(Int(model.bpm.rounded()))"), ("mönster", ["A", "B", "C", "D"][model.pattern])])
            DBox(title: "kanaler · senaste slagen", right: "10") {
                VStack(spacing: 6) {
                Canvas { c, size in
                    let now = CACurrentMediaTime(), bw = size.width / 10
                    for tr in 0..<10 {
                        let v = model.hitVel[tr] * exp(-(now - model.hitTime[tr]) * 5)
                        let h = max(2, CGFloat(v) * size.height)
                        c.fill(Path(CGRect(x: CGFloat(tr) * bw + 3, y: size.height - h, width: bw - 6, height: h)), with: .color(Color(hex: model.trackHex(tr)).opacity(0.25)))
                        c.fill(Path(CGRect(x: CGFloat(tr) * bw + 3, y: size.height - h, width: bw - 6, height: h)), with: .color(T.ink.opacity(0.85)))
                        // the fader track, dotted like the web
                        var d = Path(); var y: CGFloat = 2
                        while y < size.height - h { d.addRect(CGRect(x: CGFloat(tr) * bw + bw / 2 - 0.6, y: y, width: 1.2, height: 1.2)); y += 5 }
                        c.fill(d, with: .color(T.ink.opacity(0.25)))
                    }
                }
                .frame(minHeight: 64, maxHeight: fill ? 120 : 64)
                HStack(spacing: 0) {
                    ForEach(0..<10, id: \.self) { tr in
                        Text(model.trackShort(tr, max: 6, chopMark: false).lowercased()).font(BFont.mono(8.5, 500)).foregroundColor(T.ink.opacity(0.8)).lineLimit(1).minimumScaleFactor(0.7).frame(maxWidth: .infinity)
                    }
                }
                }
            }
            DBox(title: "nivå · senaste 30 s", right: String(format: "%.0f db", max(-60, scope.rmsDb))) {
                Canvas { c, size in
                    let a = scope.loud, n = 1200, dx = size.width / CGFloat(n)
                    var path = Path(); var first = true
                    for (i, v) in a.enumerated() {
                        let x = size.width - CGFloat(a.count - i) * dx, y = size.height * CGFloat(1 - max(0, min(1, (Double(v) + 48) / 48)))
                        if first { path.move(to: CGPoint(x: x, y: y)); first = false } else { path.addLine(to: CGPoint(x: x, y: y)) }
                    }
                    c.stroke(path, with: .color(T.ink), lineWidth: 1.5)
                }
                .background(Canvas { c, size in deckDots(c, size) })
                .frame(minHeight: 54, maxHeight: fill ? 90 : 54)
            }
            DBox(title: "låt", right: model.songMode ? "på" : "av") {
                HStack(spacing: 5) {
                    ForEach(0..<8, id: \.self) { k in
                        let v = model.chainSlot(k), on = model.songMode && model.chainIdx == k
                        Text(v >= 0 ? ["A", "B", "C", "D"][v] : "·").font(BFont.pixel(17))
                            .foregroundColor(on ? T.yellow : T.ink.opacity(v >= 0 ? 0.9 : 0.35))
                            .frame(maxWidth: .infinity).frame(height: 36)
                            .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(on ? T.ink : Color.clear))
                            .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).strokeBorder(T.ink.opacity(on ? 0 : 0.3), lineWidth: 1))
                    }
                }
            }
            DeckStats(items: [("takt", "\(model.bar + 1).\(max(0, model.step) / 4 + 1)"), ("swing", "\(Int((50 + p(5) * 41.6).rounded())) %"),
                              ("pump", "\(Int((p(4) * 100).rounded())) %"), ("eko · rum", "\(Int((p(1) * 100).rounded())) · \(Int((p(2) * 100).rounded()))")])
        }
    }
}

private struct DeckStats: View {
    let items: [(String, String)]
    var body: some View {
        HStack(spacing: 0) {
            ForEach(items.indices, id: \.self) { i in
                VStack(alignment: .leading, spacing: 4) {
                    Text(items[i].0).font(BFont.mono(9)).tracking(0.5).foregroundColor(T.ink.opacity(0.6))
                    Text(items[i].1).font(BFont.linje(20)).foregroundColor(T.ink).lineLimit(1).minimumScaleFactor(0.6)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.top, 10)
        .overlay(alignment: .top) { Rectangle().fill(T.ink.opacity(0.2)).frame(height: 1) }
    }
}

private struct DeckFoot: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 9) {
                ForEach(0..<16, id: \.self) { k in
                    let on = model.playing && model.step == k
                    Circle().fill(T.ink.opacity(on ? 1 : (k % 4 == 0 ? 0.3 : 0.17))).frame(width: on ? 10 : 8, height: on ? 10 : 8).frame(width: 10)
                }
            }
            .accessibilityLabel("dra ner eller tryck på pilen för att stänga")
            Spacer()
            Button { model.toggleRecord() } label: {
                ZStack { Circle().fill(model.recording ? T.ink : Color.clear); Circle().strokeBorder(T.ink, lineWidth: 2); Circle().fill(Color(hex: 0xFF4A33)).frame(width: 16, height: 16) }.frame(width: 54, height: 54)
            }.buttonStyle(PressScale())
            Button { model.togglePlay() } label: {
                ZStack {
                    Circle().fill(T.ink)
                    if model.playing { HStack(spacing: 4) { RoundedRectangle(cornerRadius: 1).frame(width: 4, height: 14); RoundedRectangle(cornerRadius: 1).frame(width: 4, height: 14) }.foregroundColor(T.yellow) }
                    else { SVGIcon(d: "M7 4.5v15l13-7.5z", box: 24, size: 22, stroke: nil, fill: true).foregroundColor(T.yellow) }
                }.frame(width: 54, height: 54)
            }.buttonStyle(.plain)
        }
        .padding(.top, 12)
        .overlay(alignment: .top) { Rectangle().fill(T.ink.opacity(0.2)).frame(height: 1) }
    }
}

// MARK: - the dock drawer (pulls down from the top dock)

struct DockDrawer: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var store = EngineModel.sharedProjects
    @State private var name = ""
    @State private var taps: [Double] = []
    @State private var importing = false
    @State private var exporting = false
    @State private var thumbs: [String: [[Int]]] = [:]
    @FocusState private var nameFocus: Bool
    private static let fmt: DateFormatter = { let f = DateFormatter(); f.locale = Locale(identifier: "sv_SE"); f.dateFormat = "d MMM HH:mm"; return f }()
    private func when(_ t: Double) -> String { Self.fmt.string(from: Date(timeIntervalSince1970: t / 1000)).lowercased() }
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                TextField("projektnamn", text: $name)
                    .font(BFont.sans(20, 300)).foregroundColor(T.hfg).textFieldStyle(.plain)
                    .focused($nameFocus)
                    .onSubmit { rename() }
                Text(store.currentMeta.map { "sparat " + when($0.t) } ?? "").font(BFont.mono(9)).foregroundColor(T.hmute)
            }
            .padding(.horizontal, 12).frame(height: 40)
            .background(Capsule().fill(Color.white.opacity(0.08)))
            HStack(spacing: 6) {
                DrawerBtn(title: "spara", icon: "M3 3h8l2 2v8H3zM5.5 3v3h4V3M5 13V9h6v4", light: true) { model.flushSave(); model.showToast("Sparat · \(store.currentMeta?.name ?? "")") }
                DrawerBtn(title: "ny", icon: "M8 3v10M3 8h10") { model.newProject(); load() }
                DrawerBtn(title: "duplicera", icon: "M5 5h8.5v8.5H5zM3 10.5V3.5A1 1 0 0 1 4 2.5h6.5") { duplicate() }
                DrawerBtn(title: "exportera", icon: "M8 2v9M4.5 7.5 8 11l3.5-3.5M3 10v3.5h10V10") { model.flushSave(); exporting = true }
                DrawerBtn(title: "importera", icon: "M8 11V2M4.5 5.5 8 2l3.5 3.5M3 10v3.5h10V10") { importing = true }
            }
            DrawerBtn(title: "alla projekt", icon: "M2.5 3.5h11v9h-11zM2.5 6.5h11") { DrawerState.shared.setDock(false); model.openProjects() }
            DrawerLabel(text: "byt låt")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(store.items.sorted { $0.t > $1.t }) { p in
                        Button { if p.id != store.current { model.openProject(p.id); load() } else { model.showToast("Redan öppet") } } label: {
                            let cur = p.id == store.current
                            VStack(alignment: .leading, spacing: 3) {
                                Text(p.name).font(BFont.sans(13, cur ? 500 : 300)).lineLimit(1)
                                Text("\(when(p.t)) · \(p.bpm > 0 ? "\(Int(p.bpm.rounded()))" : "—") bpm").font(BFont.mono(8.5)).opacity(0.6).lineLimit(1)
                                // the first pattern as a tiny dot grid, like the web drawer
                                Canvas { c, size in
                                    guard let rows = thumbs[p.id], !rows.isEmpty else { return }
                                    let cw = size.width / 16, ch = size.height / CGFloat(rows.count)
                                    var on = Path(), off = Path()
                                    for (r, row) in rows.enumerated() { for (k, v) in row.prefix(16).enumerated() {
                                        let d: CGFloat = v > 0 ? 2.4 : 1.2
                                        let rc = CGRect(x: CGFloat(k) * cw + cw / 2 - d / 2, y: CGFloat(r) * ch + ch / 2 - d / 2, width: d, height: d)
                                        if v > 0 { on.addRect(rc) } else { off.addRect(rc) }
                                    } }
                                    c.fill(off, with: .color(.white.opacity(0.12))); c.fill(on, with: .color(.white.opacity(0.9)))
                                }
                                .frame(height: 26).padding(.top, 4)
                            }
                            .foregroundColor(T.hfg)
                            .padding(.horizontal, 10).padding(.vertical, 9).frame(width: 136, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.white.opacity(cur ? 0.1 : 0.06)))
                            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(cur ? T.yellow : Color.white.opacity(0.12), lineWidth: cur ? 2 : 1))
                        }
                        .buttonStyle(PressScale())
                    }
                }
            }
            DrawerLabel(text: "spela")
            HStack(spacing: 6) {
                DrawerBtn(title: model.songMode ? "låtläge på" : "låtläge", on: model.songMode) { model.toggleSong() }
                DrawerBtn(title: "tap tempo  \(Int(model.bpm.rounded()))") { tap() }
                DrawerBtn(title: "−", width: 44) { model.nudgeBPM(-1) }
                DrawerBtn(title: "+", width: 44) { model.nudgeBPM(1) }
            }
            DrawerLabel(text: "vy")
            HStack(spacing: 6) {
                DrawerBtn(title: "BLONDA DUO · allt i ett fönster", on: true) { DrawerState.shared.setDock(false); LayoutStore.shared.toggle() }
                DrawerBtn(title: "förhandsvisa iPhone Duo") { DrawerState.shared.setDock(false); withAnimation(.easeInOut(duration: 0.3)) { LayoutStore.shared.preview = true } }
            }
        }
        .padding(.top, 10).padding(.bottom, 4)
        .onAppear { load(); for p in store.items { if let j = store.json(p.id) { thumbs[p.id] = ProjectStore.thumb(j) } } }
        .onChange(of: store.current) { _, _ in load() }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { r in
            if case .success(let u) = r { model.importProject(u); load() }
        }
        .fileExporter(isPresented: $exporting, document: ProjectFile(text: store.json(store.current) ?? ""), contentType: .json,
                      defaultFilename: (store.currentMeta?.name ?? "projekt") + ".json") { _ in }
        .onChange(of: nameFocus) { _, f in model.textEditing = f; if !f { rename() } }
    }
    private func load() { name = store.currentMeta?.name ?? "" }
    private func rename() {
        let n = name.trimmingCharacters(in: .whitespaces)
        guard !store.current.isEmpty else { return }
        store.rename(store.current, n.isEmpty ? "Utan namn" : n)
    }
    private func duplicate() {
        model.flushSave()
        guard let m = store.duplicate(store.current) else { return }
        model.openProject(m.id); load()
        model.showToast("Duplicerat · \(m.name)")
    }
    private func tap() {
        let n = CACurrentMediaTime()
        taps = taps.filter { n - $0 < 2.2 }; taps.append(n)
        if taps.count >= 3 { let d = (taps[taps.count - 1] - taps[0]) / Double(taps.count - 1); model.setBPM(Float(60 / d)) }
    }
}

private struct DrawerLabel: View {
    let text: String
    var body: some View { Text(text).font(BFont.mono(8.5)).tracking(0.6).foregroundColor(T.hmute).padding(.top, 4) }
}

private struct DrawerBtn: View {
    let title: String
    var on = false
    var width: CGFloat? = nil
    var icon: String? = nil
    var light = false   // the white "spara" pill (web)
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                if let icon { SVGIcon(d: icon, size: 13) }
                Text(title).font(BFont.mono(10, 500)).tracking(0.3).lineLimit(1)
            }
            .foregroundColor(on || light ? Color(hex: 0x17181A) : T.hfg)
            .padding(.horizontal, 14).frame(width: width, height: 36)
            .background(Capsule().fill(light ? Color(hex: 0xF2F1EC) : (on ? T.yellow : Color.white.opacity(0.1))))
            .overlay(Capsule().strokeBorder(.white.opacity(on || light ? 0 : 0.14), lineWidth: 1))
        }
        .buttonStyle(PressScale())
    }
}
