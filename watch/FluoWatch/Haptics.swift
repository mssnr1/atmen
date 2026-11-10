import WatchKit

/// Breath on the wrist. watchOS has no free vibration strength, so "stronger" is built from density:
/// a soft rattle of light clicks that follows the lung animation. Inhale swells (sparse to dense) while
/// the ribs fill from below, a firmer tap marks the full lung, the exhale starts dense and thins out
/// like the fading breath sound, and the quiet rest stays silent.
enum Haptics {
    /// Seconds to the next click at this point of the breath, or nil for silence.
    static func gap(_ s: BreathState) -> Double? {
        switch s.phase {
        case .hold:
            return nil
        case .inhale:
            return lerp(sparse, dense, ease(s.phaseProgress))
        case .exhale:
            guard s.phaseProgress < 0.94 else { return nil }
            return lerp(dense, sparse, ease(s.phaseProgress))
        }
    }

    /// Longest and shortest pause between clicks. Faster than ~0.15 s the watch starts dropping taps.
    static let sparse = 0.62
    static let dense = 0.16

    static func click() { WKInterfaceDevice.current().play(.click) }
    static func full() { WKInterfaceDevice.current().play(.directionUp) }
    static func release() { WKInterfaceDevice.current().play(.directionDown) }
    static func done() { WKInterfaceDevice.current().play(.success) }

    private static func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double { a + (b - a) * t }
    private static func ease(_ t: Double) -> Double { let x = min(1, max(0, t)); return x * x * (3 - 2 * x) }
}

/// Plays the rattle on its own clock, so it keeps going when the screen dims and the view updates slowly.
@MainActor
final class BreathRattle {
    private var task: Task<Void, Never>?

    func start(exercise: Exercise, cycles: Int, from start: Date) {
        stop()
        task = Task { @MainActor in
            var last: BreathPhase?
            while !Task.isCancelled {
                let s = BreathState(exercise: exercise, cycles: cycles, elapsed: Date().timeIntervalSince(start))
                if s.finished { break }
                // Accents at the turns: a firmer tap when the lung is full, a falling one to let go.
                if s.phase != last {
                    if s.phase == .hold { Haptics.full() }
                    if s.phase == .exhale { Haptics.release() }
                    let wasFirst = last == nil
                    last = s.phase
                    if !wasFirst && s.phase != .inhale {
                        try? await Task.sleep(for: .seconds(0.35))
                        continue
                    }
                }
                var wait = 0.05
                if let g = Haptics.gap(s) {
                    Haptics.click()
                    wait = g
                }
                try? await Task.sleep(for: .seconds(wait))
            }
        }
    }

    func stop() {
        task?.cancel()
        task = nil
    }
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
