import { describe, expect, it } from 'vitest'
import type { SessionRecord } from '../storage/types'
import { dayPart, lastExercise, MIN_RATED, suggest, whatHelps } from './suggest'

const IDS = ['resonance', 'energy', 'relax']
const at = (hour: number, day = 10) => new Date(2026, 10, day, hour, 30)

let n = 0
function session(exerciseId: string, when: Date, before?: number, after?: number): SessionRecord {
  return {
    id: `s${n++}`,
    exerciseId,
    startedAt: new Date(when.getTime() - 300_000).toISOString(),
    completedAt: when.toISOString(),
    durationMs: 300_000,
    cycles: 27,
    feedback: before === undefined ? undefined : { before, after },
  }
}

describe('dayPart', () => {
  it('splits the day into morning, day, evening and night', () => {
    expect(dayPart(at(6))).toBe('morning')
    expect(dayPart(at(12))).toBe('day')
    expect(dayPart(at(19))).toBe('evening')
    expect(dayPart(at(23))).toBe('night')
    expect(dayPart(at(3))).toBe('night')
  })
})

describe('whatHelps', () => {
  it('needs enough sessions with an answer before and after', () => {
    const two = [session('relax', at(20, 1), 2, 4), session('relax', at(20, 2), 2, 4)]
    expect(whatHelps(two)).toEqual([])
    const unrated = [...two, session('relax', at(20, 3)), session('relax', at(20, 4), 2)]
    expect(whatHelps(unrated)).toEqual([])
    expect(whatHelps([...two, session('relax', at(20, 5), 3, 4)])).toEqual([{ exerciseId: 'relax', sessions: MIN_RATED, change: 5 / 3 }])
  })

  it('puts the exercise with the largest change first and can look at one time of day only', () => {
    const sessions = [
      ...[1, 2, 3].map((d) => session('relax', at(21, d), 2, 4)),
      ...[1, 2, 3].map((d) => session('energy', at(7, d), 3, 4)),
    ]
    expect(whatHelps(sessions).map((h) => h.exerciseId)).toEqual(['relax', 'energy'])
    expect(whatHelps(sessions, 'morning').map((h) => h.exerciseId)).toEqual(['energy'])
  })
})

describe('suggest', () => {
  it('goes by the time of day while there are no answers', () => {
    expect(suggest([], at(7), IDS)).toEqual({ exerciseId: 'energy', reason: 'time' })
    expect(suggest([], at(13), IDS)).toEqual({ exerciseId: 'resonance', reason: 'time' })
    expect(suggest([], at(21), IDS)).toEqual({ exerciseId: 'relax', reason: 'time' })
  })

  it('prefers what the user’s own answers say helps at this time of day', () => {
    const mornings = [1, 2, 3].map((d) => session('resonance', at(8, d), 2, 4))
    expect(suggest(mornings, at(7), IDS)).toEqual({ exerciseId: 'resonance', reason: 'experience' })
    // The same answers say nothing about the evening.
    expect(suggest(mornings, at(21), IDS)).toEqual({ exerciseId: 'relax', reason: 'time' })
  })

  it('ignores an exercise that made no clear difference', () => {
    const flat = [1, 2, 3].map((d) => session('resonance', at(8, d), 3, 3))
    expect(suggest(flat, at(7), IDS)).toEqual({ exerciseId: 'energy', reason: 'time' })
  })

  it('leaves out the exercise just finished', () => {
    expect(suggest([], at(21), IDS, 'relax')).toEqual({ exerciseId: 'resonance', reason: 'time' })
    const evenings = [1, 2, 3].map((d) => session('relax', at(20, d), 2, 5))
    expect(suggest(evenings, at(21), IDS, 'relax').exerciseId).not.toBe('relax')
  })
})

describe('lastExercise', () => {
  it('is the most recent exercise that is still on offer', () => {
    expect(lastExercise([], IDS)).toBeUndefined()
    expect(lastExercise([session('relax', at(8, 1)), session('energy', at(8, 2))], IDS)).toBe('energy')
    expect(lastExercise([session('relax', at(8, 1)), session('gone', at(8, 2))], IDS)).toBe('relax')
  })
})
