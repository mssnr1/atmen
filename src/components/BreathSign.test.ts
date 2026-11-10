import { describe, expect, it } from 'vitest'
import { lineOpacity, signGeometry } from './BreathSign'

describe('breath sign', () => {
  it('lights its lines from below as the breath comes in', () => {
    const n = 7
    const at = (level: number) => Array.from({ length: n }, (_, i) => lineOpacity(level, i, n))
    expect(at(0).every((o) => o === 0.14)).toBe(true)
    expect(at(1).every((o) => o === 1)).toBe(true)
    const half = at(0.5)
    for (let i = 1; i < n; i++) expect(half[i]).toBeLessThanOrEqual(half[i - 1])
    expect(half[0]).toBe(1)
    expect(half[n - 1]).toBe(0.14)
  })

  it('keeps every line inside the outline, for the oval and the ring', () => {
    for (const shape of ['oval', 'ring'] as const) {
      for (const n of [2, 4, 7, 11]) {
        const g = signGeometry(n, shape)
        expect(g.lines).toHaveLength(n)
        // Bottom line first.
        expect(g.lines[0].y).toBeGreaterThan(g.lines[n - 1].y)
        for (const l of g.lines) {
          expect(l.half).toBeGreaterThan(0)
          expect(l.half).toBeLessThan(40)
          expect(l.y).toBeGreaterThan(8)
          expect(l.y).toBeLessThan(92)
        }
      }
    }
  })
})
