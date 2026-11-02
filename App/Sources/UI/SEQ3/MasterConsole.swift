import SwiftUI

/// The master card, redesigned (web v106 .mx2): loudness on top, three bus lanes (trummor / synth / loopar) with fader,
/// m/s, filter–drive–glue and a pump on synth and loopar, a mastering chain (eq → glue → bredd → loud) and colour & room.
private let kBg = Color(hex: 0x131416), kPanel = Color(hex: 0x16171A), kWell = Color(hex: 0x0B0C0D)
private let kTxt = Color(hex: 0xECEAE3), kMute = Color(hex: 0xECEAE3).opacity(0.5), kLine = Color(hex: 0xECEAE3).opacity(0.12)
private let kYel = Color(hex: 0xF2C318), kLime = Color(hex: 0xE2F53C)
private let kBuses: [(name: String, sub: String, hex: UInt32)] = [("trummor", "spår 1–6", 0xF2F2EE), ("synth", "spår 7–10", 0xF07AB0), ("loopar", "loopar", 0x6BE28C)]
private func busDef(_ f: Int) -> ParamDef { [ParamDef(group: 3, field: 0, label: "nivå", lo: 0, hi: 1.5), ParamDef(group: 3, field: 1, label: "filter", lo: -1, hi: 1),
                                            ParamDef(group: 3, field: 2, label: "drive", lo: 0, hi: 1), ParamDef(group: 3, field: 3, label: "glue", lo: 0, hi: 1)][f] }
private func mDef(_ f: Int, _ label: String, _ lo: Float, _ hi: Float) -> ParamDef { ParamDef(group: 2, field: f, label: label, lo: lo, hi: hi) }
private func dbText(_ v: Float) -> String { v < 0.001 ? "−∞" : (v >= 1 ? "+" : "") + String(format: "%.1f", 20 * log10(v)) }

struct MasterCard: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var fold = FoldStore.shared
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                (Text("master · ").foregroundColor(kMute) + Text("mix · mastering").foregroundColor(kTxt).font(BFont.mono(9.5, 500)))
                    .font(BFont.mono(9.5)).tracking(0.855)
                Spacer()
                HStack(spacing: 5) { LiteCap(.min, dark: true, fold: "master"); LiteCap(.full, dark: true, fold: "master") }
                LiteCap(.grab, dark: true).padding(.leading, 8)
            }
            .frame(height: 26)
            if !fold.isFolded("master") { MasterConsole() }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: LookStore.shared.look == .studio ? 0 : T.cardR, style: .continuous).fill(LookStore.shared.look == .studio ? Color(hex: 0x1C1E20) : kBg)
            .overlay(RoundedRectangle(cornerRadius: LookStore.shared.look == .studio ? 0 : T.cardR, style: .continuous).strokeBorder(kLine)))
        .shadow(color: .black.opacity(LookStore.shared.look == .glass ? 0.45 : 0), radius: 22, y: 13)
    }
}

private struct MasterConsole: View {
    @EnvironmentObject var model: EngineModel
    @State private var scope = DeckScope()
    @State private var width: CGFloat = 800
    var body: some View {
        LiveTimeline(interval: 1.0 / 30) { tl in
            let _ = scope.update(model.engine, sampleRate: 48000, t: tl.date.timeIntervalSinceReferenceDate)
            let narrow = width < 760
            VStack(alignment: .leading, spacing: 12) {
                TopMeters(scope: scope)
                Section(title: "bussar", sub: "allt går genom en buss · m tystar · s solar (flera går)")
                if narrow { VStack(spacing: 10) { ForEach(0..<3, id: \.self) { BusLane(b: $0) } } }
                else { HStack(alignment: .top, spacing: 10) { ForEach(0..<3, id: \.self) { BusLane(b: $0) } } }
                Section(title: "mastering", sub: "eq → glue → bredd → loud → limiter")
                let tiles = [AnyView(EqTile()), AnyView(GlueTile()), AnyView(WidthTile(scope: scope)), AnyView(LoudTile(scope: scope))]
                if narrow { LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) { ForEach(0..<4, id: \.self) { tiles[$0] } } }
                else { HStack(alignment: .top, spacing: 14) { tiles[0].frame(maxWidth: .infinity).layoutPriority(1.5); ForEach(1..<4, id: \.self) { tiles[$0].frame(maxWidth: .infinity) } } }
                Section(title: "effekter", sub: "eko · rymd · tejp · crush · pennan byter vad siffran styr")
                PluginTiles(cols: narrow ? 2 : 4)
                Section(title: "färg & rum", sub: "tejp, eko, rymd, groove och volym")
                ColorRoom()
            }
        }
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
        .foregroundColor(kTxt)
    }
}

private struct Section: View {
    let title: String, sub: String
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text(title).font(BFont.mono(9.5, 500)).tracking(1).foregroundColor(kTxt)
            Text(sub).font(BFont.mono(9)).foregroundColor(kMute).lineLimit(1)
        }
        .padding(.top, 4)
    }
}

private struct Panel<C: View>: View {
    var tint: Color? = nil
    @ViewBuilder let content: C
    var body: some View {
        let sq = LookStore.shared.look == .studio
        content
            .background(RoundedRectangle(cornerRadius: sq ? 4 : 18, style: .continuous).fill(tint.map { LinearGradient(colors: [$0.opacity(0.09), .clear], startPoint: .top, endPoint: .center) } ?? LinearGradient(colors: [.clear], startPoint: .top, endPoint: .bottom)))
            .background(RoundedRectangle(cornerRadius: sq ? 4 : 18, style: .continuous).fill(kPanel))
            .overlay(RoundedRectangle(cornerRadius: sq ? 4 : 18, style: .continuous).strokeBorder(kLine))
    }
}

/// a dot grid like the web's scope wells
private func dotGround(_ c: GraphicsContext, _ s: CGSize) {
    var p = Path(); var y: CGFloat = 4
    while y < s.height { var x: CGFloat = 4; while x < s.width { p.addRect(CGRect(x: x - 0.6, y: y - 0.6, width: 1.2, height: 1.2)); x += 6 }; y += 6 }
    c.fill(p, with: .color(kTxt.opacity(0.16)))
}

private struct Well<C: View>: View {
    var height: CGFloat = 58
    @ViewBuilder let content: C
    var body: some View {
        content.frame(height: height).frame(maxWidth: .infinity)
            .background(RoundedRectangle(cornerRadius: LookStore.shared.look == .studio ? 3 : 10, style: .continuous).fill(kWell))
            .overlay(RoundedRectangle(cornerRadius: LookStore.shared.look == .studio ? 3 : 10, style: .continuous).strokeBorder(kLine))
    }
}

// MARK: top: loudness, L/R peaks, readouts
private struct TopMeters: View {
    @EnvironmentObject var model: EngineModel
    let scope: DeckScope
    var body: some View {
        let lufs = scope.msAvg > 1e-9 ? -0.691 + 10 * log10(scope.msAvg) : -99
        HStack(spacing: 18) {
            HStack(alignment: .bottom, spacing: 10) {
                Text("loudness").font(BFont.mono(8.5, 500)).foregroundColor(kMute).fixedSize().rotationEffect(.degrees(-90)).frame(width: 12, height: 52)
                DotMatrixText(text: lufs > -90 ? String(format: "%.1f", lufs) : "--", height: 34, color: kYel, offOpacity: 0.08).frame(minWidth: 120, alignment: .leading)
                Text("lufs\nkort").font(BFont.mono(8.5, 500)).foregroundColor(kMute)
            }
            VStack(alignment: .leading, spacing: 6) {
                Canvas { c, s in
                    let n = Int((s.width - 4) / 7)
                    for (row, v) in [scope.pkL, scope.pkR].enumerated() {
                        let db = 20 * log10(max(v, 1e-6)), lit = Int((max(0, min(1, (db + 48) / 48)) * Float(n)).rounded())
                        for j in 0..<n {
                            let on = j < lit, x = 4 + CGFloat(j) * 7, y = row == 0 ? s.height * 0.28 : s.height * 0.72
                            let col: Color = !on ? kTxt.opacity(0.16) : (j >= n - 3 ? Color(hex: 0xFF4A33) : (j >= n - 8 ? kYel : kTxt))
                            c.fill(Path(ellipseIn: CGRect(x: x, y: y - 2.4, width: 4.8, height: 4.8)), with: .color(col))
                        }
                    }
                }
                .frame(height: 26)
                HStack(spacing: 16) {
                    readout("topp", scope.peakDb > -89 ? String(format: "%.1f", scope.peakDb) : "–", "db")
                    readout("komp", String(format: "%.1f", model.engine.masterGR), "db")
                    readout("tak", "−1.5", "db")
                }
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: LookStore.shared.look == .studio ? 4 : 20, style: .continuous).fill(kWell).overlay(RoundedRectangle(cornerRadius: LookStore.shared.look == .studio ? 4 : 20, style: .continuous).strokeBorder(kLine)))
    }
    private func readout(_ l: String, _ v: String, _ u: String) -> some View {
        (Text(l + " ").foregroundColor(kMute) + Text(v).foregroundColor(kTxt).fontWeight(.medium) + Text(" " + u).foregroundColor(kMute)).font(BFont.mono(9.5))
    }
}

// MARK: a small knob (drag up/down, double tap = default)
private struct MKnob: View {
    let value: Float, lo: Float, hi: Float, def: Float
    let label: String, text: String
    var tint: Color = kYel
    let set: (Float) -> Void
    @State private var start: Float?
    var body: some View {
        let f = CGFloat((value - lo) / (hi - lo)) * 0.75, bip = lo < 0
        let a: CGFloat = bip ? min(0.375, f) : 0, b: CGFloat = bip ? max(0.375, f) : f
        VStack(spacing: 3) {
            ZStack {
                Circle().fill(kTxt.opacity(0.05))
                Circle().trim(from: 0, to: 0.75).stroke(kTxt.opacity(0.16), style: StrokeStyle(lineWidth: 2.4, lineCap: .round)).rotationEffect(.degrees(135)).padding(2)
                Circle().trim(from: a, to: max(a + 0.001, b)).stroke(tint, style: StrokeStyle(lineWidth: 2.4, lineCap: .round)).rotationEffect(.degrees(135)).padding(2)
                Text(text).font(BFont.mono(9.5, 500)).foregroundColor(kTxt).lineLimit(1).minimumScaleFactor(0.6).padding(.horizontal, 5)
            }
            .frame(width: 42, height: 42)
            .contentShape(Circle())
            .gesture(DragGesture(minimumDistance: 1)
                .onChanged { g in let s0 = start ?? value; if start == nil { start = value }; set(max(lo, min(hi, s0 - Float(g.translation.height) / 160 * (hi - lo)))) }
                .onEnded { _ in start = nil })
            .onTapGesture(count: 2) { set(def) }
            Text(label).font(BFont.mono(8.5)).foregroundColor(kMute).lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: bus lanes
private struct BusLane: View {
    @EnvironmentObject var model: EngineModel
    let b: Int
    var body: some View {
        let info = kBuses[b], col = Color(hex: info.hex), mute = model.busFlag(b, 0), solo = model.busFlag(b, 1)
        let anySolo = (0..<3).contains { model.busFlag($0, 1) }, on = anySolo ? solo : !mute
        Panel(tint: col) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 7) {
                    Circle().fill(col).frame(width: 9, height: 9).shadow(color: col, radius: 5)
                    Text(info.name).font(BFont.mono(10.5, 500))
                    Text(info.sub).font(BFont.mono(8.5)).foregroundColor(kMute).lineLimit(1)
                    Spacer(minLength: 4)
                    flag("m", mute, Color(hex: 0xFF4A33)) { model.setBusFlag(b, 0, !mute) }
                    flag("s", solo, kYel) { model.setBusFlag(b, 1, !solo) }
                }
                HStack(alignment: .center, spacing: 8) {
                    BusFader(b: b, col: col)
                    ForEach(1..<4, id: \.self) { f in
                        let d = busDef(f), v = model.param(d, b)
                        MKnob(value: v, lo: d.lo, hi: d.hi, def: 0, label: d.label, text: f == 1 ? (abs(v) < 0.03 ? "av" : (v < 0 ? "lp" : "hp")) : String(Int((v * 100).rounded())), tint: col) { model.setParam(d, b, $0) }
                    }
                }
                Rectangle().fill(kLine).frame(height: 1)
                if b == 0 { DrumHits() } else { PumpBlock(b: b, col: col) }
            }
            .padding(12)
        }
        .overlay(alignment: .top) { Capsule().fill(col.opacity(0.85)).frame(height: 2).padding(.horizontal, 16) }
        .opacity(on ? 1 : 0.42).saturation(on ? 1 : 0.3)
        .animation(.easeOut(duration: 0.2), value: on)
    }
    private func flag(_ t: String, _ on: Bool, _ c: Color, _ act: @escaping () -> Void) -> some View {
        Button(action: act) {
            Text(t).font(BFont.mono(10, 600)).foregroundColor(on ? Color(hex: 0x111111) : kTxt)
                .frame(width: 26, height: 24).background(RoundedRectangle(cornerRadius: 8).fill(on ? c : kTxt.opacity(0.08)))
        }.buttonStyle(.plain)
    }
}

private struct BusFader: View {
    @EnvironmentObject var model: EngineModel
    let b: Int, col: Color
    @State private var lastTap = Date.distantPast
    var body: some View {
        let d = busDef(0), lv = model.param(d, b), u = CGFloat(sqrt(lv / 1.5))
        let pk = model.engine.busPeak(b), lit = Int((max(0, min(1, (20 * log10(max(pk, 1e-6)) + 48) / 48)) * 14).rounded())
        VStack(spacing: 6) {
            GeometryReader { g in
                let h = g.size.height
                ZStack(alignment: .bottom) {
                    RoundedRectangle(cornerRadius: 12, style: .continuous).fill(kWell).overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(kLine))
                    VStack(spacing: 0) {
                        ForEach(0..<14, id: \.self) { i in
                            let on = 13 - i < lit
                            Circle().fill(on ? (i < 2 ? Color(hex: 0xFF4A33) : col) : kTxt.opacity(0.14)).frame(width: 5, height: 5).frame(maxHeight: .infinity)
                        }
                    }
                    .padding(.vertical, 8)
                    RoundedRectangle(cornerRadius: 5).fill(LinearGradient(colors: [Color(hex: 0xF4F3EE), Color(hex: 0xD9D8D1)], startPoint: .top, endPoint: .bottom))
                        .overlay(Rectangle().fill(kBg).frame(height: 2).padding(.horizontal, 6))
                        .frame(width: 40, height: 14).shadow(color: .black.opacity(0.55), radius: 4, y: 3)
                        .offset(y: -(u * (h - 14)))
                }
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 0).onChanged { v in
                    let uu = 1 - max(0, min(1, (v.location.y - 7) / max(1, h - 14)))
                    model.setParam(d, b, Float(uu * uu) * 1.5)
                })
                .onTapGesture(count: 2) { model.setParam(d, b, 1) }
            }
            .frame(width: 32, height: 104)
            Text(dbText(lv)).font(BFont.mono(9.5, 500)).monospacedDigit()
        }
        .frame(width: 44)
    }
}

/// the drum lane: the last hit of each drum as a column of dots (web .m2-hc)
private struct DrumHits: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Well(height: 110) {
                Canvas { c, s in
                    let names = ["kick", "snare", "clap", "hat", "open", "perc"], cw = s.width / 6, rows = Int((s.height - 16) / 6), now = CACurrentMediaTime()
                    for i in 0..<6 {
                        let lv = max(0, 1 - (now - model.hitTime[i]) * 3.2) * model.hitVel[i], lit = Int((lv * Double(rows)).rounded())
                        for r in 0..<rows {
                            let on = r < lit
                            c.fill(Path(ellipseIn: CGRect(x: CGFloat(i) * cw + cw / 2 - 2.2, y: s.height - 14 - CGFloat(r) * 6 - 2.2, width: 4.4, height: 4.4)),
                                   with: .color(on ? Color(hex: model.trackHex(i)) : kTxt.opacity(0.14)))
                        }
                        c.draw(Text(names[i]).font(BFont.mono(8)).foregroundColor(kMute), at: CGPoint(x: CGFloat(i) * cw + cw / 2, y: s.height - 5))
                    }
                }
            }
            (Text("kicken styr pumpen när synth eller loopar står på ").foregroundColor(kMute) + Text("följ kick").foregroundColor(kTxt)).font(BFont.mono(9))
        }
    }
}

private struct PumpBlock: View {
    @EnvironmentObject var model: EngineModel
    let b: Int, col: Color
    var body: some View {
        let p = model.pump(b), amtDef = mDef(4, "pump", 0, 1)
        let amt = b == 1 ? model.param(amtDef, 0) : p.amt, rel = model.engine.pumpRelease(b)
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("pump").font(BFont.mono(9.5, 500)).tracking(0.6)
                Spacer()
                HStack(spacing: 0) {
                    seg("följ kick", p.src == 0) { var q = p; q.src = 0; model.setPump(b, q) }
                    seg("takt", p.src == 1) { var q = p; q.src = 1; model.setPump(b, q) }
                }
                .padding(2).background(RoundedRectangle(cornerRadius: 9).fill(kTxt.opacity(0.07)))
            }
            Well(height: 52) {
                Canvas { c, s in
                    dotGround(c, s)
                    let per = p.src == 1 ? 60 / Double(model.bpm) * Double(p.rate) / 4 : 60 / Double(model.bpm), span = max(per, Double(rel) + 0.03)
                    let X = { (t: Double) in 4 + (s.width - 8) * CGFloat(t / span) }, Y = { (g: Float) in 4 + (s.height - 8) * CGFloat(1 - g) }
                    var path = Path(); path.move(to: CGPoint(x: X(0), y: Y(1))); path.addLine(to: CGPoint(x: X(0.004), y: Y(model.engine.pumpCurve(b, at: 0))))
                    for j in 0...60 { let u = Float(j) / 60; path.addLine(to: CGPoint(x: X(0.005 + Double(rel) * Double(u)), y: Y(model.engine.pumpCurve(b, at: u)))) }
                    path.addLine(to: CGPoint(x: X(span), y: Y(1)))
                    c.stroke(path, with: .color(col), lineWidth: 2)
                    // a dot riding the curve: since the last kick, or the last beat of the chosen rate
                    guard model.playing, amt > 0 else { return }
                    let now = CACurrentMediaTime()
                    let since: Double = p.src == 0 ? now - model.hitTime[0] : Double(max(0, model.step) % max(1, p.rate)) * model.stepDur + (now - model.stepTime)
                    if since >= 0 && since < span {
                        let u = Float(max(0, min(1, (since - 0.005) / Double(rel))))
                        c.fill(Path(ellipseIn: CGRect(x: X(since) - 3.5, y: Y(since < 0.005 ? 1 : model.engine.pumpCurve(b, at: u)) - 3.5, width: 7, height: 7)), with: .color(kLime))
                    }
                }
            }
            HStack(spacing: 3) {
                ForEach([(8, "1/2"), (4, "1/4"), (2, "1/8"), (1, "1/16")], id: \.0) { r, l in
                    let on = p.src == 1 && p.rate == r
                    Button { var q = p; q.rate = r; q.src = 1; model.setPump(b, q) } label: {
                        Text(l).font(BFont.mono(9, 500)).foregroundColor(on ? Color(hex: 0x111111) : kMute)
                            .frame(maxWidth: .infinity).frame(height: 22).background(RoundedRectangle(cornerRadius: 7).fill(on ? col : kTxt.opacity(0.06)))
                    }.buttonStyle(.plain)
                }
            }
            .opacity(p.src == 1 ? 1 : 0.45)
            HStack(spacing: 4) {
                MKnob(value: amt, lo: 0, hi: 1, def: b == 1 ? 0.4 : 0, label: "mängd", text: String(Int((amt * 100).rounded())), tint: col) { v in
                    if b == 1 { model.setParam(amtDef, 0, v) } else { var q = p; q.amt = v; model.setPump(b, q) } }
                MKnob(value: p.shape < 0 ? 0.5 : p.shape, lo: 0, hi: 1, def: 0.5, label: "kurva",
                      text: p.shape < 0 ? "klass" : (p.shape < 0.4 ? "snabb" : (p.shape > 0.6 ? "sug" : "rak")), tint: col) { v in var q = p; q.shape = v; model.setPump(b, q) }
                MKnob(value: rel, lo: 0.03, hi: 0.8, def: 0.2, label: "release", text: p.rel < 0 ? "auto" : String(Int((rel * 1000).rounded())), tint: col) { v in var q = p; q.rel = v; model.setPump(b, q) }
            }
        }
    }
    private func seg(_ t: String, _ on: Bool, _ act: @escaping () -> Void) -> some View {
        Button(action: act) {
            Text(t).font(BFont.mono(9, 500)).foregroundColor(on ? Color(hex: 0x111111) : kMute)
                .padding(.horizontal, 9).frame(height: 22).background(RoundedRectangle(cornerRadius: 7).fill(on ? kTxt : .clear))
        }.buttonStyle(.plain)
    }
}

// MARK: mastering chain
private struct Tile<V: View, K: View>: View {
    let title: String, sub: String
    @ViewBuilder let vis: V
    @ViewBuilder let knobs: K
    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(title).font(BFont.mono(10, 500))
                    Text(sub).font(BFont.mono(8.5)).foregroundColor(kMute).lineLimit(1)
                }
                Well { vis }
                HStack(spacing: 2) { knobs }
            }
            .padding(10)
        }
    }
}

private func mKnob(_ model: EngineModel, _ f: Int, _ label: String, _ lo: Float, _ hi: Float, _ def: Float, _ text: (Float) -> String) -> MKnob {
    let d = mDef(f, label, lo, hi), v = model.param(d, 0)
    return MKnob(value: v, lo: lo, hi: hi, def: def, label: label, text: text(v)) { model.setParam(d, 0, $0) }
}
private func sdb(_ v: Float) -> String { (v > 0 ? "+" : "") + String(format: "%.1f", v) }

/// Web Audio lowshelf / highshelf / peaking response at frequency f (48 kHz), dB
private func eqResp(_ f: Double, _ f0: Double, _ g: Double, _ type: Int) -> Double {
    let A = pow(10, g / 40), w0 = 2 * .pi * f0 / 48000, w = 2 * .pi * f / 48000, cs = cos(w0), sn = sin(w0)
    var b0 = 0.0, b1 = 0.0, b2 = 0.0, a0 = 1.0, a1 = 0.0, a2 = 0.0
    if type == 2 { let al = sn / (2 * 0.8); b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A }
    else { let al = sn / 2 * 2.0.squareRoot(), k = 2 * A.squareRoot() * al
        if type == 0 { b0 = A * ((A + 1) - (A - 1) * cs + k); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - k); a0 = (A + 1) + (A - 1) * cs + k; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - k }
        else { b0 = A * ((A + 1) + (A - 1) * cs + k); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - k); a0 = (A + 1) - (A - 1) * cs + k; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - k } }
    let nr = b0 + b1 * cos(w) + b2 * cos(2 * w), ni = -(b1 * sin(w) + b2 * sin(2 * w)), dr = a0 + a1 * cos(w) + a2 * cos(2 * w), di = -(a1 * sin(w) + a2 * sin(2 * w))
    return 20 * log10(hypot(nr, ni) / hypot(dr, di))
}

private struct EqTile: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let lo = Double(model.param(mDef(7, "låg", -12, 12), 0)), mid = Double(model.param(mDef(8, "mitt", -12, 12), 0)), hi = Double(model.param(mDef(9, "hög", -12, 12), 0))
        Tile(title: "eq", sub: "110 hz · 1.5 khz · 8 khz") {
            Canvas { c, s in
                dotGround(c, s)
                c.fill(Path(CGRect(x: 0, y: s.height / 2, width: s.width, height: 1)), with: .color(kTxt.opacity(0.25)))
                var p = Path()
                for xi in stride(from: 0, through: Int(s.width), by: 2) {
                    let f = 20 * pow(1000, Double(xi) / Double(s.width)), db = eqResp(f, 110, lo, 0) + eqResp(f, 1500, mid, 2) + eqResp(f, 8000, hi, 1)
                    let y = s.height / 2 - CGFloat(db / 14) * (s.height / 2 - 4)
                    if xi == 0 { p.move(to: CGPoint(x: 0, y: y)) } else { p.addLine(to: CGPoint(x: CGFloat(xi), y: y)) }
                }
                c.stroke(p, with: .color(kYel), lineWidth: 2)
            }
        } knobs: {
            mKnob(model, 7, "låg", -12, 12, 0, sdb); mKnob(model, 8, "mitt", -12, 12, 0, sdb); mKnob(model, 9, "hög", -12, 12, 0, sdb)
        }
    }
}

private struct GlueTile: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let gr = CGFloat(model.engine.masterGR)
        Tile(title: "glue", sub: "buss-komp på hela mixen") {
            Canvas { c, s in
                dotGround(c, s)
                let n = Int((s.width - 4) / 6), lit = Int((min(1, gr / 12) * CGFloat(n)).rounded())
                for j in 0..<lit { c.fill(Path(CGRect(x: 4 + CGFloat(j) * 6 - 1.4, y: s.height / 2 - 1.4, width: 2.8, height: 2.8)), with: .color(kYel)) }
                c.draw(Text("−" + String(format: "%.1f", gr) + " db").font(BFont.mono(9)).foregroundColor(kMute), at: CGPoint(x: 6, y: s.height - 8), anchor: .leading)
            }
        } knobs: { mKnob(model, 10, "glue", 0, 1, 0.5) { String(Int(($0 * 100).rounded())) } }
    }
}

private struct WidthTile: View {
    @EnvironmentObject var model: EngineModel
    let scope: DeckScope
    var body: some View {
        Tile(title: "bredd", sub: "mono ↔ bred") {
            Canvas { c, s in
                dotGround(c, s)
                let m = min(s.width, s.height) / 2 - 4, cx = s.width / 2, cy = s.height / 2
                var p = Path()
                for i in stride(from: 0, to: scope.gonX.count, by: 2) {
                    p.addRect(CGRect(x: cx + CGFloat(scope.gonX[i]) * m * 1.6 - 0.8, y: cy - CGFloat(scope.gonY[i]) * m * 1.6 - 0.8, width: 1.6, height: 1.6))
                }
                c.fill(p, with: .color(kYel))
            }
        } knobs: { mKnob(model, 11, "bredd", 0, 2, 1) { String(Int(($0 * 100).rounded())) + "%" } }
    }
}

private struct LoudTile: View {
    @EnvironmentObject var model: EngineModel
    let scope: DeckScope
    var body: some View {
        let lu = scope.msAvg > 1e-9 ? Double(-0.691 + 10 * log10(scope.msAvg)) : -60
        Tile(title: "loud", sub: "in i limitern") {
            Canvas { c, s in
                dotGround(c, s)
                let X = { (v: Double) in 4 + (s.width - 8) * CGFloat(max(0, min(1, (v + 30) / 30))) }
                var x: CGFloat = 4
                while x <= X(lu) { c.fill(Path(CGRect(x: x - 1.4, y: s.height / 2 - 4, width: 2.8, height: 8)), with: .color(kYel)); x += 6 }
                for v in [-14.0, -9, -6] {
                    c.fill(Path(CGRect(x: X(v), y: s.height / 2 - 9, width: 1, height: 18)), with: .color(kTxt.opacity(0.55)))
                    c.draw(Text(String(Int(v))).font(BFont.mono(8.5)).foregroundColor(kMute), at: CGPoint(x: X(v), y: s.height - 6))
                }
            }
        } knobs: { mKnob(model, 12, "loud", 0, 1, 0) { "+" + String(format: "%.1f", $0 * 9) } }
    }
}

// MARK: colour & room: the old master knobs
private struct ColorRoom: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        Panel {
            HStack(spacing: 4) {
                mKnob(model, 0, "filter", -1, 1, 0) { abs($0) < 0.03 ? "av" : ($0 < 0 ? "lp" : "hp") + String(Int(abs($0) * 100)) }
                mKnob(model, 1, "echo", 0, 1, 0.38) { String(Int(($0 * 100).rounded())) }
                mKnob(model, 2, "space", 0, 1, 0.4) { String(Int(($0 * 100).rounded())) }
                mKnob(model, 3, "tape", 0, 1, 0.12) { String(Int(($0 * 100).rounded())) }
                mKnob(model, 5, "swing", 0, 1, 0.12) { String(Int((50 + $0 * 41.6).rounded())) + "%" }
                mKnob(model, 6, "volym", 0, 1, 0.75) { String(Int(($0 * 100).rounded())) }
            }
            .padding(.horizontal, 8).padding(.vertical, 10)
        }
    }
}
