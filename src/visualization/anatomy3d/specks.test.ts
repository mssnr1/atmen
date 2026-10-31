import { describe, expect, it } from 'vitest'
import type { BreathState } from '../breathState'
import { makeSpecks, speckState } from './BreathSpecks'
import type { V3 } from './airflow3d'

const state = (phase: BreathState['phase'], phaseProgress: number): BreathState => ({ phase, phaseProgress, volume: phaseProgress, direction: 1, flow: 1, elapsedS: 0 })

describe('breath specks', () => {
  const specks = makeSpecks()
  const out = { p: [0, 0, 0] as V3, a: 0 }
  it('only show while breathing in', () => {
    for (const phase of ['idle', 'holdIn', 'exhale', 'holdOut'] as const) {
      expect(specks.every((s) => speckState(s, state(phase, 0.5), 0, out).a === 0)).toBe(true)
    }
    expect(specks.some((s) => speckState(s, state('inhale', 0.5), 0, out).a > 0)).toBe(true)
  })
  it('have all arrived by the end of the inhale', () => {
    expect(specks.every((s) => speckState(s, state('inhale', 1), 0, out).a === 0)).toBe(true)
  })
})
