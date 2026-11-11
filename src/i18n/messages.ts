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
  /** The intro cards. `eyebrow` sits small above the title, `closing` stands apart below the lines. */
  welcome: { eyebrow?: string; title: string; lines: string[]; closing?: string }[]
  next: string
  skip: string
  // Start
  /** The one sentence the app stands for. */
  tagline: string
  /** The one-tap start: the last exercise again, or a first one. */
  continueWith: (name: string, minutes: number) => string
  startWith: (name: string, minutes: number) => string
  otherExercise: string
  stressed: string
  panic: string
  /** The exercise sheet: tools by what is needed right now. */
  needTitle: string
  fitsNow: string
  adjust: (name: string) => string
  // The first breath, on the very first open
  firstBreath: {
    pad: string
    hold: string
    holdSub: string
    inhaleSub: string
    exhaleSub: string
    longer: string
    welcome: string
    welcomeSub: string
  }
  intro: string
  // Navigation
  nav: { history: string; learn: string; settings: string }
  rhythm: (inS: string, outS: string) => string
  nose: string
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
  /** Label for the heads-up cards on what happens in the body. */
  bodyInsights: string
  /** Small label before the positive result on a body insight card. */
  insightImpact: string
  /** Small label before where in the body it happens. */
  insightPlace: string
  breathingPace: string
  breathingPaceHint: string
  slowDown: string
  slowDownHint: string
  showProgress: string
  showProgressHint: string
  breathCues: string
  breathCuesHint: string
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
  /** Shown while the lungs empty before the first breath of an exercise. */
  leadIn: string
  /** Once the controls have stepped back. */
  tapForControls: string
  /** The same question before and after an exercise; `moods` runs from very tense (1) to very calm (5). */
  moodTitle: string
  moods: [string, string, string, string, string]
  moodEnds: [string, string]
  beforeAfter: (before: string, now: string) => string
  /** Why an exercise is suggested. */
  suggestByTime: string
  suggestByExperience: string
  // History
  historyTitle: string
  historyLead: string
  thisWeek: string
  previousWeek: string
  nextWeek: string
  sessions: (n: number) => string
  weekEmpty: string
  legendEmpty: string
  legendWidth: string
  weekdays: [string, string, string, string, string, string, string]
  helpsTitle: string
  helpsLead: string
  helpsEmpty: string
  /** "+1.2 calmer" style line for one exercise, from the user's own answers. */
  helpsChange: (steps: string, direction: -1 | 0 | 1) => string
  total: (sessions: string, minutes: string) => string
  // Completion
  wellDone: string
  back: string
  done: string
  // Learn and settings
  learnTitle: string
  learnIntro: string
  learnBasics: string
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
  appName: 'Fluo',
  welcome: [
    {
      eyebrow: 'Wusstest du?',
      title: 'Es könnte am Atem liegen.',
      lines: [
        'Stress, Herzklopfen, innere Unruhe: Oft liegt es nicht nur am Kaffee oder an den Kollegen.',
        'Wer schnell, flach oder durch den Mund atmet, kann genau solche Beschwerden verstärken.',
      ],
      closing: 'Hier lernst du, was dir jeden Tag hilft, auch jetzt sofort. Dein Atem ist ein Werkzeug, das du selbst in der Hand hast.',
    },
    {
      eyebrow: 'Stell dir vor',
      title: 'Dein Körper ist wie ein Auto.',
      lines: [
        'Das Herz ist der Motor, das Gehirn das Armaturenbrett mit seinen Warnleuchten. Die Lunge ist die Treibstoffzufuhr: Sie macht alles andere erst möglich.',
        'Hakt es dort, kann der Motor stottern, und die Warnleuchten gehen an.',
      ],
      closing: 'Im vollen Alltag vergessen wir oft nachzutanken. Mit jedem ruhigen Atemzug tust du genau das.',
    },
    { title: 'Atme durch die Nase.', lines: ['Sie filtert, erwärmt und befeuchtet die Luft.', 'Dein natürlicher Atemweg.'] },
    { title: 'Langsamer atmen. Ruhiger werden.', lines: ['Etwa 5,5 Atemzüge pro Minute können Körper und Geist beruhigen.'] },
    { title: 'Ausatmen wird unterschätzt.', lines: ['Lass die Luft langsam und entspannt ausströmen.', 'Gib dem Ausatmen bewusst Zeit.'] },
    { title: 'Weniger ist oft mehr.', lines: ['Nicht möglichst viel oder tief atmen.', 'Sondern sanft, ruhig und gleichmäßig.'] },
  ],
  tagline: 'Sieh, was dein Atem in dir bewegt.',
  continueWith: (n, m) => `Weiter mit ${n} · ${m} min`,
  startWith: (n, m) => `Starten mit ${n} · ${m} min`,
  otherExercise: 'Andere Übung',
  stressed: 'Ich bin gestresst',
  panic: 'Akute Hilfe bei Panik',
  needTitle: 'Was brauchst du gerade?',
  fitsNow: 'Passt jetzt',
  adjust: (n) => `${n}: Dauer und Tempo einstellen`,
  firstBreath: {
    pad: 'Halten zum Einatmen',
    hold: 'Leg den Finger auf das Zeichen und atme ein.',
    holdSub: 'Loslassen heißt ausatmen.',
    inhaleSub: 'So lange du hältst.',
    exhaleSub: 'Lass die Luft einfach gehen.',
    longer: 'Etwas länger halten.',
    welcome: 'Schön, dass du da bist.',
    welcomeSub: 'Das war dein erster Atemzug mit Fluo.',
  },
  intro: 'Einführung ansehen',
  next: 'Weiter',
  skip: 'Überspringen',
  nav: { history: 'Verlauf', learn: 'Lernen', settings: 'Einstellungen' },
  rhythm: (i, o) => `${i} s ein · ${o} s aus`,
  nose: 'Nase',
  phase: { inhale: 'Einatmen', holdIn: 'Halten', exhale: 'Ausatmen', holdOut: 'Halten' },
  seconds: (s) => `${s} Sek.`,
  ready: 'Bereit',
  paused: 'Pausiert',
  start: 'Starten',
  pause: 'Pause',
  resume: 'Weiter',
  restart: 'Zum Ende springen',
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
  bodyInsights: 'Was gerade in deinem Körper passiert',
  insightImpact: 'Wirkung',
  insightPlace: 'Ort',
  breathingPace: 'Atemtempo',
  breathingPaceHint: 'Sekunden ein / aus',
  slowDown: 'Mit der Zeit langsamer',
  slowDownHint: 'Das Tempo sinkt allmählich',
  showProgress: 'Fortschritt anzeigen',
  showProgressHint: 'Gesamtzeit und Fortschrittsbalken',
  breathCues: 'Gedanken beim Atmen',
  breathCuesHint: 'Kurze Sätze über der Figur: erst spüren, später ein guter Gedanke',
  duration: 'Dauer',
  sound: 'Töne',
  vibration: 'Vibration',
  soundOn: 'Töne einschalten',
  soundOff: 'Töne ausschalten',
  fullscreen: 'Vollbild',
  exitFullscreen: 'Vollbild beenden',
  fullscreenIos: {
    title: 'Vollbild auf dem iPhone',
    steps: ['Tippe in Safari unten auf das Teilen-Symbol.', 'Wähle „Zum Home-Bildschirm“.', 'Öffne Fluo über das neue Symbol auf dem Home-Bildschirm.'],
    note: 'Safari erlaubt auf dem iPhone kein Vollbild für Webseiten. Vom Home-Bildschirm aus startet Fluo aber wie eine App, ganz ohne Adressleiste.',
  },
  visualization: 'Darstellung',
  modes: {
    abstract: { label: 'Einfach', description: 'Ein Zeichen, das sich mit deinem Atem von unten mit Licht füllt' },
    anatomical: { label: 'Anatomie', description: 'Luft auf dem Weg durch Nase, Atemwege und Lunge' },
  },
  resetView: 'Ansicht zurücksetzen',
  modelLoading: 'Modell wird geladen …',
  modelFallback: '3D ist auf diesem Gerät nicht verfügbar. Die einfache Darstellung führt dich weiter.',
  guide: 'Atemführung',
  progress: 'Fortschritt',
  leadIn: 'Atme noch einmal aus',
  tapForControls: 'Tippen zeigt die Bedienung',
  moodTitle: 'Wie fühlst du dich gerade?',
  moods: ['Sehr angespannt', 'Angespannt', 'Neutral', 'Ruhig', 'Sehr ruhig'],
  moodEnds: ['angespannt', 'ruhig'],
  beforeAfter: (b, n) => `Vorher: ${b} · Jetzt: ${n}`,
  suggestByTime: 'Passt zur Tageszeit',
  suggestByExperience: 'Hat dir zu dieser Zeit oft geholfen',
  historyTitle: 'Dein Verlauf',
  historyLead: 'Jede Übung ist ein Ring. Die Woche wächst von innen nach außen, von Montag bis Sonntag.',
  thisWeek: 'Diese Woche',
  previousWeek: 'Woche davor',
  nextWeek: 'Woche danach',
  sessions: (n) => (n === 1 ? '1 Übung' : `${n} Übungen`),
  weekEmpty: 'Noch keine Übung in dieser Woche.',
  legendEmpty: 'Tag ohne Übung',
  legendWidth: 'Je länger, desto breiter',
  weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  helpsTitle: 'Was dir hilft',
  helpsLead: 'Aus deinen eigenen Antworten vor und nach der Übung. Keine Messung.',
  helpsEmpty: 'Sobald du bei einer Übung dreimal vorher und nachher geantwortet hast, steht hier, was dir hilft.',
  helpsChange: (steps, d) => (d === 0 ? 'im Schnitt unverändert' : `im Schnitt ${steps} ${steps === '1' ? 'Stufe' : 'Stufen'} ${d > 0 ? 'ruhiger' : 'angespannter'}`),
  total: (s, m) => `Insgesamt ${s}, ${m}`,
  wellDone: 'Gut gemacht.',
  back: 'Zurück',
  done: 'Fertig',
  learnTitle: 'Lernen',
  learnIntro: 'Was hinter den Übungen steckt und wie du sie machst.',
  learnBasics: 'Grundlagen',
  whyItWorks: 'Warum es wirkt',
  howTo: 'So geht’s',
  inspired: 'Inspiriert von James Nestors „Breath“',
  settingsTitle: 'Einstellungen',
  language: 'Sprache',
  appearance: 'Erscheinungsbild',
  themes: { light: 'Hell', dark: 'Dunkel', system: 'System' },
  defaultsHint: 'Dauer und Tempo stellst du bei der Übung ein.',
  sessionsCompleted: (n) => (n === 1 ? '1 Übung abgeschlossen' : `${n} Übungen abgeschlossen`),
  about: 'Über Fluo',
  credits: 'Quellen und Lizenzen',
  anatomyCredit:
    '3D-Anatomie abgeleitet von „Z-Anatomy – The libre 3D atlas of anatomy“ (CC BY-SA 4.0) und „BodyParts3D, The Database Center for Life Science“ (CC BY-SA 2.1 Japan). Das angepasste Modell steht unter CC BY-SA 4.0.',
}

const en: Messages = {
  appName: 'Fluo',
  welcome: [
    {
      eyebrow: 'Did you know?',
      title: 'It might be your breathing.',
      lines: [
        'Stress, a racing heart, restlessness: often it’s not just the coffee or your colleagues.',
        'Breathing fast, shallow or through the mouth can make exactly these feelings stronger.',
      ],
      closing: 'Here you learn what helps every day, and right now. Your breath is a tool you hold in your own hands.',
    },
    {
      eyebrow: 'Picture this',
      title: 'Your body is like a car.',
      lines: [
        'The heart is the engine, the brain the dashboard with its warning lights. The lungs are the fuel supply: they make everything else possible.',
        'If something’s off there, the engine can start to sputter and the warning lights come on.',
      ],
      closing: 'In a busy day we often forget to refuel. Every calm breath does exactly that.',
    },
    { title: 'Breathe through your nose.', lines: ['It filters, warms and moistens the air.', 'Your natural airway.'] },
    { title: 'Breathe slower. Feel calmer.', lines: ['About 5.5 breaths a minute can calm both body and mind.'] },
    { title: 'Exhaling is underrated.', lines: ['Let the air flow out slowly and easily.', 'Give your exhale time.'] },
    { title: 'Less is often more.', lines: ['Not as much or as deeply as you can,', 'but softly, calmly and evenly.'] },
  ],
  tagline: 'See what your breath moves in you.',
  continueWith: (n, m) => `Continue with ${n} · ${m} min`,
  startWith: (n, m) => `Start with ${n} · ${m} min`,
  otherExercise: 'Another exercise',
  stressed: 'I’m feeling stressed',
  panic: 'Acute help in a panic',
  needTitle: 'What do you need right now?',
  fitsNow: 'Fits now',
  adjust: (n) => `${n}: set duration and pace`,
  firstBreath: {
    pad: 'Hold to breathe in',
    hold: 'Put your finger on the sign and breathe in.',
    holdSub: 'Letting go means breathing out.',
    inhaleSub: 'For as long as you hold.',
    exhaleSub: 'Just let the air go.',
    longer: 'Hold a little longer.',
    welcome: 'Good to have you here.',
    welcomeSub: 'That was your first breath with Fluo.',
  },
  intro: 'See the introduction',
  next: 'Next',
  skip: 'Skip',
  nav: { history: 'History', learn: 'Learn', settings: 'Settings' },
  rhythm: (i, o) => `${i} s in · ${o} s out`,
  nose: 'nose',
  phase: { inhale: 'Inhale', holdIn: 'Hold', exhale: 'Exhale', holdOut: 'Hold' },
  seconds: (s) => `${s} sec`,
  ready: 'Ready',
  paused: 'Paused',
  start: 'Start',
  pause: 'Pause',
  resume: 'Resume',
  restart: 'Skip to the end',
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
  bodyInsights: 'What is happening in your body',
  insightImpact: 'Impact',
  insightPlace: 'Location',
  breathingPace: 'Breathing pace',
  breathingPaceHint: 'Seconds in / out',
  slowDown: 'Slow down over time',
  slowDownHint: 'Gradually reduce the pace',
  showProgress: 'Show session progress',
  showProgressHint: 'Show total time and progress bar',
  breathCues: 'Thoughts while breathing',
  breathCuesHint: 'Short lines above the figure: first something to sense, later a good thought',
  duration: 'Duration',
  sound: 'Sounds',
  vibration: 'Vibration',
  soundOn: 'Turn sounds on',
  soundOff: 'Turn sounds off',
  fullscreen: 'Full screen',
  exitFullscreen: 'Exit full screen',
  fullscreenIos: {
    title: 'Full screen on iPhone',
    steps: ['In Safari, tap the Share icon at the bottom.', 'Choose “Add to Home Screen”.', 'Open Fluo from the new icon on your Home Screen.'],
    note: 'Safari on iPhone does not allow web pages to go full screen. From the Home Screen, though, Fluo opens like an app, without the address bar.',
  },
  visualization: 'View',
  modes: {
    abstract: { label: 'Simple', description: 'A sign that fills with light from below as you breathe' },
    anatomical: { label: 'Anatomical', description: 'Air moving through the nose, airways and lungs' },
  },
  resetView: 'Reset view',
  modelLoading: 'Loading model …',
  modelFallback: '3D is not available on this device. The simple view keeps guiding you.',
  guide: 'Breathing guide',
  progress: 'Progress',
  leadIn: 'Breathe out once more',
  tapForControls: 'Tap to show the controls',
  moodTitle: 'How do you feel right now?',
  moods: ['Very tense', 'Tense', 'Neutral', 'Calm', 'Very calm'],
  moodEnds: ['tense', 'calm'],
  beforeAfter: (b, n) => `Before: ${b} · Now: ${n}`,
  suggestByTime: 'Fits the time of day',
  suggestByExperience: 'Has often helped you at this time',
  historyTitle: 'Your history',
  historyLead: 'Every exercise is a ring. The week grows from the inside out, Monday to Sunday.',
  thisWeek: 'This week',
  previousWeek: 'Week before',
  nextWeek: 'Week after',
  sessions: (n) => (n === 1 ? '1 exercise' : `${n} exercises`),
  weekEmpty: 'No exercise this week yet.',
  legendEmpty: 'Day without an exercise',
  legendWidth: 'The longer, the wider',
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  helpsTitle: 'What helps you',
  helpsLead: 'From your own answers before and after an exercise. Not a measurement.',
  helpsEmpty: 'Once you have answered before and after one exercise three times, you will see here what helps you.',
  helpsChange: (steps, d) => (d === 0 ? 'unchanged on average' : `${steps} ${steps === '1' ? 'step' : 'steps'} ${d > 0 ? 'calmer' : 'more tense'} on average`),
  total: (s, m) => `${s} in total, ${m}`,
  wellDone: 'Well done.',
  back: 'Back',
  done: 'Done',
  learnTitle: 'Learn',
  learnIntro: 'What is behind the exercises and how to do them.',
  learnBasics: 'The basics',
  whyItWorks: 'Why it works',
  howTo: 'How to',
  inspired: 'Inspired by James Nestor’s Breath',
  settingsTitle: 'Settings',
  language: 'Language',
  appearance: 'Appearance',
  themes: { light: 'Light', dark: 'Dark', system: 'System' },
  defaultsHint: 'Duration and pace are set with each exercise.',
  sessionsCompleted: (n) => (n === 1 ? '1 session completed' : `${n} sessions completed`),
  about: 'About Fluo',
  credits: 'Sources and licences',
  anatomyCredit:
    '3D anatomy derived from “Z-Anatomy – The libre 3D atlas of anatomy” (CC BY-SA 4.0) and “BodyParts3D, The Database Center for Life Science” (CC BY-SA 2.1 Japan). The adapted model is licensed CC BY-SA 4.0.',
}

export const messages: Record<Language, Messages> = { de, en }

export function detectLanguage(): Language {
  const lang = typeof navigator !== 'undefined' ? navigator.language : ''
  return lang.toLowerCase().startsWith('en') ? 'en' : 'de'
}
