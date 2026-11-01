import * as THREE from 'three'

/** The mouth: where the lips meet (world metres) and the half size of the slit between them. */
export const LIPS = { y: 1.515, z: 0.08, halfWidth: 0.022, halfHeight: 0.007 }

type Hole = { verts: number[]; center: THREE.Vector3; normal: THREE.Vector3; radius: number; aspect: number; length: number }

const smooth = (t: number) => {
  const x = Math.min(Math.max(t, 0), 1)
  return x * x * (3 - 2 * x)
}

/**
 * A calm face for the end of the exercise, shaped from the head's own skin:
 * the eyelids close (the upper lid comes down over the eye opening to meet
 * the lower one, which rises a little; the filled opening becomes a closed lid
 * over the eyeball) and the corners of the mouth lift into a soft smile.
 *
 * Adds it as a relative morph target `Calm` (positions and normals) to a head
 * geometry with its holes filled (see `withHolesFilled`). `matrix` is the
 * head's world matrix: the shaping is worked out in world metres.
 */
export function addCalmMorph(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4): boolean {
  const holes = (geometry.userData.holes ?? []) as Hole[]
  const baseCount = (geometry.userData.baseCount as number | undefined) ?? 0
  const pos = geometry.attributes.position as THREE.BufferAttribute
  if (!pos || !holes.length) return false
  const scale = new THREE.Vector3().setFromMatrixScale(matrix).x
  const inv = matrix.clone().invert()
  const n = pos.count
  const world = Array.from({ length: n }, (_, i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(matrix))
  const moved = world.map((p) => p.clone())

  // The eye openings: the two wide, forward-facing loops between nose and brows.
  const eyes = holes
    .map((h) => ({ ...h, at: h.center.clone().applyMatrix4(matrix), r: h.radius * scale }))
    .filter((h) => h.r > 0.006 && h.aspect < 3 && h.at.z > 0.05 && Math.abs(h.at.x) > 0.015 && h.at.y > LIPS.y + 0.04 && h.at.y < LIPS.y + 0.09)
  const ring = new Set<number>()
  for (const e of eyes) {
    const loop = e.verts.map((i) => world[i])
    const a = Math.max(...loop.map((p) => Math.abs(p.x - e.at.x))) * 1.02
    const top = Math.max(...loop.map((p) => p.y - e.at.y))
    const bottom = Math.min(...loop.map((p) => p.y - e.at.y))
    const front = loop.reduce((s, p) => s + p.z, 0) / loop.length
    // Height of the upper and lower edge of the opening across it, and where the closed lids meet (low, as in sleep).
    const across = (dx: number) => Math.sqrt(Math.max(0, 1 - (dx / a) ** 2))
    const upper = (dx: number) => top * across(dx)
    const lower = (dx: number) => bottom * across(dx)
    const seam = (dx: number) => lower(dx) + 0.3 * (upper(dx) - lower(dx))
    const bandUp = e.r * 1.4
    const bandDown = e.r * 0.7
    e.verts.forEach((i) => ring.add(i))
    for (let i = 0; i < n; i++) {
      const p = world[i]
      const dx = p.x - e.at.x
      const dy = p.y - e.at.y
      if (Math.abs(dx) > a * 1.25 || dy > top + bandUp || dy < bottom - bandDown || p.z < e.at.z - 0.03) continue
      const fade = 1 - smooth((Math.abs(dx) - a * 0.9) / (a * 0.35))
      if (i >= baseCount) {
        // The fill inside the opening: becomes the closed lid, a gentle curve over the eyeball.
        // The seam between the lids sits a little in: a fine crease the lines dip into.
        moved[i].set(p.x, e.at.y + seam(dx), front + 0.001 * across(dx))
        continue
      }
      const s = seam(dx)
      // A fine groove where the lids meet, so the closed eye shows as a curve in the lines.
      moved[i].z -= 0.0025 * Math.exp(-(((dy - s) / 0.0028) ** 2)) * fade * across(dx * 0.9)
      if (dy >= s) {
        // Upper lid: its edge comes down to the seam, the skin above follows less and less.
        const u = (dy - upper(dx)) / bandUp
        moved[i].y -= (upper(dx) - s) * (1 - smooth(u)) * fade * (dy >= upper(dx) - 1e-4 || ring.has(i) ? 1 : 0)
        // The lid rounds forward over the eye as it closes, fullest just above the seam.
        moved[i].z += 0.0045 * (1 - smooth(u)) * fade * across(dx)
      } else {
        // Lower lid: rises a touch to meet it.
        const u = (lower(dx) - dy) / bandDown
        moved[i].y += (s - lower(dx)) * (1 - smooth(u)) * fade * (dy <= lower(dx) + 1e-4 || ring.has(i) ? 1 : 0)
        moved[i].z += 0.002 * (1 - smooth(u)) * fade * across(dx)
      }
    }
  }

  // The smile: a soft groove along a curve through the lips whose ends rise, plus the corners lifting a
  // little and the cheeks rounding. Where the skin turns into the groove the lines darken (they are
  // drawn stronger where the surface turns away), so the smile shows in the lines themselves.
  const SMILE_HALF = LIPS.halfWidth * 1.35
  const smileY = (x: number) => LIPS.y - 0.0025 + 0.009 * (x / SMILE_HALF) ** 2
  for (let i = 0; i < n; i++) {
    const p = world[i]
    if (p.z < 0.04 || Math.abs(p.y - LIPS.y) > 0.045) continue
    const along = 1 - smooth((Math.abs(p.x) - SMILE_HALF * 0.85) / (SMILE_HALF * 0.3))
    const groove = Math.exp(-(((p.y - smileY(p.x)) / 0.0032) ** 2)) * along
    moved[i].z -= 0.005 * groove
    for (const side of [-1, 1]) {
      const cx = side * (LIPS.halfWidth + 0.002)
      const w = Math.exp(-(((p.x - cx) / 0.011) ** 2) - ((p.y - LIPS.y) / 0.011) ** 2)
      const cheek = Math.exp(-(((p.x - side * 0.04) / 0.016) ** 2) - ((p.y - (LIPS.y + 0.022)) / 0.014) ** 2)
      moved[i].y += 0.003 * w + 0.0015 * cheek
      moved[i].x += side * 0.0012 * w
      moved[i].z += 0.0025 * cheek
    }
  }

  // Relative morph: local-space differences, for positions and for normals (so the rim light follows the new shape).
  const delta = new Float32Array(n * 3)
  const local = new THREE.Vector3()
  const shaped = geometry.clone()
  const shapedPos = shaped.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < n; i++) {
    local.copy(moved[i]).applyMatrix4(inv)
    shapedPos.setXYZ(i, local.x, local.y, local.z)
    delta[i * 3] = local.x - pos.getX(i)
    delta[i * 3 + 1] = local.y - pos.getY(i)
    delta[i * 3 + 2] = local.z - pos.getZ(i)
  }
  shaped.computeVertexNormals()
  const normals = geometry.attributes.normal as THREE.BufferAttribute | undefined
  const before = geometry.clone()
  before.computeVertexNormals()
  const nd = new Float32Array(n * 3)
  const sn = shaped.attributes.normal
  const bn = before.attributes.normal
  for (let i = 0; i < n * 3; i++) nd[i] = sn.array[i] - bn.array[i]
  shaped.dispose()
  before.dispose()
  const dp = new THREE.Float32BufferAttribute(delta, 3)
  dp.name = 'Calm'
  geometry.morphAttributes.position = [dp]
  if (normals) {
    const dn = new THREE.Float32BufferAttribute(nd, 3)
    dn.name = 'Calm'
    geometry.morphAttributes.normal = [dn]
  }
  geometry.morphTargetsRelative = true
  geometry.userData.calmMorph = true
  return true
}
