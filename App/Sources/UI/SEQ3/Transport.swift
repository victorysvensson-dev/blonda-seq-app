import SwiftUI

/// The yellow transport at the bottom: dot-matrix clock, bar·beat, 16 progress dots, keyboard / record / play.
struct TransportBar: View {
    @EnvironmentObject var model: EngineModel
    @Binding var showKeys: Bool
    var body: some View {
        HStack(alignment: .center, spacing: 0) {
            TimelineView(.periodic(from: .now, by: 0.25)) { _ in
                let el = model.playing ? max(0, CACurrentMediaTime() - model.playStart) : 0
                HStack(alignment: .bottom, spacing: 10) {
                    DotMatrixText(text: String(format: "%02d:%02d", Int(el) / 60, Int(el) % 60), height: 42, color: T.ink)
                    Text(String(format: "%02d·%d", model.bar + 1, max(0, model.step) / 4 + 1))
                        .font(BFont.linje(11)).fontWeight(.medium).tracking(0.44).foregroundColor(T.ink.opacity(0.65))
                        .padding(.bottom, -2)
                }
            }
            .padding(.leading, 18)
            HStack(spacing: 7.2) {
                ForEach(0..<16, id: \.self) { k in
                    Circle().fill(model.step >= 0 && model.playing && k <= model.step ? T.ink : T.ink.opacity(0.2)).frame(width: 8, height: 8)
                }
            }
            .padding(.leading, 14)
            Spacer()
            HStack(spacing: 8) {
                Button { showKeys.toggle() } label: {
                    ZStack {
                        Circle().strokeBorder(T.ink, lineWidth: 2)
                        Canvas { c, size in
                            let s = size.width / 24
                            let frame = SVGPath.parse("M5.1 4.5h13.8a2.6 2.6 0 0 1 2.6 2.6v9.8a2.6 2.6 0 0 1-2.6 2.6H5.1a2.6 2.6 0 0 1-2.6-2.6V7.1a2.6 2.6 0 0 1 2.6-2.6z").applying(.init(scaleX: s, y: s))
                            c.stroke(frame, with: .color(T.ink), lineWidth: 2 * s)
                            c.fill(SVGPath.parse("M5.95 4.5h2.6v7.6h-2.6zM10.7 4.5h2.6v7.6h-2.6zM15.45 4.5h2.6v7.6h-2.6z").applying(.init(scaleX: s, y: s)), with: .color(T.ink))
                            c.stroke(SVGPath.parse("M7.25 12v7M12 12v7M16.75 12v7").applying(.init(scaleX: s, y: s)), with: .color(T.ink), lineWidth: 1.6 * s)
                        }
                        .frame(width: 24, height: 24)
                    }
                    .frame(width: 54, height: 54)
                }
                .buttonStyle(.plain)
                Button { model.toggleRecord() } label: {
                    ZStack {
                        Circle().fill(model.recording ? T.ink : Color.clear)
                        Circle().strokeBorder(T.ink, lineWidth: 2)
                        TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: !model.recording)) { tl in
                            let p = model.recording ? 0.5 + 0.5 * cos(tl.date.timeIntervalSinceReferenceDate * 2 * .pi) : 1
                            Circle().fill(Color(hex: 0xFF4A33)).frame(width: 16, height: 16).opacity(0.45 + 0.55 * p)
                        }
                    }
                    .frame(width: 54, height: 54)
                }
                .buttonStyle(PressScale())
                Button { model.togglePlay() } label: {
                    ZStack {
                        Circle().fill(T.ink)
                        if model.playing {
                            HStack(spacing: 4) { RoundedRectangle(cornerRadius: 1).frame(width: 4, height: 14); RoundedRectangle(cornerRadius: 1).frame(width: 4, height: 14) }.foregroundColor(T.fg)
                        } else {
                            SVGIcon(d: "M7 4.5v15l13-7.5z", box: 24, size: 22, stroke: nil, fill: true).foregroundColor(T.fg)
                        }
                    }
                    .frame(width: 54, height: 54)
                }
                .buttonStyle(.plain)
            }
            .padding(.trailing, 16)
        }
        .frame(height: 72, alignment: .center)
        .padding(.top, 2)
        .frame(maxWidth: .infinity)
        .background(
            UnevenRoundedRectangle(cornerRadii: .init(topLeading: 26, topTrailing: 26)).fill(T.yellow)
                .shadow(color: .black.opacity(0.45), radius: 30, y: -12)
        )
        .overlay(alignment: .top) { DeckTab() }
    }
}

/// Intro: the whole app blurred behind a dot-matrix "SEQ.3" and the yellow start pill (the web's .start overlay).
struct StartOverlay: View {
    var onStart: () -> Void
    var body: some View {
        VStack(spacing: 18) {
            DotMatrixText(text: "SEQ.3", height: 96, color: T.fg)
            Text("TRYCK FÖR ATT STARTA LJUDET")
                .font(BFont.mono(12)).tracking(1.44).foregroundColor(Color(hex: 0x111111))
                .padding(.horizontal, 26).padding(.vertical, 15)
                .background(Capsule().fill(T.yellow))
                .shadow(color: T.yellow.opacity(0.75), radius: 20, y: 14)
            Text("Dra korten i handtaget uppe till höger för att flytta dem. Hör du inget på iPhone? Stäng av tyst-läget.")
                .font(BFont.mono(11)).foregroundColor(T.mute).multilineTextAlignment(.center).lineSpacing(5)
                .frame(maxWidth: 230).opacity(0.8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(rgb: 10, 10, 14, 0.25))
        .contentShape(Rectangle())
        .onTapGesture(perform: onStart)
    }
}

/// The tab on top of the transport: tap or pull up for the yellow master deck (web: the deck that pulls up).
private struct DeckTab: View {
    @State private var pull: CGFloat = 0
    var body: some View {
        Capsule().fill(T.ink.opacity(pull < 0 ? 0.55 : 0.3)).frame(width: pull < 0 ? 52 : 40, height: 5)
            .frame(width: 180, height: 20, alignment: .top)
            .contentShape(Rectangle())
            .onTapGesture { DrawerState.shared.setDeck(true) }
            .gesture(DragGesture(minimumDistance: 3)
                .onChanged { g in pull = g.translation.height }
                .onEnded { g in if g.translation.height < -24 || g.predictedEndTranslation.height < -120 { DrawerState.shared.setDeck(true) }; pull = 0 })
            .accessibilityLabel("Öppna mastervyn")
    }
}
