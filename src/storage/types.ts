import type { Language } from '../i18n/messages'
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
  /** Last chosen session duration per exercise id. */
  durationByExercise: Record<string, number>
  paceByExercise: Record<string, PacePreference>
  /** Show overall time left and session progress while practising. */
  showProgress: boolean
  /** The welcome pages have been seen once. */
  welcomeSeen: boolean
}

/** How it felt: 1 = much calmer, 3 = neutral, 5 = much more tense. */
export type Feeling = 1 | 2 | 3 | 4 | 5

/** What the user said about a session afterwards. Nothing here is measured. */
export interface SessionFeedback {
  rating?: 'up' | 'down'
  feeling?: Feeling
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
