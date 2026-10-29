import type { BreathPhase, PhaseType } from '../engine'

interface Props {
  label: string
  /** The exercise's phases, giving each part of a bar its share and colour. */
  phases: BreathPhase[]
  total: number
  completed: number
  /** 0..1 through the breath in progress, or null when no breath is running. */
  current: number | null
}

/** Breaths per row before the bars wrap, so each stays wide enough to read. */
const MAX_PER_ROW = 30

const COLORS: Record<PhaseType, { done: string; ahead: string }> = {
  inhale: { done: 'bg-accent', ahead: 'bg-accent/20' },
  exhale: { done: 'bg-exhale', ahead: 'bg-exhale/20' },
  holdIn: { done: 'bg-mist/70', ahead: 'bg-mist/10' },
  holdOut: { done: 'bg-mist/70', ahead: 'bg-mist/10' },
}

/**
 * One bar per breath of the session, split into its phases by colour
 * (breathing in, breathing out). A bar fills as its breath is taken and stays
 * full once it is done. Phase shares stay the same at any pace, so the split
 * is taken from the pattern.
 */
export function BreathBars({ label, phases, total, completed, current }: Props) {
  const rows = Math.ceil(total / MAX_PER_ROW)
  const perRow = Math.ceil(total / rows)
  const active = phases.filter((p) => p.durationMs > 0)
  const cycleMs = active.reduce((sum, p) => sum + p.durationMs, 0)
  const parts = active.reduce<{ type: PhaseType; from: number; share: number }[]>((acc, p) => {
    const from = acc.length ? acc[acc.length - 1].from + acc[acc.length - 1].share : 0
    return [...acc, { type: p.type, from, share: p.durationMs / cycleMs }]
  }, [])

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
      data-testid="breath-bars"
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => {
        const fill = i < completed ? 1 : i === completed && current !== null ? current : 0
        return (
          <span key={i} className={`flex gap-px overflow-hidden rounded-[3px] ${rows > 1 ? 'h-3' : 'h-4'}`} data-filled={fill === 1}>
            {parts.map((part) => {
              const partFill = Math.min(1, Math.max(0, (fill - part.from) / part.share))
              return (
                <span key={part.type + part.from} className={`relative h-full ${COLORS[part.type].ahead}`} style={{ flexGrow: part.share }}>
                  {partFill > 0 && (
                    <span className={`absolute inset-y-0 left-0 ${COLORS[part.type].done}`} style={{ width: `${partFill * 100}%` }} />
                  )}
                </span>
              )
            })}
          </span>
        )
      })}
    </div>
  )
}
