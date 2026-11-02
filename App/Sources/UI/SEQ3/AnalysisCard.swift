import SwiftUI

/// "Analys · mix" (web v107, takes the old plugins card's place): a big spectrum with peak hold, loudness over the last
/// 30 s against −14 / −9, the stereo picture with a correlation meter, and the numbers (loudness, peak, dynamics, correlation).
struct PluginsCard: View {   // keeps the card key "plugins" so saved layouts still find it
    @EnvironmentObject var model: EngineModel
    @State private var an = Analyzer()
    @State private var width: CGFloat = 600
    var body: some View {
        Card(style: .glass, title: [("analys · ", false), ("mix", true)]) {
            LiveTimeline(interval: 1.0 / 30) { tl in
                let _ = an.update(model.engine, t: tl.date.timeIntervalSinceReferenceDate)
                VStack(alignment: .leading, spacing: 10) {
                    head("spektrum", "20 hz – 20 khz · linje = topp")
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
                    well(170) { Canvas { c, s in an.drawSpectrum(c, s) } }
                    let u = max(80, (width - 10) / 2.4)   // 1.4 : 1 like the web
                    HStack(alignment: .top, spacing: 10) {
                        VStack(alignment: .leading, spacing: 6) { head("loudness", "senaste 30 s"); well(96) { Canvas { c, s in an.drawHistory(c, s) } } }.frame(width: u * 1.4)
                        VStack(alignment: .leading, spacing: 6) { head("stereo", "korrelation"); well(96) { Canvas { c, s in an.drawStereo(c, s) } } }.frame(width: u)
                    }
                    Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1)
                    HStack(spacing: 8) {
                        num("loudness", an.lufs > -69 ? String(format: "%.1f", an.lufs) : "–", "lufs ca")
                        num("topp", an.peakDb > -69 ? String(format: "%.1f", an.peakDb) : "–", "db")
                        num("dynamik", an.lufs > -69 ? String(format: "%.1f", an.peakDb - an.lufs) : "–", "db topp − loud")
                        num("korrelation", (an.corr >= 0 ? "+" : "") + String(format: "%.2f", an.corr), "+1 mono · 0 brett")
                    }
                }
            }
        }
    }
    private func head(_ t: String, _ s: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) { Text(t).font(BFont.mono(9.5, 500)).tracking(0.6); Text(s).font(BFont.mono(9)).opacity(0.5) }.foregroundColor(T.fg)
    }
    private func well<C: View>(_ h: CGFloat, @ViewBuilder _ c: () -> C) -> some View {
        c().frame(height: h).frame(maxWidth: .infinity)
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.black.opacity(0.28)))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.white.opacity(0.08)))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
    private func num(_ l: String, _ v: String, _ u: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(l).font(BFont.mono(8.5)).opacity(0.55)
            Text(v).font(BFont.linje(18)).lineLimit(1).minimumScaleFactor(0.7)
            Text(u).font(BFont.mono(8)).opacity(0.45).lineLimit(1)
        }
        .foregroundColor(T.fg).frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Reads the engine's scope (the last 2048 samples, L/R) and keeps the meters.
final class Analyzer {
    private let scope = DeckScope()
    private var hold = [Float](repeating: -1, count: 96)
    private(set) var hist: [Float] = []
    private(set) var lufs: Float = -70, peakDb: Float = -70, corr: Float = 1
    private var lastHist: Double = 0, pk: Float = 0
    private var l = [Float](repeating: 0, count: 2048), r = [Float](repeating: 0, count: 2048)

    func update(_ e: BLONDAEngine, t: Double) {
        scope.update(e, sampleRate: 48000, t: t)
        lufs = scope.msAvg > 1e-9 ? -0.691 + 10 * log10(scope.msAvg) : -70
        pk = max(max(scope.pkL, scope.pkR), pk * 0.985); peakDb = pk > 1e-5 ? 20 * log10(pk) : -70
        // correlation from the stereo points (mid/side): corr = (M² − S²) / (M² + S²)
        var m2: Float = 0, s2: Float = 0
        for i in 0..<scope.gonX.count { s2 += scope.gonX[i] * scope.gonX[i]; m2 += scope.gonY[i] * scope.gonY[i] }
        if m2 + s2 > 1e-9 { corr += ((m2 - s2) / (m2 + s2) - corr) * 0.1 }
        if t - lastHist > 0.1 { lastHist = t; hist.append(lufs); if hist.count > 300 { hist.removeFirst(hist.count - 300) } }
        for i in 0..<96 { let k = min(scope.spec.count - 1, i * scope.spec.count / 96); hold[i] = max(scope.spec[k], hold[i] - 0.004) }
    }

    func drawSpectrum(_ c: GraphicsContext, _ s: CGSize) {
        let cols = 96, cw = s.width / CGFloat(cols), rows = Int((s.height - 14) / 6), n = scope.spec.count
        var dim = Path(), on = Path(), hot = Path(), red = Path(), peaks = Path()
        for i in 0..<cols {
            let k = min(n - 1, i * n / cols), v = CGFloat(max(0, min(1, scope.spec[k]))), lit = Int((v * CGFloat(rows)).rounded())
            for row in 0..<rows {
                let rc = CGRect(x: CGFloat(i) * cw + cw / 2 - 1.5, y: s.height - 14 - CGFloat(row) * 6 - 1.5, width: 3, height: 3)
                if row >= lit { dim.addRect(rc) } else if CGFloat(row) > CGFloat(rows) * 0.85 { red.addRect(rc) } else if CGFloat(row) > CGFloat(rows) * 0.65 { hot.addRect(rc) } else { on.addRect(rc) }
            }
            let hy = s.height - 14 - CGFloat(max(0, min(1, hold[i]))) * CGFloat(rows) * 6
            peaks.addRect(CGRect(x: CGFloat(i) * cw + 1, y: hy - 1, width: cw - 2, height: 1.6))
        }
        c.fill(dim, with: .color(.white.opacity(0.12))); c.fill(on, with: .color(.white.opacity(0.95)))
        c.fill(hot, with: .color(Color(hex: 0xF2C318))); c.fill(red, with: .color(Color(hex: 0xFF4A33))); c.fill(peaks, with: .color(Color(hex: 0xE2F53C)))
        // the scope's bands span 40 Hz – 16 kHz on a log scale
        for (f, lab) in [(50.0, "50"), (100, "100"), (500, "500"), (1000, "1k"), (5000, "5k"), (10000, "10k")] {
            let x = CGFloat(log(f / 40) / log(16000.0 / 40)) * s.width
            c.draw(Text(lab).font(BFont.mono(8.5)).foregroundColor(.white.opacity(0.55)), at: CGPoint(x: x, y: s.height - 6))
        }
    }

    func drawHistory(_ c: GraphicsContext, _ s: CGSize) {
        var g = Path(); var y: CGFloat = 4
        while y < s.height { var x: CGFloat = 4; while x < s.width { g.addRect(CGRect(x: x - 0.6, y: y - 0.6, width: 1.2, height: 1.2)); x += 6 }; y += 6 }
        c.fill(g, with: .color(.white.opacity(0.14)))
        let Y = { (v: Float) in 4 + (s.height - 8) * CGFloat(1 - max(0, min(1, (v + 36) / 36))) }
        for v: Float in [-14, -9] {
            c.fill(Path(CGRect(x: 0, y: Y(v), width: s.width, height: 1)), with: .color(.white.opacity(0.5)))
            c.draw(Text(String(Int(v))).font(BFont.mono(8.5)).foregroundColor(.white.opacity(0.55)), at: CGPoint(x: 4, y: Y(v) - 7), anchor: .leading)
        }
        guard hist.count > 1 else { return }
        var p = Path(); let dx = s.width / 300
        for (i, v) in hist.enumerated() { let pt = CGPoint(x: s.width - CGFloat(hist.count - 1 - i) * dx, y: Y(v)); if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) } }
        c.stroke(p, with: .color(Color(hex: 0xF2C318)), lineWidth: 1.8)
    }

    func drawStereo(_ c: GraphicsContext, _ s: CGSize) {
        let m = min(s.width * 0.6, s.height) / 2 - 6, cx = m + 8, cy = s.height / 2
        c.stroke(Path(ellipseIn: CGRect(x: cx - m, y: cy - m, width: 2 * m, height: 2 * m)), with: .color(.white.opacity(0.2)), lineWidth: 1)
        var p = Path()
        for i in stride(from: 0, to: scope.gonX.count, by: 2) { p.addRect(CGRect(x: cx + CGFloat(scope.gonX[i]) * m * 1.5 - 0.8, y: cy - CGFloat(scope.gonY[i]) * m * 1.5 - 0.8, width: 1.6, height: 1.6)) }
        c.fill(p, with: .color(Color(hex: 0xF2C318)))
        let bx = cx + m + 18, bw = max(10, s.width - bx - 8)
        c.fill(Path(CGRect(x: bx, y: cy - 1, width: bw, height: 2)), with: .color(.white.opacity(0.25)))
        let px = bx + bw * CGFloat((corr + 1) / 2)
        c.fill(Path(CGRect(x: px - 2, y: cy - 8, width: 4, height: 16)), with: .color(corr < 0 ? Color(hex: 0xFF4A33) : Color(hex: 0xE2F53C)))
        for (t, x) in [("−1", bx), ("0", bx + bw / 2), ("+1", bx + bw)] { c.draw(Text(t).font(BFont.mono(8.5)).foregroundColor(.white.opacity(0.55)), at: CGPoint(x: x, y: cy + 18)) }
    }
}
