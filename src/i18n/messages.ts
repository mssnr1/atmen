import type { PhaseType } from '../engine'
import type { VisualizationMode } from '../visualization/modes'

export type Language = 'de' | 'en'

export const languages: { id: Language; label: string }[] = [
  { id: 'de', label: 'DE' },
  { id: 'en', label: 'EN' },
]

export interface Messages {
  /** The app keeps its name in every language. */
  appName: string
  tagline: string
  language: string
  exercise: string
  nose: string
  phaseShort: Record<PhaseType, string>
  phase: Record<PhaseType, string>
  ready: string
  paused: string
  start: string
  pause: string
  resume: string
  restart: string
  close: string
  howTo: string
  whyItWorks: string
  inspired: string
  sessionsCompleted: (n: number) => string
  duration: string
  minutes: (n: number) => string
  breathOf: (i: number, n: number) => string
  breaths: (n: number) => string
  timeLeft: (clock: string) => string
  tempo: string
  slowDown: string
  slowDownHint: string
  audioOn: string
  audioOff: string
  vibrationOn: string
  vibrationOff: string
  visualization: string
  modes: Record<VisualizationMode, { label: string; description: string }>
  guide: string
  progress: string
  doneTitle: string
  doneText: (exercise: string) => string
  breathsLabel: string
  again: string
  home: string
}

const de: Messages = {
  appName: 'atmen',
  tagline: 'Die Kunst, besser zu atmen',
  language: 'Sprache',
  exercise: 'Übung',
  nose: 'Nase',
  phaseShort: { inhale: 'ein', holdIn: 'halten', exhale: 'aus', holdOut: 'halten' },
  phase: { inhale: 'Einatmen', holdIn: 'Halten', exhale: 'Ausatmen', holdOut: 'Halten' },
  ready: 'Bereit',
  paused: 'Pausiert',
  start: 'Starten',
  pause: 'Pause',
  resume: 'Weiter',
  restart: 'Neu',
  close: 'Schließen',
  howTo: 'So geht’s',
  whyItWorks: 'Warum es wirkt',
  inspired: 'Inspiriert von James Nestors „Breath“',
  sessionsCompleted: (n) => (n === 1 ? '1 Session abgeschlossen' : `${n} Sessions abgeschlossen`),
  duration: 'Dauer',
  minutes: (n) => `${n} min`,
  breathOf: (i, n) => `Atemzug ${i} von ${n}`,
  breaths: (n) => (n === 1 ? '1 Atemzug' : `${n} Atemzüge`),
  timeLeft: (clock) => `noch ${clock}`,
  tempo: 'Tempo',
  slowDown: 'Langsamer werden',
  slowDownHint: 'Jeder Atemzug etwas länger',
  audioOn: 'Töne einschalten',
  audioOff: 'Töne ausschalten',
  vibrationOn: 'Vibration einschalten',
  vibrationOff: 'Vibration ausschalten',
  visualization: 'Darstellung',
  modes: {
    abstract: { label: 'Kreis', description: 'Ein Kreis, der mit deinem Atem wächst und schrumpft' },
    anatomical: { label: 'Körper', description: 'Luft auf dem Weg durch Nase, Atemwege und Lunge' },
  },
  guide: 'Atemführung',
  progress: 'Fortschritt',
  doneTitle: 'Geschafft',
  doneText: (exercise) => `Du hast eine Runde ${exercise} abgeschlossen.`,
  breathsLabel: 'Atemzüge',
  again: 'Nochmal',
  home: 'Zur Startseite',
}

const en: Messages = {
  appName: 'atmen',
  tagline: 'The art of breathing better',
  language: 'Language',
  exercise: 'Exercise',
  nose: 'nose',
  phaseShort: { inhale: 'in', holdIn: 'hold', exhale: 'out', holdOut: 'hold' },
  phase: { inhale: 'Breathe in', holdIn: 'Hold', exhale: 'Breathe out', holdOut: 'Hold' },
  ready: 'Ready',
  paused: 'Paused',
  start: 'Start',
  pause: 'Pause',
  resume: 'Resume',
  restart: 'Restart',
  close: 'Close',
  howTo: 'How to',
  whyItWorks: 'Why it works',
  inspired: 'Inspired by James Nestor’s Breath',
  sessionsCompleted: (n) => (n === 1 ? '1 session completed' : `${n} sessions completed`),
  duration: 'Duration',
  minutes: (n) => `${n} min`,
  breathOf: (i, n) => `Breath ${i} of ${n}`,
  breaths: (n) => (n === 1 ? '1 breath' : `${n} breaths`),
  timeLeft: (clock) => `${clock} left`,
  tempo: 'Pace',
  slowDown: 'Slow down',
  slowDownHint: 'Each breath a little longer',
  audioOn: 'Turn sounds on',
  audioOff: 'Turn sounds off',
  vibrationOn: 'Turn vibration on',
  vibrationOff: 'Turn vibration off',
  visualization: 'Visualization',
  modes: {
    abstract: { label: 'Circle', description: 'A circle that grows and shrinks with your breath' },
    anatomical: { label: 'Body', description: 'Air moving through the nose, airways and lungs' },
  },
  guide: 'Breathing guide',
  progress: 'Progress',
  doneTitle: 'Well done',
  doneText: (exercise) => `You completed a session of ${exercise}.`,
  breathsLabel: 'Breaths',
  again: 'Practice again',
  home: 'Back to home',
}

export const messages: Record<Language, Messages> = { de, en }

export function detectLanguage(): Language {
  const lang = typeof navigator !== 'undefined' ? navigator.language : ''
  return lang.toLowerCase().startsWith('en') ? 'en' : 'de'
}
