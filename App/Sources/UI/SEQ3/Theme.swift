import SwiftUI
import CoreText

/// Design tokens copied from the web version (BLONDA SEQ.3 Glass, :root and the dot-matrix "dm" palette).
enum T {
    static let bg = Color(hex: 0x0B0B10)
    static let fg = Color(hex: 0xF5F5F2)
    static let mute = Color(hex: 0xF5F5F2).opacity(0.56)
    static let yellow = Color(hex: 0xF2C318)
    static let ink = Color(hex: 0x111211)            // text on yellow
    // dark "dot matrix" cards
    static let dmBg = Color(hex: 0x1D1E21)
    static let dmCell = Color(hex: 0x232428)
    static let dmCell2 = Color(hex: 0x1E1F22)
    static let dmLine = Color(hex: 0x2F3034)
    static let dmInk = Color(hex: 0xE8E6DC)
    static let dmY = Color(hex: 0xE9C54A)
    static let dmTeal = Color(hex: 0x2FB5AE)
    static let loopGreen = Color(hex: 0x6BE28C)
}

/// The BLONDA typefaces (bundled in Resources/Fonts, registered at launch).
enum BFont {
    static func registerAll() {
        guard let urls = Bundle.main.urls(forResourcesWithExtension: "ttf", subdirectory: nil) else { return }
        for u in urls { CTFontManagerRegisterFontsForURL(u as CFURL, .process, nil) }
        if let more = Bundle.main.urls(forResourcesWithExtension: "ttf", subdirectory: "Fonts") {
            for u in more { CTFontManagerRegisterFontsForURL(u as CFURL, .process, nil) }
        }
    }
    /// BLONDA Sans (web weights 251-349 light, 350-449 regular, 450+ medium)
    static func sans(_ size: CGFloat, _ weight: Int = 400) -> Font {
        let n = weight >= 450 ? "BLONDASans24pt-Medium" : weight >= 350 ? "BLONDASans24pt-Regular" : weight >= 251 ? "BLONDASans24pt-Light" : "BLONDASans72pt-ExtraLight"
        return .custom(n, fixedSize: size)
    }
    static func mono(_ size: CGFloat, _ weight: Int = 400) -> Font {
        let n = weight >= 450 ? "BLONDAMono-Medium" : weight >= 350 ? "BLONDAMono-Regular" : "BLONDAMono-Light"
        return .custom(n, fixedSize: size)
    }
    static func pixel(_ size: CGFloat) -> Font { .custom("BLONDAPixel-Regular", fixedSize: size) }
    static func linje(_ size: CGFloat) -> Font { .custom("BLONDALinje-Regular", fixedSize: size) }
}

extension Color {
    init(rgb r: Double, _ g: Double, _ b: Double, _ a: Double = 1) { self.init(.sRGB, red: r / 255, green: g / 255, blue: b / 255, opacity: a) }
}

/// Web track colours; melodic tracks take the colour of the engine loaded on them (ENG[e].dot).
let kEngineDot: [String: UInt32] = [
    "analog": 0xF2788E, "acid": 0xC9F23A, "sub": 0xFF3B2F, "fm": 0x8CCBFF, "pluck": 0x1F8A5B,
    "bris": 0x3D7BFF, "sh101": 0x2F6FE0, "mini": 0xE89B3C, "chip": 0x8BAC0F, "super": 0xB9A6FF,
]
let kEngineName: [String: String] = [
    "analog": "Analog", "acid": "Acid", "sub": "Sub 808", "fm": "FM Glass", "pluck": "Pluck",
    "bris": "Bris", "sh101": "SH-101", "mini": "Moog", "chip": "Chip", "super": "Super Pad",
]
let kTrackHex: [UInt32] = [0xF5F5F2, 0x3D6CF5, 0x27B26B, 0xBDBDB8, 0xFFD21F, 0xFF6A1A, 0xFF3B2F, 0x8E7CFF, 0x00C2C7, 0xF7A6C8]

extension EngineModel {
    func trackHex(_ i: Int) -> UInt32 {
        if i < 6 { return kTrackHex[i] }
        return kEngineDot[engine.instrument(forTrack: i)] ?? kTrackHex[i]
    }
    func trackColor(_ i: Int) -> Color { Color(hex: trackHex(i)) }
    func trackSub(_ i: Int) -> String {
        if i < 6 { return drumSampleMeta(i)?.name ?? kTracks[i].sub }
        return kEngineName[engine.instrument(forTrack: i)] ?? kTracks[i].sub
    }
}

/// Mix two colours like CSS color-mix(in srgb, a p%, b).
func mixColor(_ a: UInt32, _ b: UInt32, _ p: Double) -> Color {
    func c(_ h: UInt32, _ s: UInt32) -> Double { Double((h >> s) & 0xFF) }
    return Color(rgb: c(a, 16) * p + c(b, 16) * (1 - p), c(a, 8) * p + c(b, 8) * (1 - p), c(a, 0) * p + c(b, 0) * (1 - p))
}
