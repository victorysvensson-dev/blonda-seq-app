import SwiftUI

// MARK: - Background field shared by the page and the glass cards

/// The blob field as a pure function of time + the eased colours kept in BlobState.shared,
/// so glass cards can redraw exactly the part of the field behind them (their "backdrop").
enum Field {
    static let start = Date()
    static func draw(_ ctx: inout GraphicsContext, size: CGSize, origin: CGPoint, screen: CGSize, t: Double, energy: Double, palette: Palette = .current) {
        let st = BlobState.shared
        let W = screen.width, H = screen.height
        let rect = CGRect(origin: .zero, size: size)
        ctx.fill(Path(rect), with: .color(Color(rgb: palette.base.0, palette.base.1, palette.base.2)))
        ctx.blendMode = palette.light ? .normal : .plusLighter
        for (i, b) in st.blobs.enumerated() {
            let x = W * (0.5 + 0.38 * sin(t * b.sp * 6 + b.ph)) - origin.x
            let y = H * (0.45 + 0.36 * cos(t * b.sp * 4.3 + b.ph * 1.3)) - origin.y
            let R = max(W, H) * (b.r + (i == 0 ? energy * 0.18 : energy * 0.06))
            let c = b.col
            let g = Gradient(stops: [
                .init(color: Color(rgb: c[0], c[1], c[2], 0.38 + (i == 0 ? energy * 0.2 : 0)), location: 0),
                .init(color: Color(rgb: c[0], c[1], c[2], 0.18), location: 0.5),
                .init(color: Color(rgb: c[0], c[1], c[2], 0), location: 1),
            ])
            ctx.fill(Path(rect), with: .radialGradient(g, center: CGPoint(x: x, y: y), startRadius: 0, endRadius: R))
        }
        ctx.blendMode = .normal
        if !palette.light { ctx.fill(Path(rect), with: .color(.black.opacity(0.36))) }
    }
}

/// Re-draws the field behind a card with the card's backdrop-filter (saturate 180 %); the field is already a blur,
/// so blurring it again changes nothing visible.
struct Backdrop: View {
    @EnvironmentObject var model: EngineModel
    var saturation: Double = 1.8
    var body: some View {
        if LookStore.shared.look != .glass { BS.panel } else { glass }
    }
    private var glass: some View {
        GeometryReader { geo in
            let f = geo.frame(in: .global)
            TimelineView(.animation(minimumInterval: 1.0 / 20.0)) { tl in
                Canvas { ctx, size in
                    var c = ctx
                    Field.draw(&c, size: size, origin: f.origin, screen: ScreenSize.current, t: tl.date.timeIntervalSince(Field.start), energy: model.energy)
                    // light world (web body.bg-light --glass): the glass gets a dark tint so the cards stay dark
                    if Palette.current.light { c.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color(rgb: 17, 18, 17, 0.56))) }
                }
            }
            .saturation(saturation)
        }
    }
}

enum ScreenSize { static var current = CGSize(width: 1366, height: 1024) }

// MARK: - Card styles

enum CardStyle { case glass, dark, tinted(Color), solid(Color) }

/// A web ".card": caption row (title + minimise / fullscreen / grab buttons) and content, in one of the looks.
struct Card<Content: View>: View {
    var style: CardStyle = .glass
    var title: [(String, Bool)]          // (text, bold)
    var extra: AnyView? = nil
    @ViewBuilder var content: () -> Content

    private var dark: Bool { if case .dark = style { return true } else { return false } }
    @ObservedObject private var store = FoldStore.shared
    private var key: String { (title.first?.0 ?? "card").lowercased().components(separatedBy: CharacterSet.letters.inverted).first ?? "card" }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                (title.reduce(Text("")) { acc, p in
                    acc + Text(p.0.lowercased()).font(BFont.mono(9.5, p.1 ? 500 : 400)).foregroundColor(p.1 ? (dark ? T.dmInk : T.fg) : (dark ? T.dmInk.opacity(0.45) : T.mute))
                })
                .tracking(dark ? 0.57 : 0.855)
                Spacer(minLength: 4)
                if let e = extra { e }
                HStack(spacing: 5) {
                    CapButton(kind: .min, dark: dark, fold: key)
                    CapButton(kind: .full, dark: dark, fold: key)
                }
                CapButton(kind: .grab, dark: dark).padding(.leading, 8)
            }
            .frame(height: 26)
            if !store.isFolded(key) || FullStore.shared.key == key { content().transition(.opacity.combined(with: .move(edge: .top))) }
        }
        .padding(16)
        .background(lookBackground)
        .overlay(lookBorder)
        .compositingGroup()
        .shadow(color: .black.opacity(LookStore.shared.look == .glass ? (dark ? 0.7 : 0.65) : 0), radius: 25, x: 0, y: 26 - 13)
    }

    @ViewBuilder private var lookBackground: some View {
        switch LookStore.shared.look {
        case .glass: background
        case .studio: Rectangle().fill(dark ? T.dmBg : BS.panel)
        case .dots: Rectangle().fill(BS.ground.opacity(dark ? 0.7 : 0.25))
        }
    }
    @ViewBuilder private var lookBorder: some View {
        switch LookStore.shared.look {
        case .glass: border
        case .studio: Rectangle().strokeBorder(BS.line, lineWidth: 1).allowsHitTesting(false)
        case .dots: DotBorder()
        }
    }

    @ViewBuilder private var background: some View {
        switch style {
        case .dark:
            Rectangle().fill(T.dmBg)
        case .glass:
            RoundedRectangle(cornerRadius: T.cardR, style: .continuous).fill(.clear)
                .background(Backdrop().clipShape(RoundedRectangle(cornerRadius: T.cardR, style: .continuous)))
                .overlay(RoundedRectangle(cornerRadius: T.cardR, style: .continuous).fill(LinearGradient(stops: [
                    .init(color: Color.white.opacity(0.1), location: 0), .init(color: Color.white.opacity(0.043), location: 0.4), .init(color: Color.white.opacity(0.03), location: 1),
                ], startPoint: UnitPoint(x: 0.25, y: 0.07), endPoint: UnitPoint(x: 0.75, y: 0.93))))
                .overlay(RoundedRectangle(cornerRadius: T.cardR, style: .continuous).fill(RadialGradient(colors: [.white.opacity(0.06), .clear], center: UnitPoint(x: 0.2, y: -0.1), startRadius: 0, endRadius: 156)))
        case .solid(let c):
            RoundedRectangle(cornerRadius: T.cardR, style: .continuous).fill(c)
                .overlay(RoundedRectangle(cornerRadius: T.cardR, style: .continuous).strokeBorder(LinearGradient(colors: [.white.opacity(0.14), .white.opacity(0.02)], startPoint: .top, endPoint: .bottom), lineWidth: 1))
        case .tinted(let c):
            RoundedRectangle(cornerRadius: T.cardR, style: .continuous).fill(.clear)
                .background(Backdrop().clipShape(RoundedRectangle(cornerRadius: T.cardR, style: .continuous)))
                .overlay(RoundedRectangle(cornerRadius: T.cardR, style: .continuous).fill(LinearGradient(stops: [
                    .init(color: c.opacity(0.16), location: 0), .init(color: Color.white.opacity(0.04), location: 0.45), .init(color: Color.white.opacity(0.03), location: 1),
                ], startPoint: UnitPoint(x: 0.33, y: 0.03), endPoint: UnitPoint(x: 0.67, y: 0.97))))
        }
    }

    @ViewBuilder private var border: some View {
        if dark {
            Rectangle().strokeBorder(T.dmLine, lineWidth: 1)
        } else {
            // inset top highlight + the gradient rim (.card::after)
            ZStack {
                RoundedRectangle(cornerRadius: T.cardR, style: .continuous)
                    .strokeBorder(LinearGradient(stops: [
                        .init(color: Color.white.opacity(0.5), location: 0), .init(color: Color.white.opacity(0.05), location: 0.35),
                        .init(color: Color.white.opacity(0.02), location: 0.65), .init(color: Color.white.opacity(0.22), location: 1),
                    ], startPoint: UnitPoint(x: 0.33, y: 0.03), endPoint: UnitPoint(x: 0.67, y: 0.97)), lineWidth: 1)
            }
            .allowsHitTesting(false)
        }
    }
}

/// Which cards are minimised (web: S.cmin), remembered between launches.
final class FoldStore: ObservableObject {
    static let shared = FoldStore()
    @Published private(set) var folded: Set<String>
    private init() { folded = Set(UserDefaults.standard.stringArray(forKey: "cmin") ?? []) }
    func isFolded(_ k: String) -> Bool { folded.contains(k) && FullStore.shared.key != k }
    func toggle(_ k: String) {
        withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) { if folded.contains(k) { folded.remove(k) } else { folded.insert(k) } }
        UserDefaults.standard.set(Array(folded), forKey: "cmin")
    }
}

/// The card shown large over everything (web: setFull / .fullhost).
final class FullStore: ObservableObject {
    static let shared = FullStore()
    @Published var key: String?
    func toggle(_ k: String) { withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) { key = key == k ? nil : k } }
}

struct CapButton: View {
    enum Kind { case min, full, grab }
    let kind: Kind
    let dark: Bool
    var tint: Color? = nil
    var fill: Color? = nil
    var fold: String? = nil            // .min: the card this chevron folds
    @ObservedObject private var store = FoldStore.shared
    @ObservedObject private var full = FullStore.shared
    var body: some View {
        if kind == .min, let k = fold {
            if full.key == k { EmptyView() } else {
                Button { store.toggle(k) } label: { face.rotationEffect(.degrees(store.isFolded(k) ? 180 : 0)) }
                    .buttonStyle(PressScale())
            }
        } else if kind == .full, let k = fold {
            Button { full.toggle(k) } label: { face.rotationEffect(.degrees(full.key == k ? 180 : 0)) }
                .buttonStyle(PressScale())
        } else { face }
    }
    private var face: some View {
        ZStack {
            if dark { Rectangle().strokeBorder(T.dmLine, lineWidth: 1) } else { Circle().fill(fill ?? Color.white.opacity(0.07)) }
            Canvas { ctx, size in
                let c = CGPoint(x: size.width / 2, y: size.height / 2)
                let col = tint ?? (dark ? T.dmInk : T.fg)
                switch kind {
                case .min:
                    var p = Path(); p.move(to: CGPoint(x: c.x - 3.5, y: c.y - 1.5)); p.addLine(to: CGPoint(x: c.x, y: c.y + 2)); p.addLine(to: CGPoint(x: c.x + 3.5, y: c.y - 1.5))
                    ctx.stroke(p, with: .color(col), style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
                case .full:
                    var p = Path()
                    p.move(to: CGPoint(x: c.x + 0.5, y: c.y - 0.5)); p.addLine(to: CGPoint(x: c.x + 4, y: c.y - 4))
                    p.move(to: CGPoint(x: c.x + 1, y: c.y - 4)); p.addLine(to: CGPoint(x: c.x + 4, y: c.y - 4)); p.addLine(to: CGPoint(x: c.x + 4, y: c.y - 1))
                    p.move(to: CGPoint(x: c.x - 0.5, y: c.y + 0.5)); p.addLine(to: CGPoint(x: c.x - 4, y: c.y + 4))
                    p.move(to: CGPoint(x: c.x - 4, y: c.y + 1)); p.addLine(to: CGPoint(x: c.x - 4, y: c.y + 4)); p.addLine(to: CGPoint(x: c.x - 1, y: c.y + 4))
                    ctx.stroke(p, with: .color(col), style: StrokeStyle(lineWidth: 1.4, lineCap: .round, lineJoin: .round))
                case .grab:
                    for r in 0..<3 { for k in 0..<2 {
                        let x = c.x - 3 + CGFloat(k) * 6, y = c.y - 4 + CGFloat(r) * 4
                        ctx.fill(Path(ellipseIn: CGRect(x: x - 1.1, y: y - 1.1, width: 2.2, height: 2.2)), with: .color(col.opacity(0.7)))
                    } }
                }
            }
        }
        .frame(width: 26, height: 26)
    }
}

// MARK: - small shared pieces

/// Square "chip" button used on the dark cards (inset 1px line, mono 10 / 500).
struct DMChip<Label: View>: View {
    var fill: Color? = nil
    var action: () -> Void = {}
    @ViewBuilder var label: () -> Label
    var body: some View {
        Button(action: action) {
            label()
                .font(BFont.mono(10, 500)).tracking(0.3).lineLimit(1).fixedSize()
                .foregroundColor(fill == nil ? T.dmInk : (fill == Color(hex: 0xC9452F) ? Color.white : Color(hex: 0x17181A)))
                .padding(.horizontal, 12).frame(height: 30)
                .background(fill ?? Color.clear)
                .overlay(Rectangle().strokeBorder(fill == nil ? T.dmLine : Color.clear, lineWidth: 1))
        }
        .buttonStyle(PressScale())
    }
}
