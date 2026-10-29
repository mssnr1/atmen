import { useEffect, useRef, type ReactNode } from 'react'
import type { BreathingEngine, EngineSnapshot } from '../engine'

const MIN_SCALE = 0.42
const MAX_SCALE = 1
const RING_RADIUS = 48
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

/** Breathing feels sinusoidal: slow at the turns, fastest mid-breath. */
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/** Animation only: maps an engine position to a circle size (0..1 of full). */
export function scaleFor(s: EngineSnapshot): number {
  if (s.status === 'idle') return MIN_SCALE
  const range = MAX_SCALE - MIN_SCALE
  const t = easeInOutSine(Math.min(Math.max(s.phaseProgress, 0), 1))
  switch (s.phase.type) {
    case 'inhale':
      return MIN_SCALE + range * t
    case 'exhale':
      return MAX_SCALE - range * t
    case 'holdIn':
      return MAX_SCALE
    case 'holdOut':
      return MIN_SCALE
  }
}

interface Props {
  engine: BreathingEngine
  children?: ReactNode
}

/**
 * Draws the expanding/contracting circle and the session ring. It samples the
 * engine's clock on every animation frame and writes styles directly, so the
 * motion stays in sync with the timer without re-rendering React at 60 fps.
 */
export function BreathingIndicator({ engine, children }: Props) {
  const orb = useRef<HTMLDivElement>(null)
  const halo = useRef<HTMLDivElement>(null)
  const ring = useRef<SVGCircleElement>(null)

  useEffect(() => {
    let frame = 0
    const draw = () => {
      const s = engine.sample()
      const scale = scaleFor(s)
      if (orb.current) orb.current.style.transform = `scale(${scale})`
      if (halo.current) {
        halo.current.style.transform = `scale(${scale * 1.18})`
        halo.current.style.opacity = `${0.15 + 0.35 * ((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE))}`
      }
      if (ring.current) ring.current.style.strokeDashoffset = `${RING_LENGTH * (1 - s.progress)}`
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [engine])

  return (
    <div className="relative aspect-square w-[min(78vw,20rem,32dvh)]" data-testid="breathing-indicator">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="1" className="text-white/10" />
        <circle
          ref={ring}
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH}
          className="text-accent"
        />
      </svg>
      <div className="absolute inset-[6%]">
        <div ref={halo} className="absolute inset-0 rounded-full bg-accent/30 blur-2xl will-change-transform" />
        <div
          ref={orb}
          data-testid="breathing-orb"
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,#d6faf3_0%,#7ed9cb_45%,#2c8f8a_100%)] shadow-[0_0_60px_-10px_rgba(126,217,203,0.6)] will-change-transform"
          style={{ transform: `scale(${MIN_SCALE})` }}
        />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}
