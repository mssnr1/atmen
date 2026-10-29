import { describe, expect, it } from 'vitest'
import { BreathingEngine, type Ticker } from './BreathingEngine'
import { positionAt, resolvePlan, transitionsBetween } from './timeline'
import type { BreathingPattern, EngineEvent } from './types'

const resonance: BreathingPattern = {
  phases: [
    { type: 'inhale', durationMs: 5500 },
    { type: 'exhale', durationMs: 5500 },
  ],
}

const box: BreathingPattern = {
  phases: [
    { type: 'inhale', durationMs: 4000 },
    { type: 'holdIn', durationMs: 4000 },
    { type: 'exhale', durationMs: 4000 },
    { type: 'holdOut', durationMs: 4000 },
  ],
}

/** Manual time source and ticker so tests control time exactly. */
function harness(pattern: BreathingPattern, length = { kind: 'duration' as const, durationMs: 5 * 60_000 }) {
  let now = 0
  let tick: (() => void) | null = null
  const ticker: Ticker = (cb) => {
    tick = cb
    return () => {
      tick = null
    }
  }
  const engine = new BreathingEngine({ pattern, length, now: () => now, ticker, wallClock: () => new Date(now) })
  const events: EngineEvent[] = []
  engine.subscribe((e) => events.push(e))
  return {
    engine,
    events,
    advance(ms: number, steps = 1) {
      for (let i = 0; i < steps; i++) {
        now += ms / steps
        tick?.()
      }
    },
    get ticking() {
      return tick !== null
    },
  }
}

describe('timeline', () => {
  it('rounds a duration to whole cycles', () => {
    const cases: [number, number, number][] = [
      [2, 11, 121_000],
      [5, 27, 297_000],
      [10, 55, 605_000],
    ]
    for (const [min, cycles, ms] of cases) {
      const plan = resolvePlan(resonance, { kind: 'duration', durationMs: min * 60_000 })
      expect(plan.totalCycles).toBe(cycles)
      expect(plan.totalDurationMs).toBe(ms)
    }
  })

  it('supports exact durations and cycle counts', () => {
    expect(resolvePlan(resonance, { kind: 'duration', durationMs: 300_000, alignToCycles: false }).totalDurationMs).toBe(300_000)
    const p = resolvePlan(box, { kind: 'cycles', count: 3 })
    expect(p.totalDurationMs).toBe(48_000)
  })

  it('finds the phase at any time', () => {
    const plan = resolvePlan(resonance, { kind: 'cycles', count: 3 })
    expect(positionAt(plan, 0)).toMatchObject({ phaseIndex: 0, cycleIndex: 0, completedCycles: 0 })
    expect(positionAt(plan, 5499).phase.type).toBe('inhale')
    expect(positionAt(plan, 5500).phase.type).toBe('exhale')
    expect(positionAt(plan, 11_000)).toMatchObject({ cycleIndex: 1, completedCycles: 1, phaseIndex: 0 })
    const mid = positionAt(plan, 2750)
    expect(mid.phaseProgress).toBeCloseTo(0.5)
    expect(mid.phaseRemainingMs).toBe(2750)
  })

  it('handles hold phases and skips empty ones', () => {
    const plan = resolvePlan(
      { phases: [...box.phases.slice(0, 3), { type: 'holdOut', durationMs: 0 }] },
      { kind: 'cycles', count: 2 },
    )
    expect(plan.activePhases).toHaveLength(3)
    expect(positionAt(plan, 4000).phase.type).toBe('holdIn')
    expect(positionAt(plan, 8000).phase.type).toBe('exhale')
    expect(positionAt(plan, 12_000)).toMatchObject({ cycleIndex: 1, phaseIndex: 0 })
  })

  it('reports the final state at the end', () => {
    const plan = resolvePlan(resonance, { kind: 'cycles', count: 2 })
    const end = positionAt(plan, 99_999)
    expect(end).toMatchObject({ done: true, completedCycles: 2, remainingMs: 0, progress: 1, phaseProgress: 1 })
    expect(end.phase.type).toBe('exhale')
  })

  it('lists transitions in a window', () => {
    const plan = resolvePlan(box, { kind: 'cycles', count: 2 })
    expect(transitionsBetween(plan, 0, 100_000).map((t) => t.atMs)).toEqual([0, 4000, 8000, 12000, 16000, 20000, 24000, 28000])
    expect(transitionsBetween(plan, 4001, 12_001).map((t) => t.phase.type)).toEqual(['exhale', 'holdOut'])
  })

  it('rejects invalid patterns', () => {
    expect(() => resolvePlan({ phases: [] }, { kind: 'cycles', count: 1 })).toThrow()
    expect(() => resolvePlan({ phases: [{ type: 'inhale', durationMs: -1 }] }, { kind: 'cycles', count: 1 })).toThrow()
  })
})

describe('BreathingEngine', () => {
  it('is independent of tick rate', () => {
    const a = harness(resonance)
    const b = harness(resonance)
    a.engine.start()
    b.engine.start()
    a.advance(17_250, 1) // one huge tick
    b.advance(17_250, 1035) // ~60 fps
    expect(a.engine.getSnapshot().elapsedMs).toBeCloseTo(b.engine.getSnapshot().elapsedMs, 6)
    expect(a.engine.getSnapshot()).toMatchObject({ cycleIndex: 1, phaseIndex: 1, completedCycles: 1 })
  })

  it('emits a phase event for each transition', () => {
    const h = harness(resonance)
    h.engine.start()
    h.advance(33_000, 330)
    const phases = h.events.filter((e) => e.type === 'phase').map((e) => e.snapshot.phase.type)
    expect(phases).toEqual(['inhale', 'exhale', 'inhale', 'exhale', 'inhale', 'exhale', 'inhale'])
  })

  it('freezes time while paused and resumes where it left off', () => {
    const h = harness(resonance)
    h.engine.start()
    h.advance(3000, 30)
    h.engine.pause()
    expect(h.ticking).toBe(false)
    h.advance(60_000) // a minute passes while paused
    expect(h.engine.sample()).toMatchObject({ status: 'paused', elapsedMs: 3000 })
    h.engine.resume()
    h.advance(3000, 30)
    expect(h.engine.getSnapshot()).toMatchObject({ status: 'running', elapsedMs: 6000 })
    expect(h.engine.getSnapshot().phase.type).toBe('exhale')
  })

  it('does not repeat the phase event on resume', () => {
    const h = harness(resonance)
    h.engine.start()
    h.advance(1000)
    h.engine.pause()
    h.engine.resume()
    h.advance(1000)
    expect(h.events.filter((e) => e.type === 'phase')).toHaveLength(1)
  })

  it('restarts from zero', () => {
    const h = harness(resonance)
    h.engine.start()
    h.advance(20_000, 20)
    h.engine.restart()
    expect(h.engine.getSnapshot()).toMatchObject({ status: 'running', elapsedMs: 0, cycleIndex: 0, phaseIndex: 0 })
    h.advance(1000)
    expect(h.engine.getSnapshot().elapsedMs).toBe(1000)
  })

  it('completes exactly once with a correct summary', () => {
    const h = harness(resonance, { kind: 'duration', durationMs: 2 * 60_000 })
    h.engine.start()
    h.advance(30_000, 10)
    h.engine.pause()
    h.advance(10_000)
    h.engine.resume()
    h.advance(200_000, 100)
    const completes = h.events.filter((e) => e.type === 'complete')
    expect(completes).toHaveLength(1)
    const c = completes[0]
    if (c.type !== 'complete') throw new Error()
    expect(c.summary.durationMs).toBe(121_000)
    expect(c.summary.completedCycles).toBe(11)
    expect(h.engine.getSnapshot().status).toBe('completed')
    expect(h.ticking).toBe(false)
    // starting again begins a new session
    h.engine.start()
    expect(h.engine.getSnapshot()).toMatchObject({ status: 'running', elapsedMs: 0 })
  })

  it('ignores invalid commands', () => {
    const h = harness(resonance)
    h.engine.pause()
    h.engine.resume()
    expect(h.engine.getSnapshot().status).toBe('idle')
  })
})
