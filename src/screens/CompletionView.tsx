import { Button } from '../components/Button'
import { HomeIcon, RestartIcon } from '../components/icons'
import type { SessionSummary } from '../engine'
import { formatDuration } from '../lib/format'

interface Props {
  exerciseName: string
  summary: SessionSummary
  onRestart: () => void
  onHome: () => void
}

export function CompletionView({ exerciseName, summary, onRestart, onHome }: Props) {
  return (
    <section aria-labelledby="done-title" className="flex flex-1 flex-col items-center justify-center text-center" data-testid="completion">
      <div className="relative mb-8 size-24" aria-hidden>
        <div className="absolute -inset-6 rounded-full bg-accent/25 blur-2xl" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,#d6faf3_0%,#7ed9cb_45%,#2c8f8a_100%)]" />
      </div>
      <h2 id="done-title" className="text-3xl font-light">
        Well done
      </h2>
      <p className="mt-2 text-mist/60">You completed a session of {exerciseName}.</p>

      <dl className="mt-10 grid w-full grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          <dt className="text-xs tracking-widest text-mist/55 uppercase">Duration</dt>
          <dd className="mt-2 text-2xl font-light" data-testid="summary-duration">
            {formatDuration(summary.durationMs)}
          </dd>
        </div>
        <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          <dt className="text-xs tracking-widest text-mist/55 uppercase">Breath cycles</dt>
          <dd className="mt-2 text-2xl font-light" data-testid="summary-cycles">
            {summary.completedCycles}
          </dd>
        </div>
      </dl>

      <div className="mt-10 flex w-full flex-col gap-3">
        <Button icon={<RestartIcon className="size-5" />} onClick={onRestart}>
          Practice again
        </Button>
        <Button variant="secondary" icon={<HomeIcon className="size-5" />} onClick={onHome}>
          Back to home
        </Button>
      </div>
    </section>
  )
}
