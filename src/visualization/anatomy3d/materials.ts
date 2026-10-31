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
  // The organs stay light so the air in them reads clearly; on the dark page the
  // body shows a little more and the organs a little less, so the figure reads as a whole.
  const body = theme === 'dark' ? 1.1 : 1
  const organs = 0.85 * (theme === 'dark' ? 0.85 : 1)
  return {
    // On the dark page a pale rim would glow, so the shell turns a dim steel blue.
    skin: theme === 'dark' ? glass('#2a3242', '#8797b6', 0.06 * body, 0.55 * body) : glass('#f4f6fa', '#b9c4d6', 0.05, 0.62),
    lung: glass('#f6c9ba', '#e3907b', 0.26 * organs, 0.82 * organs),
    diaphragm: glass('#f7c2ab', '#e8977a', 0.32 * organs, 0.88 * organs),
    airway: glass('#f2ad9c', '#d8735f', 0.42 * organs, 0.92 * organs, { emissive: '#d8735f', emissiveIntensity: 0.25 }),
    heart: new THREE.MeshStandardMaterial({ color: '#ef7a6a', roughness: 0.42, emissive: '#b8382c', emissiveIntensity: 0.12 }),
  }
}
