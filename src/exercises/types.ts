import type { BreathingPattern } from '../engine'
import type { Language } from '../i18n/messages'

/** The words for an exercise in one language. */
export interface ExerciseText {
  name: string
  /** Two short lines on what the exercise is for, shown on its card. */
  purpose: [string, string]
  tagline: string
  /** One or two sentences shown on the learn screen. */
  summary: string
  /** Short explanation of how it works. */
  howItWorks: string
  benefits: string[]
  /** How to do it. */
  instructions: string[]
  /** Optional safety or context note. */
  caution?: string
}

/** A selectable breathing pace: a multiplier of the pattern's phase durations. */
export interface PaceOption {
  scale: number
  label: Record<Language, string>
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
  /** Pace presets, fastest first, and the one to start with. */
  paces: { options: PaceOption[]; defaultIndex: number }
}
