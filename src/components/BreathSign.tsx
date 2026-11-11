import type { CSSProperties, Ref } from 'react'

/** The outline of the sign: an upright oval (the o of the wordmark) or a ring. One switch for the whole app. */
export type SignShape = 'oval' | 'ring'
export const SIGN_SHAPE: SignShape = 'oval'

const CX = 50
const CY = 50

/** Geometry of the sign in a 100 x 100 box: the outline path and the light lines inside it, bottom line first. */
export function signGeometry(n: number, shape: SignShape = SIGN_SHAPE) {
  // Fewer, bolder lines at small sizes, so the sign still reads at 16 px.
  const small = n <= 2
  const mid = n <= 4
  const stroke = small ? 9 : mid ? 6 : 5.2
  const pad = small ? 4.5 : mid ? 4 : 4.2
  const lineWidth = small ? 7 : mid ? 3.6 : 2.4
  const inset = small ? 2.5 : 1.5
  let outline: string
  /** Half extents of the inner ellipse that cuts the lines. */
  let rx: number
  let ry: number
  let span: number
  if (shape === 'ring') {
    const R = 38
    rx = ry = R - stroke / 2 - pad
    span = ry - (small ? 7.5 : mid ? 5.5 : 4.6)
    outline = `M${CX - R},${CY}A${R} ${R} 0 1 1 ${CX + R},${CY}A${R} ${R} 0 1 1 ${CX - R},${CY}Z`
  } else {
    // The u of the wordmark closed at the top: 395 wide, 506 high.
    const c = 43
    const a = (c * 395) / 506
    rx = a - stroke / 2 - pad
    ry = c - stroke / 2 - pad
    span = small ? 13 : ry - (mid ? 6.5 : 5.6)
    const y0 = CY - (c - a)
    const y1 = CY + (c - a)
    const f = (v: number) => v.toFixed(2)
    outline = `M${f(CX - a)},${f(y1)}V${f(y0)}A${f(a)} ${f(a)} 0 0 1 ${f(CX + a)},${f(y0)}V${f(y1)}A${f(a)} ${f(a)} 0 0 1 ${f(CX - a)},${f(y1)}Z`
  }
  const lines = Array.from({ length: n }, (_, i) => {
    // f = 0 at the bottom line, 1 at the top one.
    const f = n === 1 ? 0.5 : i / (n - 1)
    const y = CY + span * (1 - 2 * f)
    const t = (y - CY) / ry
    const half = rx * Math.sqrt(Math.max(0, 1 - t * t)) - inset
    return { y, half, f }
  })
  return { outline, stroke, lineWidth, lines }
}

/** Opacity of line `i` of `n` at breath level 0..1: the lines light up from below, one after the other. */
export const lineOpacity = (level: number, i: number, n: number, rest = 0.14) => Math.max(rest, Math.min(1, level * (n + 1) - i))

interface Props {
  /** Number of light lines: 7 at large sizes, 4 around 32 px, 2 or 3 below that. */
  n?: number
  shape?: SignShape
  /** A fixed fill level 0..1. Without it the lines follow `--lv` or the breath clock's `--b` (see index.css). */
  level?: number
  className?: string
  style?: CSSProperties
  ref?: Ref<SVGSVGElement>
}

/**
 * The breath sign: a neutral outline with light lines that fill from below as the breath comes in.
 * It is the o of the wordmark, the app icon and the simple view of an exercise.
 */
export function BreathSign({ n = 7, shape = SIGN_SHAPE, level, className = '', style, ref }: Props) {
  const g = signGeometry(n, shape)
  return (
    <svg ref={ref} viewBox="0 0 100 100" fill="none" strokeLinecap="round" className={`breath-sign ${className}`} style={{ ['--n1' as string]: n + 1, ...style }} aria-hidden>
      <path d={g.outline} stroke="currentColor" strokeWidth={g.stroke} />
      {g.lines.map((l, i) => (
        <line
          key={i}
          x1={(CX - l.half).toFixed(2)}
          x2={(CX + l.half).toFixed(2)}
          y1={l.y.toFixed(2)}
          y2={l.y.toFixed(2)}
          strokeWidth={g.lineWidth}
          style={{
            stroke: `color-mix(in srgb, var(--color-breath) ${Math.round(l.f * 100)}%, var(--color-breath-2))`,
            ['--i' as string]: i,
            ...(level === undefined ? {} : { opacity: lineOpacity(level, i, n) }),
          }}
        />
      ))}
    </svg>
  )
}
