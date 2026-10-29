import { useState } from 'react'
import { BluePage } from '../components/BluePage'
import { Button } from '../components/Button'
import { ArrowRightIcon, ChevronRightIcon, ClockIcon, FaceIcon, LungsIcon, ThumbDownIcon, ThumbUpIcon, WaveIcon } from '../components/icons'
import { Waveform } from '../components/Waveform'
import { Wordmark } from '../components/Wordmark'
import type { SessionSummary } from '../engine'
import { nextExercise, type Exercise } from '../exercises'
import { useI18n } from '../i18n'
import { paceText, rhythmText } from '../lib/exerciseText'
import { formatDuration } from '../lib/format'
import { navigate, startPractice } from '../lib/route'
import { store, useStore } from '../storage/store'
import type { Feeling } from '../storage/types'

interface Props {
  exercise: Exercise
  summary: SessionSummary
  sessionId: string | null
  /** Pace scale the session was breathed at. */
  scale: number
}

type Step = 'done' | 'feel' | 'summary' | 'next'

/**
 * After a session: well done (with a thumbs rating), how do you feel, a
 * summary of what actually happened, and a suggestion for what to do next.
 * Everything shown is either from the session itself or what the user said.
 */
export function CompletionFlow({ exercise, summary, sessionId, scale }: Props) {
  const [step, setStep] = useState<Step>('done')
  const feedback = useStore((d) => d.sessions.find((s) => s.id === sessionId)?.feedback)
  const save = (patch: Parameters<typeof store.setFeedback>[1]) => sessionId && store.setFeedback(sessionId, patch)

  if (step === 'done') return <WellDone exercise={exercise} summary={summary} rating={feedback?.rating} onRate={(rating) => save({ rating })} onNext={() => setStep('feel')} />
  if (step === 'feel') return <HowDoYouFeel value={feedback?.feeling} onChange={(feeling) => save({ feeling })} onContinue={() => setStep('summary')} />
  if (step === 'summary')
    return <Summary exercise={exercise} summary={summary} scale={scale} feeling={feedback?.feeling} onDone={() => setStep('next')} />
  return <NextExercise current={exercise} />
}

function WellDone({
  exercise,
  summary,
  rating,
  onRate,
  onNext,
}: {
  exercise: Exercise
  summary: SessionSummary
  rating?: 'up' | 'down'
  onRate: (r: 'up' | 'down') => void
  onNext: () => void
}) {
  const { lang, t } = useI18n()
  const minutes = Math.max(1, Math.round(summary.durationMs / 60_000))
  const rateButton = (r: 'up' | 'down') => {
    const on = rating === r
    return (
      <button
        type="button"
        aria-label={r === 'up' ? t.liked : t.disliked}
        aria-pressed={on}
        data-testid={`rate-${r}`}
        onClick={() => onRate(r)}
        className={`flex size-[3.75rem] items-center justify-center rounded-full border-[1.5px] transition ${on ? 'border-white bg-white text-blue' : 'border-white/70 text-white hover:bg-white/10'}`}
      >
        {r === 'up' ? <ThumbUpIcon className="size-6" strokeWidth={1.6} /> : <ThumbDownIcon className="size-6" strokeWidth={1.6} />}
      </button>
    )
  }
  return (
    <BluePage testId="completion">
      <header className="pt-4">
        <Wordmark className="text-[1.0625rem]" />
      </header>
      <section className="flex flex-1 flex-col justify-center py-10">
        <h1 className="text-[2.75rem] leading-tight font-normal">{t.wellDone}</h1>
        <p className="mt-6 text-[1.25rem] leading-snug text-white/85" data-testid="completion-text">
          {t.completed(t.minutesLong(minutes), exercise.text[lang].name)}
        </p>
      </section>
      <footer className="flex items-center gap-3 pb-6">
        {rateButton('up')}
        {rateButton('down')}
        <Button variant="white" className="ml-auto min-h-[3.75rem]" trailingIcon={<ArrowRightIcon className="size-5" />} onClick={onNext} data-testid="completion-next">
          {t.next}
        </Button>
      </footer>
    </BluePage>
  )
}

function WhitePage({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <main className="safe-area mx-auto flex min-h-dvh max-w-md flex-col bg-white px-6" data-testid={testId}>
      <header className="pt-6">
        <Wordmark className="text-[0.8125rem] text-muted" />
      </header>
      {children}
    </main>
  )
}

function HowDoYouFeel({ value, onChange, onContinue }: { value?: Feeling; onChange: (f: Feeling) => void; onContinue: () => void }) {
  const { t } = useI18n()
  const levels: Feeling[] = [1, 2, 3, 4, 5]
  return (
    <WhitePage testId="feeling">
      <h1 className="mt-6 text-[2rem] leading-tight font-normal">{t.feelTitle}</h1>
      <div role="radiogroup" aria-label={t.feelTitle} className="mt-10 grid grid-cols-5 gap-1">
        {levels.map((level) => {
          const on = value === level
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={on}
              data-testid={`feeling-${level}`}
              onClick={() => onChange(level)}
              className="flex flex-col items-center gap-2"
            >
              <span className={`flex size-12 items-center justify-center rounded-full transition ${on ? 'bg-blue text-white' : 'bg-surface text-ink-2'}`}>
                <FaceIcon mood={level} className="size-7" strokeWidth={1.6} />
              </span>
              <span className={`text-center text-[0.75rem] leading-tight ${on ? 'text-blue' : 'text-muted'}`}>{t.feelings[level - 1]}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-auto pt-10 pb-4">
        <Button className="w-full" trailingIcon={<ArrowRightIcon className="size-5" />} onClick={onContinue} data-testid="feeling-continue">
          {t.continue}
        </Button>
      </div>
    </WhitePage>
  )
}

function Summary({ exercise, summary, scale, feeling, onDone }: { exercise: Exercise; summary: SessionSummary; scale: number; feeling?: Feeling; onDone: () => void }) {
  const { lang, t } = useI18n()
  const iconClass = 'size-5 shrink-0 text-blue'
  const tiles = [
    { icon: <ClockIcon className={iconClass} />, value: formatDuration(summary.durationMs), label: t.breathingTime, id: 'duration' },
    { icon: <LungsIcon className={iconClass} />, value: String(summary.completedCycles), label: t.breathsLabel, id: 'cycles' },
    { icon: <WaveIcon className={iconClass} />, value: `${paceText(exercise, scale, lang)} s`, label: t.pace, id: 'pace' },
    { icon: <FaceIcon mood={feeling ?? 3} className={iconClass} />, value: feeling ? t.feelings[feeling - 1] : t.notReported, label: t.reported, id: 'feeling' },
  ]
  return (
    <WhitePage testId="summary">
      <h1 className="mt-6 text-[2rem] leading-tight font-normal">{t.niceWork}</h1>
      <p className="mt-1 text-[0.9375rem] text-muted">{exercise.text[lang].name}</p>
      <dl className="mt-8 grid grid-cols-2 gap-3">
        {tiles.map(({ icon, value, label, id }) => (
          <div key={id} className="rounded-[20px] bg-surface p-4">
            <dd className="flex items-center gap-2 text-[1.125rem] text-ink" data-testid={`summary-${id}`}>
              {icon}
              <span className="truncate">{value}</span>
            </dd>
            <dt className="mt-1 text-[0.75rem] text-muted">{label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[0.75rem] text-muted">{t.noMeasurements}</p>
      <div className="mt-auto pt-10 pb-4">
        <Button className="w-full" onClick={onDone} data-testid="summary-done">
          {t.done}
        </Button>
      </div>
    </WhitePage>
  )
}

function NextExercise({ current }: { current: Exercise }) {
  const { lang, t } = useI18n()
  const next = nextExercise(current.id)
  const text = next.text[lang]
  return (
    <WhitePage testId="next-exercise">
      <h1 className="mt-6 text-[2rem] leading-tight font-normal">{t.keepGoing}</h1>
      <p className="mt-1 text-[1.0625rem] text-muted">{t.tryAnother}</p>
      <button
        type="button"
        onClick={() => startPractice(next.id)}
        className="mt-8 w-full rounded-[22px] bg-white p-5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04),0_6px_24px_rgb(0_0_0/0.05)] ring-1 ring-line/60"
      >
        <span className="flex items-start justify-between gap-3">
          <span>
            <span className="block text-[1.25rem]">{text.name}</span>
            <span className="mt-1 block text-[0.875rem] leading-snug text-muted">
              {text.purpose[0]}
              <br />
              {text.purpose[1]}
            </span>
          </span>
          <span className="flex items-center gap-3 pt-2">
            <Waveform phases={next.pattern.phases} className="h-6 w-16 text-ink-2" />
            <ChevronRightIcon className="-mt-5 size-4 text-ink-2" />
          </span>
        </span>
        <span className="mt-5 block text-[0.8125rem] text-muted">{rhythmText(next, 1, lang, t)}</span>
      </button>
      <div className="mt-auto flex flex-col gap-3 pt-10 pb-4">
        <Button onClick={() => startPractice(next.id)} data-testid="start-next">
          {t.startExercise(text.name)}
        </Button>
        <Button variant="secondary" onClick={() => navigate({ name: 'home' })} data-testid="back-home">
          {t.backHome}
        </Button>
      </div>
    </WhitePage>
  )
}
