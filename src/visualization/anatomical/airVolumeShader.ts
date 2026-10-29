import { AIRWAY_TRUNK, CARINA, DIAPHRAGM_SPAN, HILUM_LEFT, HILUM_RIGHT, LUNG_SHAPE, NOSTRILS, VIEW, type AirwayPoint } from './model'

/**
 * Fragment shader that renders air as a soft, glowing density field.
 *
 * Density is the sum of three smooth fields: the airway column (around the
 * airway centre line, present behind or ahead of the moving front), the lungs
 * (filling outward from each hilum with lung volume), and the outside cloud.
 * Domain warping with animated 3D noise gives fluid deformation, variable
 * density and internal motion; noise along the airway is advected in the
 * direction of flow. Opacity uses Beer–Lambert absorption, so edges fade out
 * softly instead of having outlines.
 */

const f = (n: number) => n.toFixed(2)
const v2 = ([x, y]: readonly [number, number]) => `vec2(${f(x)}, ${f(y)})`

function segment(a: AirwayPoint, b: AirwayPoint, radius: number): string {
  return `  seg(pw, ${v2(a.at)}, ${v2(b.at)}, ${f(a.s)}, ${f(b.s)}, ${f(radius)}, best, bestS, bestR);`
}

const trunk = AIRWAY_TRUNK.slice(1)
  .map((pt, i) => segment(AIRWAY_TRUNK[i], pt, i < 3 ? 3.4 : 3.8))
  .join('\n')

export const vertexShader = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

export const fragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;      // breathing seconds, freezes when paused
uniform float uDrift;     // wall-clock seconds, for slow ambient motion
uniform float uFill;      // lung fill 0..1
uniform float uFront;     // airway front position
uniform float uDir;       // +1 inhale, -1 exhale, 0 hold
uniform float uAirway;    // airway density (flow rate)
uniform vec3 uCloud;      // x, y, radius
uniform float uCloudDensity;
uniform vec4 uLungL;      // apex y, apex offset, lateral offset, medial offset (see Lung in model.ts)
uniform vec4 uLungR;
uniform vec2 uNotch;      // cardiac notch depth for each lung
uniform float uDrop;      // diaphragm descent

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
                 mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                 mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

float fbm(vec3 p) {
  float a = 0.5, r = 0.0;
  for (int i = 0; i < 3; i++) { r += a * noise(p); p *= 2.03; a *= 0.5; }
  return r;
}

// Closest point on a segment; keeps the nearest one with its path parameter and radius.
void seg(vec2 p, vec2 a, vec2 b, float s0, float s1, float r, inout float best, inout float bestS, inout float bestR) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  float d = length(pa - ba * h);
  if (d / r < best / bestR) { best = d; bestS = mix(s0, s1, h); bestR = r; }
}

// Same shapes as the model: the diaphragm dome and the lungs resting on it.
float diaphragmY(float x) {
  float halfW = ${f((DIAPHRAGM_SPAN.right - DIAPHRAGM_SPAN.left) / 2)};
  float u = min(abs(x - ${f((DIAPHRAGM_SPAN.left + DIAPHRAGM_SPAN.right) / 2)}) / halfW, 1.0);
  return ${f(DIAPHRAGM_SPAN.edgeY)} + 0.3 * uDrop - (${f(DIAPHRAGM_SPAN.dome)} - 0.7 * uDrop) * (1.0 - u * u);
}

float lungDensity(vec2 p, vec4 lung, float side, float notch, vec2 hilum, float warp) {
  float d = side * (p.x - 100.0);
  float grow = sqrt(clamp((p.y - lung.x) / ${f(LUNG_SHAPE.apexRound)}, 0.0, 1.0));
  float growIn = sqrt(clamp((p.y - lung.x) / ${f(LUNG_SHAPE.apexRound * 1.4)}, 0.0, 1.0));
  float lat = lung.y + (lung.z - lung.y) * grow;
  float med = lung.y - (lung.y - lung.w - notch * smoothstep(${f(LUNG_SHAPE.notchFrom)}, ${f(LUNG_SHAPE.notchTo)}, p.y)) * growIn;
  float base = diaphragmY(p.x) - 1.0;
  // 0 at the centre of the lung, 1 on its outline.
  float across = abs(2.0 * (d - med) / max(lat - med, 0.5) - 1.0);
  float down = abs(2.0 * (p.y - lung.x) / max(base - lung.x, 1.0) - 1.0);
  float e = max(across, down) + warp * 0.08;
  float inside = 1.0 - smoothstep(0.8, 1.0, e);
  // Air spreads from the hilum outward as the lungs fill.
  float reach = length((p - hilum) / vec2(36.0, 62.0));
  float spread = 1.0 - smoothstep(uFill * 1.05 - 0.05, uFill * 1.05 + 0.25, reach + warp * 0.12);
  return inside * (0.06 + 0.94 * spread * (0.3 + 0.7 * uFill));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2(uv.x, 1.0 - uv.y) * vec2(${f(VIEW.width)}, ${f(VIEW.height)});

  // Fluid deformation: warp the field with slowly evolving noise.
  vec3 nq = vec3(p * 0.045, uDrift * 0.12 + uTime * 0.05);
  vec2 w = vec2(fbm(nq), fbm(nq + vec3(5.2, 1.3, 2.1))) - 0.5;
  vec2 pw = p + w * 5.0;

  // Airway column.
  float best = 1e3, bestS = 0.0, bestR = 1.0;
${trunk}
  seg(pw, ${v2(CARINA.at)}, ${v2(HILUM_LEFT.at)}, ${f(CARINA.s)}, 1.0, 3.2, best, bestS, bestR);
  seg(pw, ${v2(CARINA.at)}, ${v2(HILUM_RIGHT.at)}, ${f(CARINA.s)}, 1.0, 3.2, best, bestS, bestR);
  float tube = exp(-pow(best / (bestR * 1.25), 2.0));
  float behind = uDir > 0.0 ? 1.0 - smoothstep(uFront - 0.06, uFront + 0.06, bestS)
                            : smoothstep(uFront - 0.06, uFront + 0.06, bestS);
  // Internal motion travels with the flow (down on inhale, up on exhale).
  float stream = 0.55 + 0.75 * noise(vec3(bestS * 14.0 - uDir * uTime * 3.0, best * 0.4, uDrift * 0.2));
  float airway = tube * behind * uAirway * stream * 1.6;

  // Lungs.
  float lw = fbm(vec3(p * 0.07, uTime * 0.2 + uDrift * 0.05)) - 0.5;
  float lungs = lungDensity(pw, uLungL, -1.0, uNotch.x, ${v2(HILUM_LEFT.at)}, lw) + lungDensity(pw, uLungR, 1.0, uNotch.y, ${v2(HILUM_RIGHT.at)}, lw);
  lungs *= 0.75 + 0.6 * fbm(vec3(p * 0.11, uTime * 0.35));

  // Outside air: a soft cloud joined to the nostrils by a tapering stream.
  vec2 c = uCloud.xy;
  vec2 n = ${v2(NOSTRILS)};
  vec2 cn = n - c;
  float h = clamp(dot(pw - c, cn) / max(dot(cn, cn), 1e-3), 0.0, 1.0);
  float r = mix(uCloud.z, 2.6, h);
  float dc = length(pw - (c + cn * h));
  float cloud = exp(-pow(dc / r, 2.0)) * uCloudDensity * (0.5 + 0.9 * fbm(vec3(p * 0.09, uTime * 0.6 + uDrift * 0.1)));

  float density = airway + lungs * 0.85 + cloud * 1.1;
  float alpha = 1.0 - exp(-density * 1.9);
  vec3 deep = vec3(0.20, 0.66, 0.66);
  vec3 bright = vec3(0.86, 1.0, 0.98);
  vec3 col = mix(deep, bright, clamp(density * 0.7, 0.0, 1.0));
  gl_FragColor = vec4(col * alpha, alpha);
}
`
