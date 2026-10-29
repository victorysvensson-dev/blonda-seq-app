import SwiftUI

/// Minimal SVG path-data parser (M L H V C S Q A Z, absolute and relative) so the web version's icons
/// can be drawn from the very same path strings.
enum SVGPath {
    static func parse(_ d: String) -> Path {
        var p = Path()
        var tokens: [String] = []
        var cur = ""
        func flush() { if !cur.isEmpty { tokens.append(cur); cur = "" } }
        var prev: Character = " "
        for ch in d {
            if ch.isLetter && ch != "e" { flush(); tokens.append(String(ch)) }
            else if ch == "," || ch == " " || ch == "\n" { flush() }
            else if ch == "-" && !(prev == "e") { flush(); cur.append(ch) }
            else if ch == "." && cur.contains(".") { flush(); cur.append(ch) }
            else { cur.append(ch) }
            prev = ch
        }
        flush()
        var i = 0, cmd: Character = "M"
        var pt = CGPoint.zero, start = CGPoint.zero, lastCtrl: CGPoint? = nil
        func num() -> CGFloat { defer { i += 1 }; return CGFloat(Double(tokens[i]) ?? 0) }
        func flag() -> Bool {   // arc flags may be packed ("010")
            let t = tokens[i]
            if t.count > 1, let f = t.first, f == "0" || f == "1" { tokens[i] = String(t.dropFirst()); return f == "1" }
            i += 1; return t == "1"
        }
        while i < tokens.count {
            if let c = tokens[i].first, tokens[i].count == 1, c.isLetter { cmd = c; i += 1; if cmd == "z" || cmd == "Z" { p.closeSubpath(); pt = start; lastCtrl = nil; continue } }
            guard i < tokens.count else { break }
            let rel = cmd.isLowercase
            func P(_ x: CGFloat, _ y: CGFloat) -> CGPoint { rel ? CGPoint(x: pt.x + x, y: pt.y + y) : CGPoint(x: x, y: y) }
            switch cmd {
            case "M", "m": pt = P(num(), num()); start = pt; p.move(to: pt); cmd = rel ? "l" : "L"; lastCtrl = nil
            case "L", "l": pt = P(num(), num()); p.addLine(to: pt); lastCtrl = nil
            case "H", "h": let x = num(); pt = CGPoint(x: rel ? pt.x + x : x, y: pt.y); p.addLine(to: pt); lastCtrl = nil
            case "V", "v": let y = num(); pt = CGPoint(x: pt.x, y: rel ? pt.y + y : y); p.addLine(to: pt); lastCtrl = nil
            case "C", "c": let c1 = P(num(), num()), c2 = P(num(), num()), e = P(num(), num()); p.addCurve(to: e, control1: c1, control2: c2); lastCtrl = c2; pt = e
            case "S", "s":
                let c1 = lastCtrl.map { CGPoint(x: 2 * pt.x - $0.x, y: 2 * pt.y - $0.y) } ?? pt
                let c2 = P(num(), num()), e = P(num(), num()); p.addCurve(to: e, control1: c1, control2: c2); lastCtrl = c2; pt = e
            case "Q", "q": let c = P(num(), num()), e = P(num(), num()); p.addQuadCurve(to: e, control: c); lastCtrl = nil; pt = e
            case "A", "a":
                let rx = num(), ry = num(), rot = num(), large = flag(), sweep = flag(), e = P(num(), num())
                addArc(&p, from: pt, to: e, rx: rx, ry: ry, rot: rot, large: large, sweep: sweep); pt = e; lastCtrl = nil
            default: i += 1
            }
        }
        return p
    }

    // endpoint → centre parameterisation (SVG spec F.6.5), drawn as cubic segments
    private static func addArc(_ p: inout Path, from a: CGPoint, to b: CGPoint, rx rx0: CGFloat, ry ry0: CGFloat, rot: CGFloat, large: Bool, sweep: Bool) {
        var rx = abs(rx0), ry = abs(ry0)
        if rx == 0 || ry == 0 { p.addLine(to: b); return }
        let phi = rot * .pi / 180, cs = cos(phi), sn = sin(phi)
        let dx = (a.x - b.x) / 2, dy = (a.y - b.y) / 2
        let x1 = cs * dx + sn * dy, y1 = -sn * dx + cs * dy
        let lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry)
        if lam > 1 { rx *= sqrt(lam); ry *= sqrt(lam) }
        let num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1
        var co = sqrt(max(0, num / den)); if large == sweep { co = -co }
        let cxp = co * rx * y1 / ry, cyp = -co * ry * x1 / rx
        let cx = cs * cxp - sn * cyp + (a.x + b.x) / 2, cy = sn * cxp + cs * cyp + (a.y + b.y) / 2
        func ang(_ ux: CGFloat, _ uy: CGFloat, _ vx: CGFloat, _ vy: CGFloat) -> CGFloat { atan2(ux * vy - uy * vx, ux * vx + uy * vy) }
        let t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry)
        var dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry)
        if !sweep && dt > 0 { dt -= 2 * .pi } else if sweep && dt < 0 { dt += 2 * .pi }
        let segs = max(1, Int(ceil(abs(dt) / (.pi / 2)))), step = dt / CGFloat(segs)
        func point(_ t: CGFloat) -> CGPoint { CGPoint(x: cx + rx * cos(t) * cs - ry * sin(t) * sn, y: cy + rx * cos(t) * sn + ry * sin(t) * cs) }
        func deriv(_ t: CGFloat) -> CGPoint { CGPoint(x: -rx * sin(t) * cs - ry * cos(t) * sn, y: -rx * sin(t) * sn + ry * cos(t) * cs) }
        let k = 4.0 / 3.0 * tan(step / 4)
        var t = t1
        for _ in 0..<segs {
            let p0 = point(t), p3 = point(t + step), d0 = deriv(t), d3 = deriv(t + step)
            p.addCurve(to: p3, control1: CGPoint(x: p0.x + k * d0.x, y: p0.y + k * d0.y), control2: CGPoint(x: p3.x - k * d3.x, y: p3.y - k * d3.y))
            t += step
        }
    }
}

/// An icon from SVG path data in a `box`-sized viewBox, stroked and/or filled, scaled to `size`.
struct SVGIcon: View {
    let d: String
    var box: CGFloat = 16
    var size: CGFloat = 14
    var stroke: CGFloat? = 1.5
    var fill = false
    var cap: CGLineCap = .butt
    var body: some View {
        Canvas { ctx, sz in
            let s = sz.width / box
            let path = SVGPath.parse(d).applying(CGAffineTransform(scaleX: s, y: s))
            if fill { ctx.fill(path, with: .foreground) }
            if let w = stroke { ctx.stroke(path, with: .foreground, style: StrokeStyle(lineWidth: w * s, lineCap: cap, lineJoin: .round)) }
        }
        .frame(width: size, height: size)
    }
}
