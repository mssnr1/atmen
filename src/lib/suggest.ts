import type { SessionRecord } from '../storage/types'

/**
 * Which exercise to offer: by the user's own answers before and after earlier sessions where there are
 * enough of them, else by the time of day. Nothing here is measured, and nothing is promised: it only
 * puts first what tends to fit.
 */
export type DayPart = 'morning' | 'day' | 'evening' | 'night'

export function dayPart(date: Date): DayPart {
  const h = date.getHours()
  if (h >= 5 && h < 11) return 'morning'
  if (h >= 11 && h < 17) return 'day'
  if (h >= 17 && h < 22) return 'evening'
  return 'night'
}

/** Exercise ids in the order they tend to fit a time of day: waking up in the morning, winding down at night. */
const BY_TIME: Record<DayPart, string[]> = {
  morning: ['energy', 'resonance', 'relax'],
  day: ['resonance', 'energy', 'relax'],
  evening: ['relax', 'resonance', 'energy'],
  night: ['relax', 'resonance', 'energy'],
}

/** A session counts as rated once it has an answer before and after it. */
const rated = (s: SessionRecord) => typeof s.feedback?.before === 'number' && typeof s.feedback?.after === 'number'

/** Sessions with both answers needed before an exercise's average is shown or used. */
export const MIN_RATED = 3

export interface Helps {
  exerciseId: string
  /** Rated sessions the average is taken over. */
  sessions: number
  /** Mean of (after - before) on the 1..5 mood scale: above 0 means calmer afterwards. */
  change: number
}

/** The user's own average change per exercise, best first; only exercises with at least `MIN_RATED` rated sessions. */
export function whatHelps(sessions: SessionRecord[], part?: DayPart): Helps[] {
  const byExercise = new Map<string, { n: number; sum: number }>()
  for (const s of sessions) {
    if (!rated(s)) continue
    if (part && dayPart(new Date(s.completedAt)) !== part) continue
    const e = byExercise.get(s.exerciseId) ?? { n: 0, sum: 0 }
    e.n++
    e.sum += s.feedback!.after! - s.feedback!.before!
    byExercise.set(s.exerciseId, e)
  }
  return [...byExercise]
    .filter(([, e]) => e.n >= MIN_RATED)
    .map(([exerciseId, e]) => ({ exerciseId, sessions: e.n, change: e.sum / e.n }))
    .sort((a, b) => b.change - a.change)
}

export interface Suggestion {
  exerciseId: string
  reason: 'experience' | 'time'
}

/**
 * The exercise that fits now. `available` are the ids on offer; `exclude` leaves one out (the exercise
 * just finished). Own experience at this time of day wins when it is clearly positive.
 */
export function suggest(sessions: SessionRecord[], now: Date, available: string[], exclude?: string): Suggestion {
  const ids = available.filter((id) => id !== exclude)
  const part = dayPart(now)
  const own = whatHelps(sessions, part).find((h) => h.change > 0.25 && ids.includes(h.exerciseId))
  if (own) return { exerciseId: own.exerciseId, reason: 'experience' }
  const byTime = BY_TIME[part].find((id) => ids.includes(id))
  return { exerciseId: byTime ?? ids[0] ?? available[0], reason: 'time' }
}

/** The exercise of the most recent session, if it is still on offer. */
export function lastExercise(sessions: SessionRecord[], available: string[]): string | undefined {
  for (let i = sessions.length - 1; i >= 0; i--) if (available.includes(sessions[i].exerciseId)) return sessions[i].exerciseId
  return undefined
}
