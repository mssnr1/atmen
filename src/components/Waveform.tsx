import type { BreathPhase } from '../engine'

/**
 * A small abstract breath curve for an exercise card: rises over the inhale,
 * falls over the exhale, flat during holds, with each part as long as its phase.
 */
export function Waveform({ phases, className = '' }: { phases: BreathPhase[]; className?: string }) {
  const active = phases.filter((p) => p.durationMs > 0)
  const total = active.reduce((s, p) => s + p.durationMs, 0)
  const W = 56
  const H = 20
  const top = 3
  const bottom = H - 3
  let x = 0
  let y = bottom
  let d = `M0 ${bottom}`
  // Two cycles so the curve reads as a rhythm.
  for (let c = 0; c < 2; c++) {
    for (const p of active) {
      const w = (p.durationMs / total) * (W / 2)
      const ny = p.type === 'inhale' ? top : p.type === 'exhale' ? bottom : y
      d += ` C${x + w / 2} ${y} ${x + w / 2} ${ny} ${x + w} ${ny}`
      x += w
      y = ny
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  )
}
