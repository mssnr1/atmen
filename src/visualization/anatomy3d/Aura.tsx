import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { BreathingEngine, EngineSnapshot } from '../../engine'
import { breathState } from '../breathState'

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
 * A soft glow around the silhouette of head and upper body, drawn as a signed
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

    float strength = mix(0.62, 0.5, uDark) * smoothstep(0.0, 0.25, uLevel) * (0.55 + 0.45 * uLevel);
    float alpha = shape * frame * strength;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col, alpha);
  }
`

const moteVertex = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uLevel;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    // Each mote rises slowly on its own loop around the figure, fading in and out.
    float life = fract(aSeed.w + uTime * (0.025 + 0.02 * aSeed.z));
    float ang = aSeed.x * 6.2832 + uTime * 0.05 * (aSeed.z - 0.5);
    float r = 0.2 + 0.16 * aSeed.y + 0.03 * sin(uTime * 0.4 + aSeed.x * 20.0);
    vec3 p = vec3(cos(ang) * r, 1.0 + life * 0.85, sin(ang) * r * 0.7);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uScale * (0.6 + aSeed.z) / -mv.z;
    // More motes appear as the aura builds; few at the start, all at the end.
    float shown = smoothstep(aSeed.y * 0.9, aSeed.y * 0.9 + 0.1, uLevel - 0.15);
    vAlpha = sin(life * 3.1416) * shown * smoothstep(1.85, 1.6, p.y);
  }
`

const moteFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDark;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = exp(-dot(c, c) * 14.0) * vAlpha * mix(0.9, 0.55, uDark);
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

const MOTES = 45

/** Colours per theme: on white the glow needs more colour to show, on the night page it needs light. */
const PALETTE = {
  light: { cool: '#ecd9bd', warm: '#ffcc9c', rose: '#ffb3c6', mote: '#fffaf0' },
  dark: { cool: '#8a7a66', warm: '#f2b98a', rose: '#d98aa8', mote: '#ffe2bd' },
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
 * A warm light that builds up around the figure over the session, for the
 * calm and the good feeling that build up with it. It starts once the exercise
 * starts, reaches its full glow near the end, swells gently with each inhale,
 * and stays through the outro. It is drawn behind the body so the glass figure
 * stays in front of it.
 */
export function Aura({ engine }: { engine: BreathingEngine }) {
  const dark = useDarkPage()
  const plane = useRef<THREE.Mesh>(null)
  const level = useRef(0)
  const time = useRef(0)

  const { geometry, material, moteGeometry, moteMaterial } = useMemo(() => {
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
    const seeds = new Float32Array(MOTES * 4)
    // A fixed pseudo-random spread, the same every session.
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < seeds.length; i++) seeds[i] = rnd()
    const moteGeometry = new THREE.BufferGeometry()
    moteGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3))
    moteGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    moteGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.4, 0), 0.7)
    const moteMaterial = new THREE.ShaderMaterial({
      vertexShader: moteVertex,
      fragmentShader: moteFragment,
      uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uScale: { value: 1 }, uColor: { value: new THREE.Color() }, uDark: { value: 0 } },
      transparent: true,
      depthWrite: false,
    })
    return { geometry, material, moteGeometry, moteMaterial }
  }, [])

  useEffect(() => {
    const p = PALETTE[dark ? 'dark' : 'light']
    material.uniforms.uCool.value.set(p.cool)
    material.uniforms.uWarm.value.set(p.warm)
    material.uniforms.uRose.value.set(p.rose)
    material.uniforms.uDark.value = dark ? 1 : 0
    moteMaterial.uniforms.uColor.value.set(p.mote)
    moteMaterial.uniforms.uDark.value = dark ? 1 : 0
  }, [dark, material, moteMaterial])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      moteGeometry.dispose()
      moteMaterial.dispose()
    },
    [geometry, material, moteGeometry, moteMaterial],
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
    moteMaterial.uniforms.uLevel.value = level.current
    moteMaterial.uniforms.uTime.value = time.current
    moteMaterial.uniforms.uScale.value = size.height * 0.02
  })

  return (
    <group>
      <mesh ref={plane} geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />
      <points geometry={moteGeometry} material={moteMaterial} renderOrder={8} />
    </group>
  )
}
