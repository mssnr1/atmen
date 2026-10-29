import type { EngineSnapshot, PhaseType } from '../engine'

/**
 * The breathing state every visualization draws from, derived from one engine
 * snapshot. Because all modes read the same function of the same clock, they
 * always agree on where in the breath the user is.
 */
export interface BreathState {
  /** Lung volume above resting level: 0 = fully exhaled, 1 = fully inhaled. */
  volume: number
  /** +1 while air flows in, -1 while it flows out, 0 during holds or idle. */
  direction: 1 | -1 | 0
  /** Airflow rate, 0..1. Exactly the normalized rate of change of `volume`. */
  flow: number
  /** Progress through the current phase, 0..1. */
  phaseProgress: number
  phase: PhaseType | 'idle'
  /** Seconds of breathing so far. Freezes while paused. */
  elapsedS: number
}

/**
 * Fresh air is blue; once the lungs are full it is used air, violet, until it
 * has been breathed out. The breath bar and the 3D air share this, so they
 * change colour together.
 */
export const usedAir = (phase: PhaseType | 'idle'): 0 | 1 => (phase === 'exhale' || phase === 'holdIn' ? 1 : 0)

/** Breathing feels sinusoidal: slow at the turns, fastest mid-breath. */
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)

export function breathState(s: EngineSnapshot): BreathState {
  const elapsedS = s.elapsedMs / 1000
  if (s.status === 'idle') return { volume: 0, direction: 0, flow: 0, phaseProgress: 0, phase: 'idle', elapsedS }
  const p = clamp01(s.phaseProgress)
  // d/dt of easeInOutSine is proportional to sin(pi t): flow peaks mid-phase and is 0 at the turns.
  const flow = Math.sin(Math.PI * p)
  switch (s.phase.type) {
    case 'inhale':
      return { volume: easeInOutSine(p), direction: 1, flow, phaseProgress: p, phase: 'inhale', elapsedS }
    case 'exhale':
      return { volume: 1 - easeInOutSine(p), direction: -1, flow, phaseProgress: p, phase: 'exhale', elapsedS }
    case 'holdIn':
      return { volume: 1, direction: 0, flow: 0, phaseProgress: p, phase: 'holdIn', elapsedS }
    case 'holdOut':
      return { volume: 0, direction: 0, flow: 0, phaseProgress: p, phase: 'holdOut', elapsedS }
  }
}
