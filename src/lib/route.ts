import { useSyncExternalStore } from 'react'
import { audioCues } from '../feedback/audio'

/** Minimal hash router: "#/practice/resonance" -> ["practice", "resonance"]. */
export type Route = { name: 'home' } | { name: 'practice'; exerciseId: string }

function parse(hash: string): Route {
  const [name, id] = hash.replace(/^#\/?/, '').split('/')
  if (name === 'practice' && id) return { name: 'practice', exerciseId: id }
  return { name: 'home' }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parse(hash)
}

export function navigate(route: Route): void {
  window.location.hash = route.name === 'home' ? '/' : `/practice/${route.exerciseId}`
}

let autostart: string | null = null

/**
 * Open an exercise and begin breathing straight away. Audio is unlocked here,
 * inside the tap, because mobile browsers only allow it from a gesture.
 */
export function startPractice(exerciseId: string): void {
  void audioCues.unlock()
  autostart = exerciseId
  navigate({ name: 'practice', exerciseId })
}

/** True once if the practice screen for this exercise should start by itself. */
export function takeAutostart(exerciseId: string): boolean {
  const yes = autostart === exerciseId
  autostart = null
  return yes
}
