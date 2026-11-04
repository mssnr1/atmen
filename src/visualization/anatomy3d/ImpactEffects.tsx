import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useTheme } from '../../lib/theme'
import type { BreathSource } from '../breathState'
import { heartbeat } from './heartbeat'
import { ImpactClock, impactAmount, PULSE_S, type ImpactKind } from './impacts'
import { simplifiedLung } from './lungShape'

type V3 = [number, number, number]
/** A vessel: points along it (world metres, the figure's right side; mirrored for the left), its radius and how far from the heart it starts. */
type Vessel = { points: V3[]; r: number; from: number; mirror?: boolean }

/**
 * A very simplified set of arteries, measured on the model: the aorta down the back of the trunk into
 * both legs, the carotids up the neck into the head, and one artery down each arm to the hand. The
 * heart itself is left out on purpose (Jan): only the vessels show.
 */
const VESSELS: Vessel[] = [
  // Aortic arch and the aorta down along the spine to where it forks for the legs.
  { points: [[0.012, 1.33, 0.01], [0.004, 1.375, -0.012], [-0.004, 1.35, -0.045], [0, 1.25, -0.055], [0, 1.12, -0.055], [0, 1.0, -0.04], [0, 0.95, -0.025]], r: 0.0042, from: 0 },
  // Legs: from the fork down the thigh, behind the knee, down the calf to the foot.
  { points: [[0, 0.95, -0.025], [0.045, 0.9, -0.01], [0.085, 0.8, -0.015], [0.092, 0.62, -0.02], [0.09, 0.47, -0.035], [0.088, 0.3, -0.045], [0.085, 0.13, -0.045], [0.088, 0.05, -0.01]], r: 0.0034, from: 0.42, mirror: true },
  // Carotids: up the neck, into the head, one branch up the temple, one toward the face, one to the back.
  { points: [[0.004, 1.37, -0.012], [0.02, 1.42, 0.004], [0.028, 1.47, 0.02], [0.032, 1.52, 0.018], [0.045, 1.565, 0.01], [0.066, 1.61, 0.02], [0.07, 1.655, 0.01], [0.05, 1.69, -0.02]], r: 0.0028, from: 0.03, mirror: true },
  { points: [[0.045, 1.565, 0.01], [0.05, 1.58, 0.05], [0.04, 1.61, 0.075]], r: 0.0018, from: 0.25, mirror: true },
  { points: [[0.04, 1.56, 0.0], [0.05, 1.6, -0.06], [0.04, 1.65, -0.085]], r: 0.0018, from: 0.25, mirror: true },
  // Arms: under the collarbone, round the shoulder, down the arm past the elbow to the wrist and hand.
  { points: [[0.004, 1.37, -0.012], [0.07, 1.39, -0.02], [0.15, 1.37, -0.035], [0.195, 1.3, -0.045], [0.222, 1.2, -0.035], [0.252, 1.06, -0.02], [0.27, 0.96, -0.004], [0.288, 0.88, 0.014], [0.292, 0.8, 0.04]], r: 0.0028, from: 0.03, mirror: true },
  // A few small branches in the trunk, so the body is not only lines down its sides.
  { points: [[0, 1.12, -0.055], [0.04, 1.1, -0.03], [0.07, 1.07, -0.02]], r: 0.0018, from: 0.3, mirror: true },
  { points: [[0, 1.04, -0.045], [0.03, 1.01, -0.01], [0.04, 0.97, 0.02]], r: 0.0018, from: 0.36, mirror: true },
]

/** Where the pulse can be felt: both wrists (palm side) and both carotid arteries at the neck. */
const PULSE_POINTS: V3[] = [
  [0.288, 0.88, 0.022],
  [-0.288, 0.88, 0.022],
  [0.036, 1.47, 0.045],
  [-0.036, 1.47, 0.045],
]

/** The brain: two halves inside the skull (centre, radii; world metres). */
const BRAIN_CENTRE: V3 = [0, 1.638, -0.014]
const BRAIN_RADII: V3 = [0.034, 0.04, 0.07]

/** Cells over the body: how many, and the size of one, in metres. */
const CELLS = 2600
const CELL_SIZE = 0.009

/** Effects are drawn after the skin (whose depth is cleared at 0.5); see `PARTS` in AnatomyModel. */
const ORDER = { vessels: 3, heart: 3.5, brain: 3.5, cells: 6.5, pulse: 8 }

function vesselGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (const v of VESSELS) {
    for (const side of v.mirror ? [1, -1] : [1]) {
      const curve = new THREE.CatmullRomCurve3(v.points.map(([x, y, z]) => new THREE.Vector3(x * side, y, z)), false, 'centripetal')
      const length = curve.getLength()
      const g = new THREE.TubeGeometry(curve, Math.max(12, Math.round(length * 220)), v.r, 8, false)
      const uv = g.attributes.uv
      const dist = new Float32Array(uv.count)
      for (let i = 0; i < uv.count; i++) dist[i] = v.from + uv.getX(i) * length
      g.setAttribute('aDist', new THREE.BufferAttribute(dist, 1))
      g.deleteAttribute('uv')
      parts.push(g)
    }
  }
  return mergeGeometries(parts)!
}

function brainGeometry(): THREE.BufferGeometry {
  const halves = [1, -1].map((side) => {
    const g = new THREE.SphereGeometry(1, 56, 40)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i)
      let y = p.getY(i)
      // Flatter underneath, the inner side flat toward the gap between the halves.
      if (y < 0) y *= 0.72
      if (x * side < 0) x *= 0.6
      p.setXYZ(i, side * 0.022 + x * BRAIN_RADII[0], BRAIN_CENTRE[1] + y * BRAIN_RADII[1], BRAIN_CENTRE[2] + p.getZ(i) * BRAIN_RADII[2])
    }
    g.deleteAttribute('uv')
    g.computeVertexNormals()
    return g
  })
  return mergeGeometries(halves)!
}

/** Points spread over the skin (world space), with the skin's normal there and a random seed each. */
function cellGeometry(model: THREE.Object3D): THREE.BufferGeometry {
  const pool: { p: THREE.Vector3; n: THREE.Vector3 }[] = []
  const v = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (const name of ['Body_Shell', 'Head', 'Arms', 'Legs']) {
    const mesh = model.getObjectByName(name) as THREE.Mesh | undefined
    if (!mesh?.isMesh) continue
    const pos = mesh.geometry.attributes.position
    const nor = mesh.geometry.attributes.normal
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
      // A few stray vertices of the legs lie far off to the side.
      if (Math.abs(v.x) > 0.36) continue
      n.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize()
      pool.push({ p: v.clone(), n: n.clone() })
    }
  }
  // An even spread: random vertices, but none closer than this to one already taken.
  const MIN = 0.011
  const grid = new Map<string, THREE.Vector3[]>()
  const key = (p: THREE.Vector3) => `${Math.floor(p.x / MIN)},${Math.floor(p.y / MIN)},${Math.floor(p.z / MIN)}`
  const picked: { p: THREE.Vector3; n: THREE.Vector3 }[] = []
  let rng = 7
  const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647)
  for (let tries = 0; tries < pool.length * 2 && picked.length < CELLS; tries++) {
    const c = pool[Math.floor(rand() * pool.length)]
    const [gx, gy, gz] = key(c.p).split(',').map(Number)
    let free = true
    for (let dx = -1; dx <= 1 && free; dx++)
      for (let dy = -1; dy <= 1 && free; dy++)
        for (let dz = -1; dz <= 1 && free; dz++) for (const q of grid.get(`${gx + dx},${gy + dy},${gz + dz}`) ?? []) if (q.distanceTo(c.p) < MIN) free = false
    if (!free) continue
    const k = key(c.p)
    grid.set(k, [...(grid.get(k) ?? []), c.p])
    picked.push(c)
  }
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(picked.length * 3)
  const nor = new Float32Array(picked.length * 3)
  const seed = new Float32Array(picked.length * 3)
  picked.forEach(({ p, n }, i) => {
    // Just inside the skin, so the cells sit in the body rather than on it.
    pos.set([p.x - n.x * 0.004, p.y - n.y * 0.004, p.z - n.z * 0.004], i * 3)
    nor.set([n.x, n.y, n.z], i * 3)
    seed.set([rand(), rand(), rand()], i * 3)
  })
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aNormal', new THREE.BufferAttribute(nor, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
  return g
}

/** The heart's outline: the model's heart as one smooth body (like the lungs), centred on itself so it can beat in place. */
function heartGeometry(model: THREE.Object3D): { geometry: THREE.BufferGeometry; centre: THREE.Vector3 } | null {
  const heart = model.getObjectByName('Heart') as THREE.Mesh | undefined
  if (!heart?.isMesh) return null
  const smooth = simplifiedLung(heart.geometry, { detail: 14, smoothing: 60 }) ?? heart.geometry.clone()
  smooth.morphAttributes = {}
  smooth.applyMatrix4(heart.matrixWorld)
  smooth.computeBoundingBox()
  const centre = smooth.boundingBox!.getCenter(new THREE.Vector3())
  smooth.translate(-centre.x, -centre.y, -centre.z)
  smooth.computeVertexNormals()
  return { geometry: smooth, centre }
}

const NOISE = /* glsl */ `
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`

/**
 * A surface that glows in the accent colour: a soft fill, a brighter outline (fresnel) and, per kind,
 * a pulse wave running out from the heart (vessels) or winding folds (brain).
 */
function glowMaterial(kind: 'vessels' | 'heart' | 'brain', dark: boolean, amount: { value: number }, phase: { value: number }) {
  const fill = { vessels: dark ? 0.55 : 0.6, heart: dark ? 0.1 : 0.08, brain: dark ? 0.06 : 0.07 }[kind]
  const rim = { vessels: 0.5, heart: 1.0, brain: 0.6 }[kind]
  return new THREE.ShaderMaterial({
    defines: { [kind.toUpperCase()]: '' },
    uniforms: {
      uAmount: amount,
      uPhase: phase,
      uColor: { value: new THREE.Color(dark ? '#a99cff' : '#8c7bff') },
      uRim: { value: new THREE.Color(dark ? '#e6e0ff' : '#5b47e6') },
      uFill: { value: fill },
      uRimA: { value: rim },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vView; varying vec3 vPos; varying float vDist;
      #ifdef VESSELS
      attribute float aDist;
      #endif
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vView = -mv.xyz; vPos = position;
        #ifdef VESSELS
        vDist = aDist;
        #else
        vDist = 0.0;
        #endif
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAmount; uniform float uPhase; uniform vec3 uColor; uniform vec3 uRim; uniform float uFill; uniform float uRimA;
      varying vec3 vN; varying vec3 vView; varying vec3 vPos; varying float vDist;
      ${NOISE}
      void main() {
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 1.6);
        float a = uFill + fr * uRimA;
        vec3 col = mix(uColor, uRim, fr);
        #ifdef VESSELS
        // Each pulse a soft wave of light runs out from the heart along the vessels.
        float w = exp(-pow((vDist - uPhase * 1.5) / 0.14, 2.0));
        a += w * 0.5; col = mix(col, uRim, w * 0.6);
        #endif
        #ifdef BRAIN
        // Winding folds: contour lines of a smooth noise over the brain's surface.
        float n = noise(vPos * 95.0) * 0.65 + noise(vPos * 190.0) * 0.35;
        float v = n * 7.0;
        float d = abs(fract(v) - 0.5);
        float line = smoothstep(0.5 - 0.16 - fwidth(v), 0.5 - 0.16 + fwidth(v), d);
        a += line * 0.35; col = mix(col, uRim, line * 0.4);
        #endif
        a = min(a, 1.0) * uAmount;
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: kind === 'vessels',
    blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
}

function cellMaterial(dark: boolean, amount: { value: number }, time: { value: number }, size: { value: number }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAmount: amount,
      uTime: time,
      uSize: size,
      uColor: { value: new THREE.Color(dark ? '#b3a6ff' : '#8c7bff') },
      uAlt: { value: new THREE.Color(dark ? '#7dd3fc' : '#5ab8e8') },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aNormal; attribute vec3 aSeed;
      uniform float uTime; uniform float uSize; uniform float uAmount;
      varying float vAlpha; varying float vTint;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        // Cells on the side facing the eye show fully, those on the far side faintly.
        float facing = dot(normalize(mat3(viewMatrix) * aNormal), normalize(-mv.xyz));
        float front = mix(0.12, 1.0, smoothstep(-0.15, 0.35, facing));
        // Each cell swells with the pulse a little after or before its neighbours, so the light shimmers over the body.
        float s = sin(3.14159265 * (uTime / ${PULSE_S.toFixed(2)}) - aSeed.x * 1.4);
        vAlpha = uAmount * front * (0.35 + 0.65 * s * s) * (0.6 + 0.4 * aSeed.y);
        vTint = step(0.82, aSeed.z);
        gl_PointSize = uSize * (0.75 + 0.5 * aSeed.y) * (0.9 + 0.2 * s * s) / -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform vec3 uAlt;
      varying float vAlpha; varying float vTint;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        // A cell: a thin membrane ring with a small nucleus in the middle.
        float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.24, 0.36, d);
        float core = smoothstep(0.17, 0.07, d);
        float a = (ring * 0.85 + core * 0.9 + smoothstep(0.5, 0.0, d) * 0.12) * vAlpha;
        vec3 col = mix(uColor, uAlt, vTint);
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
}

function pulseMaterial(dark: boolean, amount: { value: number }, phase: { value: number }, size: { value: number }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAmount: amount,
      uPhase: phase,
      uSize: size,
      uColor: { value: new THREE.Color(dark ? '#c7bbff' : '#6f5cf0') },
    },
    vertexShader: /* glsl */ `
      uniform float uSize;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAmount; uniform float uPhase; uniform vec3 uColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        // A glowing dot that beats with the pulse, and a ring spreading out from it each time.
        float beat = exp(-pow((uPhase - 0.5) / 0.16, 2.0));
        float core = smoothstep(0.075 + 0.02 * beat, 0.045, d);
        float glow = smoothstep(0.3, 0.0, d) * (0.25 + 0.35 * beat);
        float r = 0.08 + 0.38 * uPhase;
        float ring = smoothstep(0.02, 0.0, abs(d - r)) * (1.0 - uPhase) * (1.0 - uPhase) * 0.9;
        float a = min(core + glow + ring, 1.0) * uAmount;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
}

/**
 * While a new insight card shows, its effect lights up in the figure in the accent colour and
 * pulses slowly five times (see `impacts.ts`): the lungs' outline (via `lungPulse`, used by the lung
 * material), vessels, cells, the heart, the pulse points or the brain.
 */
export function ImpactEffects({ engine, model, lungPulse }: { engine: BreathSource; model: THREE.Object3D; lungPulse: { value: number } }) {
  const theme = useTheme()
  const dark = theme === 'dark'
  const clock = useMemo(() => new ImpactClock(), [])
  const u = useMemo(() => ({ amount: { value: 0 }, phase: { value: 0 }, time: { value: 0 }, cellSize: { value: 1 }, pulseSize: { value: 1 } }), [])

  const geometries = useMemo(() => {
    model.updateMatrixWorld(true)
    return { vessels: vesselGeometry(), brain: brainGeometry(), cells: cellGeometry(model), heart: heartGeometry(model), pulse: new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(PULSE_POINTS.flat(), 3)) }
  }, [model])
  useEffect(() => () => Object.values(geometries).forEach((g) => (g && 'geometry' in g ? g.geometry.dispose() : g?.dispose())), [geometries])

  const objects = useMemo(() => {
    const vessels = new THREE.Mesh(geometries.vessels, glowMaterial('vessels', dark, u.amount, u.phase))
    const brain = new THREE.Mesh(geometries.brain, glowMaterial('brain', dark, u.amount, u.phase))
    const cells = new THREE.Points(geometries.cells, cellMaterial(dark, u.amount, u.time, u.cellSize))
    const pulse = new THREE.Points(geometries.pulse, pulseMaterial(dark, u.amount, u.phase, u.pulseSize))
    const heart = geometries.heart ? new THREE.Mesh(geometries.heart.geometry, glowMaterial('heart', dark, u.amount, u.phase)) : null
    if (heart && geometries.heart) heart.position.copy(geometries.heart.centre)
    const byKind: Partial<Record<ImpactKind, THREE.Object3D>> = { vessels, brain, cells, pulse, ...(heart ? { heart } : {}) }
    for (const [kind, o] of Object.entries(byKind)) {
      o.renderOrder = ORDER[kind as keyof typeof ORDER]
      o.frustumCulled = false
      o.visible = false
    }
    return byKind
  }, [geometries, dark, u])
  useEffect(() => () => Object.values(objects).forEach((o) => ((o as THREE.Mesh).material as THREE.Material).dispose()), [objects])

  const group = useRef<THREE.Group>(null)
  useFrame(({ gl, camera }, delta) => {
    const s = engine.sample()
    const state = clock.update(s.status, s.cycleIndex, Math.min(delta, 0.1))
    const amount = state ? impactAmount(state.t) : 0
    u.amount.value = amount
    u.time.value = state?.t ?? 0
    u.phase.value = state ? (state.t / PULSE_S) % 1 : 0
    lungPulse.value = state?.kind === 'lungs' ? amount : 0
    for (const [kind, o] of Object.entries(objects)) o.visible = state?.kind === kind && amount > 0.001
    const heart = objects.heart
    if (heart && heart.visible) heart.scale.setScalar(1 + 0.06 * heartbeat(((state!.t / PULSE_S) + 0.85) % 1))
    const buffer = gl.getDrawingBufferSize(new THREE.Vector2())
    // Cells keep their size in the world: a point's pixel size is its world size seen from its distance.
    u.cellSize.value = CELL_SIZE * (camera as THREE.PerspectiveCamera).projectionMatrix.elements[5] * buffer.y * 0.5
    u.pulseSize.value = 64 * gl.getPixelRatio()
  })

  return (
    <group ref={group}>
      {Object.entries(objects).map(([kind, o]) => (
        <primitive key={kind} object={o} />
      ))}
    </group>
  )
}
