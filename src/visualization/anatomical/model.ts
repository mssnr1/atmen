/**
 * Simplified anatomical model of the upper body, front view, in a 200 × 320
 * unit coordinate space shared by the SVG body and the WebGL air volume.
 *
 * Mechanics: everything moves from a single variable, lung volume. The
 * diaphragm descends in proportion to volume; the lungs' lower edge rests on
 * the diaphragm, so the lungs lengthen by exactly that amount; the abdominal
 * contents are pushed down and the belly wall out by the same displacement.
 * Air only ever enters the lungs. The abdomen moves because of the diaphragm.
 */

export const VIEW = { width: 200, height: 320 } as const

export type Vec2 = readonly [number, number]

export const HEAD = { cx: 100, cy: 48, rx: 25, ry: 31 } as const
export const NOSTRILS: Vec2 = [100, 66]

/**
 * Centre line of the airway from the nostrils to each lung's hilum. `s` is a
 * path parameter: 0 at the nostrils, 1 at the hilum. Used by the air shader.
 */
export interface AirwayPoint {
  at: Vec2
  s: number
}

export const AIRWAY_TRUNK: AirwayPoint[] = [
  { at: NOSTRILS, s: 0 },
  { at: [100, 52], s: 0.1 }, // up into the nasal cavity
  { at: [100, 62], s: 0.17 }, // back of the nasal cavity
  { at: [100, 80], s: 0.3 }, // pharynx
  { at: [100, 96], s: 0.4 }, // top of the trachea (larynx)
  { at: [100, 146], s: 0.8 }, // carina, where the trachea divides
]
export const CARINA = AIRWAY_TRUNK[AIRWAY_TRUNK.length - 1]
export const HILUM_LEFT: AirwayPoint = { at: [81, 157], s: 1 }
export const HILUM_RIGHT: AirwayPoint = { at: [119, 157], s: 1 }

/** Where outside air gathers before being drawn in, and where exhaled air drifts to. */
export const OUTSIDE_IN: Vec2 = [146, 92]
export const OUTSIDE_OUT: Vec2 = [156, 104]

const DIAPHRAGM_TRAVEL = 11 // downward excursion at full inhale
const DIAPHRAGM = { left: 42, right: 158, edgeY: 226, dome: 20 } as const
const LUNG_TOP = 124
const ABDOMEN_BULGE = 0.9 // belly wall displacement per unit of diaphragm descent

export interface Ellipse {
  cx: number
  cy: number
  rx: number
  ry: number
}

export interface BodyPose {
  volume: number
  /** Diaphragm descent in units. */
  diaphragmDrop: number
  /** Diaphragm height at a given x. */
  diaphragmY: (x: number) => number
  lungLeft: Ellipse
  lungRight: Ellipse
  /** Outward displacement of the belly wall. The abdominal contents sit directly under the diaphragm. */
  abdomenBulge: number
  /** Rib cage widening per side. */
  ribExpansion: number
}

/**
 * Diaphragm height at x. A dome attached to the lower ribs: when it contracts
 * the centre descends the full `drop` while the rim moves less, so it flattens.
 */
export function diaphragmAt(drop: number): (x: number) => number {
  const half = (DIAPHRAGM.right - DIAPHRAGM.left) / 2
  const mid = DIAPHRAGM.left + half
  return (x) => {
    const u = Math.min(Math.abs(x - mid) / half, 1)
    return DIAPHRAGM.edgeY + 0.3 * drop - (DIAPHRAGM.dome - 0.7 * drop) * (1 - u * u)
  }
}

function lung(side: -1 | 1, volume: number, ribExpansion: number, diaphragmY: (x: number) => number): Ellipse {
  const rx = 23 + 2 * volume
  const cx = 100 + side * (28 + ribExpansion)
  const bottom = diaphragmY(cx) - 1 // lung base sits on the diaphragm
  return { cx, cy: (LUNG_TOP + bottom) / 2, rx, ry: (bottom - LUNG_TOP) / 2 }
}

export function bodyPose(volume: number): BodyPose {
  const v = Math.min(Math.max(volume, 0), 1)
  const diaphragmDrop = v * DIAPHRAGM_TRAVEL
  const diaphragmY = diaphragmAt(diaphragmDrop)
  const ribExpansion = 2.5 * v
  const abdomenBulge = diaphragmDrop * ABDOMEN_BULGE
  return {
    volume: v,
    diaphragmDrop,
    diaphragmY,
    lungLeft: lung(-1, v, ribExpansion, diaphragmY),
    lungRight: lung(1, v, ribExpansion, diaphragmY),
    abdomenBulge,
    ribExpansion,
  }
}

export const DIAPHRAGM_SPAN = DIAPHRAGM

/** Half-width of the torso at height y, given the pose. Symmetric around x = 100. */
export function torsoHalfWidth(y: number, pose: BodyPose): number {
  // Key heights: shoulders, chest, lower ribs, waist, belly, hips.
  const rows: [number, number][] = [
    [112, 16],
    [122, 54],
    [150, 61 + pose.ribExpansion],
    [212, 60 + pose.ribExpansion],
    [240, 53],
    [268, 55 + pose.abdomenBulge],
    [312, 57],
  ]
  if (y <= rows[0][0]) return rows[0][1]
  for (let i = 1; i < rows.length; i++) {
    const [y1, w1] = rows[i]
    const [y0, w0] = rows[i - 1]
    if (y <= y1) {
      const t = (y - y0) / (y1 - y0)
      const e = t * t * (3 - 2 * t)
      return w0 + (w1 - w0) * e
    }
  }
  return rows[rows.length - 1][1]
}
