/**
 * Simplified anatomical model of the upper body, front view, in a 200 × 320
 * unit coordinate space shared by the SVG body and the WebGL air volume.
 *
 * Mechanics: everything moves from a single variable, lung volume. Breathing
 * in, the diaphragm contracts: its dome flattens and descends, and the ribs
 * lift outward. The lungs' base rests on the diaphragm and their outer edge
 * follows the ribs, so they grow downward and outward with it. The abdominal
 * contents are pushed down and the belly wall out by the same displacement.
 * Breathing out, the diaphragm relaxes back up into its dome and the elastic
 * lungs shrink with it, pressing the air back out. Air only ever enters the
 * lungs. The abdomen moves because of the diaphragm.
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

const DIAPHRAGM_TRAVEL = 24 // downward excursion of the dome's centre at full inhale
const DIAPHRAGM = { left: 42, right: 158, edgeY: 224, dome: 24 } as const
const LUNG_APEX = 123
const ABDOMEN_BULGE = 0.5 // belly wall displacement per unit of diaphragm descent
const RIB_EXPANSION = 6

export interface Ellipse {
  cx: number
  cy: number
  rx: number
  ry: number
}

/**
 * One lung, front view. Offsets are distances from the midline (x = 100). The
 * apex is a rounded point under the collarbone; the outer edge widens down to
 * the ribs; the inner edge runs beside the mediastinum and, for the left lung,
 * steps out around the heart (cardiac notch); the base is concave and lies on
 * the diaphragm, so it is not stored here but read from the pose.
 */
export interface Lung {
  /** -1 on the viewer's left (the right lung), +1 on the viewer's right (the left lung). */
  side: -1 | 1
  apexY: number
  /** Offset of the apex. */
  apex: number
  /** Offset of the outer edge once the lung has reached full width. */
  lateral: number
  /** Offset of the inner edge, and how far the cardiac notch pushes it out. */
  medial: number
  notch: number
}

/** Height below the apex over which the outer edge reaches full width. */
const APEX_ROUND = 34
const NOTCH = { from: 160, to: 194 } as const

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export function lungLateral(l: Lung, y: number): number {
  return l.apex + (l.lateral - l.apex) * Math.sqrt(clamp01((y - l.apexY) / APEX_ROUND))
}

export function lungMedial(l: Lung, y: number): number {
  const base = l.medial + l.notch * smooth(NOTCH.from, NOTCH.to, y)
  return l.apex - (l.apex - base) * Math.sqrt(clamp01((y - l.apexY) / (APEX_ROUND * 1.4)))
}

/** The lung's base: just above the diaphragm. */
export const lungBaseY = (pose: BodyPose, x: number) => pose.diaphragmY(x) - 1

/**
 * Point on a lung edge at fraction `t` from apex (0) to base (1). The base
 * height depends on x and x on the height, so settle both by iterating.
 */
function edgePoint(l: Lung, pose: BodyPose, edge: (l: Lung, y: number) => number, t: number): [number, number] {
  let y = l.apexY + t * 90
  let x = 100
  for (let i = 0; i < 4; i++) {
    x = 100 + l.side * edge(l, y)
    y = l.apexY + t * (lungBaseY(pose, x) - l.apexY)
  }
  return [x, y]
}

/** Closed outline of a lung: down the outer edge, along the diaphragm, up the inner edge. */
export function lungOutline(l: Lung, pose: BodyPose, steps = 24): [number, number][] {
  const outer: [number, number][] = []
  const inner: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    outer.push(edgePoint(l, pose, lungLateral, t))
    inner.push(edgePoint(l, pose, lungMedial, t))
  }
  const [x0] = outer[steps]
  const [x1] = inner[steps]
  const base: [number, number][] = []
  for (let i = 1; i < 8; i++) {
    const x = x0 + ((x1 - x0) * i) / 8
    base.push([x, lungBaseY(pose, x)])
  }
  return [...outer, ...base, ...inner.reverse()]
}

/** Area of a lung outline, a stand-in for its volume in tests. */
export function lungArea(l: Lung, pose: BodyPose): number {
  const pts = lungOutline(l, pose)
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[(i + 1) % pts.length]
    a += x0 * y1 - x1 * y0
  }
  return Math.abs(a) / 2
}

export interface BodyPose {
  volume: number
  /** Diaphragm descent in units. */
  diaphragmDrop: number
  /** Diaphragm height at a given x. */
  diaphragmY: (x: number) => number
  lungLeft: Lung
  lungRight: Lung
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

function lung(side: -1 | 1, volume: number, ribExpansion: number): Lung {
  return {
    side,
    // The ribs lift a little as they swing out.
    apexY: LUNG_APEX - 1.5 * volume,
    apex: 25 + 0.4 * ribExpansion,
    lateral: 50 + ribExpansion,
    medial: 7,
    notch: side === 1 ? 14 : 3,
  }
}

export function bodyPose(volume: number): BodyPose {
  const v = Math.min(Math.max(volume, 0), 1)
  const diaphragmDrop = v * DIAPHRAGM_TRAVEL
  const diaphragmY = diaphragmAt(diaphragmDrop)
  const ribExpansion = RIB_EXPANSION * v
  const abdomenBulge = diaphragmDrop * ABDOMEN_BULGE
  return {
    volume: v,
    diaphragmDrop,
    diaphragmY,
    lungLeft: lung(-1, v, ribExpansion),
    lungRight: lung(1, v, ribExpansion),
    abdomenBulge,
    ribExpansion,
  }
}

export const DIAPHRAGM_SPAN = DIAPHRAGM

/** Shape constants the air shader needs to draw the same lungs. */
export const LUNG_SHAPE = { apexRound: APEX_ROUND, notchFrom: NOTCH.from, notchTo: NOTCH.to } as const

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
