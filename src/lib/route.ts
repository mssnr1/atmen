import { useSyncExternalStore } from 'react'
import { audioCues } from '../feedback/audio'

/** Minimal hash router: "#/practice/resonance" -> ["practice", "resonance"]. */
export type Route =
  | { name: 'home' }
  /** `sessionId`: the exercise just finished, shown at the top and its ring drawn in. */
  | { name: 'history'; sessionId?: string }
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
  if (name === 'history') return id ? { name, sessionId: id } : { name }
  if (name === 'learn' || name === 'settings' || name === 'welcome' || name === 'sos') return { name }
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

function hashOf(route: Route): string {
  if (route.name === 'home') return '/'
  if (route.name === 'practice' || route.name === 'exercise') return `/${route.name}/${route.exerciseId}`
  if (route.name === 'history' && route.sessionId) return `/history/${route.sessionId}`
  return `/${route.name}`
}

export function navigate(route: Route): void {
  window.location.hash = hashOf(route)
}

/**
 * Go somewhere without leaving the page behind in the browser's history: after an exercise, "back"
 * from the overview goes to where the exercise was opened from, not into the finished exercise again.
 */
export function navigateReplacing(route: Route): void {
  window.location.replace(`${window.location.pathname}${window.location.search}#${hashOf(route)}`)
}

/** The exercise a tap asked to start right away; the practice screen picks it up and begins. */
let pendingStart: string | null = null

/**
 * Open an exercise and start it: one tap to the first breath. Audio is unlocked here, inside the tap,
 * because mobile browsers only allow it from a gesture; each session begins with a fresh audio context.
 */
export function startPractice(exerciseId: string): void {
  audioCues.renew()
  void audioCues.unlock()
  pendingStart = exerciseId
  navigate({ name: 'practice', exerciseId })
}

/** Whether `exerciseId` was opened to start right away. Stays set until `clearPendingStart`, so a re-run effect sees it too. */
export const hasPendingStart = (exerciseId: string) => pendingStart === exerciseId
export function clearPendingStart(): void {
  pendingStart = null
}
