import SwiftUI

/// Top row: brand (left), the glass dock hanging from the top edge (centre), BPM pill (right).
struct SEQ3Header: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        ZStack(alignment: .top) {
            HStack(alignment: .top) {
                Brand().padding(.top, 12)
                Spacer()
                BPMPill().padding(.top, 12)
            }
            .padding(.horizontal, 22)
            Dock()
        }
        .frame(height: 92, alignment: .top)
    }
}

struct Brand: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("BLONDA").font(BFont.pixel(16)).tracking(1.28).foregroundColor(T.fg)
            HStack(spacing: 0) {
                Text("seq.3 · ").foregroundColor(T.mute)
                Text("projekt 1").foregroundColor(T.fg)
                Text(" ▾").foregroundColor(T.mute)
            }
            .font(BFont.mono(9)).tracking(0.36)
        }
        .padding(4)
        .contentShape(Rectangle())
        .contextMenu {
            Button(role: .destructive) { model.loadDemo() } label: { Label("Ladda demolåten (ersätter projektet)", systemImage: "arrow.counterclockwise") }
        }
    }
}

/// The glass dock: pattern A–D (yellow indicator slides to the current one), copy, world, midi, projekt, lib.
struct Dock: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                PatternSegment()
                GButton(width: 38, action: { model.copyPattern() }) { SVGIcon(d: "M3 10.5V3.5A1 1 0 0 1 4 2.5h6.5", size: 14).overlay(SVGIcon(d: "M7 5h4.5a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", size: 14)) }
                GButton(width: 112) {
                    HStack(spacing: 8) {
                        Circle().fill(AngularGradient(colors: [Color(hex: 0xF255A8), Color(hex: 0xF2C318), Color(hex: 0x6BE28C), Color(hex: 0x3D6CF5), Color(hex: 0xB9A6FF), Color(hex: 0xF255A8)], center: .center, angle: .degrees(30 - 90)))
                            .frame(width: 9, height: 9).shadow(color: Color.white.opacity(0.35), radius: 4)
                        Text("velvet")
                    }
                }
                GButton(width: 64) { HStack(spacing: 6) { Circle().fill(.white.opacity(0.35)).frame(width: 7, height: 7); Text("midi") } }
                GButton(width: 90) { HStack(spacing: 6) { SVGIcon(d: "M2 4.5a1 1 0 0 1 1-1h3.2l1.5 1.6H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z", size: 14); Text("projekt") } }
                GButton(width: 65) { HStack(spacing: 6) { SVGIcon(d: "M3 2.5v11M6.5 2.5v11M10 3l3 10.2", size: 14); Text("lib") } }
            }
            .padding(.top, 12)
            RoundedRectangle(cornerRadius: 2).fill(.white.opacity(0.35)).frame(width: 38, height: 4).padding(.top, 8).padding(.bottom, 4)
        }
        .padding(.horizontal, 14)
        .frame(width: 568, height: 70, alignment: .top)
        .background(
            UnevenRoundedRectangle(cornerRadii: .init(bottomLeading: 24, bottomTrailing: 24))
                .fill(.clear)
                .background(Backdrop().clipShape(UnevenRoundedRectangle(cornerRadii: .init(bottomLeading: 24, bottomTrailing: 24))))
                .overlay(UnevenRoundedRectangle(cornerRadii: .init(bottomLeading: 24, bottomTrailing: 24)).fill(LinearGradient(colors: [.white.opacity(0.16), .white.opacity(0.07)], startPoint: .top, endPoint: .bottom)))
                .overlay(UnevenRoundedRectangle(cornerRadii: .init(bottomLeading: 24, bottomTrailing: 24)).stroke(.white.opacity(0.18), lineWidth: 1))
                .shadow(color: .black.opacity(0.35), radius: 20, y: 10)
        )
        .padding(.top, 8)
    }
}

struct GButton<L: View>: View {
    var width: CGFloat
    var action: () -> Void = {}
    @ViewBuilder var label: () -> L
    var body: some View {
        Button(action: action) {
            label().font(BFont.mono(10, 500)).tracking(0.3).foregroundColor(T.fg).lineLimit(1)
                .frame(width: width, height: 38)
                .background(Capsule().fill(.white.opacity(0.1)))
                .overlay(Capsule().strokeBorder(.white.opacity(0.14), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

struct PatternSegment: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        let cur = model.pattern
        ZStack(alignment: .leading) {
            Circle().fill(T.yellow).frame(width: 32, height: 32)
                .shadow(color: T.yellow.opacity(0.8), radius: 9, y: 6)
                .offset(x: CGFloat(cur) * 34)
                .animation(.spring(response: 0.35, dampingFraction: 0.7), value: cur)
            HStack(spacing: 2) {
                ForEach(0..<4, id: \.self) { p in
                    Button { model.selectPattern(p) } label: {
                        DotMatrixText(text: ["A", "B", "C", "D"][p], height: 13, color: p == cur ? T.ink : T.fg.opacity(0.45))
                            .frame(width: 32, height: 32).contentShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(3)
        .frame(width: 140, height: 38)
        .background(Capsule().fill(.white.opacity(0.08)))
        .overlay(Capsule().strokeBorder(.white.opacity(0.25), lineWidth: 1))
        .id(model.revision)
    }
}

struct BPMPill: View {
    @EnvironmentObject var model: EngineModel
    @State private var bpm0: Float?
    var body: some View {
        HStack(spacing: 4) {
            roundBtn { model.nudgeBPM(-1) } icon: { SVGIcon(d: "M4 8h8", size: 14, stroke: 1.6, cap: .round) }
            HStack(alignment: .bottom, spacing: 5) {
                DotMatrixText(text: "\(Int(model.bpm.rounded()))", height: 20)
                    .contentShape(Rectangle())
                    .gesture(DragGesture(minimumDistance: 2).onChanged { g in
                        if bpm0 == nil { bpm0 = model.bpm }
                        model.setBPM(bpm0! - Float(g.translation.height / 6))
                    }.onEnded { _ in bpm0 = nil })
                Text("bpm").font(BFont.mono(8.5)).tracking(0.34).foregroundColor(T.mute).padding(.bottom, -1)
            }
            .frame(width: 84)
            roundBtn { model.nudgeBPM(1) } icon: { SVGIcon(d: "M4 8h8M8 4v8", size: 14, stroke: 1.6, cap: .round) }
        }
        .padding(4)
        .frame(width: 160, height: 38)
        .background(Capsule().fill(LinearGradient(colors: [.white.opacity(0.12), .white.opacity(0.05)], startPoint: .top, endPoint: .bottom)))
        .overlay(Capsule().strokeBorder(.white.opacity(0.14), lineWidth: 1))
            }
    private func roundBtn<I: View>(_ action: @escaping () -> Void, @ViewBuilder icon: () -> I) -> some View {
        Button(action: action) { icon().foregroundColor(T.fg).frame(width: 30, height: 30).background(Circle().fill(.white.opacity(0.08))) }.buttonStyle(.plain)
    }
}
