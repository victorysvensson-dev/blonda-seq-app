import SwiftUI

// Light / dark sound modules: "Ljud" (track sound), "FX" (track effects dial), "Master" (glue · tape knobs).

private let kInk = Color(rgb: 29, 29, 27)

/// One radial tick on a knob ring (angles in degrees, 0 = 3 o'clock).
func knobTick(_ c: inout GraphicsContext, center: CGFloat, r0: CGFloat, r1: CGFloat, deg: Double, color: Color, width: CGFloat) {
    let a: CGFloat = CGFloat(deg * Double.pi / 180)
    let ca: CGFloat = cos(a), sa: CGFloat = sin(a)
    var p = Path()
    p.move(to: CGPoint(x: center + ca * r0, y: center + sa * r0))
    p.addLine(to: CGPoint(x: center + ca * r1, y: center + sa * r1))
    c.stroke(p, with: .color(color), lineWidth: width)
}
func knobPoint(center: CGFloat, r: CGFloat, deg: Double) -> CGPoint {
    let a: CGFloat = CGFloat(deg * Double.pi / 180)
    return CGPoint(x: center + cos(a) * r, y: center + sin(a) * r)
}

/// Drag horizontally (or vertically) to change a parameter; reports values in the parameter's own range.
struct ParamDrag: ViewModifier {
    @EnvironmentObject var model: EngineModel
    let def: ParamDef
    let track: Int
    var horizontal = true
    var points: CGFloat = 220        // drag distance for the full range
    @State private var start: Float?
    @GestureState private var live = false
    func body(content: Content) -> some View {
        content.contentShape(Rectangle()).gesture(DragGesture(minimumDistance: 1).updating($live) { _, s, _ in s = true }.onChanged { g in
            if start == nil { start = model.param(def, track) }
            let d = horizontal ? g.translation.width : -g.translation.height
            model.setParam(def, track, start! + Float(d / points) * (def.hi - def.lo))
        }.onEnded { _ in start = nil })
        .onChange(of: live) { _, v in if !v { start = nil }; ScrollLock.shared.set(v) }
    }
}

// MARK: - Ljud

struct SoundCard: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var fold = FoldStore.shared
    var body: some View {
        let t = model.selectedTrack
        let head = Color(rgb: 39, 36, 38)
        VStack(spacing: 0) {
            // dark caption + hero
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 8) {
                    (Text("ljud · ").foregroundColor(.white.opacity(0.7)) + Text("\(kTracks[t].name.lowercased()) · \(model.trackSub(t).lowercased())").foregroundColor(.white).font(BFont.mono(9.5, 500)))
                        .font(BFont.mono(9.5)).tracking(0.855)
                    Spacer()
                    HStack(spacing: 5) { LiteCap(.min, dark: true, fold: "ljud"); LiteCap(.full, dark: true, fold: "ljud") }
                    LiteCap(.grab, dark: true).padding(.leading, 8)
                }
                .frame(height: 26).padding(.top, 10).padding(.bottom, fold.isFolded("ljud") ? 10 : 0)
                if !fold.isFolded("ljud") { DecayHero(track: t) }
            }
            .padding(.horizontal, 16)
            .background(head)
            if !fold.isFolded("ljud") {
                VStack(spacing: 8) {
                    LevelTile(track: t)
                    HStack(spacing: 8) { FxTile(track: t); TuneTile(track: t) }
                    PanTile(track: t)
                }
                .padding(10)
            }
        }
        .background(Color(rgb: 229, 228, 224))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: .black.opacity(0.45), radius: 22, y: 13)
    }
}

/// The caption buttons in the light/hero style (white 16 % circles on dark, ink 6 % on light).
struct LiteCap: View {
    let kind: CapButton.Kind
    let dark: Bool
    var fold: String? = nil
    init(_ k: CapButton.Kind, dark: Bool, fold: String? = nil) { kind = k; self.dark = dark; self.fold = fold }
    var body: some View {
        CapButton(kind: kind, dark: false, tint: dark ? .white : kInk, fill: dark ? Color.white.opacity(0.16) : kInk.opacity(0.06), fold: fold)
    }
}

struct DecayHero: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        let def = kTrackParams[2]
        let d = Double(model.param(def, track))
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("decay").font(BFont.mono(10, 300)).tracking(0.6)
                Spacer()
                Text("dra ← →").font(BFont.mono(9, 300)).tracking(0.6).opacity(0.8)
            }
            .foregroundColor(.white).padding(.top, 6)
            HStack(alignment: .bottom, spacing: 14) {
                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text("\(Int((60 + d * 940).rounded()))").font(BFont.sans(52, 200)).tracking(-1.5)
                    Text("ms").font(BFont.sans(16, 300))
                }
                .foregroundColor(.white).fixedSize()
                DecayCurve(track: track, decay: d).frame(height: 78)
            }
            Text(d < 0.25 ? "Kort och tight. Ger luft mellan slagen och håller groovet stramt." : d < 0.6 ? "Balanserad svans. Sitter i groovet utan att ta över." : "Lång svans. Fyller ut rummet och svävar in i nästa slag.")
                .font(BFont.sans(12, 300)).foregroundColor(.white).padding(.bottom, 14)
        }
        .modifier(ParamDrag(def: def, track: track))
    }
}

/// Envelope sketch: a decaying stroke restarting on every hit of the track, with "n steg" labels.
struct DecayCurve: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let decay: Double
    var body: some View {
        let hitsAt = (0..<16).filter { model.value(track, $0) > 0 }
        Canvas { c, size in
            let w: CGFloat = size.width, h: CGFloat = size.height, top: CGFloat = 18
            guard !hitsAt.isEmpty else { return }
            let tau: Double = 0.05 + decay * 0.55      // in bars-of-16 units (visual)
            var p = Path(); var first = true
            for x in stride(from: CGFloat(0), through: w, by: 1.5) {
                let pos: Double = Double(x / w) * 16
                let last: Int = hitsAt.last(where: { Double($0) <= pos }) ?? (hitsAt.last! - 16)
                let dt: Double = (pos - Double(last)) / 16
                let wob: Double = sin(Double(x) * 0.9) * 0.012
                let v: Double = exp(-dt / max(0.01, tau) * 3) * 0.92 + wob
                let y: CGFloat = top + (h - top) * CGFloat(1 - max(0, min(1, v)))
                if first { p.move(to: CGPoint(x: x, y: y)); first = false } else { p.addLine(to: CGPoint(x: x, y: y)) }
            }
            c.stroke(p, with: .color(.white), lineWidth: 1.6)
            for (k, s) in hitsAt.enumerated() where k % max(1, hitsAt.count / 4) == 0 {
                let x: CGFloat = CGFloat(s) / 16 * w
                let label: Text = Text("\(s + 1)").font(BFont.sans(13, 300)).foregroundColor(.white) + Text(" steg").font(BFont.sans(9, 300)).foregroundColor(Color.white.opacity(0.8))
                c.draw(label, at: CGPoint(x: x + 2, y: 6), anchor: .leading)
            }
        }
    }
}

private struct Tile<C: View>: View {
    let title: String
    @ViewBuilder var content: () -> C
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Circle().fill(kInk.opacity(0.55)).frame(width: 8, height: 8).overlay(Circle().strokeBorder(.white, lineWidth: 1.5).padding(-2))
                Text(title).font(BFont.mono(9.5, 500)).tracking(0.76).foregroundColor(kInk.opacity(0.55))
            }
            content()
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(LinearGradient(colors: [.white, Color(rgb: 250, 250, 247)], startPoint: .top, endPoint: .bottom)))
        .shadow(color: kInk.opacity(0.08), radius: 6, y: 3)
    }
}

struct LevelTile: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        let def = kTrackParams[0], v = Double(model.param(def, track))
        Tile(title: "nivå") {
            HStack(alignment: .bottom, spacing: 18) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(Int((v * 100).rounded()))").font(BFont.sans(38, 200)).tracking(-1)
                    Text(v < 0.3 ? "svag" : v < 0.7 ? "medel" : "stark").font(BFont.mono(10)).foregroundColor(kInk.opacity(0.7))
                }
                .foregroundColor(kInk).frame(width: 70, alignment: .leading)
                VStack(spacing: 4) {
                    Canvas { c, size in
                        let n: Int = 42
                        let gap: CGFloat = 2.4
                        let bw: CGFloat = (size.width - gap * CGFloat(n - 1)) / CGFloat(n)
                        for i in 0..<n {
                            let f: Double = Double(i) / Double(n - 1)
                            let h: CGFloat = size.height * CGFloat(0.12 + 0.88 * f)
                            let r = CGRect(x: CGFloat(i) * (bw + gap), y: size.height - h, width: bw, height: h)
                            let col: Color = f <= v ? kInk.opacity(0.35 + 0.35 * f) : kInk.opacity(0.07)
                            c.fill(Path(roundedRect: r, cornerRadius: bw / 2), with: .color(col))
                        }
                        let mx: CGFloat = CGFloat(v) * size.width
                        c.fill(Path(CGRect(x: mx - 1, y: 0, width: 2, height: size.height)), with: .color(kInk))
                    }
                    .frame(height: 58)
                    HStack { Text("0"); Spacer(); Text("50"); Spacer(); Text("100") }.font(BFont.mono(9)).foregroundColor(kInk.opacity(0.6))
                }
                .modifier(ParamDrag(def: def, track: track, points: 300))
            }
        }
    }
}

struct FxTile: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        let e = Double(model.param(kTrackParams[5], track)), s = Double(model.param(kTrackParams[6], track))
        Tile(title: "echo · space") {
            (Text("\(Int((e * 100).rounded()))").font(BFont.sans(34, 200)) + Text(" / ").font(BFont.sans(12, 300)).foregroundColor(kInk.opacity(0.5))
             + Text("\(Int((s * 100).rounded()))").font(BFont.sans(34, 200)) + Text(" %").font(BFont.sans(11, 300)).foregroundColor(kInk.opacity(0.5)))
                .foregroundColor(kInk).tracking(-1.3)
            VStack(spacing: 8) {
                bar("echo", e, kTrackParams[5])
                bar("space", s, kTrackParams[6])
            }
            .padding(.top, 6)
        }
    }
    private func bar(_ label: String, _ v: Double, _ def: ParamDef) -> some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Rectangle().fill(kInk.opacity(0.08))
                Rectangle().fill(kInk.opacity(0.85)).frame(width: max(3, g.size.width * CGFloat(v)))
                Text(label).font(BFont.sans(11, 300)).foregroundColor(v > 0.25 ? .white : kInk.opacity(0.7)).padding(.leading, 12)
            }
        }
        .frame(height: 26)
        .modifier(ParamDrag(def: def, track: track, points: 200))
    }
}

struct TuneTile: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        let def = kTrackParams[3], v = Double(model.param(def, track))
        Tile(title: "tune") {
            (Text("\(v > 0 ? "+" : "")\(Int(v.rounded()))").font(BFont.sans(34, 200)) + Text(" st").font(BFont.sans(11, 300)).foregroundColor(kInk.opacity(0.5)))
                .foregroundColor(kInk)
            GeometryReader { g in
                let x = g.size.width * CGFloat((v + 12) / 24)
                ZStack(alignment: .leading) {
                    Rectangle().fill(kInk.opacity(0.85)).frame(height: 2)
                    ForEach([0.0, 0.25, 0.5, 0.75, 1.0], id: \.self) { f in Rectangle().fill(kInk.opacity(0.25)).frame(width: 1, height: 8).offset(x: g.size.width * f) }
                    Circle().fill(kInk.opacity(0.75)).frame(width: 12, height: 12).offset(x: x - 6)
                }
                .frame(maxHeight: .infinity)
            }
            .frame(height: 60)
            .modifier(ParamDrag(def: def, track: track, points: 200))
        }
    }
}

struct PanTile: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        let def = kTrackParams[4], v = Double(model.param(def, track))
        Tile(title: "pan") {
            HStack(spacing: 20) {
                Text(abs(v) < 0.02 ? "C" : (v < 0 ? "L" : "R") + "\(Int(abs(v) * 100))").font(BFont.sans(38, 200)).foregroundColor(kInk).frame(width: 110, alignment: .leading)
                VStack(spacing: 2) {
                    Canvas { c, size in
                        let n: Int = 41
                        let H: CGFloat = size.height
                        for i in 0..<n {
                            let x: CGFloat = CGFloat(i) / CGFloat(n - 1) * size.width
                            let major: Bool = i % 10 == 0
                            let r = major ? CGRect(x: x - 0.5, y: 0, width: 1, height: H) : CGRect(x: x - 0.5, y: H * 0.25, width: 1, height: H * 0.5)
                            c.fill(Path(r), with: .color(kInk.opacity(major ? 0.6 : 0.3)))
                        }
                        let x: CGFloat = CGFloat((v + 1) / 2) * size.width
                        c.fill(Path(ellipseIn: CGRect(x: x - 6, y: size.height / 2 - 6, width: 12, height: 12)), with: .color(kInk.opacity(0.7)))
                    }
                    .frame(height: 26)
                    HStack { Text("L"); Spacer(); Text("R") }.font(BFont.mono(9)).foregroundColor(kInk.opacity(0.6))
                }
                .modifier(ParamDrag(def: def, track: track, points: 260))
            }
        }
    }
}

// MARK: - FX dial

private let kFxDesc = ["mättnad och värme", "vänster lowpass · höger highpass", "resonans i filtret", "bitreducering", "jämnar ut och trycker ihop", "duckar mot kicken"]
private let kFxName = ["drive", "filter", "reso", "crush", "komp", "pump"]

func fxText(_ field: Int, _ v: Float) -> String {
    if field == 1 { return abs(v) < 0.02 ? "AV" : (v < 0 ? "LP" : "HP") + "\(Int(abs(v) * 100))" }
    return v < 0.005 ? "AV" : "\(Int((v * 100).rounded()))"
}

struct FXCard: View {
    @EnvironmentObject var model: EngineModel
    @State private var active = 0
    var body: some View {
        let t = model.selectedTrack, def = kFxParams[active], v = model.param(def, t)
        Card(style: .solid(Color(rgb: 27, 27, 28)), title: [("FX · ", false), (kTracks[t].name.lowercased(), true)]) {
            VStack(spacing: 10) {
                DotMatrixText(text: fxText(active, v), height: 50, color: Color(rgb: 214, 214, 210))
                Text(kFxName[active]).font(BFont.mono(12)).tracking(0.72).foregroundColor(Color(rgb: 242, 242, 239))
                Text(kFxDesc[active]).font(BFont.sans(11)).foregroundColor(T.fg.opacity(0.45))
                FxRuler(def: def, value: v).frame(height: 46).modifier(ParamDrag(def: def, track: t, points: 260))
                HStack(spacing: 8) {
                    ForEach(0..<6, id: \.self) { k in Circle().fill(k == active ? .white : Color.white.opacity(0.22)).frame(width: k == active ? 7 : 6, height: k == active ? 7 : 6).onTapGesture { active = k } }
                }
                HStack(alignment: .center, spacing: 12) {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                        ForEach(0..<6, id: \.self) { k in
                            let kv = model.param(kFxParams[k], t)
                            HStack(spacing: 10) {
                                MiniKnob(value: Double((kv - kFxParams[k].lo) / (kFxParams[k].hi - kFxParams[k].lo)), on: k == active)
                                VStack(alignment: .leading, spacing: 0) {
                                    Text(fxText(k, kv)).font(BFont.sans(19, 300)).foregroundColor(T.fg.opacity(k == active ? 0.95 : 0.6))
                                    Text(kFxName[k]).font(BFont.mono(9.5)).foregroundColor(T.fg.opacity(0.6))
                                }
                                Spacer(minLength: 0)
                            }
                            .contentShape(Rectangle())
                            .onTapGesture { active = k }
                        }
                    }
                    BigKnob(value: Double((v - def.lo) / (def.hi - def.lo))).frame(width: 118, height: 118)
                        .modifier(ParamDrag(def: def, track: t, horizontal: false, points: 180))
                }
            }
        }
    }
}

struct FxRuler: View {
    let def: ParamDef
    let value: Float
    var body: some View {
        Canvas { c, size in
            let n: Int = 31
            let f: CGFloat = CGFloat((value - def.lo) / (def.hi - def.lo))
            let w: CGFloat = size.width, h: CGFloat = size.height
            for i in 0..<n {
                let fi: CGFloat = CGFloat(i) / CGFloat(n - 1)
                let x: CGFloat = w * (0.3 + 0.7 * fi)
                let major: Bool = i % 10 == 0
                let rect = major ? CGRect(x: x, y: 4, width: 1.5, height: h - 8) : CGRect(x: x, y: 10, width: 1.5, height: h - 20)
                let op: Double = major ? 0.35 : 0.17 * (1 - Double(fi) * 0.6)
                c.fill(Path(rect), with: .color(Color.white.opacity(op)))
            }
            let mx: CGFloat = w * (0.3 + 0.7 * f)
            var g = c; g.addFilter(.shadow(color: T.yellow, radius: 5))
            g.fill(Path(roundedRect: CGRect(x: mx - 1.5, y: 2, width: 3, height: size.height - 4), cornerRadius: 1.5), with: .color(T.yellow))
        }
    }
}

struct MiniKnob: View {
    let value: Double
    let on: Bool
    var body: some View {
        ZStack {
            Circle().fill(on ? T.yellow : Color(rgb: 90, 90, 92))
                .shadow(color: on ? T.yellow.opacity(0.6) : .clear, radius: 8)
            Capsule().fill(on ? Color(rgb: 60, 50, 20) : Color(rgb: 200, 180, 255)).frame(width: 2.5, height: 9)
                .offset(y: -10).rotationEffect(.degrees(-135 + 270 * value))
        }
        .frame(width: 44, height: 44)
    }
}

struct BigKnob: View {
    let value: Double
    var body: some View {
        ZStack {
            Canvas { c, size in
                let cx: CGFloat = size.width / 2
                for i in 0..<44 {
                    let f: Double = Double(i) / 43
                    knobTick(&c, center: cx, r0: cx - 10, r1: cx, deg: -225 + 270 * f, color: Color.white.opacity(f <= value ? 0.9 : 0.25), width: 1.4)
                }
            }
            Circle().fill(RadialGradient(colors: [.white, Color(rgb: 225, 225, 220)], center: UnitPoint(x: 0.4, y: 0.35), startRadius: 0, endRadius: 60)).padding(16)
                .shadow(color: .black.opacity(0.5), radius: 10, y: 6)
            Capsule().fill(Color(rgb: 20, 20, 20)).frame(width: 3, height: 12).offset(y: -28).rotationEffect(.degrees(-135 + 270 * value))
        }
    }
}

// MARK: - Master

struct MasterCard: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var fold = FoldStore.shared
    private let order: [(Int, String, UInt32?)] = [(0, "filter", 0x3D6CF5), (1, "echo", 0x27B26B), (2, "space", nil), (3, "tape", 0xFF6A1A), (5, "swing", 0x3D6CF5), (4, "pump", 0x27B26B), (6, "volym", nil)]
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                (Text("master · ").foregroundColor(kInk.opacity(0.5)) + Text("glue · tape").foregroundColor(kInk).font(BFont.mono(9.5, 500)))
                    .font(BFont.mono(9.5)).tracking(0.855)
                Spacer()
                HStack(spacing: 5) { LiteCap(.min, dark: false, fold: "master"); LiteCap(.full, dark: false, fold: "master") }
                LiteCap(.grab, dark: false).padding(.leading, 8)
            }
            .frame(height: 26)
            if !fold.isFolded("master") {
                HStack(spacing: 8) {
                    ForEach(order, id: \.0) { f, label, dot in
                        let def = kMasterParams.first { $0.field == f }!
                        MasterKnob(def: def, label: label, dot: dot)
                    }
                }
                Canvas { c, size in
                    let n = Int(size.width / 8)
                    for i in 0..<n { c.fill(Path(ellipseIn: CGRect(x: CGFloat(i) * 8, y: 0, width: 6, height: 6)), with: .color(kInk.opacity(0.1))) }
                }
                .frame(height: 6)
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(LinearGradient(colors: [Color(rgb: 249, 247, 238), Color(rgb: 237, 234, 217)], startPoint: UnitPoint(x: 0.4, y: 0), endPoint: UnitPoint(x: 0.6, y: 1))))
        .shadow(color: .black.opacity(0.45), radius: 22, y: 13)
    }
}

struct MasterKnob: View {
    @EnvironmentObject var model: EngineModel
    let def: ParamDef
    let label: String
    let dot: UInt32?
    var body: some View {
        let v = model.param(def, 0)
        let f = Double((v - def.lo) / (def.hi - def.lo))
        let text: String = {
            switch def.field {
            case 0: return abs(v) < 0.02 ? "Av" : (v < 0 ? "LP" : "HP") + "\(Int(abs(v) * 100))"
            case 5: return "\(50 + Int((v * 41.7).rounded()))%"
            default: return "\(Int((v * 100).rounded()))"
            }
        }()
        VStack(spacing: 6) {
            ZStack {
                Circle().fill(kInk.opacity(0.06)).padding(12)
                Canvas { c, size in
                    let cx: CGFloat = size.width / 2
                    let r1: CGFloat = cx - 2
                    for i in 0..<30 {
                        let p: Double = Double(i) / 29
                        knobTick(&c, center: cx, r0: r1 - 7, r1: r1, deg: -225 + 270 * p, color: p <= f ? kInk : kInk.opacity(0.15), width: 2.4)
                    }
                    let hp: CGPoint = knobPoint(center: cx, r: r1 - 3, deg: -225 + 270 * f)
                    c.fill(Path(ellipseIn: CGRect(x: hp.x - 9, y: hp.y - 9, width: 18, height: 18)), with: .color(Color(rgb: 252, 238, 214)))
                    c.fill(Path(ellipseIn: CGRect(x: hp.x - 6.5, y: hp.y - 6.5, width: 13, height: 13)), with: .color(Color(hex: 0xF0692A)))
                }
                Text(text).font(BFont.sans(19, 200)).tracking(-0.57).foregroundColor(kInk)
            }
            .frame(width: 66, height: 66)
            .modifier(ParamDrag(def: def, track: 0, horizontal: false, points: 160))
            HStack(spacing: 5) {
                if let d = dot { Circle().fill(Color(hex: d)).frame(width: 7, height: 7) } else { Circle().strokeBorder(kInk.opacity(0.35), lineWidth: 1).frame(width: 7, height: 7) }
                Text(label).font(BFont.mono(8.5)).tracking(0.34).foregroundColor(kInk.opacity(0.5))
            }
        }
        .frame(maxWidth: .infinity)
    }
}
