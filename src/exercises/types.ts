import type { BreathingPattern } from '../engine'
import type { Language } from '../i18n/messages'

/** The words for an exercise in one language. */
export interface ExerciseText {
  name: string
  tagline: string
  /** One or two sentences shown on the home screen. */
  summary: string
  /** Short explanation of how it works. */
  howItWorks: string
  benefits: string[]
  /** How to do it. */
  instructions: string[]
  /** One name per tempo level. */
  tempoLabels: string[]
  /** Optional safety or context note. */
  caution?: string
}

/**
 * Everything the player needs to run a technique. New techniques are added
 * by writing one of these, not by changing the player.
 */
export interface Exercise {
  id: string
  text: Record<Language, ExerciseText>
  pattern: BreathingPattern
  durationOptionsMs: number[]
  defaultDurationMs: number
  /** Round durations to whole breaths so sessions never end mid-breath. */
  alignToCycles: boolean
  /**
   * Tempo levels as multipliers of the pattern's phase durations, ordered from
   * slowest to fastest, and the one to start with.
   */
  tempo: { scales: number[]; defaultLevel: number }
}
