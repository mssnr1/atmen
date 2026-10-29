import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { BreathingEngine, type SessionSummary } from '../engine'
import type { Exercise } from '../exercises'
import { AudioCues } from '../feedback/audio'
import { vibrate } from '../feedback/haptics'
import { ScreenWakeLock } from '../feedback/wakeLock'
import { store } from '../storage/store'

/**
 * Connects a breathing engine to the outside world: audio, vibration, wake
 * lock and session history. The engine itself knows none of these.
 */
export function usePracticeSession(exercise: Exercise, durationMs: number) {
  const engine = useMemo(
    () =>
      new BreathingEngine({
        pattern: exercise.pattern,
        length: { kind: 'duration', durationMs, alignToCycles: exercise.alignToCycles },
      }),
    // Duration changes are applied with configure() below, keeping the same engine.
    [exercise],
  )
  const audio = useMemo(() => new AudioCues(), [])
  const wakeLock = useMemo(() => new ScreenWakeLock(), [])
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  const snapshot = useSyncExternalStore(
    useCallback((cb: () => void) => engine.subscribe(cb), [engine]),
    engine.getSnapshot,
  )

  useEffect(() => {
    if (engine.getSnapshot().status === 'idle') {
      engine.configure(exercise.pattern, { kind: 'duration', durationMs, alignToCycles: exercise.alignToCycles })
    }
  }, [engine, exercise, durationMs])

  useEffect(() => {
    const unsubscribe = engine.subscribe((event) => {
      const prefs = store.get().preferences
      if (event.type === 'phase' && prefs.vibrationEnabled) vibrate(event.snapshot.phase.type)
      if (event.type === 'complete') {
        if (prefs.vibrationEnabled) vibrate('complete')
        wakeLock.release()
        store.addSession({
          exerciseId: exercise.id,
          startedAt: event.summary.startedAt.toISOString(),
          completedAt: event.summary.completedAt.toISOString(),
          durationMs: Math.round(event.summary.durationMs),
          cycles: event.summary.completedCycles,
        })
        setSummary(event.summary)
      }
    })
    return () => {
      unsubscribe()
      engine.dispose()
    }
  }, [engine, exercise, wakeLock])

  useEffect(
    () => () => {
      audio.dispose()
      wakeLock.dispose()
    },
    [audio, wakeLock],
  )

  const scheduleAudio = useCallback(
    (fresh: boolean) => {
      if (!store.get().preferences.audioEnabled) return
      void audio.unlock().then(() => {
        if (engine.getSnapshot().status === 'running') {
          audio.scheduleSession(engine.getPlan(), () => engine.sample().elapsedMs, fresh)
        }
      })
    },
    [audio, engine],
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
      engine[action]()
      scheduleAudio(true)
      void wakeLock.acquire()
    },
    [audio, engine, scheduleAudio, wakeLock],
  )

  return {
    engine,
    snapshot,
    summary,
    start: useCallback(() => begin('start'), [begin]),
    restart: useCallback(() => begin('restart'), [begin]),
    pause: useCallback(() => {
      engine.pause()
      audio.cancel()
      wakeLock.release()
    }, [audio, engine, wakeLock]),
    resume: useCallback(() => {
      void audio.unlock()
      engine.resume()
      scheduleAudio(false)
      void wakeLock.acquire()
    }, [audio, engine, scheduleAudio, wakeLock]),
    reset: useCallback(() => {
      engine.reset()
      audio.cancel()
      wakeLock.release()
      setSummary(null)
    }, [audio, engine, wakeLock]),
    setAudioEnabled: useCallback(
      (enabled: boolean) => {
        store.updatePreferences({ audioEnabled: enabled })
        if (!enabled) return audio.cancel()
        void audio.unlock()
        if (engine.getSnapshot().status === 'running') scheduleAudio(false)
      },
      [audio, engine, scheduleAudio],
    ),
  }
}
