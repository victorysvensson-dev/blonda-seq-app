import GameController
import QuartzCore

/// The computer keyboard as an instrument, read straight from the hardware (GameController), so it works
/// whatever was clicked last: space = play/stop, A W S E D F T G Y H U J K O L P Ö Ä = notes (key positions,
/// like the web version), Z / X = octave down / up. Keys held with ⌘ are left to the app's shortcuts.
final class KeyboardInput {
    private weak var model: EngineModel?
    private var octave = 4
    private var held: [Key: (note: Int, track: Int)] = [:]
    private var down = Set<GCKeyCode>()
    private(set) var active = false
    private static let noteKeys: [GCKeyCode] = [.keyA, .keyW, .keyS, .keyE, .keyD, .keyF, .keyT, .keyG, .keyY, .keyH, .keyU, .keyJ,
                                                 .keyK, .keyO, .keyL, .keyP, .semicolon, .quote]

    private static let padKeys: [GCKeyCode] = [.one, .two, .three, .four, .five, .six, .seven, .eight, .nine, .zero]

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

    /// What a key does, whoever reported it. Keys come from two places — GameController (hardware, works whatever has
    /// focus) and SwiftUI's key events (works where GameController gets nothing, e.g. some Macs) — so each press is
    /// acted on once: the first report wins, the second is ignored.
    enum Key: Hashable { case space, note(Int), pad(Int), octave(Int) }
    private var keyDown = Set<Key>()
    private var lastUp: [Key: CFTimeInterval] = [:]
    private var lastSpace: CFTimeInterval = -1

    private func key(_ code: GCKeyCode, _ pressed: Bool) {
        if pressed { down.insert(code) } else { down.remove(code) }
        if pressed && commandHeld { return }
        let k: Key?
        if code == .spacebar { k = .space }
        else if let pad = Self.padKeys.firstIndex(of: code) { k = .pad(pad) }
        else if code == .keyZ || code == .keyX { k = .octave(code == .keyZ ? -1 : 1) }
        else if let ix = Self.noteKeys.firstIndex(of: code) { k = .note(ix) }
        else { k = nil }
        if let k { handle(k, pressed) }
    }

    /// SwiftUI's key events: a character (or " " for space). Returns true when it is one of ours.
    @discardableResult
    func swiftUIKey(_ ch: Character, _ pressed: Bool) -> Bool {
        let k: Key
        if ch == " " { k = .space }
        else if ch == "z" || ch == "x" { k = .octave(ch == "z" ? -1 : 1) }
        else if let d = ch.wholeNumberValue, ch.isASCII { k = .pad(d == 0 ? 9 : d - 1) }
        else if let ix = Self.noteChars.firstIndex(of: ch) { k = .note(ix) }
        else { return false }
        handle(k, pressed)
        return true
    }
    private static let noteChars: [Character] = Array("awsedftgyhujkolp;'")

    func handle(_ k: Key, _ pressed: Bool) {
        guard let m = model else { return }
        let now = CACurrentMediaTime()
        if !pressed {
            guard keyDown.remove(k) != nil else { return }
            lastUp[k] = now
            if let h = held.removeValue(forKey: k), h.track >= 6 { m.engine.noteOff(h.note, track: h.track); m.recOff(h.track, h.note) }
            return
        }
        if keyDown.contains(k) { return }                                   // the other source already has it
        if let u = lastUp[k], now - u < 0.06 { return }                    // a late report of a press that is already over
        keyDown.insert(k)
        guard !m.textEditing else { return }
        switch k {
        case .space:
            if now - lastSpace < 0.15 { return }
            lastSpace = now; m.togglePlay()
        case .pad(let p): m.hitPad(p)   // 1 … 0 on the number row hit the ten pads (web: "Pads · 1–0")
        case .octave(let d): octave = max(1, min(7, octave + d)); m.showToast("Oktav \(octave)")
        case .note(let ix):
            let t = m.rollTrack ?? m.selectedTrack
            if t < 6 { m.hitPad(t); held[k] = (0, t); return }
            let note = 12 * (octave + 1) - (t == 6 ? 24 : 12) + ix
            m.engine.noteOn(note, velocity: 0.85, track: t)
            m.hitTime[t] = CACurrentMediaTime(); m.hitVel[t] = 0.85
            held[k] = (note, t)
            m.recOn(t, note, 0.85)
        }
    }
}
