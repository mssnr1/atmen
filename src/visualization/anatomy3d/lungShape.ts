import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * A simplified, smooth body in place of an anatomical lung. The real lung has
 * lobes, sharp borders and a notch for the heart, and the contour lines turn
 * restless over all of that. This wraps the lung in a soft shell instead: from
 * the lung's centre, every direction of a sphere takes the farthest point of the
 * lung in that direction, and the radii are then smoothed over the sphere. It
 * keeps the lung's size and silhouette (apex, base, width) but none of its
 * detail. The breath morph is rebuilt the same way from the inhaled lung, so the
 * shell breathes like the lung did.
 */
export type Midline = {
  /** The body's midline in the lung's own coordinates, and on which side of it (+1 or -1) the lung lies. */
  x: number
  side: number
  /** How far the shell keeps from the midline, and how softly its inner side flattens, in the lung's own units. */
  gap: number
  soft: number
  /** How much the breath morph is exaggerated at runtime, so the inhaled shell is kept off the midline too. */
  gain: number
}

export function simplifiedLung(source: THREE.BufferGeometry, { detail = 18, smoothing = 80, midline }: { detail?: number; smoothing?: number; midline?: Midline } = {}): THREE.BufferGeometry | null {
  const pos = source.attributes.position
  const delta = source.morphAttributes.position?.[0]
  if (!pos) return null

  // The shell: an evenly divided sphere, its vertices welded so smoothing sees one connected surface.
  let sphere: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail)
  sphere.deleteAttribute('normal')
  sphere.deleteAttribute('uv')
  sphere = mergeVertices(sphere)
  const dirs = sphere.attributes.position
  const count = dirs.count
  const index = sphere.index!

  const neighbours: Set<number>[] = Array.from({ length: count }, () => new Set())
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i)
    const b = index.getX(i + 1)
    const c = index.getX(i + 2)
    neighbours[a].add(b).add(c)
    neighbours[b].add(a).add(c)
    neighbours[c].add(a).add(b)
  }
  const links = neighbours.map((s) => [...s])

  const box = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute)
  const centre = box.getCenter(new THREE.Vector3())

  // Directions are binned on a latitude/longitude grid to find each sphere vertex's farthest lung point quickly.
  const LAT = 48
  const LON = 96
  const bin = (d: THREE.Vector3) => {
    const lat = Math.min(LAT - 1, Math.floor(((Math.acos(THREE.MathUtils.clamp(d.y, -1, 1)) / Math.PI) * LAT)))
    const lon = Math.min(LON - 1, Math.floor(((Math.atan2(d.z, d.x) + Math.PI) / (2 * Math.PI)) * LON))
    return lat * LON + lon
  }

  const shell = (withBreath: boolean) => {
    const far = new Float32Array(LAT * LON)
    const p = new THREE.Vector3()
    const extent = new THREE.Box3()
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i)
      if (withBreath && delta) p.x += delta.getX(i), p.y += delta.getY(i), p.z += delta.getZ(i)
      extent.expandByPoint(p)
      p.sub(centre)
      const r = p.length()
      if (r === 0) continue
      const k = bin(p.divideScalar(r))
      if (r > far[k]) far[k] = r
    }
    const radius = new Float32Array(count)
    const d = new THREE.Vector3()
    for (let i = 0; i < count; i++) radius[i] = far[bin(d.fromBufferAttribute(dirs, i))]
    // Directions the lung has no point in borrow from their neighbours.
    for (let pass = 0; pass < 40; pass++) {
      let empty = 0
      for (let i = 0; i < count; i++) {
        if (radius[i] > 0) continue
        let sum = 0
        let n = 0
        for (const j of links[i]) if (radius[j] > 0) (sum += radius[j]), n++
        if (n) radius[i] = sum / n
        else empty++
      }
      if (!empty) break
    }
    // Smooth the radii over the sphere: the shell keeps the lung's size but loses its detail.
    let next = new Float32Array(count)
    let cur = radius
    for (let it = 0; it < smoothing; it++) {
      for (let i = 0; i < count; i++) {
        let sum = 0
        for (const j of links[i]) sum += cur[j]
        next[i] = cur[i] * 0.5 + (sum / links[i].length) * 0.5
      }
      ;[cur, next] = [next, cur]
    }
    const out = new Float32Array(count * 3)
    const got = new THREE.Box3()
    for (let i = 0; i < count; i++) {
      d.fromBufferAttribute(dirs, i).multiplyScalar(cur[i]).add(centre)
      got.expandByPoint(d)
      out.set([d.x, d.y, d.z], i * 3)
    }
    // Smoothing rounds off the apex, the base and the sides; stretch each side back to the lung's own reach.
    for (let i = 0; i < out.length; i++) {
      const axis = i % 3
      const c = centre.getComponent(axis)
      const o = out[i] - c
      const want = (o > 0 ? extent.max : extent.min).getComponent(axis) - c
      const have = (o > 0 ? got.max : got.min).getComponent(axis) - c
      if (have !== 0) out[i] = c + o * (want / have)
    }
    return out
  }

  // The smooth shells bulge where the real lungs curve around the heart, and would run into each other.
  // Their inner sides flatten softly short of the midline instead.
  const keepOff = (xyz: Float32Array) => {
    if (!midline) return
    const { x, side, gap, soft } = midline
    for (let i = 0; i < xyz.length; i += 3) {
      const d = (xyz[i] - x) * side - gap
      const kept = (d + Math.sqrt(d * d + soft * soft)) / 2
      xyz[i] = x + side * (gap + kept)
    }
  }

  const rest = shell(false)
  keepOff(rest)
  const geometry = new THREE.BufferGeometry()
  geometry.setIndex(index.clone())
  geometry.setAttribute('position', new THREE.BufferAttribute(rest, 3))
  geometry.computeVertexNormals()
  if (delta) {
    const inhaled = shell(true)
    for (let i = 0; i < inhaled.length; i++) inhaled[i] -= rest[i]
    // Rest and inhaled shell pick their points independently, so the raw difference is uneven;
    // smoothed, the shell swells as one piece and the contour lines stay level.
    let tmp = new Float32Array(inhaled.length)
    let cur = inhaled
    for (let it = 0; it < 60; it++) {
      for (let i = 0; i < count; i++) {
        for (let a = 0; a < 3; a++) {
          let sum = 0
          for (const j of links[i]) sum += cur[j * 3 + a]
          tmp[i * 3 + a] = cur[i * 3 + a] * 0.5 + (sum / links[i].length) * 0.5
        }
      }
      ;[cur, tmp] = [tmp, cur]
    }
    inhaled.set(cur)
    // The rise and fall of the shell depends on height alone, so every contour line stays level as it breathes.
    const BANDS = 24
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i < count; i++) (lo = Math.min(lo, rest[i * 3 + 1])), (hi = Math.max(hi, rest[i * 3 + 1]))
    const band = (y: number) => ((y - lo) / (hi - lo || 1)) * (BANDS - 1)
    const sum = new Float32Array(BANDS)
    const weight = new Float32Array(BANDS)
    for (let i = 0; i < count; i++) {
      const b = band(rest[i * 3 + 1])
      const b0 = Math.floor(b)
      const f = b - b0
      sum[b0] += inhaled[i * 3 + 1] * (1 - f)
      weight[b0] += 1 - f
      if (b0 + 1 < BANDS) (sum[b0 + 1] += inhaled[i * 3 + 1] * f), (weight[b0 + 1] += f)
    }
    for (let i = 0; i < count; i++) {
      const b = band(rest[i * 3 + 1])
      const b0 = Math.floor(b)
      const b1 = Math.min(BANDS - 1, b0 + 1)
      const f = b - b0
      const at = (k: number) => (weight[k] ? sum[k] / weight[k] : 0)
      inhaled[i * 3 + 1] = at(b0) * (1 - f) + at(b1) * f
    }
    if (midline) {
      const full = new Float32Array(rest.length)
      for (let i = 0; i < full.length; i++) full[i] = rest[i] + inhaled[i] * midline.gain
      keepOff(full)
      for (let i = 0; i < full.length; i++) inhaled[i] = (full[i] - rest[i]) / midline.gain
    }
    const target = new THREE.BufferAttribute(inhaled, 3)
    target.name = 'Inhale'
    geometry.morphAttributes.position = [target]
    geometry.morphTargetsRelative = true
  }
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
