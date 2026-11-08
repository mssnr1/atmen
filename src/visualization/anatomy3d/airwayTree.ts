import * as THREE from 'three'

/**
 * A stretch of airway: a polyline in world metres with a radius at its start and its end. With `w0`/`w1`
 * the section is an ellipse instead of a circle: `r` across the airway within the side view (the
 * plane of the polyline and the body's left-right axis' normal), `w` from left to right.
 */
export type Branch = { points: [number, number, number][]; r0: number; r1: number; w0?: number; w1?: number; radii?: number[]; widths?: number[]; clip?: { point: [number, number, number]; normal: [number, number, number] } }

/**
 * The windpipe and both main bronchi as one smooth piece. The model's trachea
 * and bronchi are separate meshes whose ring-shaped surfaces overlap at the
 * fork. Here the airway is described as a distance field (tapered capsules
 * along each branch, blended with a smooth minimum so the fork flows), and its
 * surface is extracted with surface nets and smoothed. The top is cut flat and
 * left open where the throat continues; the bronchi end inside the lungs.
 */
export function airwayTree(
  branches: Branch[],
  { top, cell = 0.0011, blend = 0.008 }: { top: number; cell?: number; blend?: number },
): THREE.BufferGeometry {
  // Segments with their radii (and widths, for elliptical sections), for the distance field.
  const segs: { a: THREE.Vector3; b: THREE.Vector3; ra: number; rb: number; wa: number; wb: number; branch: number }[] = []
  for (const br of branches) {
    const pts = br.points.map((p) => new THREE.Vector3(...p))
    const lengths = [0]
    for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]))
    const total = lengths[lengths.length - 1] || 1
    for (let i = 1; i < pts.length; i++) {
      const w0 = br.w0 ?? br.r0
      const w1 = br.w1 ?? br.r1
      const r = (j: number) => br.radii?.[j] ?? br.r0 + (br.r1 - br.r0) * (lengths[j] / total)
      const w = (j: number) => br.widths?.[j] ?? br.radii?.[j] ?? w0 + (w1 - w0) * (lengths[j] / total)
      segs.push({ a: pts[i - 1], b: pts[i], ra: r(i - 1), rb: r(i), wa: w(i - 1), wb: w(i), branch: branches.indexOf(br) })
    }
  }

  const box = new THREE.Box3()
  for (const s of segs) {
    const m = Math.max(s.ra, s.rb, s.wa, s.wb) + blend + cell * 3
    box.expandByPoint(s.a.clone().addScalar(m)).expandByPoint(s.a.clone().addScalar(-m))
    box.expandByPoint(s.b.clone().addScalar(m)).expandByPoint(s.b.clone().addScalar(-m))
  }

  const ab = new THREE.Vector3()
  const ap = new THREE.Vector3()
  const p = new THREE.Vector3()
  const across = new THREE.Vector3()
  const side = new THREE.Vector3(1, 0, 0)
  // Polynomial smooth minimum: blends two distances over `blend` metres.
  const smin = (x: number, y: number) => {
    const h = Math.max(blend - Math.abs(x - y), 0) / blend
    return Math.min(x, y) - (h * h * blend) / 4
  }
  // A branch's clip plane, if it has one, with a rounded edge.
  const clips = branches.map((br) =>
    br.clip ? { point: new THREE.Vector3(...br.clip.point), normal: new THREE.Vector3(...br.clip.normal).normalize() } : null,
  )
  const clipped = (b: number, dist: number) => {
    const c = clips[b]
    if (!c) return dist
    return -smin(-dist, -ap.subVectors(p, c.point).dot(c.normal))
  }
  const field = (x: number, y: number, z: number) => {
    p.set(x, y, z)
    let d = Infinity
    let own = Infinity
    let branch = -1
    for (const s of segs) {
      ab.subVectors(s.b, s.a)
      ap.subVectors(p, s.a)
      const t = THREE.MathUtils.clamp(ap.dot(ab) / ab.lengthSq(), 0, 1)
      const r = s.ra + (s.rb - s.ra) * t
      const w = s.wa + (s.wb - s.wa) * t
      const q = ap.addScaledVector(ab, -t)
      let dist: number
      if (w === r) dist = q.length() - r
      else {
        // Elliptical section: across the airway in the side view `r`, left to right `w`; along the
        // axis (past the ends) like across. Distance estimate of an ellipsoid with these radii.
        across.crossVectors(ab, side).normalize()
        const u = q.dot(across)
        const x = q.x
        const along = Math.sqrt(Math.max(q.lengthSq() - u * u - x * x, 0))
        const k0 = Math.hypot(u / r, x / w, along / r)
        const k1 = Math.hypot(u / (r * r), x / (w * w), along / (r * r))
        dist = k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(r, w)
      }
      // The pieces of one branch join plainly (it is one tube); branches blend smoothly into each other.
      if (s.branch !== branch) {
        if (branch >= 0) d = d === Infinity ? clipped(branch, own) : smin(d, clipped(branch, own))
        branch = s.branch
        own = dist
      } else own = Math.min(own, dist)
    }
    d = d === Infinity ? clipped(branch, own) : smin(d, clipped(branch, own))
    // Cut flat at the top.
    return Math.max(d, y - top)
  }

  // Sample the field on a grid.
  const nx = Math.ceil((box.max.x - box.min.x) / cell) + 1
  const ny = Math.ceil((box.max.y - box.min.y) / cell) + 1
  const nz = Math.ceil((box.max.z - box.min.z) / cell) + 1
  const values = new Float32Array(nx * ny * nz)
  const at = (i: number, j: number, k: number) => i + nx * (j + ny * k)
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) values[at(i, j, k)] = field(box.min.x + i * cell, box.min.y + j * cell, box.min.z + k * cell)

  // Surface nets: one vertex per cell the surface passes through, at the mean of its edge crossings.
  const vertexOf = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1)
  const cellAt = (i: number, j: number, k: number) => i + (nx - 1) * (j + (ny - 1) * k)
  const positions: number[] = []
  const corners = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ]
  const edges = [
    [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
  ]
  const v = new Float32Array(8)
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let inside = 0
        for (let c = 0; c < 8; c++) {
          v[c] = values[at(i + corners[c][0], j + corners[c][1], k + corners[c][2])]
          if (v[c] < 0) inside++
        }
        if (inside === 0 || inside === 8) continue
        let sx = 0
        let sy = 0
        let sz = 0
        let n = 0
        for (const [a, b] of edges) {
          if (v[a] < 0 === v[b] < 0) continue
          const t = v[a] / (v[a] - v[b])
          sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t
          sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t
          sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t
          n++
        }
        vertexOf[cellAt(i, j, k)] = positions.length / 3
        positions.push(box.min.x + (i + sx / n) * cell, box.min.y + (j + sy / n) * cell, box.min.z + (k + sz / n) * cell)
      }

  // One quad for every grid edge the surface crosses, joining the four cells around it.
  const index: number[] = []
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    if (flip) index.push(a, c, b, a, d, c)
    else index.push(a, b, c, a, c, d)
  }
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const here = values[at(i, j, k)] < 0
        if (here !== values[at(i + 1, j, k)] < 0)
          quad(vertexOf[cellAt(i, j - 1, k - 1)], vertexOf[cellAt(i, j, k - 1)], vertexOf[cellAt(i, j, k)], vertexOf[cellAt(i, j - 1, k)], here)
        if (here !== values[at(i, j + 1, k)] < 0)
          quad(vertexOf[cellAt(i - 1, j, k - 1)], vertexOf[cellAt(i - 1, j, k)], vertexOf[cellAt(i, j, k)], vertexOf[cellAt(i, j, k - 1)], here)
        if (here !== values[at(i, j, k + 1)] < 0)
          quad(vertexOf[cellAt(i - 1, j - 1, k)], vertexOf[cellAt(i, j - 1, k)], vertexOf[cellAt(i, j, k)], vertexOf[cellAt(i - 1, j, k)], here)
      }

  // Drop the flat cap at the top.
  const kept: number[] = []
  const capY = top - cell * 0.75
  for (let t = 0; t < index.length; t += 3) {
    const ys = [index[t], index[t + 1], index[t + 2]].map((q) => positions[q * 3 + 1])
    if (ys.every((y) => y > capY)) continue
    kept.push(index[t], index[t + 1], index[t + 2])
  }

  // Smoothing takes out the grid's stair steps (the open rim stays in place).
  const count = positions.length / 3
  const links: Set<number>[] = Array.from({ length: count }, () => new Set())
  for (let t = 0; t < kept.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = kept[t + e]
      const b = kept[t + ((e + 1) % 3)]
      links[a].add(b)
      links[b].add(a)
    }
  let cur = Float32Array.from(positions)
  let next = new Float32Array(cur.length)
  // Taubin smoothing: alternating shrink and inflate steps smooth without thinning the tube.
  for (let it = 0; it < 24; it++) {
    const f = it % 2 === 0 ? 0.6 : -0.63
    for (let q = 0; q < count; q++) {
      const near = links[q]
      if (!near.size || positions[q * 3 + 1] > capY) {
        next.set(cur.subarray(q * 3, q * 3 + 3), q * 3)
        continue
      }
      for (let a = 0; a < 3; a++) {
        let s = 0
        for (const o of near) s += cur[o * 3 + a]
        next[q * 3 + a] = cur[q * 3 + a] + (s / near.size - cur[q * 3 + a]) * f
      }
    }
    ;[cur, next] = [next, cur]
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(cur, 3))
  geometry.setIndex(kept)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
