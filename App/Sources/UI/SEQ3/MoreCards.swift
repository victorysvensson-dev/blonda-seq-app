import SwiftUI

// MARK: - Pads

struct PadsCard: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var full = FullStore.shared
    var body: some View {
        Card(style: .glass, title: [("Pads · 1–0 ", false), (model.recording ? "● rec" : "", true)]) {
            if full.key == "pads" { MPCPads() } else {   // full screen: play them like an MPC
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 5), spacing: 9) {
                ForEach(0..<10, id: \.self) { i in Pad(track: i) }
            }
            }
        }
    }
}

struct Pad: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30)) { _ in
            let lit = model.flash(track, 0.12) > 0, col = model.trackColor(track)
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 10, style: .continuous).fill(lit ? col : Color.white.opacity(0.05))
                    .shadow(color: lit ? col : Color.clear, radius: 12)
                RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(.white.opacity(lit ? 0.45 : 0.14), lineWidth: 1)
                VStack(alignment: .leading) {
                    HStack {
                        Text(model.trackSub(track).lowercased()).font(BFont.mono(9)).tracking(0.36).opacity(0.6)
                        Spacer()
                        Circle().fill(lit ? Color.white : col).frame(width: 8, height: 8)
                            .overlay(Circle().strokeBorder(.black.opacity(0.2), lineWidth: 1))
                            .shadow(color: lit ? Color.white : Color.clear, radius: 4)
                    }
                    Spacer()
                    Text(model.trackShort(track)).font(BFont.sans(14, 500)).tracking(-0.14)
                }
                .foregroundColor(lit ? Color(hex: 0x111211) : T.fg)
                .padding(.horizontal, 9).padding(.top, 9).padding(.bottom, 8)
            }
            .frame(height: 78)
            .contentShape(Rectangle())
            .onTapGesture { model.hitPad(track) }
        }
    }
}

// MARK: - Mixer (faders follow the track level; drag to change)

struct MixerCard: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var full = FullStore.shared
    var body: some View {
        let act = (0..<10).filter { !model.isMuted($0) }.count
        Card(style: .glass, title: [("Mixer · ", false), ("\(act) av 10 kanaler" + (model.soloTrack >= 0 ? " · solo \(model.trackShort(model.soloTrack))" : ""), true)]) {
            if full.key == "mixer" {
                MixerDesk()
            } else {
                HStack(spacing: 4) {
                    ForEach(0..<10, id: \.self) { i in Strip(track: i) }
                    Strip(track: -1)
                }
                .frame(height: 300)
            }
        }
    }
}

/// Full screen: a classic mixing desk (web: .fullhost .mixer) — per channel echo / space sends, tone and pan as knobs,
/// mute / solo, a long fader with a dB scale and a name plate at the bottom.
struct MixerDesk: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<10, id: \.self) { i in DeskStrip(track: i) }
            DeskStrip(track: -1)
        }
        .frame(minHeight: 560)
    }
}

private struct DeskStrip: View {
    @EnvironmentObject var model: EngineModel
    let track: Int   // -1 = master
    var body: some View {
        let master = track < 0, t = max(0, track)
        let col = master ? Color(hex: 0xE9C54A) : model.trackColor(track)
        let def = master ? kMasterParams[6] : kTrackParams[0]
        let v = Double(model.param(def, t))
        let sel = !master && model.selectedTrack == track
        VStack(spacing: 10) {
            Text(master ? "M" : "\(track + 1)").font(BFont.mono(8, 600)).foregroundColor(Color(hex: 0x111111))
                .frame(width: 18, height: 18).background(Circle().fill(master ? Color(hex: 0xE9C54A) : col))
            VStack(spacing: 8) {
                if master { Spacer(minLength: 0) } else {
                    ForEach([5, 6, 1, 4], id: \.self) { i in DeskKnob(def: kTrackParams[i], track: track, tint: col) }
                }
            }
            .frame(height: 236)
            .padding(.bottom, 8)
            .overlay(Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1), alignment: .bottom)
            GeometryReader { geo in
                let h = geo.size.height, y = h * (1 - v)
                ZStack(alignment: .top) {
                    Capsule().fill(.black.opacity(0.35)).frame(width: 6).overlay(Capsule().strokeBorder(.white.opacity(0.08)))
                    Capsule().fill(LinearGradient(colors: [col, col.opacity(0.45)], startPoint: .top, endPoint: .bottom)).frame(width: 6, height: max(0, h - y)).offset(y: y)
                    VStack(spacing: 0) { ForEach(["+0", "-5", "-12", "-24", "-∞"], id: \.self) { l in Text(l).font(BFont.mono(7)).foregroundColor(.white.opacity(0.35)); if l != "-∞" { Spacer(minLength: 0) } } }
                        .frame(maxWidth: .infinity, alignment: .trailing).padding(.trailing, 2)
                    RoundedRectangle(cornerRadius: 4).fill(LinearGradient(colors: [.white, Color(hex: 0xD6D6D0)], startPoint: .top, endPoint: .bottom))
                        .overlay(Rectangle().fill(.black.opacity(0.35)).frame(height: 1))
                        .frame(width: 38, height: 20).shadow(color: .black.opacity(0.45), radius: 4, y: 3).offset(y: y - 10)
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 0).onChanged { g in model.setParam(def, t, Float(1 - g.location.y / h)) })
                .onTapGesture(count: 2) { model.setParam(def, t, master ? 0.75 : DedKnob.defaultValue(def, t)) }
            }
            Text(String(format: "%.1f", v > 0.001 ? 20 * log10(v / 0.75) : -60)).font(BFont.mono(10)).foregroundColor(T.fg)
            if master { Color.clear.frame(height: 24) } else {
                HStack(spacing: 4) {
                    Button { model.toggleMute(track) } label: { mini("M", on: model.isMuted(track), Color(hex: 0xE5484D)) }.buttonStyle(.plain)
                    Button { model.toggleSolo(track) } label: { mini("S", on: model.soloTrack == track, T.yellow) }.buttonStyle(.plain)
                }
            }
            Text(master ? "master" : model.trackShort(track, max: 10)).font(BFont.mono(10)).lineLimit(1)
                .foregroundColor(master || sel ? Color(hex: 0x111211) : T.fg)
                .frame(maxWidth: .infinity).padding(.vertical, 5)
                .background(RoundedRectangle(cornerRadius: 3).fill(master ? Color(hex: 0xE9C54A) : (sel ? col : Color.white.opacity(0.08))))
                .padding(.horizontal, 2)
                .onTapGesture { if !master { model.selectedTrack = track } }
        }
        .padding(.vertical, 12).padding(.horizontal, 4)
        .frame(maxWidth: .infinity)
        .background(RoundedRectangle(cornerRadius: 10).fill(master ? Color(hex: 0xE9C54A).opacity(0.14) : Color.white.opacity(sel ? 0.1 : 0.04)))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(.white.opacity(sel ? 0.18 : 0.06)))
    }
    private func mini(_ s: String, on: Bool, _ c: Color) -> some View {
        Text(s).font(BFont.mono(10, 600)).foregroundColor(on ? .black : T.mute).frame(width: 26, height: 24)
            .background(RoundedRectangle(cornerRadius: 5).fill(on ? c : .white.opacity(0.08)))
    }
}

/// a small send / tone / pan knob for the desk: drag up / down, double tap = default
private struct DeskKnob: View {
    @EnvironmentObject var model: EngineModel
    let def: ParamDef
    let track: Int
    let tint: Color
    var body: some View {
        let v = model.param(def, track), f = CGFloat((v - def.lo) / (def.hi - def.lo)) * 0.75
        let a: CGFloat = def.lo < 0 ? min(0.375, f) : 0, b: CGFloat = def.lo < 0 ? max(0.375, f) : f
        VStack(spacing: 2) {
            ZStack {
                Circle().trim(from: 0, to: 0.75).stroke(Color.white.opacity(0.16), style: StrokeStyle(lineWidth: 2.4, lineCap: .round)).rotationEffect(.degrees(135))
                Circle().trim(from: a, to: b).stroke(tint, style: StrokeStyle(lineWidth: 2.4, lineCap: .round)).rotationEffect(.degrees(135))
                Rectangle().fill(Color.white).frame(width: 2, height: 9).offset(y: -9).rotationEffect(.degrees(-135 + Double(f / 0.75) * 270))
            }
            .frame(width: 32, height: 32)
            .modifier(ParamDrag(def: def, track: track, horizontal: false, points: 160))
            .onTapGesture(count: 2) { model.setParam(def, track, DedKnob.defaultValue(def, track)) }
            Text(def.label).font(BFont.mono(8)).foregroundColor(.white.opacity(0.5))
            Text(def.text(v)).font(BFont.mono(9)).foregroundColor(.white.opacity(0.85))
        }
    }
}

struct Strip: View {
    @EnvironmentObject var model: EngineModel
    let track: Int          // -1 = master
    var body: some View {
        let master = track < 0
        let def = master ? kMasterParams[6] : kTrackParams[0]
        let v = Double(model.param(def, max(0, track)))
        let col = master ? Color(hex: 0xE9C54A) : model.trackColor(track)
        VStack(spacing: 8) {
            Text(master ? "M" : "\(track + 1)").font(BFont.mono(8, 600)).foregroundColor(Color(hex: 0x111111))
                .frame(width: 16, height: 16).background(Circle().fill(master ? Color(hex: 0xA08A50) : col))
            Text(master ? "master" : model.trackShort(track, max: 9)).font(BFont.mono(9)).foregroundColor(T.mute).lineLimit(1)
            Circle().fill(.white).frame(width: 7, height: 7)
            GeometryReader { geo in
                let h = geo.size.height, y = h * (1 - v)
                ZStack(alignment: .top) {
                    Capsule().fill(.white.opacity(0.12)).frame(width: 4)
                    Capsule().fill(LinearGradient(colors: [col, col.opacity(0.5)], startPoint: .top, endPoint: .bottom)).frame(width: 4, height: h - y).offset(y: y)
                    RoundedRectangle(cornerRadius: 3).fill(LinearGradient(colors: [.white, Color(hex: 0xCFCFCA)], startPoint: .top, endPoint: .bottom))
                        .frame(width: 22, height: 10).shadow(color: .black.opacity(0.4), radius: 3, y: 2).offset(y: y - 5)
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 0).onChanged { g in
                    model.setParam(def, max(0, track), Float(1 - g.location.y / h))
                })
            }
            Text(String(format: "%.1f", v > 0.001 ? 20 * log10(v / 0.75) : -60)).font(BFont.mono(8.5)).foregroundColor(T.mute)
            if !master {
                HStack(spacing: 3) {
                    Button { model.toggleMute(track) } label: { Text("m").font(BFont.mono(8)).foregroundColor(model.isMuted(track) ? .black : T.mute).frame(width: 14, height: 14).background(RoundedRectangle(cornerRadius: 3).fill(model.isMuted(track) ? Color(hex: 0xE5484D) : .white.opacity(0.07))) }.buttonStyle(.plain)
                    Button { model.toggleSolo(track) } label: { Text("s").font(BFont.mono(8)).foregroundColor(model.soloTrack == track ? .black : T.mute).frame(width: 14, height: 14).background(RoundedRectangle(cornerRadius: 3).fill(model.soloTrack == track ? T.yellow : .white.opacity(0.07))) }.buttonStyle(.plain)
                }
            } else { Color.clear.frame(height: 14) }
        }
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .background(RoundedRectangle(cornerRadius: 10).fill(master ? Color(hex: 0xA08A50).opacity(0.18) : Color.white.opacity(0.04)))
    }
}

// MARK: - Song chain (visual)

struct SongCard: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let on = model.songMode
        let filled = (0..<8).filter { model.chainSlot($0) >= 0 }.count
        let read = on ? (model.playing && model.chainIdx >= 0 ? "del \(model.chainIdx + 1) av \(filled)" : "på") : "av"
        Card(style: .glass, title: [("Låt · ", false), (read, true)], extra: AnyView(
            Button { model.toggleSong() } label: {
                Text("Låtläge").font(BFont.sans(10, 500)).foregroundColor(on ? T.ink : T.fg)
                    .padding(.horizontal, 10).frame(height: 26)
                    .background(Capsule().fill(on ? T.fg : Color.white.opacity(0.12)))
            }
            .buttonStyle(PressScale())
        )) {
            HStack(spacing: 6) {
                ForEach(0..<8, id: \.self) { k in slot(k, on) }
            }
        }
    }

    private func slot(_ k: Int, _ on: Bool) -> some View {
        let v = model.chainSlot(k)
        let cur = on && model.playing && k == model.chainIdx
        let ink: Color = cur ? Color(hex: 0x111211) : (v < 0 ? T.mute : T.fg)
        return Button { model.cycleChain(k) } label: {
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 8).fill(cur ? T.yellow : Color.white.opacity(0.06))
                RoundedRectangle(cornerRadius: 8).strokeBorder(cur ? Color.clear : Color.white.opacity(v < 0 ? 0.12 : 0.14), lineWidth: 1)
                Text("\(k + 1)").font(BFont.mono(9, 500)).foregroundColor(ink.opacity(0.6)).padding(6)
                DotMatrixText(text: v < 0 ? "+" : ["A", "B", "C", "D"][v], height: 16, color: ink.opacity(v < 0 ? 0.6 : 0.9))
                    .padding(6).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
            }
            .aspectRatio(1 / 0.9, contentMode: .fit)
            .animation(.easeOut(duration: 0.15), value: cur)
        }
        .buttonStyle(PressScale())
    }
}
