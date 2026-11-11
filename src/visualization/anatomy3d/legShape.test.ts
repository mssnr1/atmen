import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { findHoles } from './holes'
import { tidiedLegs } from './legShape'

/** A flat sheet facing forward through the crotch region, with a bump hanging out of its middle, a pinhole and a loose scrap beside it. */
function sheet() {
  const g = new THREE.PlaneGeometry(0.4, 0.4, 80, 80)
  g.translate(0, 0.815, 0.05)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const d = Math.hypot(pos.getX(i), pos.getY(i) - 0.79)
    pos.setZ(i, pos.getZ(i) + 0.03 * Math.exp(-((d / 0.02) ** 2)))
  }
  // One triangle near the middle left out: a pinhole.
  const index = Array.from(g.index!.array)
  const hole = index.findIndex((_, t) => t % 3 === 0 && Math.abs(pos.getX(index[t]) + 0.03) < 0.003 && Math.abs(pos.getY(index[t]) - 0.84) < 0.003)
  index.splice(hole, 3)
  // A loose scrap far to the side.
  const base = pos.count
  const scrap = [-0.9, 0.7, 0, -0.89, 0.7, 0, -0.9, 0.71, 0]
  const all = new Float32Array([...(pos.array as Float32Array), ...scrap])
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(all, 3))
  out.setIndex([...index, base, base + 1, base + 2])
  return out
}

describe('tidied legs', () => {
  const source = sheet()
  const tidied = tidiedLegs(source, new THREE.Matrix4())
  const p = tidied.attributes.position

  it('relaxes what hangs out between the legs', () => {
    const peak = (g: THREE.BufferGeometry) => {
      const a = g.attributes.position
      let z = -Infinity
      for (let i = 0; i < a.count; i++) if (Math.abs(a.getX(i)) < 0.2) z = Math.max(z, a.getZ(i))
      return z - 0.05
    }
    expect(peak(source)).toBeGreaterThan(0.025)
    expect(peak(tidied)).toBeLessThan(0.006)
  })

  it('drops loose scraps and closes pinholes', () => {
    const used = new Set(Array.from(tidied.index!.array))
    for (const i of used) expect(Math.abs(p.getX(i))).toBeLessThan(0.3)
    const flat = Array.from(p.array as Float32Array)
    // Before: the sheet's outer rim, the pinhole and the scrap's edge. After: only the rim.
    expect(findHoles(Array.from(source.attributes.position.array as Float32Array), Array.from(source.index!.array)).length).toBe(3)
    expect(findHoles(flat, Array.from(tidied.index!.array)).length).toBe(1)
  })

  it('keeps the skin away from the region as it was', () => {
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(source.attributes.position.getX(i)) < 0.15) continue
      expect(p.getZ(i)).toBeCloseTo(source.attributes.position.getZ(i), 5)
    }
  })
})
