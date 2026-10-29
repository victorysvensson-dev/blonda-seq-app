import SwiftUI

/// The drum editor (web: #ded) — opened by double-tapping a drum track's name.
/// Sound model (synth kits, tap to listen), "+ sample", the form knobs, and listen / mute / reset.
struct DrumEditor: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    var body: some View {
        let col = model.trackHex(track), tc = Color(hex: col)
        let kits = kDrumKits[track], cur = model.kit(track), smp = model.drumSampleMeta(track)
        ZStack {
            Rectangle().fill(Color(rgb: 6, 7, 9, 0.5)).ignoresSafeArea().onTapGesture { model.closeDrumEditor() }
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 10) {
                    Text("\(track + 1)").font(BFont.mono(11, 500)).foregroundColor(.black)
                        .frame(width: 24, height: 24).background(Circle().fill(tc))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(kTracks[track].name.lowercased()).font(BFont.sans(20, 300)).foregroundColor(.white)
                        Text(smp.map { "sample · \($0.name)" } ?? kTracks[track].sub.lowercased()).font(BFont.mono(9)).tracking(0.5).foregroundColor(.white.opacity(0.45)).lineLimit(1)
                    }
                    Spacer()
                    Button { model.closeDrumEditor() } label: {
                        Image(systemName: "xmark").font(.system(size: 12, weight: .semibold)).foregroundColor(.white.opacity(0.7))
                            .frame(width: 30, height: 30).background(Circle().fill(Color.white.opacity(0.08)))
                    }.buttonStyle(.plain).keyboardShortcut(.cancelAction)
                }
                Text("ljudmodell · tryck för att lyssna").font(BFont.mono(8.5)).tracking(0.6).foregroundColor(.white.opacity(0.4))
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 84), spacing: 8)], spacing: 8) {
                    ForEach(kits, id: \.0) { k in
                        let on = smp == nil && cur == k.0
                        Button { model.setKit(track, k.0) } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(k.1).font(BFont.sans(14, on ? 500 : 300)).foregroundColor(on ? .black : .white)
                                Text(k.2).font(BFont.mono(8)).foregroundColor(on ? .black.opacity(0.6) : .white.opacity(0.4)).lineLimit(1)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 10).padding(.vertical, 9)
                            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(on ? tc : Color.white.opacity(0.06)))
                            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.white.opacity(on ? 0 : 0.08)))
                        }.buttonStyle(.plain)
                    }
                    Button { model.closeDrumEditor(); model.openLibrary("hit", target: .drum(track)) } label: {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(smp == nil ? "+ sample" : "byt sample").font(BFont.sans(14, smp == nil ? 300 : 500)).foregroundColor(smp == nil ? .white : .black)
                            Text(smp?.name ?? "från biblioteket").font(BFont.mono(8)).foregroundColor(smp == nil ? .white.opacity(0.4) : .black.opacity(0.6)).lineLimit(1)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 10).padding(.vertical, 9)
                        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(smp == nil ? Color.clear : tc))
                        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.white.opacity(0.25), style: StrokeStyle(lineWidth: 1, dash: smp == nil ? [4, 3] : [])))
                    }.buttonStyle(.plain)
                }
                Text("form").font(BFont.mono(8.5)).tracking(0.6).foregroundColor(.white.opacity(0.4))
                HStack(spacing: 4) {
                    ForEach([0, 3, 2, 1, 4, 5, 6], id: \.self) { i in DedKnob(def: kTrackParams[i], track: track, tint: tc) }
                }
                HStack(spacing: 8) {
                    DedButton(title: "▶ provlyssna", on: false, tint: tc) { model.hitPad(track) }
                    DedButton(title: "mute", on: model.isMuted(track), tint: tc) { model.toggleMute(track) }
                    DedButton(title: "återställ", on: false, tint: tc) { model.resetDrum(track) }
                }
            }
            .padding(22)
            .frame(maxWidth: 520)
            .background(RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(LinearGradient(colors: [Color(rgb: 40, 40, 46, 0.94), Color(rgb: 18, 18, 22, 0.97)], startPoint: UnitPoint(x: 0.2, y: 0), endPoint: UnitPoint(x: 0.8, y: 1))))
            .overlay(RoundedRectangle(cornerRadius: 26, style: .continuous).strokeBorder(Color.white.opacity(0.08)))
            .shadow(color: .black.opacity(0.55), radius: 30, y: 16)
            .padding(16)
            .id(model.paramRevision)
        }
    }
}

private struct DedKnob: View {
    @EnvironmentObject var model: EngineModel
    let def: ParamDef
    let track: Int
    let tint: Color
    var body: some View {
        let v = model.param(def, track)
        let f = Double((v - def.lo) / (def.hi - def.lo))
        let bipolar = def.lo < 0
        VStack(spacing: 6) {
            ZStack {
                Circle().trim(from: 0, to: 0.75).stroke(Color.white.opacity(0.1), style: StrokeStyle(lineWidth: 3, lineCap: .round)).rotationEffect(.degrees(135))
                Circle().trim(from: bipolar ? min(0.375, f * 0.75) : 0, to: bipolar ? max(0.375, f * 0.75) : f * 0.75)
                    .stroke(tint, style: StrokeStyle(lineWidth: 3, lineCap: .round)).rotationEffect(.degrees(135))
                Text(def.text(v)).font(BFont.mono(9.5)).foregroundColor(.white.opacity(0.85))
            }
            .frame(width: 46, height: 46)
            .modifier(ParamDrag(def: def, track: track, horizontal: false, points: 150))
            .onTapGesture(count: 2) { model.setParam(def, track, kDrumDefaults[track][kTrackParams.firstIndex { $0.id == def.id } ?? 0]) }
            Text(def.label).font(BFont.mono(8)).tracking(0.4).foregroundColor(.white.opacity(0.45))
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
