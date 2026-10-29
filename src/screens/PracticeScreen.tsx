import { useEffect, useMemo } from 'react'
import { BreathBars } from '../components/BreathBars'
import { Button, IconButton } from '../components/Button'
import { CloseIcon, PauseIcon, PlayIcon, RestartIcon, SoundIcon, SoundOffIcon, VibrateIcon, VibrateOffIcon } from '../components/icons'
import { Segmented } from '../components/Segmented'
import { Switch } from '../components/Switch'
import { TempoSlider } from '../components/TempoSlider'
import type { EngineSnapshot } from '../engine'
import type { Exercise } from '../exercises'
import { audioSupported } from '../feedback/audio'
import { vibrationSupported } from '../feedback/haptics'
import { usePracticeSession } from '../hooks/usePracticeSession'
import { useI18n, type Messages } from '../i18n'
import { formatClock, formatCountdown, formatSeconds } from '../lib/format'
import { navigate, takeAutostart } from '../lib/route'
import { store, useStore } from '../storage/store'
import { visualizationModes } from '../visualization/modes'
import { Visualization } from '../visualization/Visualization'
import { CompletionView } from './CompletionView'

function phaseLabel(s: EngineSnapshot, t: Messages): string {
  if (s.status === 'idle') return t.ready
  return s.phase.label ?? t.phase[s.phase.type]
}

export function PracticeScreen({ exercise }: { exercise: Exercise }) {
  const { lang, t } = useI18n()
  const text = exercise.text[lang]
  const prefs = useStore((d) => d.preferences)
  const durationMs = prefs.durationByExercise[exercise.id] ?? exercise.defaultDurationMs
  const pacePref = prefs.paceByExercise[exercise.id] ?? { level: exercise.tempo.defaultLevel, slowDown: false }
  const level = Math.min(Math.max(pacePref.level, 0), exercise.tempo.scales.length - 1)
  const pace = useMemo(
    () => ({ scale: exercise.tempo.scales[level], slowDown: pacePref.slowDown }),
    [exercise, level, pacePref.slowDown],
  )
  const session = usePracticeSession(exercise, durationMs, pace)
  const { snapshot: s, summary } = session

  // Coming from the home screen's Start button: begin right away.
  useEffect(() => {
    if (takeAutostart(exercise.id)) session.start()
    // Only on the first render of this exercise.
  }, [exercise.id])

  const goHome = () => {
    session.reset()
    navigate({ name: 'home' })
  }

  const active = s.status === 'running' || s.status === 'paused'
  const totalCycles = Math.ceil(s.plan.totalCycles)
  const phaseMs = exercise.pattern.phases[0].durationMs * exercise.tempo.scales[level]
  const setPace = (patch: Partial<typeof pacePref>) => store.setPace(exercise.id, { level, slowDown: pacePref.slowDown, ...patch })

  return (
    <main className="safe-area mx-auto flex h-dvh max-w-md flex-col px-5">
      <header className="flex items-center justify-between gap-2">
        <IconButton label={t.close} onClick={goHome}>
          <CloseIcon />
        </IconButton>
        {s.status !== 'completed' && (
          <Segmented
            size="sm"
            label={t.visualization}
            options={visualizationModes.map((m) => ({ value: m.id, label: t.modes[m.id].label, title: t.modes[m.id].description }))}
            value={prefs.visualizationMode}
            onChange={(mode) => store.updatePreferences({ visualizationMode: mode })}
          />
        )}
        <div className="flex">
          <IconButton
            label={prefs.audioEnabled ? t.audioOff : t.audioOn}
            pressed={prefs.audioEnabled}
            disabled={!audioSupported()}
            onClick={() => session.setAudioEnabled(!prefs.audioEnabled)}
          >
            {prefs.audioEnabled ? <SoundIcon /> : <SoundOffIcon />}
          </IconButton>
          <IconButton
            label={prefs.vibrationEnabled ? t.vibrationOff : t.vibrationOn}
            pressed={prefs.vibrationEnabled}
            disabled={!vibrationSupported()}
            onClick={() => store.updatePreferences({ vibrationEnabled: !prefs.vibrationEnabled })}
          >
            {prefs.vibrationEnabled && vibrationSupported() ? <VibrateIcon /> : <VibrateOffIcon />}
          </IconButton>
        </div>
      </header>

      {s.status === 'completed' && summary ? (
        <CompletionView exerciseName={text.name} summary={summary} onRestart={session.restart} onHome={goHome} />
      ) : (
        <>
          <section className="flex min-h-0 flex-1 flex-col" aria-label={t.guide}>
            <div className="relative min-h-0 flex-1">
              <Visualization mode={prefs.visualizationMode} engine={session.engine} />
            </div>
            <div className="flex flex-col items-center pt-1 pb-3" aria-live="polite">
              <p
                className={`text-3xl leading-tight font-medium ${active && s.phase.type === 'exhale' ? 'text-exhale' : active && s.phase.type === 'inhale' ? 'text-accent' : ''}`}
                data-testid="phase-label"
              >
                {phaseLabel(s, t)}
              </p>
              <p className="mt-0.5 text-base text-mist/55 tabular-nums" data-testid="phase-time">
                {active
                  ? `${s.status === 'paused' ? `${t.paused} · ` : ''}${formatCountdown(s.phaseRemainingMs, lang)} s`
                  : t.breaths(totalCycles)}
              </p>
            </div>
          </section>

          <section aria-label={t.progress}>
            <div className="mb-1.5 flex justify-between text-sm text-mist/60 tabular-nums">
              <span data-testid="cycle-count">
                {active ? t.breathOf(Math.min(s.cycleIndex + 1, totalCycles), totalCycles) : t.breaths(totalCycles)}
              </span>
              <span data-testid="remaining">{t.timeLeft(formatClock(s.remainingMs))}</span>
            </div>
            <BreathBars
              label={t.progress}
              phases={exercise.pattern.phases}
              total={totalCycles}
              completed={s.completedCycles}
              current={active ? s.cycleProgress : null}
            />
          </section>

          <section className="mt-3" aria-label={t.tempo}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-mist/60">
                {t.tempo} ·{' '}
                <span className="text-mist" data-testid="tempo-value">
                  {text.tempoLabels[level]} {formatSeconds(phaseMs, lang)} s
                </span>
              </span>
              <Switch
                label={t.slowDown}
                hint={t.slowDownHint}
                checked={pacePref.slowDown}
                onChange={(slowDown) => setPace({ slowDown })}
              />
            </div>
            <TempoSlider
              label={t.tempo}
              levels={exercise.tempo.scales.length}
              value={level}
              valueText={`${text.tempoLabels[level]}, ${formatSeconds(phaseMs, lang)} s`}
              onChange={(next) => setPace({ level: next })}
            />
          </section>

          <section className="mt-2">
            {s.status === 'idle' && (
              <div className="flex flex-col gap-3">
                <Segmented
                  label={t.duration}
                  options={exercise.durationOptionsMs.map((ms) => ({ value: ms, label: t.minutes(ms / 60_000) }))}
                  value={durationMs}
                  onChange={(ms) => store.setDuration(exercise.id, ms)}
                />
                <Button className="w-full" icon={<PlayIcon className="size-5" />} onClick={session.start}>
                  {t.start}
                </Button>
              </div>
            )}

            {active && (
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" icon={<RestartIcon className="size-5" />} onClick={session.restart}>
                  {t.restart}
                </Button>
                {s.status === 'running' ? (
                  <Button className="flex-[1.4]" icon={<PauseIcon className="size-5" />} onClick={session.pause}>
                    {t.pause}
                  </Button>
                ) : (
                  <Button className="flex-[1.4]" icon={<PlayIcon className="size-5" />} onClick={session.resume}>
                    {t.resume}
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
