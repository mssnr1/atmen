import { useEffect, useRef } from 'react'
import { BreathSign } from '../../components/BreathSign'
import { breathState, type BreathSource } from '../breathState'

const RING_RADIUS = 48
const RING_LENGTH = 2 * Math.PI * RING_RADIUS
/** Light lines in the sign: more than in the logo, so the breath rises in fine steps. */
const LINES = 11

interface Props {
  engine: BreathSource
  /** Draw the session ring; off when session progress is hidden. */
  showProgress: boolean
}

/**
 * The simple view, made of the same material as the lungs: the breath sign, whose lines fill with light
 * from below on the inhale and empty on the exhale. It samples the engine's clock on every animation
 * frame and writes styles directly, so the motion stays in sync with the timer without re-rendering
 * React at 60 fps.
 */
export function AbstractVisualization({ engine, showProgress }: Props) {
  const sign = useRef<SVGSVGElement>(null)
  const ring = useRef<SVGCircleElement>(null)

  useEffect(() => {
    let frame = 0
    const draw = () => {
      const s = engine.sample()
      const { volume } = breathState(s)
      if (sign.current) {
        sign.current.style.setProperty('--lv', volume.toFixed(4))
        sign.current.style.transform = `scale(${(0.94 + 0.06 * volume).toFixed(4)})`
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
        <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="0.6" className="text-line" />
        <circle
          ref={ring}
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH}
          className="text-ink-2"
        />
      </svg>
      <BreathSign ref={sign} n={LINES} className="absolute inset-[9%] size-[82%] text-ink will-change-transform" style={{ ['--lv' as string]: 0 }} />
    </div>
  )
}
