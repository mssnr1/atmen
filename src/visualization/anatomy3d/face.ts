import * as THREE from 'three'
import { LIPS } from './mouth'

type Hole = { center: THREE.Vector3; normal: THREE.Vector3; radius: number; aspect: number; length: number }

/** Thickness of the drawn lines and how far they sit in front of the skin, in metres. */
const LINE_R = 0.0009
const LIFT = 0.0015

/**
 * The calm face shown after the exercise: closed eyes (a lid line curving down
 * across each eye socket) and a gentle smile at the lips. Each line is laid
 * onto the head's surface by casting rays from the front, so it follows the
 * face. Takes the head mesh with holes filled (see `withHolesFilled`) and its
 * world matrix up to date; returns the lines in world coordinates.
 */
export function faceLines(head: THREE.Mesh): THREE.BufferGeometry[] {
  const holes = (head.geometry.userData.holes ?? []) as Hole[]
  const m = head.matrixWorld
  const scale = head.getWorldScale(new THREE.Vector3()).x
  const world = holes
    .filter((h) => h.length * scale < 0.15)
    .map((h) => ({ ...h, at: h.center.clone().applyMatrix4(m), r: h.radius * scale }))
  // The eyes: the two round, forward-facing holes either side of the midline above the nose.
  const eyes = world
    .filter((h) => h.aspect < 2.2 && h.r > 0.006 && h.at.y > LIPS.y + 0.04 && Math.abs(h.at.x) > 0.015)
    .sort((a, b) => b.at.z - a.at.z)
    .slice(0, 2)
  const ray = new THREE.Raycaster()
  const down = new THREE.Vector3(0, 0, -1)
  const normal = new THREE.Matrix3().getNormalMatrix(m)
  const onSkin = (x: number, y: number): THREE.Vector3 | null => {
    ray.set(new THREE.Vector3(x, y, 0.5), down)
    const hit = ray.intersectObject(head, false)[0]
    if (!hit) return null
    const n = hit.face ? hit.face.normal.clone().applyMatrix3(normal).normalize() : new THREE.Vector3(0, 0, 1)
    if (n.z < 0) n.negate()
    return hit.point.addScaledVector(n, LIFT)
  }
  const line = (pts: (THREE.Vector3 | null)[]) => {
    const ok = pts.filter((p): p is THREE.Vector3 => !!p)
    return ok.length > 3 ? new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ok), 32, LINE_R, 6, false) : null
  }
  const out: THREE.BufferGeometry[] = []
  const steps = 14
  for (const e of eyes) {
    // A lid line, slightly below the middle of the socket, its ends lifting a little: a closed, relaxed eye.
    const half = e.r * 1.05
    const pts = Array.from({ length: steps + 1 }, (_, i) => {
      const t = (i / steps) * 2 - 1
      return onSkin(e.at.x + t * half, e.at.y - e.r * 0.15 - e.r * 0.28 * (1 - t * t))
    })
    const g = line(pts)
    if (g) out.push(g)
  }
  // The smile: a soft curve along the lips with its corners raised.
  const lips = world.find((h) => h.aspect >= 2.2 && Math.abs(h.at.y - LIPS.y) < 0.015 && Math.abs(h.at.x) < 0.01)
  const cx = lips?.at.x ?? 0
  const cy = lips?.at.y ?? LIPS.y
  const half = LIPS.halfWidth * 1.25
  const smile = Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * 2 - 1
    return onSkin(cx + t * half, cy - 0.003 + 0.007 * t * t * (0.6 + 0.4 * t * t))
  })
  const g = line(smile)
  if (g) out.push(g)
  return out
}
