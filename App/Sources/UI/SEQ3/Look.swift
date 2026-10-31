import SwiftUI

/// The app's look (an app setting, not saved in the project): the web's glass cards, the BLONDA studio look
/// from blonda.studio (flat panels, straight edges, seams, yellow accent) or BLONDA dots (no blocks — dotted
/// outlines on a dot grid, everything in the yellow).
enum Look: Int, CaseIterable {
    case glass, studio, dots
    var name: String { ["glas", "studio", "dots"][rawValue] }
}

final class LookStore: ObservableObject {
    static let shared = LookStore()
    @Published var look: Look { didSet { UserDefaults.standard.set(look.rawValue, forKey: "look") } }
    private init() {
        let i = ProcessInfo.processInfo.arguments.firstIndex(of: "-look").flatMap { j in Int(ProcessInfo.processInfo.arguments[safe: j + 1] ?? "") }
        look = Look(rawValue: i ?? UserDefaults.standard.integer(forKey: "look")) ?? .glass
    }
    func next() { withAnimation(.easeInOut(duration: 0.35)) { look = Look(rawValue: (look.rawValue + 1) % Look.allCases.count) ?? .glass } }
}

extension Array { subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil } }

/// blonda.studio colours
enum BS {
    static let ground = Color(hex: 0x17181A), panel = Color(hex: 0x1C1E20), panel2 = Color(hex: 0x232528)
    static let line = Color(hex: 0x373738), ink = Color(hex: 0xEDEAE0), ink2 = Color(hex: 0x8F8E8A)
    static let accent = Color(hex: 0xE9C54A), teal = Color(hex: 0x227E7A)
}

extension T {
    /// corner radius of the cards: round glass, straight edges in the BLONDA looks
    static var cardR: CGFloat { LookStore.shared.look == .glass ? 22 : 0 }
}

/// The light (cream / white) cards turn dark in the BLONDA looks: inverted, then the hue turned back, so the
/// colours keep their character but the blocks of light disappear.
struct LookInvert: ViewModifier {
    @ObservedObject private var store = LookStore.shared
    var dots = true   // false: an inner part whose card is already inverted as a whole in the dots look
    func body(content: Content) -> some View {
        if store.look == .glass || (!dots && store.look == .dots) { content } else { content.colorInvert().hueRotation(.degrees(180)) }
    }
}

extension View {
    /// Card blocks (backgrounds, rims, shadows) disappear in the dots look — everything sits on the one yellow surface.
    func dotsHidden() -> some View { opacity(LookStore.shared.look == .dots ? 0 : 1) }
    /// Cards drawn dark-on-light get inverted in the dots look, so their ink comes out dark on the yellow like the rest.
    @ViewBuilder func dotsInvert(_ on: Bool = true) -> some View {
        if on && LookStore.shared.look == .dots { colorInvert() } else { self }
    }
}

/// BLONDA dots: the whole page in the style of the yellow transport — one yellow surface with dark
/// dot-matrix ink, no windows. Done as one filter over the views (light → dark ink, dark → yellow), so every card
/// follows without its own yellow version.
struct DotsFilter: ViewModifier {
    @ObservedObject private var store = LookStore.shared
    func body(content: Content) -> some View {
        if store.look == .dots {
            content.grayscale(1).contrast(1.12).colorInvert().brightness(0.05).colorMultiply(Color(hex: 0xF2C318))
        } else { content }
    }
}

/// Background of the whole page per look.
struct LookBackground: View {
    @ObservedObject private var store = LookStore.shared
    var body: some View {
        switch store.look {
        case .glass: LivingBackground()
        case .studio: BS.ground.ignoresSafeArea()
        case .dots:
            BS.ground.overlay(DotGrid(spacing: 12, radius: 1.2, color: BS.accent.opacity(0.22))).ignoresSafeArea()
        }
    }
}

/// A row of dots along every edge — the BLONDA dots look draws its cards with these instead of blocks.
struct DotBorder: View {
    var color: Color = BS.accent.opacity(0.55)
    var step: CGFloat = 7
    var r: CGFloat = 1.3
    var body: some View {
        Canvas { c, size in
            var p = Path()
            func dot(_ x: CGFloat, _ y: CGFloat) { p.addEllipse(in: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)) }
            let nx = max(1, Int((size.width - 2 * r) / step)), ny = max(1, Int((size.height - 2 * r) / step))
            let sx = (size.width - 2 * r) / CGFloat(nx), sy = (size.height - 2 * r) / CGFloat(ny)
            for i in 0...nx { dot(r + CGFloat(i) * sx, r); dot(r + CGFloat(i) * sx, size.height - r) }
            for j in 1..<max(2, ny) where j < ny { dot(r, r + CGFloat(j) * sy); dot(size.width - r, r + CGFloat(j) * sy) }
            c.fill(p, with: .color(color))
        }
        .allowsHitTesting(false)
    }
}
