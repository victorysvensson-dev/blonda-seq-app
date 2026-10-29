import SwiftUI

// BLONDA BRIS from the shared BLONDA motor library (Bree6 clone, the same code as the Max for Live plugin):
// a dot-matrix display with the factory sound, the two envelopes and a live level, then the panel by section.

private struct MP { let id: String; let label: String }
private let kMotorSections: [(String, [MP])] = [
    ("oscillator", [MP(id: "pw", label: "pulsbredd"), MP(id: "sub", label: "sub"), MP(id: "detune", label: "detune"), MP(id: "lfopwm", label: "lfo → pw")]),
    ("filter", [MP(id: "cut", label: "cutoff"), MP(id: "res", label: "reso"), MP(id: "eg1", label: "eg1 → filter"), MP(id: "kbd", label: "key track")]),
    ("eg1 · filter", [MP(id: "fa", label: "attack"), MP(id: "fd", label: "decay"), MP(id: "fs", label: "sustain"), MP(id: "fr", label: "release")]),
    ("eg2 · amp", [MP(id: "aa", label: "attack"), MP(id: "ad", label: "decay"), MP(id: "asus", label: "sustain"), MP(id: "ar", label: "release")]),
    ("lfo", [MP(id: "lrate", label: "fart"), MP(id: "lfoosc", label: "→ tonhöjd"), MP(id: "lfocut", label: "→ filter"), MP(id: "lfoamp", label: "→ volym")]),
    ("effekt", [MP(id: "chorus", label: "chorus"), MP(id: "dmix", label: "delay mix"), MP(id: "dtime", label: "delay tid"), MP(id: "dfb", label: "feedback")]),
    ("spel", [MP(id: "porta", label: "portamento"), MP(id: "uniint", label: "unison int"), MP(id: "velf", label: "vel → filter"), MP(id: "vol", label: "volym")]),
]
private let kMotorIndex: [String: Int] = {
    var d: [String: Int] = [:]
    for i in 0..<BLONDAEngine.motorParamCount { d[BLONDAEngine.motorParamId(i)] = i }
    return d
}()
private func mpi(_ id: String) -> Int { kMotorIndex[id] ?? -1 }

/// Values in the units the ear knows (time constants from generator/bris.py).
private func motorFmt(_ id: String, _ v: Double) -> (String, String) {
    func secs(_ x: Double) -> (String, String) { x < 1 ? (String(Int((x * 1000).rounded())), "ms") : (String(format: "%.2f", x), "s") }
    func hz(_ h: Double) -> (String, String) { h >= 1000 ? (String(format: "%.1f", h / 1000), "khz") : (h >= 10 ? String(Int(h.rounded())) : String(format: "%.1f", h), "hz") }
    switch id {
    case "cut": return hz(20 * pow(1000, v))
    case "lrate": return hz(0.1 * pow(1000, v))
    case "fa", "aa": return secs(0.001 * pow(10000, v))
    case "fd", "fr", "ad", "ar": return secs(0.0036 * pow(10000, v))   // ≈ 3 time constants
    case "porta": return v <= 0.001 ? ("av", "") : secs(0.0015 * pow(1300, v) * 3)
    case "dtime": return secs(0.001 + v * v * 0.999)
    case "uniint", "bendr": return (String(Int(v.rounded())), "st")
    case "kbda": return (String(Int((v * 100).rounded())), "%")
    default: return (String(Int((v * 100).rounded())), "%")
    }
}

struct MotorSynth: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let theme: EngTheme
    @State private var active = ""

    var body: some View {
        let pi = model.motorPreset(track)
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("BLONDA BRIS").font(BFont.pixel(26)).tracking(1.2).lineLimit(1).fixedSize()
                Spacer(minLength: 4)
                Text("bree6 · 6 röster · blonda-motor").font(BFont.mono(9)).foregroundColor(theme.mute).multilineTextAlignment(.trailing).lineLimit(2)
            }
            .padding(.bottom, 10)
            display(pi)
            FlowLayout(spacing: 6) {
                ForEach([(0, "såg"), (1, "puls"), (2, "såg + puls")], id: \.0) { it in opt("vform", it.0, it.1) }
                ForEach([(0, "poly stereo"), (1, "poly"), (2, "mono"), (3, "unison")], id: \.0) { it in opt("lage", it.0, it.1) }
                ForEach([(0, "lfo tri"), (1, "upp"), (2, "ner"), (3, "fyrkant"), (4, "s&h")], id: \.0) { it in opt("lwave", it.0, it.1) }
            }
            .padding(.top, 12)
            ForEach(kMotorSections.indices, id: \.self) { s in
                Text(kMotorSections[s].0).font(BFont.mono(9, 500)).tracking(0.9).foregroundColor(theme.acc).padding(.top, 14).padding(.bottom, 2)
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12, alignment: .leading), count: 4), alignment: .leading, spacing: 6) {
                    ForEach(kMotorSections[s].1, id: \.id) { p in dial(p) }
                }
            }
        }
    }

    // the OLED: factory sound, ‹ ›, envelopes and a level that follows the voices
    private func display(_ pi: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Text(String(format: "%02d", pi)).font(BFont.mono(10, 500)).foregroundColor(theme.acc)
                Text("/ \(BLONDAEngine.motorPresetCount - 1)").font(BFont.mono(9)).foregroundColor(theme.mute)
                Spacer()
                navButton("M10 3 5 8l5 5") { model.setMotorPreset(track, pi - 1); model.preview(track) }
                navButton("M6 3l5 5-5 5") { model.setMotorPreset(track, pi + 1); model.preview(track) }
            }
            ViewThatFits(in: .horizontal) {
                DotMatrixText(text: BLONDAEngine.motorPresetName(pi), height: 22, color: theme.acc, offOpacity: 0.06, glow: theme.acc.opacity(0.6))
                DotMatrixText(text: BLONDAEngine.motorPresetName(pi), height: 15, color: theme.acc, offOpacity: 0.06, glow: theme.acc.opacity(0.6))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { _ in
                Canvas { ctx, size in drawEnvelopes(&ctx, size) }
            }
            .frame(height: 70)
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.black.opacity(0.55)))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(theme.acc.opacity(0.22), lineWidth: 1))
        .contentShape(Rectangle())
        .onTapGesture { model.preview(track) }
    }

    private func navButton(_ d: String, _ a: @escaping () -> Void) -> some View {
        Button(action: a) {
            SVGIcon(d: d, box: 16, size: 12, stroke: 1.6, cap: .round).frame(width: 12, height: 12).foregroundColor(theme.fg)
                .frame(width: 30, height: 26).background(Capsule().fill(theme.chip))
        }
        .buttonStyle(PressScale())
    }

    private func drawEnvelopes(_ ctx: inout GraphicsContext, _ size: CGSize) {
        let w = size.width, h = size.height
        func v(_ id: String) -> CGFloat { CGFloat(model.engine.motorParam(mpi(id), track: track)) }
        func env(_ a: CGFloat, _ d: CGFloat, _ s: CGFloat, _ r: CGFloat) -> Path {
            let top: CGFloat = 4, bot = h - 4, W = w - 8
            let xa = 4 + W * 0.22 * a, xd = xa + W * 0.22 * d, xs = xd + W * 0.18, xr = min(w - 4, xs + W * 0.3 * r), ys = bot - (bot - top) * s
            var p = Path(); p.move(to: CGPoint(x: 4, y: bot))
            p.addQuadCurve(to: CGPoint(x: xa, y: top), control: CGPoint(x: (4 + xa) / 2, y: top))
            p.addQuadCurve(to: CGPoint(x: xd, y: ys), control: CGPoint(x: xa + (xd - xa) * 0.2, y: ys))
            p.addLine(to: CGPoint(x: xs, y: ys))
            p.addQuadCurve(to: CGPoint(x: xr, y: bot), control: CGPoint(x: xs + (xr - xs) * 0.2, y: bot))
            p.addLine(to: CGPoint(x: w - 4, y: bot))
            return p
        }
        // grid of faint dots like the plugin's screen
        var dots = Path(); var y: CGFloat = 3
        while y < h { var x: CGFloat = 3; while x < w { dots.addEllipse(in: CGRect(x: x - 0.6, y: y - 0.6, width: 1.2, height: 1.2)); x += 8 }; y += 8 }
        ctx.fill(dots, with: .color(theme.acc.opacity(0.08)))
        ctx.stroke(env(v("fa"), v("fd"), v("fs"), v("fr")), with: .color(theme.fg.opacity(0.45)), style: StrokeStyle(lineWidth: 1.2, dash: [4, 4]))
        var g = ctx; g.addFilter(.shadow(color: theme.acc.opacity(0.8), radius: 4))
        g.stroke(env(v("aa"), v("ad"), v("asus"), v("ar")), with: .color(theme.acc), lineWidth: 2)
        // live level (loudest voice)
        let m = CGFloat(min(1, max(0, model.engine.motorMeter(track))))
        if m > 0.002 {
            let bh = (h - 8) * m
            ctx.fill(Path(roundedRect: CGRect(x: w - 7, y: h - 4 - bh, width: 3, height: bh), cornerRadius: 1.5), with: .color(theme.acc))
        }
    }

    private func opt(_ id: String, _ v: Int, _ l: String) -> some View {
        let on = Int(model.motorParam(mpi(id), track).rounded()) == v
        return Button { model.setMotorParam(mpi(id), track, Double(v)); model.preview(track) } label: {
            Text(l).font(BFont.mono(10)).lineLimit(1).fixedSize()
                .foregroundColor(on ? theme.on : theme.fg)
                .padding(.horizontal, 11).frame(height: 25)
                .background(Capsule().fill(on ? theme.acc : theme.chip))
        }
        .buttonStyle(PressScale())
    }

    private func dial(_ p: MP) -> some View {
        let i = mpi(p.id)
        let lo = BLONDAEngine.motorParamMin(i), hi = BLONDAEngine.motorParamMax(i)
        let v = model.motorParam(i, track)
        let nu = motorFmt(p.id, v)
        let frac = CGFloat(hi > lo ? (v - lo) / (hi - lo) : 0)
        let isOn = active == p.id
        return VStack(alignment: .leading, spacing: 0) {
            Text(p.label).font(BFont.mono(9)).foregroundColor(theme.mute).lineLimit(1).padding(.bottom, 5)
            SupNumber(num: nu.0, unit: nu.1, size: 21).foregroundColor(isOn ? theme.acc : theme.fg)
            ZStack(alignment: .leading) {
                Rectangle().fill(theme.line)
                Rectangle().fill(theme.acc).scaleEffect(x: max(0, min(1, frac)), y: 1, anchor: .leading)
            }
            .frame(height: 2).padding(.top, 8)
        }
        .padding(.top, 8).padding(.bottom, 3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .top) { Rectangle().fill(theme.line).frame(height: 1) }
        .modifier(VDrag(get: { Float(model.motorParam(i, track)) }, set: { model.setMotorParam(i, track, Double($0)) },
                        range: Float(lo)...Float(hi), step: BLONDAEngine.motorParamInteger(i) ? 1 : 0,
                        onEnd: { active = ""; model.preview(track) },
                        active: Binding(get: { active == p.id }, set: { if $0 { active = p.id } })))
    }
}
