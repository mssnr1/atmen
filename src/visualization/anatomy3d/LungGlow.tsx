import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTheme } from '../../lib/theme'
import { breathState, type BreathSource } from '../breathState'

const COUNT = 520

/** Where the glow lies: an oval just under the lungs (world metres), filled in once the lungs are known. */
export type GlowBed = { y: number; x: number; z: number; rx: number; rz: number }

const vertex = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime; uniform float uSize; uniform float uBreath; uniform float uShow;
uniform vec3 uLow; uniform vec3 uHigh;
varying vec3 vColor; varying float vAlpha;
void main() {
  vec3 p = position;
  // Each speck drifts up a little and back, twinkling on its own clock; the breath lifts them all.
  float t = uTime * (0.35 + aSeed.y * 0.4) + aSeed.x * 6.2831;
  p.y += (0.004 + 0.012 * uBreath) * sin(t) * aSeed.z;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.55 + 0.45 * sin(t * 2.3 + aSeed.y * 9.0);
  gl_PointSize = uSize * (0.6 + aSeed.z * 0.9) * (0.8 + 0.4 * tw);
  vColor = mix(uLow, uHigh, aSeed.x);
  vAlpha = tw * (0.45 + 0.55 * uBreath) * uShow;
}`

const fragment = /* glsl */ `
varying vec3 vColor; varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor, a * a * vAlpha);
}`

/**
 * The bed of glowing specks under the lungs (style guide): sky and lavender light that twinkles
 * softly and brightens as the lungs fill. Purely decorative; it follows the engine's breath state.
 */
export function LungGlow({ engine, bed, show }: { engine: BreathSource; bed: GlowBed; show: { value: number } }) {
  const theme = useTheme()
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(COUNT * 3)
    const seed = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      // Denser toward the middle of the oval, thinning out to its edge.
      const r = Math.sqrt(Math.random()) ** 1.4
      const a = Math.random() * Math.PI * 2
      pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.012 * (1 - r), Math.sin(a) * r], i * 3)
      seed.set([Math.random(), Math.random(), Math.random()], i * 3)
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 3 },
        uBreath: { value: 0 },
        uShow: show,
        uLow: { value: new THREE.Color() },
        uHigh: { value: new THREE.Color() },
      },
      transparent: true,
      depthWrite: false,
    })
    return { geometry: g, material: m }
  }, [show])

  useEffect(() => {
    const dark = theme === 'dark'
    material.uniforms.uLow.value.set(dark ? '#7dd3fc' : '#4f7fd9')
    material.uniforms.uHigh.value.set(dark ? '#c7bbff' : '#6f5cf0')
    material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending
    material.needsUpdate = true
  }, [theme, material])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const points = useMemo(() => new THREE.Points(geometry, material), [geometry, material])
  useFrame(({ clock, gl }) => {
    const b = breathState(engine.sample())
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uBreath.value = b.volume
    material.uniforms.uSize.value = 2.4 * gl.getPixelRatio()
    points.position.set(bed.x, bed.y, bed.z)
    points.scale.set(bed.rx, 1, bed.rz)
    points.visible = bed.rx > 0 && show.value > 0.001
  })

  return <primitive object={points} renderOrder={7} frustumCulled={false} />
}
