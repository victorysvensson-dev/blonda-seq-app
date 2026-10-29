import SwiftUI
import UIKit

/// "One living blurred colour field": four drifting radial blobs added together over the palette's base colour,
/// pulsing with the kick (energy) and tinted by the selected track — a straight port of drawBg() in the web version.
struct Palette {
    let base: (Double, Double, Double)
    let c: [UInt32]
    var mono = false
    static let aurora = Palette(base: (11, 11, 18), c: [0x6B4CFF, 0xF255A8, 0x2EC5FF, 0xB9A6FF])   // world "Velvet"
}

final class BlobState {
    static let shared = BlobState()
    struct Blob { var ph: Double; var sp: Double; var r: Double; var col: [Double] }
    var blobs: [Blob] = (0..<4).map { i in Blob(ph: Double(i) * 1.7, sp: 0.05 + Double(i) * 0.017, r: 0.5 + Double(i) * 0.06, col: [0, 0, 0]) }
    var last: Double = 0
}

private func rgb(_ h: UInt32) -> [Double] { [Double((h >> 16) & 0xFF), Double((h >> 8) & 0xFF), Double(h & 0xFF)] }

struct LivingBackground: View {
    @EnvironmentObject var model: EngineModel
    var palette = Palette.aurora

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { tl in
                let t = tl.date.timeIntervalSince(Field.start)
                Canvas { ctx, size in
                    ScreenSize.current = size
                    let state = BlobState.shared, P = palette
                    // ease blob colours toward their targets (web: += (target-col)*.04 per ~32 ms frame)
                    let dt = state.last == 0 ? 1.0 / 30.0 : max(0, min(0.25, t - state.last)); state.last = t
                    let k = 1 - pow(1 - 0.04, dt * 30)
                    let sel = rgb(model.selColHex)
                    for i in 0..<4 {
                        let tgt0 = rgb(P.c[i])
                        let tgt = (i == 0 && !P.mono) ? zip(tgt0, sel).map { $0 + ($1 - $0) * 0.45 } : tgt0
                        for j in 0..<3 { state.blobs[i].col[j] += (tgt[j] - state.blobs[i].col[j]) * k }
                    }
                    var c = ctx
                    Field.draw(&c, size: size, origin: .zero, screen: size, t: t, energy: model.energy, palette: P)
                }
            }
            .onAppear { ScreenSize.current = geo.size }
        }
        .overlay(GrainView().blendMode(.overlay).opacity(0.09).allowsHitTesting(false))
        .ignoresSafeArea()
    }
}

/// Film grain: a 140×140 random-noise tile repeated over the screen (the web's .grain layer).
struct GrainView: View {
    static let tile: UIImage = {
        let n = 140
        var px = [UInt8](repeating: 255, count: n * n * 4)
        for i in 0..<(n * n) { let v = UInt8.random(in: 0...255); px[i * 4] = v; px[i * 4 + 1] = v; px[i * 4 + 2] = v }
        let cs = CGColorSpaceCreateDeviceRGB()
        let ctx = CGContext(data: &px, width: n, height: n, bitsPerComponent: 8, bytesPerRow: n * 4, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        return UIImage(cgImage: ctx.makeImage()!)
    }()
    var body: some View {
        Image(uiImage: Self.tile).resizable(resizingMode: .tile).ignoresSafeArea()
    }
}
