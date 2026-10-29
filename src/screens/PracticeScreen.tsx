import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { CrossfadeText } from '../components/CrossfadeText'
import { IconButton } from '../components/Button'
import { CircleIcon, CloseIcon, InfoIcon, LungsIcon, PauseIcon, PlayIcon, RestartIcon, SlidersIcon, SoundIcon, SoundOffIcon } from '../components/icons'
import { Segmented } from '../components/Segmented'
import { Squircle } from '../components/Squircle'
import { Switch } from '../components/Switch'
import type { BreathPhase, EngineSnapshot } from '../engine'
import type { Exercise } from '../exercises'
import { audioCues, audioSupported } from '../feedback/audio'
import { vibrationSupported } from '../feedback/haptics'
import { usePracticeSession } from '../hooks/usePracticeSession'
import { useI18n, type Messages } from '../i18n'
import { paceText, presetIndex, rhythmText } from '../lib/exerciseText'
import { formatClock } from '../lib/format'
import { navigate } from '../lib/route'
import { store, useStore } from '../storage/store'
import { visualizationModes } from '../visualization/modes'
import { Visualization } from '../visualization/Visualization'
import { CompletionFlow } from './CompletionFlow'

/** The phase the guide shows: a quiet rest keeps showing the phase before it. */
function shownPhase(s: EngineSnapshot): BreathPhase {
  if (!s.phase.quiet || s.phaseIndex === 0) return s.phase
  const before = s.plan.segments.find((g) => g.cycleIndex === s.cycleIndex && g.phaseIndex === s.phaseIndex - 1)
  return before?.phase ?? s.phase
}

/** The camera turn (see Anatomy3DVisualization) plus a moment of stillness before the first breath. */
const LEAD_IN_MS = 4200
/** When the exercise ends the figure turns back to face the user before the completion screen. */
const OUTRO_MS = 3800

function phaseLabel(s: EngineSnapshot, t: Messages): string {
  if (s.status === 'idle') return t.ready
  const phase = shownPhase(s)
  return phase.label ?? t.phase[phase.type]
}

export function PracticeScreen({ exercise }: { exercise: Exercise }) {
  const { lang, t } = useI18n()
  const text = exercise.text[lang]
  const prefs = useStore((d) => d.preferences)
  const durationMs = prefs.durationByExercise[exercise.id] ?? exercise.defaultDurationMs
  const pacePref = prefs.paceByExercise[exercise.id]
  const preset = presetIndex(exercise, pacePref?.preset)
  const slowDown = pacePref?.slowDown ?? false
  const scale = exercise.paces.options[preset].scale
  const pace = useMemo(() => ({ scale, slowDown }), [scale, slowDown])
  const session = usePracticeSession(exercise, durationMs, pace)
  const { snapshot: s, summary } = session
  const [sheetOpen, setSheetOpen] = useState(false)
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const [infoOpen, setInfoOpen] = useState(false)
  const closeInfo = useCallback(() => setInfoOpen(false), [])
  // The controls float over the visualization; it needs their height to keep its content clear of them.
  const [panelHeight, setPanelHeight] = useState(0)
  const panel = useCallback((el: HTMLElement | null) => {
    if (!el) return
    const ro = new ResizeObserver(() => setPanelHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // In the anatomical view the figure first turns to its 3/4 view, then breathing begins.
  const [leadIn, setLeadIn] = useState(false)
  const leadInTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(leadInTimer.current), [])
  const start = () => {
    if (prefs.visualizationMode !== 'anatomical') return session.start()
    // Unlock audio inside the tap; the session itself starts after the turn.
    void audioCues.unlock()
    setLeadIn(true)
    leadInTimer.current = window.setTimeout(() => {
      setLeadIn(false)
      session.start()
    }, LEAD_IN_MS)
  }

  const [outroDone, setOutroDone] = useState(false)
  const completed = s.status === 'completed'
  useEffect(() => {
    setOutroDone(false)
    if (!completed) return
    const id = window.setTimeout(() => setOutroDone(true), OUTRO_MS)
    return () => window.clearTimeout(id)
  }, [completed])

  const goHome = () => {
    window.clearTimeout(leadInTimer.current)
    session.reset()
    navigate({ name: 'home' })
  }

  if (s.status === 'completed' && summary && (outroDone || prefs.visualizationMode !== 'anatomical')) {
    return <CompletionFlow exercise={exercise} summary={summary} sessionId={session.sessionId} scale={scale} />
  }

  const active = s.status === 'running' || s.status === 'paused'
  const totalCycles = Math.ceil(s.plan.totalCycles)
  const setPace = (patch: { preset?: number; slowDown?: boolean }) => store.setPace(exercise.id, { preset, slowDown, ...patch })

  return (
    <main className="safe-top relative mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-white" data-testid="practice">
      <header className="relative z-10 flex items-center justify-between px-3">
        <IconButton label={t.close} onClick={goHome} data-testid="practice-close">
          <CloseIcon className="size-5" strokeWidth={1.5} />
        </IconButton>
        <div className="flex items-center">
          <IconButton label={t.aboutExercise} onClick={() => setInfoOpen(true)} data-testid="exercise-info">
            <InfoIcon className="size-5" strokeWidth={1.5} />
          </IconButton>
          <IconButton
            label={prefs.audioEnabled ? t.soundOff : t.soundOn}
            pressed={prefs.audioEnabled}
            disabled={!audioSupported()}
            onClick={() => session.setAudioEnabled(!prefs.audioEnabled)}
          >
            {prefs.audioEnabled ? <SoundIcon className="size-5" strokeWidth={1.5} /> : <SoundOffIcon className="size-5" strokeWidth={1.5} />}
          </IconButton>
        </div>
      </header>

      <section className="relative min-h-0 flex-1" aria-label={t.guide}>
        <Visualization
          mode={prefs.visualizationMode}
          engine={session.engine}
          showProgress={prefs.showProgress}
          bottomInset={panelHeight}
          started={leadIn || (s.status !== 'idle' && s.status !== 'completed')}
        />
        <div className="absolute top-2 right-4">
          <Segmented
            label={t.visualization}
            className="!rounded-full !bg-white/80 shadow-[0_1px_6px_rgb(0_0_0/0.06)] backdrop-blur [&>button]:!flex [&>button]:!size-10 [&>button]:!min-h-0 [&>button]:!flex-none [&>button]:!items-center [&>button]:!justify-center [&>button]:!rounded-full [&>button]:!p-0"
            options={visualizationModes.map((m) => ({
              value: m.id,
              label: t.modes[m.id].label,
              title: t.modes[m.id].description,
              icon: m.id === 'anatomical' ? <LungsIcon className="size-5" strokeWidth={1.5} /> : <CircleIcon className="size-5" strokeWidth={1.5} />,
            }))}
            value={prefs.visualizationMode}
            onChange={(visualizationMode) => store.updatePreferences({ visualizationMode })}
          />
        </div>
      </section>

      <section ref={panel} className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3">
        <Squircle radius={16} smoothing={0.6} className="pointer-events-auto bg-white/35 px-4 pt-3.5 pb-3 backdrop-blur-[12px]">
        <div className="flex items-baseline justify-center gap-2 text-center" aria-live="polite">
          <p className="text-[1.25rem] leading-tight" data-testid="phase-label">
            <CrossfadeText text={phaseLabel(s, t)} />
          </p>
          {s.status !== 'running' && (
            <p className="text-[1rem] text-muted tabular-nums" data-testid="phase-time">
              {s.status === 'paused' ? t.paused : `${t.minutes(Math.round(s.plan.totalDurationMs / 60_000))} · ${t.breaths(totalCycles)}`}
            </p>
          )}
        </div>

        {prefs.showProgress && (
          <div className="mt-4" data-testid="session-progress">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.progress * 100)}>
              <div className="h-full rounded-full bg-blue transition-[width] duration-300" style={{ width: `${s.progress * 100}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[0.8125rem] text-muted tabular-nums">
              <span data-testid="cycle-count">{t.roundOf(Math.min(s.cycleIndex + 1, totalCycles), totalCycles)}</span>
              <span data-testid="remaining">{t.timeLeft(formatClock(s.remainingMs))}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-3 pt-3">
          <IconButton
            label={t.restart}
            disabled={!active}
            onClick={session.restart}
            className="size-12 border border-line"
            data-testid="restart"
          >
            <RestartIcon className="size-5" strokeWidth={1.5} />
          </IconButton>
          {s.status === 'running' ? (
            <IconButton label={t.pause} onClick={session.pause} className="size-16 bg-surface hover:bg-surface-2" data-testid="pause">
              <PauseIcon className="size-6" />
            </IconButton>
          ) : s.status === 'paused' ? (
            <IconButton label={t.resume} onClick={session.resume} className="size-16 bg-blue text-white hover:bg-blue-deep" data-testid="resume">
              <PlayIcon className="ml-1 size-6" />
            </IconButton>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={leadIn}
              className="h-14 rounded-full bg-blue px-10 disabled:opacity-50 text-[1.0625rem] text-white transition hover:bg-blue-deep active:scale-95"
              data-testid="start"
            >
              {t.start}
            </button>
          )}
          <IconButton label={t.openSettings} onClick={() => setSheetOpen(true)} className="size-12 border border-line" data-testid="open-settings">
            <SlidersIcon className="size-5" strokeWidth={1.5} />
          </IconButton>
        </div>
        </Squircle>
      </section>

      <BottomSheet open={infoOpen} title={text.name} closeLabel={t.close} onClose={closeInfo}>
        <p className="pt-1 text-[0.9375rem] text-muted" data-testid="rhythm">
          {rhythmText(exercise, scale, lang, t)} · {t.minutes(Math.round(s.plan.totalDurationMs / 60_000))} · {t.breaths(totalCycles)}
        </p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed">{text.summary}</p>
        <p className="mt-3 pb-2 text-[0.9375rem] leading-relaxed text-muted">{text.howItWorks}</p>
      </BottomSheet>

      <BottomSheet open={sheetOpen} title={t.settings} closeLabel={t.close} onClose={closeSheet}>
        <h3 className="flex items-center gap-1.5 pt-3 text-[0.9375rem]">{t.breathingPace}</h3>
        <p className="text-[0.8125rem] text-muted">{t.breathingPaceHint}</p>
        <div role="radiogroup" aria-label={t.breathingPace} className="mt-3 grid grid-cols-3 gap-2.5">
          {exercise.paces.options.map((o, i) => {
            const on = i === preset
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={on}
                data-testid={`pace-${i}`}
                onClick={() => setPace({ preset: i })}
                className={`rounded-[18px] px-2 py-3.5 text-center transition ${on ? 'bg-blue text-white' : 'bg-surface text-ink hover:bg-surface-2'}`}
              >
                <span className="block text-[1.0625rem] tabular-nums">{paceText(exercise, o.scale, lang)}</span>
                <span className={`mt-0.5 block text-[0.8125rem] ${on ? 'text-white/80' : 'text-muted'}`}>{o.label[lang]}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 divide-y divide-line border-t border-line">
          <Switch label={t.slowDown} hint={t.slowDownHint} info checked={slowDown} onChange={(v) => setPace({ slowDown: v })} testId="toggle-slowdown" />
          <Switch
            label={t.showProgress}
            hint={t.showProgressHint}
            info
            checked={prefs.showProgress}
            onChange={(showProgress) => store.updatePreferences({ showProgress })}
            testId="toggle-progress"
          />
        </div>

        <h3 className="mt-5 mb-2 text-[0.9375rem]">{t.duration}</h3>
        <Segmented
          label={t.duration}
          disabled={active}
          options={exercise.durationOptionsMs.map((ms) => ({ value: ms, label: t.minutes(ms / 60_000) }))}
          value={durationMs}
          onChange={(ms) => store.setDuration(exercise.id, ms)}
        />

        <h3 className="mt-5 mb-2 text-[0.9375rem]">{t.visualization}</h3>
        <Segmented
          label={t.visualization}
          options={visualizationModes.map((m) => ({ value: m.id, label: t.modes[m.id].label, title: t.modes[m.id].description }))}
          value={prefs.visualizationMode}
          onChange={(visualizationMode) => store.updatePreferences({ visualizationMode })}
        />

        <div className="mt-3 divide-y divide-line">
          <Switch label={t.sound} checked={prefs.audioEnabled} disabled={!audioSupported()} onChange={(v) => session.setAudioEnabled(v)} />
          <Switch
            label={t.vibration}
            checked={prefs.vibrationEnabled}
            disabled={!vibrationSupported()}
            onChange={(vibrationEnabled) => store.updatePreferences({ vibrationEnabled })}
          />
        </div>
      </BottomSheet>
    </main>
  )
}
