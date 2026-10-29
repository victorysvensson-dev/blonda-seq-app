import SwiftUI

/// One parameter: name, range, how to show it. Same names/ranges as the web version.
struct ParamDef: Identifiable {
    let group: Int, field: Int, label: String, lo: Float, hi: Float
    var id: String { "\(group).\(field)" }
    func text(_ v: Float) -> String {
        switch (group, field) {
        case (0, 1): return (v > 0 ? "+" : "") + String(Int(v.rounded()))            // tune, semitones
        case (0, 4): return abs(v) < 0.02 ? "C" : (v < 0 ? "L" : "R") + String(Int(abs(v) * 100))
        case (1, 1), (2, 0): return abs(v) < 0.02 ? "AV" : (v < 0 ? "LP" : "HP") + String(Int(abs(v) * 100))
        default: return v < 0.005 && group == 1 ? "AV" : String(Int((v * 100).rounded()))
        }
    }
}

let kTrackParams: [ParamDef] = [
    ParamDef(group: 0, field: 0, label: "nivå", lo: 0, hi: 1), ParamDef(group: 0, field: 3, label: "ton", lo: 0, hi: 1),
    ParamDef(group: 0, field: 2, label: "decay", lo: 0, hi: 1), ParamDef(group: 0, field: 1, label: "tune", lo: -12, hi: 12),
    ParamDef(group: 0, field: 4, label: "pan", lo: -1, hi: 1), ParamDef(group: 0, field: 5, label: "eko", lo: 0, hi: 1),
    ParamDef(group: 0, field: 6, label: "rymd", lo: 0, hi: 1),
]
let kFxParams: [ParamDef] = [
    ParamDef(group: 1, field: 0, label: "drive", lo: 0, hi: 1), ParamDef(group: 1, field: 1, label: "filter", lo: -1, hi: 1),
    ParamDef(group: 1, field: 2, label: "reso", lo: 0, hi: 1), ParamDef(group: 1, field: 3, label: "crush", lo: 0, hi: 1),
    ParamDef(group: 1, field: 4, label: "komp", lo: 0, hi: 1), ParamDef(group: 1, field: 5, label: "pump", lo: 0, hi: 1.5),
]
let kMasterParams: [ParamDef] = [
    ParamDef(group: 2, field: 0, label: "filter", lo: -1, hi: 1), ParamDef(group: 2, field: 3, label: "drive", lo: 0, hi: 1),
    ParamDef(group: 2, field: 1, label: "eko", lo: 0, hi: 1), ParamDef(group: 2, field: 2, label: "rymd", lo: 0, hi: 1),
    ParamDef(group: 2, field: 4, label: "pump", lo: 0, hi: 1), ParamDef(group: 2, field: 5, label: "swing", lo: 0, hi: 1),
    ParamDef(group: 2, field: 6, label: "volym", lo: 0, hi: 1),
]

/// Sound panel for the selected track + master. Drag sideways on a value (fine with two fingers' worth of travel),
/// double-tap resets bipolar values to centre.
struct SoundPanel: View {
    @EnvironmentObject var model: EngineModel
    @State private var page = 0
    var body: some View {
        let t = kTracks[model.selectedTrack]
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                ForEach(Array(["ljud", "fx", "master"].enumerated()), id: \.offset) { i, name in
                    Button(name) { page = i }
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .padding(.horizontal, 12).frame(height: 26)
                        .background(page == i ? Color.white : Color.white.opacity(0.08), in: Capsule())
                        .foregroundStyle(page == i ? Color.black : Color.white)
                }
                Spacer()
                if page < 2 {
                    Circle().fill(t.color).frame(width: 8, height: 8)
                    Text(t.name.lowercased()).font(.system(size: 12, weight: .bold, design: .monospaced)).foregroundStyle(.white.opacity(0.7))
                }
            }
            let defs = page == 0 ? kTrackParams : page == 1 ? kFxParams : kMasterParams
            HStack(spacing: 6) {
                ForEach(defs) { d in
                    ParamSlider(def: d, track: model.selectedTrack, color: page == 2 ? Color(hex: 0xFFD21F) : t.color)
                }
            }
        }
        .padding(10)
        .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct ParamSlider: View {
    @EnvironmentObject var model: EngineModel
    let def: ParamDef
    let track: Int
    let color: Color
    @State private var start: Float?
    var body: some View {
        let v = model.param(def, track)
        let bipolar = def.lo < 0
        let x = CGFloat((v - def.lo) / (def.hi - def.lo))
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 10).fill(Color.white.opacity(0.06))
                if bipolar {
                    let c = geo.size.width / 2, px = x * geo.size.width
                    Rectangle().fill(color.opacity(0.55)).frame(width: abs(px - c), height: geo.size.height).offset(x: min(px, c))
                } else {
                    Rectangle().fill(color.opacity(0.55)).frame(width: x * geo.size.width, height: geo.size.height)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text(def.label).font(.system(size: 10, weight: .semibold, design: .monospaced)).opacity(0.7)
                    Text(def.text(v)).font(.system(size: 15, weight: .bold, design: .monospaced))
                }
                .padding(.leading, 8).foregroundStyle(.white)
            }
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 2).onChanged { g in
                if start == nil { start = v }
                let span = def.hi - def.lo
                model.setParam(def, track, start! + Float(g.translation.width / max(geo.size.width, 1)) * span)
            }.onEnded { _ in start = nil })
            .onTapGesture(count: 2) { if bipolar { model.setParam(def, track, 0) } }
        }
        .frame(height: 52)
    }
}
