import AVFoundation
import Foundation

/// One sound in the library (web: SMP entries). Files live in Documents/Library, the index in index.json.
struct SampleMeta: Codable, Identifiable, Equatable {
    var id: String
    var name: String
    var kind: String          // "hit" (under 1.6 s) or "loop"
    var bars: Int
    var bpm: Double           // the tempo the file was played at (bars fill exactly this)
    var dur: Double
    var pk: [Float]           // 96 normalised peaks for the waveform
    var norm: Float           // gain that brings the peak to −1 dB (max 4×)
    var file: String
    var t: Double
}

/// Decoding, tempo guessing and the on-disk library.
final class SampleLibrary: ObservableObject {
    @Published private(set) var items: [SampleMeta] = []
    private let dir: URL
    private var indexURL: URL { dir.appendingPathComponent("index.json") }

    init() {
        dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Library", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        if let d = try? Data(contentsOf: indexURL), let list = try? JSONDecoder().decode([SampleMeta].self, from: d) { items = list }
    }

    func item(_ id: String) -> SampleMeta? { id.isEmpty ? nil : items.first { $0.id == id } }
    func url(_ m: SampleMeta) -> URL { dir.appendingPathComponent(m.file) }
    var hits: [SampleMeta] { items.filter { $0.kind == "hit" }.sorted { $0.t > $1.t } }
    var loops: [SampleMeta] { items.filter { $0.kind == "loop" }.sorted { $0.t > $1.t } }

    private func save() {
        let list = items, url = indexURL
        DispatchQueue.global(qos: .utility).async { if let d = try? JSONEncoder().encode(list) { try? d.write(to: url, options: .atomic) } }
    }

    // MARK: decoding

    struct Audio { let left: [Float]; let right: [Float]; let frames: Int }

    /// Any file AVFoundation reads (wav, aif, mp3, m4a, caf, flac …), converted to stereo float at `rate`.
    static func decode(_ url: URL, rate: Double) -> Audio? {
        guard let file = try? AVAudioFile(forReading: url) else { return nil }
        let src = file.processingFormat
        guard let out = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: rate, channels: 2, interleaved: false),
              let inBuf = AVAudioPCMBuffer(pcmFormat: src, frameCapacity: AVAudioFrameCount(max(1, file.length))) else { return nil }
        do { try file.read(into: inBuf) } catch { return nil }
        // mono → both channels before converting
        var source = inBuf
        if src.channelCount == 1, let st = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: src.sampleRate, channels: 2, interleaved: false),
           let b = AVAudioPCMBuffer(pcmFormat: st, frameCapacity: inBuf.frameLength), let m = inBuf.floatChannelData {
            b.frameLength = inBuf.frameLength
            for c in 0..<2 { memcpy(b.floatChannelData![c], m[0], Int(inBuf.frameLength) * MemoryLayout<Float>.size) }
            source = b
        }
        guard let conv = AVAudioConverter(from: source.format, to: out) else { return nil }
        let cap = AVAudioFrameCount(Double(source.frameLength) * rate / source.format.sampleRate + 1024)
        guard let outBuf = AVAudioPCMBuffer(pcmFormat: out, frameCapacity: cap) else { return nil }
        var fed = false
        var err: NSError?
        let st = conv.convert(to: outBuf, error: &err) { _, status in
            if fed { status.pointee = .endOfStream; return nil }
            fed = true; status.pointee = .haveData; return source
        }
        guard st != .error, let ch = outBuf.floatChannelData else { return nil }
        let n = Int(outBuf.frameLength)
        return Audio(left: Array(UnsafeBufferPointer(start: ch[0], count: n)), right: Array(UnsafeBufferPointer(start: ch[1], count: n)), frames: n)
    }

    /// web: peaksOf — 96 bins of the absolute peak, normalised to the loudest.
    static func peaks(_ a: Audio, bins: Int = 96) -> ([Float], Float) {
        var out = [Float](repeating: 0, count: bins); var mx: Float = 0
        guard a.frames > 0 else { return (out, 0) }
        for b in 0..<bins {
            let lo = b * a.frames / bins, hi = max(lo + 1, (b + 1) * a.frames / bins)
            var m: Float = 0; var i = lo
            while i < min(hi, a.frames) { m = max(m, abs(a.left[i]), abs(a.right[i])); i += 2 }
            out[b] = m; mx = max(mx, m)
        }
        return (out.map { ($0 / max(mx, 1e-9) * 1000).rounded() / 1000 }, mx)
    }

    /// web: guessTempo — a number like "120bpm" or "_96_" in the name wins; otherwise 1, 2, 4, 8 or 16 bars closest to 120.
    static func guessTempo(_ name: String, _ dur: Double) -> (bars: Int, bpm: Double) {
        let ns = name as NSString
        var bpm = 0.0
        for pat in ["(\\d{2,3})\\s*bpm", "(?:^|[ _\\-])(\\d{2,3})(?:[ _\\-.]|$)"] {
            if let re = try? NSRegularExpression(pattern: pat, options: .caseInsensitive),
               let m = re.firstMatch(in: name, range: NSRange(location: 0, length: ns.length)) { bpm = Double(ns.substring(with: m.range(at: 1))) ?? 0; break }
        }
        if bpm >= 60 && bpm <= 200 { let bars = max(1, Int((dur * bpm / 240).rounded())); return (bars, 240 * Double(bars) / dur) }
        var best: (Int, Double, Double)?
        for bars in [1, 2, 4, 8, 16] {
            let b = 240 * Double(bars) / dur, sc = abs(log2(b / 120))
            if b >= 68 && b <= 185 && (best == nil || sc < best!.2) { best = (bars, b, sc) }
        }
        if let b = best { return (b.0, b.1) }
        return (1, 240 / max(dur, 0.01))
    }

    // MARK: import / edit

    /// Copies the files into the library and analyses them. Returns (added, unreadable).
    func importFiles(_ urls: [URL], rate: Double) -> (added: [SampleMeta], bad: Int) {
        var added: [SampleMeta] = []; var bad = 0
        for u in urls {
            let scoped = u.startAccessingSecurityScopedResource(); defer { if scoped { u.stopAccessingSecurityScopedResource() } }
            let id = String(Int(Date().timeIntervalSince1970 * 1000), radix: 36) + String(Int.random(in: 0..<60_466_176), radix: 36)
            let ext = u.pathExtension.isEmpty ? "wav" : u.pathExtension.lowercased()
            let dest = dir.appendingPathComponent("\(id).\(ext)")
            do { try FileManager.default.copyItem(at: u, to: dest) } catch { bad += 1; continue }
            guard let a = Self.decode(dest, rate: rate), a.frames > 32 else { try? FileManager.default.removeItem(at: dest); bad += 1; continue }
            let dur = Double(a.frames) / rate, (pk, mx) = Self.peaks(a)
            let name = u.deletingPathExtension().lastPathComponent, tm = Self.guessTempo(name, dur)
            added.append(SampleMeta(id: id, name: name, kind: dur > 1.6 ? "loop" : "hit", bars: tm.bars, bpm: tm.bpm, dur: dur, pk: pk,
                                    norm: min(4, 0.89 / max(mx, 1e-6)), file: dest.lastPathComponent, t: Date().timeIntervalSince1970 * 1000))
        }
        if !added.isEmpty { DispatchQueue.main.async { self.items.append(contentsOf: added); self.save() } }
        return (added, bad)
    }

    func setBars(_ id: String, _ bars: Int) {
        guard let i = items.firstIndex(where: { $0.id == id }) else { return }
        items[i].bars = bars; items[i].bpm = 240 * Double(bars) / items[i].dur; save()
    }

    func remove(_ id: String) {
        guard let i = items.firstIndex(where: { $0.id == id }) else { return }
        try? FileManager.default.removeItem(at: url(items[i])); items.remove(at: i); save()
    }
}
