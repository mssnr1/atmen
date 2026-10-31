import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { BreathingEngine, EngineSnapshot } from '../../engine'
import { breathState } from '../breathState'
import { MODEL_URL } from './AnatomyModel'

/** Middle of the glow, between head and belly. The billboard turns around it to face the camera. */
const CENTER = new THREE.Vector3(0, 1.32, 0)
const PLANE_W = 1.3
const PLANE_H = 1.6
/** Seconds the glow takes to catch up with a new level, so a start, pause or end never jumps. */
const LEVEL_TAU = 2.2

/**
 * How built-up the aura is at this point of the session, 0..1: nothing before
 * the start, a first faint hint after a few breaths, full in the last tenth of
 * the session and through the outro.
 */
export function auraLevel(s: Pick<EngineSnapshot, 'status' | 'progress'>): number {
  if (s.status === 'idle') return 0
  if (s.status === 'completed') return 1
  const t = Math.min(Math.max(s.progress / 0.9, 0), 1)
  return t * t * (3 - 2 * t) * 0.92 + Math.min(t * 8, 1) * 0.08
}

const vertex = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/*
 * A soft background glow around the silhouette of head and upper body, drawn as a signed
 * distance field on a camera-facing plane: the glow falls off with the
 * distance to the figure, its reach grows with the level, it swells a little
 * with each inhale, and a slow ripple runs around its edge. Its colour warms
 * from a pale champagne to a gentle peach, with a rose edge, as the level rises.
 */
const fragment = /* glsl */ `
  uniform float uLevel;
  uniform float uVolume;
  uniform float uTime;
  uniform float uDark;
  uniform vec3 uCool;
  uniform vec3 uWarm;
  uniform vec3 uRose;
  varying vec2 vPos;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  void main() {
    // Figure: head over shoulders and a trunk that narrows a little toward the waist.
    vec2 p = vPos;
    vec2 h = (p - vec2(0.0, 0.28)) / vec2(0.095, 0.118);
    float head = (length(h) - 1.0) * 0.1;
    float taper = 1.0 - clamp((0.12 - p.y) * 0.35, 0.0, 0.18);
    float trunk = sdRoundBox(vec2(p.x / taper, p.y + 0.12), vec2(0.22, 0.27), 0.13);
    float d = smin(head, trunk, 0.07);

    // A slow ripple travels around the edge so the light feels alive.
    float a = atan(p.y - 0.05, p.x);
    float ripple = 0.5 * sin(a * 3.0 + uTime * 0.35) + 0.3 * sin(a * 5.0 - uTime * 0.23) + 0.2 * sin(a * 8.0 + uTime * 0.51);

    // A bright band hugging the outline and a wide, faint halo beyond it.
    float swell = (1.0 + 0.18 * uVolume) * (1.0 + 0.14 * ripple * uLevel);
    float reach = (0.012 + 0.035 * uLevel) * swell;
    float halo = (0.03 + 0.09 * uLevel) * swell;
    float outside = max(d, 0.0);
    float glow = max(exp(-outside / reach), 0.4 * exp(-outside / halo)) * smoothstep(-0.12, 0.02, d);
    // Inside the figure only a soft light shows through the glass body.
    float inner = 0.18 * smoothstep(0.02, -0.16, d);
    float shape = max(glow, inner);

    // Fades out well before the edge of the plane, and at the bottom where the body goes on behind the controls.
    float frame = smoothstep(0.65, 0.4, abs(p.x)) * smoothstep(0.8, 0.55, p.y) * smoothstep(-0.8, -0.45, p.y);

    vec3 core = mix(uCool, uWarm, smoothstep(0.15, 0.85, uLevel));
    vec3 col = mix(core, uRose, smoothstep(0.0, 1.0, outside / max(halo * 1.5, 0.001)) * uLevel);

    float strength = mix(0.4, 0.3, uDark) * smoothstep(0.0, 0.25, uLevel) * (0.55 + 0.45 * uLevel);
    float alpha = shape * frame * strength;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col, alpha);
  }
`

const sparkVertex = /* glsl */ `
  attribute vec3 aNormal;
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uLevel;
  uniform float uVolume;
  uniform float uScale;
  varying float vAlpha;
  varying float vSpark;
  void main() {
    // Each particle sits on a shell a little outside the skin; the shell moves
    // out as the aura builds and with each inhale.
    float offset = (0.012 + 0.03 * uLevel) * (0.5 + aSeed.x) + 0.01 * uVolume;
    vec3 p = position + aNormal * offset;
    // A slow, small wander of its own, and a gentle rise as it glows and fades.
    float t = uTime * (0.25 + 0.25 * aSeed.z);
    float ph = aSeed.w * 6.2832;
    p += vec3(sin(t + ph), sin(t * 0.8 + ph * 1.7), cos(t * 0.9 + ph)) * 0.006;
    float life = fract(aSeed.w * 3.7 + uTime * (0.05 + 0.05 * aSeed.x));
    p.y += life * 0.025;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    // Mostly small soft glows, every seventh or so a brighter spark.
    vSpark = step(0.86, aSeed.z);
    gl_PointSize = uScale * mix(1.0 + aSeed.x, 0.35 + 0.3 * aSeed.x, vSpark) / -mv.z;
    // Strongest along the outline, faint where the shell faces the viewer, so the organs stay clear.
    float rim = 1.0 - abs(dot(normalize(aNormal), normalize(cameraPosition - world.xyz)));
    float edge = mix(0.12, 1.0, pow(rim, 1.4));
    // More particles join as the aura builds: a few at first, all of them at the end.
    float shown = smoothstep(aSeed.y, aSeed.y + 0.08, uLevel * 1.08 - 0.04);
    float twinkle = 0.65 + 0.35 * sin(uTime * (1.0 + 2.0 * aSeed.x) + ph);
    vAlpha = edge * shown * sin(life * 3.1416) * mix(1.0, twinkle, vSpark) * smoothstep(0.96, 1.08, world.y);
  }
`

const sparkFragment = /* glsl */ `
  uniform vec3 uGlow;
  uniform vec3 uSpark;
  uniform float uDark;
  varying float vAlpha;
  varying float vSpark;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = dot(c, c) * 4.0;
    float a = exp(-r * mix(3.0, 5.0, vSpark)) * vAlpha * mix(mix(0.22, 0.16, uDark), mix(0.95, 0.8, uDark), vSpark);
    if (a < 0.003) discard;
    gl_FragColor = vec4(mix(uGlow, uSpark, vSpark), a);
  }
`

const PARTICLES = 2200

/** Colours per theme: on white the glow needs more colour to show, on the night page it needs light. */
const PALETTE = {
  light: { cool: '#ecd9bd', warm: '#ffcc9c', rose: '#ffb3c6', glow: '#ffb27a', spark: '#ffe6c4' },
  dark: { cool: '#8a7a66', warm: '#f2b98a', rose: '#d98aa8', glow: '#ffbf8a', spark: '#fff1dc' },
}

/** True while the page shows the dark theme (a `dark` class on <html>). */
function useDarkPage() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setDark(root.classList.contains('dark')))
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

/**
 * Points spread over the skin of head and upper body (vertices of the model,
 * picked with a fixed seed), each with its outward normal, for the particles
 * of the aura to sit on.
 */
function sampleShell(scene: THREE.Object3D, count: number) {
  scene.updateMatrixWorld(true)
  const sources: { pos: THREE.BufferAttribute; nrm: THREE.BufferAttribute; m: THREE.Matrix4; n: THREE.Matrix3 }[] = []
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !['Body_Shell', 'Head'].includes(mesh.name)) return
    const g = mesh.geometry
    sources.push({
      pos: g.attributes.position as THREE.BufferAttribute,
      nrm: g.attributes.normal as THREE.BufferAttribute,
      m: mesh.matrixWorld,
      n: new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld),
    })
  })
  const total = sources.reduce((n, src) => n + src.pos.count, 0)
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)
  let s = 11
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  const v = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    let k = Math.floor(rnd() * total)
    const src = sources.find((x) => (k < x.pos.count ? true : ((k -= x.pos.count), false)))
    if (!src) continue
    v.fromBufferAttribute(src.pos, k).applyMatrix4(src.m).toArray(positions, i * 3)
    v.fromBufferAttribute(src.nrm, k).applyMatrix3(src.n).normalize().toArray(normals, i * 3)
    for (let j = 0; j < 4; j++) seeds[i * 4 + j] = rnd()
  }
  return { positions, normals, seeds }
}

/**
 * A warm light that builds up around the figure over the session, for the
 * calm and the good feeling that build up with it: a cloud of softly glowing,
 * gently moving particles on a shell just outside the body, over a faint glow
 * behind it. It starts once the exercise starts, a few particles at first and
 * more and more of them, reaches its full glow near the end, swells gently
 * with each inhale, and stays through the outro.
 */
export function Aura({ engine }: { engine: BreathingEngine }) {
  const dark = useDarkPage()
  const { scene } = useGLTF(MODEL_URL, false, true)
  const plane = useRef<THREE.Mesh>(null)
  const level = useRef(0)
  const time = useRef(0)

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_H)
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uLevel: { value: 0 },
        uVolume: { value: 0 },
        uTime: { value: 0 },
        uDark: { value: 0 },
        uCool: { value: new THREE.Color() },
        uWarm: { value: new THREE.Color() },
        uRose: { value: new THREE.Color() },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })
    return { geometry, material }
  }, [])

  const { sparkGeometry, sparkMaterial } = useMemo(() => {
    const { positions, normals, seeds } = sampleShell(scene, PARTICLES)
    const sparkGeometry = new THREE.BufferGeometry()
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    sparkGeometry.setAttribute('aNormal', new THREE.BufferAttribute(normals, 3))
    sparkGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    sparkGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.35, 0), 0.7)
    const sparkMaterial = new THREE.ShaderMaterial({
      vertexShader: sparkVertex,
      fragmentShader: sparkFragment,
      uniforms: {
        uTime: { value: 0 },
        uLevel: { value: 0 },
        uVolume: { value: 0 },
        uScale: { value: 1 },
        uGlow: { value: new THREE.Color() },
        uSpark: { value: new THREE.Color() },
        uDark: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
    })
    return { sparkGeometry, sparkMaterial }
  }, [scene])

  useEffect(() => {
    const p = PALETTE[dark ? 'dark' : 'light']
    material.uniforms.uCool.value.set(p.cool)
    material.uniforms.uWarm.value.set(p.warm)
    material.uniforms.uRose.value.set(p.rose)
    material.uniforms.uDark.value = dark ? 1 : 0
    sparkMaterial.uniforms.uGlow.value.set(p.glow)
    sparkMaterial.uniforms.uSpark.value.set(p.spark)
    sparkMaterial.uniforms.uDark.value = dark ? 1 : 0
    // Light adds up on the night page; on white it has to tint instead.
    sparkMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending
    sparkMaterial.needsUpdate = true
  }, [dark, material, sparkMaterial])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  useEffect(
    () => () => {
      sparkGeometry.dispose()
      sparkMaterial.dispose()
    },
    [sparkGeometry, sparkMaterial],
  )

  const toCamera = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }, delta) => {
    const snapshot = engine.sample()
    const dt = Math.min(delta, 0.1)
    level.current += (auraLevel(snapshot) - level.current) * (1 - Math.exp(-dt / LEVEL_TAU))
    if (snapshot.status !== 'paused') time.current += dt
    const volume = breathState(snapshot).volume

    const mesh = plane.current
    if (mesh) {
      // Face the camera from just behind the figure, whichever way it is turned.
      toCamera.copy(camera.position).sub(CENTER).setY(0).normalize()
      mesh.position.copy(CENTER).addScaledVector(toCamera, -0.12)
      mesh.quaternion.copy(camera.quaternion)
      mesh.visible = level.current > 0.002
    }
    material.uniforms.uLevel.value = level.current
    material.uniforms.uVolume.value = volume
    material.uniforms.uTime.value = time.current
    sparkMaterial.uniforms.uLevel.value = level.current
    sparkMaterial.uniforms.uVolume.value = volume
    sparkMaterial.uniforms.uTime.value = time.current
    sparkMaterial.uniforms.uScale.value = size.height * 0.03
  })

  return (
    <group>
      <mesh ref={plane} geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />
      <points geometry={sparkGeometry} material={sparkMaterial} renderOrder={8} />
    </group>
  )
}
