import { useState } from 'react'
import { BluePage } from '../components/BluePage'
import { Button, IconButton } from '../components/Button'
import { ArrowLeftIcon, ArrowRightIcon, ChevronRightIcon, ClockIcon, FaceIcon, LungsIcon, ThumbDownIcon, ThumbUpIcon, WaveIcon } from '../components/icons'
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
  /** Where to begin: the practice screen can show its own "well done" over the figure first. */
  initialStep?: Step
  /** Back from the first page of the flow, e.g. to the figure that is still breathing. */
  onBack?: () => void
}

type Step = 'done' | 'feel' | 'summary' | 'next'

/**
 * After a session: well done (with a thumbs rating), how do you feel, a
 * summary of what actually happened, and a suggestion for what to do next.
 * Everything shown is either from the session itself or what the user said.
 */
export function CompletionFlow({ exercise, summary, sessionId, scale, initialStep = 'done', onBack }: Props) {
  const [step, setStep] = useState<Step>(initialStep)
  const feedback = useStore((d) => d.sessions.find((s) => s.id === sessionId)?.feedback)
  const save = (patch: Parameters<typeof store.setFeedback>[1]) => sessionId && store.setFeedback(sessionId, patch)

  if (step === 'done') return <WellDone exercise={exercise} summary={summary} rating={feedback?.rating} onRate={(rating) => save({ rating })} onNext={() => setStep('feel')} />
  if (step === 'feel')
    return <HowDoYouFeel value={feedback?.feeling} onChange={(feeling) => save({ feeling })} onContinue={() => setStep('summary')} onBack={onBack ?? (initialStep === 'feel' ? undefined : () => setStep('done'))} />
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
        className={`flex size-14 items-center md:size-[4.5rem] justify-center rounded-full border-[1.5px] transition ${on ? 'border-white bg-white text-night' : 'border-white/70 text-white hover:bg-white/10'}`}
      >
        {r === 'up' ? <ThumbUpIcon className="size-6" strokeWidth={1.6} /> : <ThumbDownIcon className="size-6" strokeWidth={1.6} />}
      </button>
    )
  }
  return (
    <BluePage testId="completion">
      <header className="pt-4">
        <Wordmark />
      </header>
      <section className="flex flex-1 flex-col justify-center py-8">
        <h1 className="text-[2.75rem] leading-tight font-bold tracking-[-0.02em] md:text-[4.5rem] lg:text-[5rem]">{t.wellDone}</h1>
        <p className="mt-4 text-[1.125rem] leading-snug text-white/85 md:mt-5 md:text-[1.625rem]" data-testid="completion-text">
          {t.completed(t.minutesLong(minutes), exercise.text[lang].name)}
        </p>
        <div className="mt-8 border-t border-white/25 pt-7 md:mt-12 md:pt-9" data-testid="completion-reflection">
          <p className="text-[1.375rem] leading-snug md:text-[2rem]">{t.reflection.question}</p>
          <p className="mt-3 text-[1rem] leading-relaxed text-white/85 md:max-w-2xl md:text-[1.1875rem]">{t.reflection.lead}</p>
          <div className="md:mt-4 md:grid md:grid-cols-2 md:gap-x-10">
          {t.reflection.parts.map(({ title, text }) => (
            <div key={title} className="mt-6">
              <h2 className="text-[0.6875rem] font-medium tracking-[0.14em] text-white/60 uppercase md:text-[0.8125rem]">{title}</h2>
              <p className="mt-1.5 text-[1rem] leading-relaxed text-white/85 md:text-[1.125rem]">{text}</p>
            </div>
          ))}
          </div>
        </div>
      </section>
      <footer className="sticky bottom-0 flex items-center gap-3 bg-blue-page pt-3 pb-6 before:pointer-events-none before:absolute before:inset-x-0 before:-top-10 before:h-10 before:bg-linear-to-t before:from-blue-page before:to-transparent after:absolute after:inset-x-0 after:top-full after:h-[max(env(safe-area-inset-bottom),1rem)] after:bg-blue-page">
        {rateButton('up')}
        {rateButton('down')}
        <Button variant="page" className="ml-auto min-h-[3.75rem] md:min-h-[4.5rem] md:px-8 md:text-[1.125rem]" trailingIcon={<ArrowRightIcon className="size-5" />} onClick={onNext} data-testid="completion-next">
          {t.next}
        </Button>
      </footer>
    </BluePage>
  )
}

function WhitePage({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <main className="safe-area mx-auto flex min-h-dvh max-w-md flex-col bg-paper px-6 md:max-w-3xl md:px-14 md:pb-10 lg:max-w-5xl" data-testid={testId}>
      <header className="pt-6">
        <Wordmark size={18} className="opacity-90" />
      </header>
      {children}
    </main>
  )
}

function HowDoYouFeel({ value, onChange, onContinue, onBack }: { value?: Feeling; onChange: (f: Feeling) => void; onContinue: () => void; onBack?: () => void }) {
  const { t } = useI18n()
  const levels: Feeling[] = [1, 2, 3, 4, 5]
  return (
    <main
      className="safe-area relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden bg-paper px-6 md:max-w-3xl md:px-14 md:pb-10 lg:max-w-5xl"
      data-testid="feeling"
    >
      <FeelRibbon />
      <header className="relative flex h-12 items-center pt-2">
        {onBack ? (
          <IconButton label={t.back} onClick={onBack} className="-ml-2.5 text-ink" data-testid="feeling-back">
            <ArrowLeftIcon className="size-6" strokeWidth={1.7} />
          </IconButton>
        ) : (
          <Wordmark size={18} className="opacity-90" />
        )}
      </header>
      <h1 className="relative mt-[22vh] max-w-[11ch] text-[2.5rem] leading-[1.08] font-semibold tracking-[-0.02em] md:mt-[24vh] md:text-[3.75rem]">
        {t.feelTitle}
      </h1>
      <div role="radiogroup" aria-label={t.feelTitle} className="relative mt-11 grid grid-cols-5 gap-1 md:mt-16 md:gap-6">
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
              className="group flex flex-col items-center gap-2.5 outline-none md:gap-3.5"
            >
              <span
                className={`feel-face flex size-14 items-center justify-center rounded-full transition duration-300 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blue md:size-24 ${
                  on ? 'feel-face-on text-accent' : 'bg-surface text-ink-2 ring-1 ring-line group-hover:bg-surface-2'
                }`}
              >
                <FaceIcon mood={level} className="size-7 md:size-11" strokeWidth={1.6} />
              </span>
              <span className={`text-center text-[0.75rem] leading-tight transition md:text-[1rem] ${on ? 'font-medium text-ink' : 'text-muted'}`}>
                {t.feelings[level - 1]}
              </span>
            </button>
          )
        })}
      </div>
      <div className="relative mt-auto pt-10 pb-4">
        <Button className="w-full" trailingIcon={<ArrowRightIcon className="size-5" />} onClick={onContinue} data-testid="feeling-continue">
          {t.continue}
        </Button>
      </div>
    </main>
  )
}

/**
 * A silky ribbon of fine lines sweeping across the top corner, in the accent colour.
 * It drifts slowly in the resonance rhythm (about 5.5 breaths a minute), so the page
 * still breathes a little after the exercise. Purely decorative.
 */
function FeelRibbon() {
  const lines = Array.from({ length: 22 }, (_, i) => {
    const k = i / 21
    const d = `M-40 ${190 + i * 2.2} C 100 ${170 - i * 2}, 200 ${235 - i * 4.5}, 300 ${130 + i * 0.6} S 430 ${20 + i * 4.5}, 470 ${-10 + i * 4.2}`
    // Brightest in the middle of the band, fading at both edges.
    const opacity = 0.12 + 0.6 * Math.sin(Math.PI * k) ** 2
    return <path key={i} d={d} strokeOpacity={opacity} />
  })
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[46vh] overflow-hidden md:h-[50vh]">
      <div className="feel-glow absolute -top-24 -right-16 size-[22rem] rounded-full md:size-[34rem]" />
      <svg
        viewBox="0 0 440 260"
        preserveAspectRatio="xMaxYMin slice"
        className="feel-ribbon absolute inset-0 size-full text-accent [mask-image:linear-gradient(to_bottom,black_45%,transparent),linear-gradient(to_right,transparent,black_35%)] [mask-composite:intersect]"
        fill="none"
        stroke="currentColor"
        strokeWidth={0.7}
      >
        {lines}
      </svg>
    </div>
  )
}

function Summary({ exercise, summary, scale, feeling, onDone }: { exercise: Exercise; summary: SessionSummary; scale: number; feeling?: Feeling; onDone: () => void }) {
  const { lang, t } = useI18n()
  const iconClass = 'size-5 shrink-0 text-accent'
  const tiles = [
    { icon: <ClockIcon className={iconClass} />, value: formatDuration(summary.durationMs), label: t.breathingTime, id: 'duration' },
    { icon: <LungsIcon className={iconClass} />, value: String(summary.completedCycles), label: t.breathsLabel, id: 'cycles' },
    { icon: <WaveIcon className={iconClass} />, value: `${paceText(exercise, scale, lang)} s`, label: t.pace, id: 'pace' },
    { icon: <FaceIcon mood={feeling ?? 3} className={iconClass} />, value: feeling ? t.feelings[feeling - 1] : t.notReported, label: t.reported, id: 'feeling' },
  ]
  return (
    <WhitePage testId="summary">
      <h1 className="mt-6 text-[2rem] leading-tight font-bold tracking-[-0.02em] md:mt-16 md:text-[3rem]">{t.niceWork}</h1>
      <p className="mt-1 text-[0.9375rem] text-muted md:text-[1.125rem]">{exercise.text[lang].name}</p>
      <dl className="mt-8 grid grid-cols-2 gap-3 md:mt-12 md:gap-4">
        {tiles.map(({ icon, value, label, id }) => (
          <div key={id} className="rounded-[20px] bg-surface p-4 md:p-6">
            <dd className="flex items-center gap-2 text-[1.125rem] text-ink md:text-[1.5rem]" data-testid={`summary-${id}`}>
              {icon}
              <span className="truncate">{value}</span>
            </dd>
            <dt className="mt-1 text-[0.75rem] text-muted md:text-[0.9375rem]">{label}</dt>
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
      <h1 className="mt-6 text-[2rem] leading-tight font-bold tracking-[-0.02em] md:mt-16 md:text-[3rem]">{t.keepGoing}</h1>
      <p className="mt-1 text-[1.0625rem] text-muted md:text-[1.25rem]">{t.tryAnother}</p>
      <button
        type="button"
        onClick={() => startPractice(next.id)}
        className="mt-8 w-full rounded-[22px] bg-card p-5 text-left md:mt-12 md:p-7 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_6px_24px_rgb(0_0_0/0.05)] ring-1 ring-line/60"
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
            <Waveform phases={next.pattern.phases} className="h-7 w-20 text-ink-2" />
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
