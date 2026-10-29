import SwiftUI
import UIKit

/// Two-octave touch keyboard (multi-touch) that plays the selected track, like the web version's keys.
struct KeyboardView: View {
    @EnvironmentObject var model: EngineModel
    @State private var octave = 4
    @State private var held: [Int: Int] = [:]   // touch id -> note (one finger per key)

    private let whites = [0, 2, 4, 5, 7, 9, 11]
    private let blacks: [(Int, Int)] = [(1, 0), (3, 1), (6, 3), (8, 4), (10, 5)]   // (semitone, after white index)

    var body: some View {
        HStack(spacing: 8) {
            VStack(spacing: 6) {
                Button { octave = min(7, octave + 1) } label: { Image(systemName: "chevron.up") }.frame(width: 36, height: 36)
                Text("O\(octave)").font(.system(size: 11, weight: .bold, design: .monospaced))
                Button { octave = max(1, octave - 1) } label: { Image(systemName: "chevron.down") }.frame(width: 36, height: 36)
            }
            .foregroundStyle(.white)
            .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
            GeometryReader { geo in
                let nW = 14
                let w = geo.size.width / CGFloat(nW)
                let h = geo.size.height
                ZStack(alignment: .topLeading) {
                    ForEach(0..<nW, id: \.self) { i in
                        let note = baseNote + (i / 7) * 12 + whites[i % 7]
                        RoundedRectangle(cornerRadius: 6)
                            .fill(held.values.contains(note) ? Color(hex: 0xFFD21F) : Color(hex: 0xEDEDE8))
                            .frame(width: w - 3, height: h)
                            .offset(x: CGFloat(i) * w)
                    }
                    ForEach(0..<10, id: \.self) { j in
                        let oct = j / 5, b = blacks[j % 5], note = baseNote + oct * 12 + b.0
                        RoundedRectangle(cornerRadius: 5)
                            .fill(held.values.contains(note) ? Color(hex: 0xFFD21F) : Color(hex: 0x1C1C20))
                            .frame(width: w * 0.62, height: h * 0.6)
                            .offset(x: CGFloat(oct * 7 + b.1 + 1) * w - w * 0.31 - 1.5)
                    }
                }
                .overlay(TouchCatcher { id, point, phase in handle(id: id, point: point, phase: phase, size: geo.size) })
            }
        }
    }

    private var baseNote: Int { 12 * (octave + 1) - 12 }   // octave 4 -> C3 (48), like the web keys

    private func noteAt(_ p: CGPoint, _ size: CGSize) -> Int? {
        guard p.x >= 0, p.y >= 0, p.x < size.width, p.y < size.height else { return nil }
        let w = size.width / 14
        if p.y < size.height * 0.6 {
            for j in 0..<10 {
                let oct = j / 5, b = blacks[j % 5]
                let cx = CGFloat(oct * 7 + b.1 + 1) * w
                if abs(p.x - cx) < w * 0.31 { return baseNote + oct * 12 + b.0 }
            }
        }
        let i = min(13, Int(p.x / w))
        return baseNote + (i / 7) * 12 + whites[i % 7]
    }

    private func handle(id: Int, point: CGPoint, phase: UITouch.Phase, size: CGSize) {
        switch phase {
        case .began, .moved:
            let n = noteAt(point, size)
            if held[id] != n {
                if let old = held[id] { model.noteOff(old); held[id] = nil }
                if let n = n { model.noteOn(n); held[id] = n }
            }
        default:
            if let old = held[id] { model.noteOff(old); held[id] = nil }
        }
    }
}

/// Raw multi-touch for the keyboard (SwiftUI gestures are single-touch and add latency).
struct TouchCatcher: UIViewRepresentable {
    let onTouch: (Int, CGPoint, UITouch.Phase) -> Void
    func makeUIView(context: Context) -> TouchView { let v = TouchView(); v.onTouch = onTouch; return v }
    func updateUIView(_ v: TouchView, context: Context) { v.onTouch = onTouch }

    final class TouchView: UIView {
        var onTouch: ((Int, CGPoint, UITouch.Phase) -> Void)?
        override init(frame: CGRect) { super.init(frame: frame); isMultipleTouchEnabled = true; backgroundColor = .clear }
        required init?(coder: NSCoder) { fatalError() }
        private func send(_ touches: Set<UITouch>) {
            for t in touches { onTouch?(ObjectIdentifier(t).hashValue, t.location(in: self), t.phase) }
        }
        override func touchesBegan(_ t: Set<UITouch>, with e: UIEvent?) { send(t) }
        override func touchesMoved(_ t: Set<UITouch>, with e: UIEvent?) { send(t) }
        override func touchesEnded(_ t: Set<UITouch>, with e: UIEvent?) { send(t) }
        override func touchesCancelled(_ t: Set<UITouch>, with e: UIEvent?) { send(t) }
    }
}
