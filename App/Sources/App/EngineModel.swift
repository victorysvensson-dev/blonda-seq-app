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
    @Published var selectedTrack = 0 { didSet { engine.midiTrack = selectedTrack; selColHex = trackHex(selectedTrack) } }
    // visuals (SEQ.3 design): background energy, last hit per track, transport clock
    var energy: Double = 0
    var selColHex: UInt32 = 0xF5F5F2
    var hitTime = [CFTimeInterval](repeating: -10, count: 10)
    var hitVel = [Double](repeating: 0, count: 10)
    @Published var bar = 0
    var playStart: CFTimeInterval = 0
    var stepTime: CFTimeInterval = 0
    var globalStep = 0   // steps since play (polymeter positions)
    private var lastTick: CFTimeInterval = 0
    @Published var errorText: String?
    private var link: CADisplayLink?

    func start() {
        guard link == nil else { return }
        do { try engine.startAudio() } catch { errorText = "Ljud: \(error.localizedDescription)" }
        if !loadSaved() { loadDemo() }
        rebindSamples()
        revision += 1; paramRevision += 1   // redraw everything with the loaded project
        selColHex = trackHex(selectedTrack)
        engine.startMIDI()
        keyboard = KeyboardInput(model: self)
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

    // ---- projects: autosaved to Documents/project.json in the web version's format
    private var saveURL: URL { FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("project.json") }
    private var saveWork: DispatchWorkItem?

    private func loadSaved() -> Bool {
        guard let json = try? String(contentsOf: saveURL, encoding: .utf8) else { return false }
        return (try? engine.loadProjectJSON(json)) != nil
    }
    func loadDemo() {
        guard let url = Bundle.main.url(forResource: "default_project", withExtension: "json"),
              let json = try? String(contentsOf: url, encoding: .utf8) else { return }
        do { try engine.loadProjectJSON(json) } catch { errorText = "Projekt: \(error.localizedDescription)" }
        rebindSamples()
        revision += 1; paramRevision += 1; scheduleSave()
    }
    /// Debounced: writes one second after the last edit, off the main thread.
    func scheduleSave() {
        saveWork?.cancel()
        let w = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            let json = self.engine.projectJSON(), url = self.saveURL
            DispatchQueue.global(qos: .utility).async { try? json.write(to: url, atomically: true, encoding: .utf8) }
        }
        saveWork = w
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0, execute: w)
    }

    @objc private func tick() {
        let now = CACurrentMediaTime(), dt = lastTick == 0 ? 0 : min(0.033, now - lastTick); lastTick = now
        if engine.followSong() { revision += 1 }
        let ci = engine.chainIndex; if ci != chainIdx { chainIdx = ci }
        let s = engine.currentStep, p = engine.isPlaying
        if p != playing { playing = p; if p { playStart = now; bar = 0; globalStep = 0 } }
        if s != step {
            if s >= 0 {
                if step >= 0 && s < step { bar += 1 }
                globalStep = step < 0 ? 0 : globalStep + 1
                for i in 0..<10 where !engine.isMutedTrack(i) {
                    let v = engine.stepValue(forTrack: i, step: s)
                    if v > 0 {
                        hitTime[i] = now; hitVel[i] = v == 2 ? 1 : 0.72
                        energy = min(1, energy + (i == 0 ? 0.9 : i < 3 ? 0.35 : 0.12) * hitVel[i])
                        if i == selectedTrack || i == 0 { selColHex = trackHex(selectedTrack) }
                    }
                }
            }
            step = s; stepTime = now
        }
        energy *= pow(0.02, dt)
    }
    /// 0…1 flash for a track hit (pads, row labels)
    func flash(_ i: Int, _ len: Double = 0.12) -> Double {
        let d = CACurrentMediaTime() - hitTime[i]; return d >= 0 && d < len ? 1 - d / len : 0
    }
    func hitPad(_ i: Int) {
        engine.noteOn(i < 6 ? 60 : (i == 6 ? 45 : 57), velocity: 0.85, track: i)
        if i >= 6 { let n = i == 6 ? 45 : 57; DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in self?.engine.noteOff(n, track: i) } }
        hitTime[i] = CACurrentMediaTime(); hitVel[i] = 0.85
        energy = min(1, energy + (i == 0 ? 0.9 : i < 3 ? 0.35 : 0.12) * 0.85)
    }

    var bpm: Float { engine.bpm }
    func nudgeBPM(_ d: Float) { engine.bpm = engine.bpm + d; revision += 1; scheduleSave() }
    func togglePlay() { engine.togglePlay() }
    var pattern: Int { engine.pattern }
    func selectPattern(_ p: Int) { engine.selectPattern(p); revision += 1; scheduleSave() }
    func value(_ t: Int, _ s: Int) -> Int { engine.stepValue(forTrack: t, step: s) }
    func cycle(_ t: Int, _ s: Int) { engine.cycleStep(forTrack: t, step: s); revision += 1; scheduleSave() }
    func isMuted(_ t: Int) -> Bool { engine.isMutedTrack(t) }
    func toggleMute(_ t: Int) { engine.setMuted(!engine.isMutedTrack(t), track: t); revision += 1; scheduleSave() }
    func param(_ d: ParamDef, _ track: Int) -> Float { _ = paramRevision; return engine.param(group: d.group, track: track, field: d.field) }
    func setParam(_ d: ParamDef, _ track: Int, _ v: Float) {
        var x = min(d.hi, max(d.lo, v))
        if d.lo < 0 && abs(x) < (d.hi - d.lo) * 0.015 { x = 0 }   // snap bipolar values to centre
        if d.group == 0 && d.field == 1 { x = x.rounded() }       // tune in semitones
        engine.setParam(x, group: d.group, track: track, field: d.field); paramRevision += 1; scheduleSave()
    }
    // ---- track editing (all undoable in the engine host)
    private func edit(_ f: () -> Void) { f(); revision += 1; scheduleSave() }
    func hits(_ t: Int) -> Int { _ = revision; return engine.hits(track: t) }
    func length(_ t: Int) -> Int { _ = revision; return engine.length(track: t) }
    func rotation(_ t: Int) -> Int { _ = revision; return engine.rotation(track: t) }
    func setHits(_ t: Int, _ k: Int) { edit { engine.euclid(max(0, min(length(t), k)), track: t) } }
    func setLength(_ t: Int, _ l: Int) { edit { engine.setLength(max(1, min(16, l)), track: t) } }
    func rotate(_ t: Int, _ d: Int) { edit { engine.rotate(d, track: t) } }
    func shift(_ t: Int) { edit { engine.shift(track: t) } }
    func clear(_ t: Int) { edit { engine.clear(track: t) } }
    func variation(_ t: Int) { edit { engine.variation(track: t) } }
    func toggleSolo(_ t: Int) { edit { engine.toggleSolo(track: t) } }
    var soloTrack: Int { _ = revision; return engine.soloTrack }
    func copyPattern() { edit { engine.copyPatternToNext() }; showToast("Mönster \(["A", "B", "C", "D"][pattern]) kopierat till \(["A", "B", "C", "D"][(pattern + 1) % 4])") }
    // ---- dice + toasts
    // plugins
    func fx(_ f: Int) -> Float { _ = paramRevision; return engine.fxValue(f) }
    private var irWork: DispatchWorkItem?
    func setFx(_ f: Int, _ v: Float) {
        engine.setFxValue(f, value: v); paramRevision += 1; scheduleSave()
        if f == 4 {   // web queueIR: rebuild the reverb 250 ms after the last change
            irWork?.cancel(); let w = DispatchWorkItem { [weak self] in self?.engine.rebuildReverb() }; irWork = w
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25, execute: w)
        }
    }
    func setMaster(_ i: Int, _ v: Float) { setParam(kMasterParams[i], 0, v) }
    func master(_ i: Int) -> Float { param(kMasterParams[i], 0) }
    // MARK: samples · loops · library
    static let sharedLibrary = SampleLibrary()
    var library: SampleLibrary { Self.sharedLibrary }
    enum LibTarget: Equatable { case loop(Int), drum(Int) }
    @Published var libOpen = false
    @Published var libTab = "hit"
    @Published var libTarget: LibTarget?
    @Published var libBusy = false
    private var inEngine = Set<String>()
    private var decoding = Set<String>()

    func openLibrary(_ tab: String? = nil, target: LibTarget? = nil) {
        if let t = tab { libTab = t }
        libTarget = target
        withAnimation(.easeOut(duration: 0.25)) { libOpen = true }
    }
    func closeLibrary() { withAnimation(.easeIn(duration: 0.2)) { libOpen = false }; libTarget = nil }

    /// Decodes what is not in the engine yet (off the main thread), then calls back on the main thread.
    func ensureLoaded(_ ids: [String], then done: @escaping () -> Void) {
        let need = ids.filter { !$0.isEmpty && !inEngine.contains($0) && !decoding.contains($0) }.compactMap { library.item($0) }
        if need.isEmpty { done(); return }
        need.forEach { decoding.insert($0.id) }
        let rate = engine.sampleRate, lib = library
        DispatchQueue.global(qos: .userInitiated).async {
            let decoded = need.map { ($0.id, SampleLibrary.decode(lib.url($0), rate: rate)) }
            DispatchQueue.main.async {
                for (id, a) in decoded {
                    self.decoding.remove(id)
                    guard let a = a else { continue }
                    a.left.withUnsafeBufferPointer { l in a.right.withUnsafeBufferPointer { r in
                        self.engine.addSample(id, left: Data(buffer: l), right: Data(buffer: r), frames: a.frames)
                    } }
                    self.inEngine.insert(id)
                }
                done()
            }
        }
    }

    /// Hands the engine the samples the project uses (after loading a project, importing or editing the library).
    func rebindSamples() {
        let ids = (0..<4).map { engine.loopSample($0) } + (0..<6).map { engine.drumSample($0) }
        ensureLoaded(ids) { [weak self] in
            guard let self = self else { return }
            for k in 0..<4 {
                if let m = self.library.item(self.engine.loopSample(k)) {
                    let b = self.engine.loopBars(k)
                    self.engine.bindLoop(k, sourceBPM: Float(m.bpm), bars: b > 0 ? b : m.bars, norm: m.norm)
                } else { self.engine.bindLoop(k, sourceBPM: 120, bars: 1, norm: 1) }
            }
            for i in 0..<6 { self.engine.bindDrum(i, norm: self.library.item(self.engine.drumSample(i))?.norm ?? 1) }
            self.revision += 1
        }
    }

    func importFiles(_ urls: [URL]) {
        guard !urls.isEmpty else { return }
        libBusy = true
        let rate = engine.sampleRate
        DispatchQueue.global(qos: .userInitiated).async {
            let r = self.library.importFiles(urls, rate: rate)
            DispatchQueue.main.async {
                self.libBusy = false
                if let first = r.added.first { self.libTab = first.kind }
                self.showToast(r.added.isEmpty ? "Kunde inte läsa filerna" : "\(r.added.count) ljud tillagda" + (r.bad > 0 ? " · \(r.bad) kunde inte läsas" : ""))
            }
        }
    }

    func assignLoop(_ m: SampleMeta, _ k: Int) {
        engine.assignLoop(k, sample: m.id); scheduleSave(); rebindSamples()
        showToast("\(m.name) → loop \(k + 1)" + (playing ? " · startar nästa varv" : " · tryck play"))
        if libTarget != nil { closeLibrary() }
    }
    func assignHit(_ m: SampleMeta, _ i: Int) {
        engine.assignDrum(i, sample: m.id)
        setParam(kTrackParams[1], i, 0.5); setParam(kTrackParams[2], i, 1); setParam(kTrackParams[3], i, 0)
        scheduleSave()
        ensureLoaded([m.id]) { [weak self] in self?.engine.bindDrum(i, norm: m.norm); self?.hitPad(i); self?.revision += 1 }
        showToast("\(m.name) → \(kTracks[i].name)")
        if libTarget != nil { closeLibrary() }
    }
    func clearDrumSample(_ i: Int) { engine.assignDrum(i, sample: ""); engine.bindDrum(i, norm: 1); revision += 1; scheduleSave() }
    func clearLoop(_ k: Int) { engine.assignLoop(k, sample: ""); engine.bindLoop(k, sourceBPM: 120, bars: 1, norm: 1); revision += 1; scheduleSave() }
    func toggleLoop(_ k: Int) { engine.setLoop(k, on: !engine.loopOn(k)); revision += 1; scheduleSave() }
    func setLoopVolume(_ k: Int, _ v: Float) { engine.setLoop(k, volume: v); revision += 1; scheduleSave() }
    func loopMeta(_ k: Int) -> SampleMeta? { _ = revision; return library.item(engine.loopSample(k)) }
    func loopOn(_ k: Int) -> Bool { _ = revision; return engine.loopOn(k) }
    func loopVolume(_ k: Int) -> Float { _ = revision; return engine.loopVolume(k) }
    func loopBarsEff(_ k: Int) -> Int { let b = engine.loopBars(k); return b > 0 ? b : (loopMeta(k)?.bars ?? 1) }
    func drumSampleMeta(_ i: Int) -> SampleMeta? { _ = revision; return i < 6 ? library.item(engine.drumSample(i)) : nil }
    /// 0…1 through the current pass of a loop, nil when it is not sounding (web: loopFrame).
    func loopProgress(_ k: Int) -> Double? {
        guard playing, step >= 0, let m = loopMeta(k), loopOn(k) else { return nil }
        _ = m; let bars = max(1, loopBarsEff(k))
        return (Double(bar % bars) * 16 + Double(step) + 0.5) / Double(bars * 16)
    }
    func setSampleBars(_ m: SampleMeta, _ bars: Int) { library.setBars(m.id, bars); rebindSamples() }
    func deleteSample(_ m: SampleMeta) {
        engine.removeSample(m.id); inEngine.remove(m.id); library.remove(m.id); revision += 1; scheduleSave()
    }
    func previewSample(_ m: SampleMeta) {
        ensureLoaded([m.id]) { [weak self] in
            guard let self = self else { return }
            self.engine.previewSample(m.id, rate: m.kind == "loop" && self.playing ? self.engine.bpm / Float(m.bpm) : 1, gain: m.norm * 0.8)
        }
    }
    // MARK: step inspector (web: long-press a step)
    struct StepRef: Equatable { let track: Int; let step: Int }
    @Published var inspect: StepRef?
    func openInspector(_ t: Int, _ s: Int) {
        engine.pushUndo()
        if engine.stepValue(forTrack: t, step: s) == 0 { engine.cycleStep(forTrack: t, step: s) }   // web: an empty step is lit first
        revision += 1; scheduleSave(); inspect = StepRef(track: t, step: s)
    }
    func stepVel(_ r: StepRef) -> Float { _ = revision; return engine.stepVelocity(r.track, step: r.step) }
    func stepRatchet(_ r: StepRef) -> Int { _ = revision; return engine.stepRatchet(r.track, step: r.step) }
    func stepProb(_ r: StepRef) -> Float { _ = revision; return engine.stepProbability(r.track, step: r.step) }
    func setStepVel(_ r: StepRef, _ v: Float) { engine.setStepVelocity(v, track: r.track, step: r.step); revision += 1; scheduleSave() }
    func setStepRatchet(_ r: StepRef, _ n: Int) { engine.setStepRatchet(n, track: r.track, step: r.step); revision += 1; scheduleSave(); auditionStep(r) }
    func setStepProb(_ r: StepRef, _ p: Float) { engine.setStepProbability(p, track: r.track, step: r.step); revision += 1; scheduleSave() }
    func toggleAccent(_ r: StepRef) { engine.toggleAccent(r.track, step: r.step); revision += 1; scheduleSave(); auditionStep(r) }
    func clearStep(_ r: StepRef) { engine.clearStep(r.track, step: r.step); revision += 1; scheduleSave(); inspect = nil }
    /// web: inspPreview — the step as it will sound (ratchets included)
    func auditionStep(_ r: StepRef) {
        let n = stepRatchet(r), v = stepVel(r), sd = stepDur
        for k in 0..<n {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(k) * sd / Double(n)) { [weak self] in
                guard let self = self else { return }
                let vel = v * (k > 0 ? 0.8 : 1)
                if r.track < 6 { self.engine.noteOn(60, velocity: vel, track: r.track); self.hitTime[r.track] = CACurrentMediaTime() }
                else { let note = self.previewNote(r.track); self.engine.noteOn(note, velocity: vel, track: r.track)
                       DispatchQueue.main.asyncAfter(deadline: .now() + sd / Double(n) * 0.9) { self.engine.noteOff(note, track: r.track) } }
            }
        }
    }
    // MARK: BLONDA motor (engine "bris6")
    func motorPreset(_ t: Int) -> Int { _ = paramRevision; return engine.motorPreset(t) }
    func setMotorPreset(_ t: Int, _ i: Int) {
        let n = BLONDAEngine.motorPresetCount, ii = ((i % n) + n) % n
        engine.setMotorPreset(ii, track: t); paramRevision += 1; scheduleSave()
    }
    func motorParam(_ p: Int, _ t: Int) -> Double { _ = paramRevision; return engine.motorParam(p, track: t) }
    func setMotorParam(_ p: Int, _ t: Int, _ v: Double) { engine.setMotorParam(p, track: t, value: v); paramRevision += 1; scheduleSave() }
    // MARK: piano roll
    @Published var rollTrack: Int?
    func openRoll(_ t: Int) {
        inspect = nil
        let tt = (6...9).contains(t) ? t : ((6...9).contains(selectedTrack) ? selectedTrack : 8)
        if rollTrack == nil { withAnimation(.spring(response: 0.45, dampingFraction: 0.82)) { rollTrack = tt } } else { rollTrack = tt }
        if selectedTrack != tt { selectedTrack = tt }
    }
    func closeRoll() { withAnimation(.easeIn(duration: 0.22)) { rollTrack = nil } }
    var keyboard: KeyboardInput?
    /// true once the hardware keyboard is read directly (then the SwiftUI key handlers leave notes and space alone)
    var keyboardDirect: Bool { keyboard?.active ?? false }
    @Published var chainIdx = -1
    var songMode: Bool { _ = revision; return engine.songMode }
    func toggleSong() {
        edit { engine.songMode = !engine.songMode }
        showToast(engine.songMode ? "Låtläge på · kedjan startar vid nästa takt" : "Låtläge av")
    }
    func chainSlot(_ k: Int) -> Int { _ = revision; return engine.chainSlot(k) }
    func setChainSlot(_ k: Int, _ v: Int) { edit { engine.setChainSlot(k, pattern: v) } }
    func cycleChain(_ k: Int) { let v = engine.chainSlot(k); edit { engine.setChainSlot(k, pattern: v >= 3 ? -1 : v + 1) } }
    @Published var dieFace = 3
    @Published var rolling = false
    @Published var toast: String?
    private var toastWork: DispatchWorkItem?
    func showToast(_ s: String) {
        toast = s; toastWork?.cancel()
        let w = DispatchWorkItem { [weak self] in self?.toast = nil }; toastWork = w
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2, execute: w)
    }
    /// faces tumble fast, slow down and land — then the pattern changes (like the web dice)
    func rollDice() {
        guard !rolling else { return }
        rolling = true
        let n = Int.random(in: 1...6)
        let delays = [40, 45, 50, 60, 70, 85, 105, 130, 160]
        var t = 0.0, last = dieFace
        for d in delays {
            t += Double(d) / 1000
            DispatchQueue.main.asyncAfter(deadline: .now() + t) { [weak self] in
                var f = Int.random(in: 1...6); while f == last { f = Int.random(in: 1...6) }; last = f; self?.dieFace = f
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + t + 0.12) { [weak self] in
            guard let self = self else { return }
            self.dieFace = n
            let msg = self.engine.rollDice(n)
            self.revision += 1; self.paramRevision += 1; self.scheduleSave()
            self.showToast("Tärning \(n) · \(msg)")
            self.rolling = false
        }
    }
    func setInstrument(_ name: String, _ t: Int) { edit { engine.setInstrument(name, track: t) }; selColHex = trackHex(selectedTrack) }
    // synth module (engine parameters of the melodic tracks)
    func engParam(_ f: Int, _ e: Int, _ t: Int) -> Float { _ = paramRevision; return engine.engineParam(f, engine: e, track: t) }
    func setEngParam(_ f: Int, _ e: Int, _ t: Int, _ v: Float) { engine.setEngineParam(f, engine: e, track: t, value: v); paramRevision += 1; scheduleSave() }
    func engOption(_ f: Int, _ e: Int, _ t: Int) -> Int { _ = paramRevision; return engine.engineOption(f, engine: e, track: t) }
    func setEngOption(_ f: Int, _ e: Int, _ t: Int, _ v: Int) { engine.setEngineOption(f, engine: e, track: t, value: v); paramRevision += 1; scheduleSave() }
    var stepDur: Double { 60.0 / Double(max(40, engine.bpm)) / 4 }
    func previewNote(_ t: Int) -> Int { [45, 57, 69, 57][max(0, min(3, t - 6))] }
    /// Short audition of a melodic track (web: synPreview) — after editing a sound or switching engine.
    func preview(_ t: Int) {
        guard t >= 6 && t <= 9 else { hitPad(t); return }
        let n = previewNote(t)
        engine.noteOn(n, velocity: 0.85, track: t)
        hitTime[t] = CACurrentMediaTime(); hitVel[t] = 0.85
        DispatchQueue.main.asyncAfter(deadline: .now() + max(0.18, stepDur * 2)) { [weak self] in self?.engine.noteOff(n, track: t) }
    }
    func instrument(_ t: Int) -> String { _ = revision; return engine.instrument(forTrack: t) }
    func undo() { edit { _ = engine.undo() } }
    func redo() { edit { _ = engine.redo() } }
    func setBPM(_ v: Float) { engine.bpm = max(40, min(240, v.rounded())); revision += 1; scheduleSave() }

    func noteOn(_ n: Int) { engine.noteOn(n, velocity: 0.85, track: selectedTrack) }
    func noteOff(_ n: Int) { engine.noteOff(n, track: selectedTrack) }
}
