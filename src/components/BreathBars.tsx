interface Props {
  label: string
  total: number
  completed: number
  /** 0..1 through the breath in progress, or null when no breath is running. */
  current: number | null
}

/** Breaths per row before the bars wrap, so each stays wide enough to read. */
const MAX_PER_ROW = 30

/**
 * One bar per breath of the session. A bar fills as its breath is taken and
 * stays full once it is done.
 */
export function BreathBars({ label, total, completed, current }: Props) {
  const rows = Math.ceil(total / MAX_PER_ROW)
  const perRow = Math.ceil(total / rows)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
      data-testid="breath-bars"
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => {
        const fill = i < completed ? 1 : i === completed && current !== null ? current : 0
        return (
          <span key={i} className={`relative overflow-hidden rounded-[3px] bg-white/12 ${rows > 1 ? 'h-3.5' : 'h-5'}`} data-filled={fill === 1}>
            {fill > 0 && (
              <span
                className={`absolute inset-y-0 left-0 ${fill === 1 ? 'bg-accent' : 'bg-accent/45'}`}
                style={{ width: `${fill * 100}%` }}
              />
            )}
          </span>
        )
      })}
    </div>
  )
}
