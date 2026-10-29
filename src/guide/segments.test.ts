import { describe, expect, it } from 'vitest'
import { segmentFills } from './segments'

const at = (type: 'inhale' | 'exhale', phaseProgress: number) =>
  segmentFills({ status: 'running', phase: { type, durationMs: 5500 }, phaseProgress })
const filled = (f: { from: number; to: number }[]) => f.map((s) => +(s.to - s.from).toFixed(3))

describe('four-segment indicator', () => {
  it('starts an inhale empty and ends it full', () => {
    expect(filled(at('inhale', 0))).toEqual([0, 0, 0, 0])
    expect(filled(at('inhale', 1))).toEqual([1, 1, 1, 1])
  })

  it('fills left to right with partial fills while breathing in', () => {
    expect(filled(at('inhale', 0.125))).toEqual([0.5, 0, 0, 0])
    expect(filled(at('inhale', 0.6))).toEqual([1, 1, 0.4, 0])
  })

  it('empties from the left while breathing out, the blue moving right', () => {
    expect(filled(at('exhale', 0))).toEqual([1, 1, 1, 1])
    const mid = at('exhale', 0.375)
    expect(filled(mid)).toEqual([0, 0.5, 1, 1])
    expect(mid[1]).toEqual({ from: 0.5, to: 1 })
    expect(filled(at('exhale', 1))).toEqual([0, 0, 0, 0])
  })

  it('shows nothing before a session starts', () => {
    expect(filled(segmentFills({ status: 'idle', phase: { type: 'inhale', durationMs: 5500 }, phaseProgress: 0.5 }))).toEqual([0, 0, 0, 0])
  })
})
