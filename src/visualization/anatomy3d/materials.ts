import * as THREE from 'three'

export type MaterialKind = 'skin' | 'lung' | 'airway' | 'heart' | 'diaphragm'

/**
 * A standard material whose opacity and tint rise toward the silhouette
 * (fresnel), which reads as frosted glass on a white background without the
 * cost of real transmission.
 */
function glass(color: string, rim: string, base: number, edge: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    ...extra,
  })
  const rimColor = new THREE.Color(rim)
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: rimColor }
    shader.uniforms.uBase = { value: base }
    shader.uniforms.uEdge = { value: edge }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;\nuniform float uBase;\nuniform float uEdge;')
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uRim, fr * 0.7);
        gl_FragColor.a = mix(uBase, uEdge, fr);`,
      )
  }
  m.customProgramCacheKey = () => `glass-${color}-${rim}-${base}-${edge}`
  return m
}

export function makeMaterials(theme: 'light' | 'dark' = 'light'): Record<MaterialKind, THREE.Material> {
  return {
    // On the dark page a pale rim would glow, so the shell turns a dim steel blue.
    skin: theme === 'dark' ? glass('#2a3242', '#8797b6', 0.06, 0.55) : glass('#f4f6fa', '#b9c4d6', 0.05, 0.62),
    lung: glass('#f6c9ba', '#e3907b', 0.26, 0.82),
    diaphragm: glass('#f7c2ab', '#e8977a', 0.32, 0.88),
    airway: glass('#f2ad9c', '#d8735f', 0.42, 0.92, { emissive: '#d8735f', emissiveIntensity: 0.25 }),
    heart: new THREE.MeshStandardMaterial({ color: '#ef7a6a', roughness: 0.42, emissive: '#b8382c', emissiveIntensity: 0.12 }),
  }
}
