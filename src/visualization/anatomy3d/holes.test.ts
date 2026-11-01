import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { findHoles, withHolesFilled } from './holes'

/** A box with its front face (+z) taken out, as an indexed mesh: one square hole. */
function openBox() {
  const box = new THREE.BoxGeometry(1, 1, 1)
  const index = box.index!
  // BoxGeometry groups: +x, -x, +y, -y, +z, -z; drop the +z group.
  const front = box.groups[4]
  const keep = Array.from({ length: index.count }, (_, i) => index.getX(i)).filter((_, i) => i < front.start || i >= front.start + front.count)
  box.setIndex(keep)
  return box
}

describe('head holes', () => {
  it('finds the open edge loop, welding seam vertices', () => {
    const box = openBox()
    const loops = findHoles(box.attributes.position.array, box.index!.array)
    expect(loops).toHaveLength(1)
    expect(loops[0].verts).toHaveLength(4)
    // Points out of the hole, away from the box.
    expect(loops[0].normal.z).toBeCloseTo(1)
    expect(loops[0].length).toBeCloseTo(4)
  })

  it('closes small holes so no open edge is left', () => {
    const box = openBox()
    // Scale so the 4 m hole counts as small (under the neck opening's size).
    const filled = withHolesFilled(box, 0.01)!
    expect(findHoles(filled.attributes.position.array, filled.index!.array)).toHaveLength(0)
  })

  it('leaves the neck opening open', () => {
    const filled = withHolesFilled(openBox(), 1)!
    expect(findHoles(filled.attributes.position.array, filled.index!.array)).toHaveLength(1)
  })
})
