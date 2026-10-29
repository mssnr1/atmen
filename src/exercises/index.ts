import { resonanceBreathing } from './resonance'
import type { Exercise } from './types'

export type { Exercise } from './types'

/** All available techniques. Add new exercise configs here. */
export const exercises: Exercise[] = [resonanceBreathing]

export const featuredExercise = resonanceBreathing

export function getExercise(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id)
}
