import GameController
import QuartzCore

/// The computer keyboard as an instrument, read straight from the hardware (GameController), so it works
/// whatever was clicked last: space = play/stop, A W S E D F T G Y H U J K O L P Ö Ä = notes (key positions,
/// like the web version), Z / X = octave down / up. Keys held with ⌘ are left to the app's shortcuts.
final class KeyboardInput {
    private weak var model: EngineModel?
    private var octave = 4
    private var held: [GCKeyCode: (note: Int, track: Int)] = [:]
    private var down = Set<GCKeyCode>()
    private(set) var active = false
    private static let noteKeys: [GCKeyCode] = [.keyA, .keyW, .keyS, .keyE, .keyD, .keyF, .keyT, .keyG, .keyY, .keyH, .keyU, .keyJ,
                                                 .keyK, .keyO, .keyL, .keyP, .semicolon, .quote]

    init(model: EngineModel) {
        self.model = model
        NotificationCenter.default.addObserver(forName: .GCKeyboardDidConnect, object: nil, queue: .main) { [weak self] n in
            if let k = n.object as? GCKeyboard { self?.attach(k) }
        }
        if let k = GCKeyboard.coalesced { attach(k) }
    }

    private func attach(_ k: GCKeyboard) {
        active = true
        k.keyboardInput?.keyChangedHandler = { [weak self] _, _, code, pressed in
            DispatchQueue.main.async { self?.key(code, pressed) }
        }
    }

    private var commandHeld: Bool { down.contains(.leftGUI) || down.contains(.rightGUI) || down.contains(.leftControl) || down.contains(.rightControl) }

    private func key(_ code: GCKeyCode, _ pressed: Bool) {
        guard let m = model else { return }
        if pressed { down.insert(code) } else { down.remove(code) }
        if !pressed, let h = held.removeValue(forKey: code) { if h.track >= 6 { m.engine.noteOff(h.note, track: h.track) }; return }
        guard pressed, !commandHeld else { return }
        if code == .spacebar { m.togglePlay(); return }
        if code == .keyZ || code == .keyX { octave = max(1, min(7, octave + (code == .keyZ ? -1 : 1))); m.showToast("Oktav \(octave)"); return }
        guard let ix = Self.noteKeys.firstIndex(of: code), held[code] == nil else { return }
        let t = m.rollTrack ?? m.selectedTrack
        if t < 6 { m.hitPad(t); held[code] = (0, t); return }
        let note = 12 * (octave + 1) - (t == 6 ? 24 : 12) + ix
        m.engine.noteOn(note, velocity: 0.85, track: t)
        m.hitTime[t] = CACurrentMediaTime(); m.hitVel[t] = 0.85
        held[code] = (note, t)
    }
}
