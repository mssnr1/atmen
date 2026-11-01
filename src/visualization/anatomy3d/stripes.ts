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
  /** Draw the inside (back faces) instead of the outside, e.g. the far wall of a lung seen through its near wall. */
  side?: 'front' | 'back'
  /** Write depth so whatever lies behind this surface is hidden instead of showing through. */
  occlude?: boolean
}

export function stripeMaterial(o: StripeOptions): THREE.Material {
  const m = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: o.occlude ?? false,
    side: o.side === 'back' ? THREE.BackSide : THREE.FrontSide,
  })
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

/**
 * A soft glow along the edge of a shape: its back faces pushed out a little
 * along the normals, brightest right at the edge and fading outward, like the
 * rim on the inside of the edge. Where one lung lies in front of the other this
 * marks the edge between them; inside a lung its own near wall hides it.
 */
export function outlineMaterial(color: string, alpha: number, offset: { value: number }): THREE.Material {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.BackSide })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uOffset = offset
    shader.uniforms.uAlpha = { value: alpha }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uOffset;\nvarying vec3 vN;\nvarying vec3 vView;')
      .replace('#include <morphtarget_vertex>', '#include <morphtarget_vertex>\ntransformed += normalize(normal) * uOffset;')
      // Pulled 7 mm toward the eye (same spot on screen), so the edge is not lost
      // where the two lungs almost touch.
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vN = normalize(normalMatrix * normal);
        vView = -mvPosition.xyz;
        mvPosition.xyz *= 1.0 - 0.007 / length(mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uAlpha;\nvarying vec3 vN;\nvarying vec3 vView;')
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        // Just outside the edge the pushed-out surface still faces away a little; at its own rim it turns edge-on.
        float f = abs(dot(normalize(vN), normalize(vView)));
        gl_FragColor.a = pow(smoothstep(0.0, 0.45, f), 1.6) * uAlpha;`,
      )
  }
  m.customProgramCacheKey = () => `outline-${color}-${alpha}`
  return m
}

export type StripePalette = { line: string; lung: string; lungRim: string; body: string }

export const STRIPE_PALETTES: Record<'light' | 'dark', StripePalette> = {
  light: { body: '#7d8798', line: '#2f6bf5', lung: '#2f6bf5', lungRim: '#6f9bff' },
  dark: { body: '#8f877f', line: '#b89aff', lung: '#b89aff', lungRim: '#dccbff' },
}

export function makeStripeMaterials(p: StripePalette, dark: boolean, level: { value: number }, outline: { value: number }) {
  return {
    skin: stripeMaterial({ pattern: 'around', density: 120, width: 0.06, line: p.body, fill: p.body, lineAlpha: dark ? 0.6 : 0.55, fillAlpha: 0.0, rim: p.body, rimAlpha: dark ? 0.3 : 0.26, focusTrunk: true }),
    head: stripeMaterial({ pattern: 'around', density: 120, width: 0.0, line: p.body, fill: p.body, lineAlpha: 0.0, fillAlpha: 0.0, rim: p.body, rimAlpha: dark ? 0.32 : 0.28 }),
    // The lungs are drawn as a solid volume: first their far wall (the rings at the back, dimmed),
    // then their near wall. Both write depth, so the other lung and the airways behind or inside
    // a lung no longer show through it; only the lung's own back rings do.
    lungBack: stripeMaterial({ pattern: 'level', density: 85, width: 0.07, line: p.lung, fill: p.lung, lineAlpha: dark ? 0.42 : 0.36, dimAlpha: dark ? 0.1 : 0.08, fillAlpha: 0.0, rim: p.lungRim, rimAlpha: 0.0, level, side: 'back', occlude: true }),
    lung: stripeMaterial({ pattern: 'level', density: 85, width: 0.07, line: p.lung, fill: p.lung, lineAlpha: 1.0, dimAlpha: dark ? 0.22 : 0.18, fillAlpha: dark ? 0.05 : 0.035, rim: p.lungRim, rimAlpha: 0.85, level, occlude: true }),
    lungOutline: outlineMaterial(dark ? p.lung : p.lungRim, dark ? 0.5 : 0.9, outline),
    diaphragm: stripeMaterial({ pattern: 'level', density: 85, width: 0.06, line: p.lung, fill: p.lung, lineAlpha: 0.3, fillAlpha: 0.0, rim: p.lungRim, rimAlpha: 0.3 }),
    airway: stripeMaterial({ pattern: 'level', density: 160, width: 0.1, line: p.lung, fill: p.lung, lineAlpha: 0.45, fillAlpha: 0.04, rim: p.lungRim, rimAlpha: 0.45 }),
  }
}
