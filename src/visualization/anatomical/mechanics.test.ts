import { describe, expect, it } from 'vitest'
import { resolvePlan, positionAt, type EngineSnapshot } from '../../engine'
import { breathState } from '../breathState'
import { airflowState } from './airflow'
import { bodyPose } from './model'

const plan = resolvePlan(
  { phases: [{ type: 'inhale', durationMs: 5500 }, { type: 'exhale', durationMs: 5500 }] },
  { kind: 'cycles', count: 3 },
)
const at = (ms: number): EngineSnapshot => ({ ...positionAt(plan, ms), status: 'running', plan })

describe('breath state', () => {
  it('follows the phase and is continuous at the turns', () => {
    expect(breathState(at(0)).volume).toBeCloseTo(0)
    expect(breathState(at(2750)).volume).toBeCloseTo(0.5)
    expect(breathState(at(5499)).volume).toBeCloseTo(1, 3)
    expect(breathState(at(5501)).volume).toBeCloseTo(1, 3)
    expect(breathState(at(10_999)).volume).toBeCloseTo(0, 3)
    expect(breathState(at(2750)).flow).toBeCloseTo(1)
    expect(breathState(at(0)).flow).toBeCloseTo(0)
  })
})

describe('body mechanics', () => {
  it('keeps the lungs resting on the diaphragm at every volume', () => {
    for (let v = 0; v <= 1; v += 0.1) {
      const pose = bodyPose(v)
      for (const l of [pose.lungLeft, pose.lungRight]) {
        expect(l.cy + l.ry).toBeCloseTo(pose.diaphragmY(l.cx) - 1, 6)
      }
    }
  })

  it('moves diaphragm, lungs and abdomen together with volume', () => {
    const rest = bodyPose(0)
    const full = bodyPose(1)
    expect(full.diaphragmY(100)).toBeGreaterThan(rest.diaphragmY(100)) // descends (y grows downward)
    expect(full.lungLeft.ry).toBeGreaterThan(rest.lungLeft.ry)
    expect(full.abdomenBulge).toBeGreaterThan(rest.abdomenBulge)
    expect(rest.abdomenBulge).toBe(0)
    // Belly displacement is proportional to diaphragm descent.
    const half = bodyPose(0.5)
    expect(half.abdomenBulge / half.diaphragmDrop).toBeCloseTo(full.abdomenBulge / full.diaphragmDrop)
  })
})

describe('airflow', () => {
  it('moves the front nose → lungs on inhale and lungs → nose on exhale', () => {
    expect(airflowState(breathState(at(100))).front).toBeLessThan(0.1)
    expect(airflowState(breathState(at(2750))).front).toBe(1)
    expect(airflowState(breathState(at(5600))).front).toBeGreaterThan(0.9)
    expect(airflowState(breathState(at(8250))).front).toBe(0)
  })

  it('has no airway air at the turns, so modes and phases join without jumps', () => {
    expect(airflowState(breathState(at(0))).airway).toBeCloseTo(0)
    expect(airflowState(breathState(at(5499))).airway).toBeCloseTo(0, 1)
    expect(airflowState(breathState(at(5501))).airway).toBeCloseTo(0, 1)
  })

  it('fills the lungs with the lung volume', () => {
    expect(airflowState(breathState(at(5499))).fill).toBeCloseTo(1, 3)
    expect(airflowState(breathState(at(10_999))).fill).toBeCloseTo(0, 3)
  })
})
