import type { BreathState } from '../breathState'
import paths from './airway-paths.json'

/**
 * Where the visible air volume is, as a function of breath state.
 *
 * Every air particle has a fixed place `b` in a full breath: 0 just in front
 * of the nose, AIRWAY at the end of its lobar bronchus, 1 deep in a lung. Its
 * current position on that route is `b - (1 - volume)`, so as lung volume goes
 * from 0 to 1 the whole volume is drawn in through the nose, down the trachea,
 * through both bronchi and out into the lungs, and on the way out it travels
 * the same route back and leaves the nose as a violet haze that disperses. Position
 * depends only on the breath state, never on its own timer, so the air can
 * never drift away from the engine (and air never goes anywhere but the
 * airways and lungs).
 */

export type V3 = [number, number, number]

/** Share of the route taken by the airways; the rest spreads into the lungs. */
export const AIRWAY = 0.28
/** Share of particles that sit in the airways when the lungs are full. */
const AIRWAY_PARTICLES = 0.2

interface Route {
  points: V3[]
  /** Cumulative length at each point, normalized to 0..1. */
  at: number[]
  side: 'left' | 'right'
}

const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

function buildRoute(trunk: V3[], branch: V3[], side: 'left' | 'right'): Route {
  // The trachea mesh runs a little past the carina; join the bronchus where it starts.
  const top = trunk.filter((p) => p[1] > branch[0][1])
  const points: V3[] = []
  for (const p of [...top, ...branch]) if (!points.length || dist(points[points.length - 1], p) > 1e-4) points.push(p)
  const at = [0]
  for (let i = 1; i < points.length; i++) at.push(at[i - 1] + dist(points[i - 1], points[i]))
  const total = at[at.length - 1]
  return { points, at: at.map((x) => x / total), side }
}

// The first trunk point lies in front of the nose; the routes start at the nostril.
const trunk = (paths.trunk as V3[]).slice(1)

export const routes: Route[] = [
  buildRoute(trunk, paths.branches.left_upper as V3[], 'left'),
  buildRoute(trunk, paths.branches.left_lower as V3[], 'left'),
  buildRoute(trunk, paths.branches.right_upper as V3[], 'right'),
  buildRoute(trunk, paths.branches.right_lower as V3[], 'right'),
]

export const lungs = {
  left: { center: paths.lungs.left.center as V3, points: paths.lungs.left.points as V3[] },
  right: { center: paths.lungs.right.center as V3, points: paths.lungs.right.points as V3[] },
}

/** Point at fraction `u` (0..1) along a route. */
export function pointOn(route: Route, u: number): V3 {
  const t = Math.min(Math.max(u, 0), 1)
  let i = 1
  while (i < route.at.length - 1 && route.at[i] < t) i++
  const a = route.at[i - 1]
  const b = route.at[i]
  return lerp3(route.points[i - 1], route.points[i], b > a ? (t - a) / (b - a) : 0)
}

export interface Particle {
  route: number
  /** Place in a full breath, 0..1. */
  b: number
  target: V3
  seed: number
  /** Random unit-ish direction for turbulence and dispersion. */
  dir: V3
}

/** Deterministic pseudo random numbers, so the air looks the same every load. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export function makeParticles(count: number): Particle[] {
  const r = rng(42)
  return Array.from({ length: count }, (_, i) => {
    const route = i % routes.length
    const lung = lungs[routes[route].side]
    const inAirway = r() < AIRWAY_PARTICLES
    const b = inAirway ? r() * AIRWAY : AIRWAY + (1 - AIRWAY) * Math.sqrt(r())
    const u = r() * 2 - 1
    const phi = r() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    return {
      route,
      b,
      target: lung.points[Math.floor(r() * lung.points.length)],
      seed: r(),
      dir: [s * Math.cos(phi), u, s * Math.sin(phi)],
    }
  })
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Air leaves the nose forward and slightly down, and arrives from there. */
const OUT_DIR: V3 = [0.0, -0.35, 1]

export interface ParticleState {
  position: V3
  /** 0..1 */
  alpha: number
  /** Relative sprite size: small in the airways, larger in the lungs and outside. */
  size: number
}

/**
 * One particle's position, opacity and size for a breath state. `time` is the
 * paused-aware ambient clock used only for gentle turbulence.
 */
export function particleState(p: Particle, b: BreathState, time: number, out: ParticleState): ParticleState {
  const route = routes[p.route]
  const pos = p.b - (1 - b.volume)
  const wobble = (amp: number, k = 1): V3 => [
    amp * Math.sin(time * 1.3 * k + p.seed * 40) * p.dir[0],
    amp * Math.sin(time * 1.1 * k + p.seed * 23) * p.dir[1],
    amp * Math.cos(time * 0.9 * k + p.seed * 31) * p.dir[2],
  ]

  if (b.phase === 'idle') {
    out.alpha = 0
    return out
  }
  // In the rest at the top of the breath the air settles deep in the lungs:
  // what is left in the airways fades and the rest sinks a little. Breathing
  // out, it comes back up from there.
  const rest = b.phase === 'holdIn' ? smoothstep(0, 0.7, b.phaseProgress) : b.phase === 'exhale' ? 1 - smoothstep(0, 0.3, b.phaseProgress) : 0

  if (pos < 0) {
    const d = -pos
    const start = route.points[0]
    if (b.phase === 'inhale') {
      // Breathing in, the air is drawn in from in front of the face: a funnel
      // that narrows into the nostrils and thickens as it goes, fading in from
      // nothing at its wide end.
      const radius = 0.006 + 0.11 * d
      const w = wobble(0.004 + 0.012 * d, 1.2)
      out.position = [
        start[0] + OUT_DIR[0] * 0.45 * d + p.dir[0] * radius + w[0],
        start[1] + OUT_DIR[1] * 0.45 * d + p.dir[1] * radius + w[1],
        start[2] + OUT_DIR[2] * 0.45 * d + p.dir[2] * radius * 0.4 + w[2],
      ]
      out.alpha = 0.05 * (1 - smoothstep(0, 0.85, d)) ** 1.5 * smoothstep(0, 0.12, b.phaseProgress)
      out.size = 0.9 + 1.8 * d
      return out
    }
    // Breathing out, it leaves as a violet haze that drifts away, spreads and
    // fades into the surroundings. In the rest between, nothing is outside.
    if (b.phase !== 'exhale') {
      out.alpha = 0
      return out
    }
    const spread = 0.015 + 0.12 * d
    const w = wobble(0.008 + 0.035 * d, 1.4)
    out.position = [
      start[0] + OUT_DIR[0] * 0.24 * d + p.dir[0] * spread + w[0],
      start[1] + OUT_DIR[1] * 0.24 * d + p.dir[1] * spread * 0.8 + 0.03 * d * d + w[1],
      start[2] + OUT_DIR[2] * 0.24 * d + p.dir[2] * spread + w[2],
    ]
    const near = 1 - smoothstep(0.1, 1, d)
    out.alpha = 0.055 * near * smoothstep(0, 0.3, b.phaseProgress) * (1 - smoothstep(0.8, 1, b.phaseProgress)) * (1 - rest)
    out.size = 1.3 + 2.2 * d
    return out
  }

  if (pos <= AIRWAY) {
    const w = wobble(0.0022, 2)
    const c = pointOn(route, pos / AIRWAY)
    out.position = [c[0] + w[0], c[1] + w[1], c[2] + w[2]]
    // Air in the airways glows most while it is moving.
    out.alpha = (0.012 + 0.17 * b.flow) * (1 - rest)
    out.size = 0.75
    return out
  }

  const t = (pos - AIRWAY) / (1 - AIRWAY)
  // Each particle leaves the bronchus somewhere along its last stretch, so the air fans out.
  const end = pointOn(route, 0.72 + 0.28 * p.seed)
  const lung = lungs[route.side]
  // Targets move out a little with the lungs as they expand.
  const grow = 1 + 0.07 * b.volume
  const tgt: V3 = [
    lung.center[0] + (p.target[0] - lung.center[0]) * grow,
    lung.center[1] + (p.target[1] - lung.center[1]) * grow - 0.025 * rest,
    lung.center[2] + (p.target[2] - lung.center[2]) * grow,
  ]
  // Fast out of the bronchi, then easing into place, so the lungs fill out quickly.
  const c = lerp3(end, tgt, 1 - (1 - t) ** 3)
  const w = wobble(0.004 + 0.004 * t, 1.2)
  out.position = [c[0] + w[0], c[1] + w[1], c[2] + w[2]]
  // A soft, slightly translucent mist; faint where the bronchi end, so the air does not bead up at their tips.
  out.alpha = (0.016 + 0.022 * smoothstep(0, 0.25, t)) * (1 - 0.3 * rest)
  out.size = 1.4 + 1.6 * t
  return out
}
