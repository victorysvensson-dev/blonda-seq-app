import SwiftUI

/// "Mönster": the 10×16 step grid in the dot-matrix look (.seqlite.dotm in the web version). Fully playable.
struct GridCard: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        Card(style: .dark, title: [("Mönster ", false), (["A", "B", "C", "D"][model.pattern].lowercased(), true), (" · takt ", false), ("\(model.bar % 4 + 1)", true)]) {
            VStack(alignment: .leading, spacing: 6) {
                StepRule()
                ForEach(0..<10, id: \.self) { i in GridRow(track: i) }
                GridActions().padding(.top, 8)
            }
        }
    }
}

private let kLabelW: CGFloat = 104

struct StepRule: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        HStack(spacing: 0) {
            Color.clear.frame(width: kLabelW)
            HStack(spacing: 5.4) {
                ForEach(0..<16, id: \.self) { s in
                    let beat = s % 4 == 0, dimGroup = (s >= 4 && s < 8) || s >= 12, ph = model.playing && model.step == s
                    Text("\(s + 1)").font(BFont.linje(8.5)).fontWeight(beat ? .semibold : .regular)
                        .foregroundColor(ph ? T.dmY : beat ? T.dmInk : T.dmInk.opacity(dimGroup ? 0.18 : 0.28))
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .frame(height: 17, alignment: .top)
    }
}

struct GridRow: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
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
                .frame(width: kLabelW, height: 35)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            HStack(spacing: 5.4) {
                ForEach(0..<16, id: \.self) { s in
                    DotCell(value: model.value(track, s), colorHex: col, playhead: model.playing && model.step == s, dimGroup: (s >= 4 && s < 8) || s >= 12)
                        .onTapGesture { model.cycle(track, s) }
                }
            }
        }
        .frame(height: 35)
    }
}

/// One step: a square with a 4×4 dot matrix; lit dots glow in the track colour, the playhead lights it yellow.
struct DotCell: View {
    let value: Int          // 0 off, 1 on, 2 accent
    let colorHex: UInt32
    let playhead: Bool
    let dimGroup: Bool
    var body: some View {
        let on = value > 0, acc = value == 2
        let bg: Color = on ? (playhead ? Color(hex: 0x201E16) : Color(hex: 0x18191C)) : (playhead ? Color(hex: 0x29282A) : (dimGroup ? T.dmCell2 : T.dmCell))
        let line: Color = on && playhead ? T.dmY : (acc ? T.dmInk.opacity(0.6) : (on ? Color(hex: 0x3A3B40) : T.dmLine))
        Canvas { ctx, size in
            let inset = size.width * 0.1414, inner = size.width - 2 * inset, tile = inner / 4
            var path = Path()
            for r in 0..<4 { for c in 0..<4 {
                let cx = inset + (CGFloat(c) + 0.5) * tile, cy = inset + (CGFloat(r) + 0.5) * tile, rad = tile * 0.345
                path.addEllipse(in: CGRect(x: cx - rad, y: cy - rad, width: 2 * rad, height: 2 * rad))
            } }
            if on {
                let dc = playhead ? mixColor(colorHex, 0xFFFFFF, 0.45) : mixColor(colorHex, 0xFFFFFF, 0.78)
                var g = ctx
                g.addFilter(.shadow(color: Color(hex: colorHex), radius: playhead ? 3 : 1.5))
                if playhead { g.addFilter(.shadow(color: Color(hex: colorHex), radius: 3)) }
                g.opacity = playhead ? 1 : 0.72 + 0.28 * (acc ? 1 : 0.72)
                g.fill(path, with: .color(dc))
            } else {
                ctx.fill(path, with: .color(T.dmInk.opacity(playhead ? 0.24 : 0.09)))
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .background(bg)
        .overlay(Rectangle().strokeBorder(line, lineWidth: 1))
        .contentShape(Rectangle())
    }
}

struct GridActions: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        HStack(spacing: 5) {
            DMChip { HStack(spacing: 7) { SVGIcon(d: "M3.5 3h9A1.5 1.5 0 0 1 14 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7A1.5 1.5 0 0 1 3.5 3zM6 3v6M10 3v6", size: 14); Text("piano roll") } }
            DMChip(fill: T.dmY) {
                HStack(spacing: 10) { DieFace(); Text("tärning") }.padding(.leading, -7)
            }
            DMChip { HStack(spacing: 7) { SVGIcon(d: "M2 12c3 0 4-8 7-8s3 5 5 5", size: 14, stroke: 1.6); Text("variation") } }
            DMChip { HStack(spacing: 7) { SVGIcon(d: "M2 8h11M10 5l3 3-3 3", size: 14, stroke: 1.6); Text("flytta") } }
            DMChip { HStack(spacing: 7) { SVGIcon(d: "M3 3l10 10M13 3L3 13", size: 14, stroke: 1.6); Text("rensa spår") } }
            Rectangle().fill(T.dmLine).frame(width: 1, height: 18).padding(.horizontal, 2)
            DMChip(action: { model.toggleMute(model.selectedTrack) }) { Text("mute") }
            DMChip { Text("solo") }
            Spacer(minLength: 0)
            Rectangle().fill(T.dmLine).frame(width: 1, height: 18).padding(.horizontal, 2)
            DMChip { SVGIcon(d: "M5 3L2 6l3 3M2 6h7a4 4 0 010 8H6", size: 14, stroke: 1.6) }.frame(width: 30)
            DMChip { SVGIcon(d: "M11 3l3 3-3 3M14 6H7a4 4 0 000 8h3", size: 14, stroke: 1.6) }.frame(width: 30)
        }
    }
}

/// The dice face on the yellow "tärning" chip (5 lit pips + 4 dark).
struct DieFace: View {
    var body: some View {
        Canvas { c, size in
            let pos: [(CGFloat, CGFloat, Bool)] = [(7, 7, true), (14, 6, false), (22, 7, true), (6, 14, false), (14, 14, true), (22, 14, false), (7, 22, true), (14, 22, false), (22, 22, true)]
            for (x, y, lit) in pos {
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
