import type { Exercise } from '../exercises'
import type { Language, Messages } from '../i18n'
import { formatSeconds } from './format'

/** In and out durations of an exercise at a pace scale, in ms. */
function inOut(exercise: Exercise, scale: number): [number, number] {
  const phases = exercise.pattern.phases
  const inhale = phases.find((p) => p.type === 'inhale')?.durationMs ?? 0
  const exhale = phases.find((p) => p.type === 'exhale')?.durationMs ?? 0
  return [inhale * scale, exhale * scale]
}

/** "5,5 s ein · 5,5 s aus · Nase" */
export function rhythmText(exercise: Exercise, scale: number, lang: Language, t: Messages): string {
  const [i, o] = inOut(exercise, scale)
  return `${t.rhythm(formatSeconds(i, lang), formatSeconds(o, lang))} · ${t.nose}`
}

/** "5,5 / 5,5" */
export function paceText(exercise: Exercise, scale: number, lang: Language): string {
  const [i, o] = inOut(exercise, scale)
  return `${formatSeconds(i, lang)} / ${formatSeconds(o, lang)}`
}

/** The pace preset the user picked for an exercise, falling back to its default. */
export function presetIndex(exercise: Exercise, stored: number | undefined): number {
  const n = exercise.paces.options.length
  return stored !== undefined && stored >= 0 && stored < n ? stored : exercise.paces.defaultIndex
}
