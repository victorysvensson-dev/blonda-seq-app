import SwiftUI

// Plugins · master (web: .card.plugs) — Echo, Space, Tape and Crush as glass tiles. The pencil steps through a
// plugin's parameters, the big number is dragged up/down, and the green pill switches the plugin on/bypass.

private func circ(_ cx: Double, _ cy: Double, _ r: Double) -> String {
    "M\(cx - r) \(cy)a\(r) \(r) 0 1 0 \(2 * r) 0a\(r) \(r) 0 1 0 \(-2 * r) 0"
}

struct PlugParam {
    let label: String
    var lo: Float = 0
    var hi: Float = 1
    var unit = "%"
    var dec = 1
    var isInt = false
    var opts: [Float] = []
    var names: [String] = []
    let get: (EngineModel) -> Float
    let set: (EngineModel, Float) -> Void
}

struct PlugDef {
    let id: String
    let name: String
    let sub: String
    let color: UInt32
    let icon: String
    let onField: Int
    let params: [PlugParam]
}

let kPlugins: [PlugDef] = [
    PlugDef(id: "echo", name: "Echo", sub: "Delay", color: 0x3D6CF5, icon: circ(5, 9, 3.2) + circ(10.6, 9, 2.2) + circ(14.7, 9, 1.3), onField: 0, params: [
        PlugParam(label: "mix", get: { $0.master(2) }, set: { $0.setMaster(2, $1) }),
        PlugParam(label: "feedback", hi: 0.85, get: { $0.fx(1) }, set: { $0.setFx(1, $1) }),
        PlugParam(label: "tid", opts: [0.5, 0.75, 1, 1.5], names: ["1/8", "3/16", "1/4", "3/8"], get: { $0.fx(2) }, set: { $0.setFx(2, $1) }),
    ]),
    PlugDef(id: "space", name: "Space", sub: "Reverb", color: 0x8E7CFF, icon: "M3 14a6 6 0 0 1 12 0M5.6 14a3.4 3.4 0 0 1 6.8 0" + circ(9, 14, 1), onField: 3, params: [
        PlugParam(label: "mix", get: { $0.master(3) }, set: { $0.setMaster(3, $1) }),
        PlugParam(label: "storlek", lo: 0.6, hi: 6, unit: "s", get: { $0.fx(4) }, set: { $0.setFx(4, $1) }),
    ]),
    PlugDef(id: "tape", name: "Tape", sub: "Saturation", color: 0xFF6A1A, icon: circ(5.5, 8.5, 3) + circ(12.5, 8.5, 3) + "M5.5 11.5h7", onField: 5, params: [
        PlugParam(label: "drive", get: { $0.master(1) }, set: { $0.setMaster(1, $1) }),
        PlugParam(label: "ton", get: { $0.fx(6) }, set: { $0.setFx(6, $1) }),
    ]),
    PlugDef(id: "crush", name: "Crush", sub: "Bitcrusher", color: 0x27B26B, icon: "M3 15h3v-3h3V9h3V6h3", onField: 7, params: [
        PlugParam(label: "bits", lo: 2, hi: 12, unit: "bit", isInt: true, get: { $0.fx(8) }, set: { $0.setFx(8, $1) }),
        PlugParam(label: "mix", get: { $0.fx(9) }, set: { $0.setFx(9, $1) }),
    ]),
]

struct PluginsCard: View {
    @EnvironmentObject var model: EngineModel
    @State private var sel = "echo"
    @State private var pIdx: [String: Int] = [:]

    var body: some View {
        Card(style: .glass, title: [("plugins · ", false), ("master", true)]) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(kPlugins.indices, id: \.self) { i in tile(kPlugins[i]) }
            }
        }
    }

    private func fmt(_ q: PlugParam, _ v: Float) -> (String, String) {
        if !q.opts.isEmpty {
            let i = q.opts.firstIndex { abs($0 - v) < 1e-4 } ?? -1
            return (i >= 0 ? q.names[i] : "–", "")
        }
        if q.unit == "%" { return (String(Int((v * 100).rounded())), "%") }
        return (q.isInt ? String(Int(v.rounded())) : String(format: "%.\(q.dec)f", v), q.unit)
    }

    private func tile(_ pl: PlugDef) -> some View {
        let on = model.fx(pl.onField) != 0
        let k = pIdx[pl.id] ?? 0
        let q = pl.params[k]
        let v = q.get(model)
        let nu = fmt(q, v)
        let selected = sel == pl.id
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 9) {
                SVGIcon(d: pl.icon, box: 18, size: 18, stroke: 1.4).frame(width: 18, height: 18).padding(.top, 1)
                Text("\(pl.name)\n\(pl.sub)").font(BFont.sans(12, 300)).lineSpacing(2).opacity(0.92)
                Spacer(minLength: 40)
            }
            Spacer(minLength: 0)
            HStack(alignment: .bottom, spacing: 6) {
                VStack(alignment: .leading, spacing: 7) {
                    Text("\(q.label) · \(k + 1)/\(pl.params.count)").font(BFont.mono(9)).tracking(0.18).opacity(0.7).lineLimit(1)
                    SupNumber(num: nu.0, unit: nu.1, size: 40)
                        .opacity(on ? 1 : 0.45)
                        .modifier(PlugDrag(q: q, model: model))
                }
                Spacer(minLength: 0)
                Button {
                    let now = !on
                    model.setFx(pl.onField, now ? 1 : 0)
                    model.showToast(pl.name + (now ? " aktiv" : " bypass"))
                } label: {
                    HStack(spacing: 5) {
                        SVGIcon(d: "M2 5.2l2 2 4-4.4", box: 10, size: 10, stroke: 1.6, cap: .round).frame(width: 10, height: 10).scaleEffect(on ? 1 : 0.001)
                        Text(on ? "active" : "bypass").font(BFont.sans(11))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 12).frame(height: 30)
                    .background(Capsule().fill(on ? AnyShapeStyle(LinearGradient(colors: [Color(hex: 0x62C483), Color(hex: 0x3E9C5E)], startPoint: .top, endPoint: .bottom)) : AnyShapeStyle(Color.white.opacity(0.14))))
                    .overlay(Capsule().strokeBorder(Color.white.opacity(on ? 0 : 0.3), lineWidth: 1))
                    .shadow(color: Color(rgb: 40, 140, 80, on ? 0.7 : 0), radius: 7, y: 6)
                    .animation(.spring(response: 0.35, dampingFraction: 0.6), value: on)
                }
                .buttonStyle(PressScale())
            }
        }
        .foregroundColor(.white)
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 128, alignment: .topLeading)
        .background(tileBackground(selected, pl.color))
        .overlay(alignment: .topTrailing) {
            Button { pIdx[pl.id] = (k + 1) % pl.params.count; sel = pl.id } label: {
                SVGIcon(d: "M9.5 2.5l2 2L5 11H3V9z", box: 14, size: 13, stroke: 1.2).frame(width: 13, height: 13)
                    .foregroundColor(.white)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Color.white.opacity(0.08)))
                    .overlay(Circle().strokeBorder(Color.white.opacity(0.5), lineWidth: 1))
            }
            .buttonStyle(PressScale())
            .padding(12)
        }
        .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .simultaneousGesture(TapGesture().onEnded { sel = pl.id })
        .animation(.easeOut(duration: 0.25), value: selected)
    }

    @ViewBuilder private func tileBackground(_ selected: Bool, _ hex: UInt32) -> some View {
        let shape = RoundedRectangle(cornerRadius: 22, style: .continuous)
        ZStack {
            if selected {
                shape.fill(LinearGradient(colors: [mixColor(hex, 0xFFFFFF, 0.92), Color(hex: hex).opacity(0.62)], startPoint: UnitPoint(x: 0.33, y: 0.03), endPoint: UnitPoint(x: 0.67, y: 0.97)))
            } else {
                Backdrop().clipShape(shape)
                shape.fill(LinearGradient(colors: [.white.opacity(0.26), .white.opacity(0.07)], startPoint: UnitPoint(x: 0.33, y: 0.03), endPoint: UnitPoint(x: 0.67, y: 0.97)))
            }
            shape.strokeBorder(LinearGradient(colors: [.white.opacity(0.45), .white.opacity(0.08)], startPoint: .top, endPoint: .bottom), lineWidth: 1)
        }
    }
}

/// Drag the plugin value up/down (web: 160 px for the full range, options every 30 px).
private struct PlugDrag: ViewModifier {
    let q: PlugParam
    let model: EngineModel
    @State private var start: Float?
    @GestureState private var live = false
    func body(content: Content) -> some View {
        content.contentShape(Rectangle()).gesture(DragGesture(minimumDistance: 1).updating($live) { _, s, _ in s = true }.onChanged { g in
            let dy = Float(-g.translation.height)
            if !q.opts.isEmpty {
                if start == nil { start = Float(q.opts.firstIndex { abs($0 - q.get(model)) < 1e-4 } ?? 0) }
                let i = max(0, min(q.opts.count - 1, Int((start! + dy / 30).rounded())))
                q.set(model, q.opts[i])
            } else {
                if start == nil { start = q.get(model) }
                var v = max(q.lo, min(q.hi, start! + dy / 160 * (q.hi - q.lo)))
                if q.isInt { v = v.rounded() }
                q.set(model, v)
            }
        }.onEnded { _ in start = nil })
        .onChange(of: live) { _, v in if !v { start = nil }; ScrollLock.shared.set(v) }
    }
}
