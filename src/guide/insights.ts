import type { Language } from '../i18n'

/**
 * Small cards that appear beside the head during a session and name what slow
 * breathing does in the body. Wording stays cautious ("kann", "hilft"): these
 * are well-described mechanisms, not promises about any single session.
 * Values are rough textbook ranges, shown only where they are well established.
 */
export interface BodyInsight {
  id: string
  /** The technical term, shown small above the title. */
  term: string
  title: string
  /** A few words for narrow phone screens. */
  short: string
  /** An optional rough reference value. */
  value?: string
}

export const bodyInsights: Record<Language, BodyInsight[]> = {
  de: [
    { id: 'diaphragm', term: 'Diaphragma', title: 'Das Zwerchfell senkt sich, die Lunge füllt sich von unten', short: 'Zwerchfell senkt sich', value: 'ruhig ≈ 1–2 cm · tief bis ≈ 7 cm' },
    { id: 'oxygen', term: 'Alveolärer Gasaustausch', title: 'Sauerstoff wandert aus den Lungenbläschen ins Blut', short: 'Sauerstoff geht ins Blut', value: 'SpO₂ in Ruhe meist 95–99 %' },
    { id: 'co2', term: 'Bohr-Effekt', title: 'CO₂ hilft dem Blut, Sauerstoff ans Gewebe abzugeben', short: 'CO₂ löst Sauerstoff', value: 'pCO₂ normal ≈ 35–45 mmHg' },
    { id: 'hrv', term: 'Respiratorische Sinusarrhythmie', title: 'Dein Herzschlag schwingt mit dem Atem mit', short: 'Herz schwingt mit', value: 'am stärksten bei ≈ 6 Atemzügen/min' },
    { id: 'vagus', term: 'Nervus vagus · Acetylcholin', title: 'Langes Ausatmen bremst den Herzschlag sanft', short: 'Herzschlag wird ruhiger' },
    { id: 'cortisol', term: 'Parasympathikus · Cortisol', title: 'Der Körper kann auf Ruhe umschalten, Stresssignale lassen nach', short: 'Stress kann nachlassen' },
  ],
  en: [
    { id: 'diaphragm', term: 'Diaphragm', title: 'Your diaphragm moves down, the lungs fill from below', short: 'Diaphragm moves down', value: 'quiet ≈ 1–2 cm · deep up to ≈ 7 cm' },
    { id: 'oxygen', term: 'Alveolar gas exchange', title: 'Oxygen passes from the air sacs into your blood', short: 'Oxygen enters the blood', value: 'SpO₂ at rest usually 95–99 %' },
    { id: 'co2', term: 'Bohr effect', title: 'CO₂ helps your blood release oxygen to the tissues', short: 'CO₂ frees oxygen', value: 'pCO₂ normal ≈ 35–45 mmHg' },
    { id: 'hrv', term: 'Respiratory sinus arrhythmia', title: 'Your heartbeat rises and falls with your breath', short: 'Heart sways along', value: 'strongest at ≈ 6 breaths/min' },
    { id: 'vagus', term: 'Vagus nerve · acetylcholine', title: 'A long exhale gently slows the heartbeat', short: 'Heartbeat slows' },
    { id: 'cortisol', term: 'Parasympathetic · cortisol', title: 'Your body can shift towards rest, stress signals ease', short: 'Stress can ease' },
  ],
}

/** The first card comes with the second inhale, then one more every `EVERY` breaths. */
export const INSIGHT_FIRST_CYCLE = 1
export const INSIGHT_EVERY = 2

/** How many cards are showing once breath `cycleIndex` (0-based) has begun. */
export function insightsShown(cycleIndex: number, total: number): number {
  if (cycleIndex < INSIGHT_FIRST_CYCLE) return 0
  return Math.min(total, Math.floor((cycleIndex - INSIGHT_FIRST_CYCLE) / INSIGHT_EVERY) + 1)
}
