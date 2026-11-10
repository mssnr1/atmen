import { defaultPace, resolvePlan, type EngineSnapshot } from '../engine'
import { AMBIENT_HALF_MS, ambientAt, ambientMs, breathCurve, prefersReducedMotion, REST_LEVEL } from '../lib/breathClock'
import type { BreathSource } from '../visualization/breathState'

/** One calm breath, 5.5 s in and 5.5 s out: the plan the ambient snapshots refer to. */
const plan = resolvePlan(
  {
    phases: [
      { type: 'inhale', durationMs: AMBIENT_HALF_MS },
      { type: 'exhale', durationMs: AMBIENT_HALF_MS },
    ],
  },
  { kind: 'cycles', count: 1 },
  defaultPace,
)

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)

/**
 * A snapshot as the engine would give it, for a breath outside a session. It reports no session progress
 * and stays on its first breath, so nothing that builds up over an exercise (aura, body notes) shows.
 */
function snapshot(type: 'inhale' | 'exhale', phaseProgress: number, elapsedMs: number): EngineSnapshot {
  const phaseIndex = type === 'inhale' ? 0 : 1
  const phaseElapsedMs = phaseProgress * AMBIENT_HALF_MS
  return {
    status: 'running',
    plan,
    elapsedMs,
    remainingMs: 0,
    progress: 0,
    cycleIndex: 0,
    completedCycles: 0,
    cycleProgress: (phaseIndex + phaseProgress) / 2,
    phaseIndex,
    phase: plan.activePhases[phaseIndex],
    phaseElapsedMs,
    phaseRemainingMs: AMBIENT_HALF_MS - phaseElapsedMs,
    phaseProgress,
    done: false,
  }
}

/** Progress 0..1 of a breath phase at which `breathCurve` reaches `level`. */
export function inverseBreathCurve(level: number): number {
  const target = clamp01(level)
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (breathCurve(mid) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** The ambient breath at `ms` on the ambient clock (see lib/breathClock.ts). */
export function ambientSnapshot(ms: number, still = false): EngineSnapshot {
  if (still) return snapshot('inhale', inverseBreathCurve(REST_LEVEL), 0)
  const a = ambientAt(ms)
  return snapshot(a.inhale ? 'inhale' : 'exhale', a.phaseProgress, ms)
}

/** The figure breathing calmly on its own, in step with the wordmark and the breath sign. */
export const ambientSource: BreathSource = {
  sample: () => ambientSnapshot(ambientMs(), prefersReducedMotion()),
}

/**
 * The breath before an exercise: from wherever the lungs stand (`level`, 0..1) the air flows out, slowly
 * at first, and is all out after `durationMs`. The first inhale of the exercise then starts from empty
 * lungs without a jump.
 */
export function settleSource(level: number, durationMs: number, clock: () => number = ambientMs): BreathSource {
  const start = clock()
  // The point of an exhale at which the lungs hold `level`.
  const p0 = inverseBreathCurve(1 - clamp01(level))
  return {
    sample() {
      const k = clamp01((clock() - start) / durationMs)
      return snapshot('exhale', p0 + (1 - p0) * (k * k * (3 - 2 * k)), clock())
    },
  }
}
