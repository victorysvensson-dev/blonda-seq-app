import Foundation

/// One saved project (web: LIB entries). The project itself is a web-format JSON file in Documents/Projects.
struct ProjectMeta: Codable, Identifiable, Equatable {
    var id: String
    var name: String
    var t: Double      // last saved (ms since 1970)
    var c: Double      // created
    var bpm: Double
    var patterns: Int  // how many of A–D have steps
}

/// The project library: Documents/Projects/<id>.json + index.json; the open one is remembered.
final class ProjectStore: ObservableObject {
    @Published private(set) var items: [ProjectMeta] = []
    @Published private(set) var current: String = ""
    let dir: URL
    private var indexURL: URL { dir.appendingPathComponent("index.json") }

    init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        dir = docs.appendingPathComponent("Projects", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        if let d = try? Data(contentsOf: indexURL), let list = try? JSONDecoder().decode([ProjectMeta].self, from: d) { items = list }
        current = UserDefaults.standard.string(forKey: "currentProject") ?? ""
        // first run with projects: the old single autosave becomes "Projekt 1"
        let legacy = docs.appendingPathComponent("project.json")
        if items.isEmpty, let json = try? String(contentsOf: legacy, encoding: .utf8) {
            let m = add(name: "Projekt 1", json: json); current = m.id
            try? FileManager.default.removeItem(at: legacy)
        }
        if !items.contains(where: { $0.id == current }) { current = items.first?.id ?? "" }
        persist()
    }

    var currentMeta: ProjectMeta? { items.first { $0.id == current } }
    func url(_ id: String) -> URL { dir.appendingPathComponent("\(id).json") }
    func json(_ id: String) -> String? { try? String(contentsOf: url(id), encoding: .utf8) }

    static func newId() -> String { String(Int(Date().timeIntervalSince1970 * 1000), radix: 36) + String(Int.random(in: 0..<1_679_616), radix: 36) }
    static func now() -> Double { Date().timeIntervalSince1970 * 1000 }

    @discardableResult
    func add(name: String, json: String) -> ProjectMeta {
        let id = Self.newId()
        try? json.write(to: url(id), atomically: true, encoding: .utf8)
        let m = ProjectMeta(id: id, name: name, t: Self.now(), c: Self.now(), bpm: Self.bpm(json), patterns: Self.patterns(json))
        items.append(m); persist(); return m
    }

    func setCurrent(_ id: String) { current = id; persist() }

    /// Autosave of the open project (called off the main thread with the JSON already made).
    func save(_ id: String, json: String) {
        try? json.write(to: url(id), atomically: true, encoding: .utf8)
        let bpm = Self.bpm(json), pats = Self.patterns(json)
        DispatchQueue.main.async {
            guard let i = self.items.firstIndex(where: { $0.id == id }) else { return }
            self.items[i].t = Self.now(); self.items[i].bpm = bpm; self.items[i].patterns = pats; self.persist()
        }
    }

    func rename(_ id: String, _ name: String) {
        guard let i = items.firstIndex(where: { $0.id == id }) else { return }
        items[i].name = name.trimmingCharacters(in: .whitespaces).isEmpty ? "Utan namn" : String(name.prefix(40)); persist()
    }

    func duplicate(_ id: String) -> ProjectMeta? {
        guard let src = items.first(where: { $0.id == id }), let j = json(id) else { return nil }
        let base = src.name.replacingOccurrences(of: #" kopia( \d+)?$"#, with: "", options: .regularExpression)
        var k = 1, nm = base + " kopia"
        while items.contains(where: { $0.name == nm }) { k += 1; nm = "\(base) kopia \(k)" }
        return add(name: nm, json: j)
    }

    func delete(_ id: String) {
        guard items.count > 1, let i = items.firstIndex(where: { $0.id == id }) else { return }
        try? FileManager.default.removeItem(at: url(id)); items.remove(at: i); persist()
    }

    func nextName() -> String {
        var k = items.count + 1
        while items.contains(where: { $0.name == "Projekt \(k)" }) { k += 1 }
        return "Projekt \(k)"
    }

    private func persist() {
        let list = items, u = indexURL
        if let d = try? JSONEncoder().encode(list) { try? d.write(to: u, options: .atomic) }
        UserDefaults.standard.set(current, forKey: "currentProject")
    }

    // MARK: reading the web format

    static func object(_ json: String) -> [String: Any]? { (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any] }
    static func bpm(_ json: String) -> Double { (object(json)?["bpm"] as? NSNumber)?.doubleValue ?? 0 }
    static func patterns(_ json: String) -> Int {
        guard let pats = object(json)?["pats"] as? [[[[String: Any]]]] else { return 0 }
        return pats.filter { pt in pt.contains { row in row.contains { (($0["v"] as? NSNumber)?.intValue ?? 0) > 0 } } }.count
    }
    /// 10×16 step values of pattern A for the card picture.
    static func thumb(_ json: String) -> [[Int]] {
        guard let pats = object(json)?["pats"] as? [[[[String: Any]]]], let p = pats.first else { return [] }
        return p.map { row in row.map { ($0["v"] as? NSNumber)?.intValue ?? 0 } }
    }
    /// web: freshData — the same sounds and settings, but no steps or notes, pattern A, song off.
    static func fresh(from json: String) -> String {
        guard var o = object(json) else { return json }
        if let pats = o["pats"] as? [[[[String: Any]]]] {
            o["pats"] = pats.map { pt in pt.map { row in row.map { c -> [String: Any] in ["v": 0, "n": c["n"] ?? 60] } } }
        }
        if let roll = o["roll"] as? [[String: Any]] { o["roll"] = roll.map { r in r.mapValues { _ in [Any]() } } }
        o["chain"] = [0, 0, 0, 0, 0, 0, 0, 0]; o["song"] = 0; o["pat"] = 0; o["solo"] = -1
        if let m = o["mute"] as? [Any] { o["mute"] = m.map { _ in 0 } }
        guard let d = try? JSONSerialization.data(withJSONObject: o), let s = String(data: d, encoding: .utf8) else { return json }
        return s
    }
}
