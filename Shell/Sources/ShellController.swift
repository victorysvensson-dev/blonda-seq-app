import UIKit
import AVFoundation
import WebKit
import UniformTypeIdentifiers

/// Hosts the page in a WKWebView and answers what the page asks the app for (MIDI, saving files, screen on).
final class ShellController: UIViewController, WKNavigationDelegate, WKUIDelegate, UIDocumentPickerDelegate {
    private var web: WKWebView!
    private let midi = MIDIBridge()
    private let link = LinkBridge()
    private let args = ProcessInfo.processInfo.arguments
    private lazy var selfTest = args.contains("-selftest")

    private var pendingSave: (id: Int, dir: URL)?
    private let cpuMeter = CPUMeter()
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
        if Diagnostics.enabled {
            // the marker file may hold a measuring script of its own (so a new measurement needs no new build)
            let custom = (try? String(contentsOfFile: Diagnostics.markerPath, encoding: .utf8))?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            uc.addUserScript(WKUserScript(source: custom.isEmpty ? Bridge.diag : custom, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            Diagnostics.log("SEQ3 \(Bundle.main.infoDictionary?["CFBundleVersion"] ?? "?") started on \(Self.platform)")
        }
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
            self?.call("__blonda.midiBatch", batch.map { [$0.0, $0.1.map { Int($0) }, $0.2] as [Any] })
        }
        midi.onTestOut = { [weak self] bytes in self?.testOut.append(bytes) }
        link.onState = { [weak self] st in self?.call("__blonda.linkState", st) }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        observeWake()
        web.load(URLRequest(url: BundleScheme.startURL))
        if selfTest {
            // if the page never reports, the app still writes what it knows, so a hang can be told apart from a crash
            DispatchQueue.main.asyncAfter(deadline: .now() + 270) { [weak self] in
                guard let self, !self.testDone else { return }
                self.finishSelfTest(["fatal": "the page did not report within 270 s"])
            }
        }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        NotificationCenter.default.addObserver(forName: UIWindow.didBecomeKeyNotification, object: view.window, queue: .main) { [weak self] _ in
            self?.focusPage("window became active")
        }
        // the window on the Mac: not smaller than a phone
        if let scene = view.window?.windowScene {
            scene.sizeRestrictions?.minimumSize = CGSize(width: 390, height: 640)
        }
    }

    // MARK: - scroll indicators

    /// The page hides the scroll bars of its scroll areas (the card columns, lists). Safari on the Mac honours that, but
    /// in the app (and on the iPad) WebKit draws each scroll area as a native scroll view with its own indicator, which
    /// ignores the page's CSS – a grey bar appeared at the side of the column while scrolling. The page's own scroll
    /// areas get no indicator, as on the web; the scroll areas come and go with the page, so this runs again regularly.
    private var indicatorTimer: Timer?
    private func hideScrollIndicators() {
        func walk(_ v: UIView) {
            for sub in v.subviews {
                if let sv = sub as? UIScrollView { sv.showsVerticalScrollIndicator = false; sv.showsHorizontalScrollIndicator = false }
                walk(sub)
            }
        }
        walk(web.scrollView)
        // WebKit turns pinch back on when the page's layout changes, so this is kept off every time
        web.scrollView.pinchGestureRecognizer?.isEnabled = false
        web.scrollView.minimumZoomScale = 1
        web.scrollView.maximumZoomScale = 1
        if web.scrollView.zoomScale != 1 { web.scrollView.setZoomScale(1, animated: false) }
        if indicatorTimer == nil {
            indicatorTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in self?.hideScrollIndicators() }
        }
    }

    // MARK: - keyboard

    /// The page gets the keyboard only when the web view is the first responder. On the Mac nothing makes it that by
    /// itself (no view had keyboard focus, so space and the other shortcuts went to the app frame and were lost).
    /// The web view takes focus when the page has loaded and whenever the window becomes active.
    private func focusPage(_ why: String) {
        let ok = web.becomeFirstResponder()
        Diagnostics.log("focus page (\(why)): \(ok)")
    }

    /// A key that still reaches the app frame (e.g. pressed before the page had focus) is handed to the page as the
    /// same keyboard event, and the page gets focus so the next keys go straight to it.
    override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        var rest = Set<UIPress>()
        for p in presses { if let k = p.key, forward(k, type: "keydown") { continue }; rest.insert(p) }
        if !presses.subtracting(rest).isEmpty { focusPage("key reached the app") }
        if !rest.isEmpty { super.pressesBegan(rest, with: event) }
    }

    override func pressesEnded(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        var rest = Set<UIPress>()
        for p in presses { if let k = p.key, forward(k, type: "keyup") { continue }; rest.insert(p) }
        if !rest.isEmpty { super.pressesEnded(rest, with: event) }
    }

    private func forward(_ k: UIKey, type: String) -> Bool {
        guard let (key, code) = Self.domKey(k) else { return false }
        let f = k.modifierFlags
        // ⌘-shortcuts belong to macOS and the menus (⌘Q, ⌘W, ⌘H …) – only ⌘Z / ⇧⌘Z (undo / redo) are the page's own
        if f.contains(.command) && code != "KeyZ" { return false }
        let args: [Any] = [type, key, code, f.contains(.shift), f.contains(.alternate), f.contains(.control), f.contains(.command)]
        guard let data = try? JSONSerialization.data(withJSONObject: args), let json = String(data: data, encoding: .utf8) else { return false }
        web.evaluateJavaScript("""
            ((a)=>{const el=(document.activeElement&&document.activeElement!==document.documentElement)?document.activeElement:document.body;
            el.dispatchEvent(new KeyboardEvent(a[0],{key:a[1],code:a[2],shiftKey:a[3],altKey:a[4],ctrlKey:a[5],metaKey:a[6],bubbles:true,cancelable:true,composed:true}))})(\(json))
            """, completionHandler: nil)
        Diagnostics.log("forwarded \(type) \(code) to the page")
        return true
    }

    /// UIKit key → the DOM's key and code.
    static func domKey(_ k: UIKey) -> (String, String)? {
        let u = UIKeyboardHIDUsage.self
        switch k.keyCode {
        case u.keyboardSpacebar: return (" ", "Space")
        case u.keyboardReturnOrEnter, u.keypadEnter: return ("Enter", "Enter")
        case u.keyboardEscape: return ("Escape", "Escape")
        case u.keyboardDeleteOrBackspace: return ("Backspace", "Backspace")
        case u.keyboardDeleteForward: return ("Delete", "Delete")
        case u.keyboardTab: return ("Tab", "Tab")
        case u.keyboardLeftArrow: return ("ArrowLeft", "ArrowLeft")
        case u.keyboardRightArrow: return ("ArrowRight", "ArrowRight")
        case u.keyboardUpArrow: return ("ArrowUp", "ArrowUp")
        case u.keyboardDownArrow: return ("ArrowDown", "ArrowDown")
        case u.keyboardHome: return ("Home", "Home")
        case u.keyboardEnd: return ("End", "End")
        case u.keyboardPageUp: return ("PageUp", "PageUp")
        case u.keyboardPageDown: return ("PageDown", "PageDown")
        default: break
        }
        let raw = k.keyCode.rawValue
        let ch = k.charactersIgnoringModifiers
        guard !ch.isEmpty else { return nil }
        if raw >= u.keyboardA.rawValue && raw <= u.keyboardZ.rawValue {
            let letter = Character(UnicodeScalar(UInt8(65 + raw - u.keyboardA.rawValue)))
            return (k.modifierFlags.contains(.shift) ? ch.uppercased() : ch, "Key\(letter)")
        }
        if raw >= u.keyboard1.rawValue && raw <= u.keyboard0.rawValue {
            let d = raw == u.keyboard0.rawValue ? 0 : raw - u.keyboard1.rawValue + 1
            return (ch, "Digit\(d)")
        }
        return (ch, "")
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
        case "audio-in":
            audioIn(b)
        case "pick-audio":
            pickAudio(id: (b["id"] as? NSNumber)?.intValue ?? 0, multi: (b["multi"] as? Bool) ?? true,
                      json: (b["json"] as? Bool) ?? false, audio: (b["audio"] as? Bool) ?? true)
        case "pick-done":
            if let id = (b["id"] as? NSNumber)?.intValue {
                try? FileManager.default.removeItem(at: BundleScheme.importRoot.appendingPathComponent("\(id)", isDirectory: true))
            }
        case "link":
            link.handle(b) { [weak self] vc in self?.presentLinkSettings(vc) }
        case "native":
            native(b)
        case "playing":
            UIApplication.shared.isIdleTimerDisabled = (b["on"] as? Bool) ?? false
        case "log":
            NSLog("SEQ3 page: %@", String(describing: b["m"] ?? ""))
        case "diag":
            Diagnostics.log(String(describing: b["m"] ?? ""))
        case "mark":
            if (b["p"] as? String) == "begin" { cpuMeter.begin(b["name"] as? String ?? "?") } else { Diagnostics.log(cpuMeter.end()) }
        case "test-midi-send":
            if selfTest { midi.sendTest() }
        case "step":
            testStep = b["s"] as? String ?? "?"
        case "selftest":
            if selfTest { finishSelfTest(b["r"] as? [String: Any] ?? [:]) }
        default:
            break
        }
    }

    /// Abletons inställningsvy för Link: ett litet fönster med Klar-knapp (popover på iPad och Mac).
    private func presentLinkSettings(_ vc: UIViewController) {
        guard presentedViewController == nil else { return }
        vc.title = "Ableton Link"
        vc.navigationItem.rightBarButtonItem = UIBarButtonItem(systemItem: .done, primaryAction: UIAction { [weak self] _ in
            self?.dismiss(animated: true)
        })
        let nav = UINavigationController(rootViewController: vc)
        nav.preferredContentSize = CGSize(width: 320, height: 400)
        if Self.platform != "iphone" {
            nav.modalPresentationStyle = .popover
            if let pop = nav.popoverPresentationController {
                pop.sourceView = view
                pop.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
                pop.permittedArrowDirections = []
            }
        } else {
            nav.modalPresentationStyle = .formSheet
        }
        present(nav, animated: true)
    }

    // MARK: - coming back (background, a call, another app's audio): the session on again, both engines awake

    private var wakeObservers: [NSObjectProtocol] = []
    private func observeWake() {
        let nc = NotificationCenter.default
        let wake: (Notification) -> Void = { [weak self] _ in self?.wakeAudio() }
        wakeObservers.append(nc.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main, using: wake))
        wakeObservers.append(nc.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] n in
            let t = (n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt).flatMap(AVAudioSession.InterruptionType.init(rawValue:))
            if t == .ended { self?.wakeAudio() }
        })
        wakeObservers.append(nc.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: .main, using: wake))
        wakeObservers.append(nc.addObserver(forName: .AVAudioEngineConfigurationChange, object: nil, queue: .main) { _ in NativeAudio.shared().resumeIfNeeded() })
    }
    private func wakeAudio() {
        Audio.reactivate()
        NativeAudio.shared().resumeIfNeeded()
        call("__blonda.wake", true)
    }

    // MARK: - native audio (the C++ engine plays, the page is the editor)

    private var nativeTimer: Timer?
    private func native(_ b: [String: Any]) {
        let na = NativeAudio.shared()
        switch b["op"] as? String ?? "" {
        case "on":
            do {
                try na.start()
                if let j = b["json"] as? String { try na.setProjectJSON(j) }
                if nativeTimer == nil {
                    let t = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in self?.nativeState() }
                    RunLoop.main.add(t, forMode: .common); nativeTimer = t
                }
            } catch { call("__blonda.nativeState", ["on": false, "err": error.localizedDescription]); return }
            nativeState()
        case "off":
            na.stop(); nativeTimer?.invalidate(); nativeTimer = nil; nativeState()
        case "project":
            guard let j = b["json"] as? String else { return }
            do { try na.setProjectJSON(j) } catch { call("__blonda.nativeState", ["on": na.running, "err": error.localizedDescription]) }
        case "play":
            na.setPlaying((b["on"] as? Bool) ?? false)
        case "note":
            let t = (b["tr"] as? NSNumber)?.intValue ?? -1, n = (b["n"] as? NSNumber)?.intValue ?? 60
            if (b["on"] as? Bool) ?? false { na.noteOn(t, note: n, velocity: (b["v"] as? NSNumber)?.floatValue ?? 0.8) } else { na.noteOff(t, note: n) }
        default:
            break
        }
    }
    private func nativeState() {
        let na = NativeAudio.shared()
        call("__blonda.nativeState", ["on": na.running, "playing": na.playing, "step": na.currentStep, "load": na.load, "peak": na.peak, "sr": na.sampleRate])
    }

    /// Calls a function in the page with JSON arguments.
    private func call(_ fn: String, _ arg: Any) {
        // JSONSerialization throws an Objective-C exception (a crash, not an error) for anything it can't write,
        // so check first: containers must be valid JSON, and single values go through as JSON fragments.
        let valid = (arg is [Any] || arg is [String: Any]) ? JSONSerialization.isValidJSONObject(arg)
            : (arg is String || arg is NSNumber || arg is NSNull)
        guard valid, let data = try? JSONSerialization.data(withJSONObject: arg, options: .fragmentsAllowed), let json = String(data: data, encoding: .utf8) else { return }
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

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        if controller === importPicker { finishPick(urls); return }
        finishSave(ok: true)
    }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        if controller === importPicker { finishPick([]); return }
        finishSave(ok: false)
    }

    // MARK: - sampling: recording from instruments (USB audio, the mic)

    private var routeObserver: NSObjectProtocol?
    private let recorder = Recorder()

    /// The sampler asks for the inputs ("open"), picks one ("select") and lets go ("close"). The list goes back to the
    /// page as __blonda.audioInputs([...]) – again whenever something is plugged in or out while the sampler is open.
    private func audioIn(_ b: [String: Any]) {
        switch b["op"] as? String {
        case "open":
            Audio.record(true)
            if routeObserver == nil {
                routeObserver = NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] _ in
                    self?.call("__blonda.audioInputs", Audio.inputs())
                }
            }
            call("__blonda.audioInputs", Audio.inputs())
        case "select":
            let ok = Audio.selectInput(b["uid"] as? String ?? "")
            call("__blonda.audioInputs", Audio.inputs().map { var d = $0; d["selected"] = ok; return d })
        case "rec":
            if (b["on"] as? Bool) ?? false {
                Audio.record(true)
                recorder.onBlock = { [weak self] b64, sr in
                    self?.web.evaluateJavaScript("window.__blonda&&__blonda.recData('\(b64)',\(sr))", completionHandler: nil)
                }
                recorder.start { [weak self] err, sr in
                    self?.call("__blonda.recStarted", ["ok": err == nil, "err": err ?? "", "sr": sr])
                }
            } else {
                recorder.stop()
            }
        case "close":
            recorder.stop()
            if let o = routeObserver { NotificationCenter.default.removeObserver(o); routeObserver = nil }
            Audio.record(false)
        default:
            break
        }
    }

    /// The page's own origin may record (the sampler); iOS still asks the user once (the microphone permission).
    @available(iOS 15.0, *)
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo,
                 type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(origin.protocol == BundleScheme.scheme && type != .camera ? .grant : .deny)
    }

    // MARK: - importing sounds (several files or whole folders at once)

    /// The page's "add sounds" buttons open the app's own picker instead of WebKit's: it goes straight to Files, lets you
    /// pick several sounds at once (Select) and also whole folders – every sound in a folder (and its subfolders) is
    /// imported. The picked files are copied to a temporary folder the page reads from; the page then hands them to its
    /// own import, exactly as if they had been picked in the browser.
    private var importPicker: UIDocumentPickerViewController?
    private var importId = 0
    static let audioExt: Set<String> = ["wav", "wave", "aif", "aiff", "aifc", "mp3", "m4a", "aac", "flac", "ogg", "caf"]

    /// What the page's file input takes: sounds, and/or .json (BLONDA SAMPLER instruments, BLONDA SYNTHS presets).
    private var importJson = false, importAudio = true

    private func pickAudio(id: Int, multi: Bool, json: Bool = false, audio: Bool = true) {
        if let old = importPicker { old.dismiss(animated: false); finishPick([]) }
        importId = id
        importJson = json; importAudio = audio || !json
        var types: [UTType] = [.folder]
        if importAudio { types.insert(.audio, at: 0) }
        if importJson { types.insert(.json, at: 0) }
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: false)
        picker.allowsMultipleSelection = multi
        picker.shouldShowFileExtensions = true
        picker.delegate = self
        importPicker = picker
        present(picker, animated: true)
    }

    private func finishPick(_ urls: [URL]) {
        let id = importId
        importPicker = nil
        if urls.isEmpty { call("__blonda.picked", ["id": id, "files": [Any]()]); return }
        let ext = (importAudio ? Self.audioExt : []).union(importJson ? ["json"] : [])
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let files = Self.collectAudio(urls, into: BundleScheme.importRoot.appendingPathComponent("\(id)", isDirectory: true), id: id, ext: ext)
            DispatchQueue.main.async { self?.call("__blonda.picked", ["id": id, "files": files]) }
        }
    }

    /// Copies the picked sounds (and every sound inside picked folders) to the import folder. At most 500 files.
    static func collectAudio(_ urls: [URL], into dir: URL, id: Int, ext: Set<String> = audioExt) -> [[String: Any]] {
        let fm = FileManager.default
        try? fm.removeItem(at: dir)
        try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
        var out: [[String: Any]] = []
        func add(_ src: URL) {
            guard out.count < 500, ext.contains(src.pathExtension.lowercased()) else { return }
            let n = out.count
            let dst = dir.appendingPathComponent("\(n).\(src.pathExtension.lowercased())")
            do { try fm.copyItem(at: src, to: dst) } catch { return }
            let size = (try? fm.attributesOfItem(atPath: dst.path)[.size] as? NSNumber)?.intValue ?? 0
            out.append(["u": "__import/\(id)/\(dst.lastPathComponent)", "name": src.lastPathComponent,
                        "type": BundleScheme.mime(src.pathExtension), "size": size])
        }
        for url in urls {
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            var isDir: ObjCBool = false
            if fm.fileExists(atPath: url.path, isDirectory: &isDir), isDir.boolValue {
                let items = fm.enumerator(at: url, includingPropertiesForKeys: [.isRegularFileKey], options: [.skipsHiddenFiles])?
                    .compactMap { $0 as? URL }.sorted { $0.path.localizedStandardCompare($1.path) == .orderedAscending } ?? []
                items.forEach(add)
            } else {
                add(url)
            }
        }
        return out
    }

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
        if action.targetFrame?.isMainFrame ?? false { Diagnostics.log("navigation \(action.navigationType.rawValue) to \(url.absoluteString)") }
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
        testCrashes.append(testStep)
        Diagnostics.log("web content process ended – reloading")
        webView.load(URLRequest(url: BundleScheme.startURL))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // no pinch-zoom of the whole app (two fingers belong to the pads and faders)
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        hideScrollIndicators()
        Diagnostics.log("page finished loading \(webView.url?.absoluteString ?? "")")
        focusPage("page loaded")
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
    private var testStep = "start"          // the self-test's last step, and where the page's process ended (if it did)
    private var testCrashes: [String] = []

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
            r["lastStep"] = testStep
            r["webCrashes"] = testCrashes
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
