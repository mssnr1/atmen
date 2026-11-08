import SwiftUI

@main
struct FluoWatchApp: App {
    var body: some Scene {
        WindowGroup { RootView() }
    }
}

struct RootView: View {
    @State private var running: Exercise?
    @State private var finished: (Exercise, Int)?

    var body: some View {
        NavigationStack {
            ExerciseList { running = $0 }
        }
        .fullScreenCover(item: $running) { ex in
            NavigationStack {
                PracticeView(exercise: ex, minutes: 5) { cycles in
                    running = nil
                    finished = (ex, cycles)
                } onCancel: { running = nil }
            }
        }
        #if DEBUG
        // `-autostart` opens Resonance straight away (simulator checks can't tap Start).
        .onAppear { if ProcessInfo.processInfo.arguments.contains("-autostart") { running = Exercise.all[0] } }
        #endif
        .fullScreenCover(isPresented: Binding(get: { finished != nil }, set: { if !$0 { finished = nil } })) {
            if let f = finished {
                DoneView(exercise: f.0, cycles: f.1) { finished = nil }
            }
        }
    }
}

// MARK: - 1 · Choose

struct ExerciseList: View {
    let onStart: (Exercise) -> Void
    @State private var selected = Exercise.all[0]

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                ForEach(Exercise.all) { ex in
                    let sel = ex == selected
                    Button { selected = ex } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(ex.name).font(Fluo.font(16, .semibold)).foregroundStyle(Fluo.ink)
                            Text("\(fmt(ex.inhale)) ein · \(fmt(ex.exhale)) aus").font(Fluo.font(12)).foregroundStyle(Fluo.muted)
                            if sel {
                                RhythmCurve(exercise: ex)
                                    .stroke(Fluo.lavenderDeep, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                                    .frame(height: 18).padding(.top, 3)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14).padding(.vertical, 9)
                        .background(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .fill(sel ? AnyShapeStyle(LinearGradient(colors: [Color(red: 0.16, green: 0.14, blue: 0.31), Color(red: 0.09, green: 0.09, blue: 0.16)], startPoint: .topLeading, endPoint: .bottomTrailing)) : AnyShapeStyle(Fluo.card))
                        )
                        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(sel ? Fluo.indigo : .clear, lineWidth: 1.5))
                        .shadow(color: sel ? Fluo.indigo.opacity(0.35) : .clear, radius: 8)
                    }
                    .buttonStyle(.plain)
                }
                Button("Start") { onStart(selected) }
                    .buttonStyle(PillButtonStyle())
                    .padding(.top, 6)
            }
            .animation(.easeInOut(duration: 0.25), value: selected)
        }
        .navigationTitle("Fluo")
        .background(Color.black)
    }

    private func fmt(_ v: Double) -> String {
        v == v.rounded() ? String(Int(v)) : String(format: "%.1f", v).replacingOccurrences(of: ".", with: ",")
    }
}

// MARK: - 2 · Practice

struct PracticeView: View {
    let exercise: Exercise
    let minutes: Double
    let onFinish: (Int) -> Void
    let onCancel: () -> Void

    @State private var start = Date()
    @State private var lastPhase: BreathPhase?
    @State private var lastCycle = -1
    @State private var tapAt: Date = .distantPast
    @State private var keeper = SessionKeeper()
    @State private var done = false

    private var cycles: Int { exercise.cycles(forMinutes: minutes) }

    var body: some View {
        TimelineView(.animation) { ctx in
            let s = BreathState(exercise: exercise, cycles: cycles, elapsed: ctx.date.timeIntervalSince(start))
            let insight = Insight.forCycle(s.cycleIndex)
            ZStack {
                Color.black
                BreathFigure(frame: BreathFrames.index(phase: s.phase, progress: s.phaseProgress))
                LinearGradient(colors: [.black, .black.opacity(0)], startPoint: .top, endPoint: .bottom)
                    .frame(height: 34).frame(maxHeight: .infinity, alignment: .top)
                LinearGradient(stops: [.init(color: .black.opacity(0), location: 0), .init(color: .black.opacity(0.75), location: 0.45), .init(color: .black, location: 0.78)],
                               startPoint: .top, endPoint: .bottom)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .frame(height: 120).frame(maxHeight: .infinity, alignment: .bottom)

                if let insight {
                    InsightCard(insight: insight)
                        .frame(maxHeight: .infinity, alignment: .top)
                        .padding(.top, 28).padding(.horizontal, 6)
                        .transition(.opacity)
                }

                VStack(spacing: 2) {
                    ZStack {
                        TapRing(age: ctx.date.timeIntervalSince(tapAt))
                        Text(s.phase.word)
                            .font(Fluo.font(30))
                            .foregroundStyle(Fluo.lavender)
                            .shadow(color: Fluo.indigo.opacity(0.8), radius: 7)
                            .contentTransition(.opacity)
                            .animation(.easeInOut(duration: 0.6), value: s.phase.word)
                    }
                    Text("Runde \(s.cycleIndex + 1) · \(clock(s.remaining))")
                        .font(Fluo.font(11)).foregroundStyle(Fluo.muted).monospacedDigit()
                }
                .frame(maxHeight: .infinity, alignment: .bottom)
                .padding(.bottom, 6)
            }
            .onChange(of: s.phase) { _, p in cue(p) }
            .onChange(of: s.finished) { _, f in if f { finish() } }
            .animation(.easeInOut(duration: 0.8), value: insight?.id)
        }
        .ignoresSafeArea()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { keeper.stop(); onCancel() } label: { Image(systemName: "xmark") }
            }
        }
        .onAppear {
            start = Date()
            keeper.start()
            cue(.inhale)
        }
        .onDisappear { keeper.stop() }
    }

    private func cue(_ p: BreathPhase) {
        guard p != lastPhase else { return }
        lastPhase = p
        Haptics.cue(p)
        if p != .hold { tapAt = Date() }
    }

    private func finish() {
        guard !done else { return }
        done = true
        Haptics.done()
        keeper.stop()
        onFinish(cycles)
    }

    private func clock(_ s: Double) -> String {
        let t = Int(s.rounded(.up))
        return "\(t / 60):" + String(format: "%02d", t % 60)
    }
}

/// The expanding ring that marks a tap on the wrist.
struct TapRing: View {
    let age: Double
    var body: some View {
        let k = min(1, max(0, age / 0.9))
        Circle()
            .stroke(Fluo.lavender, lineWidth: 2)
            .frame(width: 30, height: 30)
            .scaleEffect(1 + k * 4)
            .opacity(age < 0.9 ? (1 - k) * 0.85 : 0)
            .allowsHitTesting(false)
    }
}

/// Short heads-up cards, from src/guide/insights.ts (German).
struct Insight: Identifiable {
    let id: String
    let place: String
    let impact: String

    static let all: [Insight] = [
        Insight(id: "diaphragm", place: "Zwerchfell", impact: "Mehr Atemvolumen"),
        Insight(id: "oxygen", place: "Lungenbläschen", impact: "Blut wird angereichert"),
        Insight(id: "co2", place: "Blut & Gewebe", impact: "Zellen werden versorgt"),
        Insight(id: "hrv", place: "Herz", impact: "Herzrhythmus in Resonanz"),
        Insight(id: "vagus", place: "Vagusnerv", impact: "Puls sinkt"),
        Insight(id: "cortisol", place: "Nervensystem", impact: "Stress sinkt"),
    ]

    /// Like the web app: the first card comes with the second breath, then one every two breaths.
    /// On the small screen only the newest card shows, for one breath.
    static func forCycle(_ c: Int) -> Insight? {
        guard c >= 1, (c - 1) % 2 == 0 else { return nil }
        let i = (c - 1) / 2
        return i < all.count ? all[i] : nil
    }
}

struct InsightCard: View {
    let insight: Insight
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(insight.place.uppercased() + " · WIRKUNG").font(Fluo.font(9, .semibold)).foregroundStyle(Fluo.muted).kerning(0.4)
            Text(insight.impact).font(Fluo.font(14, .semibold)).foregroundStyle(Fluo.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color(red: 0.08, green: 0.09, blue: 0.13).opacity(0.85)))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Fluo.lavender.opacity(0.18), lineWidth: 1))
    }
}

// MARK: - 3 · Done

struct DoneView: View {
    let exercise: Exercise
    let cycles: Int
    let onNext: () -> Void

    var body: some View {
        TimelineView(.animation) { ctx in
            // Afterglow: the figure keeps breathing slowly and dimmed, like the web app's end screen.
            let t = ctx.date.timeIntervalSinceReferenceDate
            let s = BreathState(exercise: exercise, cycles: 1_000_000, elapsed: t.truncatingRemainder(dividingBy: exercise.cycle * 1.6) / 1.6)
            ZStack {
                Color.black
                BreathFigure(frame: BreathFrames.index(phase: s.phase, progress: s.phaseProgress), dim: 0.5)
                LinearGradient(colors: [.black.opacity(0), .black], startPoint: .top, endPoint: .bottom)
                    .frame(height: 170).frame(maxHeight: .infinity, alignment: .bottom)
                VStack(spacing: 5) {
                    Text("gut gemacht")
                        .font(Fluo.font(26))
                        .foregroundStyle(Fluo.lavender)
                        .shadow(color: Fluo.indigo.opacity(0.75), radius: 7)
                    Text(exercise.afterglow)
                        .font(Fluo.font(12.5, .semibold)).foregroundStyle(Fluo.ink)
                        .multilineTextAlignment(.center)
                    Text("\(cycles) Atemzüge · \(Int((Double(cycles) * exercise.cycle / 60).rounded())) Min")
                        .font(Fluo.font(11)).foregroundStyle(Fluo.muted)
                    Button("Weiter", action: onNext).buttonStyle(PillButtonStyle()).padding(.top, 4)
                }
                .padding(.horizontal, 10)
                .frame(maxHeight: .infinity, alignment: .bottom)
                .padding(.bottom, 8)
            }
        }
        .ignoresSafeArea()
    }
}
