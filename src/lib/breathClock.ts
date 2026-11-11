/**
 * The one rhythm of the app outside a session: 5.5 s in, 5.5 s out. Everything that moves on its own
 * (the figure on the start screen, the wordmark, the breath sign) reads this clock, so nothing runs on
 * a timer of its own. During an exercise the session engine takes over.
 */
export const AMBIENT_HALF_MS = 5500
export const AMBIENT_CYCLE_MS = 2 * AMBIENT_HALF_MS

/** How lung volume follows a breath: starts and ends more gently than a sine (smootherstep). */
export const breathCurve = (t: number) => t * t * t * (t * (6 * t - 15) + 10)

/** Progress 0..1 of a breath phase at which `breathCurve` reaches `level`. */
export function inverseBreathCurve(level: number): number {
  if (!(level > 0)) return 0
  if (level >= 1) return 1
  let lo = 0
  let hi = 1
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2
    if (breathCurve(mid) < level) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const t0 = now()

/** Milliseconds on the ambient clock; it starts when the app loads. */
export const ambientMs = () => now() - t0

/** Where the ambient breath stands at `ms`: the phase, its progress 0..1 and the level 0..1 (0 = breathed out). */
export function ambientAt(ms: number): { inhale: boolean; phaseProgress: number; level: number } {
  const p = (((ms % AMBIENT_CYCLE_MS) + AMBIENT_CYCLE_MS) % AMBIENT_CYCLE_MS) / AMBIENT_CYCLE_MS
  const inhale = p < 0.5
  const phaseProgress = inhale ? p * 2 : p * 2 - 1
  return { inhale, phaseProgress, level: inhale ? breathCurve(phaseProgress) : 1 - breathCurve(phaseProgress) }
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** The level shown where nothing should move. */
export const REST_LEVEL = 0.62

const attached = new Set<HTMLElement | SVGElement>()
let frame = 0

function tick() {
  const level = ambientAt(ambientMs()).level.toFixed(4)
  for (const el of attached) el.style.setProperty('--b', level)
  frame = attached.size ? requestAnimationFrame(tick) : 0
}

/**
 * Lets an element breathe: writes the ambient level to its `--b` custom property on every frame, for CSS
 * to use (see `.breath-sign`, `.fluo-mono.live`). Returns the function that stops it. Only the elements
 * attached are touched, so the rest of the page is not restyled 60 times a second.
 */
export function attachBreath(el: HTMLElement | SVGElement): () => void {
  if (prefersReducedMotion()) {
    el.style.setProperty('--b', String(REST_LEVEL))
    return () => {}
  }
  attached.add(el)
  if (!frame) frame = requestAnimationFrame(tick)
  return () => {
    attached.delete(el)
    if (!attached.size && frame) {
      cancelAnimationFrame(frame)
      frame = 0
    }
  }
}

/** A ref callback for `attachBreath`: `<div ref={breathRef}>`. */
export const breathRef = (el: HTMLElement | SVGElement | null) => (el ? attachBreath(el) : undefined)
