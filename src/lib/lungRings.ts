import { inverseBreathCurve } from './breathClock'

/** The lungs are drawn as horizontal rings, this many per metre of height. */
export const RING_DENSITY = 85

/** How far up the lungs the breath's light stands when they are empty, and how much further a full breath takes it (fractions of their height). */
const FILL_AT_REST = 0.04
const FILL_SPAN = 0.98

/**
 * The lungs' height in the figure, in metres: `fill` is the stretch the breath's light travels (the lungs
 * with all the room they take when full), `drawn` the stretch that carries rings (the lungs as they are
 * modelled). These are the model's figures; the 3D view writes them here again when it has loaded the
 * model, so the picture and the sound always count the same rings.
 */
let fill: readonly [number, number] = [1.1424, 1.4391]
let drawn: readonly [number, number] = [1.167, 1.431]

export function setLungRange(lo: number, hi: number, drawnLo = lo, drawnHi = hi): void {
  if (!(hi > lo)) return
  fill = [lo, hi]
  drawn = drawnHi > drawnLo ? [drawnLo, drawnHi] : fill
}

/** The height the breath's light has reached in the lungs at `volume` (0 = breathed out, 1 = full). */
export function lungLevel(volume: number): number {
  const [lo, hi] = fill
  return lo + (hi - lo) * (FILL_AT_REST + FILL_SPAN * volume)
}

export interface RingMoment {
  /** How far through the phase, 0..1. */
  at: number
  /** The ring, counted from the lowest (0). */
  ring: number
  /** How many rings the lungs have. */
  of: number
}

/**
 * The moments at which the rings change during one phase, in order of time: breathing in they light one
 * by one from the bottom up, breathing out they go dark from the top down. Rings the resting breath
 * already lights are left out.
 */
export function ringMoments(kind: 'inhale' | 'exhale'): RingMoment[] {
  const [lo, hi] = fill
  // A ring sits at every (k + 0.5) / RING_DENSITY metres of the lungs as they are drawn.
  const first = Math.ceil(drawn[0] * RING_DENSITY - 0.5)
  const last = Math.floor(drawn[1] * RING_DENSITY - 0.5)
  const of = Math.max(0, last - first + 1)
  const moments: RingMoment[] = []
  for (let k = first; k <= last; k++) {
    const height = ((k + 0.5) / RING_DENSITY - lo) / (hi - lo)
    const volume = (height - FILL_AT_REST) / FILL_SPAN
    if (volume <= 0 || volume >= 1) continue
    moments.push({ at: inverseBreathCurve(kind === 'inhale' ? volume : 1 - volume), ring: k - first, of })
  }
  return moments.sort((a, b) => a.at - b.at)
}
