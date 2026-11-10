import Cocoa

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private let addressField = NSTextField()
    private let codeField = NSSecureTextField()
    private let statusLabel = NSTextField(labelWithString: "")

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        buildWindow()
        NSApp.activate(ignoringOtherApps: true)
    }

    private func buildWindow() {
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 520, height: 390),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Fortunato Link"
        window.center()
        window.isReleasedWhenClosed = false

        let content = NSView(frame: window.contentView!.bounds)
        content.autoresizingMask = [.width, .height]
        window.contentView = content

        let title = NSTextField(labelWithString: "Fortunato Link")
        title.font = .systemFont(ofSize: 28, weight: .semibold)
        title.textColor = NSColor(calibratedRed: 0.17, green: 0.37, blue: 0.30, alpha: 1)
        title.frame = NSRect(x: 36, y: 320, width: 450, height: 40)
        content.addSubview(title)

        let subtitle = NSTextField(wrappingLabelWithString: "Apri sul Mac la cartella autorizzata dal tuo telefono Android, collegato alla stessa rete Wi-Fi.")
        subtitle.font = .systemFont(ofSize: 15)
        subtitle.frame = NSRect(x: 36, y: 268, width: 448, height: 46)
        content.addSubview(subtitle)

        addLabel("Indirizzo mostrato sul telefono", y: 231, to: content)
        addressField.placeholderString = "Esempio: 192.168.1.25:8787"
        addressField.font = .systemFont(ofSize: 16)
        addressField.frame = NSRect(x: 36, y: 195, width: 448, height: 30)
        content.addSubview(addressField)

        addLabel("Codice temporaneo di 6 cifre", y: 160, to: content)
        codeField.placeholderString = "000000"
        codeField.font = .monospacedDigitSystemFont(ofSize: 17, weight: .regular)
        codeField.frame = NSRect(x: 36, y: 124, width: 210, height: 30)
        content.addSubview(codeField)

        let button = NSButton(title: "Collega Android", target: self, action: #selector(connect))
        button.bezelStyle = .rounded
        button.keyEquivalent = "\r"
        button.frame = NSRect(x: 274, y: 120, width: 210, height: 38)
        content.addSubview(button)

        statusLabel.font = .systemFont(ofSize: 13)
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.frame = NSRect(x: 36, y: 72, width: 448, height: 34)
        content.addSubview(statusLabel)

        let note = NSTextField(labelWithString: "La connessione resta nella rete Wi-Fi locale.")
        note.font = .systemFont(ofSize: 12)
        note.textColor = .tertiaryLabelColor
        note.frame = NSRect(x: 36, y: 34, width: 448, height: 20)
        content.addSubview(note)

        window.makeKeyAndOrderFront(nil)
    }

    private func addLabel(_ text: String, y: CGFloat, to view: NSView) {
        let label = NSTextField(labelWithString: text)
        label.font = .systemFont(ofSize: 13, weight: .medium)
        label.frame = NSRect(x: 36, y: y, width: 448, height: 20)
        view.addSubview(label)
    }

    @objc private func connect() {
        var address = addressField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        let code = codeField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !address.isEmpty else {
            showError("Inserisci l’indirizzo mostrato dall’app Android.")
            return
        }
        guard code.count == 6, code.allSatisfy({ $0.isNumber }) else {
            showError("Il codice deve contenere esattamente 6 cifre.")
            return
        }

        if !address.contains("://") { address = "http://" + address }
        guard var components = URLComponents(string: address), components.host != nil else {
            showError("L’indirizzo non è valido.")
            return
        }
        components.scheme = "http"
        if components.port == nil { components.port = 8787 }
        components.path = "/browse"
        components.queryItems = [
            URLQueryItem(name: "code", value: code),
            URLQueryItem(name: "path", value: "")
        ]
        guard let url = components.url else {
            showError("Non è stato possibile creare il collegamento.")
            return
        }

        statusLabel.stringValue = "Apertura dei file Android nel browser…"
        NSWorkspace.shared.open(url)
    }

    private func showError(_ message: String) {
        statusLabel.stringValue = message
        NSSound.beep()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
