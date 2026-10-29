import { describe, expect, it } from 'vitest'
import { segmentFills } from './segments'

const at = (type: 'inhale' | 'exhale', phaseProgress: number) =>
  segmentFills({ status: 'running', phase: { type, durationMs: 5500 }, phaseProgress })
const filled = (f: { from: number; to: number }[]) => f.map((s) => +(s.to - s.from).toFixed(3))

describe('breath indicator', () => {
  it('starts an inhale empty and ends it full', () => {
    expect(filled(at('inhale', 0))).toEqual([0])
    expect(filled(at('inhale', 1))).toEqual([1])
  })

  it('fills from the left while breathing in', () => {
    expect(at('inhale', 0.4)).toEqual([{ from: 0, to: 0.4 }])
  })

  it('empties from the left while breathing out, the blue moving right', () => {
    expect(filled(at('exhale', 0))).toEqual([1])
    expect(at('exhale', 0.25)).toEqual([{ from: 0.25, to: 1 }])
    expect(filled(at('exhale', 1))).toEqual([0])
  })

  it('shows nothing before a session starts', () => {
    expect(filled(segmentFills({ status: 'idle', phase: { type: 'inhale', durationMs: 5500 }, phaseProgress: 0.5 }))).toEqual([0])
  })
})
