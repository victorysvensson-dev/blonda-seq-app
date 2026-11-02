import SwiftUI

/// The pads in full screen, played like an MPC Live: for a synth, 16 pads in a scale — where you press decides
/// velocity (up = harder) and filter (left = darker, right = open), and moving the finger keeps shaping it.
/// For drums, a classic 4×4: kick bottom left, the ten sounds, then six glitch pads. Up = harder, sideways = tone. Recording works as usual.
struct MPCPads: View {
    @EnvironmentObject var model: EngineModel
    @AppStorage("mpcScale") private var scaleIx = 0
    @AppStorage("mpcOct") private var octave = 0
    @AppStorage("mpcDrumX") private var drumX = false    // drums: sideways changes the tone — off unless you want it
    @AppStorage("mpcSynthX") private var synthX = true   // synths: sideways = filter
    static let scales: [(String, [Int])] = [("moll", [0, 2, 3, 5, 7, 8, 10]), ("dur", [0, 2, 4, 5, 7, 9, 11]), ("penta", [0, 3, 5, 7, 10]), ("krom", Array(0..<12))]
    var body: some View {
        let t = model.selectedTrack
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                ForEach(0..<10, id: \.self) { i in
                    let on = i == t
                    Button { model.selectedTrack = i } label: {
                        Text(kTracks[i].name.lowercased()).font(BFont.mono(10, 500)).lineLimit(1)
                            .foregroundColor(on ? Color(hex: 0x111211) : T.fg.opacity(0.8))
                            .padding(.horizontal, 10).frame(height: 30)
                            .background(Capsule().fill(on ? model.trackColor(i) : Color.white.opacity(0.07)))
                    }.buttonStyle(PressScale())
                }
                Spacer(minLength: 0)
            }
            if t >= 6 {
                HStack(spacing: 8) {
                    ForEach(Self.scales.indices, id: \.self) { k in
                        Button { scaleIx = k } label: {
                            Text(Self.scales[k].0).font(BFont.mono(10, 500)).foregroundColor(k == scaleIx ? Color(hex: 0x111211) : T.fg.opacity(0.8))
                                .padding(.horizontal, 12).frame(height: 30).background(Capsule().fill(k == scaleIx ? T.yellow : Color.white.opacity(0.07)))
                        }.buttonStyle(PressScale())
                    }
                    Spacer()
                    XChip(title: "sidled · filter", on: $synthX)
                    Text("oktav").font(BFont.mono(9)).foregroundColor(T.mute)
                    Button { octave = max(-2, octave - 1) } label: { Text("−").font(BFont.mono(14, 500)).frame(width: 34, height: 30).background(Capsule().fill(Color.white.opacity(0.07))) }.buttonStyle(PressScale())
                    Text("\(octave >= 0 ? "+" : "")\(octave)").font(BFont.mono(11, 500)).frame(width: 28)
                    Button { octave = min(2, octave + 1) } label: { Text("+").font(BFont.mono(14, 500)).frame(width: 34, height: 30).background(Capsule().fill(Color.white.opacity(0.07))) }.buttonStyle(PressScale())
                }
                .foregroundColor(T.fg)
                NoteGrid(track: t, notes: notes(t), xOn: synthX)
            } else {
                HStack { Spacer(); XChip(title: "sidled · ton", on: $drumX) }
                DrumGrid(xOn: drumX)
            }
            Text(t >= 6 ? (synthX ? "tryck högt upp = hårdare · vänster = mörkare filter, höger = öppet · dra med fingret för att forma tonen" : "tryck högt upp = hårdare · flera fingrar samtidigt går bra")
                        : (drumX ? "tryck högt upp = hårdare · i sidled = tonen · flera fingrar samtidigt går bra" : "tryck högt upp = hårdare · trummorna låter som i mönstret · flera fingrar samtidigt går bra"))
                .font(BFont.mono(9)).foregroundColor(T.mute)
        }
    }
    /// 16 notes of the scale, pad 1 bottom left (MPC order)
    private func notes(_ t: Int) -> [Int] {
        let root = (t == 6 ? 36 : 48) + 12 * octave, sc = Self.scales[max(0, min(3, scaleIx))].1
        return (0..<16).map { k in root + 12 * (k / sc.count) + sc[k % sc.count] }
    }
}

private struct NoteGrid: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let notes: [Int]
    let xOn: Bool
    var body: some View {
        let rows = [[12, 13, 14, 15], [8, 9, 10, 11], [4, 5, 6, 7], [0, 1, 2, 3]]
        VStack(spacing: 10) {
            ForEach(0..<4, id: \.self) { r in
                HStack(spacing: 10) {
                    ForEach(rows[r], id: \.self) { k in
                        MPCPad(track: track, note: notes[k], label: noteName(notes[k]), index: k + 1, xParam: kFxParams[1], xOn: xOn, xMap: { x in -0.9 * (1 - x) })
                    }
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .frame(maxWidth: 760)
        .frame(maxWidth: .infinity)
    }
}

/// The drums as a classic 4×4 (MPC order): pad 1 = kick bottom left, 1–10 the ten sounds, 11–16 glitch held down.
private struct DrumGrid: View {
    @EnvironmentObject var model: EngineModel
    let xOn: Bool
    var body: some View {
        VStack(spacing: 10) {
            ForEach(0..<4, id: \.self) { r in
                HStack(spacing: 10) {
                    ForEach(0..<4, id: \.self) { c in
                        let k = (3 - r) * 4 + c   // 0 = bottom left
                        if k < 10 {
                            MPCPad(track: k, note: k < 6 ? 60 : (k == 6 ? 45 : 57), label: model.trackShort(k), index: k + 1, xParam: kTrackParams[1], xOn: xOn, xMap: { x in x })
                        } else {
                            GlitchPad(fx: k - 9, index: k + 1)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: 760)
        .frame(maxWidth: .infinity)
    }
}

/// on/off pill: whether sideways on a pad shapes the sound
private struct XChip: View {
    let title: String
    @Binding var on: Bool
    var body: some View {
        Button { on.toggle() } label: {
            HStack(spacing: 7) {
                Circle().fill(on ? Color(hex: 0x111211) : T.fg.opacity(0.35)).frame(width: 6, height: 6)
                Text(title + (on ? " på" : " av")).font(BFont.mono(10, 500))
            }
            .foregroundColor(on ? Color(hex: 0x111211) : T.fg.opacity(0.8))
            .padding(.horizontal, 12).frame(height: 30)
            .background(Capsule().fill(on ? T.yellow : Color.white.opacity(0.07)))
        }.buttonStyle(PressScale())
    }
}

private let kMPCGlitch = ["stutter", "roll", "rev", "stop", "halv", "crush"]

/// A pad that holds a glitch effect on the master while pressed.
private struct GlitchPad: View {
    @EnvironmentObject var model: EngineModel
    let fx: Int
    let index: Int
    @State private var on = false
    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 12, style: .continuous).fill(on ? T.yellow : Color.white.opacity(0.06))
            RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.white.opacity(on ? 0.5 : 0.14), lineWidth: 1)
            VStack(alignment: .leading) {
                Text("\(index) · glitch").font(BFont.mono(9)).opacity(0.5)
                Spacer()
                Text(kMPCGlitch[fx - 1]).font(BFont.sans(15, 500))
            }
            .foregroundColor(on ? Color(hex: 0x111211) : T.fg)
            .padding(10)
        }
        .contentShape(Rectangle())
        .gesture(DragGesture(minimumDistance: 0)
            .onChanged { _ in if !on { on = true; model.glitchPress(fx, true) } }
            .onEnded { _ in on = false; model.glitchPress(fx, false) })
        .aspectRatio(1.25, contentMode: .fit)
    }
}

/// One pad: velocity from where you press (higher = harder), a parameter from the sideways position, a dot where the finger is.
private struct MPCPad: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let note: Int
    let label: String
    let index: Int
    let xParam: ParamDef
    var xOn = true
    let xMap: (Double) -> Double   // 0..1 across the pad → parameter value
    @State private var touch: CGPoint?
    @State private var saved: Float?
    @State private var vel: Float = 0
    var body: some View {
        GeometryReader { g in
            let col = model.trackColor(track), on = touch != nil
            ZStack(alignment: .topLeading) {
                // web: each pad carries its track's colour and lights up when the sequencer plays it
                TimelineView(.animation(minimumInterval: 1.0 / 30, paused: on)) { tl in
                    let flash = xParam.group == 0 && track < 10 ? max(0, 1 - (CACurrentMediaTime() - model.hitTime[track]) * 5) : 0
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(on ? col.opacity(0.35 + 0.65 * Double(vel)) : col.opacity(0.13 + 0.5 * flash))
                        .shadow(color: on ? col.opacity(0.8) : col.opacity(0.5 * flash), radius: 14)
                }
                Circle().fill(col).frame(width: 7, height: 7).padding(10).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing).opacity(on ? 0 : 0.9)
                RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.white.opacity(on ? 0.5 : 0.14), lineWidth: 1)
                if let p = touch {
                    Circle().fill(Color.white).frame(width: 16, height: 16).shadow(color: .white, radius: 6).position(p)
                    Text("\(Int((vel * 100).rounded()))").font(BFont.mono(9, 500)).foregroundColor(.black.opacity(0.7)).padding(8)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                }
                VStack(alignment: .leading) {
                    Text("\(index)").font(BFont.mono(9)).opacity(0.5)
                    Spacer()
                    Text(label).font(BFont.sans(15, 500))
                }
                .foregroundColor(on ? Color(hex: 0x111211) : T.fg)
                .padding(10)
            }
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 0)
                .onChanged { d in
                    let x = max(0, min(1, d.location.x / max(1, g.size.width))), y = max(0, min(1, d.location.y / max(1, g.size.height)))
                    let v = Float(1 - 0.65 * y)
                    if touch == nil {
                        if xOn { saved = model.param(xParam, track); apply(x) }
                        vel = v
                        model.padNoteOn(track, note, v)
                    } else if xOn { apply(x) }
                    touch = CGPoint(x: x * g.size.width, y: y * g.size.height)
                }
                .onEnded { _ in
                    model.padNoteOff(track, note)
                    if let s = saved { model.setParam(xParam, track, s) }
                    saved = nil; touch = nil
                })
        }
        .aspectRatio(track >= 6 && xParam.group == 1 ? 1 : 1.25, contentMode: .fit)
    }
    private func apply(_ x: Double) {
        let v = xMap(x)
        model.setParam(xParam, track, Float(max(Double(xParam.lo), min(Double(xParam.hi), v))))
    }
}
