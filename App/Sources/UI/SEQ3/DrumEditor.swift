import SwiftUI

/// The drum editor (web: #ded) — opened by double-tapping a drum track's name.
/// Sound model (synth kits, tap to listen), "+ sample", the form knobs, and listen / mute / reset.
struct DrumEditor: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        let tc: Color = Color(hex: model.trackHex(track))
        ZStack {
            Rectangle().fill(Color(rgb: 6, 7, 9, 0.5)).ignoresSafeArea().onTapGesture { model.closeDrumEditor() }
            DedPanel(track: track, tc: tc)
                .padding(22)
                .frame(maxWidth: 520)
                .background(DedBackground())
                .shadow(color: .black.opacity(0.55), radius: 30, y: 16)
                .padding(16)
                .id(model.paramRevision)
        }
    }
}

private struct DedBackground: View {
    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 26, style: .continuous)
        let grad = LinearGradient(colors: [Color(rgb: 40, 40, 46, 0.94), Color(rgb: 18, 18, 22, 0.97)], startPoint: UnitPoint(x: 0.2, y: 0), endPoint: UnitPoint(x: 0.8, y: 1))
        return shape.fill(grad).overlay(shape.strokeBorder(Color.white.opacity(0.08)))
    }
}

private struct DedPanel: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let tc: Color
    private let order: [Int] = [0, 3, 2, 1, 4, 5, 6]
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            DedHeader(track: track, tc: tc)
            DedLabel(text: "ljudmodell · tryck för att lyssna")
            DedKits(track: track, tc: tc)
            DedLabel(text: "form")
            HStack(spacing: 4) {
                ForEach(order, id: \.self) { i in DedKnob(def: kTrackParams[i], track: track, tint: tc) }
            }
            HStack(spacing: 8) {
                DedButton(title: "▶ provlyssna", on: false, tint: tc) { model.hitPad(track) }
                DedButton(title: "mute", on: model.isMuted(track), tint: tc) { model.toggleMute(track) }
                DedButton(title: "återställ", on: false, tint: tc) { model.resetDrum(track) }
            }
        }
    }
}

private struct DedLabel: View {
    let text: String
    var body: some View { Text(text).font(BFont.mono(8.5)).tracking(0.6).foregroundColor(Color.white.opacity(0.4)) }
}

private struct DedHeader: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let tc: Color
    var body: some View {
        let sub: String = model.drumSampleMeta(track).map { "sample · \($0.name)" } ?? model.trackSub(track).lowercased()
        HStack(spacing: 10) {
            Text("\(track + 1)").font(BFont.mono(11, 500)).foregroundColor(Color.black)
                .frame(width: 24, height: 24).background(Circle().fill(tc))
            VStack(alignment: .leading, spacing: 1) {
                Text(kTracks[track].name.lowercased()).font(BFont.sans(20, 300)).foregroundColor(Color.white)
                Text(sub).font(BFont.mono(9)).tracking(0.5).foregroundColor(Color.white.opacity(0.45)).lineLimit(1)
            }
            Spacer()
            Button { model.closeDrumEditor() } label: {
                Image(systemName: "xmark").font(.system(size: 12, weight: .semibold)).foregroundColor(Color.white.opacity(0.7))
                    .frame(width: 30, height: 30).background(Circle().fill(Color.white.opacity(0.08)))
            }.buttonStyle(.plain).keyboardShortcut(.cancelAction)
        }
    }
}

private struct DedKits: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    let tc: Color
    var body: some View {
        let kits: [(String, String, String)] = kDrumKits[track]
        let cur: String = model.kit(track)
        let smp: SampleMeta? = model.drumSampleMeta(track)
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 84), spacing: 8)], spacing: 8) {
            ForEach(kits, id: \.0) { k in
                Button { model.setKit(track, k.0) } label: {
                    DedTile(title: k.1, tag: k.2, on: smp == nil && cur == k.0, dashed: false, tc: tc)
                }.buttonStyle(.plain)
            }
            Button { model.closeDrumEditor(); model.openLibrary("hit", target: .drum(track)) } label: {
                DedTile(title: smp == nil ? "+ sample" : "byt sample", tag: smp?.name ?? "från biblioteket", on: smp != nil, dashed: smp == nil, tc: tc)
            }.buttonStyle(.plain)
        }
    }
}

private struct DedTile: View {
    let title: String
    let tag: String
    let on: Bool
    let dashed: Bool
    let tc: Color
    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)
        let fill: Color = on ? tc : (dashed ? Color.clear : Color.white.opacity(0.06))
        let stroke: Color = Color.white.opacity(on ? 0 : (dashed ? 0.25 : 0.08))
        let dash: [CGFloat] = dashed ? [4, 3] : []
        VStack(alignment: .leading, spacing: 3) {
            Text(title).font(BFont.sans(14, on ? 500 : 300)).foregroundColor(on ? Color.black : Color.white)
            Text(tag).font(BFont.mono(8)).foregroundColor(on ? Color.black.opacity(0.6) : Color.white.opacity(0.4)).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 10).padding(.vertical, 9)
        .background(shape.fill(fill))
        .overlay(shape.strokeBorder(stroke, style: StrokeStyle(lineWidth: 1, dash: dash)))
    }
}

private struct DedKnob: View {
    @EnvironmentObject var model: EngineModel
    let def: ParamDef
    let track: Int
    let tint: Color
    var body: some View {
        let v: Float = model.param(def, track)
        let f: CGFloat = CGFloat((v - def.lo) / (def.hi - def.lo)) * 0.75
        let a: CGFloat = def.lo < 0 ? min(0.375, f) : 0
        let b: CGFloat = def.lo < 0 ? max(0.375, f) : f
        let di: Int = kTrackParams.firstIndex(where: { $0.id == def.id }) ?? 0
        let dv: Float = kDrumDefaults[track][di]
        VStack(spacing: 6) {
            ZStack {
                Circle().trim(from: 0, to: 0.75).stroke(Color.white.opacity(0.1), style: StrokeStyle(lineWidth: 3, lineCap: .round)).rotationEffect(.degrees(135))
                Circle().trim(from: a, to: b)
                    .stroke(tint, style: StrokeStyle(lineWidth: 3, lineCap: .round)).rotationEffect(.degrees(135))
                Text(def.text(v)).font(BFont.mono(9.5)).foregroundColor(Color.white.opacity(0.85))
            }
            .frame(width: 46, height: 46)
            .modifier(ParamDrag(def: def, track: track, horizontal: false, points: 150))
            .onTapGesture(count: 2) { model.setParam(def, track, dv) }
            Text(def.label).font(BFont.mono(8)).tracking(0.4).foregroundColor(Color.white.opacity(0.45))
        }
        .frame(maxWidth: .infinity)
    }
}

private struct DedButton: View {
    let title: String
    let on: Bool
    let tint: Color
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(BFont.mono(9.5)).tracking(0.4).foregroundColor(on ? .black : .white.opacity(0.8))
                .frame(maxWidth: .infinity).frame(height: 34)
                .background(Capsule().fill(on ? tint : Color.white.opacity(0.07)))
        }.buttonStyle(.plain)
    }
}
