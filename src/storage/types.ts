import type { VisualizationMode } from '../visualization/modes'

export interface Preferences {
  audioEnabled: boolean
  vibrationEnabled: boolean
  visualizationMode: VisualizationMode
  /** Last chosen session duration per exercise id. */
  durationByExercise: Record<string, number>
}

/** Room for subjective before/after feedback later; not collected yet. */
export interface SessionFeedback {
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
  feedback?: SessionFeedback
}

export interface StoredData {
  version: 1
  preferences: Preferences
  sessions: SessionRecord[]
}
