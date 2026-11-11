import * as THREE from 'three'

/**
 * A stretch of airway: a polyline in world metres with a radius at its start and its end. With `w0`/`w1`
 * the section is an ellipse instead of a circle: `r` across the airway within the side view (the
 * plane of the polyline and the body's left-right axis' normal), `w` from left to right.
 */
export type Branch = { points: [number, number, number][]; r0: number; r1: number; w0?: number; w1?: number; radii?: number[]; widths?: number[]; clip?: { point: [number, number, number]; normal: [number, number, number] } }

/** One straight piece of a branch, with what the distance to it needs, worked out once. */
type Piece = {
  ax: number
  ay: number
  az: number
  /** From its start to its end, and that length squared. */
  abx: number
  aby: number
  abz: number
  abSq: number
  ra: number
  rb: number
  wa: number
  wb: number
  /** Across the airway in the side view (unit length), for elliptical sections. */
  ux: number
  uy: number
  uz: number
  branch: number
}

/** How fast the distance field may change per metre, with room to spare: what a block's middle says holds for the whole block. */
const SLOPE = 1.6
/** The grid is worked through in blocks of this many points a side, halved down to blocks of `LEAF`. */
const ROOT = 32
const LEAF = 4

/**
 * The windpipe and both main bronchi as one smooth piece. The model's trachea
 * and bronchi are separate meshes whose ring-shaped surfaces overlap at the
 * fork. Here the airway is described as a distance field (tapered capsules
 * along each branch, blended with a smooth minimum so the fork flows), and its
 * surface is extracted with surface nets and smoothed. The top is cut flat and
 * left open where the throat continues; the bronchi end inside the lungs.
 *
 * The field is only worked out where the surface can be: a block of the grid whose middle lies far
 * from the surface is skipped whole, and a block near it only looks at the pieces of airway close by.
 * The surface is the same as with every point of the grid sampled (`dense`, kept to check that), but
 * it is there in a fraction of a second instead of many seconds.
 */
export function airwayTree(
  branches: Branch[],
  { top, cell = 0.0011, blend = 0.008, dense = false }: { top: number; cell?: number; blend?: number; dense?: boolean },
): THREE.BufferGeometry {
  // Pieces with their radii (and widths, for elliptical sections), for the distance field.
  const pieces: Piece[] = []
  const side = new THREE.Vector3(1, 0, 0)
  const box = new THREE.Box3()
  branches.forEach((br, branch) => {
    const pts = br.points.map((p) => new THREE.Vector3(...p))
    const lengths = [0]
    for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]))
    const total = lengths[lengths.length - 1] || 1
    for (let i = 1; i < pts.length; i++) {
      const w0 = br.w0 ?? br.r0
      const w1 = br.w1 ?? br.r1
      const r = (j: number) => br.radii?.[j] ?? br.r0 + (br.r1 - br.r0) * (lengths[j] / total)
      const w = (j: number) => br.widths?.[j] ?? br.radii?.[j] ?? w0 + (w1 - w0) * (lengths[j] / total)
      const a = pts[i - 1]
      const b = pts[i]
      const ab = new THREE.Vector3().subVectors(b, a)
      const u = new THREE.Vector3().crossVectors(ab, side).normalize()
      const piece: Piece = { ax: a.x, ay: a.y, az: a.z, abx: ab.x, aby: ab.y, abz: ab.z, abSq: ab.lengthSq(), ra: r(i - 1), rb: r(i), wa: w(i - 1), wb: w(i), ux: u.x, uy: u.y, uz: u.z, branch }
      pieces.push(piece)
      const m = Math.max(piece.ra, piece.rb, piece.wa, piece.wb) + blend + cell * 3
      box.expandByPoint(a.clone().addScalar(m)).expandByPoint(a.clone().addScalar(-m))
      box.expandByPoint(b.clone().addScalar(m)).expandByPoint(b.clone().addScalar(-m))
    }
  })

  // The point the field is asked at.
  let px = 0
  let py = 0
  let pz = 0
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
    return -smin(-dist, -((px - c.point.x) * c.normal.x + (py - c.point.y) * c.normal.y + (pz - c.point.z) * c.normal.z))
  }
  /** Distance from the point to the surface of one piece of airway (negative inside). */
  const reach = (s: Piece) => {
    let qx = px - s.ax
    let qy = py - s.ay
    let qz = pz - s.az
    const along = (qx * s.abx + qy * s.aby + qz * s.abz) / s.abSq
    const t = along < 0 ? 0 : along > 1 ? 1 : along
    const r = s.ra + (s.rb - s.ra) * t
    const w = s.wa + (s.wb - s.wa) * t
    qx += s.abx * -t
    qy += s.aby * -t
    qz += s.abz * -t
    const sq = qx * qx + qy * qy + qz * qz
    if (w === r) return Math.sqrt(sq) - r
    // Elliptical section: across the airway in the side view `r`, left to right `w`; along the
    // axis (past the ends) like across. Distance estimate of an ellipsoid with these radii.
    const u = qx * s.ux + qy * s.uy + qz * s.uz
    const rest = Math.sqrt(Math.max(sq - u * u - qx * qx, 0))
    // (Plain square roots: `Math.hypot` is several times slower, and this runs a few million times.)
    const k0 = Math.sqrt((u / r) ** 2 + (qx / w) ** 2 + (rest / r) ** 2)
    const k1 = Math.sqrt((u / (r * r)) ** 2 + (qx / (w * w)) ** 2 + (rest / (r * r)) ** 2)
    return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(r, w)
  }
  /** The field at a point, from the pieces in `list` (in their order: all of them, or those near enough to count). */
  const field = (x: number, y: number, z: number, list: Piece[]) => {
    px = x
    py = y
    pz = z
    let d = Infinity
    let own = Infinity
    let branch = -1
    for (let n = 0; n < list.length; n++) {
      const s = list[n]
      const dist = reach(s)
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
  // The blocks of `LEAF` points a side that were sampled: the surface runs through these only.
  const bx = Math.ceil(nx / LEAF)
  const by = Math.ceil(ny / LEAF)
  const bz = Math.ceil(nz / LEAF)
  const sampled = new Uint8Array(bx * by * bz)
  const corner = cell * Math.sqrt(3)
  const nearestOf = new Float64Array(branches.length)
  /**
   * Samples one block of the grid. If its middle is farther from the surface than the field can change
   * across the block (and one cell more, for the cells reaching into it), no surface passes: its points
   * only take the middle's sign. Otherwise it goes on with the pieces that can still decide the field
   * in it (the nearest of every branch, and the branches near enough to blend in), half by half.
   */
  const sample = (i0: number, j0: number, k0: number, size: number, list: Piece[]) => {
    const i1 = Math.min(i0 + size, nx)
    const j1 = Math.min(j0 + size, ny)
    const k1 = Math.min(k0 + size, nz)
    if (i0 >= i1 || j0 >= j1 || k0 >= k1) return
    const half = (cell * Math.hypot(i1 - 1 - i0, j1 - 1 - j0, k1 - 1 - k0)) / 2
    const cx = box.min.x + ((i0 + i1 - 1) / 2) * cell
    const cy = box.min.y + ((j0 + j1 - 1) / 2) * cell
    const cz = box.min.z + ((k0 + k1 - 1) / 2) * cell
    const f = field(cx, cy, cz, list)
    if (Math.abs(f) > SLOPE * (half + corner)) {
      if (f < 0) for (let k = k0; k < k1; k++) for (let j = j0; j < j1; j++) values.fill(f, at(i0, j, k), at(i1, j, k))
      return
    }
    // The pieces that matter in this block, judged from its middle.
    const dists = list.map(reach)
    nearestOf.fill(Infinity)
    for (let n = 0; n < list.length; n++) nearestOf[list[n].branch] = Math.min(nearestOf[list[n].branch], dists[n])
    const nearest = Math.min(...nearestOf)
    const slack = 2 * SLOPE * half
    const near = list.filter((s, n) => nearestOf[s.branch] <= nearest + slack + 3 * blend && dists[n] <= nearestOf[s.branch] + slack)
    if (size <= LEAF) {
      for (let k = k0; k < k1; k++)
        for (let j = j0; j < j1; j++)
          for (let i = i0; i < i1; i++) values[at(i, j, k)] = field(box.min.x + i * cell, box.min.y + j * cell, box.min.z + k * cell, near)
      sampled[i0 / LEAF + bx * (j0 / LEAF + by * (k0 / LEAF))] = 1
      return
    }
    const h = size / 2
    for (let c = 0; c < 8; c++) sample(i0 + (c & 1) * h, j0 + ((c >> 1) & 1) * h, k0 + ((c >> 2) & 1) * h, h, near)
  }
  if (dense) {
    for (let k = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) values[at(i, j, k)] = field(box.min.x + i * cell, box.min.y + j * cell, box.min.z + k * cell, pieces)
    sampled.fill(1)
  } else {
    for (let k = 0; k < nz; k += ROOT) for (let j = 0; j < ny; j += ROOT) for (let i = 0; i < nx; i += ROOT) sample(i, j, k, ROOT, pieces)
  }
  /** Calls `visit` for every grid point from `from` on that lies in a sampled block, in the grid's own order. */
  const eachSampled = (from: number, toX: number, toY: number, toZ: number, visit: (i: number, j: number, k: number) => void) => {
    for (let k = from; k < toZ; k++)
      for (let j = from; j < toY; j++) {
        const row = bx * (Math.floor(j / LEAF) + by * Math.floor(k / LEAF))
        for (let b = 0; b < bx; b++) {
          if (!sampled[row + b]) continue
          const end = Math.min((b + 1) * LEAF, toX)
          for (let i = Math.max(b * LEAF, from); i < end; i++) visit(i, j, k)
        }
      }
  }

  // Surface nets: one vertex per cell the surface passes through, at the mean of its edge crossings.
  // (Vertex numbers are kept one higher, so an untouched cell reads as "none".)
  const vertexOf = new Int32Array((nx - 1) * (ny - 1) * (nz - 1))
  const cellAt = (i: number, j: number, k: number) => i + (nx - 1) * (j + (ny - 1) * k)
  const positions: number[] = []
  const corners = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ]
  const cornerAt = corners.map(([x, y, z]) => at(x, y, z))
  const edges = [
    [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
  ]
  const v = new Float32Array(8)
  eachSampled(0, nx - 1, ny - 1, nz - 1, (i, j, k) => {
    const base = at(i, j, k)
    let inside = 0
    for (let c = 0; c < 8; c++) {
      v[c] = values[base + cornerAt[c]]
      if (v[c] < 0) inside++
    }
    if (inside === 0 || inside === 8) return
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
    positions.push(box.min.x + (i + sx / n) * cell, box.min.y + (j + sy / n) * cell, box.min.z + (k + sz / n) * cell)
    vertexOf[cellAt(i, j, k)] = positions.length / 3
  })

  // One quad for every grid edge the surface crosses, joining the four cells around it.
  const index: number[] = []
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    if (flip) index.push(a, c, b, a, d, c)
    else index.push(a, b, c, a, c, d)
  }
  const vertex = (i: number, j: number, k: number) => vertexOf[cellAt(i, j, k)] - 1
  eachSampled(1, nx - 1, ny - 1, nz - 1, (i, j, k) => {
    const here = values[at(i, j, k)] < 0
    if (here !== values[at(i + 1, j, k)] < 0) quad(vertex(i, j - 1, k - 1), vertex(i, j, k - 1), vertex(i, j, k), vertex(i, j - 1, k), here)
    if (here !== values[at(i, j + 1, k)] < 0) quad(vertex(i - 1, j, k - 1), vertex(i - 1, j, k), vertex(i, j, k), vertex(i, j, k - 1), here)
    if (here !== values[at(i, j, k + 1)] < 0) quad(vertex(i - 1, j - 1, k), vertex(i, j - 1, k), vertex(i, j, k), vertex(i - 1, j, k), here)
  })

  // Drop the flat cap at the top.
  const kept: number[] = []
  const capY = top - cell * 0.75
  for (let t = 0; t < index.length; t += 3) {
    if (positions[index[t] * 3 + 1] > capY && positions[index[t + 1] * 3 + 1] > capY && positions[index[t + 2] * 3 + 1] > capY) continue
    kept.push(index[t], index[t + 1], index[t + 2])
  }

  // Smoothing takes out the grid's stair steps (the open rim stays in place).
  const count = positions.length / 3
  const links: number[][] = Array.from({ length: count }, () => [])
  const link = (a: number, b: number) => {
    if (!links[a].includes(b)) links[a].push(b)
  }
  for (let t = 0; t < kept.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = kept[t + e]
      const b = kept[t + ((e + 1) % 3)]
      link(a, b)
      link(b, a)
    }
  let cur = Float32Array.from(positions)
  let next = new Float32Array(cur.length)
  // Taubin smoothing: alternating shrink and inflate steps smooth without thinning the tube.
  for (let it = 0; it < 24; it++) {
    const f = it % 2 === 0 ? 0.6 : -0.63
    for (let q = 0; q < count; q++) {
      const near = links[q]
      if (!near.length || positions[q * 3 + 1] > capY) {
        next[q * 3] = cur[q * 3]
        next[q * 3 + 1] = cur[q * 3 + 1]
        next[q * 3 + 2] = cur[q * 3 + 2]
        continue
      }
      for (let a = 0; a < 3; a++) {
        let s = 0
        for (let o = 0; o < near.length; o++) s += cur[near[o] * 3 + a]
        next[q * 3 + a] = cur[q * 3 + a] + (s / near.length - cur[q * 3 + a]) * f
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
