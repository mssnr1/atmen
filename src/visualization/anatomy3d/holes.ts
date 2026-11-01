import * as THREE from 'three'

/** One open edge loop of a mesh: vertex ids in boundary order, with its size and outward direction. */
export type HoleLoop = { verts: number[]; center: THREE.Vector3; normal: THREE.Vector3; length: number; radius: number; aspect: number }

/**
 * The skin of the head has holes where Z-Anatomy keeps separate parts we leave
 * out: the eyes, the eyebrows, the lips' gap. Seen through the striped,
 * see-through head they read as blank white patches. This closes every hole
 * but the neck opening with a cap, so the contour lines run on across it: flat
 * over the brows and lips, a shallow bowl over each eye socket, so the lines
 * dip in and hint at its depth.
 *
 * Returns a new non-quantized geometry (position, normal, index) or null when
 * the mesh has no index. `scale` turns local units into metres.
 */
export function withHolesFilled(geometry: THREE.BufferGeometry, scale: number): THREE.BufferGeometry | null {
  const index = geometry.index
  const src = geometry.attributes.position
  const srcN = geometry.attributes.normal
  if (!index || !src) return null
  const n = src.count
  const positions: number[] = []
  const normals: number[] = []
  const v = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(src, i)
    positions.push(v.x, v.y, v.z)
    if (srcN) v.fromBufferAttribute(srcN as THREE.BufferAttribute, i).normalize()
    normals.push(v.x, v.y, v.z)
  }
  const indices = Array.from({ length: index.count }, (_, i) => index.getX(i))
  const loops = findHoles(positions, indices)
  const P = (i: number) => new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
  const add = (p: THREE.Vector3, nrm: THREE.Vector3) => {
    positions.push(p.x, p.y, p.z)
    normals.push(nrm.x, nrm.y, nrm.z)
    return positions.length / 3 - 1
  }
  for (const loop of loops) {
    // The neck opening (where the head meets the trunk's skin) stays open.
    if (loop.length * scale > 0.15) continue
    const { verts, center, normal, radius } = loop
    if (loop.aspect < 2.2 && loop.radius * scale > 0.006) {
      // A round hole (an eye): a bowl, two rings sinking toward a centre point.
      const depth = radius * 0.55
      const ring = verts.map((id) => add(P(id).lerp(center, 0.5).addScaledVector(normal, -depth * 0.7), normal))
      const mid = add(center.clone().addScaledVector(normal, -depth), normal)
      for (let i = 0; i < verts.length; i++) {
        const j = (i + 1) % verts.length
        indices.push(verts[j], verts[i], ring[i], verts[j], ring[i], ring[j])
        indices.push(mid, ring[j], ring[i])
      }
    } else {
      // A slit (brow, lips): a flat cap, triangulated in the plane of the hole.
      const u = new THREE.Vector3().crossVectors(normal, Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize()
      const w = new THREE.Vector3().crossVectors(normal, u)
      const flat = verts.map((id) => {
        const d = P(id).sub(center)
        return new THREE.Vector2(d.dot(u), d.dot(w))
      })
      const tris = THREE.ShapeUtils.triangulateShape(flat, [])
      // Wind each triangle like the skin around it, facing out.
      const e1 = new THREE.Vector3()
      const e2 = new THREE.Vector3()
      for (const [a, b, c] of tris) {
        const pa = P(verts[a])
        e1.subVectors(P(verts[b]), pa)
        e2.subVectors(P(verts[c]), pa)
        indices.push(...(e1.cross(e2).dot(normal) >= 0 ? [verts[a], verts[b], verts[c]] : [verts[a], verts[c], verts[b]]))
      }
    }
  }
  const out = new THREE.BufferGeometry()
  // Where the closed holes were (local space), e.g. for the closed eyes and smile drawn after the exercise.
  out.userData.holes = loops.map(({ center, normal, radius, aspect, length }) => ({ center, normal, radius, aspect, length }))
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  out.setIndex(indices)
  out.computeBoundingSphere()
  out.computeBoundingBox()
  return out
}

/** The open edge loops of a triangle mesh, with vertices welded by position (seams don't count as holes). */
export function findHoles(positions: ArrayLike<number>, indices: ArrayLike<number>): HoleLoop[] {
  const n = positions.length / 3
  const weld = new Int32Array(n)
  const seen = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const k = `${positions[i * 3]},${positions[i * 3 + 1]},${positions[i * 3 + 2]}`
    const first = seen.get(k)
    weld[i] = first ?? i
    if (first === undefined) seen.set(k, i)
  }
  // Directed edges of the faces; an edge without its reverse lies on a hole.
  const edges = new Set<string>()
  for (let t = 0; t < indices.length; t += 3)
    for (let e = 0; e < 3; e++) edges.add(`${weld[indices[t + e]]}>${weld[indices[t + ((e + 1) % 3)]]}`)
  const next = new Map<number, number>()
  for (const key of edges) {
    const [a, b] = key.split('>').map(Number)
    if (!edges.has(`${b}>${a}`)) next.set(a, b)
  }
  const P = (i: number) => new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
  const loops: HoleLoop[] = []
  const used = new Set<number>()
  for (const start of next.keys()) {
    if (used.has(start)) continue
    const verts: number[] = []
    let cur: number | undefined = start
    while (cur !== undefined && !used.has(cur)) {
      used.add(cur)
      verts.push(cur)
      cur = next.get(cur)
    }
    if (cur !== start || verts.length < 3) continue
    const center = new THREE.Vector3()
    verts.forEach((id) => center.add(P(id)))
    center.divideScalar(verts.length)
    // Newell normal: the faces run a → b along the boundary, so the hole's own loop runs the other way round.
    const normal = new THREE.Vector3()
    let length = 0
    for (let i = 0; i < verts.length; i++) {
      const a = P(verts[i])
      const b = P(verts[(i + 1) % verts.length])
      normal.x += (a.y - b.y) * (a.z + b.z)
      normal.y += (a.z - b.z) * (a.x + b.x)
      normal.z += (a.x - b.x) * (a.y + b.y)
      length += a.distanceTo(b)
    }
    normal.normalize().negate()
    const radius = verts.reduce((s, id) => s + P(id).distanceTo(center), 0) / verts.length
    // Farthest over nearest boundary point from the centre: about 1 for a round hole, large for a slit.
    const dists = verts.map((id) => P(id).distanceTo(center))
    const aspect = Math.max(...dists) / Math.max(1e-9, Math.min(...dists))
    loops.push({ verts, center, normal, length, radius, aspect })
  }
  return loops
}
