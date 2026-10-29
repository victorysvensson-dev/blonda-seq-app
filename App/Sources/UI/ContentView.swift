import SwiftUI

struct ContentView: View {
    @EnvironmentObject var model: EngineModel
    var body: some View {
        ZStack {
            Color(hex: 0x111114).ignoresSafeArea()
            VStack(spacing: 12) {
                HeaderView()
                GridView()
                SoundPanel()
                KeyboardView()
                    .frame(height: 120)
            }
            .padding(16)
            if let e = model.errorText {
                VStack { Spacer(); Text(e).font(.footnote).padding(8).background(Color.red.opacity(0.8), in: Capsule()) }
            }
        }
    }
}

struct HeaderView: View {
    @EnvironmentObject var model: EngineModel
    @Environment(\.horizontalSizeClass) private var hsc
    var body: some View {
        if hsc == .compact {   // iPhone portrait: two rows
            VStack(spacing: 10) {
                HStack { logo; Spacer(); playButton }
                HStack { patterns; Spacer(); bpmPill }
            }
        } else {
            HStack(spacing: 12) { logo; Spacer(); patterns; bpmPill; playButton }
        }
    }

    private var logo: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("BLONDA").font(.system(size: 22, weight: .heavy, design: .rounded)).foregroundStyle(.white)
            Text("SEQ.3").font(.system(size: 13, weight: .semibold, design: .monospaced)).foregroundStyle(.white.opacity(0.5))
        }
        .contextMenu {   // long-press the logo
            Button(role: .destructive) { model.loadDemo() } label: { Label("Ladda demolåten (ersätter projektet)", systemImage: "arrow.counterclockwise") }
        }
    }
    private var patterns: some View {
        HStack(spacing: 6) {
            ForEach(0..<4, id: \.self) { p in
                let on = model.pattern == p
                Button(["A", "B", "C", "D"][p]) { model.selectPattern(p) }
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .frame(width: 34, height: 30)
                    .background(on ? Color.white : Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
                    .foregroundStyle(on ? Color.black : Color.white)
            }
        }
        .id(model.revision)
    }
    private var bpmPill: some View {
        HStack(spacing: 4) {
            Button { model.nudgeBPM(-1) } label: { Image(systemName: "minus") }.frame(width: 28, height: 28)
            Text("\(Int(model.bpm.rounded()))").font(.system(size: 15, weight: .bold, design: .monospaced)).frame(minWidth: 36)
            Button { model.nudgeBPM(1) } label: { Image(systemName: "plus") }.frame(width: 28, height: 28)
        }
        .padding(.horizontal, 8).padding(.vertical, 2)
        .background(Color.white.opacity(0.08), in: Capsule())
        .foregroundStyle(.white)
        .id(model.revision)
    }
    private var playButton: some View {
        Button { model.togglePlay() } label: {
            Image(systemName: model.playing ? "stop.fill" : "play.fill").font(.system(size: 18, weight: .bold))
                .frame(width: 48, height: 36)
                .background(model.playing ? Color(hex: 0xFFD21F) : Color.white, in: Capsule())
                .foregroundStyle(.black)
        }
    }
}
