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

/**
 * A light tap for stepping a control. Safari on iPhone has no vibration API,
 * but toggling a native switch gives a system haptic there (iOS 18+), so we
 * flip a hidden one. Only works inside a user gesture.
 */
export function hapticTick(): void {
  if (vibrationSupported()) {
    navigator.vibrate(8)
    return
  }
  if (typeof document === 'undefined') return
  const label = document.createElement('label')
  label.ariaHidden = 'true'
  label.style.display = 'none'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.appendChild(input)
  document.head.appendChild(label)
  label.click()
  label.remove()
}
