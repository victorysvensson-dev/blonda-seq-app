import Foundation

/// A saved sound (web: PRESETS). Synth presets carry the engine and every value the synth module shows;
/// drum presets carry the sample (if any) and the track sound. Stored in Documents/presets.json.
struct SoundPreset: Codable, Identifiable {
    var id: String
    var name: String
    var kind: String          // "mel" or "drum"
    var from: Int             // the track it was saved from (colour)
    var inst: String = ""
    var track: [Float] = []   // kTrackParams order
    var floats: [Float] = []  // engine sliders (field order of the core)
    var opts: [Int] = []      // engine switches
    var motorPreset: Int = 0
    var motor: [Double] = []  // BLONDA motor, every parameter
    var sample: String = ""   // drum: sample id ("" = synth kit)
    var t: Double
}

final class PresetStore: ObservableObject {
    @Published private(set) var items: [SoundPreset] = []
    private let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("presets.json")
    init() { if let d = try? Data(contentsOf: url), let l = try? JSONDecoder().decode([SoundPreset].self, from: d) { items = l } }
    private func persist() { if let d = try? JSONEncoder().encode(items) { try? d.write(to: url, options: .atomic) } }
    func add(_ p: SoundPreset) { items.insert(p, at: 0); persist() }
    func remove(_ id: String) { items.removeAll { $0.id == id }; persist() }
}

/// How many sliders / switches each engine exposes in the core (engFloat / engOpt), by engine index.
private func engCounts(_ e: Int) -> (floats: Int, opts: Int) {
    if e == 0 { return (7, 1) }   // analog: cut res env a d s r · wave
    guard e < kEngDefs.count else { return (0, 0) }
    return (kEngDefs[e].params.count, kEngDefs[e].opts.count)
}

extension EngineModel {
    static let sharedPresets = PresetStore()
    var presets: PresetStore { Self.sharedPresets }

    func makePreset(_ t: Int) -> SoundPreset {
        let now = Date().timeIntervalSince1970 * 1000
        var p = SoundPreset(id: ProjectStore.newId(), name: "", kind: t >= 6 ? "mel" : "drum", from: t, t: now)
        p.track = kTrackParams.map { param($0, t) }
        if t >= 6 {
            let inst = instrument(t), e = engIndex(inst)
            p.inst = inst
            if inst == "bris6" {
                p.motorPreset = motorPreset(t)
                p.motor = (0..<BLONDAEngine.motorParamCount).map { motorParam($0, t) }
            } else {
                let c = engCounts(e)
                p.floats = (0..<c.floats).map { engParam($0, e, t) }
                p.opts = (0..<c.opts).map { engOption($0, e, t) }
            }
            p.name = "\(kTracks[t].name) · \(kEngDefs[e].name)"
        } else {
            p.sample = engine.drumSample(t)
            p.name = "\(kTracks[t].name) · \(drumSampleMeta(t)?.name ?? kTracks[t].sub.lowercased())"
        }
        return p
    }

    func savePreset(_ t: Int) {
        let p = makePreset(t); presets.add(p); showToast("Preset sparad: \(p.name)")
    }

    func applyPreset(_ p: SoundPreset, _ t: Int) {
        if (p.kind == "mel") != (t >= 6) { showToast(p.kind == "mel" ? "Synth-preset passar bara bass/keys/lead/pad" : "Trum-preset passar bara trumspår"); return }
        engine.pushUndo()
        for (i, d) in kTrackParams.enumerated() where i < p.track.count { setParam(d, t, p.track[i]) }
        if t >= 6 {
            setInstrument(p.inst, t)
            if p.inst == "bris6" {
                setMotorPreset(t, p.motorPreset)
                for (i, v) in p.motor.enumerated() { engine.setMotorParam(i, track: t, value: v) }
            } else {
                let e = engIndex(p.inst)
                for (f, v) in p.floats.enumerated() { engine.setEngineParam(f, engine: e, track: t, value: v) }
                for (f, v) in p.opts.enumerated() { engine.setEngineOption(f, engine: e, track: t, value: v) }
            }
        } else {
            if p.sample.isEmpty || library.item(p.sample) != nil {
                engine.assignDrum(t, sample: p.sample)
                rebindSamples()
            }
        }
        paramRevision += 1; revision += 1; scheduleSave()
        preview(t)
        showToast("\(p.name) → \(kTracks[t].name)")
    }
}
