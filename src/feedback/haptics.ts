import type { PhaseType } from '../engine'

const PATTERNS: Record<PhaseType | 'complete', number[]> = {
  inhale: [70], // one pulse: breathe in
  holdIn: [20],
  exhale: [35, 90, 35], // two pulses: breathe out
  holdOut: [20],
  complete: [120, 100, 120, 100, 300],
}

export const vibrationSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export function vibrate(kind: PhaseType | 'complete'): void {
  if (vibrationSupported()) navigator.vibrate(PATTERNS[kind])
}
