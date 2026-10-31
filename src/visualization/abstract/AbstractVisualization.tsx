import { useEffect, useRef } from 'react'
import type { BreathingEngine } from '../../engine'
import { breathState, type BreathState } from '../breathState'

const MIN_SCALE = 0.42
const MAX_SCALE = 1
const RING_RADIUS = 48
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

/** The circle's size follows lung volume. */
export const scaleFor = (b: BreathState) => MIN_SCALE + (MAX_SCALE - MIN_SCALE) * b.volume

interface Props {
  engine: BreathingEngine
  /** Draw the session ring; off when session progress is hidden. */
  showProgress: boolean
}

/**
 * Simple Abstract mode. Draws the expanding/contracting circle and the session ring. It samples the
 * engine's clock on every animation frame and writes styles directly, so the
 * motion stays in sync with the timer without re-rendering React at 60 fps.
 */
export function AbstractVisualization({ engine, showProgress }: Props) {
  const orb = useRef<HTMLDivElement>(null)
  const halo = useRef<HTMLDivElement>(null)
  const ring = useRef<SVGCircleElement>(null)

  useEffect(() => {
    let frame = 0
    const draw = () => {
      const s = engine.sample()
      const scale = scaleFor(breathState(s))
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
    <div className="relative aspect-square h-full max-h-[22rem] max-w-full" data-testid="abstract-visualization">
      <svg viewBox="0 0 100 100" className={`absolute inset-0 -rotate-90 ${showProgress ? '' : 'invisible'}`} aria-hidden>
        <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="1" className="text-surface-2" />
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
        <div ref={halo} className="absolute inset-0 rounded-full bg-blue/20 blur-2xl will-change-transform" />
        <div
          ref={orb}
          data-testid="breathing-orb"
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_38%,#dce8ff_0%,#7ea6fa_45%,#2f6bf5_100%)] shadow-[0_0_60px_-10px_rgba(47,107,245,0.45)] will-change-transform"
          style={{ transform: `scale(${MIN_SCALE})` }}
        />
      </div>
    </div>
  )
}
