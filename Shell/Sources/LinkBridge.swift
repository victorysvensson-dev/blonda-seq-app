import UIKit

/// Ableton Link through Abletons LinkKit (Shell/Vendor/LinkKit, hämtas med tools/get_linkkit.sh).
/// Sidan sköter själva sekvensern; här finns bara Link-sessionen. Sidan får en ögonblicksbild av tidslinjen
/// (tempo, slag vid en viss värdtid, spelar/stoppad) och räknar själv ut när stegen ska ljuda.
/// Link slås på och av bara i Abletons egen inställningsvy (enligt Abletons riktlinjer).
final class LinkBridge {
    static let quantum = 4.0                       // en takt = 4 slag = 16 steg i SEQ.3
    private let link: ABLLinkRef
    private var timer: Timer?
    private var appPlaying = false
    /// skickar tillståndet till sidan
    var onState: (([String: Any]) -> Void)?

    init(bpm: Double = 120) {
        link = ABLLinkNew(bpm)
        let ctx = Unmanaged.passUnretained(self).toOpaque()
        ABLLinkSetSessionTempoCallback(link, { _, c in LinkBridge.from(c)?.changed() }, ctx)
        ABLLinkSetStartStopCallback(link, { _, c in LinkBridge.from(c)?.changed() }, ctx)
        ABLLinkSetIsEnabledCallback(link, { _, c in LinkBridge.from(c)?.changed() }, ctx)
        ABLLinkSetIsStartStopSyncEnabledCallback(link, { _, c in LinkBridge.from(c)?.changed() }, ctx)
        ABLLinkSetIsConnectedCallback(link, { _, c in LinkBridge.from(c)?.changed() }, ctx)
        ABLLinkSetNumPeersCallback(link, { _, c in LinkBridge.from(c)?.changed() }, ctx)
        ABLLinkSetActive(link, true)
        let nc = NotificationCenter.default
        nc.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            guard let self else { return }
            if !self.appPlaying { ABLLinkSetActive(self.link, false) }   // Abletons riktlinje: inte aktiv i bakgrunden när den är tyst
        }
        nc.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in
            guard let self else { return }
            ABLLinkSetActive(self.link, true)
            self.changed()
        }
        updateTimer()
    }

    private static func from(_ c: UnsafeMutableRawPointer?) -> LinkBridge? {
        guard let c else { return nil }
        return Unmanaged<LinkBridge>.fromOpaque(c).takeUnretainedValue()
    }

    // MARK: värdtid (mach_absolute_time) <-> ms, samma ms som MIDI-bryggan skickar till sidan

    private static let tb: mach_timebase_info_data_t = { var t = mach_timebase_info_data_t(); mach_timebase_info(&t); return t }()
    private static func ms(_ ticks: UInt64) -> Double { Double(ticks) * Double(tb.numer) / Double(tb.denom) / 1_000_000 }
    private static func ticks(_ ms: Double) -> UInt64 { UInt64(max(0, ms) * 1_000_000 * Double(tb.denom) / Double(tb.numer)) }

    // MARK: till sidan

    private func changed() {
        updateTimer()
        onState?(snapshot())
    }

    /// Medan Link är på skickas tidslinjen 10 gånger i sekunden (sidan behöver den för att hålla takten).
    private func updateTimer() {
        let on = ABLLinkIsEnabled(link)
        if on, timer == nil {
            let t = Timer(timeInterval: 0.1, repeats: true) { [weak self] _ in
                guard let self else { return }
                self.onState?(self.snapshot())
            }
            RunLoop.main.add(t, forMode: .common)
            timer = t
        } else if !on, let t = timer {
            t.invalidate()
            timer = nil
        }
    }

    func snapshot() -> [String: Any] {
        let s = ABLLinkCaptureAppSessionState(link)
        let now = mach_absolute_time()
        return [
            "on": ABLLinkIsEnabled(link),
            "conn": ABLLinkIsConnected(link),
            "peers": ABLLinkNumPeers(link),
            "ss": ABLLinkIsStartStopSyncEnabled(link),
            "bpm": ABLLinkGetTempo(s),
            "beat": ABLLinkBeatAtTime(s, now, Self.quantum),
            "host": Self.ms(now),
            "playing": ABLLinkIsPlaying(s),
            "q": Self.quantum,
        ]
    }

    // MARK: från sidan

    func handle(_ b: [String: Any], present: (UIViewController) -> Void) {
        switch b["op"] as? String ?? "" {
        case "query":
            onState?(snapshot())
        case "settings":
            present(ABLLinkSettingsViewController.instance(link))
        case "tempo":
            guard let bpm = (b["bpm"] as? NSNumber)?.doubleValue, bpm >= 20, bpm <= 999 else { return }
            let s = ABLLinkCaptureAppSessionState(link)
            if abs(ABLLinkGetTempo(s) - bpm) < 0.005 { return }
            ABLLinkSetTempo(s, bpm, mach_absolute_time())
            ABLLinkCommitAppSessionState(link, s)
        case "play":
            // sidan har valt värdtiden (ms) då steg 0 ljuder och vilket slag det är på tidslinjen
            appPlaying = true
            guard ABLLinkIsEnabled(link) else { return }
            let at = (b["host"] as? NSNumber)?.doubleValue ?? Self.ms(mach_absolute_time())
            let beat = (b["beat"] as? NSNumber)?.doubleValue ?? 0
            let s = ABLLinkCaptureAppSessionState(link)
            if ABLLinkIsStartStopSyncEnabled(link) {
                if !ABLLinkIsPlaying(s) { ABLLinkSetIsPlayingAndRequestBeatAtTime(s, true, Self.ticks(at), beat, Self.quantum) }
            } else {
                ABLLinkRequestBeatAtTime(s, beat, Self.ticks(at), Self.quantum)   // ensam i sessionen: takten börjar när SEQ.3 startar
            }
            ABLLinkCommitAppSessionState(link, s)
        case "stop":
            appPlaying = false
            guard ABLLinkIsEnabled(link), ABLLinkIsStartStopSyncEnabled(link) else { return }
            let s = ABLLinkCaptureAppSessionState(link)
            if ABLLinkIsPlaying(s) {
                ABLLinkSetIsPlaying(s, false, mach_absolute_time())
                ABLLinkCommitAppSessionState(link, s)
            }
        default:
            break
        }
    }
}
