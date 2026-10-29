import type { BreathingPattern } from '../engine'

/**
 * Everything the player needs to run a technique. New techniques are added
 * by writing one of these, not by changing the player.
 */
export interface Exercise {
  id: string
  name: string
  tagline: string
  /** One or two sentences shown on the home screen. */
  summary: string
  /** Short explanation of how it works. */
  howItWorks: string
  benefits: string[]
  /** Shown before starting the session. */
  instructions: string[]
  pattern: BreathingPattern
  durationOptionsMs: number[]
  defaultDurationMs: number
  /** Round durations to whole breaths so sessions never end mid-breath. */
  alignToCycles: boolean
  /** Optional safety or context note. */
  caution?: string
}
