import { afterEach, describe, expect, it } from 'vitest'
import { breathCurve } from './breathClock'
import { lungLevel, RING_DENSITY, ringMoments, setLungRange } from './lungRings'

// The model's figures: the stretch the light travels, and the lungs as they are drawn.
const model = [1.1424, 1.4391, 1.167, 1.431] as const
afterEach(() => setLungRange(...model))

describe('ringMoments', () => {
  it('has one moment for every ring the lungs are drawn with', () => {
    const moments = ringMoments('inhale')
    expect(moments).toHaveLength(23)
    expect(new Set(moments.map((m) => m.ring)).size).toBe(23)
    expect(moments.every((m) => m.of === 23)).toBe(true)
  })

  it('lights the rings from the bottom up, each at the moment the light stands at its height', () => {
    const moments = ringMoments('inhale')
    expect(moments.map((m) => m.ring)).toEqual([...moments.map((m) => m.ring)].sort((a, b) => a - b))
    const first = Math.ceil(model[2] * RING_DENSITY - 0.5)
    for (const m of moments) {
      expect(m.at).toBeGreaterThan(0)
      expect(m.at).toBeLessThan(1)
      expect(lungLevel(breathCurve(m.at))).toBeCloseTo((first + m.ring + 0.5) / RING_DENSITY, 6)
    }
  })

  it('lets them go dark from the top down, as the mirror of breathing in', () => {
    const inhale = ringMoments('inhale')
    const exhale = ringMoments('exhale')
    expect(exhale.map((m) => m.ring)).toEqual(inhale.map((m) => m.ring).reverse())
    for (const m of exhale) {
      const lit = inhale.find((i) => i.ring === m.ring)
      expect(lit && breathCurve(lit.at) + breathCurve(m.at)).toBeCloseTo(1, 6)
    }
  })

  it('follows the lungs it is told about', () => {
    // Half as tall: about half as many rings.
    setLungRange(1.2, 1.35)
    const moments = ringMoments('inhale')
    expect(moments.length).toBeGreaterThanOrEqual(11)
    expect(moments.length).toBeLessThanOrEqual(13)
  })

  it('keeps what it had when told nonsense', () => {
    setLungRange(2, 1)
    expect(ringMoments('inhale')).toHaveLength(23)
  })
})
