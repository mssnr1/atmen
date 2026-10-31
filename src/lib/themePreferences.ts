/** Kept apart from theme.ts, which reads the store: the store needs this list while it loads. */
export type ThemePreference = 'light' | 'dark' | 'system'

export const themePreferences: ThemePreference[] = ['light', 'dark', 'system']
