import SwiftUI

/// 10 tracks x 16 steps. Tap a cell: off -> on -> accent -> off. Tap a track name: select it for the keyboard/MIDI.
/// Long-press a track name: mute.
struct GridView: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        GeometryReader { geo in
            let labelW: CGFloat = min(88, geo.size.width * 0.16)
            let gap: CGFloat = 4
            let cellW = (geo.size.width - labelW - gap * 16) / 16
            let rowH = (geo.size.height - gap * 9) / 10
            VStack(spacing: gap) {
                ForEach(kTracks) { t in
                    HStack(spacing: gap) {
                        TrackLabel(track: t).frame(width: labelW, height: rowH)
                        ForEach(0..<16, id: \.self) { s in
                            StepCell(track: t, step: s, value: model.value(t.id, s), playhead: model.step == s,
                                     muted: model.isMuted(t.id))
                                .frame(width: cellW, height: rowH)
                                .onTapGesture { model.cycle(t.id, s) }
                        }
                    }
                }
            }
            .id(model.revision)
        }
    }
}

struct TrackLabel: View {
    @EnvironmentObject var model: EngineModel
    let track: TrackInfo
    var body: some View {
        let sel = model.selectedTrack == track.id, muted = model.isMuted(track.id)
        VStack(alignment: .leading, spacing: 0) {
            Text(track.name).font(.system(size: 13, weight: .bold, design: .rounded))
            Text(track.melodic ? model.engine.instrument(forTrack: track.id) : track.sub)
                .font(.system(size: 9, weight: .medium, design: .monospaced)).opacity(0.55)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(.leading, 8)
        .foregroundStyle(muted ? Color.white.opacity(0.3) : Color.white)
        .background(RoundedRectangle(cornerRadius: 8).fill(sel ? track.color.opacity(0.35) : Color.white.opacity(0.05)))
        .overlay(alignment: .leading) { Capsule().fill(track.color.opacity(muted ? 0.3 : 1)).frame(width: 3).padding(.vertical, 6) }
        .contentShape(Rectangle())
        .onTapGesture { model.selectedTrack = track.id }
        .onLongPressGesture(minimumDuration: 0.35) { model.toggleMute(track.id) }
    }
}

struct StepCell: View {
    let track: TrackInfo
    let step: Int
    let value: Int
    let playhead: Bool
    let muted: Bool
    var body: some View {
        let beat = step % 4 == 0
        RoundedRectangle(cornerRadius: 6)
            .fill(fill)
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(playhead ? Color.white.opacity(0.9) : Color.clear, lineWidth: 2))
            .overlay(alignment: .bottom) {
                if beat && value == 0 { Circle().fill(Color.white.opacity(0.18)).frame(width: 3, height: 3).padding(.bottom, 4) }
            }
            .contentShape(Rectangle())
    }
    private var fill: Color {
        if value == 0 { return Color.white.opacity(playhead ? 0.14 : 0.06) }
        let c = track.color.opacity(muted ? 0.3 : (value == 2 ? 1.0 : 0.62))
        return c
    }
}
