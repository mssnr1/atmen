import { scaledPaces } from './paces'
import type { Exercise } from './types'

const minute = 60_000

export const energyBreathing: Exercise = {
  id: 'energy',
  text: {
    de: {
      name: 'Energie',
      purpose: ['Wacher Fokus', 'Klarer Kopf'],
      tagline: 'Etwas zügiger, 4 Sekunden ein, 6 Sekunden aus',
      summary:
        'Ein ruhiger, aber lebendigerer Rhythmus: 4 Sekunden durch die Nase ein, 6 Sekunden aus. Gut für zwischendurch, wenn du wach und gesammelt bleiben willst.',
      howItWorks:
        'Langsames Nasenatmen mit etwas längerem Ausatmen hält den Atem ruhig und gleichmäßig, ohne schläfrig zu machen. Viele nutzen ihn als kurze Pause, um sich wieder zu sammeln.',
      benefits: ['Kurze, sammelnde Pause', 'Gleichmäßiger, ruhiger Atem', 'Leicht in den Alltag einzubauen'],
      instructions: [
        'Sitz aufrecht, die Schultern locker.',
        'Atme 4 Sekunden sanft durch die Nase ein.',
        'Atme 6 Sekunden ruhig durch die Nase aus.',
        'Bleib entspannt; der Atem soll nie angestrengt sein.',
      ],
    },
    en: {
      name: 'Energy',
      purpose: ['More focus', 'Mental clarity'],
      tagline: 'A little brisker, 4 seconds in, 6 seconds out',
      summary:
        'A calm but livelier rhythm: 4 seconds in through the nose, 6 seconds out. Useful during the day when you want to stay alert and collected.',
      howItWorks:
        'Slow nasal breathing with a slightly longer exhale keeps the breath calm and even without making you drowsy. Many people use it as a short pause to regroup.',
      benefits: ['A short, collecting pause', 'Even, calm breathing', 'Easy to fit into the day'],
      instructions: [
        'Sit upright with your shoulders relaxed.',
        'Breathe in gently through your nose for 4 seconds.',
        'Breathe out calmly through your nose for 6 seconds.',
        'Stay relaxed; the breath should never feel strained.',
      ],
    },
  },
  pattern: {
    phases: [
      { type: 'inhale', durationMs: 4000 },
      { type: 'exhale', durationMs: 6000 },
    ],
  },
  durationOptionsMs: [2 * minute, 5 * minute, 10 * minute],
  defaultDurationMs: 2 * minute,
  alignToCycles: true,
  paces: { options: scaledPaces, defaultIndex: 1 },
}
