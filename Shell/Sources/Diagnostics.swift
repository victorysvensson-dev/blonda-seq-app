import Foundation
import UIKit

/// Diagnostics for finding out why the app is slow or misses a key on a real machine. Off unless the file
/// ~/Applications/SEQ3-diag exists (Mac); then the page measures itself (Bridge.diag) and everything is written to
/// ~/Applications/SEQ3-diag.log, together with how much CPU the app's own processes use in each measured phase.
/// The CPU figures come from proc_pid_rusage, looked up at run time so nothing here depends on macOS-only headers.
enum Diagnostics {
    static let markerPath = NSHomeDirectory() + "/Applications/SEQ3-diag"
    static let logPath = NSHomeDirectory() + "/Applications/SEQ3-diag.log"
    static var enabled: Bool = {
        #if targetEnvironment(macCatalyst)
        return FileManager.default.fileExists(atPath: markerPath)
        #else
        return false
        #endif
    }()

    private static let queue = DispatchQueue(label: "se.blonda.seq3.diag")
    private static let t0 = CFAbsoluteTimeGetCurrent()

    static func log(_ s: String) {
        guard enabled else { return }
        let line = String(format: "%8.2f ", CFAbsoluteTimeGetCurrent() - t0) + s + "\n"
        queue.async {
            if let h = FileHandle(forWritingAtPath: logPath) {
                h.seekToEndOfFile(); h.write(Data(line.utf8)); try? h.close()
            } else {
                try? Data(line.utf8).write(to: URL(fileURLWithPath: logPath))
            }
        }
    }

    // MARK: - CPU of the app's processes (the app itself and its WebKit helpers)

    private typealias RusageFn = @convention(c) (Int32, Int32, UnsafeMutableRawPointer) -> Int32
    private typealias ListFn = @convention(c) (UnsafeMutableRawPointer?, Int32) -> Int32
    private typealias NameFn = @convention(c) (Int32, UnsafeMutableRawPointer, UInt32) -> Int32
    private static let rusage: RusageFn? = sym("proc_pid_rusage")
    private static let listPids: ListFn? = sym("proc_listallpids")
    private static let procName: NameFn? = sym("proc_name")
    private static func sym<T>(_ name: String) -> T? {
        guard let p = dlsym(UnsafeMutableRawPointer(bitPattern: -2), name) else { return nil } // RTLD_DEFAULT
        return unsafeBitCast(p, to: T.self)
    }
    private static let tb: Double = {
        var t = mach_timebase_info_data_t(); mach_timebase_info(&t); return Double(t.numer) / Double(t.denom)
    }()

    /// rusage_info_v2 as raw words: [2] user time, [3] system time, [10] start time (mach units)
    private static func usage(_ pid: Int32) -> [UInt64]? {
        guard let rusage else { return nil }
        var buf = [UInt64](repeating: 0, count: 48)
        let r = buf.withUnsafeMutableBytes { rusage(pid, 2, $0.baseAddress!) }  // RUSAGE_INFO_V2
        return r == 0 ? buf : nil
    }

    private static func name(_ pid: Int32) -> String {
        guard let procName else { return "?" }
        var b = [CChar](repeating: 0, count: 256)
        _ = b.withUnsafeMutableBytes { procName(pid, $0.baseAddress!, 256) }
        return String(cString: b)
    }

    /// The app's own process and the WebKit processes started after it.
    static func processes() -> [(pid: Int32, name: String)] {
        let me = getpid()
        var out: [(Int32, String)] = [(me, "app")]
        guard let listPids, let mine = usage(me) else { return out }
        var pids = [Int32](repeating: 0, count: 8192)
        let n = pids.withUnsafeMutableBytes { listPids($0.baseAddress, Int32($0.count)) }
        for pid in pids.prefix(Int(max(0, n))) where pid > 0 && pid != me {
            let nm = name(pid)
            guard nm.hasPrefix("com.apple.WebKit") else { continue }
            if let u = usage(pid), u[10] >= mine[10] { out.append((pid, nm.replacingOccurrences(of: "com.apple.WebKit.", with: ""))) }
        }
        return out
    }

    /// Seconds of CPU time per process right now.
    static func cpu(_ procs: [(pid: Int32, name: String)]) -> [Int32: Double] {
        var d: [Int32: Double] = [:]
        for p in procs { if let u = usage(p.pid) { d[p.pid] = Double(u[2] &+ u[3]) * tb / 1e9 } }
        return d
    }
}

/// Phase marks from the page: CPU % of each process between "begin" and "end" of a phase.
final class CPUMeter {
    private var procs: [(pid: Int32, name: String)] = []
    private var start: [Int32: Double] = [:]
    private var t0 = CFAbsoluteTimeGetCurrent()
    private var phase = ""

    func begin(_ name: String) {
        procs = Diagnostics.processes()
        start = Diagnostics.cpu(procs)
        t0 = CFAbsoluteTimeGetCurrent()
        phase = name
    }

    func end() -> String {
        let dt = CFAbsoluteTimeGetCurrent() - t0
        let now = Diagnostics.cpu(procs)
        var parts: [String] = []
        var total = 0.0
        for p in procs {
            guard let a = start[p.pid], let b = now[p.pid] else { continue }
            let pct = (b - a) / dt * 100
            total += pct
            parts.append("\(p.name) \(Int(pct.rounded()))%")
        }
        return "CPU [\(phase)] over \(String(format: "%.1f", dt)) s: total \(Int(total.rounded()))% – " + parts.joined(separator: ", ")
    }
}
