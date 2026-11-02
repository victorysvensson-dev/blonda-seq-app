import SwiftUI
import AVFoundation
#if !targetEnvironment(macCatalyst)
import AVKit
#endif

/// MIDI & ljud (web: the midi panel #mp): which MIDI input plays, follow an external clock, where clock and notes go
/// out, and the audio buffer / output. Everything is remembered between launches.
struct MidiAudioPanel: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        ZStack {
            Rectangle().fill(Color(rgb: 6, 7, 9, 0.55)).ignoresSafeArea().onTapGesture { model.closeMidi() }
            ScrollView { MidiPanelBody().padding(18) }
                .frame(maxWidth: 560)
                .fixedSize(horizontal: false, vertical: true)
                .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(Color(rgb: 24, 24, 27, 0.97))
                    .overlay(RoundedRectangle(cornerRadius: 28, style: .continuous).strokeBorder(Color.white.opacity(0.1))))
                .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                .shadow(color: .black.opacity(0.6), radius: 30, y: 16)
                .padding(14)
        }
    }
}

/// The small dot on the header's midi button: lit when a device is connected, flashes on incoming MIDI.
struct MidiDot: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.12)) { _ in
            let idle = model.engine.midiIdleSeconds, has = model.engine.midiSourceCount > 0
            Circle().fill(idle < 0.15 ? kMidiLime : (has ? Color.white.opacity(0.75) : Color.white.opacity(0.3)))
                .frame(width: 7, height: 7)
                .shadow(color: idle < 0.15 ? kMidiLime.opacity(0.8) : .clear, radius: 4)
        }
    }
}

private let kMidiLime = Color(hex: 0xE2F53C)

private struct MidiPanelBody: View {
    @EnvironmentObject var model: EngineModel
    @State private var buf = 0
    var body: some View {
        let _ = model.midiRev
        let e = model.engine
        let ins = e.midiInputs, outs = e.midiOutputs
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("midi & ljud").font(BFont.sans(20, 400)).foregroundColor(.white)
                Spacer()
                Button { model.closeMidi() } label: {
                    Image(systemName: "xmark").font(.system(size: 13, weight: .semibold)).foregroundColor(.white.opacity(0.8))
                        .frame(width: 38, height: 38).background(Circle().fill(Color.white.opacity(0.08)))
                }.buttonStyle(.plain).keyboardShortcut(.cancelAction)
            }

            MSection(title: "midi in") {
                MRow(label: "enhet") {
                    MDrop(value: name(e.midiInputID, in: ins, none: "alla enheter"),
                          items: [(0, "alla enheter")] + ins.map { (id($0), nm($0)) },
                          selected: e.midiInputID) { e.midiInputID = $0; model.midiRev += 1 }
                }
                MRow(label: "spelar") {
                    Text(kTracks[model.selectedTrack].name.lowercased() + " · valt spår").font(BFont.mono(11)).foregroundColor(.white.opacity(0.75))
                }
                MToggle(title: "följ extern klocka", sub: "tempo, start och stopp från midi in", on: e.midiFollowClock) { e.midiFollowClock = $0; model.midiRev += 1 }
                if ins.isEmpty { MNote(text: "ingen midi-enhet hittad – koppla in en så dyker den upp här") }
                MActivity()
            }

            MSection(title: "midi ut") {
                MRow(label: "enhet") {
                    MDrop(value: name(e.midiOutputID, in: outs, none: "ingen"),
                          items: [(0, "ingen")] + outs.map { (id($0), nm($0)) },
                          selected: e.midiOutputID) { e.midiOutputID = $0; model.midiRev += 1 }
                }
                MToggle(title: "skicka klocka", sub: e.midiFollowClock ? "av när du följer extern klocka" : "24 per slag, start och stopp", on: e.midiSendClock) { e.midiSendClock = $0; model.midiRev += 1 }
                MToggle(title: "skicka noter", sub: "bas kanal 1, keys 2, lead 3, pad 4 · trummor kanal 10", on: e.midiSendNotes) { e.midiSendNotes = $0; model.midiRev += 1 }
                if e.midiOutputID != 0 && !outs.contains(where: { id($0) == e.midiOutputID }) { MNote(text: "den valda enheten är inte inkopplad just nu") }
            }

            MSection(title: "ljud") {
                MRow(label: "utgång") {
                    HStack(spacing: 10) {
                        Text(e.outputName).font(BFont.mono(11)).foregroundColor(.white.opacity(0.85)).lineLimit(1)
                        #if !targetEnvironment(macCatalyst)
                        RoutePicker().frame(width: 30, height: 30)
                        #endif
                    }
                }
                MRow(label: "buffert") {
                    MDrop(value: "\(buf) samples", items: [64, 128, 256, 512, 1024].map { ($0, "\($0) samples") }, selected: closest(buf)) { v in
                        e.ioBufferFrames = v
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { buf = e.ioBufferFrames }
                        buf = v
                    }
                }
                MRow(label: "frekvens") { Text("\(Int(AVAudioSession.sharedInstance().sampleRate)) Hz").font(BFont.mono(11)).foregroundColor(.white.opacity(0.85)) }
                MRow(label: "fördröjning") { Text(String(format: "%.1f ms", e.outputLatency * 1000)).font(BFont.mono(11)).foregroundColor(.white.opacity(0.85)) }
                #if targetEnvironment(macCatalyst)
                MNote(text: "byt ljudutgång i Systeminställningar › Ljud")
                #endif
                MNote(text: "lägre buffert = snabbare svar men mer jobb för datorn")
            }
        }
        .onAppear { buf = model.engine.ioBufferFrames }
    }
    private func id(_ d: [String: Any]) -> Int { (d["id"] as? NSNumber)?.intValue ?? 0 }
    private func nm(_ d: [String: Any]) -> String { d["name"] as? String ?? "midi" }
    private func name(_ v: Int, in list: [[String: Any]], none: String) -> String {
        v == 0 ? none : (list.first { id($0) == v }.map(nm) ?? "frånkopplad")
    }
    private func closest(_ b: Int) -> Int { [64, 128, 256, 512, 1024].min { abs($0 - b) < abs($1 - b) } ?? 256 }
}

private struct MSection<C: View>: View {
    let title: String
    @ViewBuilder let content: C
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(BFont.mono(10, 500)).tracking(0.8).foregroundColor(.white.opacity(0.5))
            VStack(alignment: .leading, spacing: 10) { content }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.white.opacity(0.05))
                    .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Color.white.opacity(0.08))))
        }
    }
}

private struct MRow<C: View>: View {
    let label: String
    @ViewBuilder let content: C
    var body: some View {
        HStack(spacing: 12) {
            Text(label).font(BFont.mono(11)).foregroundColor(.white.opacity(0.55)).frame(width: 86, alignment: .leading)
            content
            Spacer(minLength: 0)
        }
        .frame(minHeight: 40)
    }
}

/// A dropdown: a pill with the current value and a chevron, opening a system menu with check marks.
private struct MDrop: View {
    let value: String
    let items: [(Int, String)]
    let selected: Int
    let pick: (Int) -> Void
    var body: some View {
        Menu {
            ForEach(items.indices, id: \.self) { k in
                let it = items[k]
                Button { pick(it.0) } label: {
                    if it.0 == selected { Label(it.1, systemImage: "checkmark") } else { Text(it.1) }
                }
            }
        } label: {
            HStack(spacing: 10) {
                Text(value).font(BFont.mono(11)).foregroundColor(.white).lineLimit(1).truncationMode(.middle)
                Spacer(minLength: 4)
                Image(systemName: "chevron.down").font(.system(size: 10, weight: .semibold)).foregroundColor(.white.opacity(0.6))
            }
            .padding(.horizontal, 14).frame(height: 38).frame(maxWidth: 300)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.white.opacity(0.08))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.white.opacity(0.12))))
            .contentShape(Rectangle())
        }
        .menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden)
    }
}

private struct MToggle: View {
    let title: String
    let sub: String
    let on: Bool
    let set: (Bool) -> Void
    var body: some View {
        Button { set(!on) } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(BFont.sans(14, 400)).foregroundColor(.white)
                    Text(sub).font(BFont.mono(9)).foregroundColor(.white.opacity(0.5)).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                ZStack(alignment: on ? .trailing : .leading) {
                    Capsule().fill(on ? kMidiLime : Color.white.opacity(0.12)).frame(width: 46, height: 26)
                    Circle().fill(on ? Color(hex: 0x17181A) : Color.white.opacity(0.85)).frame(width: 20, height: 20).padding(3)
                }
                .animation(.spring(response: 0.25, dampingFraction: 0.8), value: on)
            }
            .contentShape(Rectangle())
        }.buttonStyle(.plain)
    }
}

private struct MNote: View {
    let text: String
    var body: some View { Text(text).font(BFont.mono(9)).foregroundColor(.white.opacity(0.45)).fixedSize(horizontal: false, vertical: true) }
}

/// Live: lights up when MIDI comes in.
private struct MActivity: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.1)) { _ in
            let idle = model.engine.midiIdleSeconds
            HStack(spacing: 8) {
                Circle().fill(idle < 0.2 ? kMidiLime : Color.white.opacity(0.18)).frame(width: 8, height: 8)
                Text(idle < 0.2 ? "tar emot midi" : (idle < 1e8 ? "senaste midi för \(Int(idle)) s sedan" : "ingen midi än"))
                    .font(BFont.mono(9)).foregroundColor(.white.opacity(0.5))
                if model.engine.midiFollowClock && idle < 1e8 {
                    Spacer()
                    Text(String(format: "%.1f bpm", model.engine.bpm)).font(BFont.mono(9)).foregroundColor(.white.opacity(0.7))
                }
            }
        }
    }
}

#if !targetEnvironment(macCatalyst)
/// The system's output picker (AirPlay, Bluetooth, headphones).
private struct RoutePicker: UIViewRepresentable {
    func makeUIView(context: Context) -> AVRoutePickerView {
        let v = AVRoutePickerView()
        v.tintColor = UIColor(white: 1, alpha: 0.7); v.activeTintColor = UIColor(red: 0.886, green: 0.96, blue: 0.235, alpha: 1)
        return v
    }
    func updateUIView(_ uiView: AVRoutePickerView, context: Context) {}
}
#endif
