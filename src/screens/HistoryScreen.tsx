import { useMemo, useState } from 'react'
import { IconButton } from '../components/Button'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons'
import { Page } from '../components/Page'
import { getExercise } from '../exercises'
import { useI18n } from '../i18n'
import { formatDuration } from '../lib/format'
import { whatHelps } from '../lib/suggest'
import { addDays, sessionsByDay, weekRings, weekStart } from '../lib/weekRings'
import { useStore } from '../storage/store'
import type { SessionRecord } from '../storage/types'

/** Breath light for a ring: sky at the start of the week, lavender at its end. */
const ringColor = (t: number) => `color-mix(in srgb, var(--color-breath) ${Math.round(t * 100)}%, var(--color-breath-2))`

/**
 * The history as breath rings: every exercise is a ring, the week grows from the inside out. A day
 * without an exercise is a fine dashed ring and nothing more: no streaks, no pressure. Below it, what
 * the user's own answers before and after say about what helps them.
 */
export function HistoryScreen({ justDoneId }: { justDoneId?: string }) {
  const { lang, t } = useI18n()
  const sessions = useStore((d) => d.sessions)
  const justDone = justDoneId ? sessions.find((s) => s.id === justDoneId) : undefined
  const [weeksBack, setWeeksBack] = useState(0)

  const now = useMemo(() => new Date(), [])
  const start = useMemo(() => addDays(weekStart(now), -7 * weeksBack), [now, weeksBack])
  const days = useMemo(() => sessionsByDay(sessions, start), [sessions, start])
  // In the running week the days still to come are left out.
  const today = (now.getDay() + 6) % 7
  const { rings, outer } = useMemo(() => weekRings(days, weeksBack === 0 ? today : 6), [days, weeksBack, today])
  const count = days.reduce((n, d) => n + d.length, 0)
  const minutes = Math.round(days.flat().reduce((ms, s) => ms + s.durationMs, 0) / 60_000)
  const R = Math.max(outer + 6, 110)

  const date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' })
  const weekLabel = weeksBack === 0 ? t.thisWeek : `${date.format(start)} – ${date.format(addDays(start, 6))}`
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const helps = useMemo(() => whatHelps(sessions), [sessions])
  const totalMinutes = Math.round(sessions.reduce((ms, s) => ms + s.durationMs, 0) / 60_000)
  const oldest = sessions.length ? weekStart(new Date(sessions[0].completedAt)).getTime() : start.getTime()
  // Which of the week's exercises the one just done was: counted, not judged.
  const nth = justDone && weeksBack === 0 ? days.flat().sort((a, b) => a.completedAt.localeCompare(b.completedAt)).findIndex((s) => s.id === justDone.id) + 1 : 0

  return (
    <Page title={t.historyTitle} lead={t.historyLead} testId="history">
      {justDone && <JustDone session={justDone} nth={nth} />}
      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-16">
        <section aria-label={weekLabel}>
          <div className="flex items-center justify-between">
            <IconButton label={t.previousWeek} onClick={() => setWeeksBack((w) => w + 1)} disabled={start.getTime() <= oldest} className="-ml-2.5 text-ink-2" data-testid="week-previous">
              <ChevronLeftIcon className="size-5" strokeWidth={1.5} />
            </IconButton>
            <div className="text-center">
              <p className="text-body font-medium" data-testid="week-label">
                {weekLabel}
              </p>
              <p className="text-note text-ink-2 tabular-nums" data-testid="week-total">
                {count ? `${t.sessions(count)} · ${t.minutesLong(minutes)}` : t.weekEmpty}
              </p>
            </div>
            <IconButton label={t.nextWeek} onClick={() => setWeeksBack((w) => Math.max(0, w - 1))} disabled={weeksBack === 0} className="-mr-2.5 text-ink-2" data-testid="week-next">
              <ChevronRightIcon className="size-5" strokeWidth={1.5} />
            </IconButton>
          </div>

          <svg
            viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`}
            className="mx-auto mt-4 block w-full max-w-[22rem]"
            role="img"
            aria-label={`${weekLabel}: ${count ? `${t.sessions(count)}, ${t.minutesLong(minutes)}` : t.weekEmpty}`}
            data-testid="week-rings"
          >
            {rings.map((ring, i) =>
              ring.empty ? (
                <circle key={i} r={ring.r} fill="none" stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="2 7" strokeLinecap="round" />
              ) : (
                <circle
                  key={i}
                  r={ring.r}
                  fill="none"
                  stroke={ringColor(ring.t)}
                  strokeWidth={ring.width}
                  {...(justDone && ring.session?.id === justDone.id
                    ? // The ring just earned draws itself in, from the top, and keeps a soft glow.
                      { pathLength: 1, transform: 'rotate(-90)', className: 'ring-draw', 'data-testid': 'ring-just-done' }
                    : {})}
                />
              ),
            )}
          </svg>

          {/* The same week in words: the day and its minutes. */}
          <ol className="mx-auto mt-5 grid max-w-[22rem] grid-cols-7 text-center" data-testid="week-days">
            {days.map((d, i) => {
              const future = weeksBack === 0 && i > today
              const m = Math.round(d.reduce((ms, s) => ms + s.durationMs, 0) / 60_000)
              return (
                <li key={i} className={future ? 'opacity-35' : ''}>
                  <span className="block text-fine text-ink-2">{t.weekdays[i]}</span>
                  <span className="mt-0.5 block text-note tabular-nums">{d.length ? t.minutes(Math.max(1, m)) : '–'}</span>
                </li>
              )
            })}
          </ol>

          <ul className="mx-auto mt-6 flex max-w-[22rem] flex-wrap items-center justify-center gap-x-5 gap-y-2 text-note text-ink-2">
            <li className="flex items-center gap-2">
              <svg viewBox="0 0 30 12" className="h-3 w-[1.875rem]" aria-hidden>
                <path d="M2 6h6" stroke={ringColor(0)} strokeWidth={1.5} />
                <path d="M12 6h6" stroke={ringColor(0.5)} strokeWidth={3.5} />
                <path d="M22 6h6" stroke={ringColor(1)} strokeWidth={6.5} />
              </svg>
              {t.legendWidth}
            </li>
            <li className="flex items-center gap-2">
              <svg viewBox="0 0 22 12" className="h-3 w-[1.375rem]" aria-hidden>
                <path d="M2 6h18" stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="2 5" strokeLinecap="round" />
              </svg>
              {t.legendEmpty}
            </li>
          </ul>
        </section>

        <section className="mt-12 lg:mt-0" data-testid="what-helps">
          <h2 className="eyebrow">{t.helpsTitle}</h2>
          <p className="mt-2 text-body leading-relaxed text-ink-2">{t.helpsLead}</p>
          {helps.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {helps.map((h) => {
                const e = getExercise(h.exerciseId)
                const dir = h.change > 0.05 ? 1 : h.change < -0.05 ? -1 : 0
                return (
                  <li key={h.exerciseId} className="flex items-baseline justify-between gap-4 py-3.5">
                    <span className="text-body">{e?.text[lang].name ?? h.exerciseId}</span>
                    <span className="text-right text-note text-ink-2">
                      <span className={dir > 0 ? 'text-effect' : ''}>{t.helpsChange(number.format(Math.abs(h.change)), dir)}</span>
                      <span className="block text-fine">{t.sessions(h.sessions)}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-4 rounded-[18px] px-4 py-3.5 text-body leading-relaxed text-ink-2 ring-1 ring-line">{t.helpsEmpty}</p>
          )}
          {sessions.length > 0 && (
            <p className="mt-6 text-note text-ink-2 tabular-nums" data-testid="history-total">
              {t.total(t.sessions(sessions.length), t.minutesLong(totalMinutes))}
            </p>
          )}
        </section>
      </div>
      <div className="h-10" />
    </Page>
  )
}

/**
 * The exercise just finished, at the top of the overview: what was done, how the user said they felt
 * before and after, and where it stands in the week.
 */
function JustDone({ session, nth }: { session: SessionRecord; nth: number }) {
  const { lang, t } = useI18n()
  const e = getExercise(session.exerciseId)
  const { before, after } = session.feedback ?? {}
  const mood = (m?: number) => (m && m >= 1 && m <= 5 ? t.moods[m - 1] : undefined)
  const b = mood(before)
  const a = mood(after)
  return (
    <section className="fade-up mt-7 max-w-xl rounded-[22px] px-5 py-4 ring-1 ring-line" aria-label={t.justDone} data-testid="just-done">
      <p className="eyebrow">{t.justDone}</p>
      <p className="mt-1.5 text-lead font-medium">{e?.text[lang].name ?? session.exerciseId}</p>
      <p className="mt-0.5 text-body text-ink-2 tabular-nums">
        {formatDuration(session.durationMs)} · {t.breaths(session.cycles)}
      </p>
      {b && a && <p className="mt-2 text-body">{t.beforeAfter(b, a)}</p>}
      {nth > 0 && <p className="mt-2 text-note text-ink-2">{t.nthThisWeek(nth)}</p>}
    </section>
  )
}
