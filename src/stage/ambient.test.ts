import { describe, expect, it } from 'vitest'
import { AMBIENT_CYCLE_MS, AMBIENT_HALF_MS, ambientAt, breathCurve, REST_LEVEL } from '../lib/breathClock'
import { breathState } from '../visualization/breathState'
import { ambientSnapshot, inverseBreathCurve, settleSource } from './ambient'

describe('ambient breath', () => {
  it('breathes 5.5 s in and 5.5 s out, over and over', () => {
    expect(ambientAt(0)).toMatchObject({ inhale: true, level: 0 })
    expect(ambientAt(AMBIENT_HALF_MS / 2).level).toBeCloseTo(0.5)
    expect(ambientAt(AMBIENT_HALF_MS)).toMatchObject({ inhale: false, level: 1 })
    expect(ambientAt(AMBIENT_HALF_MS * 1.5).level).toBeCloseTo(0.5)
    expect(ambientAt(AMBIENT_CYCLE_MS + 1000).level).toBeCloseTo(ambientAt(1000).level)
  })

  it('gives the figure the same level as the breath sign', () => {
    for (const ms of [0, 1200, 4000, 5500, 7300, 10_900]) {
      expect(breathState(ambientSnapshot(ms)).volume).toBeCloseTo(ambientAt(ms).level, 5)
    }
  })

  it('stands still at the rest level when motion is reduced, and never counts as session progress', () => {
    const still = ambientSnapshot(123_456, true)
    expect(breathState(still).volume).toBeCloseTo(REST_LEVEL, 4)
    expect(ambientSnapshot(60_000).progress).toBe(0)
    expect(ambientSnapshot(60_000).cycleIndex).toBe(0)
  })
})

describe('inverseBreathCurve', () => {
  it('finds the point of a breath at which the lungs hold a level', () => {
    for (const level of [0, 0.1, 0.37, 0.62, 0.9, 1]) expect(breathCurve(inverseBreathCurve(level))).toBeCloseTo(level, 5)
  })
})

describe('settleSource', () => {
  it('breathes out from where the lungs stand to empty, without a jump at either end', () => {
    for (const level of [0.2, 0.62, 1]) {
      let now = 1000
      const source = settleSource(level, 4000, () => now)
      const volume = () => breathState(source.sample()).volume
      expect(volume()).toBeCloseTo(level, 4)
      let last = volume()
      for (now = 1100; now <= 5000; now += 100) {
        const v = volume()
        expect(v).toBeLessThanOrEqual(last + 1e-9)
        expect(source.sample().phase.type).toBe('exhale')
        last = v
      }
      expect(last).toBeCloseTo(0, 5)
      // It stays empty until the exercise takes over.
      now = 9000
      expect(volume()).toBeCloseTo(0, 5)
    }
  })
})
