import SwiftUI

/// Sample editor (web: #sed) for a drum track that plays a sample: trim start / end, fades, reverse, gain and the
/// sound knobs — or chop the sample into up to 16 slices and play them on pads. Nothing changes the file itself;
/// the edit belongs to the track and is reset when the track gets another sound.
struct SampleEditor: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        ZStack {
            Rectangle().fill(Color(rgb: 6, 7, 9, 0.55)).ignoresSafeArea().onTapGesture { model.closeSampleEditor() }
            ScrollView { SedPanel(track: track).padding(16) }
                .frame(maxWidth: 1200)
                .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(Color(rgb: 24, 24, 27, 0.96))
                    .overlay(RoundedRectangle(cornerRadius: 28, style: .continuous).strokeBorder(Color.white.opacity(0.1))))
                .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                .shadow(color: .black.opacity(0.6), radius: 30, y: 16)
                .padding(14)
        }
    }
}

private let kLime = Color(hex: 0xE2F53C)
private let kFade = Color(hex: 0xFF9A3C)

private struct SedPanel: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    @State private var v0: Double = 0
    @State private var v1: Double = 1
    @State private var ready = false
    @AppStorage("sedSnap") private var snap = true
    private var sid: String { model.engine.drumSample(track) }
    private var dur: Double { max(0.001, model.engine.sampleSeconds(sid)) }
    var body: some View {
        let e = model.edit(track), cuts = model.chop(track), chopped = !cuts.isEmpty
        let tc = Color(hex: model.trackHex(track))
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Text("\(track + 1)").font(BFont.mono(11, 600)).foregroundColor(.black).frame(width: 26, height: 26).background(Circle().fill(tc))
                VStack(alignment: .leading, spacing: 2) {
                    Text(model.drumSampleMeta(track)?.name ?? "sampel").font(BFont.sans(18, 400)).foregroundColor(.white).lineLimit(1)
                    Text("\(kTracks[track].name.lowercased()) · \(ms(dur))").font(BFont.mono(10)).foregroundColor(.white.opacity(0.55))
                }
                Spacer()
                Button { model.closeSampleEditor() } label: {
                    Image(systemName: "xmark").font(.system(size: 13, weight: .semibold)).foregroundColor(.white.opacity(0.8))
                        .frame(width: 38, height: 38).background(Circle().fill(Color.white.opacity(0.08)))
                }.buttonStyle(.plain).keyboardShortcut(.cancelAction)
            }
            SedWave(track: track, sid: sid, dur: dur, v0: $v0, v1: $v1, snap: snap)
                .frame(height: 300)
            SedOverview(sid: sid, dur: dur, v0: $v0, v1: $v1, st: chopped ? Double(cuts.first ?? 0) : Double(e["st"] ?? 0), en: chopped ? 1 : Double(e["en"] ?? 1))
                .frame(height: 44)
            Group {
                if chopped {
                    Text("\(cuts.count) delar   ·   tryck i en del = lyssna · dra i en siffra = flytta snittet · dubbeltryck = nytt snitt / ta bort")
                } else {
                    Text("start \(ms(Double(e["st"] ?? 0) * dur))   slut \(ms(Double(e["en"] ?? 1) * dur))   längd \(ms(Double((e["en"] ?? 1) - (e["st"] ?? 0)) * dur))   fade in \(Int(e["fi"] ?? 0)) ms   fade ut \(Int(e["fo"] ?? 0)) ms")
                }
            }
            .font(BFont.mono(10.5)).foregroundColor(.white.opacity(0.7))
            HStack(spacing: 4) {
                ForEach([0, 3, 2, 1, 4, 5, 6], id: \.self) { i in DedKnob(def: kTrackParams[i], track: track, tint: tc) }
            }
            .padding(.vertical, 8)
            .overlay(Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1), alignment: .top)
            .overlay(Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1), alignment: .bottom)
            FlowLayout(spacing: 8) {
                SedButton(title: "▶︎ spela", style: .lime) { model.hitPad(track) }
                SedButton(title: "← slag") { hop(-1) }
                SedButton(title: "slag →") { hop(1) }
                SedButton(title: "zoom +") { zoom(0.5) }
                SedButton(title: "zoom −") { zoom(2) }
                SedButton(title: "hela") { v0 = 0; v1 = dur }
                SedButton(title: "noll", style: snap ? .on : .plain) { snap.toggle() }
                SedButton(title: "baklänges", style: (e["rev"] ?? 0) != 0 ? .on : .plain) { var x = e; x["rev"] = (e["rev"] ?? 0) != 0 ? 0 : 1; model.engine.pushUndo(); model.setEdit(track, x); model.scheduleSave(); model.hitPad(track) }
                SedButton(title: "✂ chop", style: chopped ? .lime : .plain) {
                    model.engine.pushUndo()
                    if chopped { model.setChop(track, []); model.showToast("chop av") }
                    else { let m = model.drumSampleMeta(track); let c = model.chopAuto(track, (m?.kind == "loop" || dur > 1.2) ? 16 : 0); model.setChop(track, c); v0 = 0; v1 = dur; model.showToast("chop på · \(c.count) delar") }
                }
            }
            if chopped {
                FlowLayout(spacing: 8) {
                    Text("dela upp").font(BFont.mono(10)).foregroundColor(.white.opacity(0.6))
                    SedButton(title: "efter slag") { model.engine.pushUndo(); model.setChop(track, model.chopAuto(track, 0)) }
                    ForEach([4, 8, 16], id: \.self) { n in SedButton(title: "\(n)") { model.engine.pushUndo(); model.setChop(track, model.chopAuto(track, n)) } }
                    SedButton(title: "→ mönster") {
                        let m = model.drumSampleMeta(track); model.engine.chopToPattern(track, bars: m?.kind == "loop" ? max(1, m?.bars ?? 1) : 0)
                        model.revision += 1; model.scheduleSave(); model.showToast("\(cuts.count) delar utlagda i mönstret")
                    }
                    Spacer(minLength: 0)
                    Text("\(cuts.count) / 16").font(BFont.mono(11)).foregroundColor(.white.opacity(0.7))
                }
                .padding(10)
                .background(RoundedRectangle(cornerRadius: 16).fill(kLime.opacity(0.07)).overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(kLime.opacity(0.22))))
                SedPads(track: track, count: cuts.count).frame(maxWidth: 560)
            }
            HStack(spacing: 10) {
                Text("gain").font(BFont.mono(11)).foregroundColor(.white.opacity(0.8))
                Slider(value: Binding(get: { Double(e["g"] ?? 0) }, set: { var x = e; x["g"] = Float(($0 * 2).rounded() / 2); model.setEdit(track, x) }), in: -12...12) { ed in if !ed { model.scheduleSave(); model.hitPad(track) } }
                    .tint(kLime)
                Text(String(format: "%+.1f dB", e["g"] ?? 0)).font(BFont.mono(11)).foregroundColor(.white.opacity(0.8)).frame(width: 70, alignment: .trailing)
            }
            FlowLayout(spacing: 8) {
                SedButton(title: "mute", style: model.isMuted(track) ? .on : .plain) { model.toggleMute(track) }
                SedButton(title: "återställ klipp") { model.engine.pushUndo(); model.engine.resetSampleEdit(track); model.revision += 1; model.scheduleSave(); v0 = 0; v1 = dur }
                Spacer(minLength: 0)
                SedButton(title: "klar", style: .on) { model.closeSampleEditor() }
            }
        }
        .onAppear {
            guard !ready else { return }; ready = true
            v0 = 0; v1 = dur
            if dur > 0.6 && model.chop(track).isEmpty { v1 = min(dur, max(0.35, Double(model.edit(track)["st"] ?? 0) * dur + 0.3)) }   // flams live in the start
        }
    }
    private func ms(_ x: Double) -> String { x < 1 ? "\(Int((x * 1000).rounded())) ms" : String(format: "%.2f s", x) }
    private func zoom(_ f: Double) {
        let e = model.edit(track), c = model.chop(track), centre = c.isEmpty ? Double(e["st"] ?? 0) * dur : (v0 + v1) / 2
        let span = min(dur, max(min(dur, 0.004), (v1 - v0) * f)); var a = centre - (centre - v0) * span / max(1e-6, v1 - v0)
        a = min(max(0, a), dur - span); v0 = a; v1 = a + span
    }
    /// the start to the next / previous hit (takes flams and pickups away)
    private func hop(_ dir: Int) {
        let ons = model.engine.sampleOnsets(sid).map { $0.doubleValue }; var e = model.edit(track); let cur = Double(e["st"] ?? 0) * dur
        guard let t = dir > 0 ? ons.first(where: { $0 > cur + 0.012 }) : ons.last(where: { $0 < cur - 0.012 }) else { model.showToast(dir > 0 ? "Inget fler slag hittades" : "Inget slag före"); return }
        var st = max(0, t - 0.0015); if snap { st = model.engine.sampleZeroCross(sid, at: st) }
        model.engine.pushUndo(); e["st"] = Float(st / dur); if (e["en"] ?? 1) <= e["st"]! { e["en"] = 1 }; model.setEdit(track, e); model.scheduleSave()
        let span = v1 - v0; if st < v0 || st > v1 { v0 = max(0, min(dur - span, st - span * 0.15)); v1 = v0 + span }
        model.hitPad(track)
    }
}

/// the big waveform: start / end handles and fade triangles — or the chop slices
private struct SedWave: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let sid: String
    let dur: Double
    @Binding var v0: Double
    @Binding var v1: Double
    let snap: Bool
    @State private var drag: (kind: String, k: Int, x0: CGFloat, v0: Double, v1: Double, moved: Bool)?
    @State private var lastTap: (Date, CGFloat)?
    @State private var pinch: (Double, Double)?
    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height
            LiveTimeline(interval: 1.0 / 30) { _ in
                Canvas { c, size in draw(c, size) }
            }
            .background(RoundedRectangle(cornerRadius: 10).fill(Color(hex: 0x0E0F11)))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Color.white.opacity(0.08)))
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 0).onChanged { d in changed(d, w, h) }.onEnded { d in ended(d, w) })
            .simultaneousGesture(MagnificationGesture().onChanged { m in
                if pinch == nil { pinch = (v0, v1) }
                let (a0, a1) = pinch!, c = (a0 + a1) / 2, span = min(dur, max(min(dur, 0.004), (a1 - a0) / Double(m)))
                v0 = min(max(0, c - span / 2), dur - span); v1 = v0 + span; drag = nil
            }.onEnded { _ in pinch = nil })
        }
    }
    private func x2t(_ x: CGFloat, _ w: CGFloat) -> Double { v0 + Double(x / max(1, w)) * (v1 - v0) }
    private func t2x(_ t: Double, _ w: CGFloat) -> CGFloat { CGFloat((t - v0) / max(1e-9, v1 - v0)) * w }

    private func draw(_ c: GraphicsContext, _ size: CGSize) {
        let w = size.width, h = size.height, mid = h / 2, cols = max(1, Int(w))
        var mn = [Float](repeating: 0, count: cols), mx = [Float](repeating: 0, count: cols)
        _ = model.engine.samplePeaks(sid, from: v0, to: v1, columns: cols, min: &mn, max: &mx)
        // time grid
        let span = v1 - v0, step = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5].first { span / $0 < max(3, Double(w) / 74) } ?? 5
        var t = (v0 / step).rounded(.up) * step
        while t < v1 { let x = t2x(t, w); c.fill(Path(CGRect(x: x, y: h - 8, width: 1, height: 8)), with: .color(.white.opacity(0.25)))
            c.draw(Text(t < 1 ? "\(Int((t * 1000).rounded())) ms" : String(format: "%.2f s", t)).font(BFont.mono(9)).foregroundColor(.white.opacity(0.35)), at: CGPoint(x: x + 3, y: h - 16), anchor: .leading); t += step }
        c.fill(Path(CGRect(x: 0, y: mid, width: w, height: 1)), with: .color(.white.opacity(0.2)))
        var wave = Path()
        for x in 0..<cols { wave.addRect(CGRect(x: CGFloat(x), y: mid - CGFloat(mx[x]) * mid * 0.92, width: 1, height: max(1, CGFloat(mx[x] - mn[x]) * mid * 0.92))) }
        c.fill(wave, with: .color(Color(white: 0.94).opacity(0.92)))
        let cuts = model.chop(track)
        if !cuts.isEmpty {
            let n = cuts.count, lk = (model.chopLast.0 == track && CACurrentMediaTime() - model.chopLast.2 < 0.25) ? model.chopLast.1 : -1
            if cuts[0] > 0 { c.fill(Path(CGRect(x: 0, y: 0, width: max(0, t2x(Double(cuts[0]) * dur, w)), height: h)), with: .color(Color(hex: 0x0E0F11).opacity(0.72))) }
            for k in 0..<n {
                let a = t2x(Double(cuts[k]) * dur, w), z = t2x(Double(k + 1 < n ? cuts[k + 1] : 1) * dur, w)
                if z < 0 || a > w { continue }
                if k == lk { c.fill(Path(CGRect(x: a, y: 0, width: z - a, height: h)), with: .color(kLime.opacity(0.22))) }
                else if k % 2 == 1 { c.fill(Path(CGRect(x: a, y: 0, width: z - a, height: h)), with: .color(.white.opacity(0.05))) }
                c.fill(Path(CGRect(x: a - 1, y: 0, width: 2, height: h)), with: .color(kLime))
                c.fill(Path(CGRect(x: a, y: 0, width: k + 1 >= 10 ? 22 : 16, height: 18)), with: .color(kLime))
                c.draw(Text("\(k + 1)").font(BFont.mono(10, 600)).foregroundColor(Color(hex: 0x17181A)), at: CGPoint(x: a + 4, y: 9), anchor: .leading)
            }
            return
        }
        let e = model.edit(track), st = Double(e["st"] ?? 0) * dur, en = Double(e["en"] ?? 1) * dur, xs = t2x(st, w), xe = t2x(en, w)
        let shade = Color(hex: 0x0E0F11).opacity(0.72)
        if xs > 0 { c.fill(Path(CGRect(x: 0, y: 0, width: xs, height: h)), with: .color(shade)) }
        if xe < w { c.fill(Path(CGRect(x: max(0, xe), y: 0, width: w - max(0, xe), height: h)), with: .color(shade)) }
        let fi = min(Double(e["fi"] ?? 0) / 1000, en - st), fo = min(Double(e["fo"] ?? 0) / 1000, en - st - fi), xfi = t2x(st + fi, w), xfo = t2x(en - fo, w)
        var fl = Path(); fl.move(to: CGPoint(x: xs, y: h - 2)); fl.addLine(to: CGPoint(x: xfi, y: 2)); fl.addLine(to: CGPoint(x: xfo, y: 2)); fl.addLine(to: CGPoint(x: xe, y: h - 2))
        c.stroke(fl, with: .color(kFade), lineWidth: 1.5)
        for x in [xfi, xfo] { var tri = Path(); tri.move(to: CGPoint(x: x - 9, y: 0)); tri.addLine(to: CGPoint(x: x + 9, y: 0)); tri.addLine(to: CGPoint(x: x, y: 14)); tri.closeSubpath(); c.fill(tri, with: .color(kFade)) }
        for (x, label, right) in [(xs, "start", false), (xe, "slut", true)] {
            c.fill(Path(CGRect(x: x - 1, y: 0, width: 2, height: h)), with: .color(kLime))
            let bw: CGFloat = label == "start" ? 44 : 34, bx = right ? x - bw : x
            c.fill(Path(CGRect(x: bx, y: h - 44, width: bw, height: 18)), with: .color(kLime))
            c.draw(Text(label).font(BFont.mono(10)).foregroundColor(Color(hex: 0x17181A)), at: CGPoint(x: bx + 6, y: h - 35), anchor: .leading)
        }
    }

    private func changed(_ d: DragGesture.Value, _ w: CGFloat, _ h: CGFloat) {
        guard pinch == nil else { return }
        let x = d.location.x, cuts = model.chop(track)
        if drag == nil {
            var kind = "pan", k = -1
            if !cuts.isEmpty {
                var bd: CGFloat = 18; for (i, f) in cuts.enumerated() { let dd = abs(t2x(Double(f) * dur, w) - d.startLocation.x); if dd < bd { bd = dd; k = i } }
                if k >= 0 { kind = "cut" }
            } else {
                let e = model.edit(track), st = Double(e["st"] ?? 0) * dur, en = Double(e["en"] ?? 1) * dur
                let xs = t2x(st, w), xe = t2x(en, w), xfi = t2x(st + Double(e["fi"] ?? 0) / 1000, w), xfo = t2x(en - Double(e["fo"] ?? 0) / 1000, w), sx = d.startLocation.x, sy = d.startLocation.y
                if sy < 34 && abs(sx - xfi) < 20 { kind = "fi" } else if sy < 34 && abs(sx - xfo) < 20 { kind = "fo" } else if abs(sx - xs) < 18 { kind = "st" } else if abs(sx - xe) < 18 { kind = "en" }
            }
            drag = (kind, k, d.startLocation.x, v0, v1, false)
            if kind != "pan" { model.engine.pushUndo() }
        }
        guard var g = drag else { return }
        if abs(x - g.x0) > 4 { g.moved = true; drag = g }
        guard g.moved else { return }
        let t = x2t(x, w)
        switch g.kind {
        case "cut":
            var c = cuts; guard g.k < c.count else { return }
            let lo = g.k > 0 ? Double(c[g.k - 1]) * dur + 0.004 : 0, hi = g.k + 1 < c.count ? Double(c[g.k + 1]) * dur - 0.004 : dur - 0.004
            var tt = min(max(t, lo), hi); if snap { tt = min(max(model.engine.sampleZeroCross(sid, at: tt), lo), hi) }
            c[g.k] = Float(tt / dur); model.engine.setChopCuts(c.map { NSNumber(value: $0) }, track: track); model.revision += 1
        case "st", "en", "fi", "fo":
            var e = model.edit(track); let st = Double(e["st"] ?? 0) * dur, en = Double(e["en"] ?? 1) * dur
            switch g.kind {
            case "st": var tt = min(max(0, t), en - 0.002); if snap { tt = model.engine.sampleZeroCross(sid, at: tt) }; e["st"] = Float(tt / dur)
            case "en": var tt = min(max(st + 0.002, t), dur); if snap { tt = model.engine.sampleZeroCross(sid, at: tt) }; e["en"] = Float(tt / dur)
            case "fi": e["fi"] = Float(min(max(0, (t - st) * 1000), (en - st) * 900).rounded())
            default: e["fo"] = Float(min(max(0, (en - t) * 1000), (en - st) * 900).rounded())
            }
            model.setEdit(track, e)
        default:
            let span = g.v1 - g.v0, a = min(max(0, g.v0 + Double((g.x0 - x) / w) * span), dur - span); v0 = a; v1 = a + span
        }
    }
    private func ended(_ d: DragGesture.Value, _ w: CGFloat) {
        let g = drag; drag = nil
        guard let g = g else { return }
        if g.moved { if g.kind != "pan" { model.scheduleSave(); if g.kind == "cut" { model.chopHit(track, g.k) } }; return }
        let cuts = model.chop(track), now = Date(), x = d.location.x
        if !cuts.isEmpty {
            if let lt = lastTap, now.timeIntervalSince(lt.0) < 0.32, abs(lt.1 - x) < 24 {   // double tap: add or remove a cut
                lastTap = nil; model.engine.pushUndo(); var c = cuts
                if g.k >= 0 { if c.count > 1 { c.remove(at: g.k); model.showToast("snitt borttaget") } }
                else if c.count < 16 { var t = x2t(x, w); if snap { t = model.engine.sampleZeroCross(sid, at: t) }; c.append(Float(min(0.999, max(0, t / dur)))); c.sort(); model.showToast("nytt snitt") }
                else { model.showToast("Max 16 delar") }
                model.setChop(track, c); return
            }
            lastTap = (now, x)
            let f = Float(x2t(x, w) / dur); var k = g.k
            if k < 0 { for (i, c) in cuts.enumerated() where c <= f { k = i } }
            if k >= 0 { model.chopHit(track, k) }
            return
        }
        if g.kind == "pan" { model.hitPad(track) }
    }
}

/// the whole sample, small: the view window, start / end
private struct SedOverview: View {
    @EnvironmentObject var model: EngineModel
    let sid: String
    let dur: Double
    @Binding var v0: Double
    @Binding var v1: Double
    let st: Double
    let en: Double
    var body: some View {
        GeometryReader { g in
            Canvas { c, size in
                let w = size.width, h = size.height, cols = max(1, Int(w)); var mn = [Float](repeating: 0, count: cols), mx = [Float](repeating: 0, count: cols)
                _ = model.engine.samplePeaks(sid, from: 0, to: dur, columns: cols, min: &mn, max: &mx)
                var p = Path(); for x in 0..<cols { p.addRect(CGRect(x: CGFloat(x), y: h / 2 - CGFloat(mx[x]) * h / 2, width: 1, height: max(1, CGFloat(mx[x] - mn[x]) * h / 2))) }
                c.fill(p, with: .color(.white.opacity(0.35)))
                c.fill(Path(CGRect(x: CGFloat(v0 / dur) * w, y: 0, width: CGFloat((v1 - v0) / dur) * w, height: h)), with: .color(.white.opacity(0.12)))
                c.fill(Path(CGRect(x: CGFloat(st) * w, y: 0, width: 2, height: h)), with: .color(kLime))
                c.fill(Path(CGRect(x: CGFloat(en) * w - 2, y: 0, width: 2, height: h)), with: .color(kLime))
            }
            .background(RoundedRectangle(cornerRadius: 10).fill(Color(hex: 0x0E0F11)))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 0).onChanged { d in
                let span = v1 - v0, c = min(max(0, Double(d.location.x / max(1, g.size.width))), 1) * dur, a = min(max(0, c - span / 2), dur - span); v0 = a; v1 = a + span
            })
        }
    }
}

/// 16 pads in MPC order (1 bottom left) that play the slices
private struct SedPads: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let count: Int
    var body: some View {
        VStack(spacing: 8) {
            ForEach(0..<4, id: \.self) { r in
                HStack(spacing: 8) {
                    ForEach(0..<4, id: \.self) { c in
                        let k = (3 - r) * 4 + c
                        SedPad(track: track, k: k, active: k < count)
                    }
                }
            }
        }
    }
}
private struct SedPad: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let k: Int
    let active: Bool
    @State private var down = false
    var body: some View {
        LiveTimeline(interval: 1.0 / 30, paused: !active) { _ in
            let lit = down || (model.chopLast.0 == track && model.chopLast.1 == k && CACurrentMediaTime() - model.chopLast.2 < 0.12)
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 14).fill(lit ? kLime : Color(hex: 0x222225))
                RoundedRectangle(cornerRadius: 14).strokeBorder(Color.white.opacity(0.12))
                Text("\(k + 1)").font(BFont.sans(17, 300)).foregroundColor(lit ? Color(hex: 0x17181A) : .white).padding(10)
            }
            .aspectRatio(1.5, contentMode: .fit)
            .scaleEffect(lit ? 0.96 : 1)
            .opacity(active ? 1 : 0.25)
        }
        .contentShape(Rectangle())
        .gesture(DragGesture(minimumDistance: 0)
            .onChanged { _ in if !down && active { down = true; model.chopHit(track, k) } }
            .onEnded { _ in down = false })
        .allowsHitTesting(active)
    }
}

private struct SedButton: View {
    enum Style { case plain, on, lime }
    let title: String
    var style: Style = .plain
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(BFont.mono(11)).tracking(0.3)
                .foregroundColor(style == .plain ? .white.opacity(0.9) : Color(hex: 0x17181A))
                .padding(.horizontal, 14).frame(height: 40)
                .background(RoundedRectangle(cornerRadius: 12).fill(style == .lime ? kLime : (style == .on ? Color(hex: 0xF2F1EC) : Color.white.opacity(0.08))))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.white.opacity(style == .plain ? 0.1 : 0)))
        }.buttonStyle(.plain)
    }
}

