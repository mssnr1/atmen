import { describe, expect, it } from 'vitest'
import { cueAt, cues } from './cues'
import { insightsShown } from './insights'

describe('cueAt', () => {
  it('leaves the first two breaths and the last one free', () => {
    for (const total of [3, 7, 23]) {
      expect(cueAt(0, total)).toBeNull()
      expect(cueAt(1, total)).toBeNull()
      expect(cueAt(total - 1, total)).toBeNull()
    }
  })

  it('never comes on a breath that brings a body note', () => {
    for (let c = 1; c < 40; c++) {
      const note = insightsShown(c, 99) > insightsShown(c - 1, 99)
      if (note) expect(cueAt(c, 40)).toBeNull()
    }
  })

  it('starts with something to sense and turns to thoughts later', () => {
    const kinds = Array.from({ length: 21 }, (_, c) => cueAt(c, 21)?.kind).filter(Boolean)
    expect(kinds).toEqual(['sense', 'sense', 'sense', 'sense', 'sense', 'thought', 'thought', 'thought', 'thought'])
    // A short session: one to sense, one thought.
    expect([2, 4].map((c) => cueAt(c, 7))).toEqual([
      { kind: 'sense', index: 0 },
      { kind: 'thought', index: 0 },
    ])
  })

  it('never brings a line twice in a session, however long', () => {
    for (const total of [5, 11, 23, 27, 54, 120]) {
      const slots = Array.from({ length: total }, (_, c) => cueAt(c, total)).filter((s) => s !== null)
      const sense = slots.filter((s) => s.kind === 'sense').map((s) => s.index)
      const thought = slots.filter((s) => s.kind === 'thought').map((s) => s.index)
      expect(sense).toEqual(sense.map((_, i) => i))
      expect(thought).toEqual(thought.map((_, i) => i))
      expect(sense.length).toBeLessThanOrEqual(cues.de.sense.length)
      expect(thought.length).toBeLessThanOrEqual(cues.de.thought.length)
    }
    // A long session uses every line once.
    expect(Array.from({ length: 54 }, (_, c) => cueAt(c, 54)).filter(Boolean)).toHaveLength(cues.de.sense.length + cues.de.thought.length)
  })

  it('has the same number of lines in every language', () => {
    expect(cues.de.sense.length).toBe(cues.en.sense.length)
    expect(cues.de.thought.length).toBe(cues.en.thought.length)
  })
})
