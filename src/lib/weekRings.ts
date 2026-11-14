import type { SessionRecord } from '../storage/types'

/**
 * The week as breath rings: every session is a ring, Monday innermost, Sunday outermost. A longer session
 * is a wider ring; a day without one is a fine dashed ring, so the week keeps its shape and a gap is
 * simply a gap, not a broken streak.
 */
export interface WeekRing {
  /** Radius of the ring's centre line. */
  r: number
  /** Stroke width; 1 for the dashed ring of an empty day. */
  width: number
  /** 0 = Monday .. 6 = Sunday. */
  day: number
  /** Position 0..1 among the week's rings, for the colour from lavender to sky. */
  t: number
  /** No session that day. */
  empty: boolean
  session?: SessionRecord
}

/** Monday 00:00 (local time) of the week `date` lies in. */
export function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** The sessions of the week starting at `start`, by weekday (0 = Monday), each day in the order they were done. */
export function sessionsByDay(sessions: SessionRecord[], start: Date): SessionRecord[][] {
  const end = addDays(start, 7).getTime()
  const days: SessionRecord[][] = Array.from({ length: 7 }, () => [])
  for (const s of sessions) {
    const at = new Date(s.completedAt)
    const ms = at.getTime()
    if (ms < start.getTime() || ms >= end) continue
    days[(at.getDay() + 6) % 7].push(s)
  }
  for (const d of days) d.sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  return days
}

/** Ring width by session length: about 2, 5 and 10 minutes. */
export function ringWidth(durationMs: number): number {
  const minutes = durationMs / 60_000
  return minutes <= 3 ? 1.5 : minutes <= 7 ? 3.5 : 6.5
}

const INNER = 34
/** Room outside each session's ring for the small line of text that follows it. */
const GAP = 9
const DAY_GAP = 2
const EMPTY_STEP = 6

/**
 * Lays the week out from the inside: returns the rings and the outer radius they reach, so the drawing
 * can be scaled to fit however many sessions there were. `upToDay` leaves out days still to come.
 */
export function weekRings(days: SessionRecord[][], upToDay = 6): { rings: WeekRing[]; outer: number } {
  const shown = days.slice(0, upToDay + 1)
  const total = shown.reduce((n, d) => n + Math.max(1, d.length), 0)
  const rings: WeekRing[] = []
  let r = INNER
  let k = 0
  // A session's ring has its line of text just outside it, so whatever comes next keeps clear of that.
  let afterSession = false
  shown.forEach((sessions, day) => {
    const t = () => (total > 1 ? k / (total - 1) : 0)
    if (!sessions.length) {
      r += afterSession ? GAP - DAY_GAP : EMPTY_STEP
      afterSession = false
      rings.push({ r, width: 1, day, t: t(), empty: true })
      r += EMPTY_STEP
      k++
      return
    }
    for (const session of sessions) {
      const width = ringWidth(session.durationMs)
      r += width / 2 + GAP
      rings.push({ r, width, day, t: t(), empty: false, session })
      r += width / 2
      k++
    }
    afterSession = true
    r += DAY_GAP
  })
  return { rings, outer: r }
}
