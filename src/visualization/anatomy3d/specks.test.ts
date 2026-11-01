import { describe, expect, it } from 'vitest'
import type { BreathState } from '../breathState'
import { makeSpecks, speckState } from './BreathSpecks'
import { routes, type V3 } from './airflow3d'

const state = (phase: BreathState['phase'], phaseProgress: number): BreathState => ({ phase, phaseProgress, volume: phaseProgress, direction: 1, flow: 1, elapsedS: 0 })

describe('breath specks', () => {
  const specks = makeSpecks()
  const out = { p: [0, 0, 0] as V3, a: 0 }
  const at = (phase: BreathState['phase'], p: number) =>
    specks.map((s) => {
      speckState(s, state(phase, p), 0, out)
      return { p: [...out.p] as V3, a: out.a }
    })
  it('show nothing while the lungs are empty', () => {
    for (const phase of ['idle', 'holdOut'] as const) expect(at(phase, 0.5).every((x) => x.a === 0)).toBe(true)
    expect(at('inhale', 0).every((x) => x.a === 0)).toBe(true)
    expect(at('exhale', 1).every((x) => x.a === 0)).toBe(true)
  })
  it('rest in the lungs between breathing in and breathing out', () => {
    const end = at('inhale', 1)
    const hold = at('holdIn', 0.5)
    const start = at('exhale', 0)
    for (let i = 0; i < specks.length; i++) {
      expect(end[i].a).toBeCloseTo(hold[i].a)
      expect(start[i].a).toBeCloseTo(hold[i].a)
      for (let d = 0; d < 3; d++) expect(Math.abs(end[i].p[d] - specks[i].target[d])).toBeLessThan(0.005)
      expect(start[i].p[1]).toBeCloseTo(specks[i].target[1], 2)
    }
  })
  it('leave through the nose while breathing out', () => {
    const nose = routes[0].points[0]
    const late = at('exhale', 0.9).filter((x) => x.a > 0)
    expect(late.length).toBeGreaterThan(0)
    // Late in the exhale the visible specks are outside, in front of the face.
    expect(late.every((x) => x.p[2] >= nose[2] - 1e-6)).toBe(true)
  })
})
