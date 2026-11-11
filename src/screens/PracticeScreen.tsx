import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button, IconButton } from '../components/Button'
import { FullscreenButton } from '../components/FullscreenButton'
import { CloseIcon, InfoIcon, PauseIcon, PlayIcon, RestartIcon, SlidersIcon, SoundIcon, SoundOffIcon } from '../components/icons'
import { MoodScale } from '../components/MoodScale'
import { Segmented } from '../components/Segmented'
import { Switch } from '../components/Switch'
import type { BreathPhase, EngineSnapshot } from '../engine'
import { exercises, getExercise, type Exercise } from '../exercises'
import { audioCues, audioSupported } from '../feedback/audio'
import { vibrationSupported } from '../feedback/haptics'
import { BodyInsights } from '../guide/BodyInsights'
import { BreathCue } from '../guide/BreathCue'
import { CUE_LEAVES_AT } from '../guide/cues'
import { InsightNote } from '../guide/InsightNote'
import { bodyInsights } from '../guide/insights'
import { useIsPhone } from '../hooks/useMediaQuery'
import { usePracticeSession } from '../hooks/usePracticeSession'
import { useI18n, type Messages } from '../i18n'
import { paceText, presetIndex, rhythmText } from '../lib/exerciseText'
import { formatClock, formatDuration } from '../lib/format'
import { clearPendingStart, hasPendingStart, navigate, startPractice } from '../lib/route'
import { suggest } from '../lib/suggest'
import { themePreferences } from '../lib/themePreferences'
import { settleSource } from '../stage/ambient'
import { stageSource, useStage } from '../stage/stage'
import { store, useStore } from '../storage/store'
import type { Mood } from '../storage/types'
import { breathState, type BreathSource } from '../visualization/breathState'
import { visualizationModes } from '../visualization/modes'

/** The phase the guide shows: a quiet rest keeps showing the phase before it. */
function shownPhase(s: EngineSnapshot): BreathPhase {
  if (!s.phase.quiet || s.phaseIndex === 0) return s.phase
  const before = s.plan.segments.find((g) => g.cycleIndex === s.cycleIndex && g.phaseIndex === s.phaseIndex - 1)
  return before?.phase ?? s.phase
}

/** The camera's way to the lungs, while the last air flows out: then the first breath begins from empty lungs. */
const LEAD_IN_MS = 4200
/** How long the controls stay after a tap before they step back again. */
const AWAKE_MS = 4000
/** Breaths the phase word stays for; after that the lungs show what comes next, and a tap brings the word back. */
const WORD_BREATHS = 3
/** Space kept clear under the figure while breathing, the same with and without controls, so the figure never moves. */
const RUN_INSET = 148

function phaseLabel(s: EngineSnapshot, t: Messages): string {
  if (s.status === 'idle') return t.ready
  const phase = shownPhase(s)
  return phase.label ?? t.phase[phase.type]
}

/** Height of an element, kept up to date, with the ref callback that measures it. */
function useHeight(): [number, (el: HTMLElement | null) => (() => void) | undefined] {
  const [height, setHeight] = useState(0)
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [height, ref]
}

export function PracticeScreen({ exercise }: { exercise: Exercise }) {
  const { lang, t } = useI18n()
  const text = exercise.text[lang]
  const prefs = useStore((d) => d.preferences)
  const sessions = useStore((d) => d.sessions)
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
  const [panelHeight, panel] = useHeight()
  const [headerHeight, header] = useHeight()
  const isPhone = useIsPhone()

  const running = s.status === 'running'
  const active = running || s.status === 'paused'
  const completed = s.status === 'completed'

  // Before the first breath the camera moves in and the lungs empty, from wherever the figure stood
  // (it was breathing on the start screen): `leadIn` is that last exhale.
  const [leadIn, setLeadIn] = useState<BreathSource | null>(null)
  const leadInTimer = useRef<number | undefined>(undefined)
  const { start: startSession } = session
  const start = useCallback(
    (level: number) => {
      // Unlock audio inside the tap; the session itself starts after the lead-in.
      void audioCues.unlock()
      window.clearTimeout(leadInTimer.current)
      setLeadIn(settleSource(level, LEAD_IN_MS))
      leadInTimer.current = window.setTimeout(() => {
        clearPendingStart()
        setLeadIn(null)
        startSession()
      }, LEAD_IN_MS)
    },
    [startSession],
  )
  // Where the lungs stood when this screen opened, read before the stage hands over to this exercise.
  const [entryLevel] = useState(() => breathState(stageSource.sample()).volume)
  // One tap on the start screen leads straight here and into the first breath.
  useEffect(() => {
    if (hasPendingStart(exercise.id)) start(entryLevel)
    return () => window.clearTimeout(leadInTimer.current)
  }, [exercise.id, entryLevel, start])

  // The same question before and after: how do you feel right now? Asked without holding anything up.
  const [before, setBefore] = useState<Mood>()
  const [after, setAfter] = useState<Mood>()
  const [askDismissed, setAskDismissed] = useState(false)
  const asking = (!!leadIn || (running && s.cycleIndex < 1)) && before === undefined && !askDismissed
  const { sessionId } = session
  useEffect(() => {
    if (sessionId && before !== undefined) store.setFeedback(sessionId, { before })
  }, [sessionId, before])
  const answerAfter = (mood: Mood) => {
    setAfter(mood)
    if (sessionId) store.setFeedback(sessionId, { after: mood })
  }

  // Stage free: once the first breath is done the controls step back, and a tap brings them back for a moment.
  const [awake, setAwake] = useState(true)
  const [hint, setHint] = useState(false)
  const hideTimer = useRef<number | undefined>(undefined)
  const hintShown = useRef(false)
  const stepBack = useCallback(() => {
    setAwake(false)
    // The first times, say how to get the controls back.
    if (!hintShown.current && store.get().sessions.length < 3) {
      hintShown.current = true
      setHint(true)
      window.setTimeout(() => setHint(false), 3600)
    }
  }, [])
  const firstBreathMs = s.plan.cycleStartsMs[1] ?? s.plan.totalDurationMs
  useEffect(() => {
    window.clearTimeout(hideTimer.current)
    setAwake(true)
    if (!running) return
    const wait = Math.max(AWAKE_MS, firstBreathMs - session.engine.sample().elapsedMs)
    hideTimer.current = window.setTimeout(stepBack, wait)
    const wake = (e: Event) => {
      setAwake(true)
      // A tap beside the question means "not now": it makes way for the controls.
      if (!(e.target instanceof Element && e.target.closest('[data-ask]'))) setAskDismissed(true)
      window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(stepBack, AWAKE_MS)
    }
    window.addEventListener('pointerdown', wake, true)
    window.addEventListener('keydown', wake, true)
    return () => {
      window.clearTimeout(hideTimer.current)
      window.removeEventListener('pointerdown', wake, true)
      window.removeEventListener('keydown', wake, true)
    }
    // Only a start, a pause or a resume re-arm this; the first breath's length is read once then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, stepBack, session.engine])
  const chrome = !running || awake || sheetOpen || infoOpen
  const controls = chrome && !asking && !leadIn
  const wordShown = !running || s.cycleIndex < WORD_BREATHS || chrome

  useStage({
    source: leadIn ?? session.engine,
    framing: completed ? 'done' : leadIn || s.status !== 'idle' ? 'run' : 'idle',
    bottomInset: active || leadIn ? RUN_INSET : panelHeight,
    topInset: headerHeight,
    interactive: true,
  })

  const goHome = () => {
    window.clearTimeout(leadInTimer.current)
    clearPendingStart()
    session.reset()
    navigate({ name: 'home' })
  }

  const totalCycles = Math.ceil(s.plan.totalCycles)
  // Which lines the cues begin with changes from session to session.
  const [cueTurn] = useState(() => store.get().sessions.length)
  const setPace = (patch: { preset?: number; slowDown?: boolean }) => store.setPace(exercise.id, { preset, slowDown, ...patch })
  const planLine = `${t.minutes(Math.round(s.plan.totalDurationMs / 60_000))} · ${t.breaths(totalCycles)}`
  // What to offer next: what tends to fit now, by time of day and the user's own answers, not a fixed order.
  const next = useMemo(() => {
    if (!completed) return null
    const pick = suggest(
      sessions,
      new Date(),
      exercises.map((e) => e.id),
      exercise.id,
    )
    const e = getExercise(pick.exerciseId)
    return e ? { exercise: e, reason: pick.reason } : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, exercise.id])

  return (
    <main className="pointer-events-none relative z-10 h-dvh w-full overflow-hidden" data-testid="practice">
      <header ref={header} className={`chrome safe-top absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pb-1 md:px-5 ${chrome ? '' : 'chrome-off'}`}>
        <div className="veil-top pointer-events-none absolute inset-x-0 top-0 -bottom-6 -z-10" aria-hidden />
        <IconButton label={t.close} onClick={goHome} className="pointer-events-auto" data-testid="practice-close">
          <CloseIcon className="size-5" strokeWidth={1.5} />
        </IconButton>
        <div className="pointer-events-auto flex items-center">
          <IconButton
            label={prefs.audioEnabled ? t.soundOff : t.soundOn}
            pressed={prefs.audioEnabled}
            disabled={!audioSupported()}
            onClick={() => session.setAudioEnabled(!prefs.audioEnabled)}
          >
            {prefs.audioEnabled ? <SoundIcon className="size-5" strokeWidth={1.5} /> : <SoundOffIcon className="size-5" strokeWidth={1.5} />}
          </IconButton>
          <IconButton label={t.aboutExercise} onClick={() => setInfoOpen(true)} data-testid="exercise-info">
            <InfoIcon className="size-5" strokeWidth={1.5} />
          </IconButton>
        </div>
      </header>

      {/* Body notes: beside the figure on wide screens; on the phone one at a time, for a moment. */}
      {!isPhone && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ top: headerHeight }}>
          <BodyInsights cycleIndex={s.cycleIndex} visible={active} />
        </div>
      )}
      {isPhone && <InsightNote cycleIndex={s.cycleIndex} active={active} bottom={panelHeight + 6} />}
      {/* Over the figure's head: something to sense, later a thought, on the breaths the notes leave free. */}
      {prefs.breathCues && <BreathCue cycleIndex={s.cycleIndex} totalCycles={totalCycles} active={active && s.cycleProgress < CUE_LEAVES_AT} top={headerHeight} turn={cueTurn} />}

      <section ref={panel} className="safe-bottom safe-x absolute inset-x-0 bottom-0 z-10 md:pb-6" aria-label={t.guide}>
        <div className={`veil-bottom chrome pointer-events-none absolute inset-x-0 -top-10 bottom-0 ${chrome || completed ? '' : 'chrome-off'}`} aria-hidden />
        {completed ? (
          <Completion
            t={t}
            line={summary ? `${formatDuration(summary.durationMs)} · ${t.breaths(summary.completedCycles)}` : ''}
            before={before}
            after={after}
            onAfter={answerAfter}
            onDone={goHome}
            next={
              next && {
                label: t.continueWith(next.exercise.text[lang].short, Math.round((prefs.durationByExercise[next.exercise.id] ?? next.exercise.defaultDurationMs) / 60_000)),
                reason: next.reason === 'experience' ? t.suggestByExperience : t.suggestByTime,
                start: () => startPractice(next.exercise.id),
              }
            }
          />
        ) : (
          <div className="relative mx-auto w-full max-w-md px-3 pt-2 pb-3">
            {/* The phase is always announced, also once the word itself has stepped back. */}
            <p className="sr-only" aria-live="polite">
              {leadIn ? t.leadIn : phaseLabel(s, t)}
            </p>
            <div className={`chrome flex flex-col items-center justify-end text-center ${running || leadIn ? '' : 'min-h-[4.5rem]'} ${wordShown ? '' : 'chrome-off'}`}>
              <p className="phase-word text-[1.75rem] leading-tight text-ink md:text-[2rem]" data-testid="phase-label">
                {leadIn ? t.phase.exhale : phaseLabel(s, t)}
              </p>
              {!running && !leadIn && (
                <p className="mt-1 text-body text-ink-2 tabular-nums" data-testid="phase-time">
                  {s.status === 'paused' ? t.paused : `${text.name} · ${planLine}`}
                </p>
              )}
            </div>

            {/* One place under the phase word: the question before, a hint, or the controls. */}
            <div className="relative mt-4 h-[6.75rem]">
              <div data-ask className={`chrome absolute inset-0 flex flex-col justify-end ${asking ? 'pointer-events-auto' : 'chrome-off'}`}>
                <p className="mb-3 text-center text-body text-ink-2">{t.moodTitle}</p>
                <MoodScale label={t.moodTitle} value={before} onChange={setBefore} testId="mood-before" />
              </div>
              <p className={`chrome absolute inset-x-0 bottom-3 text-center text-note text-ink-2 ${hint && !chrome ? '' : 'chrome-off'}`}>{t.tapForControls}</p>
              <div className={`chrome absolute inset-0 flex flex-col justify-end ${controls ? 'pointer-events-auto' : 'chrome-off'}`}>
                {prefs.showProgress && active && (
                  <div className="mb-3 px-1" data-testid="session-progress">
                    <div className="h-px bg-line" role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.progress * 100)}>
                      <div className="h-px bg-ink transition-[width] duration-300" style={{ width: `${s.progress * 100}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-note text-ink-2 tabular-nums">
                      <span data-testid="cycle-count">{t.roundOf(Math.min(s.cycleIndex + 1, totalCycles), totalCycles)}</span>
                      <span data-testid="remaining">{t.timeLeft(formatClock(s.remainingMs))}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between px-2">
                  <IconButton
                    // For now this button skips to the end of the exercise (a development shortcut, Jan's wish).
                    label={t.restart}
                    disabled={!active}
                    onClick={session.skipToEnd}
                    className="size-12 text-ink-2"
                    data-testid="restart"
                  >
                    <RestartIcon className="size-5" strokeWidth={1.5} />
                  </IconButton>
                  {running ? (
                    <IconButton label={t.pause} onClick={session.pause} className="size-16 bg-solid text-on-solid hover:bg-solid/90" data-testid="pause">
                      <PauseIcon className="size-6" />
                    </IconButton>
                  ) : s.status === 'paused' ? (
                    <IconButton label={t.resume} onClick={session.resume} className="size-16 bg-solid text-on-solid hover:bg-solid/90" data-testid="resume">
                      <PlayIcon className="ml-1 size-6" />
                    </IconButton>
                  ) : (
                    <Button onClick={() => start(breathState(stageSource.sample()).volume)} className="px-10" data-testid="start">
                      {t.start}
                    </Button>
                  )}
                  <IconButton label={t.openSettings} onClick={() => setSheetOpen(true)} className="size-12 text-ink-2" data-testid="open-settings">
                    <SlidersIcon className="size-5" strokeWidth={1.5} />
                  </IconButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <BottomSheet open={infoOpen} title={text.name} closeLabel={t.close} onClose={closeInfo} testId="info-sheet">
        <p className="pt-1 text-body text-ink-2" data-testid="rhythm">
          {rhythmText(exercise, scale, lang, t)} · {planLine}
        </p>
        <p className="mt-3 text-body leading-relaxed">{text.summary}</p>
        <p className="mt-3 text-body leading-relaxed text-ink-2">{text.howItWorks}</p>
        <h3 className="eyebrow mt-6">{t.bodyInsights}</h3>
        <ul className="mt-2 divide-y divide-line pb-2">
          {bodyInsights[lang].map((it) => (
            <li key={it.id} className="py-3">
              <p className="text-body font-medium">
                {it.place} <span className="font-normal text-ink-2">· {it.impact}</span>
              </p>
              <p className="mt-0.5 text-note leading-snug text-ink-2">{it.title}</p>
            </li>
          ))}
        </ul>
      </BottomSheet>

      <BottomSheet open={sheetOpen} title={t.settings} closeLabel={t.close} onClose={closeSheet}>
        <h3 className="pt-3 text-body font-medium">{t.breathingPace}</h3>
        <p className="text-note text-ink-2">{t.breathingPaceHint}</p>
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
                className={`rounded-[18px] px-2 py-3.5 text-center transition ${on ? 'bg-solid text-on-solid' : 'bg-surface-2/70 text-ink ring-1 ring-line/70 hover:bg-surface-2'}`}
              >
                <span className="block text-body tabular-nums">{paceText(exercise, o.scale, lang)}</span>
                <span className={`mt-0.5 block text-note ${on ? 'opacity-70' : 'text-ink-2'}`}>{o.label[lang]}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 divide-y divide-line border-t border-line">
          <Switch label={t.slowDown} hint={t.slowDownHint} checked={slowDown} onChange={(v) => setPace({ slowDown: v })} testId="toggle-slowdown" />
          <Switch
            label={t.showProgress}
            hint={t.showProgressHint}
            checked={prefs.showProgress}
            onChange={(showProgress) => store.updatePreferences({ showProgress })}
            testId="toggle-progress"
          />
          <Switch
            label={t.breathCues}
            hint={t.breathCuesHint}
            checked={prefs.breathCues}
            onChange={(breathCues) => store.updatePreferences({ breathCues })}
            testId="toggle-cues"
          />
        </div>

        <h3 className="mt-5 mb-2 text-body font-medium">{t.duration}</h3>
        <Segmented
          label={t.duration}
          disabled={active}
          options={exercise.durationOptionsMs.map((ms) => ({ value: ms, label: t.minutes(ms / 60_000) }))}
          value={durationMs}
          onChange={(ms) => store.setDuration(exercise.id, ms)}
        />

        <h3 className="mt-5 mb-2 text-body font-medium">{t.visualization}</h3>
        <Segmented
          label={t.visualization}
          options={visualizationModes.map((m) => ({ value: m.id, label: t.modes[m.id].label, title: t.modes[m.id].description }))}
          value={prefs.visualizationMode}
          onChange={(visualizationMode) => store.updatePreferences({ visualizationMode })}
        />

        <h3 className="mt-5 mb-2 text-body font-medium">{t.appearance}</h3>
        <Segmented
          label={t.appearance}
          options={themePreferences.map((id) => ({ value: id, label: t.themes[id] }))}
          value={prefs.theme}
          onChange={(theme) => store.updatePreferences({ theme })}
        />

        <div className="mt-3 divide-y divide-line">
          <Switch label={t.sound} checked={prefs.audioEnabled} disabled={!audioSupported()} onChange={(v) => session.setAudioEnabled(v)} />
          <Switch
            label={t.vibration}
            checked={prefs.vibrationEnabled}
            disabled={!vibrationSupported()}
            onChange={(vibrationEnabled) => store.updatePreferences({ vibrationEnabled })}
          />
          <FullscreenButton withLabel />
        </div>
      </BottomSheet>
    </main>
  )
}

/**
 * The end of an exercise on one page, over the figure's afterglow: what was done, the same question as
 * before, and where to go from here. No sentence says how the user feels; they say it themselves.
 */
function Completion({
  t,
  line,
  before,
  after,
  onAfter,
  onDone,
  next,
}: {
  t: Messages
  line: string
  before?: Mood
  after?: Mood
  onAfter: (mood: Mood) => void
  onDone: () => void
  next: { label: string; reason: string; start: () => void } | null
}) {
  return (
    <div className="fade-up pointer-events-auto relative mx-auto flex w-full max-w-md flex-col items-center px-5 pt-3 pb-3 text-center" data-testid="completion">
      <h1 className="display text-[2.25rem] md:text-[2.75rem]" aria-live="polite">
        {t.wellDone}
      </h1>
      <p className="mt-2 text-body text-ink-2 tabular-nums" data-testid="completion-text">
        {line}
      </p>
      <p className="mt-6 mb-3 text-body text-ink">{t.moodTitle}</p>
      <MoodScale label={t.moodTitle} value={after} onChange={onAfter} testId="mood-after" />
      <p className={`mt-3 min-h-5 text-note text-ink-2 transition-opacity duration-700 ${before && after ? 'opacity-100' : 'opacity-0'}`} data-testid="before-after">
        {before && after ? t.beforeAfter(t.moods[before - 1], t.moods[after - 1]) : ''}
      </p>
      <Button onClick={onDone} className="mt-4 w-full" data-testid="completion-done">
        {t.done}
      </Button>
      {next && (
        <button type="button" onClick={next.start} className="mt-2 flex min-h-12 w-full flex-col items-center justify-center rounded-full px-4 py-1.5 text-ink transition hover:bg-ink/5" data-testid="completion-next">
          <span className="text-body font-semibold">{next.label}</span>
          <span className="text-note text-ink-2">{next.reason}</span>
        </button>
      )}
    </div>
  )
}
