import WebKit
import UniformTypeIdentifiers

/// Serves the page from the app bundle as blonda://seq3/index.html.
/// A fixed origin of its own means saved projects, settings and the sample library (localStorage and IndexedDB) stay
/// put between launches, and WebKit treats a scheme it hands to a scheme handler as a secure context, so everything
/// the page uses that needs one (AudioWorklet for glitch and recording, among others) works as in the browser.
final class BundleScheme: NSObject, WKURLSchemeHandler {
    static let scheme = "blonda"
    static let startURL = URL(string: "blonda://seq3/index.html")!

    private let root = Bundle.main.resourceURL!.appendingPathComponent("Web", isDirectory: true).standardizedFileURL
    /// Sounds picked with the app's own file picker (several files or whole folders at once) are copied here and the page
    /// reads them as blonda://seq3/__import/… – then they are deleted again.
    static let importRoot = FileManager.default.temporaryDirectory.appendingPathComponent("imports", isDirectory: true).standardizedFileURL

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else {
            task.didFailWithError(URLError(.badURL))
            return
        }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let isImport = path.hasPrefix("/__import/")
        let base = isImport ? Self.importRoot : root
        let rel = isImport ? String(path.dropFirst("/__import/".count)) : String(path.dropFirst())
        let file = base.appendingPathComponent(rel).standardizedFileURL
        // only files inside Web/ (or the picked sounds) – never anything else in the bundle
        guard file.path.hasPrefix(base.path + "/"), let data = try? Data(contentsOf: file) else {
            let r = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "text/plain"])!
            task.didReceive(r)
            task.didReceive(Data("not found".utf8))
            task.didFinish()
            return
        }
        let r = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: [
            "Content-Type": Self.mime(file.pathExtension),
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
        ])!
        task.didReceive(r)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    static func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json"
        default: return UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"
        }
    }
}
