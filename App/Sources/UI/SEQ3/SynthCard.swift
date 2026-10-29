import SwiftUI

// The synth module (web: .card.syn) — pick bass / keys / lead / pad, pick an engine, shape the sound.
// Analog shows the envelope editor; every other engine shows its live picture, parameter grid and switches.
// Each engine dresses the card in its own colours (web: .card.syn[data-eng=…]).

// MARK: - engine table (web: ENG)

typealias NumUnit = (String, String)
private func pcF(_ v: Float) -> NumUnit { (String(Int((v * 100).rounded())), "%") }
private func msF(_ x: Float) -> NumUnit { x < 1 ? (String(Int((x * 1000).rounded())), "ms") : (String(format: "%.2f", x), "s") }
private func hzF(_ h: Float, wholeKhzAbove10k: Bool = false) -> NumUnit {
    if h >= 1000 { return (String(format: (wholeKhzAbove10k && h >= 10000) ? "%.0f" : "%.1f", h / 1000), "khz") }
    return (String(Int(h.rounded())), "hz")
}
private func shT(_ v: Float, _ mx: Float) -> Float { 0.0015 + v * v * mx }
private func brT(_ v: Float, _ mx: Float) -> Float { 0.002 + v * v * mx }
func acidHz(_ v: Float) -> Float { 22 * pow(2, v * 9.6) }
let kFMRatios: [Float] = [0.5, 1, 1.5, 2, 3, 3.5, 7]
private func numStr(_ x: Float) -> String { x == x.rounded() ? String(Int(x)) : String(x) }

struct EngParamDef { let label: String; var max: Float = 1; var step: Float = 0; let fmt: (Float) -> NumUnit }
struct EngDef {
    let key: String
    let name: String
    let tag: String
    var params: [EngParamDef] = []
    var opts: [[(Int, String)]] = []
    var cols = 3
    var valueSize: CGFloat = 27
}

/// Index = engine number in the core (kEngineNames: analog acid sub fm pluck super chip sh101 mini bris).
let kEngDefs: [EngDef] = [
    EngDef(key: "analog", name: "Analog", tag: "subtraktiv · envelope"),
    EngDef(key: "acid", name: "Acid", tag: "303-bas · resonansfilter", params: [
        EngParamDef(label: "cutoff", fmt: { hzF(acidHz($0), wholeKhzAbove10k: true) }), EngParamDef(label: "reso", fmt: pcF), EngParamDef(label: "env mod", fmt: pcF),
        EngParamDef(label: "decay", fmt: { msF(0.06 + $0 * 0.9) }), EngParamDef(label: "accent", fmt: pcF), EngParamDef(label: "dist", fmt: pcF),
        EngParamDef(label: "dist ton", fmt: pcF), EngParamDef(label: "slide tid", fmt: { msF(0.02 + $0 * 0.28) }),
    ], opts: [[(2, "saw"), (1, "square")], [(0, "slide via kablar"), (1, "auto-slide")]], cols: 4, valueSize: 23),
    EngDef(key: "sub", name: "Sub 808", tag: "sub · punch · glid", params: [
        EngParamDef(label: "decay", fmt: { msF(0.1 + $0 * 2.5) }), EngParamDef(label: "punch", fmt: { (String(Int(($0 * 24).rounded())), "st") }), EngParamDef(label: "drive", fmt: pcF),
        EngParamDef(label: "ton", fmt: pcF), EngParamDef(label: "glid", fmt: { msF($0 * 0.25) }), EngParamDef(label: "klick", fmt: pcF),
    ]),
    EngDef(key: "fm", name: "FM Glass", tag: "2-operator · klockor", params: [
        EngParamDef(label: "ratio", max: 6, step: 1, fmt: { (numStr(kFMRatios[max(0, min(6, Int($0.rounded())))]), "×") }),
        EngParamDef(label: "index", fmt: { (String(format: "%.1f", $0 * 10), "") }), EngParamDef(label: "decay", fmt: { msF(0.2 + $0 * 2.5) }),
        EngParamDef(label: "bell", fmt: pcF), EngParamDef(label: "release", fmt: { msF(0.05 + $0 * 1.5) }), EngParamDef(label: "ljus", fmt: pcF),
    ]),
    EngDef(key: "pluck", name: "Pluck", tag: "sträng · karplus-strong", params: [
        EngParamDef(label: "sustain", fmt: pcF), EngParamDef(label: "ljus", fmt: pcF), EngParamDef(label: "anslag", fmt: pcF),
        EngParamDef(label: "längd", fmt: { msF(0.4 + $0 * 2.6) }), EngParamDef(label: "bredd", fmt: pcF), EngParamDef(label: "värme", fmt: pcF),
    ]),
    EngDef(key: "super", name: "Super Pad", tag: "7 sågtänder · luft", params: [
        EngParamDef(label: "detune", fmt: { (String(Int(($0 * 40).rounded())), "ct") }), EngParamDef(label: "attack", fmt: { msF(0.01 + $0 * 1.5) }),
        EngParamDef(label: "release", fmt: { msF(0.1 + $0 * 3) }), EngParamDef(label: "ljus", fmt: pcF), EngParamDef(label: "bredd", fmt: pcF), EngParamDef(label: "luft", fmt: pcF),
    ]),
    EngDef(key: "chip", name: "Chip", tag: "8-bit · puls · arpeggio", params: [
        EngParamDef(label: "decay", fmt: { msF(0.05 + $0 * 1.4) }), EngParamDef(label: "vibrato", fmt: pcF),
        EngParamDef(label: "arp-fart", fmt: { (String(Int((10 + $0 * 40).rounded())), "hz") }), EngParamDef(label: "bitar", fmt: { (String(Int((8 - $0 * 5).rounded())), "bit") }),
    ], opts: [[(0, "puls 12%"), (1, "puls 25%"), (2, "fyrkant"), (3, "triangel")], [(0, "arp: ackord"), (1, "dur"), (2, "moll"), (3, "oktav"), (4, "av")], [(0, "okt 0"), (1, "okt +1"), (-1, "okt −1")]],
    cols: 4, valueSize: 24),
    EngDef(key: "sh101", name: "SH-101", tag: "mono · 1 vco · sub · 24 dB", params: [
        EngParamDef(label: "freq", fmt: { hzF(22 * pow(2, $0 * 9.8)) }), EngParamDef(label: "res", fmt: pcF), EngParamDef(label: "env", fmt: pcF),
        EngParamDef(label: "decay", fmt: { msF(shT($0, 10)) }), EngParamDef(label: "sustain", fmt: pcF), EngParamDef(label: "saw", fmt: pcF),
        EngParamDef(label: "puls", fmt: pcF), EngParamDef(label: "sub", fmt: pcF), EngParamDef(label: "pw", fmt: pcF), EngParamDef(label: "portamento", fmt: { msF(0.004 + $0 * $0 * 1.6) }),
    ], opts: [[(0, "16′"), (1, "8′"), (2, "4′"), (3, "2′")], [(0, "sub −1"), (1, "sub −2"), (2, "sub puls")]], cols: 3, valueSize: 21),
    EngDef(key: "mini", name: "Moog", tag: "model d · 3 osc · ladder", params: [
        EngParamDef(label: "cutoff", fmt: { hzF(30 * pow(2, $0 * 9.6)) }), EngParamDef(label: "emphasis", fmt: pcF), EngParamDef(label: "contour", fmt: pcF),
        EngParamDef(label: "filter decay", fmt: { msF(shT($0, 10)) }), EngParamDef(label: "decay", fmt: { msF(shT($0, 10)) }), EngParamDef(label: "sustain", fmt: pcF),
        EngParamDef(label: "osc 1", fmt: pcF), EngParamDef(label: "osc 2", fmt: pcF), EngParamDef(label: "osc 3", fmt: pcF), EngParamDef(label: "glide", fmt: { msF(0.004 + $0 * $0 * 2) }),
    ], opts: [[(0, "glide av"), (1, "glide på")], [(0, "decay av"), (1, "decay på")]], cols: 3, valueSize: 21),
    EngDef(key: "bris", name: "Bris web", tag: "gamla webbversionen · 6 röster · ladder", params: [
        EngParamDef(label: "cutoff", fmt: { hzF(24 * pow(2, $0 * 9.6)) }), EngParamDef(label: "reso", fmt: pcF), EngParamDef(label: "env", fmt: pcF),
        EngParamDef(label: "attack", fmt: { msF(brT($0, 6)) }), EngParamDef(label: "release", fmt: { msF(brT($0, 10)) }), EngParamDef(label: "detune", fmt: pcF),
        EngParamDef(label: "sub", fmt: pcF), EngParamDef(label: "chorus", fmt: pcF), EngParamDef(label: "delay", fmt: pcF),
    ], opts: [[(0, "såg"), (1, "fyrkant")], [(0, "poly 6"), (1, "mono"), (2, "unison")]]),
    EngDef(key: "bris6", name: "BLONDA BRIS", tag: "bree6 · 6 röster · blonda-motor"),   // its own panel: MotorSynth
]
/// Chip order in the engine row (web: ENG_ORDER).
let kEngOrder = ["analog", "bris6", "acid", "sh101", "mini", "sub", "fm", "pluck", "chip", "super", "bris"]
func engIndex(_ key: String) -> Int { kEngDefs.firstIndex { $0.key == key } ?? 0 }

// MARK: - per-engine colours

struct EngTheme {
    let fg: Color, mute: Color, acc: Color, chip: Color, line: Color, on: Color
    var pixel = false
}
private func rgba(_ hex: UInt32, _ a: Double) -> Color { Color(hex: hex).opacity(a) }
func engTheme(_ e: String) -> EngTheme {
    switch e {
    case "acid": return EngTheme(fg: Color(hex: 0xEAF8C8), mute: rgba(0xEAF8C8, 0.55), acc: Color(hex: 0xC9F23A), chip: rgba(0xC9F23A, 0.13), line: rgba(0xC9F23A, 0.25), on: Color(hex: 0x0D0F09))
    case "sub": return EngTheme(fg: Color(hex: 0xFFEDE9), mute: rgba(0xFFEDE9, 0.6), acc: Color(hex: 0xFF8A7A), chip: rgba(0xFFFFFF, 0.14), line: rgba(0xFFEDE9, 0.25), on: Color(hex: 0x8A1016))
    case "fm": return EngTheme(fg: Color(hex: 0x0B1F3F), mute: rgba(0x0B1F3F, 0.55), acc: Color(hex: 0x0B1F3F), chip: rgba(0xFFFFFF, 0.42), line: rgba(0x0B1F3F, 0.2), on: Color(hex: 0xD8F1FF))
    case "pluck": return EngTheme(fg: Color(hex: 0x2B2418), mute: rgba(0x2B2418, 0.55), acc: Color(hex: 0x1F8A5B), chip: rgba(0x2B2418, 0.08), line: rgba(0x2B2418, 0.18), on: Color(hex: 0xF5EEE1))
    case "super": return EngTheme(fg: .white, mute: rgba(0xFFFFFF, 0.66), acc: Color(hex: 0xFFD6F5), chip: rgba(0xFFFFFF, 0.16), line: rgba(0xFFFFFF, 0.3), on: Color(hex: 0x5B3FE0))
    case "sh101": return EngTheme(fg: Color(hex: 0xEEF2F6), mute: rgba(0xEEF2F6, 0.55), acc: Color(hex: 0x5B9BFF), chip: rgba(0xFFFFFF, 0.1), line: rgba(0xEEF2F6, 0.18), on: Color(hex: 0x16202E))
    case "mini": return EngTheme(fg: Color(hex: 0xF6E7CC), mute: rgba(0xF6E7CC, 0.55), acc: Color(hex: 0xF2A541), chip: rgba(0xF2A541, 0.14), line: rgba(0xF6E7CC, 0.2), on: Color(hex: 0x1A120B))
    case "chip": return EngTheme(fg: Color(hex: 0x0F380F), mute: rgba(0x0F380F, 0.6), acc: Color(hex: 0x0F380F), chip: rgba(0x0F380F, 0.12), line: rgba(0x0F380F, 0.25), on: Color(hex: 0x9BBC0F), pixel: true)
    case "bris6": return EngTheme(fg: Color(hex: 0xF2EFE6), mute: rgba(0xF2EFE6, 0.5), acc: Color(hex: 0xF2C318), chip: rgba(0xFFFFFF, 0.09), line: rgba(0xF2EFE6, 0.14), on: Color(hex: 0x111211))
    case "bris": return EngTheme(fg: Color(hex: 0xEAF1FF), mute: rgba(0xEAF1FF, 0.6), acc: Color(hex: 0x8FC2FF), chip: rgba(0xFFFFFF, 0.13), line: rgba(0xEAF1FF, 0.2), on: Color(hex: 0x132B74))
    default: return EngTheme(fg: .white, mute: rgba(0xFFFFFF, 0.78), acc: .white, chip: rgba(0xFFFFFF, 0.22), line: rgba(0xFFFFFF, 0.35), on: Color(hex: 0xC2416E))
    }
}

/// CSS linear-gradient(deg, …) over a rect.
func cssLinear(_ ctx: inout GraphicsContext, _ rect: CGRect, deg: Double, _ stops: [Gradient.Stop]) {
    let a: Double = deg * Double.pi / 180
    let dx = CGFloat(sin(a)), dy = CGFloat(-cos(a))
    let L: CGFloat = abs(rect.width * dx) + abs(rect.height * dy)
    let s = CGPoint(x: rect.midX - dx * L / 2, y: rect.midY - dy * L / 2)
    let e = CGPoint(x: rect.midX + dx * L / 2, y: rect.midY + dy * L / 2)
    ctx.fill(Path(rect), with: .linearGradient(Gradient(stops: stops), startPoint: s, endPoint: e))
}
/// CSS radial-gradient(rx% ry% at cx% cy%, …) — an ellipse sized relative to the box.
func cssRadial(_ ctx: inout GraphicsContext, _ size: CGSize, rx: CGFloat, ry: CGFloat, cx: CGFloat, cy: CGFloat, _ stops: [Gradient.Stop]) {
    var c = ctx
    c.translateBy(x: cx * size.width, y: cy * size.height)
    c.scaleBy(x: rx * size.width, y: ry * size.height)
    let r = CGRect(x: -cx / rx, y: -cy / ry, width: 1 / rx, height: 1 / ry)
    c.fill(Path(r), with: .radialGradient(Gradient(stops: stops), center: .zero, startRadius: 0, endRadius: 1))
}
private func st(_ hex: UInt32, _ a: Double, _ at: CGFloat) -> Gradient.Stop { .init(color: Color(hex: hex).opacity(a), location: at) }

/// The card background for an engine; analog, fm and super drift slowly (web: synbg 14 s alternate, 180 % size).
struct EngBackground: View {
    let e: String
    var body: some View {
        if e == "analog" || e == "fm" || e == "super" {
            TimelineView(.animation(minimumInterval: 1.0 / 15.0)) { tl in
                Canvas { ctx, size in draw(&ctx, size, tl.date.timeIntervalSinceReferenceDate) }
            }
        } else {
            Canvas { ctx, size in draw(&ctx, size, 0) }
        }
    }
    private func draw(_ ctx: inout GraphicsContext, _ size: CGSize, _ t: Double) {
        let full = CGRect(origin: .zero, size: size)
        // ease-in-out ping-pong over 14 s
        let u: Double = (t / 14).truncatingRemainder(dividingBy: 2)
        let lin: Double = u < 1 ? u : 2 - u
        let p = CGFloat(0.5 - 0.5 * cos(lin * Double.pi))
        let big = CGRect(x: -p * size.width * 0.8, y: -p * size.height * 0.8, width: size.width * 1.8, height: size.height * 1.8)
        switch e {
        case "acid":
            ctx.fill(Path(full), with: .color(Color(hex: 0x0D0F09)))
            cssRadial(&ctx, size, rx: 1.1, ry: 0.8, cx: 0.85, cy: 0, [st(0xC9F23A, 0.26, 0), st(0xC9F23A, 0, 0.55)])
            cssRadial(&ctx, size, rx: 0.8, ry: 0.6, cx: 0, cy: 1, [st(0xC9F23A, 0.1, 0), st(0xC9F23A, 0, 0.6)])
        case "sub":
            cssRadial(&ctx, size, rx: 0.9, ry: 0.7, cx: 0.72, cy: 0.18, [st(0xFF4A3A, 1, 0), st(0x8A1016, 1, 0.55), st(0x2A0507, 1, 1)])
        case "fm":
            cssLinear(&ctx, big, deg: 160, [st(0xE4F6FF, 1, 0), st(0x9CD3FF, 1, 0.45), st(0x5C8FF8, 1, 1)])
        case "pluck":
            cssLinear(&ctx, full, deg: 165, [st(0xF7F1E6, 1, 0), st(0xE6D8BE, 1, 1)])
        case "super":
            cssLinear(&ctx, big, deg: 150, [st(0x1E1450, 1, 0), st(0x5B3FE0, 1, 0.5), st(0xE8559F, 1, 1)])
        case "sh101":
            cssLinear(&ctx, full, deg: 170, [st(0x2B3440, 1, 0), st(0x151A21, 1, 1)])
            cssRadial(&ctx, size, rx: 0.9, ry: 0.7, cx: 0.85, cy: 0.1, [st(0x2F6FE0, 0.55, 0), st(0x2F6FE0, 0, 0.6)])
        case "mini":
            cssLinear(&ctx, full, deg: 175, [st(0x221812, 1, 0), st(0x0F0A07, 1, 1)])
            cssRadial(&ctx, size, rx: 0.8, ry: 0.7, cx: 0.75, cy: 0, [st(0xF2A541, 0.28, 0), st(0xF2A541, 0, 0.6)])
            ctx.fill(Path(CGRect(x: 0, y: 0, width: 10, height: size.height)), with: .color(Color(hex: 0x5A3620)))
            ctx.fill(Path(CGRect(x: size.width - 10, y: 0, width: 10, height: size.height)), with: .color(Color(hex: 0x5A3620)))
        case "chip":
            cssLinear(&ctx, full, deg: 170, [st(0xA8C820, 1, 0), st(0x8BAC0F, 1, 0.6), st(0x6E8C0A, 1, 1)])
        case "bris6":
            cssLinear(&ctx, full, deg: 170, [st(0x22211D, 1, 0), st(0x10100F, 1, 1)])
            cssRadial(&ctx, size, rx: 0.9, ry: 0.6, cx: 0.9, cy: 0, [st(0xF2C318, 0.16, 0), st(0xF2C318, 0, 0.6)])
        case "bris":
            cssLinear(&ctx, full, deg: 165, [st(0x2A5BD6, 1, 0), st(0x132B74, 1, 1)])
            cssRadial(&ctx, size, rx: 0.9, ry: 0.7, cx: 0.8, cy: 0.1, [st(0x5BA7FF, 0.45, 0), st(0x5BA7FF, 0, 0.6)])
        default:
            cssLinear(&ctx, big, deg: 155, [st(0xF9A65A, 1, 0), st(0xF2788E, 1, 0.48), st(0xD46BEA, 1, 1)])
        }
    }
}

// MARK: - the card

struct SynthCard: View {
    @EnvironmentObject var model: EngineModel
    @State private var synT: Int
    @State private var swap = false
    @ObservedObject private var fold = FoldStore.shared
    private let pinned: Bool
    init(initialTrack: Int? = nil) { _synT = State(initialValue: initialTrack ?? 6); pinned = initialTrack != nil }

    var body: some View {
        let inst = model.instrument(synT)
        let th = engTheme(inst)
        let e = engIndex(inst)
        VStack(alignment: .leading, spacing: 0) {
            caption(th, inst)
            if !fold.isFolded("synth") {
                EngineChips(track: synT, current: inst, theme: th)
                    .padding(.bottom, 10)
                Group {
                    if e == 0 { AnalogSynth(track: synT, theme: th) }
                    else if inst == "bris6" { MotorSynth(track: synT, theme: th) }
                    else { GenericSynth(track: synT, e: e, theme: th) }
                }
                .opacity(swap ? 0.15 : 1).blur(radius: swap ? 12 : 0).scaleEffect(swap ? 0.97 : 1)
            }
        }
        .padding(16)
        .foregroundColor(th.fg)
        .background(EngBackground(e: inst))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(LinearGradient(stops: [
            .init(color: Color.white.opacity(0.35), location: 0), .init(color: Color.white.opacity(0.04), location: 0.4), .init(color: Color.white.opacity(0.12), location: 1),
        ], startPoint: .top, endPoint: .bottom), lineWidth: 1).allowsHitTesting(false))
        .compositingGroup()
        .shadow(color: .black.opacity(0.55), radius: 25, y: 13)
        .animation(.easeInOut(duration: 0.25), value: inst)
        .onChange(of: model.selectedTrack) { _, t in if t >= 6 && !pinned { synT = t } }
        .onChange(of: inst) { _, _ in
            swap = true   // web: .syn-in.swap — blur in the new engine
            DispatchQueue.main.async { withAnimation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.6)) { swap = false } }
        }
        .onAppear { if model.selectedTrack >= 6 && !pinned { synT = model.selectedTrack } }
    }

    /// Caption: title + track segment + buttons. Like the web version the title gives way when the card is narrow.
    private func caption(_ th: EngTheme, _ inst: String) -> some View {
        ViewThatFits(in: .horizontal) {
            captionRow(th, inst, title: true)
            captionRow(th, inst, title: false)
        }
        .frame(height: 26)
        .padding(.bottom, fold.isFolded("synth") ? 0 : 10)
    }

    private func captionRow(_ th: EngTheme, _ inst: String, title: Bool) -> some View {
        HStack(spacing: 8) {
            if title {
                (Text("\(kTracks[synT].name.lowercased()) · ").foregroundColor(th.mute) + Text((kEngDefs[engIndex(inst)].name).lowercased()).foregroundColor(th.fg).font(BFont.mono(9.5, 500)))
                    .font(BFont.mono(9.5)).tracking(0.855).lineLimit(1).fixedSize()
            }
            Spacer(minLength: 4)
            HStack(spacing: 0) {
                ForEach(6..<10, id: \.self) { t in
                    Button { synT = t; model.selectedTrack = t; model.preview(t) } label: {
                        Text(kTracks[t].name.lowercased()).font(BFont.mono(10.5, synT == t ? 500 : 400)).lineLimit(1).fixedSize()
                            .foregroundColor(synT == t ? th.on : th.fg)
                            .padding(.horizontal, 9).frame(height: 22)
                            .background(Capsule().fill(synT == t ? th.fg : Color.clear))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(2)
            .background(Capsule().fill(th.chip))
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: synT)
            .fixedSize()
            Button { model.openRoll(synT) } label: {
                SVGIcon(d: "M2.5 2h9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM5 2v6M9 2v6M5 8v4M9 8v4", box: 14, size: 14, stroke: 1.3)
                    .frame(width: 14, height: 14).frame(width: 30, height: 22)
                    .background(RoundedRectangle(cornerRadius: 6).fill(th.chip))
            }
            .buttonStyle(PressScale())
            HStack(spacing: 5) {
                CapButton(kind: .min, dark: false, tint: th.fg, fill: th.chip, fold: "synth")
                CapButton(kind: .full, dark: false, tint: th.fg, fill: th.chip, fold: "synth")
            }
            CapButton(kind: .grab, dark: false, tint: th.fg, fill: th.chip).padding(.leading, 4)
        }
    }
}

/// The engine row (web: .engs) — scrolls sideways and keeps the chosen engine in view.
struct EngineChips: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let current: String
    let theme: EngTheme
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(kEngOrder, id: \.self) { k in
                        let on = k == current
                        Button {
                            guard !on else { return }
                            model.setInstrument(k, track)
                            model.showToast("\(kTracks[track].name) → \(kEngDefs[engIndex(k)].name)")
                            model.preview(track)
                        } label: {
                            HStack(spacing: 6) {
                                Circle().fill(Color(hex: kEngineDot[k] ?? 0xFFFFFF)).frame(width: 13, height: 13)
                                    .overlay(Circle().strokeBorder(Color.white.opacity(0.7), lineWidth: 1.5))
                                Text(kEngDefs[engIndex(k)].name).font(BFont.sans(11.5)).lineLimit(1).fixedSize()
                            }
                            .foregroundColor(on ? theme.on : theme.fg)
                            .padding(.leading, 6).padding(.trailing, 11).frame(height: 27)
                            .background(Capsule().fill(on ? theme.fg : theme.chip))
                        }
                        .buttonStyle(PressScale())
                        .id(k)
                    }
                }
                .padding(2)
            }
            .mask(LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black, location: 0.82), .init(color: .clear, location: 1)], startPoint: .leading, endPoint: .trailing))
            .onAppear { proxy.scrollTo(current, anchor: .center) }
            .onChange(of: current) { _, c in withAnimation(.easeOut(duration: 0.35)) { proxy.scrollTo(c, anchor: .center) } }
        }
    }
}

// MARK: - analog: cutoff / res / env + the envelope editor + waves

private func cutHz(_ v: Float) -> Float { 70 * pow(160, v) }
private func fmtT(_ v: Float) -> String { v < 1 ? "\(Int((v * 1000).rounded())) ms" : String(format: "%.2f s", v) }
private func grouped(_ n: Int) -> String {
    let s = String(n); guard s.count > 3 else { return s }
    var out = ""; for (i, ch) in s.enumerated() { if i > 0 && (s.count - i) % 3 == 0 { out += "\u{00A0}" }; out.append(ch) }
    return out
}

/// Big number with a small superscript unit (web: .syn-big / .edial b with sup).
struct SupNumber: View {
    let num: String
    let unit: String
    let size: CGFloat
    var weight = 200
    var font: ((CGFloat) -> Font)? = nil
    var body: some View {
        HStack(alignment: .top, spacing: 3) {
            Text(num).font(font?(size) ?? BFont.sans(size, weight)).tracking(-size * 0.025).monospacedDigit()
            if !unit.isEmpty {
                Text(unit).font(font?(max(8, size * 0.33)) ?? BFont.sans(max(8, size * 0.33), 400)).opacity(0.8).padding(.top, size * 0.08)
            }
        }
        .lineLimit(1).fixedSize()
    }
}

/// Vertical drag on a value (web: drag up/down, 200–220 px for the full range); previews the sound when released.
struct VDrag: ViewModifier {
    let get: () -> Float
    let set: (Float) -> Void
    var range: ClosedRange<Float> = 0...1
    var step: Float = 0
    var points: CGFloat = 200
    var onEnd: () -> Void = {}
    @Binding var active: Bool
    @State private var start: Float?
    func body(content: Content) -> some View {
        content.contentShape(Rectangle()).gesture(DragGesture(minimumDistance: 1).onChanged { g in
            if start == nil { start = get(); active = true }
            var v = start! + Float(-g.translation.height / points) * (range.upperBound - range.lowerBound)
            v = min(range.upperBound, max(range.lowerBound, v))
            if step > 0 { v = (v / step).rounded() * step }
            set(v)
        }.onEnded { _ in start = nil; active = false; onEnd() })
    }
}

struct AnalogSynth: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let theme: EngTheme
    @State private var dragging = false
    @State private var handle: Character? = nil
    @State private var tapStart = false

    private func p(_ f: Int) -> Float { model.engParam(f, 0, track) }
    private func setP(_ f: Int, _ v: Float) { model.setEngParam(f, 0, track, v) }

    var body: some View {
        let hz = Int(cutHz(p(0)).rounded())
        VStack(spacing: 0) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 7) {
                    Text("cutoff").font(BFont.mono(9)).tracking(0.36).opacity(0.78)
                    SupNumber(num: grouped(hz), unit: "hz", size: 46)
                }
                .modifier(VDrag(get: { p(0) }, set: { setP(0, $0) }, points: 220, onEnd: { model.preview(track) }, active: $dragging))
                Spacer()
                HStack(spacing: 18) {
                    small("res", 1)
                    small("env", 2)
                }
            }
            .padding(.top, 2).padding(.bottom, 4)
            envelope.frame(height: 190)
            HStack(spacing: 14) {
                wave(0, "M2 11c2.5-7 6-7 9 0s6.5 7 9 0")
                wave(3, "M2 15l5-9 8 12 5-9")
                wave(2, "M2 16L11 5v11l9-11v11")
                wave(1, "M2 15V6h6v10h6V6h6")
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 4).padding(.bottom, 6)
        }
    }

    private func small(_ label: String, _ f: Int) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label).font(BFont.mono(9)).tracking(0.36).opacity(0.78)
            SupNumber(num: String(Int((p(f) * 100).rounded())), unit: "%", size: 24, weight: 300)
        }
        .modifier(VDrag(get: { p(f) }, set: { setP(f, $0) }, points: 220, onEnd: { model.preview(track) }, active: $dragging))
    }

    private func wave(_ w: Int, _ d: String) -> some View {
        let on = model.engOption(0, 0, track) == w
        return Button { model.setEngOption(0, 0, track, w); model.preview(track) } label: {
            SVGIcon(d: d, box: 22, size: 22, stroke: 1.6, cap: .round)
                .foregroundColor(on ? theme.on : .white)
                .frame(width: 22, height: 22)
                .frame(width: 46, height: 46)
                .background(Circle().fill(on ? Color.white : Color.clear))
                .overlay(Circle().strokeBorder(Color.white.opacity(on ? 0 : 0.55), lineWidth: 1))
                .shadow(color: Color(rgb: 120, 20, 80, on ? 0.55 : 0), radius: 13, y: 12)
                .scaleEffect(on ? 1.12 : 1)
                .animation(.spring(response: 0.45, dampingFraction: 0.6), value: on)
        }
        .buttonStyle(.plain)
    }

    // web: envGeom
    private struct Geo { let top, bot, x0, W, xa, xd, xs, xr, ys: CGFloat }
    private func geo(_ w: CGFloat, _ h: CGFloat) -> Geo {
        let top: CGFloat = 22, bot: CGFloat = h - 18, x0: CGFloat = 14, W: CGFloat = w - 28
        let a = CGFloat(p(3)), d = CGFloat(p(4)), s = CGFloat(p(5)), r = CGFloat(p(6))
        let xa: CGFloat = x0 + W * 0.22 * sqrt(a)
        let xd: CGFloat = xa + 8 + W * 0.22 * sqrt(d / 2)
        let xs: CGFloat = xd + W * 0.16
        let xr: CGFloat = xs + 8 + W * 0.3 * sqrt(r / 3)
        return Geo(top: top, bot: bot, x0: x0, W: W, xa: xa, xd: xd, xs: xs, xr: xr, ys: bot - (bot - top) * s)
    }

    private var envelope: some View {
        GeometryReader { g in
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { tl in
                Canvas { ctx, size in drawEnv(&ctx, size, tl.date) }
            }
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 0).onChanged { v in dragEnv(v, g.size) }.onEnded { _ in
                handle = nil; tapStart = false; model.preview(track)
            })
        }
    }

    private func dragEnv(_ v: DragGesture.Value, _ size: CGSize) {
        let G = geo(size.width, size.height), q = v.location
        if handle == nil {
            if tapStart { return }
            let pts: [(Character, CGFloat, CGFloat)] = [("a", G.xa, G.top), ("d", G.xd, G.ys), ("r", G.xr, G.bot)]
            var best: Character? = nil; var bd: CGFloat = 34
            for (k, x, y) in pts { let dd = hypot(v.startLocation.x - x, v.startLocation.y - y); if dd < bd { bd = dd; best = k } }
            guard let b = best else { tapStart = true; return }
            handle = b
        }
        switch handle {
        case "a": setP(3, Float(pow(max(0, q.x - G.x0) / (G.W * 0.22), 2)))
        case "d":
            setP(4, Float(pow(max(0, q.x - G.xa - 8) / (G.W * 0.22), 2) * 2))
            setP(5, Float(min(1, max(0, (G.bot - q.y) / (G.bot - G.top)))))
        case "r": setP(6, Float(pow(max(0, q.x - G.xs - 8) / (G.W * 0.3), 2) * 3))
        default: break
        }
    }

    private func ampPath(_ G: Geo, _ w: CGFloat, _ off: (CGFloat, CGFloat) -> CGFloat) -> Path {
        let s = CGFloat(p(5))
        var path = Path()
        path.move(to: CGPoint(x: G.x0, y: off(G.bot, 0)))
        path.addCurve(to: CGPoint(x: G.xa, y: off(G.top, 1)), control1: CGPoint(x: G.x0 + (G.xa - G.x0) * 0.5, y: off(G.bot, 0)), control2: CGPoint(x: G.x0 + (G.xa - G.x0) * 0.6, y: off(G.top, 1)))
        path.addCurve(to: CGPoint(x: G.xd, y: off(G.ys, s)), control1: CGPoint(x: G.xa + (G.xd - G.xa) * 0.3, y: off(G.ys, s)), control2: CGPoint(x: G.xa + (G.xd - G.xa) * 0.45, y: off(G.ys, s)))
        path.addLine(to: CGPoint(x: G.xs, y: off(G.ys, s)))
        path.addCurve(to: CGPoint(x: G.xr, y: off(G.bot, 0)), control1: CGPoint(x: G.xs + (G.xr - G.xs) * 0.3, y: off(G.bot, 0)), control2: CGPoint(x: G.xs + (G.xr - G.xs) * 0.5, y: off(G.bot, 0)))
        path.addLine(to: CGPoint(x: w - G.x0, y: off(G.bot, 0)))
        return path
    }

    private func drawEnv(_ ctx: inout GraphicsContext, _ size: CGSize, _ date: Date) {
        let w = size.width, h = size.height, G = geo(w, h)
        let cut = CGFloat(p(0)), env = CGFloat(p(2))
        let a = p(3), d = p(4), s = p(5), r = p(6)
        // cutoff line, slightly slanted like a horizon
        let yc: CGFloat = G.bot - (G.bot - G.top) * cut * 0.85
        var hor = Path(); hor.move(to: CGPoint(x: 0, y: yc + 12)); hor.addLine(to: CGPoint(x: w, y: yc - 12))
        ctx.stroke(hor, with: .color(.white.opacity(0.75)), lineWidth: 1.2)
        // filter envelope (dashed, drifting)
        let now = date.timeIntervalSinceReferenceDate * 1000
        let phase = CGFloat((now / 45).truncatingRemainder(dividingBy: 11))
        let fpath = ampPath(G, w) { _, lvl in yc - lvl * env * (yc - G.top) * 0.9 }
        ctx.stroke(fpath, with: .color(.white.opacity(0.6)), style: StrokeStyle(lineWidth: 1.3, dash: [5, 6], dashPhase: -phase))
        // amplitude envelope (solid, glowing)
        var glow = ctx
        glow.addFilter(.shadow(color: .white.opacity(0.7), radius: 5))
        glow.stroke(ampPath(G, w) { y, _ in y }, with: .color(.white), lineWidth: 2.2)
        // handles + labels
        let items: [(CGFloat, CGFloat, String, Character)] = [
            (G.xa, G.top, "a " + fmtT(a), "a"),
            (G.xd, G.ys, "d " + fmtT(d) + " · s \(Int((s * 100).rounded()))%", "d"),
            (G.xr, G.bot, "r " + fmtT(r), "r"),
        ]
        for (x, y, t, k) in items {
            let rr: CGFloat = handle == k ? 13 : 9
            ctx.fill(Path(ellipseIn: CGRect(x: x - rr, y: y - rr, width: rr * 2, height: rr * 2)), with: .color(.white.opacity(0.25)))
            ctx.fill(Path(ellipseIn: CGRect(x: x - 5, y: y - 5, width: 10, height: 10)), with: .color(.white))
            let label = Text(t).font(BFont.mono(10, 500)).foregroundColor(.white.opacity(0.9))
            let tw = CGFloat(t.count) * 6.1
            if k == "a" { ctx.draw(label, at: CGPoint(x: min(max(x + 14, 2), w - tw - 2), y: y + 5), anchor: .bottomLeading) }
            else { ctx.draw(label, at: CGPoint(x: min(max(x - tw / 2, 2), w - tw - 2), y: y - 14), anchor: .bottomLeading) }
        }
        // a glowing dot rides the envelope each time this track plays
        let el = CACurrentMediaTime() - model.hitTime[track]
        let decay = Double(model.param(kTrackParams[2], track))
        let gate: Double = max(0.06, model.stepDur * (0.6 + decay * 3.4))
        let A = Double(a), D = Double(d), R = Double(r)
        func lerp(_ a: CGFloat, _ b: CGFloat, _ u: Double) -> CGFloat { a + (b - a) * CGFloat(min(1, max(0, u))) }
        var pt: CGPoint? = nil
        if el >= 0 && el < A { pt = CGPoint(x: lerp(G.x0, G.xa, el / A), y: lerp(G.bot, G.top, pow(el / A, 0.7))) }
        else if el >= A && el < A + D { let u = (el - A) / D; pt = CGPoint(x: lerp(G.xa, G.xd, u), y: lerp(G.top, G.ys, 1 - pow(1 - u, 2))) }
        else if el >= 0 && el < max(gate, A + D) { pt = CGPoint(x: lerp(G.xd, G.xs, (el - A - D) / max(0.01, gate - A - D)), y: G.ys) }
        else if el >= 0 && el < max(gate, A + D) + R { let u = (el - max(gate, A + D)) / R; pt = CGPoint(x: lerp(G.xs, G.xr, u), y: lerp(G.ys, G.bot, 1 - pow(1 - u, 2))) }
        if let c = pt {
            let grad = Gradient(stops: [.init(color: .white.opacity(0.95), location: 0), .init(color: .white.opacity(0.5), location: 0.25), .init(color: .white.opacity(0), location: 1)])
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - 22, y: c.y - 22, width: 44, height: 44)), with: .radialGradient(grad, center: c, startRadius: 0, endRadius: 22))
        }
    }
}

// MARK: - every other engine: name, live picture, parameter grid, switches

struct GenericSynth: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let e: Int
    let theme: EngTheme
    @State private var active = -1

    var body: some View {
        let D = kEngDefs[e]
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(D.name).font(theme.pixel ? BFont.pixel(34) : BFont.sans(40, 200)).tracking(-1.2).lineLimit(1).fixedSize()
                Spacer(minLength: 4)
                Text(D.tag).font(BFont.mono(9)).foregroundColor(theme.mute).multilineTextAlignment(.trailing).lineLimit(2)
            }
            .padding(.top, 2).padding(.bottom, 2)
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { tl in
                Canvas { ctx, size in
                    EngViz(model: model, track: track, e: D.key, theme: theme).draw(&ctx, size, tl.date.timeIntervalSinceReferenceDate)
                }
            }
            .frame(height: 190)
            .contentShape(Rectangle())
            .onTapGesture { model.preview(track) }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14, alignment: .leading), count: D.cols), alignment: .leading, spacing: 8) {
                ForEach(D.params.indices, id: \.self) { f in dial(D, f) }
            }
            .padding(.top, 6)
            if !D.opts.isEmpty {
                FlowLayout(spacing: 6) {
                    ForEach(D.opts.indices, id: \.self) { o in
                        ForEach(D.opts[o].indices, id: \.self) { i in option(o, D.opts[o][i]) }
                    }
                }
                .padding(.top, 12)
            }
        }
    }

    private func dial(_ D: EngDef, _ f: Int) -> some View {
        let q = D.params[f]
        let v = model.engParam(f, e, track)
        let nu = q.fmt(v)
        let frac = CGFloat(min(1, max(0, v / q.max)))
        let isOn = active == f
        let font: ((CGFloat) -> Font)? = theme.pixel ? { s in BFont.pixel(s * 0.8) } : nil
        return VStack(alignment: .leading, spacing: 0) {
            Text(q.label).font(BFont.mono(9)).foregroundColor(theme.mute).lineLimit(1).truncationMode(.tail).padding(.bottom, 6)
            SupNumber(num: nu.0, unit: nu.1, size: D.valueSize, font: font).foregroundColor(isOn ? theme.acc : theme.fg)
            ZStack(alignment: .leading) {
                Rectangle().fill(theme.line)
                Rectangle().fill(theme.acc).frame(width: nil).scaleEffect(x: frac, y: 1, anchor: .leading)
            }
            .frame(height: 2).clipShape(RoundedRectangle(cornerRadius: 1))
            .padding(.top, 9)
        }
        .padding(.top, 9).padding(.bottom, 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .top) { Rectangle().fill(theme.line).frame(height: 1) }
        .modifier(VDrag(get: { model.engParam(f, e, track) }, set: { model.setEngParam(f, e, track, $0) }, range: 0...q.max, step: q.step,
                        onEnd: { active = -1; model.preview(track) }, active: Binding(get: { active == f }, set: { if $0 { active = f } })))
    }

    private func option(_ o: Int, _ c: (Int, String)) -> some View {
        let on = model.engOption(o, e, track) == c.0
        return Button { model.setEngOption(o, e, track, c.0); model.preview(track) } label: {
            Text(c.1).font(theme.pixel ? BFont.pixel(11) : BFont.mono(10)).lineLimit(1).fixedSize()
                .foregroundColor(on ? theme.on : theme.fg)
                .padding(.horizontal, 12).frame(height: 25)
                .background(Capsule().fill(on ? theme.fg : theme.chip))
        }
        .buttonStyle(PressScale())
    }
}

// MARK: - the live pictures (web: drawEng)

struct EngViz {
    let model: EngineModel
    let track: Int
    let e: String
    let theme: EngTheme

    private func P(_ f: Int) -> CGFloat { CGFloat(model.engine.engineParam(f, engine: engIndex(e), track: track)) }
    private func O(_ f: Int) -> Int { model.engine.engineOption(f, engine: engIndex(e), track: track) }
    private func dotsPath(_ pts: [CGPoint], _ r: CGFloat) -> Path {
        var p = Path(); for c in pts { p.addEllipse(in: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)) }; return p
    }
    private func label(_ ctx: inout GraphicsContext, _ s: String, _ col: Color, _ at: CGPoint, pixel: Bool = false, size: CGFloat = 9) {
        ctx.draw(Text(s).font(pixel ? BFont.pixel(11) : BFont.mono(size, 500)).foregroundColor(col), at: at, anchor: .bottomLeading)
    }

    func draw(_ ctx: inout GraphicsContext, _ size: CGSize, _ T: Double) {
        let el: Double = CACurrentMediaTime() - model.hitTime[track]
        switch e {
        case "acid": acid(&ctx, size, el)
        case "sub": sub(&ctx, size, el)
        case "fm": fm(&ctx, size, el, T)
        case "pluck": pluck(&ctx, size, el, T)
        case "sh101", "mini": osc(&ctx, size, el, T)
        case "chip": chip(&ctx, size, el, T)
        case "bris": bris(&ctx, size, el, T)
        case "super": superPad(&ctx, size, el, T)
        default: break
        }
    }

    private func acid(_ ctx: inout GraphicsContext, _ size: CGSize, _ el: Double) {
        let w = size.width, h = size.height, ac = theme.acc
        var grid: [CGPoint] = []
        var x: CGFloat = 8; while x < w { var y: CGFloat = 8; while y < h { grid.append(CGPoint(x: x, y: y)); y += 16 }; x += 16 }
        ctx.fill(dotsPath(grid, 0.9), with: .color(ac.opacity(0.18)))
        let tone = Double(model.param(kTrackParams[1], track))
        let accent = model.hitVel[track] >= 0.95
        let cut = Double(P(0)), res = Double(P(1)), env = Double(P(2)), decP = Double(P(3)), accP = Double(P(4))
        let base: Double = min(20000, Double(acidHz(Float(cut))) * (0.6 + tone * 0.8))
        let peak: Double = min(20000, base * (1 + env * (accent ? 1 + accP : 1) * 14))
        let dec: Double = (0.06 + decP * 0.9) * (accent ? 0.7 : 1)
        let fc: Double = (el >= 0 && el < 4) ? base + (peak - base) * exp(-el / (dec / 3)) : base
        let Q: Double = 0.7 + pow(res, 1.15) * 30
        func Y(_ db: Double) -> CGFloat { h * 0.12 + CGFloat((24 - db) / 64) * h * 0.8 }
        var curve = Path()
        var xx: CGFloat = 0
        while xx <= w {
            let fq: Double = 20 * pow(1000, Double(xx / w)), r: Double = fq / fc
            let a1: Double = (1 - r * r) * (1 - r * r)
            let H: Double = 1 / sqrt(a1 + (r / Q) * (r / Q)) / sqrt(a1 + (r / 0.55) * (r / 0.55))
            let db: Double = max(-40, min(24, 20 * log10(H)))
            if xx == 0 { curve.move(to: CGPoint(x: xx, y: Y(db))) } else { curve.addLine(to: CGPoint(x: xx, y: Y(db))) }
            xx += 2
        }
        var fill = curve; fill.addLine(to: CGPoint(x: w, y: h)); fill.addLine(to: CGPoint(x: 0, y: h)); fill.closeSubpath()
        ctx.fill(fill, with: .linearGradient(Gradient(colors: [ac.opacity(0.38), ac.opacity(0)]), startPoint: .zero, endPoint: CGPoint(x: 0, y: h)))
        var glow = ctx; glow.addFilter(.shadow(color: ac, radius: 7))
        glow.stroke(curve, with: .color(ac), lineWidth: 2.2)
        let xc = CGFloat(log(fc / 20) / log(1000)) * w
        var vl = Path(); vl.move(to: CGPoint(x: xc, y: 0)); vl.addLine(to: CGPoint(x: xc, y: h))
        ctx.stroke(vl, with: .color(ac.opacity(0.6)), style: StrokeStyle(lineWidth: 1, dash: [2, 5]))
        let lab = "\(Int(fc.rounded())) hz" + (accent && el < 0.3 ? " · accent" : "")
        let tw = CGFloat(lab.count) * 6.1
        ctx.draw(Text(lab).font(BFont.mono(10, 500)).foregroundColor(ac.opacity(0.9)), at: CGPoint(x: min(max(xc + 8, 4), w - tw - 4), y: 14), anchor: .bottomLeading)
    }

    private func sub(_ ctx: inout GraphicsContext, _ size: CGSize, _ el: Double) {
        let w = size.width, h = size.height, fg = theme.fg, ac = theme.acc
        let dec: Double = 0.1 + Double(P(0)) * 2.5
        let a = CGFloat(el >= 0 ? exp(-el / (dec / 3)) : 0)
        let c = CGPoint(x: w / 2, y: h / 2), R: CGFloat = min(w, h) * 0.47
        for k in stride(from: 7, through: 1, by: -1) {
            let kk = CGFloat(k)
            let r: CGFloat = R * kk / 7 * (1 + a * 0.07 * (k % 2 == 1 ? 1 : -0.6))
            let alpha: Double = 0.1 + 0.45 * Double(a) * Double(kk / 7) + (k == 7 ? 0.15 : 0)
            ctx.stroke(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)), with: .color(fg.opacity(alpha)), lineWidth: k == 7 ? 2 : 1)
        }
        let r6: CGFloat = R * 0.6
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - r6, y: c.y - r6, width: r6 * 2, height: r6 * 2)),
                 with: .radialGradient(Gradient(colors: [.black.opacity(0.35), .black.opacity(0)]), center: c, startRadius: 0, endRadius: r6))
        let cap: CGFloat = R * 0.22 * (1 + a * 0.22)
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - cap, y: c.y - cap, width: cap * 2, height: cap * 2)),
                 with: .radialGradient(Gradient(colors: [fg.opacity(0.95), ac.opacity(0.55)]), center: CGPoint(x: c.x - cap * 0.3, y: c.y - cap * 0.3), startRadius: 0, endRadius: cap))
        let tune = Double(model.param(kTrackParams[3], track))
        let fr: Double = 440 * pow(2, (Double(model.previewNote(track) - 12) + tune - 69) / 12)
        ctx.draw(Text("\(Int(fr.rounded()))").font(BFont.sans(30, 200)).foregroundColor(fg.opacity(0.9)), at: CGPoint(x: 8, y: h - 12), anchor: .bottomLeading)
        ctx.draw(Text("hz · grundton").font(BFont.mono(9, 500)).foregroundColor(fg.opacity(0.9)), at: CGPoint(x: 8, y: h - 50), anchor: .bottomLeading)
    }

    private func fm(_ ctx: inout GraphicsContext, _ size: CGSize, _ el: Double, _ T: Double) {
        let w = size.width, h = size.height, fg = theme.fg
        let ratio = Double(kFMRatios[max(0, min(6, Int(P(0).rounded())))]), I = Double(P(1))
        let a: Double = el >= 0 ? exp(-el / ((0.2 + Double(P(2)) * 2.5) / 3)) : 0
        let x0 = Double(w / 2), y0 = Double(h / 2), R: Double = Double(min(w, h)) * 0.36 * (1 + a * 0.07), ph: Double = T * 0.6
        let turns: Double = ratio.truncatingRemainder(dividingBy: 1) != 0 ? 4 : 2
        let N = 520, rad: Double = R * (1 - I * 0.3), amp: Double = R * (0.12 + I * 0.5)
        var dots = Path()
        let dr = CGFloat(1.2 + a * 0.6)
        for i in 0..<N {
            let th: Double = Double(i) / Double(N) * Double.pi * turns
            let px: Double = x0 + cos(th) * rad + cos(-(ratio + 1) * th + ph) * amp
            let py: Double = y0 + sin(th) * rad + sin(-(ratio + 1) * th + ph) * amp
            dots.addEllipse(in: CGRect(x: CGFloat(px) - dr, y: CGFloat(py) - dr, width: dr * 2, height: dr * 2))
        }
        let cr = CGFloat(rad)
        ctx.fill(Path(ellipseIn: CGRect(x: CGFloat(x0) - cr, y: CGFloat(y0) - cr, width: cr * 2, height: cr * 2)), with: .color(fg.opacity(0.08)))
        ctx.fill(dots, with: .color(fg.opacity(0.35 + a * 0.55)))
        let mx = CGFloat(x0 + cos(ph) * rad), my = CGFloat(y0 + sin(ph) * rad)
        ctx.fill(Path(ellipseIn: CGRect(x: mx - 4, y: my - 4, width: 8, height: 8)), with: .color(fg))
        label(&ctx, "modulator \(numStr(Float(ratio)))×", fg.opacity(0.6), CGPoint(x: 8, y: h - 8))
    }

    private func pluck(_ ctx: inout GraphicsContext, _ size: CGSize, _ el: Double, _ T: Double) {
        let w = size.width, h = size.height, fg = theme.fg
        let L: Double = 0.4 + Double(P(3)) * 2.6
        let a: Double = el >= 0 ? exp(-el / (L / 3)) : 0
        var frets = Path()
        for k in 1..<9 {
            let x: CGFloat = w * CGFloat(1 - pow(2, -Double(k) / 3)) * 1.05
            frets.move(to: CGPoint(x: x, y: 10)); frets.addLine(to: CGPoint(x: x, y: h - 10))
        }
        ctx.stroke(frets, with: .color(fg.opacity(0.1)), lineWidth: 1)
        for s in 0..<6 {
            let y: CGFloat = h * (0.17 + CGFloat(s) * 0.133), act = s == 2
            let amp: Double = act ? a * Double(h) * 0.16 : a * Double(h) * 0.015
            var p = Path()
            var x: CGFloat = 0
            while x <= w {
                let u = Double(x / w)
                let d1: Double = sin(Double.pi * u) * amp * sin(T * 55)
                let d2: Double = sin(2 * Double.pi * u) * amp * 0.35 * sin(T * 89 + 1)
                let d3: Double = sin(3 * Double.pi * u) * amp * 0.15 * sin(T * 131)
                let yy = y + CGFloat(d1 + d2 + d3)
                if x == 0 { p.move(to: CGPoint(x: x, y: yy)) } else { p.addLine(to: CGPoint(x: x, y: yy)) }
                x += 3
            }
            ctx.stroke(p, with: .color(act ? fg.opacity(0.95) : fg.opacity(0.28)), lineWidth: act ? 1.8 : 1 + CGFloat(5 - s) * 0.15)
        }
        let px: CGFloat = w * (0.08 + P(2) * 0.42), py: CGFloat = h * (0.17 + 2 * 0.133)
        let pr = CGFloat(5 + a * 3)
        ctx.fill(Path(ellipseIn: CGRect(x: px - pr, y: py - pr, width: pr * 2, height: pr * 2)), with: .color(theme.acc))
        label(&ctx, "anslag", fg.opacity(0.55), CGPoint(x: px + 10, y: py - 10))
    }

    private func osc(_ ctx: inout GraphicsContext, _ size: CGSize, _ el: Double, _ T: Double) {
        let w = size.width, h = size.height, fg = theme.fg
        let isSH = e == "sh101"
        let dP: Double = Double(isSH ? P(3) : P(4))
        let a: Double = el >= 0 ? exp(-el / (0.08 + (dP == 0 ? 0.4 : dP) * 0.6)) : 0
        let N = Int(w / 3), mid: CGFloat = h * 0.52, amp: CGFloat = h * 0.3 * CGFloat(0.25 + 0.75 * a), ph: Double = T * 2
        let saw = Double(P(5)), pulse = Double(P(6)), sb = Double(P(7)), pw = Double(P(8))
        let m1 = Double(P(6)), m2 = Double(P(7)), m3 = Double(P(8))
        func wv(_ x: CGFloat) -> Double {
            let fx = Double(x / w)
            let u: Double = (fx * 4 + ph).truncatingRemainder(dividingBy: 1)
            if isSH {
                let pwv: Double = 0.5 + 0.4 * pw * sin(T * (0.6 + 0.45 * 4) * 6.28)
                let s1: Double = 1 - 2 * u, pul: Double = u < pwv ? 1 : -1
                let sq: Double = (fx * 2 + ph / 2).truncatingRemainder(dividingBy: 1) < 0.5 ? 1 : -1
                return (s1 * saw + pul * pulse + sq * sb * 0.8) / (saw + pulse + sb * 0.8 + 0.01)
            }
            let s1: Double = 1 - 2 * u
            let s2: Double = 1 - 2 * (fx * 4 * 1.0008 + ph).truncatingRemainder(dividingBy: 1)
            let s3: Double = 1 - 2 * (fx * 4 * 0.5 + ph).truncatingRemainder(dividingBy: 1)
            return (s1 * m1 + s2 * m2 + s3 * m3) / (m1 + m2 + m3 + 0.01)
        }
        var lines = Path()
        var y: CGFloat = mid - amp
        while y <= mid + amp + 1 { lines.move(to: CGPoint(x: 0, y: y)); lines.addLine(to: CGPoint(x: w, y: y)); y += max(1, amp / 2) }
        ctx.stroke(lines, with: .color(fg.opacity(0.12)), lineWidth: 1)
        var pts: [CGPoint] = []
        for i in 0...max(1, N) { let x = CGFloat(i) / CGFloat(max(1, N)) * w; pts.append(CGPoint(x: x, y: mid - CGFloat(wv(x)) * amp)) }
        ctx.fill(dotsPath(pts, 1.6), with: .color(fg.opacity(0.85)))
        label(&ctx, isSH ? "saw · puls · sub" : "osc 1 · osc 2 · osc 3", theme.acc, CGPoint(x: 8, y: h - 8))
    }

    private func chip(_ ctx: inout GraphicsContext, _ size: CGSize, _ el: Double, _ T: Double) {
        let w = size.width, h = size.height, fg = theme.fg
        let px: CGFloat = max(6, (w / 48).rounded(.down)), cols = Int(w / px), rows = Int(h / px)
        let a: Double = el >= 0 ? max(0, 1 - el / (0.05 + Double(P(0)) * 1.4)) : 0
        let dutyI = O(0), duty: Double = [0.125, 0.25, 0.5, 0.5][max(0, min(3, dutyI))]
        var on = Path(), off = Path()
        for x in 0..<cols {
            let u: Double = (Double(x) / Double(cols) * 6 + T * 0.8).truncatingRemainder(dividingBy: 1)
            let val: Double = dutyI == 3 ? 1 - 4 * abs(u - 0.5) : (u < duty ? 1 : -1)
            let qv: Double = (val * 3).rounded() / 3
            let yy = Int((Double(rows) / 2 - qv * Double(rows) * 0.3 * (0.3 + 0.7 * a)).rounded())
            for y in 0..<rows {
                let r = CGRect(x: CGFloat(x) * px + 1, y: CGFloat(y) * px + 1, width: px - 2, height: px - 2)
                if y == yy { on.addRect(r) } else { off.addRect(r) }
            }
        }
        ctx.fill(off, with: .color(fg.opacity(0.07)))
        ctx.fill(on, with: .color(fg.opacity(0.95)))
        let names = ["PULS 12", "PULS 25", "FYRKANT", "TRIANGEL"], arps = ["ACKORD", "DUR", "MOLL", "OKTAV", "AV"]
        label(&ctx, names[max(0, min(3, dutyI))] + " · " + arps[max(0, min(4, O(1)))], fg, CGPoint(x: 8, y: h - 8), pixel: true)
    }

    private func bris(_ ctx: inout GraphicsContext, _ size: CGSize, _ el: Double, _ T: Double) {
        let w = size.width, h = size.height, fg = theme.fg, ac = theme.acc
        var grid: [CGPoint] = []
        var y: CGFloat = 10; while y < h { var x: CGFloat = 6; while x < w { grid.append(CGPoint(x: x, y: y)); x += 12 }; y += 12 }
        ctx.fill(dotsPath(grid, 0.9), with: .color(fg.opacity(0.08)))
        let aR = Float(P(4))
        let a: Double = el >= 0 ? max(0.18, exp(-el / (0.1 + Double(brT(aR, 10)) * 0.6))) : 0.18
        let square = O(0) != 0, cho = Double(P(7))
        let N = Int(w / 5), mid = h * 0.5
        for k in 0..<3 {
            var p = Path()
            for i in 0...max(1, N) {
                let x = CGFloat(i) / CGFloat(max(1, N)) * w
                let u: Double = (Double(x / w) * 3 + T * (0.25 + Double(k) * 0.03) + Double(k) * 0.13).truncatingRemainder(dividingBy: 1)
                let s: Double = square ? (u < 0.5 ? 1 : -1) : 1 - 2 * u
                let yy: CGFloat = mid - CGFloat(s) * h * 0.22 * CGFloat(a) * (1 - CGFloat(k) * 0.18) + CGFloat(sin(T * 1.3 + Double(k) * 2 + Double(x) * 0.01)) * h * 0.02 * CGFloat(cho)
                if i == 0 { p.move(to: CGPoint(x: x, y: yy)) } else { p.addLine(to: CGPoint(x: x, y: yy)) }
            }
            ctx.stroke(p, with: .color(k > 0 ? ac.opacity(0.35) : fg.opacity(0.9)), lineWidth: k > 0 ? 1.2 : 1.8)
        }
        label(&ctx, ["poly 6", "mono", "unison"][max(0, min(2, O(1)))] + " · Bris web", ac, CGPoint(x: 8, y: h - 8))
    }

    private func superPad(_ ctx: inout GraphicsContext, _ size: CGSize, _ el: Double, _ T: Double) {
        let w = size.width, h = size.height, fg = theme.fg, ac = theme.acc
        let att: Double = 0.01 + Double(P(1)) * 1.5, rel: Double = 0.1 + Double(P(2)) * 3
        let gate: Double = model.stepDur * (1 + Double(model.param(kTrackParams[2], track)) * 10)
        var a: Double = 0.2
        if el >= 0 && el < att { a = 0.2 + 0.8 * el / att }
        else if el >= att && el < gate { a = 1 }
        else if el >= gate && el < gate + rel * 1.5 { a = 0.2 + 0.8 * exp(-(el - gate) / (rel / 3)) }
        let det = Double(P(0)), width = Double(P(4))
        for k in 0..<7 {
            let d: Double = Double(k - 3) / 3
            let off: Double = d * det * Double(h) * 0.3 * (0.4 + width)
            var p = Path()
            var x: CGFloat = 0
            while x <= w {
                let u = Double(x / w)
                let yy: Double = Double(h) / 2 + off + sin(u * Double.pi * 2 * (1.1 + Double(k) * 0.07) + T * (0.9 + d * 0.35)) * Double(h) * 0.14 * a
                    + sin(u * Double.pi * 5 + T * 1.7 + Double(k)) * Double(h) * 0.025 * a
                if x == 0 { p.move(to: CGPoint(x: x, y: CGFloat(yy))) } else { p.addLine(to: CGPoint(x: x, y: CGFloat(yy))) }
                x += 4
            }
            var g = ctx
            g.addFilter(.shadow(color: ac.opacity(0.7), radius: k == 3 ? 6 : 3))
            let col: Color = k == 3 ? fg.opacity(0.95) : (k < 3 ? fg : ac).opacity(0.28 + 0.1 * Double(3 - abs(k - 3)))
            g.stroke(p, with: .color(col), lineWidth: k == 3 ? 2 : 1.4)
        }
    }
}
