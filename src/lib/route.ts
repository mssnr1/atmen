import { useSyncExternalStore } from 'react'

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
