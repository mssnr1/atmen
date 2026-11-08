import WatchKit

/// Breath cues on the wrist: a rising tap to breathe in, a falling one to breathe out.
/// The quiet rest after the inhale stays silent, like in the web app.
enum Haptics {
    static func cue(_ phase: BreathPhase) {
        switch phase {
        case .inhale: WKInterfaceDevice.current().play(.directionUp)
        case .exhale: WKInterfaceDevice.current().play(.directionDown)
        case .hold: break
        }
    }

    static func done() { WKInterfaceDevice.current().play(.success) }
}

/// Keeps the app running in front (screen may dim) for the length of a session.
final class SessionKeeper: NSObject, WKExtendedRuntimeSessionDelegate {
    private var session: WKExtendedRuntimeSession?

    func start() {
        let s = WKExtendedRuntimeSession()
        s.delegate = self
        s.start()
        session = s
    }

    func stop() {
        session?.invalidate()
        session = nil
    }

    func extendedRuntimeSessionDidStart(_ extendedRuntimeSession: WKExtendedRuntimeSession) {}
    func extendedRuntimeSessionWillExpire(_ extendedRuntimeSession: WKExtendedRuntimeSession) {}
    func extendedRuntimeSession(_ extendedRuntimeSession: WKExtendedRuntimeSession,
                                didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason,
                                error: Error?) {}
}
