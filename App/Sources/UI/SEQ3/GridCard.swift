import SwiftUI

/// "Mönster": the 10×16 step grid in the dot-matrix look (.seqlite.dotm in the web version). Fully playable.
struct GridCard: View {
    @EnvironmentObject var model: EngineModel
    @State private var width: CGFloat = 0
    var body: some View {
        Card(style: .dark, title: [("Mönster ", false), (["A", "B", "C", "D"][model.pattern].lowercased(), true), (" · takt ", false), ("\(model.bar % 4 + 1)", true)], extra: AnyView(PatternSwitch())) {
            VStack(alignment: .leading, spacing: 6) {
                // the width the card offers (not the width of its rows, so the steps can always shrink to fit)
                GeometryReader { g in Color.clear.preference(key: GridWidthKey.self, value: g.size.width) }.frame(height: 0)
                StepRule(cell: cell)
                ForEach(0..<10, id: \.self) { i in GridRow(track: i, cell: cell) }
                GridActions().padding(.top, 8)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .onPreferenceChange(GridWidthKey.self) { width = $0 }
        }
    }
    /// The steps grow with the card (a big window gives big steps), from 20 up to 64 points.
    private var cell: CGFloat {
        guard width > 0 else { return 35 }
        return min(64, max(12, ((width - kLabelW - 15 * kGap) / 16 - 0.5).rounded(.down)))
    }
}

private struct GridWidthKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { let v = nextValue(); if v > 0 { value = v } }
}

private let kLabelW: CGFloat = 104
private let kGap: CGFloat = 5.4

struct StepRule: View {
    @EnvironmentObject var model: EngineModel
    var cell: CGFloat = 35
    var body: some View {
        HStack(spacing: 0) {
            Color.clear.frame(width: kLabelW)
            HStack(spacing: kGap) {
                ForEach(0..<16, id: \.self) { s in
                    let beat = s % 4 == 0, dimGroup = (s >= 4 && s < 8) || s >= 12, ph = model.playing && model.step == s
                    Text("\(s + 1)").font(BFont.linje(8.5)).fontWeight(beat ? .semibold : .regular)
                        .foregroundColor(ph ? T.dmY : beat ? T.dmInk : T.dmInk.opacity(dimGroup ? 0.18 : 0.28))
                        .frame(width: cell)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(height: 17, alignment: .top)
    }
}

struct GridRow: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var cell: CGFloat = 35
    var body: some View {
        let sel = track == model.selectedTrack, col = model.trackHex(track), muted = model.isMuted(track)
        HStack(spacing: 0) {
            Button { model.selectedTrack = track } label: {
                HStack(spacing: 0) {
                    TimelineView(.animation(minimumInterval: 1.0 / 30)) { _ in
                        let f = model.flash(track, 0.2)
                        HStack(spacing: 2) {
                            ForEach(0..<4, id: \.self) { k in
                                Circle().fill(Color(hex: col).opacity(k == 0 ? 0.9 : 0.35 + 0.65 * f)).frame(width: 4, height: 4)
                            }
                        }
                    }
                    .frame(width: 22).padding(.trailing, 15)
                    Text(kTracks[track].name.lowercased()).font(BFont.mono(10)).tracking(0.6)
                        .foregroundColor(sel ? T.dmY : T.dmInk.opacity(0.55))
                        .strikethrough(muted)
                        .opacity(muted ? 0.3 : 1)
                    Spacer(minLength: 0)
                }
                .frame(width: kLabelW, height: cell)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .simultaneousGesture(TapGesture(count: 2).onEnded { model.openDrumEditor(track) })
            HStack(spacing: kGap) {
                let L = model.length(track)
                let ph = model.playing && model.step >= 0 ? (L < 16 ? model.globalStep % L : model.step) : -1
                ForEach(0..<16, id: \.self) { s in
                    let ref = EngineModel.StepRef(track: track, step: s)
                    let v = model.value(track, s)
                    DotCell(value: v, colorHex: col, playhead: ph == s, dimGroup: (s >= 4 && s < 8) || s >= 12, out: s >= L, shift: v > 0 ? model.dotShift(track, s) : 0)
                        .frame(width: cell, height: cell)
                        .onTapGesture { model.cycle(track, s) }
                        .onLongPressGesture(minimumDuration: 0.43) { model.openInspector(track, s) }
                        .modifier(StepNudgeDrag(track: track, step: s, pitch: cell + kGap))
                        .modifier(InspectorPopover(ref: ref))
                }
            }
            Spacer(minLength: 0)
        }
        .frame(height: cell)
    }
}

/// Drag a lit step sideways to nudge it (a whole step width = one step); past half a step it moves on to the
/// next step if that one is free. The dots slide as you drag.
struct StepNudgeDrag: ViewModifier {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let step: Int
    let pitch: CGFloat
    @State private var cur: Int?
    @State private var moved = 0
    @State private var o0: Float = 0
    func body(content: Content) -> some View {
        content.simultaneousGesture(DragGesture(minimumDistance: 8).onChanged { d in
            if cur == nil {
                guard abs(d.translation.width) > abs(d.translation.height), model.value(track, step) > 0 else { return }
                model.engine.pushUndo(); cur = step; moved = 0; o0 = model.stepNudge(EngineModel.StepRef(track: track, step: step))
            }
            guard let c = cur else { return }
            var total = o0 + Float(d.translation.width / pitch)
            if abs(total - Float(moved)) < 0.03 { total = Float(moved) }   // snaps onto the grid
            let n = model.nudgeStep(track, c, total - Float(moved))
            if n != c { moved += (n == (c + 1) % 16) ? 1 : -1; cur = n }
        }.onEnded { _ in if let c = cur { model.auditionStep(EngineModel.StepRef(track: track, step: c)) }; cur = nil })
    }
}

/// One step: a square with a 4×4 dot matrix; lit dots glow in the track colour, the playhead lights it yellow.
struct DotCell: View {
    let value: Int          // 0 off, 1 on, 2 accent
    let colorHex: UInt32
    let playhead: Bool
    let dimGroup: Bool
    var out = false          // beyond the track's length
    var shift = 0            // timing: the lit dots slide this many dot columns (swing / nudge, a quarter step each)
    var body: some View {
        let on = value > 0, acc = value == 2
        let bg: Color = on ? (playhead ? Color(hex: 0x201E16) : Color(hex: 0x18191C)) : (playhead ? Color(hex: 0x29282A) : (dimGroup ? T.dmCell2 : T.dmCell))
        let line: Color = on && playhead ? T.dmY : (acc ? mixColor(colorHex, 0xFFFFFF, 0.85).opacity(0.8) : (on ? Color(hex: 0x3A3B40) : T.dmLine))
        Canvas { ctx, size in
            let inset = size.width * 0.1414, inner = size.width - 2 * inset, tile = inner / 4
            var path = Path(), lit = Path()
            for r in 0..<4 { for c in 0..<4 {
                let cx = inset + (CGFloat(c) + 0.5) * tile, cy = inset + (CGFloat(r) + 0.5) * tile, rad = tile * 0.345
                let e = CGRect(x: cx - rad, y: cy - rad, width: 2 * rad, height: 2 * rad)
                path.addEllipse(in: e)
                if c - shift >= 0 && c - shift < 4 { lit.addEllipse(in: e) }   // the block of lit dots slides sideways
            } }
            if on && shift != 0 { ctx.fill(path, with: .color(T.dmInk.opacity(0.09))); path = lit }
            if on {
                let dc = playhead ? mixColor(colorHex, 0xFFFFFF, 0.45) : mixColor(colorHex, 0xFFFFFF, 0.78)
                var g = ctx
                g.addFilter(.shadow(color: Color(hex: colorHex), radius: playhead ? 3 : 1.5))
                if playhead { g.addFilter(.shadow(color: Color(hex: colorHex), radius: 3)) }
                g.opacity = playhead ? 1 : 0.72 + 0.28 * (acc ? 1 : 0.72)
                g.fill(path, with: .color(dc))
            } else if !out {
                ctx.fill(path, with: .color(T.dmInk.opacity(playhead ? 0.24 : 0.09)))
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .background(bg)
        .overlay(Rectangle().strokeBorder(line, lineWidth: 1))
        .contentShape(Rectangle())
    }
}

/// A B C D right in the pattern card, and "copy to the next one" (which then goes there).
struct PatternSwitch: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<4, id: \.self) { p in
                let on: Bool = p == model.pattern
                let used: Bool = model.patternHasSteps(p)
                Button { model.selectPattern(p) } label: {
                    Text(["A", "B", "C", "D"][p]).font(BFont.mono(10.5, 500))
                        .foregroundColor(on ? Color(hex: 0x17181A) : T.dmInk.opacity(used ? 0.85 : 0.35))
                        .frame(width: 26, height: 24)
                        .background(Rectangle().fill(on ? T.dmY : Color.white.opacity(0.05)))
                        .overlay(alignment: .bottom) { if used && !on { Rectangle().fill(T.dmY.opacity(0.6)).frame(width: 8, height: 2).padding(.bottom, 3) } }
                }
                .buttonStyle(PressScale())
            }
            Button { model.copyPattern() } label: {
                Text("kopiera → \(["A", "B", "C", "D"][(model.pattern + 1) % 4])").font(BFont.mono(9.5, 500)).foregroundColor(T.dmInk.opacity(0.85))
                    .padding(.horizontal, 8).frame(height: 24)
                    .overlay(Rectangle().strokeBorder(T.dmLine, lineWidth: 1))
            }
            .buttonStyle(PressScale())
            .padding(.leading, 4)
        }
    }
}

/// Master swing straight from the pattern: drag sideways (or tap to step 0 → 25 → 50 → 75 %). The off-beat dots move with it.
struct SwingChip: View {
    @EnvironmentObject var model: EngineModel
    private var def: ParamDef { kMasterParams.first { $0.group == 2 && $0.field == 5 }! }
    var body: some View {
        let v: Float = model.param(def, 0)
        HStack(spacing: 6) {
            Text("swing").foregroundColor(T.dmInk.opacity(0.6))
            Text("\(50 + Int((v * 41.7).rounded()))%")
            ZStack(alignment: .leading) {
                Rectangle().fill(T.dmInk.opacity(0.12)).frame(width: 34, height: 3)
                Rectangle().fill(T.dmY).frame(width: max(2, 34 * CGFloat(v)), height: 3)
            }
        }
        .font(BFont.mono(10, 500)).foregroundColor(T.dmInk)
        .padding(.horizontal, 12).frame(height: 30)
        .overlay(Rectangle().strokeBorder(T.dmLine, lineWidth: 1))
        .modifier(ParamDrag(def: def, track: 0, points: 180))
        .onTapGesture { let steps: [Float] = [0, 0.25, 0.5, 0.75]; let i = steps.firstIndex { $0 > v + 0.01 } ?? 0; model.setParam(def, 0, steps[i]) }
    }
}

struct GridActions: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        FlowLayout(spacing: 5) {
            DMChip(action: { model.openRoll(model.selectedTrack) }) { HStack(spacing: 7) { SVGIcon(d: "M3.5 3h9A1.5 1.5 0 0 1 14 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7A1.5 1.5 0 0 1 3.5 3zM6 3v6M10 3v6", size: 14); Text("piano roll") } }
            DMChip(fill: T.dmY, action: { model.rollDice() }) {
                HStack(spacing: 10) {
                    DieFace(n: model.dieFace).rotationEffect(.degrees(model.rolling ? Double(model.dieFace) * 60 : 0)).animation(.spring(response: 0.25, dampingFraction: 0.6), value: model.dieFace)
                    Text("tärning")
                }.padding(.leading, -7)
            }
            SwingChip()
            DMChip(action: { model.variation(model.selectedTrack) }) { HStack(spacing: 7) { SVGIcon(d: "M2 12c3 0 4-8 7-8s3 5 5 5", size: 14, stroke: 1.6); Text("variation") } }
            DMChip(action: { model.shift(model.selectedTrack) }) { HStack(spacing: 7) { SVGIcon(d: "M2 8h11M10 5l3 3-3 3", size: 14, stroke: 1.6); Text("flytta") } }
            DMChip(action: { model.clear(model.selectedTrack) }) { HStack(spacing: 7) { SVGIcon(d: "M3 3l10 10M13 3L3 13", size: 14, stroke: 1.6); Text("rensa spår") } }
            DMChip(fill: model.isMuted(model.selectedTrack) ? Color(hex: 0xC9452F) : nil, action: { model.toggleMute(model.selectedTrack) }) { Text("mute") }
            DMChip(fill: model.soloTrack == model.selectedTrack ? T.dmY : nil, action: { model.toggleSolo(model.selectedTrack) }) { Text("solo") }
            DMChip(action: { model.undo() }) { SVGIcon(d: "M5 3L2 6l3 3M2 6h7a4 4 0 010 8H6", size: 14, stroke: 1.6) }
            DMChip(action: { model.redo() }) { SVGIcon(d: "M11 3l3 3-3 3M14 6H7a4 4 0 000 8h3", size: 14, stroke: 1.6) }
        }
    }
}

/// The dice face on the yellow "tärning" chip (5 lit pips + 4 dark).
struct DieFace: View {
    var n: Int = 5
    var body: some View {
        Canvas { c, size in
            // 3×3 pip positions; lit pips per face like a real die
            let grid: [(CGFloat, CGFloat)] = [(7, 7), (14, 7), (21, 7), (7, 14), (14, 14), (21, 14), (7, 21), (14, 21), (21, 21)]
            let faces: [[Int]] = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]]
            let litSet = Set(faces[max(1, min(6, n)) - 1])
            for (k, pt) in grid.enumerated() {
                let x = pt.0, y = pt.1, lit = litSet.contains(k)
                let r: CGFloat = lit ? 3 : 2
                if lit {
                    var g = c; g.addFilter(.shadow(color: T.yellow.opacity(0.8), radius: 2.5))
                    g.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)), with: .color(T.yellow))
                } else {
                    c.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)), with: .color(.white.opacity(0.08)))
                }
            }
        }
        .frame(width: 28, height: 28)
        .background(LinearGradient(colors: [Color(hex: 0x2E2E33), Color(hex: 0x121214)], startPoint: UnitPoint(x: 0.33, y: 0), endPoint: UnitPoint(x: 0.67, y: 1)))
    }
}

/// Only the step being inspected carries a popover (one presentation instead of 160 idle ones).
struct InspectorPopover: ViewModifier {
    @EnvironmentObject var model: EngineModel
    let ref: EngineModel.StepRef
    func body(content: Content) -> some View {
        if model.inspect == ref {
            content.popover(isPresented: Binding(get: { model.inspect == ref }, set: { if !$0 && model.inspect == ref { model.inspect = nil } }),
                            attachmentAnchor: .rect(.bounds), arrowEdge: .top) {
                StepInspector(ref: ref).environmentObject(model).presentationCompactAdaptation(.popover).presentationBackground(Color(rgb: 250, 249, 245))
            }
        } else { content }
    }
}
