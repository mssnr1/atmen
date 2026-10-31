import { describe, expect, it } from 'vitest'
import { auraLevel } from './Aura'

describe('aura', () => {
  it('is off before the start and full at the end', () => {
    expect(auraLevel({ status: 'idle', progress: 0 })).toBe(0)
    expect(auraLevel({ status: 'completed', progress: 1 })).toBe(1)
    expect(auraLevel({ status: 'running', progress: 0.95 })).toBeCloseTo(1)
  })

  it('builds up steadily over the session, also while paused', () => {
    const levels = [0, 0.05, 0.2, 0.4, 0.6, 0.8, 0.9].map((progress) => auraLevel({ status: 'running', progress }))
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThan(levels[i - 1])
    expect(levels[1]).toBeLessThan(0.1)
    expect(auraLevel({ status: 'paused', progress: 0.4 })).toBe(auraLevel({ status: 'running', progress: 0.4 }))
  })
})
