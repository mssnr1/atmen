import { getExercise } from '../exercises'
import { useI18n } from '../i18n'
import type { WeekRing } from '../lib/weekRings'

/** Breath light for a ring: sky at the start of the week, lavender at its end. */
export const ringColor = (t: number) => `color-mix(in srgb, var(--color-breath) ${Math.round(t * 100)}%, var(--color-breath-2))`

/** Half the height of the opening on the right, where the time axis runs from the middle outwards. */
const OPEN = 9
/** Size of the text along the rings and on the axis. */
const LABEL = 8
const AXIS_LABEL = 6.8

const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`

/** A ring, open on the right: from just below the axis all the way round to just above it. */
function ringPath(r: number) {
  const a = Math.asin(Math.min(0.95, OPEN / r))
  return `M ${pt(r, a)} A ${r} ${r} 0 1 1 ${pt(r, 2 * Math.PI - a)}`
}

/** The line a ring's text sits on: from the bottom, over the left and the top, up to the opening. */
function labelPath(r: number) {
  const a = Math.asin(Math.min(0.95, (OPEN + 1.5) / r))
  return `M ${pt(r, Math.PI / 2)} A ${r} ${r} 0 1 1 ${pt(r, 2 * Math.PI - a)}`
}

interface Props {
  rings: WeekRing[]
  /** Outer radius the rings reach. */
  outer: number
  label: string
  justDoneId?: string
}

/**
 * The week as rings, Monday in the middle, Sunday outside. Every ring carries a small line along it
 * (day, exercise, minutes, how the user felt afterwards), ending at an opening on the right where a
 * time axis runs from the middle outwards, so it is clear what is inside and what is outside.
 */
export function WeekRingsChart({ rings, outer, label, justDoneId }: Props) {
  const { lang, t } = useI18n()
  const R = Math.max(outer + 13, 100)
  const date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'numeric' })
  const mood = (m?: number) => (m && m >= 1 && m <= 5 ? t.moods[m - 1].toLowerCase() : undefined)

  const text = (ring: WeekRing) => {
    const s = ring.session
    if (!s) return ''
    const e = getExercise(s.exerciseId)
    const after = mood(s.feedback?.after)
    return [`${t.weekdays[ring.day]} ${date.format(new Date(s.completedAt))}`, e?.text[lang].short ?? s.exerciseId, t.minutes(Math.max(1, Math.round(s.durationMs / 60_000))), after]
      .filter(Boolean)
      .join(' · ')
  }

  // One tick on the axis for each day, where its first ring lies.
  const ticks = rings.filter((r, i) => i === 0 || rings[i - 1].day !== r.day)
  const axisStart = rings.length ? rings[0].r - 10 : 20
  const axisEnd = outer + 2

  return (
    <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="-mx-4 mt-4 block w-[calc(100%+2rem)] max-w-[30rem] sm:mx-auto sm:w-full" role="img" aria-label={label} data-testid="week-rings">
      <defs>
        {rings.map((ring, i) => (ring.empty ? null : <path key={i} id={`ring-label-${i}`} d={labelPath(ring.r + ring.width / 2 + 2)} />))}
      </defs>

      {rings.map((ring, i) =>
        ring.empty ? (
          <path key={i} d={ringPath(ring.r)} fill="none" stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="2 7" strokeLinecap="round" />
        ) : (
          <path
            key={i}
            d={ringPath(ring.r)}
            fill="none"
            stroke={ringColor(ring.t)}
            strokeWidth={ring.width}
            {...(justDoneId && ring.session?.id === justDoneId
              ? // The ring just earned draws itself in, from the axis round, and keeps a soft glow.
                { pathLength: 1, className: 'ring-draw', 'data-testid': 'ring-just-done' }
              : {})}
          />
        ),
      )}

      {/* The small line along each ring, ending at the opening. */}
      <g fontSize={LABEL} fill="var(--color-ink-2)" letterSpacing={0.1} data-testid="ring-labels">
        {rings.map((ring, i) =>
          ring.empty ? null : (
            <text key={i}>
              <textPath href={`#ring-label-${i}`} startOffset="100%" textAnchor="end">
                {text(ring)}
              </textPath>
            </text>
          ),
        )}
      </g>

      {/* The time axis in the opening: from the start of the week in the middle to its end outside. */}
      <g data-testid="time-axis">
        <path d={`M ${axisStart} 0 H ${axisEnd}`} stroke="var(--color-ink-2)" strokeWidth={0.6} opacity={0.7} />
        <path d={`M ${axisEnd - 3} -2.2 L ${axisEnd} 0 L ${axisEnd - 3} 2.2`} fill="none" stroke="var(--color-ink-2)" strokeWidth={0.6} opacity={0.7} />
        {ticks.map((ring) => (
          <g key={ring.day}>
            <path d={`M ${ring.r} -1.6 V 1.6`} stroke="var(--color-ink-2)" strokeWidth={0.6} />
            <text x={ring.r} y={1.6 + AXIS_LABEL} fontSize={AXIS_LABEL} textAnchor="middle" fill="var(--color-ink-2)">
              {t.weekdays[ring.day]}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
