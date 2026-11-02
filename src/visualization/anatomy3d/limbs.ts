import * as THREE from 'three'

/**
 * Gives an arm or leg mesh an `axis` attribute: for each vertex, the centre (x, z) of its limb at
 * that height, so the skin lines can run round each limb (see `limb` in stripes.ts). The limbs come
 * in pairs left and right of x = 0; each is cut into thin slices along its height and the centre of
 * each slice is smoothed with its neighbours, so the lines stay calm where the limb's girth changes.
 * Where a limb meets the trunk its slices are only part of a ring (the open top of an arm); their
 * centre would sit off the limb's axis and pull the lines into a star, so they take the centre of
 * the nearest whole slice below instead.
 */
export function addLimbAxis(geometry: THREE.BufferGeometry, slice = 0.01): void {
  const pos = geometry.getAttribute('position')
  const n = pos.count
  const key = (i: number) => (pos.getX(i) >= 0 ? 1 : -1) * (Math.round(pos.getY(i) / slice) + 100000)
  const sums = new Map<number, { x: number; z: number; n: number }>()
  for (let i = 0; i < n; i++) {
    const k = key(i)
    const s = sums.get(k) ?? { x: 0, z: 0, n: 0 }
    s.x += pos.getX(i)
    s.z += pos.getZ(i)
    s.n++
    sums.set(k, s)
  }
  // A slice is whole when it holds at least half as many vertices as a typical slice of its side.
  const whole = new Set<number>()
  for (const side of [1, -1]) {
    const counts = [...sums.entries()].filter(([k]) => Math.sign(k) === side).map(([, s]) => s.n).sort((a, b) => a - b)
    const typical = counts[Math.floor(counts.length / 2)] ?? 0
    for (const [k, s] of sums) if (Math.sign(k) === side && s.n >= typical * 0.5) whole.add(k)
  }
  // Partial slices above the highest whole one borrow that one's centre.
  const top = new Map<number, number>()
  for (const k of whole) top.set(Math.sign(k), Math.max(top.get(Math.sign(k)) ?? -Infinity, Math.abs(k)))
  const source = (k: number) => {
    const t = top.get(Math.sign(k))
    return t !== undefined && Math.abs(k) > t ? Math.sign(k) * t : k
  }
  const centre = new Map<number, [number, number]>()
  for (const k of sums.keys()) {
    let x = 0
    let z = 0
    let w = 0
    for (let d = -5; d <= 5; d++) {
      const s = sums.get(k + d * Math.sign(k))
      if (!s) continue
      const wt = s.n * (6 - Math.abs(d))
      x += (s.x / s.n) * wt
      z += (s.z / s.n) * wt
      w += wt
    }
    centre.set(k, [x / w, z / w])
  }
  const axis = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    const [x, z] = centre.get(source(key(i)))!
    axis[i * 2] = x
    axis[i * 2 + 1] = z
  }
  geometry.setAttribute('axis', new THREE.BufferAttribute(axis, 2))
}
