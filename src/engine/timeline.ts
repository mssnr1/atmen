import type { BreathingPattern, PhaseTransition, SessionLength, SessionPlan, SessionPosition } from './types'

/**
 * Pure timing functions. Everything here maps an elapsed time to a position
 * in the session, so the result never depends on how often it is called.
 */

export function validatePattern(pattern: BreathingPattern): void {
  if (pattern.phases.length === 0) throw new Error('A breathing pattern needs at least one phase')
  for (const p of pattern.phases) {
    if (!Number.isFinite(p.durationMs) || p.durationMs < 0) {
      throw new Error(`Invalid duration for phase "${p.type}": ${p.durationMs}`)
    }
  }
  if (!pattern.phases.some((p) => p.durationMs > 0)) {
    throw new Error('A breathing pattern needs at least one phase longer than 0 ms')
  }
}

export function cycleDuration(pattern: BreathingPattern): number {
  return pattern.phases.reduce((sum, p) => sum + p.durationMs, 0)
}

export function resolvePlan(pattern: BreathingPattern, length: SessionLength): SessionPlan {
  validatePattern(pattern)
  const activePhases = pattern.phases.filter((p) => p.durationMs > 0)
  const cycleDurationMs = cycleDuration(pattern)

  let totalCycles: number
  if (length.kind === 'cycles') {
    if (!Number.isInteger(length.count) || length.count < 1) throw new Error('Cycle count must be a positive integer')
    totalCycles = length.count
  } else {
    if (!Number.isFinite(length.durationMs) || length.durationMs <= 0) throw new Error('Session duration must be positive')
    totalCycles =
      length.alignToCycles === false
        ? length.durationMs / cycleDurationMs
        : Math.max(1, Math.round(length.durationMs / cycleDurationMs))
  }

  const totalDurationMs =
    length.kind === 'duration' && length.alignToCycles === false ? length.durationMs : totalCycles * cycleDurationMs

  return { pattern, activePhases, cycleDurationMs, totalDurationMs, totalCycles }
}

export function positionAt(plan: SessionPlan, elapsedMs: number): SessionPosition {
  const { activePhases, cycleDurationMs, totalDurationMs } = plan
  const elapsed = Math.min(Math.max(elapsedMs, 0), totalDurationMs)
  const done = elapsed >= totalDurationMs

  // At the very end, report the final moment of the last phase rather than
  // the first moment of a cycle that will never run.
  const lookup = done ? Math.max(0, totalDurationMs - 1e-6) : elapsed
  const cycleIndex = Math.floor(lookup / cycleDurationMs)
  let within = lookup - cycleIndex * cycleDurationMs

  let phaseIndex = 0
  while (phaseIndex < activePhases.length - 1 && within >= activePhases[phaseIndex].durationMs) {
    within -= activePhases[phaseIndex].durationMs
    phaseIndex++
  }
  const phase = activePhases[phaseIndex]
  const phaseElapsedMs = done ? phase.durationMs : within

  return {
    elapsedMs: elapsed,
    remainingMs: totalDurationMs - elapsed,
    progress: totalDurationMs === 0 ? 1 : elapsed / totalDurationMs,
    cycleIndex,
    completedCycles: Math.floor(elapsed / cycleDurationMs + 1e-9),
    phaseIndex,
    phase,
    phaseElapsedMs,
    phaseRemainingMs: phase.durationMs - phaseElapsedMs,
    phaseProgress: phaseElapsedMs / phase.durationMs,
    done,
  }
}

/**
 * Every phase start within [fromMs, toMs). Used to schedule audio cues ahead of
 * time so they stay precise even when the page is throttled in the background.
 */
export function transitionsBetween(plan: SessionPlan, fromMs: number, toMs: number): PhaseTransition[] {
  const result: PhaseTransition[] = []
  const end = Math.min(toMs, plan.totalDurationMs)
  let cycleIndex = Math.max(0, Math.floor(fromMs / plan.cycleDurationMs))
  for (;;) {
    let t = cycleIndex * plan.cycleDurationMs
    if (t >= end) break
    for (const phase of plan.activePhases) {
      if (t >= end) break
      if (t >= fromMs) result.push({ atMs: t, phase, cycleIndex })
      t += phase.durationMs
    }
    cycleIndex++
  }
  return result
}
