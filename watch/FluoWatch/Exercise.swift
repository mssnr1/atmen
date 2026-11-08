import Foundation

/// One breathing exercise, mirroring src/exercises in the web app.
struct Exercise: Identifiable, Hashable {
    let id: String
    let name: String
    let inhale: Double
    let hold: Double
    let exhale: Double
    let afterglow: String

    var cycle: Double { inhale + hold + exhale }

    /// Whole breaths only, so a session never ends mid-breath (same rule as the web app).
    func cycles(forMinutes minutes: Double) -> Int { max(1, Int((minutes * 60 / cycle).rounded())) }

    static let all: [Exercise] = [
        Exercise(id: "resonance", name: "Resonanz", inhale: 5.5, hold: 1, exhale: 5.5,
                 afterglow: "Du fühlst dich jetzt ruhiger und ausgeglichener."),
        Exercise(id: "energy", name: "Energie", inhale: 4, hold: 1, exhale: 6,
                 afterglow: "Du fühlst dich jetzt wacher und klarer."),
        Exercise(id: "relax", name: "Entspannen", inhale: 4, hold: 1, exhale: 8,
                 afterglow: "Du fühlst dich jetzt besser und entspannter."),
    ]
}

enum BreathPhase: Equatable {
    case inhale, hold, exhale

    var word: String {
        switch self {
        case .inhale, .hold: return "einatmen"
        case .exhale: return "ausatmen"
        }
    }
}

/// Where a session stands at a given elapsed time. Pure, so the view can derive it every frame.
struct BreathState {
    let phase: BreathPhase
    /// 0...1 within the current phase.
    let phaseProgress: Double
    let cycleIndex: Int
    let remaining: Double
    let finished: Bool

    init(exercise e: Exercise, cycles: Int, elapsed: Double) {
        let total = Double(cycles) * e.cycle
        let t = min(max(elapsed, 0), total)
        finished = elapsed >= total
        remaining = total - t
        cycleIndex = min(cycles - 1, Int(t / e.cycle))
        let inCycle = finished ? e.cycle : t - Double(cycleIndex) * e.cycle
        if inCycle < e.inhale {
            phase = .inhale; phaseProgress = inCycle / e.inhale
        } else if inCycle < e.inhale + e.hold {
            phase = .hold; phaseProgress = (inCycle - e.inhale) / max(e.hold, 0.001)
        } else {
            phase = .exhale; phaseProgress = min(1, (inCycle - e.inhale - e.hold) / e.exhale)
        }
    }
}
