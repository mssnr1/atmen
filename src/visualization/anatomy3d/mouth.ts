import * as THREE from 'three'
import { findHoles } from './holes'

/** Where the mouth cavity ends behind the lips (world metres) and the size of that opening. */
export const LIPS = { y: 1.515, z: 0.08, halfWidth: 0.022, halfHeight: 0.007 }

/**
 * The model's throat (Nasal_Cavity) is open toward the mouth: Z-Anatomy has no
 * oral cavity. This builds one: a tube from the throat's front opening that
 * narrows forward to a slit just behind the lips, so the blue airway reaches the
 * front of the face at the mouth just as it does at the nose.
 *
 * Takes the throat mesh (with its world matrix up to date) and returns the tube
 * in world coordinates, or null when the opening isn't found.
 */
export function mouthCavity(throat: THREE.Mesh, rings = 8): THREE.BufferGeometry | null {
  const g = throat.geometry
  const pos = g.attributes.position
  if (!g.index || !pos) return null
  const world = new Float32Array(pos.count * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(throat.matrixWorld)
    world.set([v.x, v.y, v.z], i * 3)
  }
  // The opening toward the mouth: the open loop that faces forward.
  const open = findHoles(world, g.index.array)
    .filter((l) => l.normal.z > 0.7)
    .sort((a, b) => b.length - a.length)[0]
  if (!open) return null
  const loop = open.verts.map((i) => new THREE.Vector3(world[i * 3], world[i * 3 + 1], world[i * 3 + 2]))
  const c = open.center
  const hx = Math.max(...loop.map((p) => Math.abs(p.x - c.x))) || 1
  const hy = Math.max(...loop.map((p) => Math.abs(p.y - c.y))) || 1
  // Each point of the opening runs forward to the point at the same angle on the slit behind the lips.
  const target = loop.map((p) => {
    const a = Math.atan2((p.y - c.y) / hy, (p.x - c.x) / hx)
    return new THREE.Vector3(Math.cos(a) * LIPS.halfWidth, LIPS.y + Math.sin(a) * LIPS.halfHeight, LIPS.z)
  })
  const n = loop.length
  // The opening's edge is ragged; a smoothed copy of it, taken right after the first ring, keeps the
  // tube from folding over itself (folds read as dark streaks in the stripes).
  let smooth = loop.map((p) => p.clone())
  for (let k = 0; k < 30; k++) smooth = smooth.map((p, i) => p.clone().multiplyScalar(0.5).addScaledVector(smooth[(i + 1) % n], 0.25).addScaledVector(smooth[(i + n - 1) % n], 0.25))
  const positions: number[] = []
  for (let r = 0; r <= rings; r++) {
    const t = r / rings
    // Eased, so the tube leaves the throat smoothly and settles into the slit.
    const s = t * t * (3 - 2 * t)
    for (let i = 0; i < n; i++) {
      const p = loop[i].clone().lerp(smooth[i], Math.min(1, t * 4)).lerp(target[i], s)
      // Never back into the throat: each ring lies at least its share of the way forward.
      positions.push(p.x, p.y, Math.max(p.z, smooth[i].z + (LIPS.z - smooth[i].z) * t))
    }
  }
  const indices: number[] = []
  for (let r = 0; r < rings; r++)
    for (let i = 0; i < n; i++) {
      const a = r * n + i
      const b = r * n + ((i + 1) % n)
      indices.push(a, b, a + n, b, b + n, a + n)
    }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  out.setIndex(indices)
  out.computeVertexNormals()
  return out
}
