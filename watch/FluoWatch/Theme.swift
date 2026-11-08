import SwiftUI

/// Fluo dark tokens from src/index.css.
enum Fluo {
    static let lavender = Color(red: 0xC7 / 255, green: 0xBB / 255, blue: 0xFF / 255)
    static let indigo = Color(red: 0x9A / 255, green: 0x8C / 255, blue: 0xFF / 255)
    static let lavenderDeep = Color(red: 0xA8 / 255, green: 0x98 / 255, blue: 0xFF / 255)
    static let ink = Color(red: 0xF4 / 255, green: 0xF3 / 255, blue: 0xFF / 255)
    static let muted = Color(red: 0x8B / 255, green: 0x91 / 255, blue: 0xAB / 255)
    static let card = Color(red: 0x15 / 255, green: 0x16 / 255, blue: 0x1F / 255)
    static let mint = Color(red: 0xA7 / 255, green: 0xF3 / 255, blue: 0xD0 / 255)
    static let pillText = Color(red: 0x15 / 255, green: 0x18 / 255, blue: 0x26 / 255)

    static func font(_ size: CGFloat, _ weight: Font.Weight = .medium) -> Font {
        .custom(weight == .semibold || weight == .bold ? "Inter-SemiBold" : "Inter-Medium", size: size)
    }
}

/// The glowing lavender pill used for Start / Weiter.
struct PillButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Fluo.font(15, .semibold))
            .foregroundStyle(Fluo.pillText)
            .padding(.horizontal, 26)
            .padding(.vertical, 9)
            .background(
                Capsule().fill(LinearGradient(colors: [Color(red: 0.89, green: 0.86, blue: 1), Fluo.lavenderDeep],
                                              startPoint: .topLeading, endPoint: .bottomTrailing))
            )
            .shadow(color: Fluo.lavenderDeep.opacity(0.55), radius: 8)
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
    }
}

/// The small rhythm curve from the exercise cards: rise, rest, fall.
struct RhythmCurve: Shape {
    let exercise: Exercise
    func path(in r: CGRect) -> Path {
        let total = exercise.cycle
        let xi = r.width * exercise.inhale / total
        let xh = r.width * (exercise.inhale + exercise.hold) / total
        var p = Path()
        p.move(to: CGPoint(x: 0, y: r.maxY))
        p.addCurve(to: CGPoint(x: xi, y: r.minY), control1: CGPoint(x: xi * 0.5, y: r.maxY), control2: CGPoint(x: xi * 0.5, y: r.minY))
        p.addLine(to: CGPoint(x: xh, y: r.minY))
        let mid = xh + (r.width - xh) * 0.5
        p.addCurve(to: CGPoint(x: r.width, y: r.maxY), control1: CGPoint(x: mid, y: r.minY), control2: CGPoint(x: mid, y: r.maxY))
        return p
    }
}
