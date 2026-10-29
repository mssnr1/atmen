import type { BodyPose } from './model'
import type { AirflowState } from './airflow'
import { fragmentShader, vertexShader } from './airVolumeShader'

/** Fraction of device pixels to render. The volume is soft, so a lower resolution looks the same and is far cheaper. */
const RESOLUTION_SCALE = 0.5
const MAX_DPR = 2

const UNIFORMS = ['uRes', 'uTime', 'uDrift', 'uFill', 'uFront', 'uDir', 'uAirway', 'uCloud', 'uCloudDensity', 'uLungL', 'uLungR'] as const
type UniformName = (typeof UNIFORMS)[number]

/** Draws the air volume into a canvas with one full-screen WebGL quad. */
export class AirVolumeRenderer {
  private gl: WebGLRenderingContext
  private uniforms = {} as Record<UniformName, WebGLUniformLocation | null>

  /** Returns null when WebGL is not available. */
  static create(canvas: HTMLCanvasElement): AirVolumeRenderer | null {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!gl) return null
    try {
      return new AirVolumeRenderer(canvas, gl)
    } catch (e) {
      console.warn('Air volume renderer unavailable:', e)
      return null
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
  ) {
    this.gl = gl
    const program = gl.createProgram()!
    for (const [type, src] of [
      [gl.VERTEX_SHADER, vertexShader],
      [gl.FRAGMENT_SHADER, fragmentShader],
    ] as const) {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader error')
      gl.attachShader(program, sh)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link error')
    gl.useProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    for (const name of UNIFORMS) this.uniforms[name] = gl.getUniformLocation(program, name)
  }

  /** Match the canvas backing store to its displayed size. */
  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * RESOLUTION_SCALE
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
      this.gl.viewport(0, 0, w, h)
    }
  }

  render(air: AirflowState, pose: BodyPose, driftS: number): void {
    const { gl, uniforms: u } = this
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height)
    gl.uniform1f(u.uTime, air.time)
    gl.uniform1f(u.uDrift, driftS)
    gl.uniform1f(u.uFill, air.fill)
    gl.uniform1f(u.uFront, air.front)
    gl.uniform1f(u.uDir, air.direction)
    gl.uniform1f(u.uAirway, air.airway)
    gl.uniform3f(u.uCloud, air.cloud.at[0], air.cloud.at[1], air.cloud.radius)
    gl.uniform1f(u.uCloudDensity, air.cloud.density)
    const { lungLeft: l, lungRight: r } = pose
    gl.uniform4f(u.uLungL, l.cx, l.cy, l.rx, l.ry)
    gl.uniform4f(u.uLungR, r.cx, r.cy, r.rx, r.ry)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  dispose(): void {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
