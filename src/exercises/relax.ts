import { scaledPaces } from './paces'
import type { Exercise } from './types'

const minute = 60_000

export const relaxBreathing: Exercise = {
  id: 'relax',
  text: {
    de: {
      name: 'Entspannen',
      purpose: ['Weniger Anspannung', 'Zur Ruhe kommen'],
      tagline: 'Langes Ausatmen, 4 Sekunden ein, 8 Sekunden aus',
      summary:
        'Atme 4 Sekunden durch die Nase ein und 8 Sekunden langsam wieder aus. Das lange Ausatmen hilft vielen, abends oder nach einem vollen Tag herunterzufahren.',
      howItWorks:
        'Beim Ausatmen sinkt die Herzfrequenz leicht, beim Einatmen steigt sie. Ein Ausatmen, das doppelt so lang ist wie das Einatmen, betont diese beruhigende Hälfte des Atemzugs.',
      benefits: ['Hilft beim Herunterfahren', 'Betont das ruhige Ausatmen', 'Gut vor dem Schlafengehen'],
      instructions: [
        'Setz oder leg dich bequem hin.',
        'Atme 4 Sekunden sanft durch die Nase ein.',
        'Lass den Atem 8 Sekunden langsam durch die Nase ausströmen.',
        'Wird es zu lang, wähle in den Einstellungen ein zügigeres Tempo.',
      ],
    },
    en: {
      name: 'Relax',
      purpose: ['Less tension', 'Wind down'],
      tagline: 'Long exhale, 4 seconds in, 8 seconds out',
      summary:
        'Breathe in through your nose for 4 seconds and slowly out for 8. The long exhale helps many people wind down in the evening or after a full day.',
      howItWorks:
        'Heart rate dips slightly as you breathe out and rises as you breathe in. An exhale twice as long as the inhale emphasises this calming half of the breath.',
      benefits: ['Helps you wind down', 'Emphasises the calm exhale', 'Good before going to bed'],
      instructions: [
        'Sit or lie down comfortably.',
        'Breathe in gently through your nose for 4 seconds.',
        'Let the breath flow out slowly through your nose for 8 seconds.',
        'If it feels too long, choose a brisker pace in the settings.',
      ],
    },
  },
  pattern: {
    phases: [
      { type: 'inhale', durationMs: 4000 },
      { type: 'exhale', durationMs: 8000 },
    ],
  },
  durationOptionsMs: [2 * minute, 5 * minute, 10 * minute],
  defaultDurationMs: 5 * minute,
  alignToCycles: true,
  paces: { options: scaledPaces, defaultIndex: 1 },
}
