import { useEffect, useSyncExternalStore } from 'react'
import { useStore } from '../storage/store'

export type Theme = 'light' | 'dark'

const darkQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : undefined

function subscribe(onChange: () => void) {
  darkQuery?.addEventListener('change', onChange)
  return () => darkQuery?.removeEventListener('change', onChange)
}

/** The theme in effect: the user's choice, or the system's when set to follow it. */
export function useTheme(): Theme {
  const pref = useStore((d) => d.preferences.theme)
  const systemDark = useSyncExternalStore(subscribe, () => darkQuery?.matches ?? false, () => false)
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref
}

/** Read a colour token from the stylesheet, e.g. `--color-paper`. */
export function cssColor(token: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim()
}

/** Puts the theme on <html> and tints the browser chrome to match. */
export function useApplyTheme() {
  const theme = useTheme()
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    if (!document.body.classList.contains('blue-page')) {
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cssColor('--color-paper'))
    }
  }, [theme])
}
