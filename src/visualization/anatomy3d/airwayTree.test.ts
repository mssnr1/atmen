import { describe, expect, it } from 'vitest'
import { AIRWAY_BRANCHES } from './airwayShape'
import { airwayTree, type Branch } from './airwayTree'

const same = (a: ArrayLike<number>, b: ArrayLike<number>) => a.length === b.length && Array.prototype.every.call(a, (v: number, i: number) => v === b[i])

describe('airway surface', () => {
  // The quick way skips the grid far from the surface and only looks at the pieces of airway close by.
  // It has to give exactly the surface that sampling every point of the grid gives.
  it('is the same worked out the quick way as with every grid point sampled', () => {
    for (const cell of [0.0035, 0.005]) {
      const quick = airwayTree(AIRWAY_BRANCHES, { top: 1.7, cell })
      const dense = airwayTree(AIRWAY_BRANCHES, { top: 1.7, cell, dense: true })
      expect(quick.attributes.position.count).toBeGreaterThan(1000)
      expect(same(quick.attributes.position.array, dense.attributes.position.array)).toBe(true)
      expect(same(quick.index!.array, dense.index!.array)).toBe(true)
    }
  })

  it('is the same for a fork with a flat cut, a clipped end and elliptical sections', () => {
    const fork: Branch[] = [
      { points: [[0, 0.2, 0], [0, 0.1, 0.004], [0.001, 0.05, 0]], r0: 0.012, r1: 0.009 },
      { points: [[0.001, 0.05, 0], [0.03, 0.02, -0.004], [0.05, 0, -0.002]], r0: 0.007, r1: 0.005, w0: 0.012, w1: 0.006 },
      { points: [[0.001, 0.05, 0], [-0.02, 0.03, 0.002], [-0.045, 0.012, 0.01]], r0: 0.007, r1: 0.004, clip: { point: [-0.04, 0.016, 0.008], normal: [-1, -0.4, 0.2] } },
    ]
    const quick = airwayTree(fork, { top: 0.19, cell: 0.002 })
    const dense = airwayTree(fork, { top: 0.19, cell: 0.002, dense: true })
    expect(quick.attributes.position.count).toBeGreaterThan(1000)
    expect(same(quick.attributes.position.array, dense.attributes.position.array)).toBe(true)
    expect(same(quick.index!.array, dense.index!.array)).toBe(true)
  })
})
