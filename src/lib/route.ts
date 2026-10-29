import { useSyncExternalStore } from 'react'
import { audioCues } from '../feedback/audio'

/** Minimal hash router: "#/practice/resonance" -> ["practice", "resonance"]. */
export type Route = { name: 'home' } | { name: 'learn' } | { name: 'settings' } | { name: 'welcome' } | { name: 'practice'; exerciseId: string }

function parse(hash: string): Route {
  const [name, id] = hash.replace(/^#\/?/, '').split('/')
  if (name === 'practice' && id) return { name: 'practice', exerciseId: id }
  if (name === 'learn' || name === 'settings' || name === 'welcome') return { name }
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
  window.location.hash = route.name === 'home' ? '/' : route.name === 'practice' ? `/practice/${route.exerciseId}` : `/${route.name}`
}

/**
 * Open an exercise, ready to start. Audio is unlocked here, inside the tap,
 * because mobile browsers only allow it from a gesture.
 */
export function startPractice(exerciseId: string): void {
  void audioCues.unlock()
  navigate({ name: 'practice', exerciseId })
}
