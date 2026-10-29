import type { BreathPhase } from '../engine'

/**
 * A small breath curve for an exercise card: one breath, rising over the
 * inhale and falling over the exhale, each part as long as its phase, so the
 * ratio of in to out reads at a glance: an even breath is a symmetric hill, a
 * long exhale a short rise and a long, slow fall. The quiet rest at the top of
 * each breath is the same for every exercise and is left out.
 */
export function Waveform({ phases, className = '' }: { phases: BreathPhase[]; className?: string }) {
  const active = phases.filter((p) => p.durationMs > 0 && !p.quiet)
  const inhale = active.find((p) => p.type === 'inhale')?.durationMs ?? 1
  // Exhales longer than the inhale are drawn a little longer still, so 4:6
  // and 4:8 are easy to tell apart at this size.
  const span = (p: BreathPhase) => (p.type === 'exhale' && p.durationMs > inhale ? inhale * (p.durationMs / inhale) ** 1.7 : p.durationMs)
  const total = active.reduce((s, p) => s + span(p), 0)
  const W = 64
  const H = 22
  const top = 3
  const bottom = H - 3
  let x = 1
  let y = bottom
  let d = `M${x} ${bottom}`
  for (const p of active) {
    const w = (span(p) / total) * (W - 2)
    const ny = p.type === 'inhale' ? top : p.type === 'exhale' ? bottom : y
    // Control points at 40 % keep the turns round and the slopes long.
    d += ` C${(x + w * 0.4).toFixed(2)} ${y} ${(x + w * 0.6).toFixed(2)} ${ny} ${(x + w).toFixed(2)} ${ny}`
    x += w
    y = ny
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  )
}
