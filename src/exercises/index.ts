import { energyBreathing } from './energy'
import { relaxBreathing } from './relax'
import { resonanceBreathing } from './resonance'
import type { Exercise } from './types'

export type { Exercise, PaceOption } from './types'

/** All available techniques, in the order they are offered. Add new exercise configs here. */
export const exercises: Exercise[] = [resonanceBreathing, energyBreathing, relaxBreathing]

export function getExercise(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id)
}

/** The exercise to suggest after `id`: the next one in the list, wrapping around. */
export function nextExercise(id: string): Exercise {
  const i = exercises.findIndex((e) => e.id === id)
  return exercises[(i + 1) % exercises.length]
}

/** The phase durations at a pace, e.g. [4000, 6000]. */
export function phaseDurations(exercise: Exercise, scale: number): { type: string; ms: number }[] {
  return exercise.pattern.phases.filter((p) => p.durationMs > 0).map((p) => ({ type: p.type, ms: p.durationMs * scale }))
}
