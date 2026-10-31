import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { BreathingEngine } from '../../engine'
import { useTheme } from '../../lib/theme'
import { breathState, type BreathState } from '../breathState'
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

/** One speck's position and opacity for a breath state; only drawn while breathing in. */
export function speckState(s: Speck, b: BreathState, time: number, out: { p: V3; a: number }) {
  out.a = 0
  if (b.phase !== 'inhale') return out
  const k = (b.phaseProgress - s.offset) / TRIP
  if (k <= 0 || k >= 1) return out
  const route = routes[s.route]
  const nose = route.points[0]
  const w = 0.004 * Math.sin(time * 2.1 + s.seed * 30)
  if (k < OUTSIDE) {
    // Drifting in, slowly at first, then drawn into the nostril.
    const t = k / OUTSIDE
    const e = t * t
    out.p = [nose[0] + s.start[0] * (1 - e) + w, nose[1] + s.start[1] * (1 - e) + w * 0.6, nose[2] + s.start[2] * (1 - e)]
  } else if (k < OUTSIDE + AIRWAY) {
    // Down the trachea and along its bronchus.
    const c = pointOn(route, ((k - OUTSIDE) / AIRWAY) * 0.85)
    // Spread a few millimetres across the airway so they do not run in single file.
    const j = 0.005
    out.p = [c[0] + j * Math.sin(s.seed * 91) + w, c[1], c[2] + j * Math.cos(s.seed * 57)]
  } else {
    // Out of the bronchus into the lung, easing into place.
    const t = (k - OUTSIDE - AIRWAY) / (1 - OUTSIDE - AIRWAY)
    const from = pointOn(route, 0.85)
    const e = 1 - (1 - t) ** 2
    out.p = [from[0] + (s.target[0] - from[0]) * e + w, from[1] + (s.target[1] - from[1]) * e + w, from[2] + (s.target[2] - from[2]) * e]
  }
  out.a = smooth(0, 0.1, k) * (1 - smooth(0.82, 1, k))
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
 * through the nose on each inhale and travel down into the lungs. Their place
 * is a pure function of the breath state, so they follow the engine exactly.
 */
export function BreathSpecks({ engine }: { engine: BreathingEngine }) {
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
