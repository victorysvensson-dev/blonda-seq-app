import SwiftUI

// The Live module (web: .card.lite[data-card=perform]) — hold and drag the XY pad: left = lowpass, right = highpass,
// up = echo + space throw. Below it the "BLONDA LIVE" device with the readouts and the beat repeat ruler.

private let kLk = Color(rgb: 29, 29, 27)
private let kLm = Color(rgb: 29, 29, 27, 0.5)

/// Puck physics + the finger trail, updated once per drawn frame (web: spr(puck) and trail).
final class XYState {
    var x: CGFloat = 0, y: CGFloat = 0, vx: CGFloat = 0, vy: CGFloat = 0   // puck offset from the centre
    var tx: CGFloat = 0, ty: CGFloat = 0, drag = false
    var trail: [(CGPoint, CFTimeInterval)] = []
    var last: CFTimeInterval = 0
    func step(_ now: CFTimeInterval) {
        let dt = CGFloat(last == 0 ? 0.016 : min(0.05, now - last)); last = now
        if drag { // follow the finger closely
            let k: CGFloat = 1 - pow(0.0005, dt); x += (tx - x) * k; y += (ty - y) * k; vx = 0; vy = 0
        } else {  // spring back to the centre with a little overshoot
            let ax = -170 * x - 14 * vx, ay = -170 * y - 14 * vy
            vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt
        }
        trail.removeAll { now - $0.1 > 0.7 }
    }
}

struct LiveCard: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var fold = FoldStore.shared
    @State private var xy = XYState()
    @State private var on = false
    @State private var f: Float = 0
    @State private var fx: Float = 0

    private var read: String {
        guard on else { return "håll och dra" }
        return (f == 0 ? "filter av" : (f < 0 ? "lp " : "hp ") + "\(Int((abs(f) * 100).rounded()))") + " · fx \(Int((fx * 100).rounded()))"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                (Text("live · ").foregroundColor(kLm) + Text(read).foregroundColor(kLk).font(BFont.mono(9.5, 500)))
                    .font(BFont.mono(9.5)).tracking(0.855).lineLimit(1)
                Spacer()
                HStack(spacing: 5) { LiteCap(.min, dark: false, fold: "live"); LiteCap(.full, dark: false, fold: "live") }
                LiteCap(.grab, dark: false).padding(.leading, 8)
            }
            .frame(height: 26)
            if !fold.isFolded("live") {
                pad
                LiveDevice(on: on, f: f, fx: fx)
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 26, style: .continuous).fill(LinearGradient(colors: [Color(hex: 0xF8F7F3), Color(hex: 0xEAE9E3)], startPoint: UnitPoint(x: 0.37, y: 0), endPoint: UnitPoint(x: 0.63, y: 1))).dotsHidden())
        .overlay(RoundedRectangle(cornerRadius: 26, style: .continuous).strokeBorder(LinearGradient(colors: [.white, .white.opacity(0)], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.08)), lineWidth: 1).allowsHitTesting(false).dotsHidden())
        .dotsInvert()
        .shadow(color: .black.opacity(LookStore.shared.look == .dots ? 0 : 0.55), radius: 24, y: 24 - 12)
    }

    // MARK: XY pad

    private var pad: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height
            ZStack {
                TimelineView(.animation(minimumInterval: 1.0 / 60.0)) { tl in
                    Canvas { ctx, size in drawPad(&ctx, size, tl.date) }
                }
                tags(w, h)
                Group {
                    Text("↑ echo + space").position(x: 10 + 46, y: 14)
                    Text("← lowpass").position(x: 10 + 30, y: h - 14)
                    Text("highpass →").position(x: w - 10 - 34, y: h - 14)
                }
                .font(BFont.mono(9.5)).tracking(0.38).foregroundColor(kLk.opacity(0.42)).allowsHitTesting(false)
            }
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 0).onChanged { v in move(v.location, g.size) }.onEnded { _ in end() })
        }
        .aspectRatio(1.12, contentMode: .fit)
        .background(DotGrid(spacing: 12, radius: 0.8, color: kLk.opacity(0.12)).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous)))
    }

    private func move(_ p: CGPoint, _ size: CGSize) {
        let x = min(max(p.x, 0), size.width), y = min(max(p.y, 0), size.height)
        let nx = Float(x / size.width), ny = Float(1 - y / size.height)
        var ff = (nx - 0.5) * 2
        ff = abs(ff) < 0.08 ? 0 : (ff - (ff > 0 ? 0.08 : -0.08)) / 0.92
        xy.drag = true; xy.tx = x - size.width / 2; xy.ty = y - size.height / 2
        xy.trail.append((CGPoint(x: x, y: y), CACurrentMediaTime()))
        if !on { on = true }
        f = ff; fx = ny
        model.engine.perform(active: true, filter: ff, fx: ny)
    }

    private func end() {
        guard on else { return }
        on = false; xy.drag = false; xy.tx = 0; xy.ty = 0; f = 0; fx = 0
        model.engine.perform(active: false, filter: 0, fx: 0)
    }

    private func drawPad(_ ctx: inout GraphicsContext, _ size: CGSize, _ date: Date) {
        let now = CACurrentMediaTime()
        xy.step(now)
        let w = size.width, h = size.height, cx = w / 2, cy = h / 2, R: CGFloat = min(w, h) * 0.4
        let px = cx + xy.x, py = cy + xy.y, act: CGFloat = on ? 1 : 0, energy = CGFloat(model.energy)
        for (k, a) in [(1.0, 0.4), (0.9, 0.2), (0.22, 0.28)] {
            let r = R * CGFloat(k) * (1 + energy * 0.02)
            ctx.stroke(Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)), with: .color(kLk.opacity(a)), lineWidth: 1)
        }
        // the dot field swells around the puck
        let sp: CGFloat = 9
        var dots = Path()
        var y: CGFloat = cy - R * 0.86
        while y <= cy + R * 0.86 {
            var x: CGFloat = cx - R * 0.86
            while x <= cx + R * 0.86 {
                let dc = hypot(x - cx, y - cy)
                if dc <= R * 0.84 && dc >= R * 0.27 {
                    let d = hypot(x - px, y - py), inf = max(0, 1 - d / (R * 0.55))
                    let rr: CGFloat = 0.6 + inf * (1.1 + act * 1.7) + energy * 0.7 * (1 - dc / R)
                    let skip = rr < 0.8 && (Int((x / sp).rounded()) + Int((y / sp).rounded())) % 3 != 0
                    if !skip { dots.addEllipse(in: CGRect(x: x - rr, y: y - rr, width: rr * 2, height: rr * 2)) }
                }
                x += sp
            }
            y += sp
        }
        ctx.fill(dots, with: .color(kLk.opacity(0.55)))
        if on || hypot(xy.x, xy.y) > 2 {
            var l = Path(); l.move(to: CGPoint(x: cx, y: cy)); l.addLine(to: CGPoint(x: px, y: py))
            ctx.stroke(l, with: .color(kLk.opacity(0.55)), style: StrokeStyle(lineWidth: 1, dash: [2, 4]))
            var c = Path(); c.move(to: CGPoint(x: px, y: 0)); c.addLine(to: CGPoint(x: px, y: h)); c.move(to: CGPoint(x: 0, y: py)); c.addLine(to: CGPoint(x: w, y: py))
            ctx.stroke(c, with: .color(kLk.opacity(0.13)), style: StrokeStyle(lineWidth: 1, dash: [2, 4]))
        }
        // trail
        let tr = xy.trail
        if tr.count > 1 {
            for i in 1..<tr.count {
                let a = tr[i - 1].0, b = tr[i].0, age = CGFloat((now - tr[i].1) / 0.7)
                let d = hypot(b.x - a.x, b.y - a.y), n = max(1, Int(d / 8)), r = (1 - age) * 3 + 0.8
                var p = Path()
                for j in 0..<n { let q = CGFloat(j) / CGFloat(n); p.addEllipse(in: CGRect(x: a.x + (b.x - a.x) * q - r, y: a.y + (b.y - a.y) * q - r, width: r * 2, height: r * 2)) }
                ctx.fill(p, with: .color(kLk.opacity(Double((1 - age) * 0.55))))
            }
        }
        // puck
        let pr: CGFloat = 18
        let halo: CGFloat = on ? 9 : 7
        ctx.fill(Path(ellipseIn: CGRect(x: px - pr - halo, y: py - pr - halo, width: (pr + halo) * 2, height: (pr + halo) * 2)),
                 with: .color(on ? Color(rgb: 242, 195, 24, 0.4) : Color.white.opacity(0.55)))
        var sh = ctx
        sh.addFilter(.shadow(color: .black.opacity(on ? 0.4 : 0.35), radius: on ? 9 : 7, y: on ? 6 : 5))
        sh.fill(Path(ellipseIn: CGRect(x: px - pr, y: py - pr, width: pr * 2, height: pr * 2)), with: .color(.white))
        ctx.stroke(Path(ellipseIn: CGRect(x: px - pr, y: py - pr, width: pr * 2, height: pr * 2)), with: .color(on ? kLk : kLk.opacity(0.25)), lineWidth: 1)
        ctx.stroke(Path(ellipseIn: CGRect(x: px - 7, y: py - 7, width: 14, height: 14)), with: .color(kLk.opacity(0.5)), lineWidth: 1)
    }

    // the floating value tags (web: .xtag x1…x6)
    private func tags(_ w: CGFloat, _ h: CGFloat) -> some View {
        let echo = Double(model.param(kMasterParams[2], 0)), space = Double(model.param(kMasterParams[3], 0))
        let fxd = Double(fx)
        let ft = f == 0 ? "av" : (f < 0 ? "lp " : "hp ") + "\(Int((abs(f) * 100).rounded()))"
        return ZStack(alignment: .topLeading) {
            Color.clear.frame(width: w, height: h)   // anchors the percentages to the pad's own corner
            XTag(dot: 0x3D6CF5, label: "filter", value: ft).alignmentGuide(.leading) { _ in -w * 0.04 }.alignmentGuide(.top) { _ in -h * 0.10 }
            XTag(dot: 0xF2C318, label: "fx", value: "\(Int((fxd * 100).rounded())) %").frame(width: w * 0.96, alignment: .trailing).alignmentGuide(.top) { _ in -h * 0.06 }
            XTag(dot: 0x27B26B, label: "echo", value: "\(Int((min(1, echo + fxd * 0.45) * 100).rounded())) %").frame(width: w * 0.98, alignment: .trailing).alignmentGuide(.top) { _ in -h * 0.52 }
            XTag(dot: 0x8E7CFF, label: "space", value: "\(Int((min(1, space + fxd * 0.55) * 100).rounded())) %").alignmentGuide(.leading) { _ in -w * 0.02 }.alignmentGuide(.top) { _ in -h * 0.58 }
            XTag(dot: 0x1D1D1B, label: nil, value: "\(Int(model.bpm.rounded())) bpm").alignmentGuide(.leading) { _ in -w * 0.16 }.alignmentGuide(.top) { _ in -h * 0.88 + 22 }
            XTag(dot: 0xFF6A1A, label: nil, value: model.playing ? String(format: "takt %02d", model.bar + 1) : "stopp").frame(width: w * 0.86, alignment: .trailing).alignmentGuide(.top) { _ in -h * 0.84 + 22 }
        }
        .frame(width: w, height: h, alignment: .topLeading)
        .allowsHitTesting(false)
    }
}

struct XTag: View {
    let dot: UInt32
    let label: String?
    let value: String
    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(Color(hex: dot)).frame(width: 5, height: 5)
            if let l = label { Text(l).foregroundColor(kLk.opacity(0.55)) }
            Text(value).fontWeight(.medium).foregroundColor(kLk).monospacedDigit()
        }
        .font(BFont.sans(10)).lineLimit(1).fixedSize()
        .padding(.leading, 7).padding(.trailing, 9).frame(height: 22)
        .background(Capsule().fill(Color.white.opacity(0.78)).shadow(color: .black.opacity(0.15), radius: 5, y: 2))
        .overlay(Capsule().strokeBorder(kLk.opacity(0.05), lineWidth: 1))
    }
}

/// A plain field of dots (CSS radial-gradient dot background).
struct DotGrid: View {
    let spacing: CGFloat
    let radius: CGFloat
    let color: Color
    var body: some View {
        Canvas { ctx, size in
            var p = Path()
            let ox = (size.width.truncatingRemainder(dividingBy: spacing)) / 2, oy = (size.height.truncatingRemainder(dividingBy: spacing)) / 2
            var y = oy + spacing / 2
            while y < size.height { var x = ox + spacing / 2; while x < size.width { p.addEllipse(in: CGRect(x: x - radius, y: y - radius, width: radius * 2, height: radius * 2)); x += spacing }; y += spacing }
            ctx.fill(p, with: .color(color))
        }
    }
}

// MARK: - BLONDA LIVE device: readouts + beat repeat

private let kDivs: [(String, Double)] = [("1/2", 2), ("1/4", 1), ("1/8", 0.5), ("1/8T", 1.0 / 3), ("1/16", 0.25), ("1/16T", 1.0 / 6), ("1/32", 0.125), ("1/32T", 1.0 / 12), ("1/64", 0.0625)]

struct LiveDevice: View {
    @EnvironmentObject var model: EngineModel
    let on: Bool
    let f: Float
    let fx: Float
    @State private var sel = 4
    @State private var rp = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("BLONDA LIVE").font(BFont.pixel(12.5)).tracking(0.75).foregroundColor(kLk)
                    Text("performance · gen 3").font(BFont.sans(10.5)).foregroundColor(kLm)
                }
                Spacer()
                HStack(spacing: 5) {
                    Circle().fill(Color(hex: 0xF2C318)).frame(width: 6, height: 6)
                    Text(on || rp ? "aktiv" : model.playing ? "spelar" : "redo").font(BFont.sans(10.5)).foregroundColor(kLm)
                }
            }
            .padding(.bottom, 14)
            HStack(alignment: .top, spacing: 8) {
                num("filter", "\(Int((abs(f) * 100).rounded()))", f == 0 ? "av" : (f < 0 ? "lp" : "hp"))
                num("effekt", "\(Int((fx * 100).rounded()))", "%")
            }
            .padding(.bottom, 6)
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("repeat").font(BFont.mono(10)).tracking(0.6).foregroundColor(kLk.opacity(0.55))
                Text(kDivs[sel].0).font(BFont.linje(22)).foregroundColor(kLk).frame(minWidth: 58, alignment: .leading)
                Spacer()
                Text("håll · dra ← → för takt").font(BFont.mono(9.5)).tracking(0.57).foregroundColor(kLk.opacity(0.55)).lineLimit(1)
            }
            .padding(.top, 12).padding(.bottom, 8)
            ruler
        }
        .padding(.horizontal, 16).padding(.top, 16).padding(.bottom, 12)
        .background(RoundedRectangle(cornerRadius: T.cardR, style: .continuous).fill(LinearGradient(colors: [Color(hex: 0xFDFCF5), Color(hex: 0xF2EFC9)], startPoint: UnitPoint(x: 0.41, y: 0), endPoint: UnitPoint(x: 0.59, y: 1))).dotsHidden().overlay(LookStore.shared.look == .dots ? DotBorder(color: Color.black.opacity(0.5)) : nil))
        .overlay(RoundedRectangle(cornerRadius: T.cardR, style: .continuous).strokeBorder(LinearGradient(colors: [.white, .white.opacity(0)], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.06)), lineWidth: 1).allowsHitTesting(false))
        .modifier(LookInvert(dots: false))
        .shadow(color: .black.opacity(LookStore.shared.look == .glass ? 0.3 : 0), radius: 12, y: 12 - 6)
    }

    private func num(_ label: String, _ v: String, _ unit: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(BFont.sans(11)).foregroundColor(kLm)
            HStack(alignment: .lastTextBaseline, spacing: 3) {
                Text(v).font(BFont.sans(36, 300)).tracking(-1.4).monospacedDigit().foregroundColor(kLk)
                Text(unit).font(BFont.sans(11)).foregroundColor(kLm)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var ruler: some View {
        GeometryReader { g in
            HStack(spacing: 4) {
                ForEach(kDivs.indices, id: \.self) { i in cell(i) }
            }
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 0).onChanged { v in
                let i = max(0, min(kDivs.count - 1, Int(v.location.x / max(1, g.size.width) * CGFloat(kDivs.count))))
                if !rp { rp = true; sel = i; model.engine.beatRepeat(1, division: i) }
                else if i != sel { sel = i; model.engine.beatRepeat(2, division: i) }
            }.onEnded { _ in
                if rp { rp = false; model.engine.beatRepeat(0, division: sel) }
            })
        }
        .frame(height: 64)
    }

    private func cell(_ i: Int) -> some View {
        let (name, beats) = kDivs[i]
        let cur = i == sel, trip = name.hasSuffix("T")
        let dots = min(8, max(1, Int(log2(2 / beats).rounded()) + 1))
        let bg: Color = cur ? (rp ? Color(hex: 0xF2C318) : kLk) : kLk.opacity(trip ? 0.025 : 0.05)
        let ink: Color = cur ? (rp ? kLk : Color(hex: 0xF2EFC9)) : kLk.opacity(0.6)
        let dotC: Color = cur ? (rp ? kLk : Color(hex: 0xF2C318)) : kLk.opacity(0.28)
        return VStack(spacing: 0) {
            Text(name).font(BFont.mono(trip ? 8 : 9)).foregroundColor(ink).lineLimit(1).minimumScaleFactor(0.7)
            Spacer(minLength: 2)
            VStack(spacing: 3) {
                ForEach(0..<dots, id: \.self) { _ in Circle().fill(dotC).frame(width: 4, height: 4) }
            }
            .modifier(Blink(on: cur && rp, period: beats * 60 / Double(max(40, model.bpm))))
        }
        .padding(.top, 8).padding(.bottom, 9)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(bg))
        .shadow(color: Color(rgb: 242, 195, 24, cur && rp ? 0.9 : 0), radius: 11, y: 8)
        .offset(y: cur && rp ? 1 : 0)
        .animation(.easeOut(duration: 0.1), value: cur)
        .animation(.easeOut(duration: 0.1), value: rp)
    }
}

/// The repeat dots blink in time with the loop (web: rptb steps(1) at the repeat length).
struct Blink: ViewModifier {
    let on: Bool
    let period: Double
    func body(content: Content) -> some View {
        if on {
            TimelineView(.animation) { tl in
                let ph = tl.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: max(0.02, period)) / max(0.02, period)
                content.opacity(ph < 0.5 ? 1 : 0.25)
            }
        } else { content }
    }
}
