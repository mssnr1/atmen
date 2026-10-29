import type { Exercise } from './types'

const minute = 60_000
const phase = 5500

export const resonanceBreathing: Exercise = {
  id: 'resonance',
  text: {
    de: {
      name: 'Resonanzatmung',
      purpose: ['Ruhiger Geist', 'Ausgeglichenes Nervensystem'],
      tagline: 'Ruhig und gleichmäßig, etwa 5,5 Atemzüge pro Minute',
      summary:
        'Atme 5,5 Sekunden durch die Nase ein und 5,5 Sekunden wieder aus. Dieser ruhige, ausgeglichene Rhythmus ist die Grundlage der Techniken aus „Breath“.',
      howItWorks:
        'Bei etwa 5,5 Atemzügen pro Minute geraten Herzschlag, Blutdruck und Atmung in Einklang. Diese „Kohärenz“ geht mit einer höheren Herzratenvariabilität und einem ruhigeren Nervensystem einher.',
      benefits: ['Beruhigt das Nervensystem', 'Stärkt die Herzratenvariabilität', 'Fördert Fokus und Gelassenheit'],
      instructions: [
        'Setz oder leg dich bequem hin, die Schultern locker.',
        'Atme sanft durch die Nase ein und aus.',
        'Lass beim Einatmen den Bauch weit werden. Du musst dich nicht ganz füllen.',
        'Folge der Anzeige, den Tönen oder der Vibration.',
      ],
    },
    en: {
      name: 'Resonance Breathing',
      purpose: ['Calm mind', 'Balanced nervous system'],
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
        'Follow the guide, the tones or the vibrations.',
      ],
    },
  },
  pattern: {
    phases: [
      { type: 'inhale', durationMs: phase },
      // A moment of rest at the top of the breath.
      { type: 'holdIn', durationMs: 2000, quiet: true },
      { type: 'exhale', durationMs: phase },
    ],
  },
  durationOptionsMs: [2 * minute, 5 * minute, 10 * minute],
  defaultDurationMs: 5 * minute,
  alignToCycles: true,
  // 4 s, 5.5 s and 6 s per phase; in and out stay equal.
  paces: {
    options: [
      { scale: 4000 / phase, label: { de: 'Zügiger', en: 'Brisker' } },
      { scale: 1, label: { de: 'Standard', en: 'Default' } },
      { scale: 6000 / phase, label: { de: 'Langsamer', en: 'Slower' } },
    ],
    defaultIndex: 1,
  },
}
