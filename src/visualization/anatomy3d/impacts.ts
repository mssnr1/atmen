import { bodyInsights, insightsShown } from '../../guide/insights'

/**
 * What the figure shows while an insight card is new (Jan, 2026-11-04): each card's
 * effect lights up in the body in the accent colour, pulses slowly five times and
 * fades away again. The order follows the cards (see `bodyInsights`).
 */
export type ImpactKind = 'lungs' | 'vessels' | 'cells' | 'heart' | 'pulse' | 'brain'

/** Which effect each card brings, by the card's id. */
export const IMPACT_OF: Record<string, ImpactKind> = {
  diaphragm: 'lungs', // more breathing volume: the lungs' outline
  oxygen: 'vessels', // blood is enriched: a few vessels through head and body
  co2: 'cells', // cells are supplied: a pattern of cells over the whole body
  hrv: 'heart', // heart rhythm in resonance: the heart's outline
  vagus: 'pulse', // pulse drops: wrists and the carotid arteries
  cortisol: 'brain', // stress drops: the brain
}

/** Pulses per effect and seconds per pulse (slow: about one per breath half). */
export const PULSES = 5
export const PULSE_S = 2.4
export const IMPACT_S = PULSES * PULSE_S

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/**
 * How strongly an effect shows `t` seconds after its card appeared (0..1): it lights
 * up, swells and ebbs `PULSES` times (never quite off in between) and is gone after
 * the last one.
 */
export function impactAmount(t: number): number {
  if (t <= 0 || t >= IMPACT_S) return 0
  const env = smooth(0, 0.6, t) * (1 - smooth(IMPACT_S - PULSE_S * 0.45, IMPACT_S, t))
  const s = Math.sin((Math.PI * t) / PULSE_S)
  return env * (0.32 + 0.68 * s * s)
}

/** The effect running at the moment and how far into it, or null. */
export type ImpactState = { kind: ImpactKind; t: number } | null

/**
 * Follows the cards from the engine's breath count: when a new card appears its
 * effect starts; the clock only runs while the exercise runs (a pause holds it).
 * Back at the start everything resets.
 */
export class ImpactClock {
  private shown = 0
  private current: { kind: ImpactKind; t: number } | null = null

  update(status: string, cycleIndex: number, dt: number): ImpactState {
    if (status === 'idle') {
      this.shown = 0
      this.current = null
      return null
    }
    const cards = bodyInsights.de
    if (status === 'running' || status === 'paused') {
      const n = insightsShown(cycleIndex, cards.length)
      if (n > this.shown) {
        const kind = IMPACT_OF[cards[n - 1].id]
        this.current = kind ? { kind, t: 0 } : null
      }
      this.shown = n
    }
    if (this.current && status !== 'paused') this.current.t += dt
    if (this.current && this.current.t >= IMPACT_S) this.current = null
    return this.current
  }
}
