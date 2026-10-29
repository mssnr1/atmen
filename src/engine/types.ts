/** Kinds of phases a breathing pattern can be made of. */
export type PhaseType = 'inhale' | 'holdIn' | 'exhale' | 'holdOut'

export interface BreathPhase {
  type: PhaseType
  /** Phase length in milliseconds. Phases with 0 ms are skipped. */
  durationMs: number
  /** Optional label override, e.g. "Sip in" for a double inhale. */
  label?: string
  /**
   * A short rest that is not announced: no tone or vibration, and the guide
   * keeps showing the phase before it. Used for the pause at the top of a breath.
   */
  quiet?: boolean
}

/** One breathing cycle, repeated for the whole session. */
export interface BreathingPattern {
  phases: BreathPhase[]
}

/**
 * How long a session lasts.
 * - `duration`: run for a length of time. With `alignToCycles` (default) the
 *   length is rounded to the nearest whole number of cycles so the session
 *   never ends mid-breath.
 * - `cycles`: run for an exact number of cycles.
 */
export type SessionLength =
  | { kind: 'duration'; durationMs: number; alignToCycles?: boolean }
  | { kind: 'cycles'; count: number }

/**
 * How fast the pattern is breathed.
 * - `scale` multiplies every phase duration (1 = as configured, 1.5 = slower).
 * - `slowDown` stretches each breath a little more than the last, easing to
 *   noticeably slower breaths at the end of the session.
 */
export interface Pace {
  scale: number
  slowDown: boolean
}

/** One phase laid out on the session timeline. */
export interface PlanSegment {
  startMs: number
  durationMs: number
  /** The phase with its actual duration at this point of the session. */
  phase: BreathPhase
  cycleIndex: number
  /** Index into `plan.activePhases`. */
  phaseIndex: number
  /** Cut short by the end of an exact-duration session. */
  truncated: boolean
}

/** A pattern plus a length and pace, resolved into a concrete timeline. */
export interface SessionPlan {
  pattern: BreathingPattern
  length: SessionLength
  /** Phases with a duration > 0, in order, at their configured durations. */
  activePhases: BreathPhase[]
  /** Number of cycles the session contains (may be fractional for exact durations). */
  totalCycles: number
  pace: Pace
  /** Cycle at which the slow-down curve starts. */
  rampFrom: number
  /** End time of an exact-duration session, otherwise null. */
  fixedEndMs: number | null
  segments: PlanSegment[]
  cycleStartsMs: number[]
  totalDurationMs: number
}

/** Where in a session a given elapsed time falls. */
export interface SessionPosition {
  elapsedMs: number
  remainingMs: number
  /** 0..1 over the whole session. */
  progress: number
  /** 0-based index of the cycle in progress. */
  cycleIndex: number
  completedCycles: number
  /** 0..1 within the current cycle. */
  cycleProgress: number
  /** Index into `plan.activePhases`. */
  phaseIndex: number
  /** The current phase, with its actual duration at the current pace. */
  phase: BreathPhase
  phaseElapsedMs: number
  phaseRemainingMs: number
  /** 0..1 within the current phase. */
  phaseProgress: number
  done: boolean
}

export type EngineStatus = 'idle' | 'running' | 'paused' | 'completed'

export interface EngineSnapshot extends SessionPosition {
  status: EngineStatus
  plan: SessionPlan
}

export interface SessionSummary {
  startedAt: Date
  completedAt: Date
  /** Time spent breathing, excluding pauses. */
  durationMs: number
  completedCycles: number
}

/** A phase boundary at a given point of the session timeline. */
export interface PhaseTransition {
  atMs: number
  phase: BreathPhase
  cycleIndex: number
}

export type EngineEvent =
  | { type: 'tick'; snapshot: EngineSnapshot }
  | { type: 'phase'; snapshot: EngineSnapshot }
  | { type: 'status'; snapshot: EngineSnapshot }
  /** The timeline changed (pace), so scheduled cues need re-aligning. */
  | { type: 'plan'; snapshot: EngineSnapshot }
  | { type: 'complete'; snapshot: EngineSnapshot; summary: SessionSummary }
