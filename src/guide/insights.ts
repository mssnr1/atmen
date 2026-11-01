import type { Language } from '../i18n'

/**
 * Small heads-up cards that appear beside the head during a session and name
 * what slow breathing does in the body. Jan wants them assertive and
 * motivating (present tense, "senkt" not "kann senken"); they name real,
 * well-described mechanisms. Values are rough textbook ranges only.
 */
export interface BodyInsight {
  id: string
  /** The technical term, shown small above the title. */
  term: string
  /** Shown from tablet width; phones show the term and the impact only. */
  title: string
  /** The positive result, shown with a small "Wirkung" label. */
  impact: string
  /** An optional rough reference value. */
  value?: string
}

export const bodyInsights: Record<Language, BodyInsight[]> = {
  de: [
    { id: 'diaphragm', term: 'Diaphragma', title: 'Das Zwerchfell senkt sich, die Lunge füllt sich bis tief nach unten', impact: 'Mehr Atemvolumen', value: 'ruhig ≈ 1–2 cm · tief bis ≈ 7 cm' },
    { id: 'oxygen', term: 'Alveolärer Gasaustausch', title: 'Sauerstoff strömt aus den Lungenbläschen in dein Blut', impact: 'Blut wird angereichert', value: 'SpO₂ in Ruhe 95–99 %' },
    { id: 'co2', term: 'Bohr-Effekt', title: 'CO₂ bleibt im Gleichgewicht und löst Sauerstoff ins Gewebe', impact: 'Zellen werden versorgt', value: 'pCO₂ ≈ 35–45 mmHg' },
    { id: 'hrv', term: 'Respiratorische Sinusarrhythmie', title: 'Dein Herzschlag schwingt im Takt deines Atems', impact: 'Herzrhythmus in Resonanz', value: 'Resonanz bei ≈ 6 Atemzügen/min' },
    { id: 'vagus', term: 'Nervus vagus\u00a0· Acetylcholin', title: 'Der Vagusnerv schüttet Acetylcholin aus und bremst den Herzschlag', impact: 'Puls sinkt' },
    { id: 'cortisol', term: 'Parasympathikus\u00a0· Cortisol', title: 'Dein Körper schaltet auf Ruhe um, das Stresslevel senkt sich', impact: 'Stress sinkt' },
  ],
  en: [
    { id: 'diaphragm', term: 'Diaphragm', title: 'Your diaphragm moves down, the lungs fill deep from below', impact: 'More breathing volume', value: 'quiet ≈ 1–2 cm · deep up to ≈ 7 cm' },
    { id: 'oxygen', term: 'Alveolar gas exchange', title: 'Oxygen flows from the air sacs into your blood', impact: 'Blood is enriched', value: 'SpO₂ at rest 95–99 %' },
    { id: 'co2', term: 'Bohr effect', title: 'CO₂ stays in balance and releases oxygen to your tissues', impact: 'Cells are supplied', value: 'pCO₂ ≈ 35–45 mmHg' },
    { id: 'hrv', term: 'Respiratory sinus arrhythmia', title: 'Your heartbeat sways in time with your breath', impact: 'Heart rhythm in resonance', value: 'resonance at ≈ 6 breaths/min' },
    { id: 'vagus', term: 'Vagus nerve\u00a0· acetylcholine', title: 'Your vagus nerve releases acetylcholine and slows the heartbeat', impact: 'Pulse drops' },
    { id: 'cortisol', term: 'Parasympathetic\u00a0· cortisol', title: 'Your body shifts into rest, your stress level goes down', impact: 'Stress drops' },
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
