import type { Language } from '../i18n/messages'
import type { ThemePreference } from '../lib/themePreferences'
import type { VisualizationMode } from '../visualization/modes'

/** How fast an exercise is breathed: a pace preset and the slow-down option. */
export interface PacePreference {
  /** Index into the exercise's pace options. */
  preset: number
  slowDown: boolean
}

export interface Preferences {
  language: Language
  audioEnabled: boolean
  vibrationEnabled: boolean
  visualizationMode: VisualizationMode
  /** Light, dark, or follow the system. */
  theme: ThemePreference
  /** Version of the look the theme was chosen under (2 = night by default, day as "Atlas"). */
  look?: number
  /** Last chosen session duration per exercise id. */
  durationByExercise: Record<string, number>
  paceByExercise: Record<string, PacePreference>
  /** Show overall time left and session progress while practising. */
  showProgress: boolean
  /** Show a line over the figure's head while breathing: something to sense, later a good thought. */
  breathCues: boolean
  /** With the sound on: a deep pulse for every ring of the lungs as it lights or goes dark. */
  ringPulse: boolean
  /** The welcome pages have been seen once. */
  welcomeSeen: boolean
}

/** How it felt compared to before, asked after a session until look 2: 1 = much calmer, 3 = neutral, 5 = much more tense. */
export type Feeling = 1 | 2 | 3 | 4 | 5

/** How someone feels right now, the same question before and after a session: 1 = very tense, 3 = neutral, 5 = very calm. */
export type Mood = 1 | 2 | 3 | 4 | 5

/** What the user said about a session. Nothing here is measured. */
export interface SessionFeedback {
  rating?: 'up' | 'down'
  feeling?: Feeling
  /** Mood before and after the session (see `Mood`). */
  before?: number
  after?: number
  note?: string
}

export interface SessionRecord {
  id: string
  exerciseId: string
  startedAt: string
  completedAt: string
  durationMs: number
  cycles: number
  /** Phase durations at the chosen pace, e.g. [5500, 5500]. */
  phasesMs?: number[]
  slowDown?: boolean
  feedback?: SessionFeedback
}

export interface StoredData {
  version: 1
  preferences: Preferences
  sessions: SessionRecord[]
}
