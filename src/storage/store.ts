import { useSyncExternalStore } from 'react'
import { detectLanguage, languages } from '../i18n/messages'
import { defaultVisualizationMode, visualizationModes } from '../visualization/modes'
import type { PacePreference, Preferences, SessionRecord, StoredData } from './types'

const STORAGE_KEY = 'breath.data'
const MAX_SESSIONS = 2000

const defaults: StoredData = {
  version: 1,
  preferences: {
    language: detectLanguage(),
    audioEnabled: true,
    vibrationEnabled: true,
    visualizationMode: defaultVisualizationMode,
    durationByExercise: {},
    paceByExercise: {},
  },
  sessions: [],
}

/** Merge whatever is stored over defaults; migrations go here as versions grow. */
function migrate(raw: unknown): StoredData {
  if (!raw || typeof raw !== 'object') return defaults
  const data = raw as Partial<StoredData>
  const preferences = { ...defaults.preferences, ...data.preferences }
  if (!visualizationModes.some((m) => m.id === preferences.visualizationMode)) preferences.visualizationMode = defaultVisualizationMode
  if (!languages.some((l) => l.id === preferences.language)) preferences.language = defaults.preferences.language
  return {
    version: 1,
    preferences,
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
  }
}

function load(): StoredData {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    return text ? migrate(JSON.parse(text)) : defaults
  } catch {
    return defaults
  }
}

let state: StoredData = load()
const listeners = new Set<() => void>()

function commit(next: StoredData) {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage full or unavailable (private mode): keep working in memory.
  }
  listeners.forEach((l) => l())
}

export const store = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  updatePreferences(patch: Partial<Preferences>) {
    commit({ ...state, preferences: { ...state.preferences, ...patch } })
  },
  setDuration(exerciseId: string, durationMs: number) {
    store.updatePreferences({
      durationByExercise: { ...state.preferences.durationByExercise, [exerciseId]: durationMs },
    })
  },
  setPace(exerciseId: string, pace: PacePreference) {
    store.updatePreferences({ paceByExercise: { ...state.preferences.paceByExercise, [exerciseId]: pace } })
  },
  addSession(record: Omit<SessionRecord, 'id'>) {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    commit({ ...state, sessions: [...state.sessions, { id, ...record }].slice(-MAX_SESSIONS) })
  },
}

// Keep tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      state = load()
      listeners.forEach((l) => l())
    }
  })
}

export function useStore<T>(select: (data: StoredData) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(state))
}
