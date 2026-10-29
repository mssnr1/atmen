import type {
  BreathingPattern,
  BreathPhase,
  Pace,
  PhaseTransition,
  PlanSegment,
  SessionLength,
  SessionPlan,
  SessionPosition,
} from './types'

/**
 * Pure timing functions. A plan is a list of phase segments laid out on the
 * session timeline, and everything here maps an elapsed time to a position in
 * it, so the result never depends on how often it is called.
 */

export const defaultPace: Pace = { scale: 1, slowDown: false }

/** With slow-down on, the last breath is this much longer than the first. */
export const SLOW_DOWN_FACTOR = 1.5

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

function validatePace(pace: Pace): void {
  if (!Number.isFinite(pace.scale) || pace.scale <= 0) throw new Error(`Invalid pace scale: ${pace.scale}`)
}

export function cycleDuration(pattern: BreathingPattern): number {
  return pattern.phases.reduce((sum, p) => sum + p.durationMs, 0)
}

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/**
 * How much longer cycle `i` is because of slow-down: 1 at `rampFrom`, easing
 * up to SLOW_DOWN_FACTOR at the last cycle, so each breath is a little slower
 * than the one before.
 */
export function slowDownFactor(cycle: number, rampFrom: number, totalCycles: number): number {
  const span = Math.ceil(totalCycles) - 1 - rampFrom
  if (span <= 0 || cycle <= rampFrom) return 1
  return 1 + (SLOW_DOWN_FACTOR - 1) * easeInOutSine(Math.min(1, (cycle - rampFrom) / span))
}

function phaseDuration(phase: BreathPhase, cycle: number, pace: Pace, rampFrom: number, totalCycles: number): number {
  const ramp = pace.slowDown ? slowDownFactor(cycle, rampFrom, totalCycles) : 1
  return phase.durationMs * pace.scale * ramp
}

/** Total length of `count` whole cycles at a pace, for choosing a cycle count. */
function lengthOfCycles(activePhases: BreathPhase[], count: number, pace: Pace): number {
  let total = 0
  for (let c = 0; c < count; c++) for (const p of activePhases) total += phaseDuration(p, c, pace, 0, count)
  return total
}

/** The whole-cycle count whose length comes closest to `durationMs`. */
function cyclesForDuration(activePhases: BreathPhase[], durationMs: number, pace: Pace): number {
  let best = 1
  let bestDiff = Infinity
  for (let n = 1; n < 10_000; n++) {
    const length = lengthOfCycles(activePhases, n, pace)
    const diff = Math.abs(length - durationMs)
    if (diff < bestDiff) {
      best = n
      bestDiff = diff
    }
    if (length > durationMs) break
  }
  return best
}

/**
 * Lay out segments after `kept`, starting with phase `phaseIndex` of cycle
 * `cycleIndex`, until the session has `totalCycles` cycles or reaches
 * `fixedEndMs`.
 */
function layout(
  activePhases: BreathPhase[],
  kept: PlanSegment[],
  cycleIndex: number,
  phaseIndex: number,
  totalCycles: number,
  fixedEndMs: number | null,
  pace: Pace,
  rampFrom: number,
): PlanSegment[] {
  const segments = kept.slice()
  const last = kept[kept.length - 1]
  let t = last ? last.startMs + last.durationMs : 0
  let c = cycleIndex
  let i = phaseIndex
  for (;;) {
    if (fixedEndMs === null ? c >= totalCycles : t >= fixedEndMs) break
    const base = activePhases[i]
    let durationMs = phaseDuration(base, c, pace, rampFrom, totalCycles)
    let truncated = false
    if (fixedEndMs !== null && t + durationMs > fixedEndMs) {
      durationMs = fixedEndMs - t
      truncated = true
    }
    segments.push({ startMs: t, durationMs, phase: { ...base, durationMs }, cycleIndex: c, phaseIndex: i, truncated })
    t += durationMs
    if (++i === activePhases.length) {
      i = 0
      c++
    }
  }
  return segments
}

function finish(base: Omit<SessionPlan, 'segments' | 'cycleStartsMs' | 'totalDurationMs'>, segments: PlanSegment[]): SessionPlan {
  const cycleStartsMs: number[] = []
  for (const s of segments) if (s.phaseIndex === 0) cycleStartsMs[s.cycleIndex] = s.startMs
  const last = segments[segments.length - 1]
  return { ...base, segments, cycleStartsMs, totalDurationMs: last.startMs + last.durationMs }
}

export function resolvePlan(pattern: BreathingPattern, length: SessionLength, pace: Pace = defaultPace): SessionPlan {
  validatePattern(pattern)
  validatePace(pace)
  const activePhases = pattern.phases.filter((p) => p.durationMs > 0)

  let totalCycles: number
  let fixedEndMs: number | null = null
  if (length.kind === 'cycles') {
    if (!Number.isInteger(length.count) || length.count < 1) throw new Error('Cycle count must be a positive integer')
    totalCycles = length.count
  } else {
    if (!Number.isFinite(length.durationMs) || length.durationMs <= 0) throw new Error('Session duration must be positive')
    if (length.alignToCycles === false) {
      fixedEndMs = length.durationMs
      totalCycles = length.durationMs / (cycleDuration(pattern) * pace.scale)
    } else {
      totalCycles = cyclesForDuration(activePhases, length.durationMs, pace)
    }
  }

  const base = { pattern, length, activePhases, totalCycles, pace, rampFrom: 0, fixedEndMs }
  return finish(base, layout(activePhases, [], 0, 0, totalCycles, fixedEndMs, pace, 0))
}

function segmentIndexAt(plan: SessionPlan, ms: number): number {
  const { segments } = plan
  let lo = 0
  let hi = segments.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (segments[mid].startMs <= ms) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * Change the pace from the next phase on. Everything up to and including the
 * phase in progress at `atMs` stays as it was, so a running breath is never
 * cut short or stretched. Turning slow-down on mid-session starts its curve
 * from the next breath. A session of a chosen duration keeps that duration by
 * changing how many breaths are left; a session of a set number of breaths
 * keeps its count.
 */
export function replan(plan: SessionPlan, atMs: number, pace: Pace): SessionPlan {
  validatePace(pace)
  const at = Math.min(Math.max(atMs, 0), plan.totalDurationMs)
  const current = plan.segments[segmentIndexAt(plan, at)]
  const kept = plan.segments.slice(0, plan.segments.indexOf(current) + 1)
  const rampFrom = pace.slowDown && !plan.pace.slowDown ? current.cycleIndex + 1 : plan.rampFrom
  let c = current.cycleIndex
  let i = current.phaseIndex + 1
  if (i === plan.activePhases.length) {
    i = 0
    c++
  }
  const relayout = (totalCycles: number) =>
    finish({ ...plan, pace, rampFrom, totalCycles }, layout(plan.activePhases, kept, c, i, totalCycles, plan.fixedEndMs, pace, rampFrom))

  // A session of a chosen length keeps that length: re-fit the number of
  // breaths still to come. Exact cycle counts keep their count instead.
  const { length } = plan
  if (length.kind !== 'duration' || length.alignToCycles === false) return relayout(plan.totalCycles)
  let best = relayout(current.cycleIndex + 1)
  for (let n = current.cycleIndex + 2; n < 10_000; n++) {
    const candidate = relayout(n)
    if (Math.abs(candidate.totalDurationMs - length.durationMs) < Math.abs(best.totalDurationMs - length.durationMs)) best = candidate
    if (candidate.totalDurationMs > length.durationMs) break
  }
  return best
}

export function positionAt(plan: SessionPlan, elapsedMs: number): SessionPosition {
  const { segments, totalDurationMs } = plan
  const elapsed = Math.min(Math.max(elapsedMs, 0), totalDurationMs)
  const done = elapsed >= totalDurationMs

  // At the very end, report the final moment of the last phase rather than
  // the first moment of a cycle that will never run.
  const lookup = done ? Math.max(0, totalDurationMs - 1e-6) : elapsed
  const seg = segments[segmentIndexAt(plan, lookup)]
  const phaseElapsedMs = done ? seg.durationMs : lookup - seg.startMs
  const lastPhase = seg.phaseIndex === plan.activePhases.length - 1
  const completedCycles = seg.cycleIndex + (done && lastPhase && !seg.truncated ? 1 : 0)

  const cycleStart = plan.cycleStartsMs[seg.cycleIndex]
  const cycleEnd = plan.cycleStartsMs[seg.cycleIndex + 1] ?? totalDurationMs

  return {
    elapsedMs: elapsed,
    remainingMs: totalDurationMs - elapsed,
    progress: totalDurationMs === 0 ? 1 : elapsed / totalDurationMs,
    cycleIndex: seg.cycleIndex,
    completedCycles,
    cycleProgress: done ? 1 : (elapsed - cycleStart) / (cycleEnd - cycleStart),
    phaseIndex: seg.phaseIndex,
    phase: seg.phase,
    phaseElapsedMs,
    phaseRemainingMs: seg.durationMs - phaseElapsedMs,
    phaseProgress: phaseElapsedMs / seg.durationMs,
    done,
  }
}

/**
 * Every phase start within [fromMs, toMs). Used to schedule audio cues ahead of
 * time so they stay precise even when the page is throttled in the background.
 */
export function transitionsBetween(plan: SessionPlan, fromMs: number, toMs: number): PhaseTransition[] {
  const end = Math.min(toMs, plan.totalDurationMs)
  return plan.segments
    .filter((s) => s.startMs >= fromMs && s.startMs < end)
    .map((s) => ({ atMs: s.startMs, phase: s.phase, cycleIndex: s.cycleIndex }))
}
