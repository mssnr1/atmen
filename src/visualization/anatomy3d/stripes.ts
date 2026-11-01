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
  /** Screen-space map of how far away the nearest lung surface is, to draw the rim where this surface lies in front of another (see `edgeDepthMaterial`). */
  edges?: EdgeMap
  /** How quickly the rim fades inward from the silhouette; lower is a broader rim. */
  rimPower?: number
}

/** Shared uniforms of the lung edge map: the texture, the drawing buffer size and the rim width, both in device pixels. */
export type EdgeMap = { map: { value: THREE.Texture | null }; size: { value: THREE.Vector2 }; radius: { value: number } }

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
      ...(o.edges ? { uEdgeMap: o.edges.map, uEdgeSize: o.edges.size, uEdgeR: o.edges.radius } : {}),
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
        uniform float uDensity; uniform float uWidth; uniform float uLineA; uniform float uFillA; uniform float uRimA; uniform float uLevel; uniform float uDim;
        ${o.edges ? EDGE_GLSL : ''}`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        ${o.pattern === 'level' ? 'float v = vRest.y * uDensity;' : 'float v = atan(vRest.x, vRest.z + 0.03) / 6.2831853 * uDensity;'}
        float d = abs(fract(v) - 0.5);
        float w = fwidth(v) * 0.9;
        float line = smoothstep(0.5 - uWidth - w, 0.5 - uWidth + w, d);
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), ${(o.rimPower ?? 2).toFixed(2)});
        ${o.edges ? 'fr = max(fr, edgeRim(vView.z));' : ''}
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
 * The rim where a lung lies in front of something else on screen (the other
 * lung). Lungs have sharp front borders whose normals never
 * turn edge-on, so the normal-based rim misses that edge; this finds it from the
 * edge map instead: where the other lung shows within the rim width, this lung
 * gets the rim, strongest at the edge and fading inward like the outer one.
 */
const EDGE_GLSL = `
uniform sampler2D uEdgeMap; uniform vec2 uEdgeSize; uniform float uEdgeR;
float edgeRim(float depth) {
  vec2 own = texture2D(uEdgeMap, gl_FragCoord.xy / uEdgeSize).rg;
  // Only where this fragment is the surface in the map (not a hidden one behind it).
  if (own.g <= 0.0 || abs(own.r - depth) > 0.01) return 0.0;
  // Cheap test first: is the other lung anywhere near? Most of the lung is far from the edge.
  bool near = false;
  for (int i = 0; i < 8; i++) {
    vec2 dir = vec2(cos(float(i) * 0.7853982), sin(float(i) * 0.7853982));
    for (int k = 1; k <= 3; k++) {
      vec2 s = texture2D(uEdgeMap, (gl_FragCoord.xy + dir * float(k) / 3.0 * uEdgeR) / uEdgeSize).rg;
      if (s.g > 0.0 && abs(s.g - own.g) > 0.5) near = true;
    }
  }
  if (!near) return 0.0;
  float e = 0.0;
  for (int i = 0; i < 12; i++) {
    float t = float(i) * 0.5235988;
    vec2 dir = vec2(cos(t), sin(t));
    for (int k = 1; k <= 8; k++) {
      float r = float(k) / 8.0;
      vec2 s = texture2D(uEdgeMap, (gl_FragCoord.xy + dir * r * uEdgeR) / uEdgeSize).rg;
      // The other lung: this lung's edge runs between here and there.
      if (s.g > 0.0 && abs(s.g - own.g) > 0.5) { e = max(e, 1.125 - r); break; }
    }
  }
  return pow(min(e, 1.0), 2.0);
}`

/** Draws the distance from the eye to the nearest lung surface and which lung it is (1 or 2), for the edge map. */
export function edgeDepthMaterial(id: number): THREE.Material {
  const m = new THREE.MeshBasicMaterial({ side: THREE.FrontSide })
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vDepth;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvDepth = -mvPosition.z;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDepth;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>\ngl_FragColor = vec4(vDepth, ${id.toFixed(1)}, 0.0, 1.0);`)
  }
  m.customProgramCacheKey = () => `lung-edge-depth-${id}`
  return m
}

export type StripePalette = { line: string; lung: string; lungRim: string; body: string }

export const STRIPE_PALETTES: Record<'light' | 'dark', StripePalette> = {
  light: { body: '#7d8798', line: '#2f6bf5', lung: '#2f6bf5', lungRim: '#6f9bff' },
  dark: { body: '#8f877f', line: '#b89aff', lung: '#b89aff', lungRim: '#dccbff' },
}

export function makeStripeMaterials(p: StripePalette, dark: boolean, level: { value: number }, edges?: EdgeMap) {
  return {
    skin: stripeMaterial({ pattern: 'around', density: 120, width: 0.06, line: p.body, fill: p.body, lineAlpha: dark ? 0.6 : 0.55, fillAlpha: 0.0, rim: p.body, rimAlpha: dark ? 0.3 : 0.26, focusTrunk: true }),
    head: stripeMaterial({ pattern: 'around', density: 120, width: 0.0, line: p.body, fill: p.body, lineAlpha: 0.0, fillAlpha: 0.0, rim: p.body, rimAlpha: dark ? 0.32 : 0.28 }),
    // The lungs are drawn as a solid volume: first their far wall (the rings at the back, dimmed),
    // then their near wall. Both write depth, so the other lung and the airways behind or inside
    // a lung no longer show through it; only the lung's own back rings do.
    lungBack: stripeMaterial({ pattern: 'level', density: 85, width: 0.07, line: p.lung, fill: p.lung, lineAlpha: dark ? 0.42 : 0.36, dimAlpha: dark ? 0.1 : 0.08, fillAlpha: 0.0, rim: p.lungRim, rimAlpha: 0.0, level, side: 'back', occlude: true }),
    lung: stripeMaterial({ pattern: 'level', density: 85, width: 0.07, line: p.lung, fill: p.lung, lineAlpha: 1.0, dimAlpha: dark ? 0.22 : 0.18, fillAlpha: dark ? 0.05 : 0.035, rim: p.lungRim, rimAlpha: 0.85, level, occlude: true, edges, rimPower: 1.5 }),
    lungEdgeLeft: edgeDepthMaterial(1),
    lungEdgeRight: edgeDepthMaterial(2),
    diaphragm: stripeMaterial({ pattern: 'level', density: 85, width: 0.06, line: p.lung, fill: p.lung, lineAlpha: 0.3, fillAlpha: 0.0, rim: p.lungRim, rimAlpha: 0.3 }),
    airway: stripeMaterial({ pattern: 'level', density: 160, width: 0.1, line: p.lung, fill: p.lung, lineAlpha: 0.45, fillAlpha: 0.04, rim: p.lungRim, rimAlpha: 0.45 }),
  }
}
