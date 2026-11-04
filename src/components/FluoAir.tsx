import { useEffect, useRef, useState } from 'react'
import { FluoWaves } from './FluoWaves'

/**
 * The start screen's living background: three to four translucent sheets of air (lavender, soft
 * blue, mint) that slowly stretch, pinch, twist and drift sideways, each at its own pace, with a
 * faint stream of specks riding the flow. Drawn by one small WebGL fragment shader plus a point
 * pass, no library.
 *
 * Every motion term is a whole multiple of one 20 s loop phase, so the loop closes without a seam.
 * Rendering pauses while the page is hidden, draws one still frame for reduced motion and falls
 * back to the static SVG waves where WebGL is missing.
 */

const LOOP_S = 20
const PARTICLES = 70
const MAX_DPR = 1.5

/** Shared by both passes: the upper edge and fade depth of sheet `i` at x for loop angle th. */
const SHEETS = /* glsl */ `
const float TAU = 6.2831853;
// Per sheet: base height, amplitude, flow laps per loop, tilt across the screen.
vec4 sheet(float i) {
  if (i < 0.5) return vec4(0.66, 0.09, 1.0, 0.22);  // back: blue rising into mint, slowest
  if (i < 1.5) return vec4(0.56, 0.10, 1.0, 0.04);  // soft blue
  if (i < 2.5) return vec4(0.50, 0.11, 2.0, -0.16); // lavender, high on the left as in the guide
  return vec4(0.60, 0.07, 3.0, 0.08);               // thin pale veil, fastest
}
float edge(float i, float x, float th, float aspect) {
  vec4 s = sheet(i);
  float o = i * 1.7;
  // The domain itself is bent, so the forms stretch and gather instead of just sliding.
  float wx = x + 0.24 * sin(0.9 * x - th + o) + 0.10 * sin(1.7 * x + 2.0 * th + o * 2.3);
  return s.x + s.w * (x - aspect * 0.5)
    + s.y * sin(1.15 * wx - s.z * th + o)
    + s.y * 0.55 * sin(2.3 * wx + (s.z + 1.0) * th + o * 1.3)
    + s.y * 0.22 * sin(3.9 * wx - 2.0 * th + o * 0.7);
}
// How far below its edge a sheet stays dense. Where it thins the sheet seems to turn edge-on.
float depth(float i, float x, float th) {
  float t = 0.55 + 0.45 * sin(0.8 * x + (i < 1.5 ? 1.0 : -1.0) * th + i * 2.1);
  return (i > 2.5 ? 0.16 : 0.42) * t + 0.08;
}
`

const QUAD_VS = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

const SHEET_FS = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform float uTh;
uniform float uAspect;
uniform float uDark;
${SHEETS}
vec3 lavender = vec3(0.72, 0.64, 1.0);
vec3 indigo = vec3(0.54, 0.47, 0.93);
vec3 blue = vec3(0.60, 0.70, 0.92);
vec3 mint = vec3(0.62, 0.93, 0.80);

vec3 hue(float i, float u) {
  // Lavender -> soft blue -> mint along the screen, each sheet shifted a little.
  if (i < 0.5) return mix(blue, mint, smoothstep(0.25, 0.85, u));
  if (i < 1.5) return mix(mix(lavender, blue, smoothstep(0.0, 0.5, u)), mint, smoothstep(0.55, 1.0, u) * 0.7);
  if (i < 2.5) return mix(mix(lavender, indigo, smoothstep(0.0, 0.45, u)), blue, smoothstep(0.45, 0.95, u));
  return mix(vec3(0.86, 0.82, 1.0), vec3(0.80, 0.95, 0.90), u);
}

void main() {
  float x = vUv.x * uAspect;
  float y = vUv.y;
  float u = vUv.x;
  vec4 acc = vec4(0.0);
  for (int k = 0; k < 4; k++) {
    float i = float(k);
    float e = edge(i, x, uTh, uAspect);
    float L = depth(i, x, uTh);
    float d = e - y; // > 0 inside the sheet, below its edge
    // Soft upper edge, then a long matte fade downwards: no hard boundary anywhere.
    float soft = 0.022 + 0.02 * float(k == 3);
    float a = smoothstep(-soft, soft, d) * (1.0 - smoothstep(L * 0.2, L * 1.5, d));
    // A little volume: a lighter rim at the top, deeper colour inside.
    vec3 col = hue(i, u);
    col = mix(mix(col, vec3(1.0), 0.25), col * 0.92, smoothstep(0.0, L * 0.7, d));
    float alpha = a * (i < 0.5 ? 0.7 : i < 1.5 ? 0.45 : i < 2.5 ? 0.74 : 0.3) * mix(1.0, 0.9, uDark);
    // Sheets meet "over" one another, so their overlap mixes into new tints.
    acc.rgb = col * alpha + acc.rgb * (1.0 - alpha);
    acc.a = alpha + acc.a * (1.0 - alpha);
  }
  // Fade out at the band's top and bottom so nothing moves behind the text or the buttons.
  float band = smoothstep(1.0, 0.82, y) * smoothstep(0.0, 0.3, y);
  acc *= band;
  gl_FragColor = acc;
}
`

const POINT_VS = /* glsl */ `
attribute vec3 aSeed;
uniform float uTh;
uniform float uAspect;
uniform float uDpr;
varying float vAlpha;
${SHEETS}
void main() {
  float lane = floor(aSeed.z * 3.999);
  float laps = 1.0 + floor(aSeed.y * 2.999);
  float span = uAspect + 0.4;
  // Whole laps per loop: every speck is back where it started when the loop closes.
  float x = fract(aSeed.x + uTh / TAU * laps) * span - 0.2;
  float y = edge(lane, x, uTh, uAspect) - (0.02 + aSeed.y * depth(lane, x, uTh) * 0.6);
  float edge = smoothstep(-0.2, 0.15, x) * smoothstep(uAspect + 0.2, uAspect - 0.15, x);
  // Density drifts along the stream, so specks gather and thin out.
  float gust = 0.5 + 0.5 * sin(1.4 * x - 2.0 * uTh + lane);
  float twinkle = 0.6 + 0.4 * sin(TAU * aSeed.x * 7.0 + 3.0 * uTh);
  float band = smoothstep(0.98, 0.8, y) * smoothstep(0.05, 0.35, y);
  vAlpha = edge * gust * twinkle * band * (0.25 + 0.35 * aSeed.y);
  gl_PointSize = (1.2 + 1.8 * fract(aSeed.x * 13.7)) * uDpr;
  gl_Position = vec4(x / uAspect * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
}
`

const POINT_FS = /* glsl */ `
precision mediump float;
varying float vAlpha;
uniform float uDark;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.1, length(p)) * vAlpha;
  vec3 col = mix(vec3(1.0), vec3(0.93, 0.92, 1.0), uDark);
  gl_FragColor = vec4(col * a, a);
}
`

function compile(gl: WebGLRenderingContext, vs: string, fs: string) {
  const prog = gl.createProgram()!
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader')
    gl.attachShader(prog, sh)
  }
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
  return prog
}

export function FluoAir({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' })
    if (!gl) {
      setFallback(true)
      return
    }
    let sheetProg: WebGLProgram, pointProg: WebGLProgram
    try {
      sheetProg = compile(gl, QUAD_VS, SHEET_FS)
      pointProg = compile(gl, POINT_VS, POINT_FS)
    } catch {
      setFallback(true)
      return
    }

    const quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const seeds = new Float32Array(PARTICLES * 3)
    let r = 0.37
    for (let n = 0; n < seeds.length; n++) seeds[n] = r = (r * 9301 + 0.49297) % 1
    const seedBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW)

    const sU = (name: string) => gl.getUniformLocation(sheetProg, name)
    const pU = (name: string) => gl.getUniformLocation(pointProg, name)
    const sheetPos = gl.getAttribLocation(sheetProg, 'aPos')
    const pointSeed = gl.getAttribLocation(pointProg, 'aSeed')
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let dpr = 1
    let aspect = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      aspect = w / h
      gl.viewport(0, 0, w, h)
    }

    const draw = (seconds: number) => {
      const th = ((seconds % LOOP_S) / LOOP_S) * Math.PI * 2
      const dark = document.documentElement.classList.contains('dark') ? 1 : 0
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(sheetProg)
      gl.uniform1f(sU('uTh'), th)
      gl.uniform1f(sU('uAspect'), aspect)
      gl.uniform1f(sU('uDark'), dark)
      gl.bindBuffer(gl.ARRAY_BUFFER, quad)
      gl.enableVertexAttribArray(sheetPos)
      gl.vertexAttribPointer(sheetPos, 2, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.disableVertexAttribArray(sheetPos)

      gl.useProgram(pointProg)
      gl.uniform1f(pU('uTh'), th)
      gl.uniform1f(pU('uAspect'), aspect)
      gl.uniform1f(pU('uDpr'), dpr)
      gl.uniform1f(pU('uDark'), dark)
      gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
      gl.enableVertexAttribArray(pointSeed)
      gl.vertexAttribPointer(pointSeed, 3, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.POINTS, 0, PARTICLES)
      gl.disableVertexAttribArray(pointSeed)
    }

    let raf = 0
    let last = performance.now()
    // Starts a few seconds in, so the first frame is already a composed moment.
    let clock = 3
    const frame = (now: number) => {
      clock += Math.min(0.1, (now - last) / 1000)
      last = now
      draw(clock)
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      cancelAnimationFrame(raf)
      resize()
      if (reduced?.matches) {
        draw(clock)
        return
      }
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => cancelAnimationFrame(raf)
    const onVisibility = () => (document.hidden ? stop() : start())

    const ro = new ResizeObserver(() => {
      resize()
      if (reduced?.matches) draw(clock)
    })
    ro.observe(canvas)
    document.addEventListener('visibilitychange', onVisibility)
    reduced?.addEventListener('change', start)
    const onLost = (e: Event) => {
      e.preventDefault()
      stop()
      setFallback(true)
    }
    canvas.addEventListener('webglcontextlost', onLost)
    if (!document.hidden) start()

    return () => {
      stop()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      reduced?.removeEventListener('change', start)
      canvas.removeEventListener('webglcontextlost', onLost)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  if (fallback) return <FluoWaves className={className} />
  return <canvas ref={canvasRef} className={`block ${className}`} aria-hidden data-testid="fluo-air" />
}
