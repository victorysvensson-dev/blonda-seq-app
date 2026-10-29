import SwiftUI

// The step inspector (web: .sins) — long-press a step: velocity, ratchet, probability, accent, clear.

private let kInk = Color(rgb: 29, 29, 27)

struct StepInspector: View {
    @EnvironmentObject var model: EngineModel
    let ref: EngineModel.StepRef

    var body: some View {
        let tc = Color(hex: model.trackHex(ref.track))
        let v = model.stepVel(ref), r = model.stepRatchet(ref), p = model.stepProb(ref)
        let acc = model.value(ref.track, ref.step) == 2
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("steg \(ref.step + 1)").font(BFont.sans(24, 300)).tracking(-0.5)
                HStack(spacing: 5) {
                    Circle().fill(tc).frame(width: 7, height: 7).overlay(Circle().strokeBorder(kInk.opacity(0.2), lineWidth: 1))
                    Text(kTracks[ref.track].name.lowercased()).font(BFont.sans(11)).foregroundColor(kInk.opacity(0.55))
                }
                Spacer()
                Button { model.inspect = nil } label: {
                    Text("×").font(BFont.sans(17)).foregroundColor(kInk).frame(width: 28, height: 28).background(Circle().fill(kInk.opacity(0.07)))
                }
                .buttonStyle(PressScale())
            }
            .padding(.bottom, 6)
            row("velocity", "\(Int((v * 100).rounded()))")
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Canvas { ctx, size in
                        var x: CGFloat = 9
                        while x < size.width { ctx.fill(Path(CGRect(x: x, y: 0, width: 1, height: size.height)), with: .color(kInk.opacity(0.12))); x += 10 }
                    }
                    Rectangle().fill(tc).frame(width: g.size.width * CGFloat(v))
                        .overlay(alignment: .trailing) { Rectangle().fill(kInk).frame(width: 2) }
                }
                .background(kInk.opacity(0.07))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 0)
                    .onChanged { d in model.setStepVel(ref, Float(min(1, max(0.05, d.location.x / g.size.width)))) }
                    .onEnded { _ in model.auditionStep(ref) })
            }
            .frame(height: 30)
            row("ratchet · slag per steg", nil)
            seg([("1×", 1), ("2×", 2), ("3×", 3), ("4×", 4)].map { ($0.0, Double($0.1)) }, Double(r)) { model.setStepRatchet(ref, Int($0)) }
            row("chans att spelas", nil)
            seg([("100%", 1), ("75%", 0.75), ("50%", 0.5), ("25%", 0.25)], Double(p)) { model.setStepProb(ref, Float($0)) }
            HStack(spacing: 6) {
                pill("accent", on: acc) { model.toggleAccent(ref) }
                if ref.track >= 6 { pill("piano roll", on: false) { model.openRoll(ref.track) } }
                pill("rensa steg", on: false) { model.clearStep(ref) }
            }
            .padding(.top, 14)
        }
        .foregroundColor(kInk)
        .padding(14)
        .frame(width: 272)
        .background(Color(rgb: 250, 249, 245))
    }

    private func row(_ l: String, _ value: String?) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(l).font(BFont.sans(11)).foregroundColor(kInk.opacity(0.55))
            Spacer()
            if let v = value { Text(v).font(BFont.sans(20, 300)).monospacedDigit() }
        }
        .padding(.top, 12).padding(.bottom, 6)
    }

    private func seg(_ items: [(String, Double)], _ cur: Double, _ pick: @escaping (Double) -> Void) -> some View {
        HStack(spacing: 3) {
            ForEach(items.indices, id: \.self) { i in
                let on = abs(items[i].1 - cur) < 0.01
                Button { pick(items[i].1) } label: {
                    Text(items[i].0).font(BFont.sans(12, on ? 500 : 400)).foregroundColor(kInk)
                        .frame(maxWidth: .infinity).frame(height: 30)
                        .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(on ? Color.white : Color.clear).shadow(color: .black.opacity(on ? 0.25 : 0), radius: 3, y: 2))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(kInk.opacity(0.06)))
    }

    private func pill(_ l: String, on: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(l).font(BFont.sans(11.5)).foregroundColor(on ? .white : kInk)
                .padding(.horizontal, 12).frame(height: 30)
                .background(Capsule().fill(on ? kInk : kInk.opacity(0.07)))
        }
        .buttonStyle(PressScale())
    }
}
