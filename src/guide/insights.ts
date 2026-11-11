import type { Language } from '../i18n'

/**
 * Small heads-up cards that appear beside the head during a session and name
 * what slow breathing does in the body. Jan wants them assertive and
 * motivating (present tense, "senkt" not "kann senken"); they name real,
 * well-described mechanisms. Values are rough textbook ranges only.
 */
export interface BodyInsight {
  id: string
  /** Where in the body it happens, the top half of the card. */
  place: string
  /** The technical term, shown small under the place. */
  term: string
  /** The whole process in one sentence (screen readers; kept for a later detail view). */
  title: string
  /** The positive result, shown with a small "Wirkung" label. */
  impact: string
  /** An optional rough reference value. */
  value?: string
}

export const bodyInsights: Record<Language, BodyInsight[]> = {
  de: [
    { id: 'diaphragm', place: 'Zwerchfell', term: 'Diaphragma-Kontraktion', title: 'Das Zwerchfell senkt sich, die Lunge füllt sich bis tief nach unten', impact: 'Mehr Atemvolumen', value: 'ruhig ≈ 1–\u20602\u00a0cm · tief bis ≈\u00a07\u00a0cm' },
    { id: 'oxygen', place: 'Lungenbläschen', term: 'Alveolärer Gasaustausch', title: 'Sauerstoff strömt aus den Lungenbläschen in dein Blut', impact: 'Blut wird angereichert', value: 'SpO₂ in Ruhe 95–\u206099\u00a0%' },
    { id: 'co2', place: 'Blut & Gewebe', term: 'Bohr-Effekt', title: 'CO₂ bleibt im Gleichgewicht und löst Sauerstoff ins Gewebe', impact: 'Zellen werden versorgt', value: 'pCO₂ ≈ 35–\u206045\u00a0mmHg' },
    { id: 'hrv', place: 'Herz', term: 'Respiratorische Sinusarrhythmie', title: 'Dein Herzschlag schwingt im Takt deines Atems', impact: 'Herzrhythmus in Resonanz', value: 'Resonanz bei ≈ 6 Atemzügen/min' },
    { id: 'vagus', place: 'Vagusnerv', term: 'Acetylcholin', title: 'Der Vagusnerv schüttet Acetylcholin aus und bremst den Herzschlag', impact: 'Puls sinkt' },
    { id: 'cortisol', place: 'Nervensystem', term: 'Parasympathikus\u00a0· Cortisol', title: 'Dein Körper schaltet auf Ruhe um, das Stresslevel senkt sich', impact: 'Stress sinkt' },
  ],
  en: [
    { id: 'diaphragm', place: 'Diaphragm', term: 'Diaphragm contraction', title: 'Your diaphragm moves down, the lungs fill deep from below', impact: 'More breathing volume', value: 'quiet ≈ 1–\u20602\u00a0cm · deep up to ≈\u00a07\u00a0cm' },
    { id: 'oxygen', place: 'Air sacs', term: 'Alveolar gas exchange', title: 'Oxygen flows from the air sacs into your blood', impact: 'Blood is enriched', value: 'SpO₂ at rest 95–\u206099\u00a0%' },
    { id: 'co2', place: 'Blood & tissue', term: 'Bohr effect', title: 'CO₂ stays in balance and releases oxygen to your tissues', impact: 'Cells are supplied', value: 'pCO₂ ≈ 35–\u206045\u00a0mmHg' },
    { id: 'hrv', place: 'Heart', term: 'Respiratory sinus arrhythmia', title: 'Your heartbeat sways in time with your breath', impact: 'Heart rhythm in resonance', value: 'resonance at ≈ 6 breaths/min' },
    { id: 'vagus', place: 'Vagus nerve', term: 'Acetylcholine', title: 'Your vagus nerve releases acetylcholine and slows the heartbeat', impact: 'Pulse drops' },
    { id: 'cortisol', place: 'Nervous system', term: 'Parasympathetic\u00a0· cortisol', title: 'Your body shifts into rest, your stress level goes down', impact: 'Stress drops' },
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
