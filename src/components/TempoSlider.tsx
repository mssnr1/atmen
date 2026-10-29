import { clickFeedback } from '../feedback/click'

interface Props {
  label: string
  /** Number of stops, slowest first. */
  levels: number
  value: number
  /** Spoken and shown name of the current stop. */
  valueText: string
  onChange: (level: number) => void
}

/**
 * A slider that snaps to a few stops and clicks at each one. Built on a
 * native range input for touch dragging and keyboard support.
 */
export function TempoSlider({ label, levels, value, valueText, onChange }: Props) {
  const max = levels - 1
  // Thumb centres run from half a thumb in from each end.
  const at = (i: number) => `calc(0.875rem + (100% - 1.75rem) * ${i / max})`
  const select = (next: number) => {
    if (next === value) return
    clickFeedback(next)
    onChange(next)
  }
  return (
    <div className="relative h-11">
      <div className="absolute inset-x-[0.875rem] top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/12" aria-hidden />
      <div
        className="absolute left-[0.875rem] top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent transition-[width] duration-150"
        style={{ width: `calc((100% - 1.75rem) * ${value / max})` }}
        aria-hidden
      />
      {Array.from({ length: levels }, (_, i) => (
        <span
          key={i}
          className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${i <= value ? 'bg-accent' : 'bg-white/25'}`}
          style={{ left: at(i) }}
          aria-hidden
        />
      ))}
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        data-testid="tempo-slider"
        onChange={(e) => select(Number(e.target.value))}
        // iOS only moves a range thumb by dragging it; let a tap jump to the nearest stop.
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const thumb = 28
          const x = (e.clientX - r.left - thumb / 2) / (r.width - thumb)
          if (e.clientX !== 0) select(Math.min(max, Math.max(0, Math.round(x * max))))
        }}
        className="tempo-range absolute inset-0 h-full w-full cursor-pointer"
      />
    </div>
  )
}
