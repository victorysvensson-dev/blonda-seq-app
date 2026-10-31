import SwiftUI

/// BLONDA GLITCH — master glitch: hold a pad to stutter / roll / reverse / tape-stop / half-speed / crush / gate,
/// or let "slump" throw random glitches on the beat. The ASCII screen moves with the music and shows what plays.
private let kGlitchNames = ["stutter", "roll", "rev", "stop", "½ fart", "crush", "gate"]

struct GlitchCard: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let amt = model.engine.glitchAmount
        Card(style: .dark, title: [("Glitch · ", false), (amt > 0.005 ? "slump \(Int((amt * 100).rounded())) %" : "håll en pad", true)]) {
            VStack(alignment: .leading, spacing: 12) {
                AsciiScreen().frame(height: 132)
                GlitchPads()
                GlitchAuto()
            }
        }
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
        TimelineView(.animation(minimumInterval: 1.0 / 24)) { tl in
            let t = tl.date.timeIntervalSinceReferenceDate
            let fx = model.engine.glitchActive
            let lines = Self.frame(t: t, fx: fx, energy: model.energy, amt: Double(model.engine.glitchAmount), cols: 56, rows: 11)
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
        .background(Color(hex: 0x0E0F10))
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
                            .onChanged { _ in if held != fx { held = fx; model.engine.glitchHold(fx) } }
                            .onEnded { _ in held = 0; model.engine.glitchHold(0) })
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
