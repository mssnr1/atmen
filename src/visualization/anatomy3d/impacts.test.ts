import { describe, expect, it } from 'vitest'
import { bodyInsights, INSIGHT_EVERY, INSIGHT_FIRST_CYCLE } from '../../guide/insights'
import { IMPACT_OF, IMPACT_S, ImpactClock, impactAmount, PULSE_S, PULSES } from './impacts'

describe('impact effects', () => {
  it('give every card an effect', () => {
    for (const c of bodyInsights.de) expect(IMPACT_OF[c.id], c.id).toBeDefined()
  })

  it('pulse five times and are gone afterwards', () => {
    expect(impactAmount(0)).toBe(0)
    expect(impactAmount(IMPACT_S)).toBe(0)
    let peaks = 0
    for (let i = 1; i < PULSES * 200; i++) {
      const t = (i / 200) * PULSE_S
      if (impactAmount(t) > impactAmount(t - 0.005) && impactAmount(t) > impactAmount(t + 0.005)) peaks++
    }
    expect(peaks).toBe(PULSES)
  })

  it('start with each new card, hold while paused and reset at the start', () => {
    const clock = new ImpactClock()
    expect(clock.update('running', 0, 0.1)).toBeNull()
    expect(clock.update('running', INSIGHT_FIRST_CYCLE, 0.1)?.kind).toBe('lungs')
    const t = clock.update('paused', INSIGHT_FIRST_CYCLE, 1)!.t
    expect(clock.update('paused', INSIGHT_FIRST_CYCLE, 1)!.t).toBe(t)
    expect(clock.update('running', INSIGHT_FIRST_CYCLE + INSIGHT_EVERY, 0.1)?.kind).toBe('vessels')
    expect(clock.update('running', INSIGHT_FIRST_CYCLE + INSIGHT_EVERY, IMPACT_S)).toBeNull()
    expect(clock.update('idle', 0, 0.1)).toBeNull()
    expect(clock.update('running', INSIGHT_FIRST_CYCLE, 0.1)?.kind).toBe('lungs')
  })
})
