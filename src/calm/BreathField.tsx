import { useEffect, useRef } from 'react'
import { BreathingBubbles } from './BreathingBubbles'

/**
 * A living background that breathes: a slow, silky colour field (domain-warped
 * noise, like a mesh gradient) with faint contour lines, and a soft halo that
 * swells on every inhale and settles on every exhale. Drawn in a small WebGL
 * shader; falls back to the CSS bubbles where WebGL is missing.
 */
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uBreath;   // 0 = breathed out, 1 = breathed in
uniform vec3 uBase;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform float uDark;
uniform vec2 uCenter;    // halo centre, 0..1 from the top left

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.y = 1.0 - uv.y;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - uCenter.x) * aspect, uv.y - uCenter.y);
  float t = uTime * 0.045;
  float b = uBreath;

  // The whole field opens up a little on the inhale.
  vec2 q = p * (0.75 - 0.08 * b);
  vec2 w1 = vec2(fbm(q * 1.6 + vec2(0.0, t)), fbm(q * 1.6 + vec2(5.2, -t)));
  vec2 w2 = vec2(fbm(q * 1.4 + 1.6 * w1 + vec2(1.7, 9.2) + t * 0.6), fbm(q * 1.4 + 1.6 * w1 + vec2(8.3, 2.8) - t * 0.5));
  float f = smoothstep(0.12, 0.45, fbm(q * 1.1 + 1.8 * w2));

  // Silky colour field.
  vec3 col = uBase;
  col = mix(col, uA, smoothstep(0.2, 0.9, f) * (0.42 + 0.22 * b));
  col = mix(col, uB, smoothstep(0.55, 1.0, f) * smoothstep(0.3, 0.9, length(w2)) * (0.5 + 0.2 * b));
  col = mix(col, uC, smoothstep(0.6, 0.0, f) * smoothstep(0.4, 0.8, w1.y) * 0.6);

  // Fine contour lines that follow the flow, like the stripes on the lungs.
  float iso = f * 12.0 + t * 0.8;
  float d = abs(fract(iso) - 0.5) / max(fwidth(iso), 1e-4);
  float line = (1.0 - smoothstep(0.0, 1.0, d)) * smoothstep(0.1, 0.5, f);
  col = mix(col, uB, line * (0.14 + 0.12 * b));

  // The breathing halo around the logo: a soft light that swells on the inhale.
  float r = length(p);
  float edge = 0.15 + 0.08 * b + 0.025 * (fbm(p * 4.0 + t * 4.0) - 0.5);
  float glow = exp(-pow(r / edge, 2.0) * 1.3);
  col = mix(col, uC, glow * (0.45 + 0.25 * b));
  float ring = exp(-pow((r - edge) * 70.0, 2.0));
  col = mix(col, uA, ring * (0.12 + 0.25 * b));

  // Fade the colour out towards the buttons so they stay calm and readable.
  col = mix(col, uBase, smoothstep(0.55, 1.05, uv.y) * 0.55);

  // Fine grain against banding.
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * (uDark > 0.5 ? 0.025 : 0.018);
  gl_FragColor = vec4(col, 1.0);
}
`

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.trim().replace('#', '')
  const n = parseInt(m.length === 3 ? [...m].map((c) => c + c).join('') : m, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const PALETTES = {
  light: { base: '#f6f7fb', a: '#8fb0ff', b: '#9a7cff', c: '#ffffff' },
  dark: { base: '#141312', a: '#3f238a', b: '#9b74ff', c: '#3a2470' },
}

/** The breath, 0..1, eased, at `ms` into a cycle of inhale `inMs` and exhale `outMs`. */
export function breathAt(ms: number, inMs: number, outMs: number): number {
  const t = ms % (inMs + outMs)
  const x = t < inMs ? t / inMs : 1 - (t - inMs) / outMs
  return 0.5 - 0.5 * Math.cos(Math.PI * x)
}

export function BreathField({ inMs = 5500, outMs = 5500, center = [0.5, 0.36] }: { inMs?: number; outMs?: number; center?: [number, number] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const gl = el.getContext('webgl', { antialias: false, premultipliedAlpha: false })
    if (!gl || !gl.getExtension('OES_standard_derivatives')) {
      el.style.display = 'none'
      el.nextElementSibling?.removeAttribute('hidden')
      return
    }
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = (n: string) => gl.getUniformLocation(prog, n)
    const uRes = u('uRes'), uTime = u('uTime'), uBreath = u('uBreath'), uDark = u('uDark'), uCenter = u('uCenter')
    const setPalette = () => {
      const dark = document.documentElement.classList.contains('dark')
      const pal = dark ? PALETTES.dark : PALETTES.light
      gl.uniform3fv(u('uBase'), hexToRgb(pal.base))
      gl.uniform3fv(u('uA'), hexToRgb(pal.a))
      gl.uniform3fv(u('uB'), hexToRgb(pal.b))
      gl.uniform3fv(u('uC'), hexToRgb(pal.c))
      gl.uniform1f(uDark, dark ? 1 : 0)
    }
    setPalette()
    const themeObserver = new MutationObserver(setPalette)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    // Render at a reduced resolution: the field is soft, and phones stay cool.
    const resize = () => {
      const r = el.getBoundingClientRect()
      const k = Math.min(window.devicePixelRatio || 1, 2) * 0.6
      el.width = Math.max(1, Math.round(r.width * k))
      el.height = Math.max(1, Math.round(r.height * k))
      gl.viewport(0, 0, el.width, el.height)
      gl.uniform2f(uRes, el.width, el.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const ms = now - start
      gl.uniform1f(uTime, reduced ? 20 : 20 + ms / 1000)
      gl.uniform1f(uBreath, reduced ? 0.5 : breathAt(ms, inMs, outMs))
      gl.uniform2f(uCenter, center[0], center[1])
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      themeObserver.disconnect()
    }
  }, [inMs, outMs, center[0], center[1]])

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <canvas ref={ref} className="absolute inset-0 size-full" />
      <div hidden>
        <BreathingBubbles cycleMs={inMs + outMs} variant={inMs === outMs ? 'even' : 'long-out'} />
      </div>
    </div>
  )
}
