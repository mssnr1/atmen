import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, type RefObject } from 'react'
import * as THREE from 'three'
import type { BreathingEngine } from '../../engine'
import { breathState } from '../breathState'
import { makeParticles, particleState, type ParticleState } from './airflow3d'

const COUNT = 1400

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
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c) * 4.0;
    float a = exp(-d * 3.0) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

/**
 * The air as a soft volume of overlapping translucent sprites. Their positions
 * come from `particleState`, a pure function of the engine's breath state, so
 * the air follows the breathing engine exactly and stops when it pauses.
 */
export function AirVolume({ engine, drift }: { engine: BreathingEngine; drift: RefObject<number> }) {
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
      uniforms: { uColor: { value: new THREE.Color('#4a82ff') }, uScale: { value: 1 } },
      transparent: true,
      depthWrite: false,
      depthTest: true,
    })
    const scratch: ParticleState = { position: [0, 0, 0], alpha: 0, size: 1 }
    return { geometry: g, material: m, scratch }
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ size, camera }) => {
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
    // Sprite size in world units (~1.4 cm), converted to pixels for this viewport.
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180
    material.uniforms.uScale.value = (0.014 * size.height * window.devicePixelRatio) / (2 * Math.tan(fov / 2))
  })

  return <points geometry={geometry} material={material} renderOrder={5} frustumCulled={false} />
}
