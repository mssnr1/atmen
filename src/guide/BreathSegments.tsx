import { useEffect, useRef } from 'react'
import type { BreathingEngine } from '../engine'
import { usedAir } from '../visualization/breathState'
import { SEGMENTS, segmentFills } from './segments'

/**
 * The breathing indicator bar. Reads the engine clock on every
 * animation frame and moves the fills directly, so it stays exactly in step
 * with the engine at any pace without re-rendering React.
 */
export function BreathSegments({ engine, label }: { engine: BreathingEngine; label: string }) {
  const fills = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    let frame = 0
    const draw = () => {
      const s = engine.sample()
      const f = segmentFills(s)
      // Blue while breathing in, violet while breathing out, like the air in the 3D view.
      const color = s.status !== 'idle' && usedAir(s.phase.type) ? 'var(--color-violet)' : 'var(--color-blue)'
      f.forEach((fill, i) => {
        const el = fills.current[i]
        if (!el) return
        el.style.left = `${fill.from * 100}%`
        el.style.width = `${Math.max(0, fill.to - fill.from) * 100}%`
        el.style.backgroundColor = color
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [engine])

  return (
    <div className="mx-auto flex max-w-[15rem] justify-center gap-3" role="img" aria-label={label} data-testid="breath-segments">
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span key={i} className="relative h-9 flex-1 overflow-hidden rounded-[10px] bg-surface-2">
          <span
            ref={(el) => {
              fills.current[i] = el
            }}
            data-testid="segment-fill"
            className="absolute inset-y-0 left-0 w-0 bg-blue transition-colors duration-300"
          />
        </span>
      ))}
    </div>
  )
}
