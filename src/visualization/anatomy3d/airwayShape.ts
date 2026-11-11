import * as THREE from 'three'
import { airwayTree, type Branch } from './airwayTree'

/**
 * Windpipe and main bronchi, drawn as one smooth piece instead of the model's
 * separate, overlapping trachea and bronchi (world metres, along the model's
 * airway; the bronchi end inside the lungs, which hide their ends).
 */
const AIRWAY_TOP = 1.4606
/**
 * The nasal cavity, front to back from its back end, as the model has it (world metres): depth z, floor,
 * roof and half its width. The airway is built along it, so nose, throat and windpipe are one surface
 * with the same lines everywhere, instead of the model's nasal cavity with its folds and inner walls.
 */
const NOSE_PROFILE: [z: number, floor: number, roof: number, w: number][] = [
  [0.053, 1.554, 1.5928, 0.0102],
  [0.057, 1.5544, 1.5942, 0.0101],
  [0.061, 1.5546, 1.5952, 0.0101],
  [0.065, 1.5545, 1.5961, 0.01],
  [0.069, 1.5545, 1.5968, 0.0098],
  [0.073, 1.5546, 1.5965, 0.0098],
  [0.077, 1.5545, 1.5955, 0.01],
  [0.081, 1.554, 1.5935, 0.0107],
  [0.085, 1.553, 1.592, 0.0114],
  [0.089, 1.552, 1.59, 0.0116],
  [0.093, 1.5512, 1.5878, 0.0112],
  [0.097, 1.5513, 1.5826, 0.0102],
  [0.101, 1.5514, 1.5773, 0.0085],
]
/** The nose's front, slanting down under the bridge: the airway is cut off beyond it (see `Branch.clip`). */
const NOSE_FRONT = { point: [0, 1.5878, 0.093] as [number, number, number], normal: [0, 0.39, 0.92] as [number, number, number] }
/** Where the throat's bend ends at the back of the nose: middle height, half its height, half its width. */
const NOSE_OPENING = { y: 1.5722, r: 0.0198, w: 0.0105 }
/** Radii of the throat's bend forward into the nose (world metres): its front wall's and its back wall's. */
const THROAT_INNER = 0.014
const THROAT_OUTER = 0.04
const TRACHEA_R = 0.0105
const CARINA: [number, number, number] = [-0.0005, 1.362, -0.013]
export const AIRWAY_BRANCHES: Branch[] = [
  { points: [[0, AIRWAY_TOP + 0.004, 0.01], [-0.0004, 1.4257, 0.005], [-0.0004, 1.3904, -0.0033], CARINA], r0: 0.0105, r1: 0.0095 },
  // Up the back of the throat and forward through the nose, so nose and windpipe are one airway
  // without mouth or throat (see `throat`).
  throat(),
  { points: [CARINA, [0.027, 1.335, -0.018], [0.044, 1.321, -0.021], [0.062, 1.306, -0.02]], r0: 0.0078, r1: 0.0058 },
  { points: [CARINA, [-0.014, 1.348, -0.017], [-0.031, 1.318, -0.021], [-0.044, 1.297, -0.026]], r0: 0.0078, r1: 0.0058 },
]

/**
 * Throat and nose: straight up from the windpipe at its width, then in one round bend forward into the
 * back of the nose, widening on the way to the nose's size (`NOSE_OPENING`), and on along the nose
 * (`NOSE_PROFILE`).
 * The bend is drawn by its two walls, each a quarter circle: the front wall turns from the windpipe's
 * front into the nose's floor, the back wall from the windpipe's back into the nose's roof. The tube
 * runs midway between them, as wide as they are apart.
 */
function throat(): Branch {
  const y0 = AIRWAY_TOP + 0.004
  const z0 = 0.01
  const backZ = 0.0125
  const floor = NOSE_OPENING.y - NOSE_OPENING.r
  const roof = NOSE_OPENING.y + NOSE_OPENING.r
  const inner = { y: floor - THROAT_INNER, z: backZ + TRACHEA_R + THROAT_INNER, r: THROAT_INNER }
  const outer = { y: roof - THROAT_OUTER, z: backZ - TRACHEA_R + THROAT_OUTER, r: THROAT_OUTER }
  const wall = (c: { y: number; z: number; r: number }, a: number) => [c.y + c.r * Math.sin(a), c.z - c.r * Math.cos(a)]
  const points: [number, number, number][] = []
  const radii: number[] = []
  const widths: number[] = []
  const at = (y: number, z: number, r: number, grow: number) => {
    points.push([0, y, z])
    radii.push(r)
    widths.push(TRACHEA_R + (NOSE_OPENING.w - TRACHEA_R) * THREE.MathUtils.smoothstep(grow, 0, 1))
  }
  // Up the back of the neck to where the bend starts.
  const bendY = (wall(inner, 0)[0] + wall(outer, 0)[0]) / 2
  const steps = 8
  for (let i = 0; i < steps; i++) {
    const f = i / steps
    at(y0 + (bendY - y0) * f, z0 + (backZ - z0) * f, TRACHEA_R, 0)
  }
  // Round the bend, midway between its walls.
  const arc = 14
  for (let i = 0; i <= arc; i++) {
    const a = ((Math.PI / 2) * i) / arc
    const [yi, zi] = wall(inner, a)
    const [yo, zo] = wall(outer, a)
    at((yi + yo) / 2, (zi + zo) / 2, Math.hypot(yo - yi, zo - zi) / 2, i / arc)
  }
  // On through the nose to its front, where it ends round inside the nose.
  for (const [z, floor, roof, w] of NOSE_PROFILE) {
    points.push([0, (floor + roof) / 2, z])
    radii.push((roof - floor) / 2)
    widths.push(w)
  }
  return { points, r0: TRACHEA_R, r1: NOSE_OPENING.r, radii, widths, clip: NOSE_FRONT }
}

/**
 * The airway's surface in world metres: nose, throat, windpipe and both main bronchi as one piece
 * (see `airwayTree`). Up to 1.7 m, where it is cut flat: above everything, so the nose stays whole.
 */
export const airwaySurface = (): THREE.BufferGeometry => airwayTree(AIRWAY_BRANCHES, { top: 1.7 })
