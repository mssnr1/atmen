import type { BreathState } from '../breathState'
import { NOSTRILS, OUTSIDE_IN, OUTSIDE_OUT, type Vec2 } from './model'

/**
 * Where the air is, as a function of breath state. The values drive the
 * volumetric shader; they contain no rendering code.
 *
 * Inhale: an outside cloud is drawn toward the nostrils and shrinks while a
 * front travels from the nose to the lungs; behind the front the airway
 * carries air in proportion to flow; the lungs fill outward from the hilum.
 * Exhale mirrors this: the lungs empty toward the hilum, a front rises from
 * the lungs to the nose, and the air leaves as a cloud that drifts and fades.
 */
export interface AirflowState {
  /** Lung fill, 0..1. */
  fill: number
  /** Airway path position of the moving front (0 nostrils, 1 lungs). */
  front: number
  /** +1 airway is filled behind the front (inhale), -1 ahead of it (exhale). */
  direction: 1 | -1 | 0
  /** Airway density, follows flow rate. */
  airway: number
  /** Outside cloud. */
  cloud: { at: Vec2; radius: number; density: number }
  /** Seconds of breathing, used to advect internal motion with the flow. */
  time: number
}

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const mixV = (a: Vec2, b: Vec2, t: number): Vec2 => [mix(a[0], b[0], t), mix(a[1], b[1], t)]

/** The airway front reaches the lungs after this share of the phase. */
const FRONT_SHARE = 0.4

export function airflowState(b: BreathState): AirflowState {
  const p = b.phaseProgress
  const airway = Math.pow(b.flow, 0.7)
  if (b.direction === 1) {
    const approach = smoothstep(0, 0.7, p)
    return {
      fill: b.volume,
      front: clamp01(p / FRONT_SHARE),
      direction: 1,
      airway,
      cloud: {
        at: mixV(OUTSIDE_IN, NOSTRILS, approach),
        radius: mix(15, 3, approach),
        density: smoothstep(0, 0.12, p) * (1 - smoothstep(0.45, 0.8, p)),
      },
      time: b.elapsedS,
    }
  }
  if (b.direction === -1) {
    const drift = smoothstep(0.12, 1, p)
    return {
      fill: b.volume,
      front: 1 - clamp01(p / FRONT_SHARE),
      direction: -1,
      airway,
      cloud: {
        at: mixV(NOSTRILS, OUTSIDE_OUT, drift),
        radius: mix(3, 24, drift),
        density: smoothstep(0.1, 0.3, p) * (1 - smoothstep(0.55, 1, p)),
      },
      time: b.elapsedS,
    }
  }
  return { fill: b.volume, front: 0, direction: 0, airway: 0, cloud: { at: NOSTRILS, radius: 3, density: 0 }, time: b.elapsedS }
}
