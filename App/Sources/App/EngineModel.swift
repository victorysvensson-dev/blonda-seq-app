import Foundation
import SwiftUI
import QuartzCore

struct TrackInfo: Identifiable {
    let id: Int
    let name: String
    let sub: String
    let color: Color
    var melodic: Bool { id >= 6 }
}

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: 1)
    }
}

/// Same tracks and colours as the web version (TRACKS in BLONDA SEQ.3 Glass).
let kTracks: [TrackInfo] = [
    TrackInfo(id: 0, name: "Kick", sub: "Trumma", color: Color(hex: 0xF5F5F2)),
    TrackInfo(id: 1, name: "Snare", sub: "Virvel", color: Color(hex: 0x3D6CF5)),
    TrackInfo(id: 2, name: "Clap", sub: "Klapp", color: Color(hex: 0x27B26B)),
    TrackInfo(id: 3, name: "Hat", sub: "Stängd", color: Color(hex: 0xBDBDB8)),
    TrackInfo(id: 4, name: "Open", sub: "Öppen", color: Color(hex: 0xFFD21F)),
    TrackInfo(id: 5, name: "Perc", sub: "Rim·tom", color: Color(hex: 0xFF6A1A)),
    TrackInfo(id: 6, name: "Bass", sub: "Analog", color: Color(hex: 0xFF3B2F)),
    TrackInfo(id: 7, name: "Keys", sub: "Ackord", color: Color(hex: 0x8E7CFF)),
    TrackInfo(id: 8, name: "Lead", sub: "Melodi", color: Color(hex: 0x00C2C7)),
    TrackInfo(id: 9, name: "Pad", sub: "Yta", color: Color(hex: 0xF7A6C8)),
]

/// Main-thread model. The engine does the audio; this polls the audible step at display rate.
final class EngineModel: NSObject, ObservableObject {
    let engine = BLONDAEngine()
    @Published var step: Int = -1
    @Published var playing = false
    @Published var revision = 0          // bump to redraw the grid after edits
    @Published var paramRevision = 0     // bump to redraw the sound panel
    @Published var selectedTrack = 7 { didSet { engine.midiTrack = selectedTrack } }
    @Published var errorText: String?
    private var link: CADisplayLink?

    func start() {
        guard link == nil else { return }
        do { try engine.startAudio() } catch { errorText = "Ljud: \(error.localizedDescription)" }
        if let url = Bundle.main.url(forResource: "default_project", withExtension: "json"),
           let json = try? String(contentsOf: url, encoding: .utf8) {
            do { try engine.loadProjectJSON(json) } catch { errorText = "Projekt: \(error.localizedDescription)" }
        }
        engine.startMIDI()
        engine.midiTrack = selectedTrack
        if ProcessInfo.processInfo.arguments.contains("-autoplay") {
            engine.togglePlay()
            // diagnostics for the CI simulator run: is the audio thread advancing?
            Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
                guard let self = self else { return }
                NSLog("BLONDA-DIAG step=%d playing=%d", self.engine.currentStep, self.engine.isPlaying ? 1 : 0)
            }
        }
        let l = CADisplayLink(target: self, selector: #selector(tick))
        l.add(to: .main, forMode: .common)
        link = l
    }

    @objc private func tick() {
        let s = engine.currentStep, p = engine.isPlaying
        if s != step { step = s }
        if p != playing { playing = p }
    }

    var bpm: Float { engine.bpm }
    func nudgeBPM(_ d: Float) { engine.bpm = engine.bpm + d; revision += 1 }
    func togglePlay() { engine.togglePlay() }
    var pattern: Int { engine.pattern }
    func selectPattern(_ p: Int) { engine.selectPattern(p); revision += 1 }
    func value(_ t: Int, _ s: Int) -> Int { engine.stepValue(forTrack: t, step: s) }
    func cycle(_ t: Int, _ s: Int) { engine.cycleStep(forTrack: t, step: s); revision += 1 }
    func isMuted(_ t: Int) -> Bool { engine.isMutedTrack(t) }
    func toggleMute(_ t: Int) { engine.setMuted(!engine.isMutedTrack(t), track: t); revision += 1 }
    func param(_ d: ParamDef, _ track: Int) -> Float { _ = paramRevision; return engine.param(group: d.group, track: track, field: d.field) }
    func setParam(_ d: ParamDef, _ track: Int, _ v: Float) {
        var x = min(d.hi, max(d.lo, v))
        if d.lo < 0 && abs(x) < (d.hi - d.lo) * 0.015 { x = 0 }   // snap bipolar values to centre
        if d.group == 0 && d.field == 1 { x = x.rounded() }       // tune in semitones
        engine.setParam(x, group: d.group, track: track, field: d.field); paramRevision += 1
    }
    func noteOn(_ n: Int) { engine.noteOn(n, velocity: 0.85, track: selectedTrack) }
    func noteOff(_ n: Int) { engine.noteOff(n, track: selectedTrack) }
}
