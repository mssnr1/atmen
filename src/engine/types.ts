/** Kinds of phases a breathing pattern can be made of. */
export type PhaseType = 'inhale' | 'holdIn' | 'exhale' | 'holdOut'

export interface BreathPhase {
  type: PhaseType
  /** Phase length in milliseconds. Phases with 0 ms are skipped. */
  durationMs: number
  /** Optional label override, e.g. "Sip in" for a double inhale. */
  label?: string
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

/** A pattern plus a length, resolved into concrete numbers. */
export interface SessionPlan {
  pattern: BreathingPattern
  /** Phases with a duration > 0, in order. */
  activePhases: BreathPhase[]
  cycleDurationMs: number
  totalDurationMs: number
  /** Number of full cycles the session contains (may be fractional for exact durations). */
  totalCycles: number
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
  /** Index into `plan.activePhases`. */
  phaseIndex: number
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
  | { type: 'complete'; snapshot: EngineSnapshot; summary: SessionSummary }
