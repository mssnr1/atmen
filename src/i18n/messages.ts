import type { PhaseType } from '../engine'
import type { ThemePreference } from '../lib/themePreferences'
import type { VisualizationMode } from '../visualization/modes'

export type Language = 'de' | 'en'

export const languages: { id: Language; label: string }[] = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
]

export interface Messages {
  /** The app keeps its name in every language. */
  appName: string
  // Welcome
  welcome: { title: string; lines: string[] }[]
  next: string
  skip: string
  // Exercise selection and navigation
  chooseTitle: [string, string]
  nav: { home: string; learn: string; settings: string }
  rhythm: (inS: string, outS: string) => string
  nose: string
  phaseShort: Record<PhaseType, string>
  // Practice
  phase: Record<PhaseType, string>
  seconds: (s: string) => string
  ready: string
  paused: string
  start: string
  pause: string
  resume: string
  restart: string
  close: string
  roundOf: (i: number, n: number) => string
  timeLeft: (clock: string) => string
  breaths: (n: number) => string
  minutes: (n: number) => string
  minutesLong: (n: number) => string
  pace: string
  settings: string
  openSettings: string
  aboutExercise: string
  breathingPace: string
  breathingPaceHint: string
  slowDown: string
  slowDownHint: string
  showProgress: string
  showProgressHint: string
  duration: string
  sound: string
  vibration: string
  soundOn: string
  soundOff: string
  fullscreen: string
  exitFullscreen: string
  fullscreenIos: { title: string; steps: string[]; note: string }
  visualization: string
  modes: Record<VisualizationMode, { label: string; description: string }>
  resetView: string
  modelLoading: string
  modelFallback: string
  guide: string
  progress: string
  // Completion flow
  wellDone: string
  completed: (duration: string, exercise: string) => string
  /** A short reflection under "well done": a question, a line on it, then short labelled thoughts. */
  reflection: { question: string; lead: string; parts: { title: string; text: string }[] }
  liked: string
  disliked: string
  feelTitle: string
  feelings: [string, string, string, string, string]
  continue: string
  niceWork: string
  breathingTime: string
  breathsLabel: string
  reported: string
  notReported: string
  noMeasurements: string
  done: string
  keepGoing: string
  tryAnother: string
  startExercise: (name: string) => string
  backHome: string
  // Learn and settings
  learnTitle: string
  learnIntro: string
  whyItWorks: string
  howTo: string
  inspired: string
  settingsTitle: string
  language: string
  appearance: string
  themes: Record<ThemePreference, string>
  defaultsHint: string
  sessionsCompleted: (n: number) => string
  about: string
  credits: string
  anatomyCredit: string
}

const de: Messages = {
  appName: 'atmen',
  welcome: [
    { title: 'Atme durch die Nase.', lines: ['Sie filtert, erwärmt und befeuchtet die Luft.', 'Dein natürlicher Atemweg.'] },
    { title: 'Langsamer atmen. Ruhiger werden.', lines: ['Etwa 5,5 Atemzüge pro Minute können Körper und Geist beruhigen.'] },
    { title: 'Ausatmen wird unterschätzt.', lines: ['Lass die Luft langsam und entspannt ausströmen.', 'Gib dem Ausatmen bewusst Zeit.'] },
    { title: 'Weniger ist oft mehr.', lines: ['Nicht möglichst viel oder tief atmen.', 'Sondern sanft, ruhig und gleichmäßig.'] },
  ],
  next: 'Weiter',
  skip: 'Überspringen',
  chooseTitle: ['Wähle', 'eine Atemübung'],
  nav: { home: 'Start', learn: 'Lernen', settings: 'Einstellungen' },
  rhythm: (i, o) => `${i} s ein · ${o} s aus`,
  nose: 'Nase',
  phaseShort: { inhale: 'ein', holdIn: 'halten', exhale: 'aus', holdOut: 'halten' },
  phase: { inhale: 'Einatmen', holdIn: 'Halten', exhale: 'Ausatmen', holdOut: 'Halten' },
  seconds: (s) => `${s} Sek.`,
  ready: 'Bereit',
  paused: 'Pausiert',
  start: 'Starten',
  pause: 'Pause',
  resume: 'Weiter',
  restart: 'Neu starten',
  close: 'Schließen',
  roundOf: (i, n) => `Atemzug ${i} von ${n}`,
  timeLeft: (clock) => `noch ${clock}`,
  breaths: (n) => (n === 1 ? '1 Atemzug' : `${n} Atemzüge`),
  minutes: (n) => `${n} min`,
  minutesLong: (n) => (n === 1 ? '1 Minute' : `${n} Minuten`),
  pace: 'Tempo',
  settings: 'Einstellungen',
  openSettings: 'Einstellungen öffnen',
  aboutExercise: 'Über die Übung',
  breathingPace: 'Atemtempo',
  breathingPaceHint: 'Sekunden ein / aus',
  slowDown: 'Mit der Zeit langsamer',
  slowDownHint: 'Das Tempo sinkt allmählich',
  showProgress: 'Fortschritt anzeigen',
  showProgressHint: 'Gesamtzeit und Fortschrittsbalken',
  duration: 'Dauer',
  sound: 'Töne',
  vibration: 'Vibration',
  soundOn: 'Töne einschalten',
  soundOff: 'Töne ausschalten',
  fullscreen: 'Vollbild',
  exitFullscreen: 'Vollbild beenden',
  fullscreenIos: {
    title: 'Vollbild auf dem iPhone',
    steps: ['Tippe in Safari unten auf das Teilen-Symbol.', 'Wähle „Zum Home-Bildschirm“.', 'Öffne atmen über das neue Symbol auf dem Home-Bildschirm.'],
    note: 'Safari erlaubt auf dem iPhone kein Vollbild für Webseiten. Vom Home-Bildschirm aus startet atmen aber wie eine App, ganz ohne Adressleiste.',
  },
  visualization: 'Darstellung',
  modes: {
    abstract: { label: 'Einfach', description: 'Ein Kreis, der mit deinem Atem wächst und schrumpft' },
    anatomical: { label: 'Anatomie', description: 'Luft auf dem Weg durch Nase, Atemwege und Lunge' },
  },
  resetView: 'Ansicht zurücksetzen',
  modelLoading: 'Modell wird geladen …',
  modelFallback: '3D ist auf diesem Gerät nicht verfügbar. Die einfache Darstellung führt dich weiter.',
  guide: 'Atemführung',
  progress: 'Fortschritt',
  wellDone: 'Gut gemacht.',
  completed: (d, e) => `Du hast ${d} ${e} abgeschlossen.`,
  reflection: {
    question: 'Hast du gesehen, wie groß deine Lunge und dein Zwerchfell sind?',
    lead: 'Fast alles in deinem Oberkörper ist dafür da, dass du atmen kannst. Im Alltag vergessen wir das leicht.',
    parts: [
      {
        title: 'Wenn der Atem aus dem Takt gerät',
        text: 'Viele atmen mit der Zeit unbemerkt zu flach und zu schnell. Das kann das Herz unruhiger schlagen lassen und Angstgefühle verstärken.',
      },
      {
        title: 'Was hilft',
        text: 'Den Atem bewusst wahrnehmen und lenken. Genau das hast du gerade geübt.',
      },
    ],
  },
  liked: 'Hat mir gefallen',
  disliked: 'Hat mir nicht gefallen',
  feelTitle: 'Wie fühlst du dich gerade?',
  feelings: ['Viel ruhiger', 'Ruhiger', 'Neutral', 'Angespannter', 'Viel angespannter'],
  continue: 'Weiter',
  niceWork: 'Stark!',
  breathingTime: 'Atemzeit',
  breathsLabel: 'Atemzüge',
  reported: 'Dein Empfinden',
  notReported: 'Keine Angabe',
  noMeasurements: 'Ohne Messwerte. Nur deine Übung und deine Angaben.',
  done: 'Fertig',
  keepGoing: 'Weitermachen?',
  tryAnother: 'Probier eine andere Übung.',
  startExercise: (n) => `${n} starten`,
  backHome: 'Zur Startseite',
  learnTitle: 'Lernen',
  learnIntro: 'Was hinter den Übungen steckt und wie du sie machst.',
  whyItWorks: 'Warum es wirkt',
  howTo: 'So geht’s',
  inspired: 'Inspiriert von James Nestors „Breath“',
  settingsTitle: 'Einstellungen',
  language: 'Sprache',
  appearance: 'Erscheinungsbild',
  themes: { light: 'Hell', dark: 'Dunkel', system: 'System' },
  defaultsHint: 'Tempo, Dauer und Fortschritt stellst du während der Übung ein.',
  sessionsCompleted: (n) => (n === 1 ? '1 Übung abgeschlossen' : `${n} Übungen abgeschlossen`),
  about: 'Über atmen',
  credits: 'Quellen und Lizenzen',
  anatomyCredit:
    '3D-Anatomie abgeleitet von „Z-Anatomy – The libre 3D atlas of anatomy“ (CC BY-SA 4.0) und „BodyParts3D, The Database Center for Life Science“ (CC BY-SA 2.1 Japan). Das angepasste Modell steht unter CC BY-SA 4.0.',
}

const en: Messages = {
  appName: 'atmen',
  welcome: [
    { title: 'Breathe through your nose.', lines: ['It filters, warms and moistens the air.', 'Your natural airway.'] },
    { title: 'Breathe slower. Feel calmer.', lines: ['About 5.5 breaths a minute can calm both body and mind.'] },
    { title: 'Exhaling is underrated.', lines: ['Let the air flow out slowly and easily.', 'Give your exhale time.'] },
    { title: 'Less is often more.', lines: ['Not as much or as deeply as you can,', 'but softly, calmly and evenly.'] },
  ],
  next: 'Next',
  skip: 'Skip',
  chooseTitle: ['Choose', 'a breathing exercise'],
  nav: { home: 'Home', learn: 'Learn', settings: 'Settings' },
  rhythm: (i, o) => `${i} s in · ${o} s out`,
  nose: 'nose',
  phaseShort: { inhale: 'in', holdIn: 'hold', exhale: 'out', holdOut: 'hold' },
  phase: { inhale: 'Breathe in', holdIn: 'Hold', exhale: 'Breathe out', holdOut: 'Hold' },
  seconds: (s) => `${s} sec`,
  ready: 'Ready',
  paused: 'Paused',
  start: 'Start',
  pause: 'Pause',
  resume: 'Resume',
  restart: 'Restart',
  close: 'Close',
  roundOf: (i, n) => `Breath ${i} of ${n}`,
  timeLeft: (clock) => `${clock} left`,
  breaths: (n) => (n === 1 ? '1 breath' : `${n} breaths`),
  minutes: (n) => `${n} min`,
  minutesLong: (n) => (n === 1 ? '1 minute' : `${n} minutes`),
  pace: 'Pace',
  settings: 'Settings',
  openSettings: 'Open settings',
  aboutExercise: 'About this exercise',
  breathingPace: 'Breathing pace',
  breathingPaceHint: 'Seconds in / out',
  slowDown: 'Slow down over time',
  slowDownHint: 'Gradually reduce the pace',
  showProgress: 'Show session progress',
  showProgressHint: 'Show total time and progress bar',
  duration: 'Duration',
  sound: 'Sounds',
  vibration: 'Vibration',
  soundOn: 'Turn sounds on',
  soundOff: 'Turn sounds off',
  fullscreen: 'Full screen',
  exitFullscreen: 'Exit full screen',
  fullscreenIos: {
    title: 'Full screen on iPhone',
    steps: ['In Safari, tap the Share icon at the bottom.', 'Choose “Add to Home Screen”.', 'Open atmen from the new icon on your Home Screen.'],
    note: 'Safari on iPhone does not allow web pages to go full screen. From the Home Screen, though, atmen opens like an app, without the address bar.',
  },
  visualization: 'View',
  modes: {
    abstract: { label: 'Simple', description: 'A circle that grows and shrinks with your breath' },
    anatomical: { label: 'Anatomical', description: 'Air moving through the nose, airways and lungs' },
  },
  resetView: 'Reset view',
  modelLoading: 'Loading model …',
  modelFallback: '3D is not available on this device. The simple view keeps guiding you.',
  guide: 'Breathing guide',
  progress: 'Progress',
  wellDone: 'Well done.',
  completed: (d, e) => `You completed ${d} of ${e}.`,
  reflection: {
    question: 'Did you see how large your lungs and your diaphragm are?',
    lead: 'Almost everything in your upper body is there so that you can breathe. In everyday life, that is easy to forget.',
    parts: [
      {
        title: 'When breathing loses its rhythm',
        text: 'Over time, many people slip into breathing too shallow and too fast without noticing. That can make the heart beat more restlessly and feed anxious feelings.',
      },
      {
        title: 'What helps',
        text: 'Noticing your breath and guiding it on purpose. That is exactly what you just practised.',
      },
    ],
  },
  liked: 'I liked it',
  disliked: 'I didn’t like it',
  feelTitle: 'How do you feel right now?',
  feelings: ['Much calmer', 'Calmer', 'Neutral', 'More tense', 'Much more tense'],
  continue: 'Continue',
  niceWork: 'Nice work!',
  breathingTime: 'Breathing time',
  breathsLabel: 'Breaths',
  reported: 'Reported state',
  notReported: 'Not reported',
  noMeasurements: 'No measurements. Just your practice and what you reported.',
  done: 'Done',
  keepGoing: 'Keep going?',
  tryAnother: 'Try another exercise.',
  startExercise: (n) => `Start ${n}`,
  backHome: 'Back to Home',
  learnTitle: 'Learn',
  learnIntro: 'What is behind the exercises and how to do them.',
  whyItWorks: 'Why it works',
  howTo: 'How to',
  inspired: 'Inspired by James Nestor’s Breath',
  settingsTitle: 'Settings',
  language: 'Language',
  appearance: 'Appearance',
  themes: { light: 'Light', dark: 'Dark', system: 'System' },
  defaultsHint: 'Pace, duration and progress are set during an exercise.',
  sessionsCompleted: (n) => (n === 1 ? '1 session completed' : `${n} sessions completed`),
  about: 'About atmen',
  credits: 'Sources and licences',
  anatomyCredit:
    '3D anatomy derived from “Z-Anatomy – The libre 3D atlas of anatomy” (CC BY-SA 4.0) and “BodyParts3D, The Database Center for Life Science” (CC BY-SA 2.1 Japan). The adapted model is licensed CC BY-SA 4.0.',
}

export const messages: Record<Language, Messages> = { de, en }

export function detectLanguage(): Language {
  const lang = typeof navigator !== 'undefined' ? navigator.language : ''
  return lang.toLowerCase().startsWith('en') ? 'en' : 'de'
}
