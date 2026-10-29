import SwiftUI
import UIKit

// The piano roll (web: #roll) for bass / keys / lead / pad. Tap to draw a note and drag for its length, drag a note to
// move it, drag its edge for length, double-tap to delete. Drag from the ring after a note to a later note = glide.
// Two fingers (or the trackpad / mouse wheel) scroll, pinch zooms. The velocity lane sits below.

private let LO = 24, HI = 96
private let KW: CGFloat = 46
private let kSnaps: [(Float, String)] = [(1, "1/16"), (0.5, "1/32"), (0.25, "1/64")]
private let kLens: [(Float, String)] = [(1, "1/16"), (2, "1/8"), (4, "1/4"), (8, "1/2"), (16, "1 takt")]
private let kGlideTimes: [Float] = [0.04, 0.07, 0.12, 0.2, 0.35]
private func inScale(_ n: Int) -> Bool { [0, 2, 3, 5, 7, 8, 10].contains(((n - 9) % 12 + 12) % 12) }
private func isBlack(_ n: Int) -> Bool { [1, 3, 6, 8, 10].contains(((n % 12) + 12) % 12) }
func noteName(_ n: Int) -> String { ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][((n % 12) + 12) % 12] + "\(n / 12 - 1)" }

/// One editable note; `g` is the uid of the glide target.
struct RNote: Equatable { var uid: Int; var s: Float; var l: Float; var n: Int; var v: Float; var g: Int? }

final class RollState: ObservableObject {
    @Published var notes: [RNote] = []
    @Published var sel = Set<Int>()
    @Published var mode = "draw"
    @Published var snapI = 0
    @Published var lenI = 0
    @Published var scale = true
    @Published var ghost = true
    @Published var shiftLock = false
    @Published var zoom: CGFloat = 1
    var sx: CGFloat = 0, sy: CGFloat = 0
    let rowH: CGFloat = 18
    var nextUid = 0
    var ghosts: [(Int, [RNote])] = []
    // gesture state
    enum DragKind { case keys, cable, box, move, resize, resizeL }
    struct Drag {
        var kind: DragKind; var p0: CGPoint = .zero; var nt: Int = -1; var orig: [(uid: Int, s: Float, l: Float, n: Int)] = []
        var created = false; var lastN = 0; var key = 0; var moved = false; var sy0: CGFloat = 0
        var from = -1; var at: CGPoint = .zero; var box: CGRect = .zero; var base = Set<Int>()
    }
    var drag: Drag?
    var lastTap: (t: CFTimeInterval, uid: Int?) = (0, nil)
    var lastVel: Float = 0.8
    var pressed = Set<Int>()
    var size: CGSize = .zero

    var snap: Float { kSnaps[snapI].0 }
    var len: Float { kLens[lenI].0 }
    var gw: CGFloat { max(1, size.width - KW) }
    var sw: CGFloat { gw / 16 * zoom }
    func rX(_ s: Float) -> CGFloat { KW + CGFloat(s) * sw - sx }
    func rY(_ n: Int) -> CGFloat { CGFloat(HI - n) * rowH - sy }
    func posS(_ x: CGFloat) -> Float { Float((x - KW + sx) / sw) }
    func posN(_ y: CGFloat) -> Int { HI - Int(floor((y + sy) / rowH)) }
    func clampScroll() {
        sx = min(max(0, sx), max(0, sw * 16 - gw))
        sy = min(max(0, sy), max(0, CGFloat(HI - LO + 1) * rowH - size.height))
    }
    func scaleFix(_ n: Int) -> Int { (!scale || inScale(n)) ? n : (inScale(n + 1) ? n + 1 : n - 1) }
    func idx(_ uid: Int) -> Int? { notes.firstIndex { $0.uid == uid } }
    func newUid() -> Int { nextUid += 1; return nextUid }
}

struct PianoRoll: View {
    @EnvironmentObject var model: EngineModel
    let track: Int
    @StateObject private var st = RollState()
    @State private var info = ""
    @FocusState private var focused: Bool

    private var col: Color { Color(hex: model.trackHex(track)) }

    var body: some View {
        VStack(spacing: 0) {
            header
            GeometryReader { g in
                TimelineView(.animation) { tl in
                    Canvas { ctx, size in draw(&ctx, size, tl.date.timeIntervalSinceReferenceDate) }
                }
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 0).onChanged { v in onDrag(v) }.onEnded { v in onEnd(v) })
                .background(ScrollCatcher(onPan: { dx, dy in st.sx -= dx; st.sy -= dy; st.clampScroll() },
                                          onPinch: { scale, x in zoomBy(scale, at: x) },
                                          onTwoFingers: { cancelDrag() }))
                .onAppear { st.size = g.size; load(center: true) }
                .onChange(of: g.size) { _, s in st.size = s; st.clampScroll() }
            }
            .background(Color.black.opacity(0.28))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(.white.opacity(0.08), lineWidth: 1))
            velocityLane.padding(.top, 8)
            tools.padding(.top, 10)
        }
        .padding(.horizontal, 16).padding(.top, 14).padding(.bottom, 16)
        .background(
            ZStack {
                Color(rgb: 12, 12, 17, 0.97)
                RadialGradient(colors: [col.opacity(0.22), .clear], center: .topLeading, startRadius: 0, endRadius: 520)
            }
            .clipShape(UnevenRoundedRectangle(topLeadingRadius: 26, topTrailingRadius: 26, style: .continuous))
            .ignoresSafeArea(edges: .bottom)
        )
        .padding(.top, 18)
        .focusable().focusEffectDisabled().focused($focused)
        .onAppear { focused = true }
        .onKeyPress(phases: .down) { k in key(k) }
        .onChange(of: track) { _, _ in st.sel.removeAll(); load(center: true) }
        .onChange(of: model.pattern) { _, _ in st.sel.removeAll(); load(center: false) }
    }

    // MARK: header / tools

    private var header: some View {
        HStack(alignment: .center, spacing: 10) {
            HStack(spacing: 6) {
                ForEach(6..<10, id: \.self) { t in
                    let on = t == track, c = Color(hex: model.trackHex(t))
                    Button { model.openRoll(t); audition(model.previewNote(t), 0.8) } label: {
                        HStack(spacing: 6) {
                            Circle().fill(on ? Color(hex: 0x111211) : c).frame(width: 11, height: 11)
                            Text(kTracks[t].name.lowercased()).font(BFont.sans(12))
                        }
                        .foregroundColor(on ? Color(hex: 0x111211) : T.fg)
                        .padding(.leading, 7).padding(.trailing, 12).frame(height: 30)
                        .background(Capsule().fill(on ? c : Color.white.opacity(0.07)))
                    }
                    .buttonStyle(PressScale())
                }
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 5) {
                Text(kTracks[track].name).font(BFont.sans(30, 200)).tracking(-0.6).foregroundColor(T.fg)
                Text(infoText).font(BFont.mono(9)).tracking(0.36).foregroundColor(T.mute).lineLimit(1)
            }
            rbtn { model.togglePlay() } label: { SVGIcon(d: model.playing ? "M6 4.5h4v15H6zM14 4.5h4v15h-4z" : "M7 4.5v15l13-7.5z", box: 24, size: 15, stroke: nil, fill: true) }
            rbtn { model.closeRoll() } label: { SVGIcon(d: "M3 3l8 8M11 3l-8 8", box: 14, size: 15, stroke: 1.5) }
                .keyboardShortcut(.cancelAction)
        }
        .padding(.bottom, 10)
    }

    private var infoText: String {
        _ = st.notes; _ = st.sel
        let e = kEngineName[model.instrument(track)]?.lowercased() ?? ""
        var s = "mönster \(["A", "B", "C", "D"][model.pattern]) · \(st.notes.count) toner · \(e)"
        if !st.sel.isEmpty { s += " · \(st.sel.count) markerade" }
        return s
    }

    private func rbtn<L: View>(_ action: @escaping () -> Void, @ViewBuilder label: () -> L) -> some View {
        Button(action: action) {
            label().frame(width: 15, height: 15).foregroundColor(T.fg)
                .frame(width: 38, height: 38).background(Circle().fill(.white.opacity(0.08))).overlay(Circle().strokeBorder(.white.opacity(0.14), lineWidth: 1))
        }
        .buttonStyle(PressScale())
    }

    private var tools: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                HStack(spacing: 0) {
                    seg("rita", st.mode == "draw") { st.mode = "draw" }
                    seg("markera", st.mode == "sel") { st.mode = "sel" }
                }
                .padding(3).background(Capsule().fill(.white.opacity(0.07)))
                chip("⇧ shift", on: st.shiftLock) { st.shiftLock.toggle(); model.showToast(st.shiftLock ? "Shift låst: tryck toner för att lägga till · dra för ruta" : "Shift av") }
                chip("glide →", glide: true) { glideSelected() }
                chip("ta bort glide") { edit { for i in targetIdx() { st.notes[i].g = nil } }; model.showToast("Glide borttagen") }
                chip(model.instrument(track) == "acid" ? "glide: acid slide tid" : "glide \(Int((model.engine.glideTime * 1000).rounded())) ms") {
                    let i = kGlideTimes.firstIndex { abs($0 - model.engine.glideTime) < 0.001 } ?? 1
                    model.engine.glideTime = kGlideTimes[(i + 1) % kGlideTimes.count]; model.scheduleSave(); st.objectWillChange.send()
                }
                chip("snap \(kSnaps[st.snapI].1)") { st.snapI = (st.snapI + 1) % kSnaps.count }
                chip("längd \(kLens[st.lenI].1)") { st.lenI = (st.lenI + 1) % kLens.count }
                chip("skala", on: st.scale) { st.scale.toggle() }
                chip("spöknoter", on: st.ghost) { st.ghost.toggle() }
                if track == 7 || track == 9 {
                    chip("auto-ackord", on: model.engine.chordOn(track)) {
                        let on = !model.engine.chordOn(track); model.engine.setChord(on, track: track); model.scheduleSave(); st.objectWillChange.send()
                        audition(model.previewNote(track), 0.8)
                        model.showToast(on ? "Auto-ackord på" : "Auto-ackord av · rita egna ackord")
                    }
                }
                chip("kvantisera") {
                    let sn = st.snap
                    edit { for i in targetIdx() { st.notes[i].s = min(max(0, (st.notes[i].s / sn).rounded() * sn), 16 - sn); st.notes[i].l = min(max(sn, (st.notes[i].l / sn).rounded() * sn), 16 - st.notes[i].s) } }
                    model.showToast("Kvantiserat till \(kSnaps[st.snapI].1)")
                }
                chip("−oct") { transpose(-12) }; chip("−1") { transpose(-1) }; chip("+1") { transpose(1) }; chip("+oct") { transpose(12) }
                chip("legato") {
                    edit {
                        let ix = targetIdx().sorted { st.notes[$0].s < st.notes[$1].s }
                        for (k, i) in ix.enumerated() {
                            let s = st.notes[i].s
                            if let nx = ix[(k + 1)...].first(where: { st.notes[$0].s > s + 1e-6 }) { st.notes[i].l = st.notes[nx].s - s } else { st.notes[i].l = max(st.notes[i].l, 16 - s) }
                        }
                    }
                }
                chip("duplicera") { duplicate() }
                chip("markera alla") { st.sel = Set(st.notes.map { $0.uid }) }
                chip("ta bort") { deleteSelected() }
                chip("−") { zoomBy(1 / 1.5, at: KW + st.gw / 2) }
                chip("+") { zoomBy(1.5, at: KW + st.gw / 2) }
                chip("ångra") { model.undo(); st.sel.removeAll(); load(center: false) }
            }
        }
    }

    private func seg(_ l: String, _ on: Bool, _ a: @escaping () -> Void) -> some View {
        Button(action: a) {
            Text(l).font(BFont.mono(10.5)).foregroundColor(on ? T.ink : T.fg).padding(.horizontal, 11).frame(height: 26)
                .background(Capsule().fill(on ? T.fg : Color.clear))
        }
        .buttonStyle(.plain)
    }

    private func chip(_ l: String, on: Bool = false, glide: Bool = false, _ a: @escaping () -> Void) -> some View {
        Button(action: a) {
            Text(l).font(BFont.mono(10.5)).lineLimit(1).fixedSize()
                .foregroundColor(on ? Color(hex: 0x111211) : glide ? col : T.fg)
                .padding(.horizontal, 12).frame(height: 30)
                .background(Capsule().fill(on ? col : Color.white.opacity(0.08)))
                .overlay(Capsule().strokeBorder(on ? Color.clear : glide ? col : Color.white.opacity(0.12), lineWidth: 1))
        }
        .buttonStyle(PressScale())
    }

    // MARK: data

    private func load(center: Bool) {
        let d = model.engine.rollData(track)
        var list: [RNote] = []
        d.withUnsafeBytes { raw in
            let p = raw.bindMemory(to: BLRollNote.self)
            for (i, x) in p.enumerated() { list.append(RNote(uid: i + 1, s: x.s, l: x.l, n: Int(x.n), v: x.v, g: x.g >= 0 ? Int(x.g) + 1 : nil)) }
        }
        st.notes = list; st.nextUid = list.count + 1
        st.ghosts = (6..<10).filter { $0 != track }.map { t in
            let gd = model.engine.rollData(t); var g: [RNote] = []
            gd.withUnsafeBytes { raw in for x in raw.bindMemory(to: BLRollNote.self) { g.append(RNote(uid: 0, s: x.s, l: x.l, n: Int(x.n), v: x.v, g: nil)) } }
            return (t, g)
        }
        if center {
            let ns = list.map { $0.n }, all = ns.isEmpty ? [model.previewNote(track)] : ns
            let mid = CGFloat(all.min()! + all.max()!) / 2
            st.sy = (CGFloat(HI) - mid + 0.5) * st.rowH - st.size.height / 2
            st.clampScroll()
        }
    }

    private func commit() {
        st.notes.sort { $0.s != $1.s ? $0.s < $1.s : $0.n < $1.n }
        var at: [Int: Int32] = [:]; for (i, n) in st.notes.enumerated() { at[n.uid] = Int32(i) }
        var out = st.notes.map { BLRollNote(s: $0.s, l: $0.l, n: Int32($0.n), v: $0.v, g: $0.g.flatMap { at[$0] } ?? -1) }
        // a glide only goes forwards
        for i in out.indices where out[i].g >= 0 { if out[Int(out[i].g)].s <= out[i].s { out[i].g = -1 } }
        model.engine.setRollData(Data(bytes: &out, count: out.count * MemoryLayout<BLRollNote>.stride), track: track)
        model.revision += 1; model.scheduleSave()
    }

    private func edit(_ f: () -> Void) { model.engine.pushUndo(); f(); commit() }
    private func targetIdx() -> [Int] { st.sel.isEmpty ? Array(st.notes.indices) : st.notes.indices.filter { st.sel.contains(st.notes[$0].uid) } }
    private func transpose(_ d: Int) {
        edit { for i in targetIdx() { st.notes[i].n = min(HI, max(LO, st.notes[i].n + d)) } }
        if let f = targetIdx().first { audition(st.notes[f].n, st.notes[f].v) }
    }
    private func deleteSelected() { guard !st.sel.isEmpty else { return }; edit { st.notes.removeAll { st.sel.contains($0.uid) }; for i in st.notes.indices { if let g = st.notes[i].g, st.sel.contains(g) { st.notes[i].g = nil } } }; st.sel.removeAll() }
    private func duplicate() {
        guard !st.sel.isEmpty else { model.showToast("Markera toner att duplicera"); return }
        let T = st.notes.filter { st.sel.contains($0.uid) }
        let a = T.map { $0.s }.min()!, b = T.map { $0.s + $0.l }.max()!, span = b - a
        let cp = T.filter { $0.s + span < 16 }.map { RNote(uid: st.newUid(), s: $0.s + span, l: min($0.l, 16 - $0.s - span), n: $0.n, v: $0.v, g: nil) }
        guard !cp.isEmpty else { model.showToast("Ingen plats kvar i takten"); return }
        edit { st.notes += cp }; st.sel = Set(cp.map { $0.uid })
    }
    private func glideSelected() {
        let src = st.sel.count > 1 ? st.notes.filter { st.sel.contains($0.uid) } : st.notes
        let T = src.sorted { $0.s < $1.s }
        guard T.count >= 2 else { model.showToast("Markera minst två toner"); return }
        var k = 0
        edit {
            for (i, a) in T.enumerated() {
                guard let b = T[(i + 1)...].first(where: { $0.s > a.s + 1e-6 }) else { continue }
                link(a.uid, b.uid); k += 1
            }
        }
        model.showToast("\(k) glide-kablar")
    }
    private func link(_ a: Int, _ b: Int) {
        for i in st.notes.indices where st.notes[i].uid != a && st.notes[i].g == b { st.notes[i].g = nil }
        if let i = st.idx(a) { st.notes[i].g = b }
    }

    private func audition(_ n: Int, _ v: Float) {
        let t = track, dur = model.stepDur * Double(max(1, min(4, st.len)))
        model.engine.noteOn(n, velocity: v, track: t)
        model.hitTime[t] = CACurrentMediaTime()
        DispatchQueue.main.asyncAfter(deadline: .now() + dur) { model.engine.noteOff(n, track: t) }
    }

    private func zoomBy(_ f: CGFloat, at x: CGFloat) {
        let anchor = (x - KW + st.sx) / st.sw
        st.zoom = min(6, max(1, st.zoom * f))
        st.sx = anchor * st.sw - (x - KW); st.clampScroll()
    }

    // MARK: gestures (web: pointerdown / move / up)

    private func hit(_ p: CGPoint) -> (uid: Int, edge: Character?)? {
        let n0 = st.posN(p.y)
        for nt in st.notes.reversed() {
            let nx = st.rX(nt.s), wd = max(4, CGFloat(nt.l) * st.sw - 2)
            let rowOk = nt.n == n0 || (st.scale && !inScale(n0) && abs(nt.n - n0) == 1)
            let ez = max(7, min(16, wd * 0.4))
            if rowOk && p.x >= nx - 4 && p.x <= nx + wd + 10 {
                let edge: Character? = p.x > nx + wd - ez ? "R" : (wd > 22 && p.x < nx + min(10, wd * 0.25)) ? "L" : nil
                return (nt.uid, edge)
            }
        }
        return nil
    }
    private func port(_ p: CGPoint) -> Int? {
        for nt in st.notes.reversed() {
            let px = st.rX(nt.s) + max(4, CGFloat(nt.l) * st.sw - 2) + 8, py = st.rY(nt.n) + st.rowH / 2
            if p.x > px - 5 && hypot(p.x - px, p.y - py) < 9 { return nt.uid }
        }
        return nil
    }
    private func mag(_ v: Float, _ sn: Float) -> Float {
        let fine = (v / 0.0625).rounded() * 0.0625, r = (v / sn).rounded() * sn
        return abs(v - r) <= sn * 0.2 ? r : fine
    }

    private func onDrag(_ v: DragGesture.Value) {
        if st.drag == nil && !began { began = true; down(v.startLocation) }
        move(v.location)
    }
    @State private var began = false

    private func cancelDrag() {
        if let d = st.drag {
            if d.created, let i = st.idx(d.nt) { st.notes.remove(at: i); commit() }
            if d.kind == .keys { keyUp(d.key) }
        }
        st.drag = nil
    }

    private func down(_ p: CGPoint) {
        let SH = st.shiftLock
        if p.x < KW {
            let n = min(HI, max(LO, st.posN(p.y)))
            st.drag = .init(kind: .keys, key: n, sy0: st.sy); st.drag!.p0 = p; keyDown(n); return
        }
        if !SH, let pu = port(p) { model.engine.pushUndo(); st.drag = .init(kind: .cable, from: pu, at: p); return }
        let h = hit(p), now = CACurrentMediaTime()
        if let h = h, !SH, st.lastTap.uid == h.uid, now - st.lastTap.t < 0.32 {
            edit { st.notes.removeAll { $0.uid == h.uid }; for i in st.notes.indices where st.notes[i].g == h.uid { st.notes[i].g = nil } }
            st.sel.remove(h.uid); st.lastTap = (0, nil); return
        }
        st.lastTap = (now, h?.uid)
        if let h = h {
            model.engine.pushUndo()
            if SH && st.sel.contains(h.uid) { st.sel.remove(h.uid); return }
            if !st.sel.contains(h.uid) { if !SH { st.sel.removeAll() }; st.sel.insert(h.uid) }
            let orig = st.notes.filter { st.sel.contains($0.uid) }.map { (uid: $0.uid, s: $0.s, l: $0.l, n: $0.n) }
            let nt = st.notes[st.idx(h.uid)!]
            st.drag = .init(kind: h.edge == "L" ? .resizeL : h.edge != nil ? .resize : .move, p0: p, nt: h.uid, orig: orig, lastN: nt.n)
            st.lastVel = nt.v
            if h.edge == nil { audition(nt.n, nt.v) }
            return
        }
        if st.mode == "sel" || SH {
            let base = SH ? st.sel : []
            if !SH { st.sel.removeAll() }
            st.drag = .init(kind: .box, box: CGRect(origin: p, size: .zero), base: base); st.drag!.p0 = p; return
        }
        model.engine.pushUndo(); st.sel.removeAll()
        let sn = st.snap, s0 = min(max(0, floor(st.posS(p.x) / sn) * sn), 16 - sn)
        let n = st.scaleFix(min(HI, max(LO, st.posN(p.y))))
        let nt = RNote(uid: st.newUid(), s: s0, l: min(st.len, 16 - s0), n: n, v: st.lastVel, g: nil)
        st.notes.append(nt); st.sel.insert(nt.uid)
        st.drag = .init(kind: .resize, p0: p, nt: nt.uid, orig: [(uid: nt.uid, s: nt.s, l: nt.l, n: nt.n)], created: true)
        audition(n, nt.v); commit()
    }

    private func move(_ p: CGPoint) {
        guard var D = st.drag else { return }
        let sn = st.snap
        switch D.kind {
        case .keys:
            let dy = p.y - D.p0.y
            if !D.moved && abs(dy) > 8 { D.moved = true; keyUp(D.key) }
            if D.moved { st.sy = D.sy0 - dy; st.clampScroll() }
        case .cable: D.at = p
        case .box:
            D.box = CGRect(x: min(D.p0.x, p.x), y: min(D.p0.y, p.y), width: abs(p.x - D.p0.x), height: abs(p.y - D.p0.y))
            var s = D.base
            for nt in st.notes {
                let r = CGRect(x: st.rX(nt.s), y: st.rY(nt.n), width: CGFloat(nt.l) * st.sw, height: st.rowH)
                if r.intersects(D.box) { s.insert(nt.uid) }
            }
            st.sel = s
        case .move:
            let ds = Float(((p.x - D.p0.x) / st.sw / CGFloat(sn)).rounded()) * sn, dn = Int((-(p.y - D.p0.y) / st.rowH).rounded())
            let minS = D.orig.map { $0.s }.min() ?? 0, maxE = D.orig.map { $0.s + $0.l }.max() ?? 0
            let dc = min(max(ds, -minS), 16 - maxE)
            for o in D.orig { if let i = st.idx(o.uid) {
                st.notes[i].s = ((o.s + dc) * 1000).rounded() / 1000
                var nn = min(HI, max(LO, o.n + dn)); if D.orig.count == 1 { nn = st.scaleFix(nn) }
                st.notes[i].n = nn
            } }
            if let i = st.idx(D.nt), st.notes[i].n != D.lastN { D.lastN = st.notes[i].n; audition(st.notes[i].n, st.notes[i].v) }
            commit()
        case .resize:
            if D.created, let i = st.idx(D.nt) {
                let end = mag(st.posS(p.x), sn)
                st.notes[i].l = min(max(end - st.notes[i].s, 0.125), 16 - st.notes[i].s)
            } else {
                let dx = Float((p.x - D.p0.x) / st.sw)
                for o in D.orig { if let i = st.idx(o.uid) { let end = mag(o.s + o.l + dx, sn); st.notes[i].l = min(max(end - o.s, 0.125), 16 - st.notes[i].s) } }
            }
            commit()
        case .resizeL:
            let dx = Float((p.x - D.p0.x) / st.sw)
            for o in D.orig { if let i = st.idx(o.uid) {
                let end = o.s + o.l, s = min(max(mag(o.s + dx, sn), 0), end - 0.125)
                st.notes[i].s = (s * 10000).rounded() / 10000; st.notes[i].l = ((end - s) * 10000).rounded() / 10000
            } }
            commit()
        }
        st.drag = D
    }

    private func onEnd(_ v: DragGesture.Value) {
        began = false
        guard let D = st.drag else { return }
        st.drag = nil
        switch D.kind {
        case .cable:
            let h = hit(D.at)
            if let h = h, h.uid != D.from, let a = st.idx(D.from), let b = st.idx(h.uid), st.notes[b].s > st.notes[a].s + 1e-6 {
                link(D.from, h.uid); commit()
                model.showToast("Glide \(noteName(st.notes[st.idx(D.from)!].n)) → \(noteName(st.notes[st.idx(h.uid)!].n))")
            } else if h == nil, let a = st.idx(D.from), st.notes[a].g != nil {
                st.notes[a].g = nil; commit(); model.showToast("Glide borttagen")
            } else if h != nil && h!.uid != D.from { model.showToast("Dra kabeln till en senare ton") }
        case .keys: if !D.moved { keyUp(D.key) }
        case .resize:
            if let i = st.idx(D.nt) { st.lenI = max(0, kLens.firstIndex { $0.0 >= st.notes[i].l - 1e-6 } ?? 0) }
        default: break
        }
    }

    private func keyDown(_ n: Int) { st.pressed.insert(n); model.engine.noteOn(n, velocity: st.lastVel, track: track); model.hitTime[track] = CACurrentMediaTime() }
    private func keyUp(_ n: Int) { st.pressed.remove(n); model.engine.noteOff(n, track: track) }

    private func key(_ k: KeyPress) -> KeyPress.Result {
        let cmd = k.modifiers.contains(.command)
        if k.key == .delete || k.key == .deleteForward { deleteSelected(); return .handled }
        if cmd, let c = k.characters.lowercased().first {
            if c == "a" { st.sel = Set(st.notes.map { $0.uid }); return .handled }
            if c == "d" { duplicate(); return .handled }
            if c == "z" { if k.modifiers.contains(.shift) { model.redo() } else { model.undo() }; st.sel.removeAll(); load(center: false); return .handled }
        }
        if !st.sel.isEmpty && (k.key == .upArrow || k.key == .downArrow) { transpose((k.key == .upArrow ? 1 : -1) * (k.modifiers.contains(.shift) ? 12 : 1)); return .handled }
        if k.characters == "g" && st.sel.count > 1 { glideSelected(); return .handled }
        if k.key == .space { model.togglePlay(); return .handled }
        return .ignored
    }

    // MARK: drawing (web: drawRoll)

    private func playPos() -> Float? {
        guard model.playing, model.step >= 0 else { return nil }
        return Float(model.step) + Float(min(0.999, max(0, (CACurrentMediaTime() - model.stepTime) / model.stepDur)))
    }

    private func rr(_ r: CGRect, _ rad: CGFloat) -> Path { Path(roundedRect: r, cornerRadius: max(0, min(rad, r.width / 2, r.height / 2))) }

    private func draw(_ ctx: inout GraphicsContext, _ size: CGSize, _ now: Double) {
        if st.size != size { st.size = size; st.clampScroll() }
        let w = size.width, h = size.height, sw = st.sw, rowH = st.rowH, colHex = model.trackHex(track), col = Color(hex: colHex)
        // rows
        for n in stride(from: HI, through: LO, by: -1) {
            let y = st.rY(n); if y > h || y + rowH < 0 { continue }
            let c: Color = isBlack(n) ? .black.opacity(0.3) : (st.scale && inScale(n) ? .white.opacity(0.05) : .white.opacity(0.015))
            ctx.fill(Path(CGRect(x: KW, y: y, width: w - KW, height: rowH)), with: .color(c))
            if n % 12 == 0 { ctx.fill(Path(CGRect(x: KW, y: y + rowH - 1, width: w - KW, height: 1)), with: .color(.white.opacity(0.13))) }
        }
        // step lines
        let sn = min(1, st.snap * (st.zoom >= 2 ? 1 : 2))
        var s: Float = 0
        while s <= 16 + 1e-6 {
            let x = st.rX(s)
            if x >= KW - 1 && x <= w + 1 {
                let beat = abs(s.truncatingRemainder(dividingBy: 4)) < 1e-6, whole = abs(s.truncatingRemainder(dividingBy: 1)) < 1e-6
                let a: Double = (s == 0 || abs(s - 16) < 1e-6) ? 0.4 : beat ? 0.17 : whole ? 0.07 : 0.03
                ctx.fill(Path(CGRect(x: x.rounded(), y: 0, width: 1, height: h)), with: .color(.white.opacity(a)))
            }
            s += sn
        }
        let xe = st.rX(16); if xe < w { ctx.fill(Path(CGRect(x: xe, y: 0, width: w - xe, height: h)), with: .color(.black.opacity(0.4))) }
        // ghost notes of the other melodic tracks
        if st.ghost {
            for (t, list) in st.ghosts {
                let gc = Color(hex: model.trackHex(t)).opacity(0.17)
                for nt in list { let y = st.rY(nt.n); if y > h || y < -rowH { continue }
                    ctx.fill(rr(CGRect(x: st.rX(nt.s) + 1, y: y + 3, width: max(3, CGFloat(nt.l) * sw - 2), height: rowH - 6), 3), with: .color(gc)) }
            }
        }
        // notes
        let ph = playPos()
        for nt in st.notes {
            let x = st.rX(nt.s), y = st.rY(nt.n), wd = max(4, CGFloat(nt.l) * sw - 2)
            if y > h || y < -rowH || x > w || x + wd < KW { continue }
            let sel = st.sel.contains(nt.uid), live = ph.map { $0 >= nt.s && $0 < nt.s + nt.l } ?? false
            let r = CGRect(x: x + 1, y: y + 1, width: wd, height: rowH - 2)
            if live { var g = ctx; g.addFilter(.shadow(color: col, radius: 7)); g.fill(rr(r, 4), with: .color(col.opacity(0.42 + 0.58 * Double(nt.v)))) }
            else { ctx.fill(rr(r, 4), with: .color(col.opacity(0.42 + 0.58 * Double(nt.v)))) }
            if sel { ctx.stroke(rr(r, 4), with: .color(.white), lineWidth: 1.6) }
            ctx.fill(Path(CGRect(x: x + 1, y: y + rowH - 4, width: wd * CGFloat(nt.v), height: 2)), with: .color(Color(rgb: 17, 18, 17, 0.35)))
            if wd > 10 { ctx.fill(Path(CGRect(x: x + wd - 3, y: y + 5, width: 1.5, height: rowH - 10)), with: .color(.white.opacity(0.6))) }
            if wd > 30 { ctx.draw(Text(noteName(nt.n)).font(BFont.mono(9, 500)).foregroundColor(Color(rgb: 17, 18, 17, 0.82)), at: CGPoint(x: x + 6, y: y + rowH / 2), anchor: .leading) }
        }
        // glide cables (patch-cable style)
        func cable(_ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat, live: Bool) {
            let dx = abs(x2 - x1), sag = 14 + dx * 0.18 + abs(y2 - y1) * 0.1, yb = max(y1, y2) + sag
            var p = Path(); p.move(to: CGPoint(x: x1, y: y1)); p.addCurve(to: CGPoint(x: x2, y: y2), control1: CGPoint(x: x1 + dx * 0.35, y: yb), control2: CGPoint(x: x2 - dx * 0.35, y: yb))
            ctx.stroke(p, with: .color(.black.opacity(0.6)), style: StrokeStyle(lineWidth: 6, lineCap: .round))
            ctx.stroke(p, with: .color(col), style: StrokeStyle(lineWidth: 3.4, lineCap: .round))
            ctx.stroke(p, with: .color(.white.opacity(0.4)), style: StrokeStyle(lineWidth: 1, lineCap: .round))
            if live { ctx.stroke(p, with: .color(.white), style: StrokeStyle(lineWidth: 2.2, lineCap: .round, dash: [3, 9], dashPhase: -CGFloat((now * 1000 / 18).truncatingRemainder(dividingBy: 12)))) }
            for (x, y) in [(x1, y1), (x2, y2)] {
                ctx.fill(Path(ellipseIn: CGRect(x: x - 5.5, y: y - 5.5, width: 11, height: 11)), with: .color(Color(hex: 0x111211)))
                ctx.fill(Path(ellipseIn: CGRect(x: x - 3.4, y: y - 3.4, width: 6.8, height: 6.8)), with: .color(col))
            }
        }
        var byUid: [Int: RNote] = [:]; for n in st.notes { byUid[n.uid] = n }
        for a in st.notes {
            let xa = st.rX(a.s) + max(4, CGFloat(a.l) * sw - 2) + 8, ya = st.rY(a.n) + rowH / 2
            if let g = a.g, let b = byUid[g], b.s > a.s {
                cable(xa, ya, st.rX(b.s) + 2, st.rY(b.n) + rowH / 2, live: ph.map { $0 >= a.s && $0 < b.s + b.l } ?? false)
            } else if a.g == nil, ya > -10, ya < h + 10, xa < w + 10 {
                ctx.stroke(Path(ellipseIn: CGRect(x: xa - 3.6, y: ya - 3.6, width: 7.2, height: 7.2)), with: .color(col.opacity(0.75)), lineWidth: 1.4)
            }
        }
        if let D = st.drag, D.kind == .cable, let a = byUid[D.from] {
            cable(st.rX(a.s) + max(4, CGFloat(a.l) * sw - 2) + 8, st.rY(a.n) + rowH / 2, D.at.x, D.at.y, live: true)
        }
        if let D = st.drag, D.kind == .box {
            ctx.fill(Path(D.box), with: .color(.white.opacity(0.05)))
            ctx.stroke(Path(D.box.insetBy(dx: 0.5, dy: 0.5)), with: .color(.white.opacity(0.7)), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
        }
        if let p = ph {
            let x = st.rX(p)
            if x >= KW {
                ctx.fill(Path(CGRect(x: x, y: 0, width: 2, height: h)), with: .color(T.yellow))
                var t = Path(); t.move(to: CGPoint(x: x - 4, y: 0)); t.addLine(to: CGPoint(x: x + 6, y: 0)); t.addLine(to: CGPoint(x: x + 1, y: 6)); t.closeSubpath()
                ctx.fill(t, with: .color(T.yellow))
            }
        }
        // keyboard
        ctx.fill(Path(CGRect(x: 0, y: 0, width: KW, height: h)), with: .color(Color(hex: 0x0D0D11)))
        for n in stride(from: HI, through: LO, by: -1) where !isBlack(n) {
            let y = st.rY(n); if y > h || y + rowH < 0 { continue }
            ctx.fill(Path(CGRect(x: 0, y: y + 0.5, width: KW - 1, height: rowH - 1)), with: .color(st.pressed.contains(n) ? col : Color(hex: 0xE7E7E2)))
            if n % 12 == 0 { ctx.draw(Text("C\(n / 12 - 1)").font(BFont.mono(8, 600)).foregroundColor(Color(rgb: 17, 18, 17, 0.6)), at: CGPoint(x: KW - 20, y: y + rowH / 2), anchor: .leading) }
        }
        for n in stride(from: HI, through: LO, by: -1) where isBlack(n) {
            let y = st.rY(n); if y > h || y + rowH < 0 { continue }
            ctx.fill(rr(CGRect(x: 0, y: y + 1, width: KW * 0.6, height: rowH - 2), 2), with: .color(st.pressed.contains(n) ? col : Color(hex: 0x18181C)))
        }
        ctx.fill(Path(CGRect(x: KW - 1, y: 0, width: 1, height: h)), with: .color(.white.opacity(0.12)))
        if st.notes.isEmpty {
            let lines = ["tryck för att rita en ton · dra för längd", "dra kanten = längd · dubbeltryck = ta bort", "dra från ringen bakom en ton till nästa = glide", "shift = markera flera · två fingrar = scrolla/zooma"]
            for (i, l) in lines.enumerated() { ctx.draw(Text(l).font(BFont.sans(12)).foregroundColor(.white.opacity(0.55)), at: CGPoint(x: KW + 14, y: 14 + CGFloat(i) * 18), anchor: .topLeading) }
        }
    }

    // MARK: velocity lane

    @State private var velDrag: (best: Int, grp: [(Int, Float)])?
    private var velocityLane: some View {
        ZStack(alignment: .topLeading) {
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { _ in
                Canvas { ctx, size in
                    let vh = size.height, col = Color(hex: model.trackHex(track))
                    ctx.fill(Path(CGRect(x: 0, y: vh - 6, width: size.width, height: 1)), with: .color(.white.opacity(0.06)))
                    for nt in st.notes {
                        let x = st.rX(nt.s) + 4; if x < KW || x > size.width { continue }
                        let sel = st.sel.contains(nt.uid), top = vh - 6 - (vh - 14) * CGFloat(nt.v), c = sel ? Color.white : col.opacity(0.85)
                        ctx.fill(Path(CGRect(x: x - 1, y: top, width: 2, height: vh - 6 - top)), with: .color(c))
                        let r: CGFloat = sel ? 4.5 : 3.5
                        ctx.fill(Path(ellipseIn: CGRect(x: x - r, y: top - r, width: r * 2, height: r * 2)), with: .color(c))
                    }
                }
            }
            Text("velocity").font(BFont.mono(9)).foregroundColor(T.mute).padding(.leading, 8).padding(.top, 6).allowsHitTesting(false)
        }
        .frame(height: 76)
        .background(Color.black.opacity(0.28))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(.white.opacity(0.08), lineWidth: 1))
        .contentShape(Rectangle())
        .gesture(GeometryReaderGesture())
    }

    private func GeometryReaderGesture() -> some Gesture {
        DragGesture(minimumDistance: 0).onChanged { v in
            let vh: CGFloat = 76
            if velDrag == nil {
                var best: Int?; var bd: CGFloat = 18
                for nt in st.notes { let d = abs(st.rX(nt.s) + 4 - v.startLocation.x) - (st.sel.contains(nt.uid) ? 6 : 0); if d < bd { bd = d; best = nt.uid } }
                guard let b = best else { return }
                model.engine.pushUndo()
                let grp = st.sel.contains(b) ? Array(st.sel) : [b]
                velDrag = (b, grp.compactMap { u in st.idx(u).map { (u, st.notes[$0].v) } })
            }
            guard let vd = velDrag, let bi = st.idx(vd.best) else { return }
            let nv = Float(min(1, max(0.05, (vh - v.location.y - 6) / (vh - 14))))
            let d = nv - (vd.grp.first { $0.0 == vd.best }?.1 ?? nv)
            for (u, v0) in vd.grp { if let i = st.idx(u) { st.notes[i].v = u == vd.best ? nv : min(1, max(0.05, v0 + d)) } }
            st.lastVel = st.notes[bi].v
            commit()
        }.onEnded { _ in
            if let vd = velDrag, let i = st.idx(vd.best) { audition(st.notes[i].n, st.notes[i].v) }
            velDrag = nil
        }
    }
}

/// Two-finger / trackpad / mouse-wheel scrolling and pinch zoom for the roll, without stealing one-finger touches:
/// the recognisers are added to an ancestor view and only react inside this view's frame.
struct ScrollCatcher: UIViewRepresentable {
    let onPan: (CGFloat, CGFloat) -> Void
    let onPinch: (CGFloat, CGFloat) -> Void
    let onTwoFingers: () -> Void

    func makeCoordinator() -> Coord { Coord(self) }
    func makeUIView(context: Context) -> UIView {
        let v = UIView(); v.isUserInteractionEnabled = false; v.backgroundColor = .clear
        DispatchQueue.main.async { context.coordinator.attach(to: v) }
        return v
    }
    func updateUIView(_ v: UIView, context: Context) { context.coordinator.parent = self }
    static func dismantleUIView(_ v: UIView, coordinator: Coord) { coordinator.detach() }

    final class Coord: NSObject, UIGestureRecognizerDelegate {
        var parent: ScrollCatcher
        weak var anchor: UIView?
        weak var host: UIView?
        var pan: UIPanGestureRecognizer?, pinch: UIPinchGestureRecognizer?
        var lastPan: CGPoint = .zero, lastScale: CGFloat = 1
        init(_ p: ScrollCatcher) { parent = p }

        func attach(to v: UIView) {
            anchor = v
            guard let h = v.window?.rootViewController?.view ?? v.superview?.superview else { return }
            host = h
            let p = UIPanGestureRecognizer(target: self, action: #selector(onPan(_:)))
            p.minimumNumberOfTouches = 2; p.allowedScrollTypesMask = .all; p.delegate = self; p.cancelsTouchesInView = false
            let z = UIPinchGestureRecognizer(target: self, action: #selector(onPinch(_:))); z.delegate = self; z.cancelsTouchesInView = false
            h.addGestureRecognizer(p); h.addGestureRecognizer(z); pan = p; pinch = z
        }
        func detach() { if let p = pan { p.view?.removeGestureRecognizer(p) }; if let z = pinch { z.view?.removeGestureRecognizer(z) } }

        private func inside(_ g: UIGestureRecognizer) -> Bool {
            guard let a = anchor, a.window != nil else { return false }
            return a.bounds.contains(g.location(in: a))
        }
        func gestureRecognizerShouldBegin(_ g: UIGestureRecognizer) -> Bool { inside(g) }
        func gestureRecognizer(_ g: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith o: UIGestureRecognizer) -> Bool { true }

        @objc func onPan(_ g: UIPanGestureRecognizer) {
            guard let a = anchor else { return }
            let t = g.translation(in: a)
            if g.state == .began { lastPan = .zero; if g.numberOfTouches >= 2 { parent.onTwoFingers() } }
            parent.onPan(t.x - lastPan.x, t.y - lastPan.y); lastPan = t
        }
        @objc func onPinch(_ g: UIPinchGestureRecognizer) {
            guard let a = anchor else { return }
            if g.state == .began { lastScale = 1; parent.onTwoFingers() }
            parent.onPinch(g.scale / lastScale, g.location(in: a).x); lastScale = g.scale
        }
    }
}
