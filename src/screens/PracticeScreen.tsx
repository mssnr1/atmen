import { BreathingIndicator } from '../components/BreathingIndicator'
import { Button, IconButton } from '../components/Button'
import { DurationPicker } from '../components/DurationPicker'
import { CloseIcon, PauseIcon, PlayIcon, RestartIcon, SoundIcon, SoundOffIcon, VibrateIcon, VibrateOffIcon } from '../components/icons'
import type { EngineSnapshot, PhaseType } from '../engine'
import type { Exercise } from '../exercises'
import { audioSupported } from '../feedback/audio'
import { vibrationSupported } from '../feedback/haptics'
import { usePracticeSession } from '../hooks/usePracticeSession'
import { formatClock, formatSeconds } from '../lib/format'
import { navigate } from '../lib/route'
import { store, useStore } from '../storage/store'
import { CompletionView } from './CompletionView'

const PHASE_LABELS: Record<PhaseType, string> = {
  inhale: 'Breathe in',
  holdIn: 'Hold',
  exhale: 'Breathe out',
  holdOut: 'Hold',
}

function phaseLabel(s: EngineSnapshot): string {
  if (s.status === 'idle') return 'Ready'
  return s.phase.label ?? PHASE_LABELS[s.phase.type]
}

export function PracticeScreen({ exercise }: { exercise: Exercise }) {
  const prefs = useStore((d) => d.preferences)
  const durationMs = prefs.durationByExercise[exercise.id] ?? exercise.defaultDurationMs
  const session = usePracticeSession(exercise, durationMs)
  const { snapshot: s, summary } = session
  const goHome = () => {
    session.reset()
    navigate({ name: 'home' })
  }

  const active = s.status === 'running' || s.status === 'paused'
  const totalCycles = Math.ceil(s.plan.totalCycles)

  return (
    <main className="safe-area mx-auto flex min-h-dvh max-w-md flex-col px-6">
      <header className="flex items-center justify-between">
        <IconButton label="Close" onClick={goHome}>
          <CloseIcon />
        </IconButton>
        <h1 className="text-sm font-medium tracking-wide text-mist/75">{exercise.name}</h1>
        <div className="flex">
          <IconButton
            label={prefs.audioEnabled ? 'Turn audio cues off' : 'Turn audio cues on'}
            pressed={prefs.audioEnabled}
            disabled={!audioSupported()}
            onClick={() => session.setAudioEnabled(!prefs.audioEnabled)}
          >
            {prefs.audioEnabled ? <SoundIcon /> : <SoundOffIcon />}
          </IconButton>
          <IconButton
            label={prefs.vibrationEnabled ? 'Turn vibration off' : 'Turn vibration on'}
            pressed={prefs.vibrationEnabled}
            disabled={!vibrationSupported()}
            onClick={() => store.updatePreferences({ vibrationEnabled: !prefs.vibrationEnabled })}
          >
            {prefs.vibrationEnabled && vibrationSupported() ? <VibrateIcon /> : <VibrateOffIcon />}
          </IconButton>
        </div>
      </header>

      {s.status === 'completed' && summary ? (
        <CompletionView exerciseName={exercise.name} summary={summary} onRestart={session.restart} onHome={goHome} />
      ) : (
        <>
          <section className="flex flex-1 flex-col items-center justify-center py-4" aria-label="Breathing guide">
            <BreathingIndicator engine={session.engine} />

            <div className="mt-4 flex h-16 flex-col items-center" aria-live="polite">
              <p className="text-3xl font-light" data-testid="phase-label">
                {phaseLabel(s)}
              </p>
              <p className="mt-2 text-sm text-mist/55 tabular-nums" data-testid="phase-time">
                {active
                  ? `${s.status === 'paused' ? 'Paused · ' : ''}${(Math.ceil(s.phaseRemainingMs / 100) / 10).toFixed(1)} s of ${formatSeconds(s.phase.durationMs)} s`
                  : exercise.pattern.phases.map((p) => `${formatSeconds(p.durationMs)} s ${PHASE_LABELS[p.type].toLowerCase()}`).join(' · ')}
              </p>
            </div>
          </section>

          <section aria-label="Session" className="pb-2">
            <div className="mb-2 flex justify-between text-sm text-mist/60 tabular-nums">
              <span data-testid="cycle-count">
                {active ? `Cycle ${Math.min(s.cycleIndex + 1, totalCycles)} of ${totalCycles}` : `${totalCycles} cycles`}
              </span>
              <span data-testid="remaining">{formatClock(s.remainingMs)} left</span>
            </div>
            <div
              className="h-1 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label="Session progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(s.progress * 100)}
            >
              <div className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${s.progress * 100}%` }} />
            </div>

            {s.status === 'idle' && (
              <div className="mt-5 flex flex-col items-center gap-4">
                <ul className="w-full space-y-1 text-[13px] leading-snug text-mist/65">
                  {exercise.instructions.map((i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" aria-hidden />
                      {i}
                    </li>
                  ))}
                </ul>
                <DurationPicker options={exercise.durationOptionsMs} value={durationMs} onChange={(ms) => store.setDuration(exercise.id, ms)} />
                <Button className="w-full" icon={<PlayIcon className="size-5" />} onClick={session.start}>
                  Start
                </Button>
              </div>
            )}

            {active && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button variant="secondary" className="w-36" icon={<RestartIcon className="size-5" />} onClick={session.restart}>
                  Restart
                </Button>
                {s.status === 'running' ? (
                  <Button className="w-40" icon={<PauseIcon className="size-5" />} onClick={session.pause}>
                    Pause
                  </Button>
                ) : (
                  <Button className="w-40" icon={<PlayIcon className="size-5" />} onClick={session.resume}>
                    Resume
                  </Button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
