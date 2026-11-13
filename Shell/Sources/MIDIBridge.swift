import CoreMIDI
import Foundation

/// CoreMIDI for the page. The page uses the Web MIDI API (navigator.requestMIDIAccess), which Safari/WebKit doesn't
/// have; Bridge.js puts the same API in place and this class does the real work:
/// - every MIDI source on the device is an input, every destination an output (USB, Bluetooth, network, other apps);
/// - the app also shows up as "BLONDA SEQ3" for other apps (on the Mac e.g. Ableton): a virtual destination they can
///   play the app from, and a virtual source the app can send clock and notes to.
/// Incoming messages are collected on CoreMIDI's thread and handed to the main thread in batches.
/// Outgoing messages keep the page's timing: the page gives each one a time, it is sent with a CoreMIDI timestamp.
final class MIDIBridge {
    struct Port { let id: String; let name: String; let man: String }

    /// The port lists changed (or were asked for). Main thread.
    var onPorts: (([Port], [Port]) -> Void)?
    /// Incoming messages: (port id, bytes). Main thread.
    var onInput: (([(String, [UInt8])]) -> Void)?
    /// Self-test only: what arrived at the test destination. Main thread.
    var onTestOut: (([UInt8]) -> Void)?

    static let virtualIn = "v-in"
    static let virtualOut = "v-out"
    static let appName = "BLONDA SEQ3"
    static let testName = "BLONDA TEST"

    private(set) var started = false
    private var client = MIDIClientRef()
    private var inPort = MIDIPortRef()
    private var outPort = MIDIPortRef()
    private var vSrc = MIDIEndpointRef()
    private var vDst = MIDIEndpointRef()
    private var tSrc = MIDIEndpointRef()
    private var tDst = MIDIEndpointRef()
    private var ownIDs = Set<MIDIUniqueID>()

    private var destinations: [String: MIDIEndpointRef] = [:]   // main thread
    private var connected: [MIDIUniqueID: MIDIEndpointRef] = [:] // main thread

    // id strings for incoming messages, looked up on CoreMIDI's thread by index (refCon = index + 1)
    private let lock = NSLock()
    private var srcTable: [String] = []
    private var pending: [(String, [UInt8])] = []
    private var flushQueued = false

    private lazy var timebase: mach_timebase_info_data_t = {
        var t = mach_timebase_info_data_t()
        mach_timebase_info(&t)
        return t
    }()

    /// What happened when CoreMIDI was started (for the log and the self-test).
    private(set) var diag: [String] = []
    private var retries = 0

    /// The page asked for MIDI. The page always gets an answer: the ports, or – if CoreMIDI can't be started yet –
    /// an empty list (the page then shows no devices), and the app tries again every 2 s for a while; when it
    /// succeeds the page gets the ports as a normal "devices changed".
    func open(selfTest: Bool) {
        if started { refresh(); return }
        if start(selfTest: selfTest) { refresh(); return }
        onPorts?([], [])
        scheduleRetry(selfTest: selfTest)
    }

    private func scheduleRetry(selfTest: Bool) {
        guard retries < 30 else { return }
        retries += 1
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            guard let self, !self.started else { return }
            if self.start(selfTest: selfTest) { self.refresh() } else { self.scheduleRetry(selfTest: selfTest) }
        }
    }

    @discardableResult
    func start(selfTest: Bool) -> Bool {
        guard !started else { return true }
        let t0 = CFAbsoluteTimeGetCurrent()
        var st = MIDIClientCreateWithBlock(Self.appName as CFString, &client) { [weak self] note in
            if note.pointee.messageID == .msgSetupChanged {
                DispatchQueue.main.async { self?.refresh() }
            }
        }
        let ms = Int((CFAbsoluteTimeGetCurrent() - t0) * 1000)
        guard st == noErr else {
            note("client error \(st) after \(ms) ms (try \(retries + 1))")
            return false
        }
        note("client ok after \(ms) ms (try \(retries + 1))")
        started = true

        st = MIDIInputPortCreateWithProtocol(client, "in" as CFString, ._1_0, &inPort) { [weak self] list, refCon in
            guard let self else { return }
            let idx = Int(bitPattern: refCon) - 1
            self.lock.lock()
            let id = idx >= 0 && idx < self.srcTable.count ? self.srcTable[idx] : nil
            self.lock.unlock()
            if let id { self.receive(list, id: id) }
        }
        if st != noErr { note("in port error \(st)") }
        st = MIDIOutputPortCreate(client, "out" as CFString, &outPort)
        if st != noErr { note("out port error \(st)") }

        // the app as a device for other apps
        st = MIDIDestinationCreateWithProtocol(client, Self.appName as CFString, ._1_0, &vDst) { [weak self] list, _ in
            self?.receive(list, id: Self.virtualIn)
        }
        if st != noErr { note("virtual destination error \(st)") }
        st = MIDISourceCreateWithProtocol(client, Self.appName as CFString, ._1_0, &vSrc)
        if st != noErr { note("virtual source error \(st)") }
        for e in [vSrc, vDst] where e != 0 { ownIDs.insert(Self.uid(e)) }

        if selfTest {
            st = MIDISourceCreateWithProtocol(client, Self.testName as CFString, ._1_0, &tSrc)
            if st != noErr { note("test source error \(st)") }
            MIDIDestinationCreateWithProtocol(client, Self.testName as CFString, ._1_0, &tDst) { [weak self] list, _ in
                guard let self else { return }
                let msgs = Self.parse(list)
                DispatchQueue.main.async { msgs.forEach { self.onTestOut?($0) } }
            }
        }
        return true
    }

    private func note(_ s: String) {
        diag.append(s)
        NSLog("SEQ3 MIDI: %@", s)
    }

    /// Reads the current sources and destinations, connects new sources and tells the page.
    func refresh() {
        guard started else { return }
        var ins: [Port] = [Port(id: Self.virtualIn, name: Self.appName + " (virtual)", man: "BLONDA")]
        var outs: [Port] = [Port(id: Self.virtualOut, name: Self.appName + " (virtual)", man: "BLONDA")]
        var seen = Set<MIDIUniqueID>()
        for i in 0..<MIDIGetNumberOfSources() {
            let e = MIDIGetSource(i)
            let u = Self.uid(e)
            if ownIDs.contains(u) { continue }
            seen.insert(u)
            let id = "s\(u)"
            ins.append(Port(id: id, name: Self.name(e), man: Self.str(e, kMIDIPropertyManufacturer)))
            if connected[u] != e {
                lock.lock()
                srcTable.append(id)
                let ref = UnsafeMutableRawPointer(bitPattern: srcTable.count)
                lock.unlock()
                if MIDIPortConnectSource(inPort, e, ref) == noErr { connected[u] = e }
            }
        }
        for u in connected.keys where !seen.contains(u) { connected[u] = nil }
        destinations.removeAll()
        for i in 0..<MIDIGetNumberOfDestinations() {
            let e = MIDIGetDestination(i)
            let u = Self.uid(e)
            if ownIDs.contains(u) { continue }
            let id = "d\(u)"
            destinations[id] = e
            outs.append(Port(id: id, name: Self.name(e), man: Self.str(e, kMIDIPropertyManufacturer)))
        }
        onPorts?(ins, outs)
    }

    /// Sends bytes from the page. delayMs > 0 = that much later (the page's own scheduling, e.g. clock and notes).
    func send(id: String, bytes: [UInt8], delayMs: Double) {
        guard started else { return }
        let words = Self.words(bytes)
        guard !words.isEmpty else { return }
        let ts: MIDITimeStamp = delayMs > 0.3 ? mach_absolute_time() + hostTicks(ms: min(delayMs, 10_000)) : 0
        withEventList(words, ts) { list in
            if id == Self.virtualOut {
                MIDIReceivedEventList(vSrc, list)
            } else if let d = destinations[id] {
                MIDISendEventList(outPort, d, list)
            }
        }
    }

    /// Self-test: a note from the test source, as if a keyboard was played.
    func sendTest() {
        guard tSrc != 0 else { return }
        withEventList(Self.words([0x90, 60, 100]), 0) { MIDIReceivedEventList(tSrc, $0) }
    }

    // MARK: - receiving

    private func receive(_ list: UnsafePointer<MIDIEventList>, id: String) {
        let msgs = Self.parse(list)
        guard !msgs.isEmpty else { return }
        lock.lock()
        for m in msgs { pending.append((id, m)) }
        let queue = !flushQueued
        flushQueued = true
        lock.unlock()
        if queue {
            DispatchQueue.main.async { [weak self] in self?.flush() }
        }
    }

    private func flush() {
        lock.lock()
        let batch = pending
        pending.removeAll(keepingCapacity: true)
        flushQueued = false
        lock.unlock()
        if !batch.isEmpty { onInput?(batch) }
    }

    /// Universal MIDI packets (MIDI 1.0 protocol) → classic MIDI bytes. System exclusive is left out (the page doesn't use it).
    static func parse(_ list: UnsafePointer<MIDIEventList>) -> [[UInt8]] {
        var out: [[UInt8]] = []
        for packet in list.unsafeSequence() {
            let count = Int(packet.pointee.wordCount)
            withUnsafeBytes(of: packet.pointee.words) { raw in
                let w = raw.bindMemory(to: UInt32.self)
                var i = 0
                while i < count && i < w.count {
                    let word = w[i]
                    let mt = Int(word >> 28)
                    let st = UInt8((word >> 16) & 0xFF), d1 = UInt8((word >> 8) & 0x7F), d2 = UInt8(word & 0x7F)
                    if mt == 0x1 {
                        switch st {
                        case 0xF1, 0xF3: out.append([st, d1])
                        case 0xF2: out.append([st, d1, d2])
                        default: out.append([st])
                        }
                    } else if mt == 0x2 {
                        let hi = st & 0xF0
                        out.append(hi == 0xC0 || hi == 0xD0 ? [st, d1] : [st, d1, d2])
                    }
                    i += umpWords(mt)
                }
            }
        }
        return out
    }

    private static func umpWords(_ mt: Int) -> Int {
        switch mt {
        case 0x0, 0x1, 0x2, 0x6, 0x7: return 1
        case 0x3, 0x4, 0x8, 0x9, 0xA: return 2
        case 0xB, 0xC: return 3
        default: return 4
        }
    }

    /// Classic MIDI bytes (one or more messages, running status allowed) → universal MIDI packet words.
    static func words(_ bytes: [UInt8]) -> [UInt32] {
        var words: [UInt32] = []
        var i = 0
        var running: UInt8 = 0
        while i < bytes.count && words.count < 60 {
            var st = bytes[i]
            if st < 0x80 {                       // running status
                guard running != 0 else { i += 1; continue }
                st = running
            } else {
                i += 1
                if st == 0xF0 {                  // system exclusive: skip to its end
                    while i < bytes.count && bytes[i] != 0xF7 { i += 1 }
                    i += 1
                    continue
                }
                if st < 0xF0 { running = st } else if st < 0xF8 { running = 0 }
            }
            let len: Int
            switch st {
            case 0x80...0xBF, 0xE0...0xEF, 0xF2: len = 2
            case 0xC0...0xDF, 0xF1, 0xF3: len = 1
            default: len = 0
            }
            guard i + len <= bytes.count else { break }
            let d1 = len > 0 ? UInt32(bytes[i] & 0x7F) : 0
            let d2 = len > 1 ? UInt32(bytes[i + 1] & 0x7F) : 0
            i += len
            let mt: UInt32 = st >= 0xF0 ? 0x1 : 0x2
            words.append(mt << 28 | UInt32(st) << 16 | d1 << 8 | d2)
        }
        return words
    }

    private func withEventList(_ words: [UInt32], _ ts: MIDITimeStamp, _ body: (UnsafePointer<MIDIEventList>) -> Void) {
        // one packet holds 64 words; words() never makes more than 60
        let list = UnsafeMutablePointer<MIDIEventList>.allocate(capacity: 1)
        defer { list.deallocate() }
        let size = MemoryLayout<MIDIEventList>.size
        var pkt: UnsafeMutablePointer<MIDIEventPacket> = MIDIEventListInit(list, ._1_0)
        for w in words {
            var word = w
            pkt = MIDIEventListAdd(list, size, pkt, ts, 1, &word)
        }
        body(UnsafePointer(list))
    }

    private func hostTicks(ms: Double) -> UInt64 {
        let ns = ms * 1_000_000
        return UInt64(ns * Double(timebase.denom) / Double(timebase.numer))
    }

    // MARK: - properties

    private static func uid(_ e: MIDIObjectRef) -> MIDIUniqueID {
        var v: Int32 = 0
        MIDIObjectGetIntegerProperty(e, kMIDIPropertyUniqueID, &v)
        return v
    }

    private static func str(_ e: MIDIObjectRef, _ key: CFString) -> String {
        var s: Unmanaged<CFString>?
        guard MIDIObjectGetStringProperty(e, key, &s) == noErr, let v = s?.takeRetainedValue() else { return "" }
        return v as String
    }

    private static func name(_ e: MIDIObjectRef) -> String {
        let n = str(e, kMIDIPropertyDisplayName)
        return n.isEmpty ? str(e, kMIDIPropertyName) : n
    }
}
