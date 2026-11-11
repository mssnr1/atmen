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

/**
 * Puts the theme on <html> and tints the browser chrome to match. Returns the theme in effect.
 *
 * Browsers take the colour of their own bars from different places: older ones from the `theme-color`
 * meta tag (read anew only when the tag itself is new), Safari on iOS 26 from the page's background.
 * So a change of look sets all of them.
 */
export function useApplyTheme(): Theme {
  const theme = useTheme()
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    const paper = cssColor('--color-paper')
    root.style.backgroundColor = paper
    document.body.style.backgroundColor = paper
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = paper
    document.querySelector('meta[name="theme-color"]')?.remove()
    document.head.appendChild(meta)
  }, [theme])
  return theme
}
