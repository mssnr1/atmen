import { useEffect, useRef } from 'react'
import type { BreathPhase } from '../engine'

type Pt = [number, number]
type Seg = { p: [Pt, Pt, Pt, Pt]; ms: number }

const W = 64
const H = 22

/** Point on a cubic Bézier at parameter s. */
function bez([a, b, c, d]: Seg['p'], s: number): Pt {
  const u = 1 - s
  const k = [u * u * u, 3 * u * u * s, 3 * u * s * s, s * s * s]
  return [k[0] * a[0] + k[1] * b[0] + k[2] * c[0] + k[3] * d[0], k[0] * a[1] + k[1] * b[1] + k[2] * c[1] + k[3] * d[1]]
}

/** The first part of a cubic Bézier, up to parameter s (de Casteljau split), as a path command. */
function head([a, b, c, d]: Seg['p'], s: number): string {
  const lerp = (p: Pt, q: Pt): Pt => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s]
  const ab = lerp(a, b)
  const bc = lerp(b, c)
  const cd = lerp(c, d)
  const abc = lerp(ab, bc)
  const bcd = lerp(bc, cd)
  const e = lerp(abc, bcd)
  return ` C${ab[0].toFixed(2)} ${ab[1].toFixed(2)} ${abc[0].toFixed(2)} ${abc[1].toFixed(2)} ${e[0].toFixed(2)} ${e[1].toFixed(2)}`
}

const cmd = (p: Seg['p']) => ` C${p[1][0].toFixed(2)} ${p[1][1]} ${p[2][0].toFixed(2)} ${p[2][1]} ${p[3][0].toFixed(2)} ${p[3][1]}`

/**
 * A small breath curve for an exercise card: one breath, rising over the
 * inhale and falling over the exhale, each part as long as its phase, so the
 * ratio of in to out reads at a glance: an even breath is a symmetric hill, a
 * long exhale a short rise and a long, slow fall. The quiet rest at the top of
 * each breath is the same for every exercise and is left out of the drawing.
 *
 * With `animate`, a soft light travels along the curve in the exercise's real
 * rhythm (rests included, scaled by `scale`), drawing the breath as it goes.
 * It stays still when the user prefers reduced motion.
 */
export function Waveform({
  phases,
  className = '',
  animate = false,
  scale = 1,
}: {
  phases: BreathPhase[]
  className?: string
  animate?: boolean
  scale?: number
}) {
  const active = phases.filter((p) => p.durationMs > 0 && !p.quiet)
  const inhale = active.find((p) => p.type === 'inhale')?.durationMs ?? 1
  // Exhales longer than the inhale are drawn a little longer still, so 4:6
  // and 4:8 are easy to tell apart at this size.
  const span = (p: BreathPhase) => (p.type === 'exhale' && p.durationMs > inhale ? inhale * (p.durationMs / inhale) ** 1.7 : p.durationMs)
  const total = active.reduce((s, p) => s + span(p), 0)
  const top = 3
  const bottom = H - 3
  let x = 1
  let y = bottom
  const start = `M${x} ${bottom}`
  // Timeline of the animation: drawn segments, plus rests (null) where the light waits.
  const timeline: { seg: Seg | null; ms: number }[] = []
  for (const p of phases) {
    if (p.durationMs <= 0) continue
    if (p.quiet) {
      timeline.push({ seg: null, ms: p.durationMs * scale })
      continue
    }
    const w = (span(p) / total) * (W - 2)
    const ny = p.type === 'inhale' ? top : p.type === 'exhale' ? bottom : y
    // Control points at 40 % keep the turns round and the slopes long.
    timeline.push({ seg: { p: [[x, y], [x + w * 0.4, y], [x + w * 0.6, ny], [x + w, ny]], ms: p.durationMs * scale }, ms: p.durationMs * scale })
    x += w
    y = ny
  }
  const segs = timeline.flatMap((t) => (t.seg ? [t.seg] : []))
  const d = start + segs.map((s) => cmd(s.p)).join('')

  const trail = useRef<SVGPathElement>(null)
  const dot = useRef<SVGGElement>(null)
  const key = phases.map((p) => `${p.type}${p.durationMs}${p.quiet ? 'q' : ''}`).join() + scale

  useEffect(() => {
    if (!animate) return
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (motion?.matches) return
    const cycle = timeline.reduce((s, t) => s + t.ms, 0)
    if (cycle <= 0) return
    const t0 = performance.now()
    let raf = 0
    const frame = (now: number) => {
      let t = (now - t0) % cycle
      let path = start
      let pos: Pt = segs[0].p[0]
      for (const step of timeline) {
        if (step.seg && t >= step.ms) {
          path += cmd(step.seg.p)
          pos = step.seg.p[3]
        } else if (step.seg) {
          // Ease in and out like a breath: slow at the turns, fastest midway.
          const s = 0.5 - 0.5 * Math.cos((Math.PI * t) / step.ms)
          path += head(step.seg.p, s)
          pos = bez(step.seg.p, s)
          break
        } else if (t < step.ms) break
        t -= step.ms
      }
      // Fade the drawn breath out at the very end of the cycle and back in at its start.
      const into = (now - t0) % cycle
      const fade = Math.min(1, into / 350, (cycle - into) / 450)
      trail.current?.setAttribute('d', path)
      trail.current?.setAttribute('opacity', fade.toFixed(3))
      dot.current?.setAttribute('transform', `translate(${pos[0].toFixed(2)} ${pos[1].toFixed(2)})`)
      dot.current?.setAttribute('opacity', fade.toFixed(3))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    const stop = () => {
      cancelAnimationFrame(raf)
      trail.current?.setAttribute('opacity', '0')
      dot.current?.setAttribute('opacity', '0')
    }
    motion?.addEventListener?.('change', stop)
    return () => {
      cancelAnimationFrame(raf)
      motion?.removeEventListener?.('change', stop)
    }
  }, [animate, key])

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const moving = animate && !reduced
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`overflow-visible ${className}`} fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" opacity={moving ? 0.38 : 1} />
      {moving && (
        <>
          <path ref={trail} d={start} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" opacity={0} />
          <g ref={dot} opacity={0}>
            <circle r={4.2} fill="currentColor" opacity={0.18} />
            <circle r={2.1} fill="currentColor" />
          </g>
        </>
      )}
    </svg>
  )
}
