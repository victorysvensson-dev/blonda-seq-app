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

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else {
            task.didFailWithError(URLError(.badURL))
            return
        }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        // only files inside Web/ – never anything else in the bundle
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
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
