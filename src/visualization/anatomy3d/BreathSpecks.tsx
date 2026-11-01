import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTheme } from '../../lib/theme'
import { breathState, type BreathSource, type BreathState } from '../breathState'
import { lungs, pointOn, routes, type V3 } from './airflow3d'

const COUNT = 160
/** Share of a speck's trip spent outside, in the airways, and fanning out into the lung. */
const OUTSIDE = 0.34
const AIRWAY = 0.36
/** Each speck sets off somewhere in the first part of the inhale and arrives by its end. */
const START_SPREAD = 0.45
const TRIP = 1 - START_SPREAD

interface Speck {
  route: number
  offset: number
  /** Where it starts in front of the face, relative to the nostril. */
  start: V3
  target: V3
  seed: number
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export function makeSpecks(): Speck[] {
  const r = rng(7)
  return Array.from({ length: COUNT }, (_, i) => {
    const route = i % routes.length
    const lung = lungs[routes[route].side]
    // A loose cloud in front of the face, forward and a little below the nose.
    const d = 0.08 + 0.1 * r()
    return {
      route,
      offset: r() * START_SPREAD,
      start: [(r() - 0.5) * 0.12, -0.25 * d + (r() - 0.5) * 0.06, d],
      target: lung.points[Math.floor(r() * lung.points.length)],
      seed: r(),
    }
  })
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Opacity of a speck resting in the lung between the end of the inhale and the start of the exhale. */
const SETTLED = 0.55
/** Breathed out, the specks drift this much farther out than where they came from, spreading as they go. */
const EXIT_REACH = 1.7

/**
 * Where a speck is at point `k` of its trip, 0 in front of the face, 1 at its
 * place in the lung. Breathing out it walks the same trip backwards
 * (`leaving`), only outside it drifts a little farther and wider than it came.
 */
function tripPosition(s: Speck, k: number, leaving: boolean, time: number, out: V3) {
  const route = routes[s.route]
  const nose = route.points[0]
  const w = 0.004 * Math.sin(time * 2.1 + s.seed * 30)
  if (k < OUTSIDE) {
    // Drifting in, slowly at first, then drawn into the nostril; breathing
    // out it leaves the nostril quickly and slows down as it spreads.
    const t = k / OUTSIDE
    const e = t * t
    const reach = leaving ? EXIT_REACH : 1
    const fall = leaving ? 0.02 * (1 - e) : 0
    out[0] = nose[0] + s.start[0] * reach * (1 - e) + w
    out[1] = nose[1] + s.start[1] * reach * (1 - e) - fall + w * 0.6
    out[2] = nose[2] + s.start[2] * reach * (1 - e)
  } else if (k < OUTSIDE + AIRWAY) {
    // Along the trachea and its bronchus.
    const c = pointOn(route, ((k - OUTSIDE) / AIRWAY) * 0.85)
    // Spread a few millimetres across the airway so they do not run in single file.
    const j = 0.005
    out[0] = c[0] + j * Math.sin(s.seed * 91) + w
    out[1] = c[1]
    out[2] = c[2] + j * Math.cos(s.seed * 57)
  } else {
    // Between the end of the bronchus and its place in the lung.
    const t = (k - OUTSIDE - AIRWAY) / (1 - OUTSIDE - AIRWAY)
    const from = pointOn(route, 0.85)
    const e = 1 - (1 - t) ** 2
    out[0] = from[0] + (s.target[0] - from[0]) * e + w
    out[1] = from[1] + (s.target[1] - from[1]) * e + w
    out[2] = from[2] + (s.target[2] - from[2]) * e
  }
}

/**
 * One speck's position and opacity for a breath state. Breathing in it floats
 * in through the nose and down into the lung, it rests there through the
 * pause, and breathing out it takes the same way back and out of the nose,
 * where it drifts off and fades. Nothing shows while the lungs are empty.
 */
export function speckState(s: Speck, b: BreathState, time: number, out: { p: V3; a: number }) {
  out.a = 0
  if (b.phase === 'inhale') {
    const k = (b.phaseProgress - s.offset) / TRIP
    if (k <= 0) return out
    tripPosition(s, Math.min(k, 1), false, time, out.p)
    out.a = smooth(0, 0.1, k) * (1 - (1 - SETTLED) * smooth(0.82, 1, k))
  } else if (b.phase === 'holdIn') {
    tripPosition(s, 1, false, time, out.p)
    out.a = SETTLED
  } else if (b.phase === 'exhale') {
    // The last to arrive are the first to leave, so the air goes out in the order it came in.
    const k = (b.phaseProgress - (START_SPREAD - s.offset)) / TRIP
    if (k >= 1) return out
    tripPosition(s, 1 - Math.max(k, 0), true, time, out.p)
    out.a = (SETTLED + (1 - SETTLED) * smooth(0, 0.12, k)) * (1 - smooth(0.7, 1, k))
  }
  return out
}

const vertex = /* glsl */ `
  attribute float aAlpha;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize;
    vAlpha = aAlpha;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (1.0 - smoothstep(0.55, 1.0, d)) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

/**
 * A few specks of air, like the ones the phase word is made of, that float in
 * through the nose on each inhale and travel down into the lungs, and on the
 * exhale take the same way back out of the nose. Their place
 * is a pure function of the breath state, so they follow the engine exactly.
 */
export function BreathSpecks({ engine }: { engine: BreathSource }) {
  const theme = useTheme()
  const specks = useMemo(makeSpecks, [])
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(COUNT), 1).setUsage(THREE.DynamicDrawUsage))
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uColor: { value: new THREE.Color('#2f6bf5') }, uSize: { value: 3 } },
      transparent: true,
      depthWrite: false,
      // Drawn over the lungs, which now write depth: the air is seen inside them.
      depthTest: false,
    })
    return { geometry: g, material: m }
  }, [])

  // The same colour as the specks of the phase word.
  useEffect(() => {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--color-breath').trim()
    if (c) material.uniforms.uColor.value.set(c)
  }, [theme, material])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const scratch = useMemo(() => ({ p: [0, 0, 0] as V3, a: 0 }), [])
  useFrame(({ clock, gl }) => {
    const b = breathState(engine.sample())
    const pos = geometry.attributes.position.array as Float32Array
    const alpha = geometry.attributes.aAlpha.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      speckState(specks[i], b, clock.elapsedTime, scratch)
      pos.set(scratch.p, i * 3)
      alpha[i] = scratch.a
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.aAlpha.needsUpdate = true
    material.uniforms.uSize.value = 2.6 * gl.getPixelRatio()
  })

  return <points geometry={geometry} material={material} renderOrder={8} frustumCulled={false} />
}
