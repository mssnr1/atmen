import { useSyncExternalStore } from 'react'
import { audioCues } from '../feedback/audio'

/** Minimal hash router: "#/practice/resonance" -> ["practice", "resonance"]. */
export type Route =
  | { name: 'home' }
  | { name: 'history' }
  | { name: 'learn' }
  | { name: 'settings' }
  | { name: 'welcome' }
  | { name: 'sos' }
  | { name: 'practice'; exerciseId: string }
  | { name: 'exercise'; exerciseId: string }

function parse(hash: string): Route {
  const [name, id] = hash.replace(/^#\/?/, '').split('/')
  if (name === 'practice' && id) return { name: 'practice', exerciseId: id }
  if (name === 'exercise' && id) return { name: 'exercise', exerciseId: id }
  if (name === 'history' || name === 'learn' || name === 'settings' || name === 'welcome' || name === 'sos') return { name }
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
  window.location.hash = route.name === 'home' ? '/' : route.name === 'practice' || route.name === 'exercise' ? `/${route.name}/${route.exerciseId}` : `/${route.name}`
}

/** The exercise a tap asked to start right away; the practice screen picks it up and begins. */
let pendingStart: string | null = null

/**
 * Open an exercise and start it: one tap to the first breath. Audio is unlocked here, inside the tap,
 * because mobile browsers only allow it from a gesture.
 */
export function startPractice(exerciseId: string): void {
  void audioCues.unlock()
  pendingStart = exerciseId
  navigate({ name: 'practice', exerciseId })
}

/** Whether `exerciseId` was opened to start right away. Stays set until `clearPendingStart`, so a re-run effect sees it too. */
export const hasPendingStart = (exerciseId: string) => pendingStart === exerciseId
export function clearPendingStart(): void {
  pendingStart = null
}
