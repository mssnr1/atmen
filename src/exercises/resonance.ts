import type { Exercise } from './types'

const minute = 60_000

export const resonanceBreathing: Exercise = {
  id: 'resonance',
  name: 'Resonance Breathing',
  tagline: 'Slow, even breaths at about 5.5 per minute',
  summary:
    'Breathe in and out through your nose for 5.5 seconds each. This slow, balanced rhythm is the foundation of the techniques in Breath.',
  howItWorks:
    'At around 5.5 breaths per minute, heart rate, blood pressure and breathing tend to fall into sync. This “coherence” is linked to higher heart rate variability and a calmer nervous system.',
  benefits: ['Calms the nervous system', 'Supports heart rate variability', 'Improves focus and composure'],
  instructions: [
    'Sit or lie comfortably with your shoulders relaxed.',
    'Breathe gently through your nose, in and out.',
    'Let the belly expand as you inhale. No need to fill up completely.',
    'Follow the circle, the tones or the vibrations.',
  ],
  pattern: {
    phases: [
      { type: 'inhale', durationMs: 5500 },
      { type: 'exhale', durationMs: 5500 },
    ],
  },
  durationOptionsMs: [2 * minute, 5 * minute, 10 * minute],
  defaultDurationMs: 5 * minute,
  alignToCycles: true,
}
