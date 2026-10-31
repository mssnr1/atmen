import * as THREE from 'three'

/**
 * Each lung in the model is made of separate lobes, and where two lobes meet
 * their inner faces (the fissures) show through the striped, see-through lung
 * as planes running across it. This returns an index without those faces: a
 * face is dropped when the point just in front of it lies inside another
 * lobe. The outer skin looks into the open and is kept, so the outline stays
 * closed.
 */
export function withoutFissures(geometry: THREE.BufferGeometry, scale: number, reach = 0.008): THREE.BufferAttribute | null {
  const index = geometry.index
  const pos = geometry.attributes.position
  const nrm = geometry.attributes.normal
  if (!index || !pos || !nrm) return null
  const n = pos.count

  // Lobes are the connected pieces of the mesh.
  const parent = new Int32Array(n).map((_, i) => i)
  const find = (x: number) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  for (let i = 0; i < index.count; i += 3) {
    const a = find(index.getX(i))
    const b = find(index.getX(i + 1))
    const c = find(index.getX(i + 2))
    parent[a] = b
    parent[find(c)] = find(b)
  }
  const lobe = new Int32Array(n)
  for (let i = 0; i < n; i++) lobe[i] = find(i)

  // Positions may be quantized; `scale` turns local units into metres.
  const tris = index.count / 3
  const tmp = new THREE.Vector3()
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const tri = (t: number) => {
    a.fromBufferAttribute(pos, index.getX(t * 3))
    b.fromBufferAttribute(pos, index.getX(t * 3 + 1))
    c.fromBufferAttribute(pos, index.getX(t * 3 + 2))
  }

  // Triangles bucketed by the (y, z) cells they cover, for rays cast along +x.
  const cell = 0.01 / scale
  const columns = new Map<string, number[]>()
  for (let t = 0; t < tris; t++) {
    tri(t)
    const y0 = Math.floor(Math.min(a.y, b.y, c.y) / cell)
    const y1 = Math.floor(Math.max(a.y, b.y, c.y) / cell)
    const z0 = Math.floor(Math.min(a.z, b.z, c.z) / cell)
    const z1 = Math.floor(Math.max(a.z, b.z, c.z) / cell)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++) {
        const k = `${y},${z}`
        const list = columns.get(k)
        if (list) list.push(t)
        else columns.set(k, [t])
      }
  }
  const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(1, 0, 0))
  const hit = new THREE.Vector3()
  /** Whether point q lies inside a lobe other than `own` (odd number of crossings with that lobe). */
  const insideOther = (q: THREE.Vector3, own: number) => {
    ray.origin.copy(q)
    const crossings = new Map<number, number>()
    for (const t of columns.get(`${Math.floor(q.y / cell)},${Math.floor(q.z / cell)}`) ?? []) {
      const l = lobe[index.getX(t * 3)]
      if (l === own) continue
      tri(t)
      if (ray.intersectTriangle(a, b, c, false, hit)) crossings.set(l, (crossings.get(l) ?? 0) + 1)
    }
    for (const n of crossings.values()) if (n % 2 === 1) return true
    return false
  }

  // A face is inner when the point just in front of it lies inside another
  // lobe: the fissure faces look into the neighbouring lobe, while the outer
  // skin looks out into the open.
  const p = new THREE.Vector3()
  const q = new THREE.Vector3()
  const kept: number[] = []
  for (let t = 0; t < tris; t++) {
    const ia = index.getX(t * 3)
    const ib = index.getX(t * 3 + 1)
    const ic = index.getX(t * 3 + 2)
    tri(t)
    p.copy(a).add(b).add(c).divideScalar(3)
    const normal = new THREE.Triangle(a, b, c).getNormal(tmp)
    if (normal.dot(hit.fromBufferAttribute(nrm, ia)) < 0) normal.negate()
    let inner = false
    for (const d of [0.003, reach]) {
      q.copy(p).addScaledVector(normal, d / scale)
      if (insideOther(q, lobe[ia])) {
        inner = true
        break
      }
    }
    if (!inner) kept.push(ia, ib, ic)
  }
  return new THREE.BufferAttribute(n > 65535 ? new Uint32Array(kept) : new Uint16Array(kept), 1)
}
