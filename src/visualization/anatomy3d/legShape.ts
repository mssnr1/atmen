import * as THREE from 'three'
import { findHoles } from './holes'

/**
 * The legs' skin as the model has it, tidied for the figure:
 *
 * - The model leaves out the genital and anal regions and closes the gap they leave with a cap. Smoothed
 *   over in the build, that cap sank in at its top and hung down below like a small sac. Here the skin
 *   between the legs is relaxed into one calm saddle from the belly to the inner thighs, as on a
 *   mannequin: nothing hangs between the legs and nothing dents in.
 * - A few loose scraps far beside the legs are dropped, and two pinholes where the cap meets the skin
 *   are closed (they showed as bright dots).
 *
 * `matrix` is the legs' world matrix; the shaping works in world metres. Returns a new geometry with
 * positions, normals (smooth across the model's seams) and index.
 */
export function tidiedLegs(source: THREE.BufferGeometry, matrix: THREE.Matrix4, { crotch = CROTCH }: { crotch?: Crotch } = {}): THREE.BufferGeometry {
  const pos = source.attributes.position
  const index = source.index
  const n = pos.count
  const tris = index ? Array.from({ length: index.count }, (_, i) => index.getX(i)) : Array.from({ length: n }, (_, i) => i)

  // One point per place: the model splits its vertices along seams, the shaping must not tear them apart.
  const world: THREE.Vector3[] = []
  const weld = new Int32Array(n)
  const seen = new Map<string, number>()
  const v = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix)
    const key = `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`
    const at = seen.get(key)
    if (at === undefined) {
      seen.set(key, world.length)
      weld[i] = world.length
      world.push(v.clone())
    } else weld[i] = at
  }
  const count = world.length

  // Loose scraps: pieces of surface not joined to the legs themselves.
  const root = new Int32Array(count).map((_, i) => i)
  const find = (a: number): number => {
    while (root[a] !== a) a = root[a] = root[root[a]]
    return a
  }
  for (let t = 0; t < tris.length; t += 3) {
    const a = find(weld[tris[t]])
    root[find(weld[tris[t + 1]])] = a
    root[find(weld[tris[t + 2]])] = a
  }
  const size = new Map<number, number>()
  for (let t = 0; t < tris.length; t += 3) size.set(find(weld[tris[t]]), (size.get(find(weld[tris[t]])) ?? 0) + 1)
  const largest = Math.max(...size.values())
  const kept: number[] = []
  for (let t = 0; t < tris.length; t += 3) if ((size.get(find(weld[tris[t]])) ?? 0) >= largest * 0.05) kept.push(tris[t], tris[t + 1], tris[t + 2])

  // Neighbours on the welded surface.
  const links: number[][] = Array.from({ length: count }, () => [])
  const link = (a: number, b: number) => {
    if (a !== b && !links[a].includes(b)) links[a].push(b)
  }
  for (let t = 0; t < kept.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = weld[kept[t + e]]
      const b = weld[kept[t + ((e + 1) % 3)]]
      link(a, b)
      link(b, a)
    }

  // The skin between the legs relaxes toward its neighbours: fully in the middle, not at all at the rim
  // of the region, so it meets the untouched skin around it without a step.
  const weight = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const p = world[i]
    const d = Math.hypot((p.x - crotch.centre[0]) / crotch.radius[0], (p.y - crotch.centre[1]) / crotch.radius[1], (p.z - crotch.centre[2]) / crotch.radius[2])
    weight[i] = 1 - THREE.MathUtils.smoothstep(d, 0.55, 1)
  }
  let cur = new Float32Array(count * 3)
  world.forEach((p, i) => cur.set([p.x, p.y, p.z], i * 3))
  let next = new Float32Array(cur)
  for (let it = 0; it < crotch.passes; it++) {
    for (let i = 0; i < count; i++) {
      const w = weight[i] * 0.6
      const near = links[i]
      if (!w || !near.length) {
        next[i * 3] = cur[i * 3]
        next[i * 3 + 1] = cur[i * 3 + 1]
        next[i * 3 + 2] = cur[i * 3 + 2]
        continue
      }
      for (let a = 0; a < 3; a++) {
        let s = 0
        for (const o of near) s += cur[o * 3 + a]
        next[i * 3 + a] = cur[i * 3 + a] + (s / near.length - cur[i * 3 + a]) * w
      }
    }
    ;[cur, next] = [next, cur]
  }

  // Pinholes: open triangles a few millimetres across, some only showing once the skin around them has
  // settled. (The open rim at the waist and the soles stay open.) A pinhole can sit in a pinched corner,
  // so one closed can leave another behind it: a few rounds.
  const flat: number[] = []
  for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) flat.push(Math.round(cur[weld[i] * 3 + a] * 1e4) / 1e4)
  for (let round = 0; round < 4; round++) {
    const small = findHoles(flat, kept).filter((hole) => hole.verts.length <= 4 && hole.length < 0.03)
    if (!small.length) break
    for (const hole of small) kept.push(...ringToFan(hole.verts))
  }

  // Back into the legs' own frame.
  const inverse = matrix.clone().invert()
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const k = weld[i]
    v.set(cur[k * 3], cur[k * 3 + 1], cur[k * 3 + 2]).applyMatrix4(inverse)
    out.set([v.x, v.y, v.z], i * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(out, 3))
  geometry.setIndex(kept)
  // Normals smooth across the seams: summed per place, the same for every copy of a vertex there.
  geometry.computeVertexNormals()
  const normal = geometry.attributes.normal
  const sum = new Float32Array(count * 3)
  for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) sum[weld[i] * 3 + a] += normal.getComponent(i, a)
  for (let i = 0; i < n; i++) {
    const k = weld[i]
    v.set(sum[k * 3], sum[k * 3 + 1], sum[k * 3 + 2]).normalize()
    normal.setXYZ(i, v.x, v.y, v.z)
  }
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/** Triangles closing a small hole; its loop runs against the skin's own edges, so they turn the other way round. */
function ringToFan(verts: number[]): number[] {
  const out: number[] = []
  for (let i = 1; i + 1 < verts.length; i++) out.push(verts[0], verts[i + 1], verts[i])
  return out
}

/** Where the skin between the legs is relaxed (world metres): the middle, the half sizes of the region, and how long. */
export type Crotch = { centre: [number, number, number]; radius: [number, number, number]; passes: number }
export const CROTCH: Crotch = { centre: [0, 0.815, -0.01], radius: [0.11, 0.1, 0.15], passes: 120 }
