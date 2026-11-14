import { useState, type KeyboardEvent } from 'react'
import { getExercise } from '../exercises'
import { useI18n } from '../i18n'
import type { WeekRing } from '../lib/weekRings'

/** Breath light for a ring: sky at the start of the week, lavender at its end. */
export const ringColor = (t: number) => `color-mix(in srgb, var(--color-breath) ${Math.round(t * 100)}%, var(--color-breath-2))`

/** Half the height of the opening on the right, where the time axis runs from the middle outwards. */
const OPEN = 14
/** Size of the chosen ring's line, and of the days on the axis (in the drawing's units, about 1.1 px each on a phone). */
const LABEL = 11
const AXIS_LABEL = 9.5

const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`

/** A ring, open on the right: from just below the axis all the way round to just above it. */
function ringPath(r: number) {
  const a = Math.asin(Math.min(0.95, OPEN / r))
  return `M ${pt(r, a)} A ${r} ${r} 0 1 1 ${pt(r, 2 * Math.PI - a)}`
}

/** The line the chosen ring's text sits on: from the bottom, over the left and the top, up to the opening. */
function labelPath(r: number) {
  const a = Math.asin(Math.min(0.95, (OPEN + 2) / r))
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
 * The week as rings, Monday in the middle, the last day outside. One ring is chosen at a time (at first
 * the latest one): it stands out and carries its line along it in a readable size (day, exercise,
 * minutes, how the user felt afterwards). A tap on another ring chooses that one. On the right the
 * rings open for a time axis from the middle outwards, so it is clear what is inside and what outside.
 */
export function WeekRingsChart({ rings, outer, label, justDoneId }: Props) {
  const { lang, t } = useI18n()
  const sessionRings = rings.filter((r) => !r.empty)
  const latest = sessionRings[sessionRings.length - 1]?.session?.id
  const [chosenId, setChosenId] = useState<string>()
  // A chosen ring of another week falls back to this week's latest one.
  const activeId = sessionRings.some((r) => r.session?.id === chosenId) ? chosenId : latest
  const active = rings.find((r) => r.session?.id === activeId)

  const R = Math.max(outer + LABEL + 6, 100)
  const date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'numeric' })
  const mood = (m?: number) => (m && m >= 1 && m <= 5 ? t.moods[m - 1].toLowerCase() : undefined)
  const text = (ring: WeekRing) => {
    const s = ring.session
    if (!s) return ''
    const e = getExercise(s.exerciseId)
    return [`${t.weekdays[ring.day]} ${date.format(new Date(s.completedAt))}`, e?.text[lang].short ?? s.exerciseId, t.minutes(Math.max(1, Math.round(s.durationMs / 60_000))), mood(s.feedback?.after)]
      .filter(Boolean)
      .join(' · ')
  }

  // One tick on the axis for each day, where its first ring lies; the days' names take turns above and below.
  const ticks = rings.filter((r, i) => i === 0 || rings[i - 1].day !== r.day)
  const axisStart = rings.length ? rings[0].r - 12 : 20
  const axisEnd = outer + 6
  // How far a ring's tap area reaches either side: half the way to its neighbours.
  const reach = (i: number) => {
    const inner = i > 0 ? (rings[i].r - rings[i - 1].r) / 2 : 8
    const outerGap = i < rings.length - 1 ? (rings[i + 1].r - rings[i].r) / 2 : 8
    return Math.max(8, Math.min(inner, outerGap) * 2)
  }
  const choose = (id?: string) => id && setChosenId(id)
  const onKey = (e: KeyboardEvent, id?: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(id)
    }
  }

  return (
    <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="-mx-4 mt-4 block w-[calc(100%+2rem)] max-w-[30rem] select-none sm:mx-auto sm:w-full" role="group" aria-label={label} data-testid="week-rings">
      <defs>{active && <path id="ring-label" d={labelPath(active.r + active.width / 2 + 3)} />}</defs>

      {rings.map((ring, i) => {
        const isActive = ring === active
        if (ring.empty) return <path key={i} d={ringPath(ring.r)} fill="none" stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="2 7" strokeLinecap="round" opacity={0.8} />
        return (
          <path
            key={i}
            d={ringPath(ring.r)}
            fill="none"
            stroke={ringColor(ring.t)}
            strokeWidth={ring.width}
            className={`transition-opacity duration-300 ${isActive ? 'ring-glow' : ''} ${justDoneId && ring.session?.id === justDoneId ? 'ring-draw' : ''}`}
            opacity={isActive ? 1 : 0.4}
            pathLength={1}
            data-testid={justDoneId && ring.session?.id === justDoneId ? 'ring-just-done' : undefined}
            data-active={isActive || undefined}
          />
        )
      })}

      {/* The chosen ring's line, with a rim in the page's colour so it reads over the rings beneath. */}
      {active && (
        <text key={active.session?.id} fontSize={LABEL} fill="var(--color-ink)" fontWeight={500} stroke="var(--color-paper)" strokeWidth={3.2} strokeLinejoin="round" paintOrder="stroke" className="fade-in pointer-events-none" data-testid="ring-label">
          <textPath href="#ring-label" startOffset="100%" textAnchor="end">
            {text(active)}
          </textPath>
        </text>
      )}

      {/* The time axis in the opening: from the start of the week in the middle to its end outside. */}
      <g className="pointer-events-none" data-testid="time-axis">
        <path d={`M ${axisStart} 0 H ${axisEnd}`} stroke="var(--color-ink-2)" strokeWidth={1} />
        <path d={`M ${axisEnd - 5} -3.5 L ${axisEnd} 0 L ${axisEnd - 5} 3.5`} fill="none" stroke="var(--color-ink-2)" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
        {ticks.map((ring, k) => {
          const on = active?.day === ring.day
          return (
            <g key={ring.day}>
              <path d={`M ${ring.r} -2.5 V 2.5`} stroke={on ? 'var(--color-ink)' : 'var(--color-ink-2)'} strokeWidth={1} />
              <text x={ring.r} y={k % 2 ? -5 : 4 + AXIS_LABEL} fontSize={AXIS_LABEL} textAnchor="middle" fill={on ? 'var(--color-ink)' : 'var(--color-ink-2)'} fontWeight={on ? 600 : 400}>
                {t.weekdays[ring.day]}
              </text>
            </g>
          )
        })}
      </g>

      {/* Tap areas, wider than the rings themselves, on top of everything. */}
      <g fill="none" stroke="transparent" pointerEvents="stroke">
        {rings.map((ring, i) =>
          ring.empty ? null : (
            <path
              key={i}
              d={ringPath(ring.r)}
              strokeWidth={reach(i)}
              role="button"
              tabIndex={0}
              aria-label={text(ring)}
              aria-pressed={ring === active}
              className="cursor-pointer outline-none"
              onClick={() => choose(ring.session?.id)}
              onKeyDown={(e) => onKey(e, ring.session?.id)}
              data-testid="ring-hit"
            />
          ),
        )}
      </g>
    </svg>
  )
}
