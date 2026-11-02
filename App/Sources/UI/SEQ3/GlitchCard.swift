import SwiftUI

/// BLONDA GLITCH — master glitch: hold a pad to stutter / roll / reverse / tape-stop / half-speed / crush / gate,
/// or let "slump" throw random glitches on the beat. The ASCII screen moves with the music and shows what plays.
private let kGlitchNames = ["stutter", "roll", "rev", "stop", "halv", "crush", "gate"]

struct GlitchCard: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let amt = model.engine.glitchAmount
        Card(style: .dark, title: [("Glitch · ", false), (amt > 0.005 ? "slump \(Int((amt * 100).rounded())) %" : "håll en eller flera", true)]) {
            GlitchModules()
        }
    }
}

// MARK: glass modules (web: .gx-t) — a big figure, the name, a die in the corner (may "slump" use it?) and a line
// drawing that comes alive while held. Each module is lit its own way: a dim tone of its colour, bright when held.
private let kLime = Color(hex: 0xE2F53C)
private let kGxBig = ["×4", "1/32", "−1", "0", "½", "8", "50"], kGxUnit = ["", "", "", "", "", "bit", "%"]
private let kGxCol: [(UInt32, UInt32)] = [(0xF2F2EE, 0xB8C2CC), (0xFF7A1E, 0xF2A848), (0x5D8BFF, 0x9FC0FF), (0xD9D9D2, 0x8E8E88), (0xFFC93C, 0xFF9A3C), (0xC9F23A, 0x7FD36A), (0xFF6F8E, 0xFFB08A), (0x9FD07A, 0xE2F53C)]

struct GlitchModules: View {
    @EnvironmentObject var model: EngineModel
    @State private var width: CGFloat = 600
    @ObservedObject private var full = FullStore.shared
    var body: some View {
        // full screen (web): 4 × 2 big modules that fill the window, sized so both rows fit its height
        let isFull = full.key == "glitch"
        let cols = isFull ? (width < 400 ? 2 : 4) : (width >= 900 ? 8 : (width < 400 ? 2 : 4))
        let maxW: CGFloat = isFull ? max(320, ((ScreenSize.current.height - 190) / 2 / 1.05) * 4 + 30) : .infinity
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: isFull ? 14 : 10), count: cols), spacing: isFull ? 14 : 10) {
            ForEach(1...7, id: \.self) { fx in GxModule(fx: fx) }
            GxSlump()
        }
        .frame(maxWidth: maxW)
        .frame(maxWidth: .infinity)
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
    }
}

/// the lit glass behind a module: two blurred shapes in the module's colours, placed differently per module
private struct GxGlow: View {
    let fx: Int
    let on: Bool
    let level: Double   // slump: how bright when not held
    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height, c = kGxCol[fx - 1], a = Color(hex: c.0), b = Color(hex: c.1)
            ZStack {
                switch fx {
                case 1: Ellipse().fill(a).frame(width: w * 0.78, height: h * 0.66).position(x: w * 0.17, y: h * 0.91)
                        Capsule().fill(b).frame(width: w * 0.09, height: h * 0.58).position(x: w * 0.56, y: h * 0.59).opacity(0.7)
                case 2: Circle().fill(b).frame(width: w * 1.1, height: h).position(x: w * 0.5, y: h * 0.6).opacity(0.55).blur(radius: 8)
                        Circle().fill(a).frame(width: w * 0.48, height: h * 0.44).position(x: w * 0.5, y: h * 0.62)
                case 3: Capsule().fill(a).frame(width: w * 1.1, height: h * 0.44).rotationEffect(.degrees(-32)).position(x: w * 0.85, y: h * -0.08)
                        Circle().fill(b).frame(width: w * 0.42, height: h * 0.36).position(x: w * 0.07, y: h * 0.94).opacity(0.7)
                case 4: Ellipse().fill(a).frame(width: w * 1.2, height: h * 0.5).position(x: w * 0.5, y: h * 0.07)
                        Circle().fill(b).frame(width: w * 0.66, height: h * 0.62).position(x: w * 0.73, y: h * 0.77).opacity(0.5)
                case 5: Ellipse().fill(a).frame(width: w * 0.4, height: h * 0.72).position(x: w * 0.5, y: h * 0.56)
                        Ellipse().fill(b).frame(width: w * 0.8, height: h * 0.5).position(x: w * 0.3, y: h * 0.05).opacity(0.6)
                case 6: RoundedRectangle(cornerRadius: w * 0.15).fill(a).frame(width: w * 0.58, height: h * 0.52).position(x: w * 0.85, y: h * 0.88)
                        RoundedRectangle(cornerRadius: w * 0.08).fill(b).frame(width: w * 0.26, height: h * 0.26).position(x: w * 0.19, y: h * 0.69).opacity(0.6)
                case 7: Ellipse().fill(a).frame(width: w * 0.84, height: h * 0.7).position(x: w * 0.5, y: h * 1.03)
                        Circle().fill(b).frame(width: w * 0.4, height: h * 0.4).position(x: w * 0.9, y: h * 0.08).opacity(0.55)
                default: Capsule().fill(a).frame(width: w * 1.2, height: h * 0.46).rotationEffect(.degrees(-10)).position(x: w * 0.5, y: h * 0.53)
                        Circle().fill(b).frame(width: w * 0.36, height: h * 0.34).position(x: w * 0.88, y: h * 0.07).opacity(0.7)
                }
            }
            .blur(radius: min(w, h) * 0.13)
            .scaleEffect(on ? 1.12 : 1)
        }
        .opacity(on ? 1 : level)
        .saturation(on ? 1.25 : 0.7)
        .brightness(on ? 0.06 : -0.22)
        .animation(.easeOut(duration: 0.35), value: on)
        .allowsHitTesting(false)
    }
}

private struct GxFrame<Content: View>: View {
    let fx: Int
    let on: Bool
    var level: Double = 0.6
    @ViewBuilder var content: () -> Content
    var body: some View {
        let look = LookStore.shared.look, shape = RoundedRectangle(cornerRadius: look == .glass ? 24 : 0, style: .continuous)
        ZStack(alignment: .topLeading) {
            if look == .glass {
                shape.fill(LinearGradient(colors: [Color(hex: on ? 0x2C2C2F : 0x222224), Color(hex: on ? 0x1D1D20 : 0x141416)], startPoint: .topLeading, endPoint: .bottomTrailing))
                GxGlow(fx: fx, on: on, level: level).clipShape(shape)
            } else {
                shape.fill(on ? T.dmInk : (look == .studio ? Color(hex: 0x1C1E20) : Color.clear))
            }
            content()
        }
        .overlay(shape.strokeBorder(look == .glass ? Color.white.opacity(on ? 0.35 : 0.12) : T.dmLine, lineWidth: 1))
        .clipShape(shape)
        .aspectRatio(1 / 1.05, contentMode: .fit)
        .scaleEffect(on ? 0.965 : 1)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: on)
    }
}

private struct GxModule: View {
    @EnvironmentObject var model: EngineModel
    let fx: Int
    @State private var down = false
    var body: some View {
        let live = (model.engine.glitchActiveMask & (1 << fx)) != 0
        let on = down || live, inMask = (model.engine.glitchMask & (1 << (fx - 1))) != 0
        let ink: Color = (on && LookStore.shared.look != .glass) ? T.dmBg : Color(hex: 0xF4F3EE)
        GxFrame(fx: fx, on: on) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text(kGxBig[fx - 1]).font(BFont.sans(30, 300))
                    Text(kGxUnit[fx - 1]).font(BFont.sans(12, 300)).opacity(0.75)
                }
                Text(["stutter", "roll", "rev", "stop", "halv", "crush", "gate"][fx - 1]).font(BFont.sans(13)).opacity(on ? 0.95 : 0.7)
                Spacer(minLength: 0)
            }
            .foregroundColor(ink).padding(14)
            GxArt(fx: fx, on: on, ink: ink).padding(.horizontal, 22).padding(.bottom, 10).padding(.top, 70)
        }
        .overlay(alignment: .topTrailing) {
            Button { model.engine.glitchMask = model.engine.glitchMask ^ (1 << (fx - 1)); model.revision += 1; model.scheduleSave()
                     model.showToast(["stutter", "roll", "rev", "stop", "halv", "crush", "gate"][fx - 1] + (inMask ? " är inte med i slumpen" : " är med i slumpen")) } label: {
                GxDie(on: inMask, ink: ink).frame(width: 18, height: 18).padding(12)
            }.buttonStyle(.plain)
        }
        .contentShape(Rectangle())
        .gesture(DragGesture(minimumDistance: 0)
            .onChanged { _ in if !down { down = true; model.glitchPress(fx, true) } }
            .onEnded { _ in down = false; model.glitchPress(fx, false) })
    }
}

/// may "slump" use it: a filled die = yes, a faint outline = no
private struct GxDie: View {
    let on: Bool
    let ink: Color
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4.5).fill(on ? ink : Color.clear)
            RoundedRectangle(cornerRadius: 4.5).strokeBorder(ink.opacity(on ? 1 : 0.4), lineWidth: 1.2)
            ForEach(0..<3, id: \.self) { k in
                Circle().fill(on ? Color(hex: 0x17181A) : ink.opacity(0.4)).frame(width: 3.2, height: 3.2).offset(x: CGFloat(k - 1) * 4.2, y: CGFloat(k - 1) * 4.2)
            }
        }
    }
}

/// the line drawings and how they move
private struct GxArt: View {
    let fx: Int
    let on: Bool
    let ink: Color
    @State private var since = Date()
    var body: some View {
        LiveTimeline(interval: 1.0 / 30, paused: !on) { tl in
            let t = tl.date.timeIntervalSinceReferenceDate, age = on ? tl.date.timeIntervalSince(since) : 0
            Canvas { c, size in
                let w = size.width, h = size.height, s = min(w / 100, h / 80)
                let ox = (w - 100 * s) / 2, oy = (h - 80 * s) / 2
                func P(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: ox + x * s, y: oy + y * s) }
                let line = ink.opacity(on ? 1 : 0.6), lw: CGFloat = 0.9
                func ell(_ cx: Double, _ cy: Double, _ rx: Double, _ ry: Double, rot: Double = 0) -> Path {
                    var p = Path(ellipseIn: CGRect(x: -rx * s, y: -ry * s, width: 2 * rx * s, height: 2 * ry * s))
                    p = p.applying(CGAffineTransform(rotationAngle: rot)); return p.applying(CGAffineTransform(translationX: P(cx, cy).x, y: P(cx, cy).y))
                }
                var dot = P(50, 72)
                switch fx {
                case 1:   // a cone of rings that repeat
                    for k in 0..<9 { let rx = 42 - Double(k) * 4.6, jump = on && (Int(t * 8) + k) % 3 == 0 ? -4.0 : 0
                        c.stroke(ell(50, 12 + Double(k) * 6.4 + jump, rx * (on && jump != 0 ? 1.1 : 1), rx * 0.22), with: .color(line), lineWidth: lw) }
                    var ax = Path(); ax.move(to: P(50, 6)); ax.addLine(to: P(50, 70)); c.stroke(ax, with: .color(line), lineWidth: lw)
                case 2:   // rings diving inwards
                    for k in 0..<6 { var r = 34 - Double(k) * 6
                        if on { let ph = (t / 1.2 + Double(k) / 6).truncatingRemainder(dividingBy: 1); r = 36 * (1 - ph) + 2 }
                        c.stroke(ell(50, 40, r, r), with: .color(line.opacity(on ? min(1, r / 12) : 1)), lineWidth: lw) }
                    dot = P(50, 40)
                case 3:   // an orbit turning backwards
                    let rot = on ? -t * 5.8 : 0
                    for k in 0..<6 { c.stroke(ell(50, 40, 36, 12, rot: Double(k) * .pi / 6 + rot), with: .color(line), lineWidth: lw) }
                    dot = P(50 + 36 * cos(rot), 40 + 36 * sin(rot))
                case 4:   // waves running out of breath
                    let amp = on ? max(0.04, 1 - age * 0.75) : 1, ph = on ? min(age, 1.4) * 3 : 0
                    for k in 0..<4 { var p = Path(); var first = true
                        for xi in stride(from: 6.0, through: 94, by: 2) { let y = 22 + Double(k) * 12 + sin(xi * 0.18 + Double(k) + ph) * 7 * amp
                            if first { p.move(to: P(xi, y)); first = false } else { p.addLine(to: P(xi, y)) } }
                        c.stroke(p, with: .color(line.opacity(on ? 0.5 + 0.5 * amp : 1)), lineWidth: lw) }
                    dot = on ? P(94 - min(1, age) * 40, 40 + min(1, age * age) * 30) : P(94, 40)
                case 5:   // the onion stretching out
                    let st = on ? 1 + 0.45 * (0.5 - 0.5 * cos(t * 2)) : 1
                    for k in 0..<5 { c.stroke(ell(50, 40, (8 + Double(k) * 9) * st, (32 - Double(k) * 1.5) / sqrt(st)), with: .color(line), lineWidth: lw) }
                    dot = P(50, 48)
                case 6:   // a staircase of blocks that flickers
                    let tick = Int(t * 11)
                    for r in 0..<5 { for col in 0...r {
                        let k = r * 3 + col, off = on && (tick + k) % 3 == 0, rect = CGRect(x: P(20 + Double(col) * 12, 10 + Double(r) * 12).x + (off ? 2 * s : 0), y: P(0, 10 + Double(r) * 12).y + (off ? 2 * s : 0), width: 10 * s, height: 10 * s)
                        let p = Path(roundedRect: rect, cornerRadius: 1.5 * s)
                        if on && (tick + k) % 2 == 0 { c.fill(p, with: .color(line.opacity(0.85))) } else { c.stroke(p, with: .color(line), lineWidth: lw) } } }
                    dot = P(88, 68)
                default:  // bars that open and shut
                    let tick = Int(t * 8)
                    for k in 0..<9 { if on && (k + tick) % 2 == 0 { continue }
                        var p = Path(); p.move(to: P(14 + Double(k) * 9, 12)); p.addLine(to: P(14 + Double(k) * 9, 68)); c.stroke(p, with: .color(line), lineWidth: lw) }
                    dot = P(50, 74)
                }
                let r: CGFloat = (on ? 3.4 + 1.6 * CGFloat(0.5 + 0.5 * sin(t * 12)) : 3.4) * s
                c.fill(Path(ellipseIn: CGRect(x: dot.x - r, y: dot.y - r, width: 2 * r, height: 2 * r)), with: .color(LookStore.shared.look == .glass ? kLime : ink))
            }
        }
        .onChange(of: on) { _, v in if v { since = Date() } }
    }
}

/// the eighth module: slump — drag on it (up or right = more), double tap = off
private struct GxSlump: View {
    @EnvironmentObject var model: EngineModel
    @State private var start: Float?
    @State private var dragging = false
    var body: some View {
        let a = model.engine.glitchAmount, on = a > 0.005 || dragging
        let ink: Color = (dragging && LookStore.shared.look != .glass) ? T.dmBg : Color(hex: 0xF4F3EE)
        GxFrame(fx: 8, on: dragging, level: 0.6 + 0.4 * Double(a)) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text("\(Int((a * 100).rounded()))").font(BFont.sans(30, 300))
                    Text("%").font(BFont.sans(12, 300)).opacity(0.75)
                }
                Text("slump").font(BFont.sans(13)).opacity(on ? 0.95 : 0.7)
                Spacer(minLength: 0)
            }
            .foregroundColor(ink).padding(14)
            Canvas { c, size in
                let w = size.width, h = size.height, n = Int((a * 16).rounded())
                for k in 0..<16 {
                    let x = w * (0.08 + 0.84 * CGFloat(k) / 15), top = h * (0.85 - 0.6 * CGFloat(k) / 15)
                    var p = Path(); p.move(to: CGPoint(x: x, y: top)); p.addLine(to: CGPoint(x: x, y: h * 0.9))
                    c.stroke(p, with: .color(ink.opacity(k < n ? 1 : 0.28)), lineWidth: 1.6)
                }
                let x = w * (0.08 + 0.84 * CGFloat(max(0, n - 1)) / 15)
                var hd = Path(); hd.move(to: CGPoint(x: x, y: h * 0.08)); hd.addLine(to: CGPoint(x: x, y: h * 0.95))
                let lime = LookStore.shared.look == .glass ? kLime : ink
                c.stroke(hd, with: .color(lime), lineWidth: 1.2)
                c.fill(Path(ellipseIn: CGRect(x: x - 3.4, y: h * 0.95 - 3.4, width: 6.8, height: 6.8)), with: .color(lime))
            }
            .padding(.horizontal, 18).padding(.bottom, 10).padding(.top, 70)
        }
        .contentShape(Rectangle())
        .onTapGesture(count: 2) { model.engine.glitchAmount = 0; model.revision += 1; model.scheduleSave() }
        .gesture(DragGesture(minimumDistance: 2)
            .onChanged { d in
                if start == nil { start = a; dragging = true }
                let v = (start ?? 0) + Float(d.translation.width - d.translation.height) / 220
                model.engine.glitchAmount = min(1, max(0, (v * 100).rounded() / 100)); model.revision += 1
            }
            .onEnded { _ in start = nil; dragging = false; model.scheduleSave() })
    }
}

/// The moving ASCII art: the word BLONDA in block letters drifting through noise; each effect bends it its own way.
struct AsciiScreen: View {
    @EnvironmentObject var model: EngineModel
    private static let font: [Character: [String]] = [
        "B": ["#### ", "#   #", "#### ", "#   #", "#### "], "L": ["#    ", "#    ", "#    ", "#    ", "#####"],
        "O": [" ### ", "#   #", "#   #", "#   #", " ### "], "N": ["#   #", "##  #", "# # #", "#  ##", "#   #"],
        "D": ["#### ", "#   #", "#   #", "#   #", "#### "], "A": [" ### ", "#   #", "#####", "#   #", "#   #"],
    ]
    private static let word: [String] = {   // "BLONDA" as 5 rows of '#'
        var rows = Array(repeating: "", count: 5)
        for ch in "BLONDA" { let g = font[ch]!; for r in 0..<5 { rows[r] += g[r] + " " } }
        return rows
    }()
    private static let ramp: [Character] = Array(" .:-=+*#%@")

    var body: some View {
        GeometryReader { geo in
        LiveTimeline(interval: 1.0 / 24) { tl in
            let t = tl.date.timeIntervalSinceReferenceDate
            let fx = model.engine.glitchActive
            let cols = max(20, min(72, Int((geo.size.width - 12) / 6.35)))   // as many characters as fit
            let lines = Self.frame(t: t, fx: fx, energy: model.energy, amt: Double(model.engine.glitchAmount), cols: cols, rows: 11)
            VStack(alignment: .leading, spacing: 0) {
                ForEach(lines.indices, id: \.self) { i in
                    Text(lines[i]).font(BFont.mono(10.5, 500)).foregroundColor(fx > 0 ? T.dmY : T.dmInk.opacity(0.78)).lineLimit(1).fixedSize()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            .overlay(alignment: .topTrailing) {
                Text(fx > 0 ? kGlitchNames[fx - 1].uppercased() : "· · ·").font(BFont.mono(9, 500)).tracking(1)
                    .foregroundColor(fx > 0 ? Color(hex: 0x17181A) : T.dmInk.opacity(0.4))
                    .padding(.horizontal, 6).frame(height: 18).background(fx > 0 ? T.dmY : Color.clear).padding(6)
            }
        }
        }
        .background(LookStore.shared.look == .dots ? Color.clear : Color(hex: 0x0E0F10))
        .overlay(Rectangle().strokeBorder(T.dmLine, lineWidth: 1))
        .clipped()
    }

    /// One frame of text. Pure function of time + state, so it is cheap and deterministic.
    static func frame(t: Double, fx: Int, energy: Double, amt: Double, cols: Int, rows: Int) -> [String] {
        let w = word[0].count, top = (rows - 5) / 2
        var speed = 6.0
        if fx == 4 { speed = 1.5 } else if fx == 5 { speed = 3 }
        let scroll = Int(t * speed)
        var out: [String] = []
        let tick = Int(t * 24)
        for r in 0..<rows {
            var line = ""
            for c in 0..<cols {
                var cc = c, rr = r
                switch fx {
                case 1: cc = c % 8                                   // stutter: the first piece over and over
                case 2: cc = c % max(2, 16 >> ((tick / 3) % 4))      // roll: the piece keeps halving
                case 3: cc = cols - 1 - c                            // reverse: mirrored
                case 4: rr = r - (tick % rows) / 3                   // tape stop: sinks
                case 5: cc = c / 2                                   // half speed: stretched
                default: break
                }
                let x = ((cc + scroll) % (w + 8) + (w + 8)) % (w + 8), y = rr - top
                var ch: Character = " "
                if y >= 0 && y < 5 && x < w {
                    let row = Array(word[y]); ch = row[x] == "#" ? "#" : " "
                }
                // noise: more with energy (the kick) and the auto amount; crush turns everything to blocks
                let h = hash(c, r, tick / (fx == 6 ? 1 : 3))
                if ch == " " && h < 0.02 + 0.10 * energy + 0.08 * amt { ch = ramp[1 + Int(h * 50) % (ramp.count - 1)] }
                if fx == 6 { ch = ch == " " ? (h < 0.4 ? "░" : " ") : (h < 0.5 ? "█" : "▓") }
                if fx == 7 && (tick / 2 + r) % 2 == 0 { ch = " " }   // gate: rows blink
                line.append(ch)
            }
            out.append(line)
        }
        return out
    }
    private static func hash(_ a: Int, _ b: Int, _ c: Int) -> Double {
        var x = UInt32(truncatingIfNeeded: a &* 374761393 &+ b &* 668265263 &+ c &* 2147483647)
        x = (x ^ (x >> 13)) &* 1274126177; x ^= x >> 16
        return Double(x % 10000) / 10000
    }
}

/// Seven pads: hold to glitch. The small dot under a pad says whether "slump" may use it (tap the dot).
struct GlitchPads: View {
    @EnvironmentObject var model: EngineModel
    @State private var held = 0
    var body: some View {
        let mask = model.engine.glitchMask
        HStack(spacing: 6) {
            ForEach(1...7, id: \.self) { fx in
                VStack(spacing: 5) {
                    Text(kGlitchNames[fx - 1]).font(BFont.mono(10, 500)).lineLimit(1).minimumScaleFactor(0.7)
                        .foregroundColor(held == fx ? Color(hex: 0x17181A) : T.dmInk)
                        .frame(maxWidth: .infinity).frame(height: 40)
                        .background(Rectangle().fill(held == fx ? T.dmY : Color.white.opacity(0.06)))
                        .overlay(Rectangle().strokeBorder(T.dmLine, lineWidth: 1))
                        .contentShape(Rectangle())
                        .gesture(DragGesture(minimumDistance: 0)
                            .onChanged { _ in if held != fx { held = fx; model.glitchPress(fx, true) } }
                            .onEnded { _ in held = 0; model.glitchPress(fx, false) })
                    Button { model.engine.glitchMask = mask ^ (1 << (fx - 1)); model.revision += 1; model.scheduleSave() } label: {
                        Circle().fill(mask & (1 << (fx - 1)) != 0 ? T.dmY : Color.white.opacity(0.15)).frame(width: 7, height: 7).frame(width: 24, height: 14)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

/// "slump": how often glitches come by themselves (on the 8ths, 1–4 steps long).
struct GlitchAuto: View {
    @EnvironmentObject var model: EngineModel
    @State private var start: Float?
    var body: some View {
        let v = model.engine.glitchAmount
        HStack(spacing: 10) {
            Text("slump").font(BFont.mono(10)).foregroundColor(T.dmInk.opacity(0.6))
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Rectangle().fill(Color.white.opacity(0.08)).frame(height: 4)
                    Rectangle().fill(T.dmY).frame(width: max(2, g.size.width * CGFloat(v)), height: 4)
                    Rectangle().fill(T.dmInk).frame(width: 2, height: 16).offset(x: g.size.width * CGFloat(v) - 1)
                }
                .frame(maxHeight: .infinity)
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 0).onChanged { d in
                    model.engine.glitchAmount = Float(min(1, max(0, d.location.x / g.size.width))); model.revision += 1
                }.onEnded { _ in model.scheduleSave() })
            }
            .frame(height: 24)
            Text("\(Int((v * 100).rounded())) %").font(BFont.mono(10.5, 500)).foregroundColor(T.dmInk).frame(width: 42, alignment: .trailing)
        }
    }
}
