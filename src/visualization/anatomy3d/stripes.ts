import * as THREE from 'three'
import { RING_DENSITY } from '../../lib/lungRings'

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
  /** Lines stronger toward the silhouette, quieter across the middle of the body, so the outline carries the picture. */
  focusTrunk?: boolean
  /** 'around' lines run round each arm's own long axis (the geometry's `axis` attribute, see `addLimbAxis`) instead of the trunk's. */
  limb?: boolean
  /** Shared world height up to which the lines are lit (the breath filling up); lines above stay at `dimAlpha`. */
  level?: { value: number }
  dimAlpha?: number
  /** Draw the inside (back faces) instead of the outside, e.g. the far wall of a lung seen through its near wall. */
  side?: 'front' | 'back' | 'both'
  /** Write depth so whatever lies behind this surface is hidden instead of showing through. */
  occlude?: boolean
  /** Screen-space map of how far away the nearest lung surface is, to draw the rim where this surface lies in front of another (see `edgeDepthMaterial`). */
  edges?: EdgeMap
  /** How quickly the rim fades inward from the silhouette; lower is a broader rim. */
  rimPower?: number
  /** Shared multiplier of the final opacity, e.g. to fade the lungs out after the exercise. */
  show?: { value: number }
  /**
   * A second colour toward the bottom: below `range.x` (world height) line, fill and rim take `low`,
   * above `range.y` they keep their own colour, with a smooth blend between (the style guide's gradients).
   * `fill` is the colour the fill takes instead (the skin: its lines change colour, what lies between them stays as it is).
   */
  gradient?: { low: string; fill?: string; range: { value: THREE.Vector2 } }
  /** Add light instead of covering what lies behind: the surface glows (for the dark page). */
  glow?: boolean
  /** A broad outline glow in `color`, as strong as `amount` (0 = off): the lungs light up with the "more volume" card. */
  pulse?: { amount: { value: number }; color: string }
  /** Opacity of the fill where the breath has lit the surface (defaults to `fillAlpha`): the day look's violet wash in the lungs. */
  fillLitAlpha?: number
  /** Colour of the lines the breath has not reached yet (defaults to a dimmed `line`): the day look's ink lines. */
  dimLine?: string
  /** Draw the rim as a line of even strength between these two rim values instead of a soft glow: an ink outline. */
  rimEdge?: [number, number]
  /** The rim keeps its own colour instead of following the gradient. */
  rimPlain?: boolean
}

/** Shared uniforms of the lung edge map: the texture, the drawing buffer size and the rim width, both in device pixels. */
export type EdgeMap = { map: { value: THREE.Texture | null }; size: { value: THREE.Vector2 }; radius: { value: number } }

export function stripeMaterial(o: StripeOptions): THREE.Material {
  const m = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: o.occlude ?? false,
    blending: o.glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: o.side === 'back' ? THREE.BackSide : o.side === 'both' ? THREE.DoubleSide : THREE.FrontSide,
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
      uShow: o.show ?? { value: 1 },
      uLow: { value: new THREE.Color(o.gradient?.low ?? o.line) },
      uLowFill: { value: new THREE.Color(o.gradient?.fill ?? o.gradient?.low ?? o.line) },
      uRange: o.gradient?.range ?? { value: new THREE.Vector2(-99, -98) },
      uPulse: o.pulse?.amount ?? { value: 0 },
      uPulseC: { value: new THREE.Color(o.pulse?.color ?? o.rim) },
      uFillLit: { value: o.fillLitAlpha ?? o.fillAlpha },
      uDimC: { value: new THREE.Color(o.dimLine ?? o.line) },
      ...(o.edges ? { uEdgeMap: o.edges.map, uEdgeSize: o.edges.size, uEdgeR: o.edges.radius } : {}),
    })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vRest;\nvarying vec3 vN;\nvarying vec3 vView;${o.limb ? '\nattribute vec2 axis;\nvarying vec2 vAxis;' : ''}`)
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vRest = (modelMatrix * vec4(position, 1.0)).xyz;
        ${o.limb ? 'vAxis = (modelMatrix * vec4(axis.x, position.y, axis.y, 1.0)).xz;' : ''}
        // The normal follows the morph targets too (e.g. the calm face), so the rim and line strength follow the shape.
        vec3 shapedNormal = normal;
        #ifdef USE_MORPHNORMALS
        shapedNormal *= morphTargetBaseInfluence;
        for (int i = 0; i < MORPHTARGETS_COUNT; i++) {
          if (morphTargetInfluences[i] != 0.0) shapedNormal += getMorph(gl_VertexID, i, 1).xyz * morphTargetInfluences[i];
        }
        #endif
        vN = normalize(normalMatrix * shapedNormal);
        vView = -mvPosition.xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vRest; varying vec3 vN; varying vec3 vView;${o.limb ? ' varying vec2 vAxis;' : ''}
        uniform vec3 uLine; uniform vec3 uFill; uniform vec3 uRim;
        uniform float uDensity; uniform float uWidth; uniform float uLineA; uniform float uFillA; uniform float uRimA; uniform float uLevel; uniform float uDim; uniform float uShow;
        uniform vec3 uLow; uniform vec3 uLowFill; uniform vec2 uRange; uniform float uPulse; uniform vec3 uPulseC; uniform float uFillLit; uniform vec3 uDimC;
        ${o.edges ? EDGE_GLSL : ''}`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        ${o.pattern === 'level' ? 'float v = vRest.y * uDensity;' : o.limb ? 'float v = atan(vRest.x - vAxis.x, vRest.z - vAxis.y) / 6.2831853 * uDensity;' : 'float v = atan(vRest.x, vRest.z + 0.03) / 6.2831853 * uDensity;'}
        float d = abs(fract(v) - 0.5);
        float w = fwidth(v) * 0.9;
        float line = smoothstep(0.5 - uWidth - w, 0.5 - uWidth + w, d);
        ${o.pattern === 'around' ? '// Where the lines crowd closer than a few pixels (between the legs, close to the axis they run round) they fade, instead of knotting into a star.\n        line *= 1.0 - smoothstep(0.2, 0.45, fwidth(v));' : ''}
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), ${(o.rimPower ?? 2).toFixed(2)});
        ${o.edges ? 'fr = max(fr, edgeRim(vView.z));' : ''}
        ${o.rimEdge ? `fr = smoothstep(${o.rimEdge[0].toFixed(3)}, ${o.rimEdge[1].toFixed(3)}, fr);` : ''}
        float focus = 1.0;
        ${o.focusTrunk ? 'line *= mix(0.3, 1.0, smoothstep(0.05, 0.5, fr));' : ''}
        float low = 1.0 - smoothstep(uRange.x, uRange.y, vRest.y);
        vec3 cLine = mix(uLine, uLow, low);
        vec3 cFill = mix(uFill, uLowFill, low * 0.8);
        vec3 cRim = ${o.rimPlain ? 'uRim' : 'mix(uRim, uLow, low * 0.7)'};
        vec3 col = mix(cFill, cLine, line);
        col = mix(col, cRim, fr * 0.8);
        float lit = 1.0 - smoothstep(uLevel - 0.012, uLevel + 0.012, vRest.y);
        col = mix(${o.dimLine ? 'mix(mix(cFill, uDimC, line), cRim, fr * 0.8)' : 'mix(cFill, cLine, line * 0.55)'}, col, lit);
        float a = mix(mix(uFillA, uFillLit, lit), mix(uDim, uLineA, lit), line);
        a = max(a, fr * uRimA * mix(0.5, 1.0, lit));
        ${o.pulse ? `float fp = max(pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 1.1), fr);
        float gp = uPulse * smoothstep(0.08, 0.75, fp);
        col = mix(col, uPulseC, min(gp * 1.2, 1.0));
        a = max(a, gp);` : ''}
        ${o.glow ? 'gl_FragColor = vec4(col * min(a * focus * uShow, 1.0), 1.0);' : 'gl_FragColor = vec4(col, min(a * focus * uShow, 1.0));'}`,
      )
  }
  m.customProgramCacheKey = () => `stripes-${JSON.stringify({ ...o, show: !!o.show, level: !!o.level, gradient: !!o.gradient, edges: !!o.edges, pulse: o.pulse?.color })}`
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

/**
 * The skin's depth, drawn before its colour (both sides, nothing visible): the colour pass after it then
 * passes only where it is the nearest skin, so only the surface the eye looks at shows. Pushed back a
 * hair, so that surface itself passes the depth test reliably.
 */
export function skinDepthMaterial(): THREE.Material {
  return new THREE.MeshBasicMaterial({
    transparent: true,
    colorWrite: false,
    depthWrite: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
}

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

/**
 * Colours of the figure (style guide): `body` the skin's lines, `bodyFill` the soft glow between them,
 * `bodyBase` the skin's fill between its lines (close to the page, so the body reads as one calm surface),
 * `bodyRim` the glow along the outline, `bodyLow` the colour the skin turns toward the belly; the lungs
 * run from `lungLow` at their base to `lung` at their top, `lungRim` along their outline.
 */
export type StripePalette = { line: string; lung: string; lungLow: string; lungRim: string; body: string; bodyFill: string; bodyBase: string; bodyRim: string; bodyLow: string; airway: string }

/**
 * Two looks, not one inverted: at night ("Tiefes Leuchten") the body is a dim outline and the lungs carry
 * the light; by day ("Atlas") the body is an ink drawing on paper, and the breath is the only colour.
 */
export const STRIPE_PALETTES: Record<'light' | 'dark', StripePalette> = {
  light: { body: '#1a1f33', bodyFill: '#ffffff', bodyBase: '#fbfbf9', bodyRim: '#1a1f33', bodyLow: '#b4b8c6', line: '#6f5cf0', lung: '#6f5cf0', lungLow: '#4f7fd9', lungRim: '#1a1f33', airway: '#1a1f33' },
  dark: { body: '#8f86ff', bodyFill: '#3d3aa6', bodyBase: '#0d1120', bodyRim: '#b9adff', bodyLow: '#4aa6d6', line: '#b3a6ff', lung: '#b3a6ff', lungLow: '#7dd3fc', lungRim: '#e3dcff', airway: '#b3a6ff' },
}

/**
 * `fade.inner` scales the lungs, airways and diaphragm (1 = shown, 0 = gone), `fade.skin` the skin
 * (1 = as usual): after the exercise the inside fades out and the skin glows a little more.
 */
export type Fade = { inner: { value: number }; skin: { value: number } }

/** Heights (world metres) over which the skin turns from `bodyLow` (belly and below) to its own colour (chest and head). */
const SKIN_GRADIENT = new THREE.Vector2(0.85, 1.45)

export function makeStripeMaterials(p: StripePalette, dark: boolean, level: { value: number }, edges?: EdgeMap, fade?: Fade, lungRange?: { value: THREE.Vector2 }, lungPulse?: { value: number }) {
  const inner = fade?.inner
  // The skin shows only the surface the eye looks at (see `skinDepth`): its lines and rim over a fill in
  // nearly the page's colour, so no far wall, overlap or inner fold of the model shows through it.
  const skinLines: StripeOptions = {
    show: fade?.skin,
    pattern: 'around',
    density: 120,
    width: 0.06,
    line: p.body,
    fill: p.bodyBase,
    lineAlpha: dark ? 0.5 : 0.34,
    fillAlpha: dark ? 0.9 : 0.94,
    rim: p.bodyRim,
    rimAlpha: dark ? 0.85 : 0.92,
    rimPower: dark ? 1.5 : 1.0,
    // By day the outline is a drawn line, not a glow.
    rimEdge: dark ? undefined : [0.74, 0.86],
    focusTrunk: true,
    // Toward the belly only the lines and the outline change colour (by day they grow soft, at night they
    // turn to the sky's blue): the fill between them stays what it is at the chest, close to the page.
    // Taking the low colour too, it made the belly an opaque blue block.
    gradient: { low: p.bodyLow, fill: p.bodyBase, range: { value: SKIN_GRADIENT } },
    side: 'both',
  }
  const lungGradient = lungRange ? { low: p.lungLow, range: lungRange } : undefined
  return {
    // Trunk, neck and head: lines running down round the body's axis, so they go on from the trunk over the
    // neck and jaw onto the head without a step.
    skin: stripeMaterial(skinLines),
    // Arms: the same lines, running round each arm (an arm is about a third of the trunk's girth). The legs
    // take the trunk's own lines, so they run on from the belly without a seam.
    limbs: stripeMaterial({ ...skinLines, limb: true, density: 44 }),
    skinDepth: skinDepthMaterial(),
    // The lungs are drawn as a solid volume: first their far wall (the rings at the back, dimmed),
    // then their near wall. Both write depth, so the other lung and the airways behind or inside
    // a lung no longer show through it; only the lung's own back rings do.
    lungBack: stripeMaterial({ gradient: lungGradient, glow: dark, show: inner, pattern: 'level', density: RING_DENSITY, width: 0.07, line: p.lung, fill: p.lung, lineAlpha: dark ? 0.42 : 0.3, dimAlpha: dark ? 0.1 : 0.06, fillAlpha: 0.0, rim: p.lungRim, rimAlpha: 0.0, level, side: 'back', occlude: true }),
    // By day the breath is a violet wash rising in the lungs; the lines it has not reached stay ink, like the body's.
    lung: stripeMaterial({
      gradient: lungGradient,
      glow: dark,
      show: inner,
      pattern: 'level',
      density: RING_DENSITY,
      width: 0.07,
      line: p.lung,
      fill: p.lung,
      lineAlpha: 1.0,
      dimAlpha: dark ? 0.22 : 0.4,
      fillAlpha: dark ? 0.05 : 0.0,
      rim: p.lungRim,
      rimAlpha: dark ? 0.85 : 0.8,
      level,
      occlude: true,
      edges,
      rimPower: dark ? 1.5 : 1.0,
      pulse: lungPulse ? { amount: lungPulse, color: dark ? '#efeaff' : '#6f5cf0' } : undefined,
      ...(dark ? {} : { fillLitAlpha: 0.22, dimLine: p.body, rimEdge: [0.7, 0.84] as [number, number], rimPlain: true }),
    }),
    lungEdgeLeft: edgeDepthMaterial(1),
    lungEdgeRight: edgeDepthMaterial(2),
    diaphragm: stripeMaterial({ gradient: lungGradient, glow: dark, show: inner, pattern: 'level', density: RING_DENSITY, width: 0.06, line: p.lung, fill: p.lung, lineAlpha: 0.3, fillAlpha: 0.0, rim: p.lungRim, rimAlpha: 0.3, side: 'both' }),
    // Both walls: the throat is open toward the mouth, and through that opening the eye sees the inside
    // of its back wall, which one-sided drawing would leave blank.
    // Nose, mouth, throat and windpipe stay as quiet as a lung at rest: never lit by the breath
    // (their level stays below them), so during the exercise only the lungs brighten.
    airway: stripeMaterial({
      gradient: dark ? lungGradient : undefined,
      glow: dark,
      show: inner,
      pattern: 'level',
      density: 160,
      width: 0.1,
      line: p.airway,
      fill: p.airway,
      lineAlpha: 0.45,
      dimAlpha: dark ? 0.16 : 0.3,
      fillAlpha: dark ? 0.03 : 0.0,
      rim: dark ? p.lungRim : p.airway,
      rimAlpha: dark ? 0.6 : 0.55,
      side: 'both',
      level: { value: -99 },
    }),
  }
}
