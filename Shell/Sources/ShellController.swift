import UIKit
import WebKit
import UniformTypeIdentifiers

/// Hosts the page in a WKWebView and answers what the page asks the app for (MIDI, saving files, screen on).
final class ShellController: UIViewController, WKNavigationDelegate, WKUIDelegate, UIDocumentPickerDelegate {
    private var web: WKWebView!
    private let midi = MIDIBridge()
    private let args = ProcessInfo.processInfo.arguments
    private lazy var selfTest = args.contains("-selftest")

    private var pendingSave: (id: Int, dir: URL)?
    // self-test results from the app's side
    private var testOut: [[UInt8]] = []
    private var testSaveBytes = -1

    static let platform: String = {
        #if targetEnvironment(macCatalyst)
        return "mac"
        #else
        return UIDevice.current.userInterfaceIdiom == .pad ? "ipad" : "iphone"
        #endif
    }()

    override func loadView() {
        let cfg = WKWebViewConfiguration()
        cfg.setURLSchemeHandler(BundleScheme(), forURLScheme: BundleScheme.scheme)
        cfg.websiteDataStore = .default()                 // projects and the sample library are kept between launches
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.defaultWebpagePreferences.preferredContentMode = Self.platform == "mac" ? .desktop : .mobile
        let uc = cfg.userContentController
        uc.addUserScript(WKUserScript(source: Bridge.script(platform: Self.platform, selfTest: selfTest),
                                      injectionTime: .atDocumentStart, forMainFrameOnly: true))
        uc.add(MessageProxy(self), name: "blonda")

        web = WKWebView(frame: .zero, configuration: cfg)
        web.isOpaque = false
        let bg = UIColor(red: 23 / 255, green: 24 / 255, blue: 26 / 255, alpha: 1)
        web.backgroundColor = bg
        web.scrollView.backgroundColor = bg
        web.scrollView.contentInsetAdjustmentBehavior = .never   // the page handles the safe areas itself
        web.scrollView.bounces = false
        web.allowsLinkPreview = false
        web.allowsBackForwardNavigationGestures = false
        web.isInspectable = true                                 // Safari > Develop can inspect the page
        web.navigationDelegate = self
        web.uiDelegate = self
        view = web

        midi.onPorts = { [weak self] ins, outs in
            let enc = { (p: [MIDIBridge.Port]) in p.map { ["id": $0.id, "name": $0.name, "man": $0.man] } }
            self?.call("__blonda.midiPorts", ["ins": enc(ins), "outs": enc(outs)])
        }
        midi.onInput = { [weak self] batch in
            self?.call("__blonda.midiBatch", batch.map { [$0.0, $0.1.map { Int($0) }] as [Any] })
        }
        midi.onTestOut = { [weak self] bytes in self?.testOut.append(bytes) }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        web.load(URLRequest(url: BundleScheme.startURL))
        if selfTest {
            // if the page never reports, the app still writes what it knows, so a hang can be told apart from a crash
            DispatchQueue.main.asyncAfter(deadline: .now() + 75) { [weak self] in
                guard let self, !self.testDone else { return }
                self.finishSelfTest(["fatal": "the page did not report within 75 s"])
            }
        }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // the window on the Mac: not smaller than a phone
        if let scene = view.window?.windowScene {
            scene.sizeRestrictions?.minimumSize = CGSize(width: 390, height: 640)
        }
    }

    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var prefersStatusBarHidden: Bool { true }

    // MARK: - page → app

    fileprivate func handle(_ body: Any) {
        guard let b = body as? [String: Any], let t = b["t"] as? String else { return }
        switch t {
        case "midi-open":
            midi.open(selfTest: selfTest)
        case "midi-out":
            guard let id = b["id"] as? String, let d = b["d"] as? [NSNumber] else { return }
            midi.send(id: id, bytes: d.map { UInt8(truncatingIfNeeded: $0.intValue) },
                      delayMs: (b["dl"] as? NSNumber)?.doubleValue ?? 0)
        case "save":
            save(b)
        case "playing":
            UIApplication.shared.isIdleTimerDisabled = (b["on"] as? Bool) ?? false
        case "log":
            NSLog("SEQ3 page: %@", String(describing: b["m"] ?? ""))
        case "test-midi-send":
            if selfTest { midi.sendTest() }
        case "selftest":
            if selfTest { finishSelfTest(b["r"] as? [String: Any] ?? [:]) }
        default:
            break
        }
    }

    /// Calls a function in the page with JSON arguments.
    private func call(_ fn: String, _ arg: Any) {
        guard let data = try? JSONSerialization.data(withJSONObject: arg), let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.__blonda&&\(fn)(\(json))", completionHandler: nil)
    }

    // MARK: - saving files

    private func save(_ b: [String: Any]) {
        let id = (b["id"] as? NSNumber)?.intValue ?? 0
        guard let b64 = b["b64"] as? String, let data = Data(base64Encoded: b64) else {
            reply(id, ok: false, code: "failed"); return
        }
        var name = (b["name"] as? String ?? "export").replacingOccurrences(of: "/", with: "-").replacingOccurrences(of: ":", with: "-")
        if name.isEmpty || name.hasPrefix(".") { name = "export" + name }
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("export-\(UUID().uuidString)", isDirectory: true)
        let url = dir.appendingPathComponent(name)
        do {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try data.write(to: url)
        } catch {
            reply(id, ok: false, code: "failed"); return
        }
        if selfTest {
            testSaveBytes = data.count
            try? FileManager.default.removeItem(at: dir)
            reply(id, ok: true, code: nil)
            return
        }
        if let old = pendingSave { reply(old.id, ok: false, code: "declined"); try? FileManager.default.removeItem(at: old.dir) }
        pendingSave = (id, dir)
        let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
        picker.delegate = self
        picker.shouldShowFileExtensions = true
        present(picker, animated: true)
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { finishSave(ok: true) }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { finishSave(ok: false) }

    private func finishSave(ok: Bool) {
        guard let p = pendingSave else { return }
        pendingSave = nil
        try? FileManager.default.removeItem(at: p.dir)
        reply(p.id, ok: ok, code: ok ? nil : "declined")
    }

    private func reply(_ id: Int, ok: Bool, code: String?) {
        let c = code.map { "'\($0)'" } ?? "null"
        web.evaluateJavaScript("window.__blonda&&__blonda.saved(\(id),\(ok),\(c))", completionHandler: nil)
    }

    // MARK: - navigation

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        switch url.scheme?.lowercased() {
        case BundleScheme.scheme, "blob", "data", "about":
            decisionHandler(.allow)
        case "http", "https", "mailto":
            // links out of the app open in the browser / mail
            if action.targetFrame?.isMainFrame ?? true { UIApplication.shared.open(url) }
            decisionHandler(.cancel)
        default:
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url, ["http", "https"].contains(url.scheme?.lowercased() ?? "") { UIApplication.shared.open(url) }
        return nil
    }

    /// If iOS stops the page's process (e.g. low memory while in the background) it is started again; the project was
    /// saved by the page itself, so it comes back where it was.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        NSLog("SEQ3: web content process ended – reloading")
        webView.load(URLRequest(url: BundleScheme.startURL))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // no pinch-zoom of the whole app (two fingers belong to the pads and faders)
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
    }

    // MARK: - dialogs from the page (alert / confirm / prompt), in case the page ever uses them

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        presentOr(a) { completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        presentOr(a) { completionHandler(false) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        a.addTextField { $0.text = defaultText }
        a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { [weak a] _ in completionHandler(a?.textFields?.first?.text) })
        presentOr(a) { completionHandler(nil) }
    }

    private func presentOr(_ a: UIAlertController, fallback: () -> Void) {
        if presentedViewController == nil { present(a, animated: true) } else { fallback() }
    }

    // MARK: - self-test

    private var testDone = false

    private func finishSelfTest(_ page: [String: Any]) {
        guard !testDone else { return }
        testDone = true
        // give the test note sent to "BLONDA TEST" (and its note-off 200 ms later) time to arrive
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [self] in
            var r = page
            r["platform"] = Self.platform
            r["system"] = UIDevice.current.systemName + " " + UIDevice.current.systemVersion
            r["midiOutReceived"] = testOut.map { $0.map { Int($0) } }
            r["saveBytes"] = testSaveBytes
            r["midiNative"] = midi.diag
            let data = (try? JSONSerialization.data(withJSONObject: r, options: [.prettyPrinted, .sortedKeys])) ?? Data()
            let text = String(data: data, encoding: .utf8) ?? "{}"
            let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            try? data.write(to: docs.appendingPathComponent("selftest.json"))
            try? data.write(to: FileManager.default.temporaryDirectory.appendingPathComponent("selftest.json"))
            print("SEQ3-SELFTEST-BEGIN\n\(text)\nSEQ3-SELFTEST-END")
            fflush(stdout)
            if args.contains("-selftestexit") { exit(0) }
        }
    }
}

/// WKUserContentController keeps its handlers strongly; this proxy keeps the controller weakly so nothing leaks.
private final class MessageProxy: NSObject, WKScriptMessageHandler {
    weak var target: ShellController?
    init(_ t: ShellController) { target = t }
    func userContentController(_ uc: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.handle(message.body)
    }
}
