import { useEffect, useState } from 'react'

/** Whether a CSS media query matches, kept up to date. */
export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

/** Phone width: below Tailwind's `md` breakpoint. */
export const useIsPhone = () => useMediaQuery('(max-width: 47.99rem)')
