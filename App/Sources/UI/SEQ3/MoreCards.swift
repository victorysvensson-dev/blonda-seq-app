import SwiftUI

// MARK: - Pads

struct PadsCard: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        Card(style: .glass, title: [("Pads · 1–0", false)]) {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 5), spacing: 9) {
                ForEach(0..<10, id: \.self) { i in Pad(track: i) }
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
                    Text(kTracks[track].name.lowercased()).font(BFont.sans(14, 500)).tracking(-0.14)
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

// MARK: - Loops (visual for now)

struct LoopsCard: View {
    var body: some View {
        Card(style: .tinted(T.loopGreen), title: [("Loopar · ", false), ("följer tempot", true)]) {
            VStack(spacing: 6) {
                ForEach(1...4, id: \.self) { n in LoopRow(n: n) }
                HStack {
                    Text("dra in ljudfiler i biblioteket").font(BFont.mono(9.5)).foregroundColor(T.mute)
                    Spacer()
                    Text("bibliotek").font(BFont.sans(12)).foregroundColor(T.fg).padding(.horizontal, 12).frame(height: 28).background(Capsule().fill(.white.opacity(0.08)))
                }
                .padding(.top, 2)
            }
        }
    }
}

struct LoopRow: View {
    let n: Int
    var body: some View {
        HStack(spacing: 10) {
            Circle().fill(.white.opacity(0.07)).frame(width: 22, height: 22).overlay(Circle().fill(T.loopGreen.opacity(0.35)).frame(width: 9, height: 9))
            HStack { Text("loop \(n) · välj").font(BFont.mono(9.5)).tracking(0.5).foregroundColor(T.mute); Spacer() }
                .padding(.horizontal, 12).frame(height: 36)
                .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(.white.opacity(0.18), style: StrokeStyle(lineWidth: 1, dash: [3, 3])))
            ZStack(alignment: .leading) {
                Capsule().fill(.white.opacity(0.14)).frame(width: 70, height: 3)
                Capsule().fill(T.loopGreen).frame(width: 56, height: 3)
                Circle().fill(.white).frame(width: 12, height: 12).shadow(color: .black.opacity(0.4), radius: 4, y: 2).offset(x: 50)
            }
            .frame(width: 70)
            SVGIcon(d: "M3 3l6 6M9 3 3 9", box: 12, size: 10, stroke: 1.4).foregroundColor(T.mute).frame(width: 22, height: 22)
        }
        .padding(.horizontal, 8).padding(.vertical, 7)
        .background(RoundedRectangle(cornerRadius: 12).fill(.white.opacity(0.04)))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(.white.opacity(0.05), lineWidth: 1))
    }
}

// MARK: - Mixer (faders follow the track level; drag to change)

struct MixerCard: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        Card(style: .glass, title: [("Mixer · ", false), ("10 av 10 kanaler", true)]) {
            HStack(spacing: 6) {
                ForEach(0..<10, id: \.self) { i in Strip(track: i) }
                Strip(track: -1)
            }
            .frame(height: 300)
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
            Text(master ? "master" : kTracks[track].name.lowercased()).font(BFont.mono(9)).foregroundColor(T.mute).lineLimit(1)
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
            HStack(spacing: 3) {
                ForEach(["m", "s"], id: \.self) { s in
                    Text(s).font(BFont.mono(8)).foregroundColor(T.mute).frame(width: 14, height: 14).background(RoundedRectangle(cornerRadius: 3).fill(.white.opacity(0.07)))
                }
            }
        }
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .background(RoundedRectangle(cornerRadius: 10).fill(master ? Color(hex: 0xA08A50).opacity(0.18) : Color.white.opacity(0.04)))
    }
}

// MARK: - Song chain (visual)

struct SongCard: View {
    var body: some View {
        Card(style: .glass, title: [("Låt · ", false), ("av", true)], extra: AnyView(
            Text("låtläge").font(BFont.mono(9.5, 500)).foregroundColor(T.fg).padding(.horizontal, 10).frame(height: 22).background(Capsule().fill(.white.opacity(0.12)))
        )) {
            HStack(spacing: 6) {
                ForEach(Array(["A", "A", "B", "B", "A", "A", "C", "D"].enumerated()), id: \.offset) { k, p in
                    ZStack(alignment: .topLeading) {
                        RoundedRectangle(cornerRadius: 8).fill(.white.opacity(0.06))
                        RoundedRectangle(cornerRadius: 8).strokeBorder(.white.opacity(0.12), lineWidth: 1)
                        Text("\(k + 1)").font(BFont.mono(8)).foregroundColor(T.mute).padding(6)
                        DotMatrixText(text: p, height: 16, color: T.fg.opacity(0.8)).padding(6).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                    }
                    .frame(height: 64)
                }
            }
        }
    }
}
