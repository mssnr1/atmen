import * as THREE from 'three'

export type LungSource = { geometry: THREE.BufferGeometry; matrixWorld: THREE.Matrix4; gain: number }

/**
 * A simplified diaphragm: one smooth curved sheet a little below both lungs,
 * following their undersides, smoothed into a gentle double dome that droops at its rim. It replaces the
 * anatomical diaphragm, whose folds doubled up in the front view. Its breath
 * morph is taken from the lungs themselves (their underside at full inhale,
 * runtime gain included), so the sheet moves down with the lung bases and
 * seems to pull them down. Built in world space; the caller moves it into the
 * frame of the object it is added to.
 */
export function simplifiedDiaphragm(lungs: LungSource[], { gap = 0.012, droop = 0.035, rings = 22, segments = 72 } = {}): THREE.BufferGeometry | null {
  const rest: THREE.Vector3[] = []
  const full: THREE.Vector3[] = []
  for (const l of lungs) {
    const pos = l.geometry.attributes.position
    const delta = l.geometry.morphAttributes.position?.[0]
    if (!pos) continue
    const p = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i)
      rest.push(p.clone().applyMatrix4(l.matrixWorld))
      if (delta) p.x += delta.getX(i) * l.gain, p.y += delta.getY(i) * l.gain, p.z += delta.getZ(i) * l.gain
      full.push(p.clone().applyMatrix4(l.matrixWorld))
    }
  }
  if (!rest.length) return null

  // The footprint of both lungs seen from above, with a margin for the rim to droop into.
  const box = new THREE.Box3().setFromPoints(rest)
  const margin = 0.02
  const x0 = box.min.x - margin
  const z0 = box.min.z - margin
  const w = box.max.x - box.min.x + 2 * margin
  const d = box.max.z - box.min.z + 2 * margin
  const NX = 56
  const NZ = 36
  const cell = (x: number, z: number) => {
    const i = THREE.MathUtils.clamp(Math.floor(((x - x0) / w) * NX), 0, NX - 1)
    const j = THREE.MathUtils.clamp(Math.floor(((z - z0) / d) * NZ), 0, NZ - 1)
    return j * NX + i
  }
  const near = (k: number) => {
    const i = k % NX
    const j = Math.floor(k / NX)
    const out: number[] = []
    if (i > 0) out.push(k - 1)
    if (i < NX - 1) out.push(k + 1)
    if (j > 0) out.push(k - NX)
    if (j < NZ - 1) out.push(k + NX)
    return out
  }

  // How far out from the middle each column lies (0 in the middle, 1 at the sheet's elliptic rim), for the droop.
  const out = new Float32Array(NX * NZ)
  for (let k = 0; k < out.length; k++) {
    const u = (((k % NX) + 0.5) / NX) * 2 - 1
    const v = ((Math.floor(k / NX) + 0.5) / NZ) * 2 - 1
    out[k] = Math.min(1, Math.hypot(u, v))
  }

  // The height of the sheet in each column: just below the lowest lung point, gaps filled, smoothed.
  const surface = (points: THREE.Vector3[]) => {
    const y = new Float32Array(NX * NZ).fill(NaN)
    for (const p of points) {
      const k = cell(p.x, p.z)
      if (!(p.y >= y[k])) y[k] = p.y
    }
    for (let pass = 0; pass < 200; pass++) {
      let empty = 0
      const next = Float32Array.from(y)
      for (let k = 0; k < y.length; k++) {
        if (!Number.isNaN(y[k])) continue
        let s = 0
        let n = 0
        for (const o of near(k)) if (!Number.isNaN(y[o])) (s += y[o]), n++
        if (n) next[k] = s / n
        else empty++
      }
      y.set(next)
      if (!empty) break
    }
    let cur = y
    for (let it = 0; it < 120; it++) {
      const next = new Float32Array(cur.length)
      for (let k = 0; k < cur.length; k++) {
        let s = 0
        const n = near(k)
        for (const o of n) s += cur[o]
        next[k] = cur[k] * 0.5 + (s / n.length) * 0.5
      }
      cur = next
    }
    for (let k = 0; k < cur.length; k++) cur[k] -= gap + droop * out[k] ** 3
    return cur
  }
  const restY = surface(rest)
  const fullY = surface(full)
  const sample = (field: Float32Array, x: number, z: number) => {
    const fx = THREE.MathUtils.clamp(((x - x0) / w) * NX - 0.5, 0, NX - 1.001)
    const fz = THREE.MathUtils.clamp(((z - z0) / d) * NZ - 0.5, 0, NZ - 1.001)
    const i = Math.floor(fx)
    const j = Math.floor(fz)
    const u = fx - i
    const v = fz - j
    const at = (a: number, b: number) => field[Math.min(b, NZ - 1) * NX + Math.min(a, NX - 1)]
    return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v
  }

  // An elliptic sheet over the footprint: rings out from the middle, so its rim is smooth.
  const cx = x0 + w / 2
  const cz = z0 + d / 2
  const positions: number[] = []
  const deltas: number[] = []
  const index: number[] = []
  const vertex = (x: number, z: number) => {
    const y = sample(restY, x, z)
    positions.push(x, y, z)
    deltas.push(0, sample(fullY, x, z) - y, 0)
  }
  vertex(cx, cz)
  for (let r = 1; r <= rings; r++) {
    const f = r / rings
    for (let s = 0; s < segments; s++) {
      const t = (s / segments) * Math.PI * 2
      vertex(cx + Math.cos(t) * (w / 2) * f, cz + Math.sin(t) * (d / 2) * f)
    }
  }
  const ring = (r: number, s: number) => (r === 0 ? 0 : 1 + (r - 1) * segments + (s % segments))
  for (let s = 0; s < segments; s++) index.push(0, ring(1, s + 1), ring(1, s))
  for (let r = 1; r < rings; r++)
    for (let s = 0; s < segments; s++) {
      const a = ring(r, s)
      const b = ring(r, s + 1)
      const c = ring(r + 1, s + 1)
      const e = ring(r + 1, s)
      index.push(a, b, c, a, c, e)
    }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  const target = new THREE.Float32BufferAttribute(deltas, 3)
  target.name = 'Inhale'
  geometry.morphAttributes.position = [target]
  geometry.morphTargetsRelative = true
  return geometry
}

/** Moves a world-space geometry with a relative morph into the local frame of `parent`. */
export function intoFrame(geometry: THREE.BufferGeometry, parent: THREE.Object3D) {
  const inv = parent.matrixWorld.clone().invert()
  const linear = new THREE.Matrix3().setFromMatrix4(inv)
  geometry.attributes.position.applyMatrix4(inv)
  for (const t of geometry.morphAttributes.position ?? []) (t as THREE.BufferAttribute).applyMatrix3(linear)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
