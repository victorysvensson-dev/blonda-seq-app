import SwiftUI
import UniformTypeIdentifiers

// The sound library (web: #lib) and the loops card (web: .card.loops). Drop audio files anywhere on the app,
// or press "lägg till ljud". Short sounds become one-shots for the drum tracks, longer ones tempo-synced loops.

/// Bars of a waveform (web: drawWave) — dimmed after the playhead.
struct WaveBars: View {
    let pk: [Float]
    let color: Color
    var progress: Double? = nil
    var body: some View {
        Canvas { ctx, size in
            guard !pk.isEmpty else { return }
            let n = pk.count, bw = size.width / CGFloat(n), mid = size.height / 2
            var lit = Path(), dim = Path()
            for i in 0..<n {
                let h = max(1, CGFloat(pk[i]) * size.height * 0.42)
                let r = CGRect(x: CGFloat(i) * bw + bw * 0.18, y: mid - h, width: max(1, bw * 0.64), height: h * 2)
                if let p = progress, Double(i) / Double(n) <= p { lit.addRect(r) } else { dim.addRect(r) }
            }
            ctx.fill(dim, with: .color(color.opacity(0.35)))
            ctx.fill(lit, with: .color(color))
            if let p = progress { ctx.fill(Path(CGRect(x: CGFloat(p) * size.width - 0.5, y: 0, width: 1.5, height: size.height)), with: .color(.white)) }
        }
    }
}

// MARK: - Loops card

struct LoopsCard: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var lib: SampleLibrary
    init() { _lib = ObservedObject(wrappedValue: EngineModel.sharedLibrary) }

    var body: some View {
        let active = (0..<4).filter { model.loopMeta($0) != nil && model.loopOn($0) }.count
        Card(style: .tinted(T.loopGreen), title: [("Loopar · ", false), (active > 0 ? "\(active) aktiv\(active > 1 ? "a" : "") · \(Int(model.bpm.rounded())) bpm" : "följer tempot", true)]) {
            VStack(spacing: 6) {
                ForEach(0..<4, id: \.self) { k in LoopRow(k: k) }
                HStack {
                    Text(lib.items.isEmpty ? "dra in ljudfiler i biblioteket" : "\(lib.items.count) ljud i biblioteket").font(BFont.mono(9.5)).foregroundColor(T.mute)
                    Spacer()
                    Button { model.openLibrary("loop") } label: {
                        Text("bibliotek").font(BFont.sans(12)).foregroundColor(T.fg).padding(.horizontal, 12).frame(height: 28).background(Capsule().fill(.white.opacity(0.08)))
                    }
                    .buttonStyle(PressScale())
                }
                .padding(.top, 2)
            }
        }
    }
}

struct LoopRow: View {
    @EnvironmentObject var model: EngineModel
    let k: Int
    var body: some View {
        let m = model.loopMeta(k)
        let on = m != nil && model.loopOn(k)
        let vol = CGFloat(model.loopVolume(k))
        HStack(spacing: 10) {
            Button { model.toggleLoop(k) } label: {
                Circle().fill(.white.opacity(0.07)).frame(width: 22, height: 22)
                    .overlay(Circle().fill(T.loopGreen.opacity(on ? 1 : 0.35)).frame(width: 9, height: 9).shadow(color: T.loopGreen.opacity(on ? 0.8 : 0), radius: 4))
            }
            .buttonStyle(PressScale())
            Button { model.openLibrary("loop", target: .loop(k)) } label: { wave(m) }.buttonStyle(.plain)
            // volume
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(.white.opacity(0.14)).frame(height: 3)
                    Capsule().fill(T.loopGreen).frame(width: g.size.width * vol, height: 3)
                    Circle().fill(.white).frame(width: 12, height: 12).shadow(color: .black.opacity(0.4), radius: 4, y: 2).offset(x: g.size.width * vol - 6)
                }
                .frame(maxHeight: .infinity)
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 0).onChanged { v in model.setLoopVolume(k, Float(min(1, max(0, v.location.x / g.size.width)))) })
            }
            .frame(width: 70, height: 22)
            Button { model.clearLoop(k) } label: {
                SVGIcon(d: "M3 3l6 6M9 3 3 9", box: 12, size: 10, stroke: 1.4).foregroundColor(T.mute).frame(width: 10, height: 10).frame(width: 22, height: 22)
            }
            .buttonStyle(PressScale())
        }
        .padding(.horizontal, 8).padding(.vertical, 7)
        .background(RoundedRectangle(cornerRadius: 12).fill(.white.opacity(on ? 0.07 : 0.04)))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(.white.opacity(0.05), lineWidth: 1))
    }

    @ViewBuilder private func wave(_ m: SampleMeta?) -> some View {
        if let m = m {
            ZStack(alignment: .leading) {
                TimelineView(.animation(minimumInterval: 1.0 / 20.0)) { _ in WaveBars(pk: m.pk, color: T.loopGreen, progress: model.loopProgress(k)) }
                HStack(spacing: 6) {
                    Text(m.name).font(BFont.mono(10.5, 500)).foregroundColor(T.fg).lineLimit(1)
                    Text("\(model.loopBarsEff(k)) takt\(model.loopBarsEff(k) > 1 ? "er" : "") · \(Int(m.bpm.rounded()))→\(Int(model.bpm.rounded()))").font(BFont.mono(9)).foregroundColor(T.mute).lineLimit(1)
                }
                .padding(.horizontal, 8).frame(height: 22)
                .background(Capsule().fill(.black.opacity(0.35)))
                .padding(.leading, 4)
            }
            .frame(height: 36)
            .contentShape(Rectangle())
        } else {
            HStack { Text("loop \(k + 1) · välj").font(BFont.mono(9.5)).tracking(0.5).foregroundColor(T.mute); Spacer() }
                .padding(.horizontal, 12).frame(height: 36)
                .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(.white.opacity(0.18), style: StrokeStyle(lineWidth: 1, dash: [3, 3])))
                .contentShape(Rectangle())
        }
    }
}

// MARK: - Library overlay

struct LibraryView: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var presetStore = EngineModel.sharedPresets
    @ObservedObject private var lib: SampleLibrary
    @State private var importing = false
    @State private var dropping = false
    init() { _lib = ObservedObject(wrappedValue: EngineModel.sharedLibrary) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("Bibliotek").font(BFont.sans(26, 300)).foregroundColor(T.fg)
                Text("\(lib.items.count) ljud · \(presetStore.items.count) presets").font(BFont.mono(10)).foregroundColor(T.mute)
                Spacer()
                HStack(spacing: 6) {
                    Circle().fill(.white.opacity(0.35)).frame(width: 6, height: 6)
                    Text(model.libBusy ? "läser …" : "lokalt").font(BFont.mono(10, 500)).foregroundColor(T.fg.opacity(0.8))
                }
                .padding(.horizontal, 12).frame(height: 30).background(Capsule().fill(.white.opacity(0.06)))
                Button { importing = true } label: {
                    HStack(spacing: 8) {
                        SVGIcon(d: "M8 2v9M4.5 7.5 8 11l3.5-3.5M3 10v3.5h10V10", box: 16, size: 14, stroke: 1.5).frame(width: 14, height: 14)
                        Text("lägg till ljud").font(BFont.sans(13))
                    }
                    .foregroundColor(T.fg).padding(.horizontal, 14).frame(height: 36)
                    .background(Capsule().fill(.white.opacity(0.08))).overlay(Capsule().strokeBorder(.white.opacity(0.14), lineWidth: 1))
                }
                .buttonStyle(PressScale())
                Button { model.closeLibrary() } label: {
                    SVGIcon(d: "M4 4l8 8M12 4l-8 8", box: 16, size: 13, stroke: 1.6).frame(width: 13, height: 13).foregroundColor(T.fg)
                        .frame(width: 36, height: 36).background(Circle().fill(.white.opacity(0.08))).overlay(Circle().strokeBorder(.white.opacity(0.14), lineWidth: 1))
                }
                .buttonStyle(PressScale())
                .keyboardShortcut(.cancelAction)
            }
            .padding(.bottom, 26)
            HStack(spacing: 0) {
                tab("hit", "one-shots"); tab("loop", "loopar"); tab("preset", "presets")
            }
            .padding(4).background(Capsule().fill(.white.opacity(0.06)))
            .padding(.bottom, 12)
            if let t = model.libTarget {
                Text(target(t)).font(BFont.mono(10)).foregroundColor(T.yellow).padding(.bottom, 10)
            }
            ScrollView(.vertical, showsIndicators: false) {
                let items = model.libTab == "loop" ? lib.loops : lib.hits
                if model.libTab == "preset" {
                    PresetGrid().padding(.top, 8).padding(.bottom, 40)
                } else if items.isEmpty {
                    empty.frame(maxWidth: .infinity, alignment: .leading).padding(.top, 30)
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 172, maximum: 210), spacing: 10, alignment: .top)], alignment: .leading, spacing: 10) {
                        ForEach(items) { m in LibTile(m: m) }
                    }
                    .padding(.top, 20).padding(.bottom, 40)
                }
            }
        }
        .padding(.horizontal, 16).padding(.top, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(ZStack { Rectangle().fill(.ultraThinMaterial); Color(rgb: 8, 8, 12, 0.78) }.ignoresSafeArea())
        .overlay(dropping ? RoundedRectangle(cornerRadius: 24).strokeBorder(T.yellow, style: StrokeStyle(lineWidth: 2, dash: [6, 6])).padding(10) : nil)
        .dropDestination(for: URL.self) { urls, _ in model.importFiles(urls); return true } isTargeted: { dropping = $0 }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.audio], allowsMultipleSelection: true) { r in
            if case .success(let urls) = r { model.importFiles(urls) }
        }
    }

    private func target(_ t: EngineModel.LibTarget) -> String {
        switch t { case .loop(let k): return "välj en loop till plats \(k + 1)"; case .drum(let i): return "välj ett ljud till \(kTracks[i].name.lowercased())" }
    }

    private func tab(_ id: String, _ label: String) -> some View {
        let on = model.libTab == id
        return Button { model.libTab = id } label: {
            Text(label).font(BFont.sans(13)).foregroundColor(on ? T.ink : T.fg.opacity(0.75))
                .padding(.horizontal, 14).frame(height: 32).background(Capsule().fill(on ? T.fg : Color.clear))
        }
        .buttonStyle(.plain)
        .animation(.easeOut(duration: 0.15), value: on)
    }

    private var empty: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(model.libTab == "loop" ? "Inga loopar än" : "Inga one-shots än").font(BFont.sans(15, 500)).foregroundColor(T.fg)
            Text("Dra in ljudfiler hit, eller tryck “lägg till ljud”.").font(BFont.sans(13)).foregroundColor(T.mute)
            Text(model.libTab == "loop" ? "Loopar sträcks automatiskt till ditt tempo." : "Korta ljud (under 1,6 s) hamnar här och kan läggas på trumspåren.").font(BFont.sans(13)).foregroundColor(T.mute)
        }
    }
}

struct LibTile: View {
    @EnvironmentObject var model: EngineModel
    let m: SampleMeta
    @State private var confirm = false

    var body: some View {
        let isLoop = m.kind == "loop"
        VStack(alignment: .leading, spacing: 0) {
            Button { model.previewSample(m) } label: {
                ZStack(alignment: .trailing) {
                    WaveBars(pk: m.pk, color: isLoop ? T.loopGreen : T.yellow)
                    Circle().fill(.white).frame(width: 24, height: 24)
                        .overlay(SVGIcon(d: "M5 3.5v9l7-4.5z", box: 16, size: 10, stroke: nil, fill: true).frame(width: 10, height: 10).foregroundColor(T.ink).offset(x: 1))
                        .padding(.trailing, 6)
                }
                .frame(height: 52)
                .background(RoundedRectangle(cornerRadius: 10).fill(.black.opacity(0.25)))
            }
            .buttonStyle(.plain)
            Text(m.name).font(BFont.sans(13.5)).foregroundColor(T.fg).lineLimit(1).padding(.top, 12)
            Text(meta).font(BFont.mono(9.5)).foregroundColor(T.mute).lineLimit(1).padding(.top, 5)
            FlowLayout(spacing: 6) {
                if isLoop {
                    ForEach([1, 2, 4, 8], id: \.self) { n in
                        chip("\(n)t", on: m.bars == n, plain: true) { model.setSampleBars(m, n) }
                    }
                    if case .loop(let k) = model.libTarget {
                        chip("→ loop \(k + 1)", on: true) { model.assignLoop(m, k) }
                    } else {
                        ForEach(0..<4, id: \.self) { k in chip("L\(k + 1)", on: model.loopMeta(k)?.id == m.id) { model.assignLoop(m, k) } }
                    }
                } else {
                    if case .drum(let i) = model.libTarget {
                        chip("→ \(kTracks[i].name.lowercased())", on: true) { model.assignHit(m, i) }
                    } else {
                        ForEach(0..<6, id: \.self) { i in
                            chip("\(i + 1)", dot: Color(hex: kTrackHex[i]), on: model.drumSampleMeta(i)?.id == m.id) { model.assignHit(m, i) }
                        }
                    }
                }
                Button {
                    if confirm { model.deleteSample(m) } else {
                        confirm = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) { confirm = false }
                    }
                } label: {
                    Text(confirm ? "radera?" : "×").font(BFont.mono(10, 500)).foregroundColor(confirm ? .white : T.mute)
                        .padding(.horizontal, confirm ? 9 : 0).frame(minWidth: 24).frame(height: 24)
                        .background(Capsule().fill(confirm ? Color(hex: 0xC9452F) : Color.white.opacity(0.06)))
                }
                .buttonStyle(PressScale())
            }
            .padding(.top, 10)
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(.white.opacity(0.05)))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(.white.opacity(0.09), lineWidth: 1))
    }

    private var meta: String {
        if m.kind == "loop" { return "\(m.bars) takt\(m.bars > 1 ? "er" : "") · \(Int(m.bpm.rounded())) bpm · \(String(format: "%.1f", m.dur)) s" }
        return m.dur < 1 ? "\(Int((m.dur * 1000).rounded())) ms" : String(format: "%.2f s", m.dur)
    }

    private func chip(_ label: String, dot: Color? = nil, on: Bool, plain: Bool = false, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let d = dot { Circle().fill(d).frame(width: 6, height: 6) }
                Text(label).font(BFont.mono(10, 500))
            }
            .foregroundColor(on ? (plain ? T.fg : T.ink) : T.fg.opacity(plain ? 0.6 : 0.9))
            .padding(.horizontal, 8).frame(height: 24)
            .background(Capsule().fill(on ? (plain ? Color.white.opacity(0.16) : T.fg) : Color.white.opacity(plain ? 0 : 0.08)))
        }
        .buttonStyle(PressScale())
    }
}


// MARK: - presets tab (web: libTab "preset")

struct PresetGrid: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var store = EngineModel.sharedPresets
    @State private var confirm: String?

    var body: some View {
        let t = model.selectedTrack
        VStack(alignment: .leading, spacing: 14) {
            Button { model.savePreset(t) } label: {
                Text("+ spara \(kTracks[t].name.lowercased()) som preset").font(BFont.sans(13)).foregroundColor(T.fg)
                    .padding(.horizontal, 14).frame(height: 36)
                    .background(Capsule().fill(.white.opacity(0.08))).overlay(Capsule().strokeBorder(.white.opacity(0.14), lineWidth: 1))
            }
            .buttonStyle(PressScale())
            if store.items.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Inga presets än").font(BFont.sans(15, 500)).foregroundColor(T.fg)
                    Text("Välj ett spår, ställ in ljudet och tryck “spara som preset”.").font(BFont.sans(13)).foregroundColor(T.mute)
                }
                .padding(.top, 10)
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 220, maximum: 280), spacing: 10, alignment: .top)], alignment: .leading, spacing: 10) {
                    ForEach(store.items) { p in tile(p) }
                }
            }
        }
    }

    private func tile(_ p: SoundPreset) -> some View {
        let d = Date(timeIntervalSince1970: p.t / 1000), f = DateFormatter()
        f.locale = Locale(identifier: "sv_SE"); f.dateFormat = "d MMM"
        return VStack(alignment: .leading, spacing: 0) {
            Text(p.name).font(BFont.sans(13.5)).foregroundColor(T.fg).lineLimit(2)
            HStack(spacing: 6) {
                Circle().fill(Color(hex: model.trackHex(p.from))).frame(width: 7, height: 7)
                Text((p.kind == "mel" ? "synth" : "trumma") + " · " + f.string(from: d)).font(BFont.mono(9.5)).foregroundColor(T.mute)
            }
            .padding(.top, 6)
            FlowLayout(spacing: 6) {
                ForEach(0..<10, id: \.self) { i in
                    if (i >= 6) == (p.kind == "mel") {
                        Button { model.applyPreset(p, i) } label: {
                            HStack(spacing: 5) {
                                Circle().fill(Color(hex: model.trackHex(i))).frame(width: 6, height: 6)
                                Text(kTracks[i].name.lowercased()).font(BFont.mono(10, 500))
                            }
                            .foregroundColor(i == model.selectedTrack ? T.ink : T.fg.opacity(0.9))
                            .padding(.horizontal, 8).frame(height: 24)
                            .background(Capsule().fill(i == model.selectedTrack ? T.fg : Color.white.opacity(0.08)))
                        }
                        .buttonStyle(PressScale())
                    }
                }
                Button {
                    if confirm == p.id { store.remove(p.id); confirm = nil } else {
                        confirm = p.id; DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) { if confirm == p.id { confirm = nil } }
                    }
                } label: {
                    Text(confirm == p.id ? "säker?" : "radera").font(BFont.mono(10, 500)).foregroundColor(confirm == p.id ? .white : T.mute)
                        .padding(.horizontal, 9).frame(height: 24)
                        .background(Capsule().fill(confirm == p.id ? Color(hex: 0xC9452F) : Color.white.opacity(0.06)))
                }
                .buttonStyle(PressScale())
            }
            .padding(.top, 10)
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(.white.opacity(0.05)))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(.white.opacity(0.09), lineWidth: 1))
    }
}
