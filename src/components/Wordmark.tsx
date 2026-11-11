import { breathRef } from '../lib/breathClock'

/*
 * The "fluo" wordmark as a monoline: hook, bar, cup and oval share one stroke weight. Units are 1/1000 em
 * with the baseline at 0; each glyph is its own svg, .8 em high. The o is the u closed at the top, and it
 * is the breath sign: light lines inside it fill from below.
 */
const STROKE = 58
const F = 'M0,0V-508.5A197.5 197.5 0 0 1 197.5,-706M0,-511H197.5'
const L = 'M0,0V-735'
const U = 'M0,-540V-214.5A197.5 197.5 0 0 0 395,-214.5V-540'
const O = 'M29,-214.5V-325.5A197.5 197.5 0 0 1 424,-325.5V-214.5A197.5 197.5 0 0 1 29,-214.5Z'

/** The inside of the o: centre, the ellipse that cuts the lines. */
const O_CX = 226.5
const O_CY = -270
const O_RX = 138.5
const O_RY = 194

function Glyph({ x0 = -29, width, d, className }: { x0?: number; width: number; d: string; className?: string }) {
  return (
    <svg viewBox={`${x0} -760 ${width} 800`} style={{ width: `${width / 1000}em` }} className={className} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={STROKE} />
    </svg>
  )
}

/** The light lines inside the o, bottom line first. Small sizes get fewer, bolder lines. */
function oLines(n: number) {
  const small = n <= 4
  const span = O_RY - (small ? 40 : 33)
  return {
    width: small ? 26 : 17.5,
    lines: Array.from({ length: n }, (_, i) => {
      const f = n === 1 ? 0.5 : i / (n - 1)
      const y = O_CY + span * (1 - 2 * f)
      const t = (y - O_CY) / O_RY
      return { f, y, half: O_RX * Math.sqrt(Math.max(0, 1 - t * t)) - 11 }
    }),
  }
}

interface Props {
  /** Font size in px; the letters are about .8 of it high. */
  size?: number
  /** Breathe with the ambient clock: the letters drift apart on the inhale and the o fills with light. */
  live?: boolean
  /** Light lines in the o. Defaults by size: 7 when large, 4 when small. */
  n?: number
  className?: string
}

export function Wordmark({ size = 28, live = false, n, className = '' }: Props) {
  const count = n ?? (size >= 44 ? 7 : 4)
  const o = oLines(count)
  return (
    <span
      ref={live ? breathRef : undefined}
      role="img"
      aria-label="Fluo"
      className={`fluo-mono text-ink ${live ? 'live' : ''} ${className}`}
      style={{ fontSize: size }}
      data-testid="wordmark"
    >
      <Glyph width={226.5} d={F} />
      <Glyph width={58} d={L} className="kern" />
      <Glyph width={453} d={U} />
      <svg viewBox="0 -760 453 800" className="breath-sign" style={{ width: '.453em', ['--n1' as string]: count + 1 }} fill="none" strokeLinecap="round" aria-hidden>
        <path d={O} stroke="currentColor" strokeWidth={STROKE} />
        {o.lines.map((l, i) => (
          <line
            key={i}
            x1={(O_CX - l.half).toFixed(1)}
            x2={(O_CX + l.half).toFixed(1)}
            y1={l.y.toFixed(1)}
            y2={l.y.toFixed(1)}
            strokeWidth={o.width}
            style={{ stroke: `color-mix(in srgb, var(--color-breath) ${Math.round(l.f * 100)}%, var(--color-breath-2))`, ['--i' as string]: i }}
          />
        ))}
      </svg>
    </span>
  )
}
