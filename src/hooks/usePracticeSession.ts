import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { BreathingEngine, type Pace, type SessionSummary } from '../engine'
import type { Exercise } from '../exercises'
import { audioCues as audio } from '../feedback/audio'
import { vibrate } from '../feedback/haptics'
import { ScreenWakeLock } from '../feedback/wakeLock'
import { store } from '../storage/store'

/**
 * Connects a breathing engine to the outside world: audio, vibration, wake
 * lock and session history. The engine itself knows none of these.
 */
export function usePracticeSession(exercise: Exercise, durationMs: number, pace: Pace) {
  const engine = useMemo(
    () =>
      new BreathingEngine({
        pattern: exercise.pattern,
        length: { kind: 'duration', durationMs, alignToCycles: exercise.alignToCycles },
        pace,
      }),
    // Duration and pace changes are applied below, keeping the same engine.
    [exercise],
  )
  const wakeLock = useMemo(() => new ScreenWakeLock(), [])
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const snapshot = useSyncExternalStore(
    useCallback((cb: () => void) => engine.subscribe(cb), [engine]),
    engine.getSnapshot,
  )

  useEffect(() => {
    if (engine.getSnapshot().status === 'idle') {
      engine.configure(exercise.pattern, { kind: 'duration', durationMs, alignToCycles: exercise.alignToCycles })
    }
  }, [engine, exercise, durationMs])

  // Applies right away before a session, and from the next phase during one.
  useEffect(() => engine.setPace(pace), [engine, pace])

  const scheduleAudio = useCallback(
    (fresh: boolean) => {
      if (!store.get().preferences.audioEnabled) return
      void audio.unlock().then(() => {
        if (engine.getSnapshot().status === 'running') {
          audio.scheduleSession(engine.getPlan(), () => engine.sample().elapsedMs, fresh)
        }
      })
    },
    [engine],
  )

  useEffect(() => {
    const unsubscribe = engine.subscribe((event) => {
      const prefs = store.get().preferences
      // The timeline moved, so the cues scheduled ahead are at the wrong times.
      if (event.type === 'plan' && event.snapshot.status === 'running') scheduleAudio(false)
      if (event.type === 'phase' && prefs.vibrationEnabled && !event.snapshot.phase.quiet) vibrate(event.snapshot.phase.type)
      if (event.type === 'complete') {
        if (prefs.vibrationEnabled) vibrate('complete')
        wakeLock.release()
        const { pace: p } = event.snapshot.plan
        const id = store.addSession({
          exerciseId: exercise.id,
          startedAt: event.summary.startedAt.toISOString(),
          completedAt: event.summary.completedAt.toISOString(),
          durationMs: Math.round(event.summary.durationMs),
          cycles: event.summary.completedCycles,
          phasesMs: event.snapshot.plan.activePhases.map((ph) => Math.round(ph.durationMs * p.scale)),
          slowDown: p.slowDown,
        })
        setSessionId(id)
        setSummary(event.summary)
      }
    })
    return () => {
      unsubscribe()
      engine.dispose()
    }
  }, [engine, exercise, wakeLock, scheduleAudio])

  useEffect(
    () => () => {
      audio.cancel()
      wakeLock.dispose()
    },
    [wakeLock],
  )

  // Re-align audio with the engine clock whenever the page becomes visible again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && engine.getSnapshot().status === 'running') scheduleAudio(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [engine, scheduleAudio])

  const begin = useCallback(
    (action: 'start' | 'restart') => {
      // Create the audio context inside the tap so mobile browsers allow sound later.
      void audio.unlock()
      setSummary(null)
      setSessionId(null)
      engine[action]()
      scheduleAudio(true)
      void wakeLock.acquire()
    },
    [engine, scheduleAudio, wakeLock],
  )

  return {
    engine,
    snapshot,
    summary,
    sessionId,
    start: useCallback(() => begin('start'), [begin]),
    restart: useCallback(() => begin('restart'), [begin]),
    pause: useCallback(() => {
      engine.pause()
      audio.cancel()
      wakeLock.release()
    }, [engine, wakeLock]),
    resume: useCallback(() => {
      void audio.unlock()
      engine.resume()
      scheduleAudio(false)
      void wakeLock.acquire()
    }, [engine, scheduleAudio, wakeLock]),
    reset: useCallback(() => {
      engine.reset()
      audio.cancel()
      wakeLock.release()
      setSummary(null)
      setSessionId(null)
    }, [engine, wakeLock]),
    setAudioEnabled: useCallback(
      (enabled: boolean) => {
        store.updatePreferences({ audioEnabled: enabled })
        if (!enabled) return audio.cancel()
        void audio.unlock()
        if (engine.getSnapshot().status === 'running') scheduleAudio(false)
      },
      [engine, scheduleAudio],
    ),
  }
}
