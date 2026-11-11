import { describe, expect, it } from 'vitest'
import type { SessionRecord } from '../storage/types'
import { addDays, ringWidth, sessionsByDay, weekRings, weekStart } from './weekRings'

let n = 0
function session(when: Date, minutes = 5): SessionRecord {
  return { id: `s${n++}`, exerciseId: 'relax', startedAt: when.toISOString(), completedAt: when.toISOString(), durationMs: minutes * 60_000, cycles: 10 }
}

// Tuesday, 10 November 2026.
const tuesday = new Date(2026, 10, 10, 15, 0)
const monday = weekStart(tuesday)

describe('weekStart', () => {
  it('is the Monday of the week at midnight, also for a Sunday', () => {
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate(), monday.getHours()]).toEqual([2026, 10, 9, 0])
    expect(weekStart(new Date(2026, 10, 15, 23, 59)).getTime()).toBe(monday.getTime())
    expect(weekStart(new Date(2026, 10, 16, 0, 0)).getTime()).toBe(addDays(monday, 7).getTime())
  })
})

describe('sessionsByDay', () => {
  it('sorts the week’s sessions into weekdays, Monday first, and leaves other weeks out', () => {
    const sessions = [
      session(new Date(2026, 10, 8, 20)), // Sunday before
      session(new Date(2026, 10, 10, 21)),
      session(new Date(2026, 10, 9, 8)),
      session(new Date(2026, 10, 10, 7)),
      session(new Date(2026, 10, 15, 23, 30)),
      session(new Date(2026, 10, 16, 0, 30)), // Monday after
    ]
    const days = sessionsByDay(sessions, monday)
    expect(days.map((d) => d.length)).toEqual([1, 2, 0, 0, 0, 0, 1])
    // Within a day in the order they were done.
    expect(new Date(days[1][0].completedAt).getHours()).toBe(7)
  })
})

describe('weekRings', () => {
  it('draws a longer session as a wider ring', () => {
    expect(ringWidth(2 * 60_000)).toBeLessThan(ringWidth(5 * 60_000))
    expect(ringWidth(5 * 60_000)).toBeLessThan(ringWidth(10 * 60_000))
  })

  it('grows from the inside out, one ring per session and a dashed one per empty day', () => {
    const days = sessionsByDay([session(new Date(2026, 10, 9, 8), 2), session(new Date(2026, 10, 11, 8), 5), session(new Date(2026, 10, 11, 21), 10)], monday)
    const { rings, outer } = weekRings(days)
    // Mon 1, Tue empty, Wed 2, Thu to Sun empty.
    expect(rings.map((r) => r.day)).toEqual([0, 1, 2, 2, 3, 4, 5, 6])
    expect(rings.map((r) => r.empty)).toEqual([false, true, false, false, true, true, true, true])
    for (let i = 1; i < rings.length; i++) {
      // No ring touches the one inside it.
      expect(rings[i].r - rings[i].width / 2).toBeGreaterThan(rings[i - 1].r + rings[i - 1].width / 2)
    }
    expect(outer).toBeGreaterThan(rings[rings.length - 1].r)
    expect(rings[0].t).toBe(0)
    expect(rings[rings.length - 1].t).toBe(1)
  })

  it('leaves out the days still to come', () => {
    const days = sessionsByDay([session(new Date(2026, 10, 9, 8))], monday)
    expect(weekRings(days, 1).rings.map((r) => r.day)).toEqual([0, 1])
    expect(weekRings(days, 1).outer).toBeLessThan(weekRings(days).outer)
  })

  it('still has a shape in a week without any session', () => {
    const { rings } = weekRings(sessionsByDay([], monday))
    expect(rings).toHaveLength(7)
    expect(rings.every((r) => r.empty)).toBe(true)
  })
})
