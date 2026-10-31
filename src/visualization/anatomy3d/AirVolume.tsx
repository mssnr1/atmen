import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { BreathingEngine } from '../../engine'
import { breathState, usedAir } from '../breathState'
import { useDarkPage } from './Aura'
import { makeParticles, particleState, type ParticleState } from './airflow3d'

const COUNT = 2400

const vertex = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uScale * aSize / -mv.z;
    vAlpha = aAlpha;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uUsed;
  uniform float uMix;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c) * 4.0;
    float a = exp(-d * 3.0) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(uColor, uUsed, uMix), a);
  }
`

/**
 * The air as a soft volume of overlapping translucent sprites. Their positions
 * come from `particleState`, a pure function of the engine's breath state, so
 * the air follows the breathing engine exactly and stops when it pauses.
 * Fresh air is blue, used air violet.
 */
export function AirVolume({ engine, drift }: { engine: BreathingEngine; drift: RefObject<number> }) {
  const mixVelocity = useRef(0)
  const particles = useMemo(() => makeParticles(COUNT), [])
  const { geometry, material, scratch } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(COUNT), 1).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(COUNT), 1).setUsage(THREE.DynamicDrawUsage))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.4, 0.05), 0.6)
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uColor: { value: new THREE.Color('#4a82ff') }, uUsed: { value: new THREE.Color('#a855f7') }, uMix: { value: 0 }, uScale: { value: 1 } },
      transparent: true,
      depthWrite: false,
      depthTest: true,
    })
    const scratch: ParticleState = { position: [0, 0, 0], alpha: 0, size: 1 }
    return { geometry: g, material: m, scratch }
  }, [])

  // Fresh and used air take the theme's colours (--color-air, --color-air-used), so the night theme can tone it down.
  const dark = useDarkPage()
  useEffect(() => {
    const css = getComputedStyle(document.documentElement)
    material.uniforms.uColor.value.set(css.getPropertyValue('--color-air').trim() || '#4a82ff')
    material.uniforms.uUsed.value.set(css.getPropertyValue('--color-air-used').trim() || '#a855f7')
  }, [dark, material])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ size, camera }, delta) => {
    const b = breathState(engine.sample())
    const pos = geometry.attributes.position.array as Float32Array
    const alpha = geometry.attributes.aAlpha.array as Float32Array
    const sz = geometry.attributes.aSize.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      scratch.alpha = 0
      particleState(particles[i], b, drift.current ?? 0, scratch)
      pos[i * 3] = scratch.position[0]
      pos[i * 3 + 1] = scratch.position[1]
      pos[i * 3 + 2] = scratch.position[2]
      alpha[i] = scratch.alpha
      sz[i] = scratch.size
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.aAlpha.needsUpdate = true
    geometry.attributes.aSize.needsUpdate = true
    // The colour turns slowly and softly, easing in and out (a critically damped spring, ~1.5 s).
    const u = material.uniforms.uMix
    const dt = Math.min(delta, 0.1)
    const w = 4
    mixVelocity.current += (w * w * (usedAir(b.phase) - u.value) - 2 * w * mixVelocity.current) * dt
    u.value = Math.min(Math.max(u.value + mixVelocity.current * dt, 0), 1)
    // Sprite size in world units (~1.4 cm), converted to pixels for this viewport.
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180
    material.uniforms.uScale.value = (0.014 * size.height * window.devicePixelRatio) / (2 * Math.tan(fov / 2))
  })

  return <points geometry={geometry} material={material} renderOrder={5} frustumCulled={false} />
}
