import SwiftUI

/// "Pro" view of the pattern: what the mönster card turns into in full screen. The grid fills the screen
/// (steps up to 64 pt), every row gets its own controls (mute, solo, length, hits, level), the selected
/// track gets velocity / chance / ratchet lanes under the grid and a side panel with its sound and FX.
struct ProPattern: View {
    @EnvironmentObject var model: EngineModel
    static let gap: CGFloat = 5.4
    static let label: CGFloat = 104
    static let extras: CGFloat = 300
    static let sends: CGFloat = 400       // wide screens: sound name, pan and echo / space per row too
    static func wide(_ width: CGFloat) -> Bool { width >= label + 16 * 56 + 15 * gap + 14 + extras + sends }
    static let side: CGFloat = 340

    var body: some View {
        HStack(alignment: .top, spacing: 22) {
            GeometryReader { g in
                let cell: CGFloat = Self.cellSize(g.size.width)
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 6) {
                        ProHeader()
                        ProRule(cell: cell, wide: Self.wide(g.size.width))
                        ForEach(0..<10, id: \.self) { i in ProRow(track: i, cell: cell, wide: Self.wide(g.size.width)) }
                        ProLanes(cell: cell).padding(.top, 10)
                        GridActions().padding(.top, 10)
                        ProOverview().padding(.top, 18)
                    }
                    .frame(width: g.size.width, alignment: .topLeading)
                    .padding(.bottom, 30)
                    .background(ScrollTuner())
                }
                .lockedWhileDragging()
            }
            ProSide(track: model.selectedTrack)
                .frame(width: Self.side)
                .frame(maxHeight: .infinity, alignment: .top)
        }
        .padding(.horizontal, 24).padding(.bottom, 20).padding(.top, Self.topInset)
        .background(T.dmBg.ignoresSafeArea())
    }

    #if targetEnvironment(macCatalyst)
    static let topInset: CGFloat = 34   // room for the window buttons
    #else
    static let topInset: CGFloat = 20
    #endif

    /// Steps follow the width of the page, 24…72 pt (big enough; the room left over shows more instead).
    static func cellSize(_ width: CGFloat) -> CGFloat {
        let w: CGFloat = width - label - extras - (wide(width) ? sends : 0) - 15 * gap - 14
        return max(24, min(72, (w / 16).rounded(.down)))
    }
}

/// Under the grid: the selected track's orbit, the master and the song chain — the whole groove on one page.
private struct ProOverview: View {
    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            OrbitCard().frame(maxWidth: .infinity)
            VStack(spacing: 14) {
                MasterCard()
                SongCard()
            }
            .frame(maxWidth: .infinity)
        }
    }
}

private struct ProHeader: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        HStack(spacing: 14) {
            Text("mönster").font(BFont.mono(11, 500)).tracking(0.6).foregroundColor(T.dmInk)
            HStack(spacing: 4) {
                ForEach(0..<4, id: \.self) { p in
                    let on: Bool = p == model.pattern
                    Button { model.selectPattern(p) } label: {
                        DotMatrixText(text: ["A", "B", "C", "D"][p], height: 13, color: on ? T.ink : T.dmInk.opacity(0.5))
                            .frame(width: 34, height: 30)
                            .background(RoundedRectangle(cornerRadius: 6).fill(on ? T.dmY : Color.white.opacity(0.05)))
                    }.buttonStyle(.plain)
                }
            }
            ProStat(label: "takt", value: "\(model.bar % 4 + 1)")
            ProStat(label: "bpm", value: "\(Int(model.bpm.rounded()))")
            ProStat(label: "steg", value: model.playing && model.step >= 0 ? "\(model.step + 1)" : "–")
            Spacer()
            Button { model.togglePlay() } label: {
                Image(systemName: model.playing ? "pause.fill" : "play.fill").font(.system(size: 13, weight: .bold))
                    .foregroundColor(model.playing ? T.ink : T.dmInk)
                    .frame(width: 40, height: 30)
                    .background(RoundedRectangle(cornerRadius: 6).fill(model.playing ? T.dmY : Color.white.opacity(0.06)))
            }.buttonStyle(.plain)
            CapButton(kind: .full, dark: true, fold: "mönster")
        }
        .frame(height: 46)
    }
}

private struct ProStat: View {
    let label: String
    let value: String
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(label).font(BFont.mono(9)).foregroundColor(T.dmInk.opacity(0.45))
            Text(value).font(BFont.mono(12, 500)).foregroundColor(T.dmInk).monospacedDigit()
        }
        .padding(.horizontal, 10).frame(height: 30)
        .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(T.dmLine, lineWidth: 1))
    }
}

/// Step numbers, with headings over the row controls.
private struct ProRule: View {
    let cell: CGFloat
    let wide: Bool
    var body: some View {
        HStack(spacing: 14) {
            StepRule(cell: cell).frame(width: ProPattern.label + 16 * cell + 15 * ProPattern.gap, alignment: .leading)
            HStack(spacing: 8) {
                Text("m · s").frame(width: 58, alignment: .leading)
                Text("längd").frame(width: 78, alignment: .leading)
                Text("slag").frame(width: 30, alignment: .leading)
                Text("nivå").frame(width: 110, alignment: .leading)
                if wide {
                    HStack(spacing: 20) {
                        Text("ljud").frame(width: 84, alignment: .leading)
                        Text("pan").frame(width: 82, alignment: .leading)
                        Text("eko").frame(width: 82, alignment: .leading)
                        Text("rymd").frame(width: 82, alignment: .leading)
                    }
                    .padding(.leading, 14)
                }
            }
            .font(BFont.mono(8.5)).foregroundColor(T.dmInk.opacity(0.4))
            .frame(height: 17, alignment: .top)
        }
    }
}

private struct ProRow: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let cell: CGFloat
    let wide: Bool
    var body: some View {
        HStack(spacing: 14) {
            GridRow(track: track, cell: cell)
                .frame(width: ProPattern.label + 16 * cell + 15 * ProPattern.gap, alignment: .leading)
            ProRowExtras(track: track, cell: cell)
            if wide { ProRowSends(track: track) }
        }
        .frame(height: cell)
    }
}

private struct ProRowExtras: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let cell: CGFloat
    var body: some View {
        let muted: Bool = model.isMuted(track)
        let solo: Bool = model.soloTrack == track
        let len: Int = model.length(track)
        let tc: Color = Color(hex: model.trackHex(track))
        HStack(spacing: 8) {
            HStack(spacing: 4) {
                ProSquare(text: "m", on: muted, tint: Color(hex: 0xC9452F)) { model.toggleMute(track) }
                ProSquare(text: "s", on: solo, tint: T.dmY) { model.toggleSolo(track) }
            }
            .frame(width: 58, alignment: .leading)
            HStack(spacing: 2) {
                ProSquare(text: "−", on: false, tint: T.dmY) { model.setLength(track, len - 1) }
                Text("\(len)").font(BFont.mono(11, 500)).foregroundColor(len < 16 ? T.dmY : T.dmInk).frame(width: 22).monospacedDigit()
                ProSquare(text: "+", on: false, tint: T.dmY) { model.setLength(track, len + 1) }
            }
            .frame(width: 78, alignment: .leading)
            Text("\(model.hits(track))").font(BFont.mono(11)).foregroundColor(T.dmInk.opacity(0.7)).frame(width: 30, alignment: .leading).monospacedDigit()
            ProLevel(track: track, def: kTrackParams[0], tint: tc).frame(width: 110)
        }
        .frame(width: ProPattern.extras, alignment: .leading)
    }
}

private struct ProSquare: View {
    let text: String
    let on: Bool
    let tint: Color
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(text).font(BFont.mono(10.5, 500)).foregroundColor(on ? Color.black : T.dmInk.opacity(0.75))
                .frame(width: 24, height: 24)
                .background(RoundedRectangle(cornerRadius: 5).fill(on ? tint : Color.white.opacity(0.06)))
        }.buttonStyle(.plain)
    }
}

/// Level of one track: a thin bar that follows the mouse across its width.
private struct ProLevel: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let def: ParamDef
    let tint: Color
    var body: some View {
        let raw: Float = model.param(def, track)
        let v: CGFloat = CGFloat((raw - def.lo) / (def.hi - def.lo))
        HStack(spacing: 5) {
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.08)).frame(height: 4)
                    Capsule().fill(tint.opacity(0.85)).frame(width: max(4, g.size.width * v), height: 4)
                    Circle().fill(T.dmInk).frame(width: 10, height: 10).offset(x: g.size.width * v - 5)
                }
                .frame(maxHeight: .infinity)
            }
            .modifier(ParamDrag(def: def, track: track, fit: 1))
            Text(def.text(raw)).font(BFont.mono(10)).foregroundColor(T.dmInk.opacity(0.6)).frame(width: 30, alignment: .trailing).monospacedDigit()
        }
        .frame(height: 24)
    }
}

/// Wide screens: the sound's name and its pan / echo / space, mixer style.
private struct ProRowSends: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        let tc: Color = Color(hex: model.trackHex(track))
        HStack(spacing: 20) {
            Text(model.trackSub(track).lowercased()).font(BFont.mono(9.5)).foregroundColor(T.dmInk.opacity(0.55)).lineLimit(1)
                .frame(width: 84, alignment: .leading)
            ProLevel(track: track, def: kTrackParams[4], tint: tc.opacity(0.7)).frame(width: 82)
            ProLevel(track: track, def: kTrackParams[5], tint: tc.opacity(0.7)).frame(width: 82)
            ProLevel(track: track, def: kTrackParams[6], tint: tc.opacity(0.7)).frame(width: 82)
        }
        .frame(width: ProPattern.sends - 14, alignment: .leading)
    }
}

// MARK: - lanes for the selected track

private struct ProLanes: View {
    @EnvironmentObject var model: EngineModel
    let cell: CGFloat
    var body: some View {
        let t: Int = model.selectedTrack
        let tc: Color = Color(hex: model.trackHex(t))
        VStack(alignment: .leading, spacing: 6) {
            ProLane(title: "velocity", track: t, cell: cell, tint: tc, kind: 0)
            ProLane(title: "chans", track: t, cell: cell, tint: tc, kind: 1)
            ProLane(title: "ratchet", track: t, cell: cell, tint: tc, kind: 2)
            ProLane(title: "timing", track: t, cell: cell, tint: tc, kind: 3)
        }
    }
}

private struct ProLane: View {
    @EnvironmentObject var model: EngineModel
    let title: String
    let track: Int
    let cell: CGFloat
    let tint: Color
    let kind: Int          // 0 velocity (drag), 1 chance (tap cycles), 2 ratchet (tap cycles), 3 timing (drag, early ← → late)
    private let h: CGFloat = 38
    var body: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(BFont.mono(9.5)).foregroundColor(T.dmInk.opacity(0.75))
                Text(kTracks[track].name.lowercased()).font(BFont.mono(8)).foregroundColor(tint.opacity(0.8))
            }
            .frame(width: ProPattern.label, alignment: .leading)
            HStack(spacing: ProPattern.gap) {
                ForEach(0..<16, id: \.self) { s in ProLaneCell(track: track, step: s, cell: cell, h: h, tint: tint, kind: kind) }
            }
            .modifier(LaneDrag(track: track, cell: cell, h: h, kind: kind))
        }
        .frame(height: h)
    }
}

private struct ProLaneCell: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let step: Int
    let cell: CGFloat
    let h: CGFloat
    let tint: Color
    let kind: Int
    var body: some View {
        let ref = EngineModel.StepRef(track: track, step: step)
        let on: Bool = model.value(track, step) > 0
        ZStack(alignment: .bottom) {
            RoundedRectangle(cornerRadius: 3).fill(Color.white.opacity(on ? 0.05 : 0.025))
            if on {
                switch kind {
                case 0:
                    let v: CGFloat = CGFloat(model.stepVel(ref))
                    RoundedRectangle(cornerRadius: 3).fill(tint.opacity(0.35 + 0.6 * Double(v))).frame(height: max(3, (h - 4) * v)).padding(2)
                case 1:
                    let p: Float = model.stepProb(ref)
                    Text(p >= 0.999 ? "100" : "\(Int((p * 100).rounded()))").font(BFont.mono(9.5, 500))
                        .foregroundColor(p >= 0.999 ? T.dmInk.opacity(0.45) : T.dmY).frame(maxHeight: .infinity)
                case 3:
                    let o: CGFloat = CGFloat(model.stepNudge(ref))
                    ZStack {
                        Rectangle().fill(T.dmInk.opacity(0.25)).frame(width: 1)
                        Rectangle().fill(tint.opacity(0.85)).frame(width: max(2, abs(o) * cell), height: 10).offset(x: o * cell / 2)
                        Text(abs(o) < 0.005 ? "" : (o > 0 ? "+" : "") + "\(Int((o * 100).rounded()))").font(BFont.mono(8)).foregroundColor(T.dmInk.opacity(0.7)).offset(y: 12)
                    }
                    .frame(maxHeight: .infinity)
                default:
                    let r: Int = model.stepRatchet(ref)
                    Text("\(r)×").font(BFont.mono(9.5, 500)).foregroundColor(r > 1 ? T.dmY : T.dmInk.opacity(0.45)).frame(maxHeight: .infinity)
                }
            }
        }
        .frame(width: cell, height: h)
        .contentShape(Rectangle())
        .onTapGesture {
            guard on, kind == 1 || kind == 2 else { return }
            if kind == 1 {
                let order: [Float] = [1, 0.75, 0.5, 0.25]
                let cur = model.stepProb(ref), i = order.firstIndex(where: { abs($0 - cur) < 0.01 }) ?? 0
                model.setStepProb(ref, order[(i + 1) % order.count])
            } else {
                model.setStepRatchet(ref, model.stepRatchet(ref) % 4 + 1)
            }
        }
    }
}

/// Velocity lane: press and drag across the bars to draw velocities (only on steps that are on).
private struct LaneDrag: ViewModifier {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let cell: CGFloat
    let h: CGFloat
    let kind: Int
    @State private var nudgeStep: Int?
    @State private var nudge0: Float = 0
    func body(content: Content) -> some View {
        if kind == 3 {
            // timing: grab a step and drag it sideways (a whole cell = half a step)
            content.contentShape(Rectangle()).gesture(DragGesture(minimumDistance: 1).onChanged { d in
                if nudgeStep == nil {
                    let s = Int(d.startLocation.x / (cell + ProPattern.gap)); guard s >= 0, s < 16, model.value(track, s) > 0 else { return }
                    nudgeStep = s; nudge0 = model.stepNudge(EngineModel.StepRef(track: track, step: s))
                }
                guard let s = nudgeStep else { return }
                var v = nudge0 + Float(d.translation.width / (cell * 2))
                if abs(v) < 0.02 { v = 0 }
                model.setStepNudge(EngineModel.StepRef(track: track, step: s), v)
            }.onEnded { _ in nudgeStep = nil })
        } else if kind == 0 {
            content.contentShape(Rectangle()).gesture(DragGesture(minimumDistance: 0).onChanged { d in
                let s = Int(d.location.x / (cell + ProPattern.gap))
                guard s >= 0, s < 16, model.value(track, s) > 0 else { return }
                let v = Float(min(1, max(0.05, 1 - d.location.y / h)))
                model.setStepVel(EngineModel.StepRef(track: track, step: s), v)
            })
        } else { content }
    }
}

// MARK: - side panel: the selected track's sound

private struct ProSide: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        let tc: Color = Color(hex: model.trackHex(track))
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 10) {
                    Text("\(track + 1)").font(BFont.mono(11, 500)).foregroundColor(Color.black)
                        .frame(width: 24, height: 24).background(Circle().fill(tc))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(kTracks[track].name.lowercased()).font(BFont.sans(20, 300)).foregroundColor(Color.white)
                        Text(model.trackSub(track).lowercased()).font(BFont.mono(9)).foregroundColor(Color.white.opacity(0.45)).lineLimit(1)
                    }
                    Spacer()
                }
                if track < 6 {
                    DedLabel(text: "ljudmodell")
                    DedKits(track: track, tc: tc)
                } else {
                    HStack(spacing: 8) {
                        DedButton(title: "synt", on: false, tint: tc) { FullStore.shared.toggle("synth") }
                        DedButton(title: "piano roll", on: false, tint: tc) { model.openRoll(track) }
                    }
                }
                DedLabel(text: "ljud")
                ProKnobGrid(defs: [0, 3, 2, 1, 4, 5, 6].map { kTrackParams[$0] }, track: track, tint: tc)
                DedLabel(text: "fx")
                ProKnobGrid(defs: kFxParams, track: track, tint: tc)
                HStack(spacing: 8) {
                    DedButton(title: "\u{25B6}\u{FE0E} provlyssna", on: false, tint: tc) { model.hitPad(track) }
                    DedButton(title: "mute", on: model.isMuted(track), tint: tc) { model.toggleMute(track) }
                }
                if track < 6 {
                    DedButton(title: "trumeditor", on: false, tint: tc) { model.openDrumEditor(track) }
                }
            }
            .padding(18)
        }
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous)
            .fill(LinearGradient(colors: [Color(rgb: 40, 40, 46), Color(rgb: 22, 22, 26)], startPoint: .top, endPoint: .bottom)))
        .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(Color.white.opacity(0.07)))
    }
}

private struct ProKnobGrid: View {
    let defs: [ParamDef]
    let track: Int
    let tint: Color
    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 4), spacing: 12) {
            ForEach(defs) { d in DedKnob(def: d, track: track, tint: tint) }
        }
    }
}
