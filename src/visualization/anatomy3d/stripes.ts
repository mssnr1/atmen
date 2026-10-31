import * as THREE from 'three'

/**
 * Contour-stripe look: the body is drawn only as thin lines that follow its
 * surface (vertical around the trunk), the lungs as glowing horizontal contour
 * lines in the accent colour. Stripes are laid out on the resting shape, so
 * they ride along with the surface as it breathes instead of sliding over it.
 */
export type StripeOptions = {
  /** 'around' = lines running down the trunk, 'level' = horizontal contour lines. */
  pattern: 'around' | 'level'
  /** Lines per metre (level) or per full turn (around). */
  density: number
  /** Half width of a line, as a fraction of the spacing. */
  width: number
  line: string
  fill: string
  /** Opacity of the line and of the faint fill between lines. */
  lineAlpha: number
  fillAlpha: number
  /** Colour and strength of the silhouette glow. */
  rim: string
  rimAlpha: number
  /** Fade the arms and the lower body out so the trunk carries the picture. */
  focusTrunk?: boolean
  /** Shared world height up to which the lines are lit (the breath filling up); lines above stay at `dimAlpha`. */
  level?: { value: number }
  dimAlpha?: number
}

export function stripeMaterial(o: StripeOptions): THREE.Material {
  const m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uLine: { value: new THREE.Color(o.line) },
      uFill: { value: new THREE.Color(o.fill) },
      uRim: { value: new THREE.Color(o.rim) },
      uDensity: { value: o.density },
      uWidth: { value: o.width },
      uLineA: { value: o.lineAlpha },
      uFillA: { value: o.fillAlpha },
      uRimA: { value: o.rimAlpha },
      uLevel: o.level ?? { value: 99 },
      uDim: { value: o.dimAlpha ?? o.lineAlpha },
    })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRest;\nvarying vec3 vN;\nvarying vec3 vView;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vRest = (modelMatrix * vec4(position, 1.0)).xyz;
        vN = normalize(normalMatrix * normal);
        vView = -mvPosition.xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vRest; varying vec3 vN; varying vec3 vView;
        uniform vec3 uLine; uniform vec3 uFill; uniform vec3 uRim;
        uniform float uDensity; uniform float uWidth; uniform float uLineA; uniform float uFillA; uniform float uRimA; uniform float uLevel; uniform float uDim;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        ${o.pattern === 'level' ? 'float v = vRest.y * uDensity;' : 'float v = atan(vRest.x, vRest.z + 0.03) / 6.2831853 * uDensity;'}
        float d = abs(fract(v) - 0.5);
        float w = fwidth(v) * 0.9;
        float line = smoothstep(0.5 - uWidth - w, 0.5 - uWidth + w, d);
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.0);
        float focus = 1.0;
        ${o.focusTrunk ? 'focus = (1.0 - smoothstep(0.13, 0.2, abs(vRest.x))) * smoothstep(0.98, 1.12, vRest.y); line *= mix(0.3, 1.0, smoothstep(0.05, 0.5, fr));' : ''}
        vec3 col = mix(uFill, uLine, line);
        col = mix(col, uRim, fr * 0.8);
        float lit = 1.0 - smoothstep(uLevel - 0.012, uLevel + 0.012, vRest.y);
        col = mix(mix(uFill, uLine, line * 0.55), col, lit);
        float a = mix(uFillA, mix(uDim, uLineA, lit), line);
        a = max(a, fr * uRimA * mix(0.5, 1.0, lit));
        gl_FragColor = vec4(col, a * focus);`,
      )
  }
  m.customProgramCacheKey = () => `stripes-${JSON.stringify(o)}`
  return m
}

export type StripePalette = { line: string; lung: string; lungRim: string; body: string }

export const STRIPE_PALETTES: Record<'light' | 'dark', StripePalette> = {
  light: { body: '#7d8798', line: '#2f6bf5', lung: '#2f6bf5', lungRim: '#6f9bff' },
  dark: { body: '#8f877f', line: '#b89aff', lung: '#b89aff', lungRim: '#dccbff' },
}

export function makeStripeMaterials(p: StripePalette, dark: boolean, level: { value: number }) {
  return {
    skin: stripeMaterial({ pattern: 'around', density: 120, width: 0.06, line: p.body, fill: p.body, lineAlpha: dark ? 0.6 : 0.55, fillAlpha: 0.0, rim: p.body, rimAlpha: dark ? 0.3 : 0.26, focusTrunk: true }),
    head: stripeMaterial({ pattern: 'around', density: 120, width: 0.0, line: p.body, fill: p.body, lineAlpha: 0.0, fillAlpha: 0.0, rim: p.body, rimAlpha: dark ? 0.32 : 0.28 }),
    lung: stripeMaterial({ pattern: 'level', density: 85, width: 0.07, line: p.lung, fill: p.lung, lineAlpha: 1.0, dimAlpha: dark ? 0.22 : 0.18, fillAlpha: dark ? 0.05 : 0.035, rim: p.lungRim, rimAlpha: 0.85, level }),
    diaphragm: stripeMaterial({ pattern: 'level', density: 85, width: 0.06, line: p.lung, fill: p.lung, lineAlpha: 0.3, fillAlpha: 0.0, rim: p.lungRim, rimAlpha: 0.3 }),
    airway: stripeMaterial({ pattern: 'level', density: 160, width: 0.1, line: p.lung, fill: p.lung, lineAlpha: 0.45, fillAlpha: 0.04, rim: p.lungRim, rimAlpha: 0.45 }),
  }
}
