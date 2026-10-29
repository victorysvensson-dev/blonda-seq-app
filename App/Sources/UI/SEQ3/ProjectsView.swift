import SwiftUI
import UniformTypeIdentifiers

// Projects (web: #proj) — the saved projects as a fan of cards: swipe or scroll to browse, tap to choose,
// the sheet below renames, duplicates, exports, deletes and opens. "nytt" starts an empty project with the same sounds.

private let kPG = Color(hex: 0x6BE28C)

struct ProjectsView: View {
    @EnvironmentObject var model: EngineModel
    @ObservedObject private var store: ProjectStore
    @State private var focus: CGFloat = 0
    @State private var dragStart: CGFloat?
    @State private var name = ""
    @State private var delArm = false
    @State private var importing = false
    @State private var exporting = false
    @State private var thumbs: [String: [[Int]]] = [:]
    @FocusState private var nameFocused: Bool
    init() { _store = ObservedObject(wrappedValue: EngineModel.sharedProjects) }

    private var order: [ProjectMeta] { store.items.sorted { $0.c < $1.c } }
    private var sel: ProjectMeta? { let o = order; return o.isEmpty ? nil : o[max(0, min(o.count - 1, Int(focus.rounded())))] }

    var body: some View {
        VStack(spacing: 0) {
            top
            stage
            Text("svep för att bläddra · tryck på ett kort för att välja").font(BFont.mono(9.5)).tracking(0.57).foregroundColor(T.mute).padding(.top, 6).padding(.bottom, 10)
            sheet
        }
        .padding(.horizontal, 16).padding(.top, 22).padding(.bottom, 18)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ZStack { Rectangle().fill(.ultraThinMaterial); Color(rgb: 8, 8, 12, 0.82); DotGrid(spacing: 22, radius: 0.7, color: .white.opacity(0.05)) }.ignoresSafeArea())
        .onAppear {
            focus = CGFloat(order.firstIndex { $0.id == store.current } ?? 0)
            name = sel?.name ?? ""
            for p in store.items { if let j = store.json(p.id) { thumbs[p.id] = ProjectStore.thumb(j) } }
        }
        .onChange(of: Int(focus.rounded())) { _, _ in if !nameFocused { name = sel?.name ?? "" }; delArm = false }
        .onChange(of: nameFocused) { _, f in model.textEditing = f; if !f, let p = sel { store.rename(p.id, name); name = store.items.first { $0.id == p.id }?.name ?? name } }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { r in
            if case .success(let u) = r { model.importProject(u); refresh(); focusOn(store.current) }
        }
        .fileExporter(isPresented: $exporting, document: ProjectFile(text: sel.flatMap { store.json($0.id) } ?? ""), contentType: .json,
                      defaultFilename: (sel?.name ?? "projekt") + ".json") { _ in }
    }

    private func refresh() { for p in store.items where thumbs[p.id] == nil { if let j = store.json(p.id) { thumbs[p.id] = ProjectStore.thumb(j) } } }
    private func focusOn(_ id: String) { if let i = order.firstIndex(where: { $0.id == id }) { withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) { focus = CGFloat(i) } } }

    // MARK: top bar

    private var top: some View {
        HStack(spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("Projekt").font(BFont.sans(22, 300)).foregroundColor(T.fg)
                Text(String(format: "%02d sparade", store.items.count)).font(BFont.mono(10)).tracking(0.6).foregroundColor(T.mute)
            }
            Spacer()
            pill("M8 3v10M3 8h10", "nytt") { model.newProject(); refresh(); focusOn(store.current) }
            pill("M8 11V2M4.5 5.5 8 2l3.5 3.5M3 10v3.5h10V10", "importera") { importing = true }
            Button { model.closeProjects() } label: {
                SVGIcon(d: "M4 4l8 8M12 4l-8 8", box: 16, size: 13, stroke: 1.6).frame(width: 13, height: 13).foregroundColor(T.fg)
                    .frame(width: 36, height: 36).background(pillBG)
            }
            .buttonStyle(PressScale()).keyboardShortcut(.cancelAction)
        }
    }

    private var pillBG: some View {
        Capsule().fill(LinearGradient(colors: [.white.opacity(0.09), .white.opacity(0.035)], startPoint: .top, endPoint: .bottom))
            .overlay(Capsule().strokeBorder(.white.opacity(0.12), lineWidth: 1))
    }

    private func pill(_ icon: String, _ label: String, go: Bool = false, warn: Bool = false, _ a: @escaping () -> Void) -> some View {
        Button(action: a) {
            HStack(spacing: 7) {
                if !go { SVGIcon(d: icon, box: 16, size: 14, stroke: 1.6).frame(width: 14, height: 14) }
                Text(label).font(BFont.sans(12.5, go ? 500 : 400))
                if go { SVGIcon(d: icon, box: 16, size: 14, stroke: 1.6).frame(width: 14, height: 14) }
            }
            .foregroundColor(go ? Color(hex: 0x07140B) : warn ? Color(hex: 0xFFB3A6) : T.fg)
            .padding(.horizontal, 15).frame(height: 36)
            .background(Group {
                if go { Capsule().fill(kPG).shadow(color: kPG.opacity(0.7), radius: 15, y: 8) }
                else if warn { Capsule().fill(Color(rgb: 255, 74, 51, 0.2)) }
                else { pillBG }
            })
        }
        .buttonStyle(PressScale())
    }

    // MARK: the fan of cards

    private var stage: some View {
        GeometryReader { g in
            let W = g.size.width, list = order
            ZStack {
                // the arc and its dot
                Circle().trim(from: 0.5, to: 1).stroke(.white.opacity(0.12), lineWidth: 1)
                    .frame(width: min(W * 0.7, 620), height: min(W * 0.7, 620))
                    .mask(LinearGradient(stops: [.init(color: .clear, location: 0), .init(color: .black, location: 0.3), .init(color: .black, location: 0.7), .init(color: .clear, location: 1)], startPoint: .leading, endPoint: .trailing))
                    .offset(y: min(W * 0.7, 620) / 2 - g.size.height * 0.41)
                Circle().fill(kPG).frame(width: 7, height: 7).shadow(color: kPG, radius: 6).offset(y: -g.size.height * 0.41)
                ForEach(Array(list.enumerated()), id: \.element.id) { i, p in
                    let d = CGFloat(i) - focus, a = abs(d), s: CGFloat = d < 0 ? -1 : 1, e = min(a, 1)
                    let sp = min(W * 0.035, 46)
                    let x = s * (e * min(W * 0.28, 170) + max(0, a - 1) * sp)
                    card(p, focused: Int(focus.rounded()) == i)
                        .rotation3DEffect(.degrees(Double(-s * e * 64)), axis: (x: 0, y: 1, z: 0), perspective: 0.6)
                        .scaleEffect(1 - e * 0.12 - max(0, a - 1) * 0.02)
                        .offset(x: x)
                        .opacity(a > 9 ? 0 : Double(1 - max(0, a - 6) * 0.25))
                        .zIndex(Double(1000 - a * 10))
                        .onTapGesture {
                            if Int(focus.rounded()) == i { openSelected() } else { withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) { focus = CGFloat(i) } }
                        }
                }
            }
            .frame(width: W, height: g.size.height)
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 4).onChanged { v in
                if dragStart == nil { dragStart = focus }
                focus = min(max(0, dragStart! - v.translation.width / 70), CGFloat(max(0, list.count - 1)))
            }.onEnded { v in
                let target = min(max(0, (focus - v.predictedEndTranslation.width / 70 * 0.25).rounded()), CGFloat(max(0, list.count - 1)))
                dragStart = nil
                withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) { focus = target }
            })
        }
        .frame(minHeight: 280)
    }

    private func card(_ p: ProjectMeta, focused: Bool) -> some View {
        let ink: Color = focused ? Color(hex: 0x06150A) : T.fg
        return VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                Text(p.name).font(BFont.sans(15)).lineLimit(2)
                Spacer(minLength: 4)
                if p.id == store.current {
                    Circle().fill(focused ? Color(hex: 0x06150A).opacity(0.15) : .white.opacity(0.2)).frame(width: 22, height: 22)
                        .overlay(Circle().fill(ink).frame(width: 7, height: 7))
                }
            }
            Text(dateText(p.t)).font(BFont.mono(9.5)).opacity(0.6)
            Spacer(minLength: 6)
            Canvas { ctx, size in
                guard let rows = thumbs[p.id], !rows.isEmpty else { return }
                let cw = size.width / 16, rh = size.height / CGFloat(rows.count)
                var on = Path(), off = Path()
                for (r, row) in rows.enumerated() { for (s, v) in row.prefix(16).enumerated() {
                    let rr = v > 0 ? min(cw, rh) * 0.34 : 1.1
                    let rect = CGRect(x: cw * (CGFloat(s) + 0.5) - rr, y: rh * (CGFloat(r) + 0.5) - rr, width: rr * 2, height: rr * 2)
                    if v > 0 { on.addEllipse(in: rect) } else { off.addEllipse(in: rect) }
                } }
                ctx.fill(off, with: .color(.white.opacity(focused ? 0.45 : 0.28)))
                ctx.fill(on, with: .color(.white.opacity(0.95)))
            }
            .frame(height: 78)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(p.bpm > 0 ? String(Int(p.bpm.rounded())) : "—").font(BFont.sans(34, 200)).tracking(-1)
                Text("bpm").font(BFont.mono(9)).opacity(0.6)
            }
            .padding(.top, 8)
        }
        .foregroundColor(ink)
        .padding(14)
        .frame(width: 210, height: 280)
        .background(
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 8, style: .continuous).fill(focused ? Color(hex: 0x86E79E) : Color(rgb: 60, 62, 66))
                    .frame(width: 92, height: 20).offset(x: 12, y: -9)
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(focused ? AnyShapeStyle(LinearGradient(colors: [Color(hex: 0x9AF5AE), Color(hex: 0x55CF78), Color(hex: 0x3BAA5E)], startPoint: UnitPoint(x: 0.3, y: 0), endPoint: UnitPoint(x: 0.7, y: 1)))
                                  : AnyShapeStyle(LinearGradient(colors: [Color(rgb: 60, 62, 66), Color(rgb: 32, 33, 36)], startPoint: .top, endPoint: .bottom)))
                RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(.white.opacity(focused ? 0.3 : 0.12), lineWidth: 1)
            }
        )
        .shadow(color: focused ? kPG.opacity(0.55) : .black.opacity(0.5), radius: focused ? 30 : 14, y: focused ? 22 : 10)
    }

    private func dateText(_ t: Double) -> String {
        let d = Date(timeIntervalSince1970: t / 1000), f = DateFormatter(); f.locale = Locale(identifier: "sv_SE")
        if Calendar.current.isDateInToday(d) { f.dateFormat = "HH:mm"; return "idag " + f.string(from: d) }
        f.dateFormat = "d MMM HH:mm"; return f.string(from: d)
    }

    // MARK: the sheet

    private var sheet: some View {
        VStack(alignment: .leading, spacing: 0) {
            TextField("Projektnamn", text: $name)
                .font(BFont.sans(24, 300)).foregroundColor(T.fg).textFieldStyle(.plain)
                .focused($nameFocused)
                .onSubmit { nameFocused = false }
                .padding(.vertical, 4)
                .overlay(alignment: .bottom) { Rectangle().fill(nameFocused ? kPG : .white.opacity(0.18)).frame(height: 1) }
            if let p = sel {
                Text((p.id == store.current ? "öppet nu · " : "") + "sparat \(dateText(p.t)) · \(Int(p.bpm.rounded())) bpm · \(p.patterns)/4 mönster")
                    .font(BFont.mono(10)).tracking(0.4).foregroundColor(T.mute).padding(.top, 6)
            }
            FlowLayout(spacing: 8) {
                pill("M5 5h8.5v8.5H5zM3 10.5V3.5A1 1 0 0 1 4 2.5h6.5", "duplicera") {
                    guard let p = sel else { return }
                    if p.id == store.current { model.openProjects() }   // saves the open one first
                    if let m = store.duplicate(p.id) { refresh(); focusOn(m.id); model.showToast("Duplicerat") }
                }
                pill("M8 2v9M4.5 7.5 8 11l3.5-3.5M3 10v3.5h10V10", "exportera") { exporting = true }
                pill("M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.6 9h4.8l.6-9", delArm ? "säker?" : "radera", warn: delArm) { delete() }
                pill("M3 8h10M9 4l4 4-4 4", sel?.id == store.current ? "tillbaka" : "öppna", go: true) { openSelected() }
            }
            .padding(.top, 14)
            timeline.frame(height: 58).padding(.top, 14)
        }
        .padding(16)
        .frame(maxWidth: 560)
        .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(LinearGradient(colors: [.white.opacity(0.08), .white.opacity(0.03)], startPoint: .top, endPoint: .bottom))
            .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(.white.opacity(0.1), lineWidth: 1)))
    }

    private var timeline: some View {
        GeometryReader { g in
            let W = g.size.width, H = g.size.height, list = order, n = list.count
            let X: (Int) -> CGFloat = { i in n < 2 ? W / 2 : 14 + (W - 28) * CGFloat(i) / CGFloat(n - 1) }
            let cols: [UInt32] = [0xF2C318, 0x6BE28C, 0xF255A8, 0xB9A6FF, 0xF27A2E, 0xA8C2A0]
            ZStack(alignment: .topLeading) {
                Canvas { ctx, size in
                    let y = size.height - 14
                    var x: CGFloat = 4
                    while x < size.width - 4 {
                        let big = Int(((x - 4) / 6).rounded()) % 8 == 0
                        ctx.fill(Path(CGRect(x: x, y: y - (big ? 9 : 5), width: 1, height: big ? 9 : 5)), with: .color(.white.opacity(big ? 0.4 : 0.16)))
                        x += 6
                    }
                    for (i, p) in list.enumerated() {
                        let s = i == Int(focus.rounded()), r: CGFloat = s ? 5 : 3.2
                        let c = p.id == store.current ? kPG : Color(hex: cols[i % cols.count])
                        ctx.fill(Path(ellipseIn: CGRect(x: X(i) - r, y: y - 18 - r, width: r * 2, height: r * 2)), with: .color(c.opacity(s ? 1 : 0.75)))
                    }
                }
                if let ci = list.firstIndex(where: { $0.id == store.current }) {
                    Text("här nu").font(BFont.sans(10.5, 500)).foregroundColor(Color(hex: 0x07140B))
                        .padding(.horizontal, 10).frame(height: 22).background(Capsule().fill(kPG))
                        .position(x: min(max(X(ci), 40), W - 40), y: H - 14 - 48 + 11)
                }
            }
        }
    }

    private func openSelected() {
        guard let p = sel else { return }
        if p.id != store.current { model.openProject(p.id) }
        model.closeProjects()
    }

    private func delete() {
        guard let p = sel else { return }
        if store.items.count < 2 { model.showToast("Det sista projektet kan inte raderas"); return }
        if !delArm { delArm = true; DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { delArm = false }; return }
        delArm = false
        let wasCurrent = p.id == store.current
        let i = Int(focus.rounded())
        if wasCurrent, let other = order.first(where: { $0.id != p.id }) { model.openProject(other.id) }
        store.delete(p.id)
        focus = CGFloat(max(0, min(i, order.count - 1)))
        name = sel?.name ?? ""
        model.showToast("Raderat")
    }
}

/// A project as a file for the exporter.
struct ProjectFile: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var text: String
    init(text: String) { self.text = text }
    init(configuration: ReadConfiguration) throws { text = String(data: configuration.file.regularFileContents ?? Data(), encoding: .utf8) ?? "" }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents: Data(text.utf8)) }
}
