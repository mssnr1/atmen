import { Button } from '../components/Button'
import { HomeIcon, RestartIcon } from '../components/icons'
import type { SessionSummary } from '../engine'
import { useI18n } from '../i18n'
import { formatClock } from '../lib/format'

interface Props {
  exerciseName: string
  summary: SessionSummary
  onRestart: () => void
  onHome: () => void
}

export function CompletionView({ exerciseName, summary, onRestart, onHome }: Props) {
  const { t } = useI18n()
  return (
    <section aria-labelledby="done-title" className="flex flex-1 flex-col items-center justify-center text-center" data-testid="completion">
      <div className="relative mb-10 size-20" aria-hidden>
        <div className="absolute -inset-6 rounded-full bg-accent/25 blur-2xl" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,#d6faf3_0%,#7ee0cf_45%,#2c8f8a_100%)]" />
      </div>
      <h2 id="done-title" className="text-4xl font-light">
        {t.doneTitle}
      </h2>
      <p className="mt-2 text-lg text-mist/60">{t.doneText(exerciseName)}</p>

      <dl className="mt-10 grid w-full grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white/7 p-5">
          <dt className="text-xs font-medium tracking-[0.14em] text-mist/55 uppercase">{t.duration}</dt>
          <dd className="mt-1 text-3xl font-light tabular-nums" data-testid="summary-duration">
            {formatClock(summary.durationMs)}
          </dd>
        </div>
        <div className="rounded-3xl bg-white/7 p-5">
          <dt className="text-xs font-medium tracking-[0.14em] text-mist/55 uppercase">{t.breathsLabel}</dt>
          <dd className="mt-1 text-3xl font-light tabular-nums" data-testid="summary-cycles">
            {summary.completedCycles}
          </dd>
        </div>
      </dl>

      <div className="mt-10 flex w-full flex-col gap-3">
        <Button icon={<RestartIcon className="size-5" />} onClick={onRestart}>
          {t.again}
        </Button>
        <Button variant="secondary" icon={<HomeIcon className="size-5" />} onClick={onHome}>
          {t.home}
        </Button>
      </div>
    </section>
  )
}
