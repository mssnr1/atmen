import { useCallback, useMemo, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button, IconButton } from '../components/Button'
import { GearIcon, LearnIcon, LifebuoyIcon, RingsIcon, SlidersIcon } from '../components/icons'
import { Wordmark } from '../components/Wordmark'
import { exercises, getExercise } from '../exercises'
import { useI18n } from '../i18n'
import { navigate, startPractice } from '../lib/route'
import { lastExercise, suggest } from '../lib/suggest'
import { ambientSource } from '../stage/ambient'
import { useStage } from '../stage/stage'
import { useStore } from '../storage/store'

/** The exercise behind "I'm stressed": the long exhale. */
const STRESS_EXERCISE = 'relax'
const IDS = exercises.map((e) => e.id)

/**
 * The start: the figure is already breathing, calmly and on its own. One tap carries on with the last
 * exercise and the camera simply moves closer. Everything else (another exercise, history, learning,
 * settings) is a thin layer over the same room.
 */
export function StartScreen() {
  const { lang, t } = useI18n()
  const sessions = useStore((d) => d.sessions)
  const durations = useStore((d) => d.preferences.durationByExercise)
  const [pickerOpen, setPickerOpen] = useState(false)
  const closePicker = useCallback(() => setPickerOpen(false), [])
  useStage({ source: ambientSource, framing: 'start' })

  // What fits now, by time of day and the user's own answers; the main button repeats the last exercise.
  const fit = useMemo(() => suggest(sessions, new Date(), IDS), [sessions])
  const last = lastExercise(sessions, IDS)
  const main = getExercise(last ?? fit.exerciseId) ?? exercises[0]
  const minutes = (id: string) => Math.round((durations[id] ?? getExercise(id)?.defaultDurationMs ?? 0) / 60_000)
  const mainLabel = (last ? t.continueWith : t.startWith)(main.text[lang].short, minutes(main.id))

  return (
    <main className="relative z-10 flex h-dvh flex-col overflow-hidden" data-testid="start">
      <div className="start-scrim pointer-events-none absolute inset-0" aria-hidden />
      <header className="safe-top relative mx-auto flex w-full max-w-md items-center justify-between px-6 md:max-w-3xl md:px-10">
        <Wordmark size={30} live className="mt-1" />
        <nav className="-mr-2.5 flex items-center text-ink-2" aria-label={t.appName}>
          <IconButton label={t.nav.history} onClick={() => navigate({ name: 'history' })} data-testid="nav-history">
            <RingsIcon className="size-[1.375rem]" strokeWidth={1.5} />
          </IconButton>
          <IconButton label={t.nav.learn} onClick={() => navigate({ name: 'learn' })} data-testid="nav-learn">
            <LearnIcon className="size-[1.375rem]" strokeWidth={1.5} />
          </IconButton>
          <IconButton label={t.nav.settings} onClick={() => navigate({ name: 'settings' })} data-testid="nav-settings">
            <GearIcon className="size-[1.375rem]" strokeWidth={1.5} />
          </IconButton>
        </nav>
      </header>

      <div className="fade-up safe-bottom relative mx-auto mt-auto w-full max-w-md px-6 md:max-w-lg md:pb-10" data-testid="start-choices">
        <h1 className="display text-[2.125rem] md:text-[2.75rem]">{t.tagline}</h1>
        <Button onClick={() => startPractice(main.id)} className="mt-6 w-full" data-testid="start-main">
          {mainLabel}
        </Button>
        <div className="mt-1.5 flex items-center justify-between">
          <button type="button" onClick={() => setPickerOpen(true)} className="-ml-3 min-h-11 rounded-full px-3 text-[0.9375rem] font-medium text-ink-2 transition hover:text-ink" data-testid="start-other">
            {t.otherExercise}
          </button>
          <button
            type="button"
            onClick={() => startPractice(STRESS_EXERCISE)}
            className="-mr-3 min-h-11 rounded-full px-3 text-[0.9375rem] font-medium text-ink-2 transition hover:text-ink"
            data-testid="start-stressed"
          >
            {t.stressed}
          </button>
        </div>
        {/* Acute help stays one tap away, and red means only this. */}
        <button
          type="button"
          onClick={() => navigate({ name: 'sos' })}
          className="mx-auto mt-1 flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.9375rem] font-semibold text-alert transition hover:bg-alert/10"
          data-testid="start-panic"
        >
          {t.panic}
        </button>
      </div>

      <BottomSheet open={pickerOpen} title={t.needTitle} closeLabel={t.close} onClose={closePicker} testId="exercise-sheet">
        <ul className="divide-y divide-line" data-testid="exercise-list">
          {exercises.map((e) => {
            const text = e.text[lang]
            return (
              <li key={e.id} className="flex items-center gap-1">
                <button type="button" onClick={() => startPractice(e.id)} className="min-w-0 flex-1 py-4 text-left" data-testid={`exercise-${e.id}`}>
                  <span className="flex items-center gap-2.5">
                    <span className="text-[1.1875rem] leading-tight">{text.need}</span>
                    {fit.exerciseId === e.id && <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium tracking-wide text-ink-2 ring-1 ring-ink/25">{t.fitsNow}</span>}
                  </span>
                  <span className="mt-1 block text-[0.875rem] text-ink-2">
                    {text.name} · {t.minutes(minutes(e.id))}
                  </span>
                </button>
                <IconButton label={t.adjust(text.name)} onClick={() => navigate({ name: 'exercise', exerciseId: e.id })} className="text-ink-2" data-testid={`adjust-${e.id}`}>
                  <SlidersIcon className="size-5" strokeWidth={1.5} />
                </IconButton>
              </li>
            )
          })}
          <li>
            <button type="button" onClick={() => navigate({ name: 'sos' })} className="flex w-full items-center gap-2.5 py-4 text-left text-[1.0625rem] font-medium text-alert">
              <LifebuoyIcon className="size-5" strokeWidth={1.6} />
              {t.panic}
            </button>
          </li>
        </ul>
      </BottomSheet>
    </main>
  )
}
