import { useEffect, useRef } from 'react'
import type { BreathingEngine } from '../../engine'
import { breathState } from '../breathState'
import { airflowState } from './airflow'
import { AirVolumeRenderer } from './AirVolumeRenderer'
import { BodyFigure, updateBody, useBodyRefs } from './BodyFigure'
import { VIEW, bodyPose } from './model'

/**
 * Anatomical Flow mode. One animation loop samples the engine, derives the
 * body pose and airflow from the same breath state, and updates the SVG body
 * and the WebGL air volume together, so they can never drift apart.
 */
export function AnatomicalVisualization({ engine }: { engine: BreathingEngine }) {
  const refs = useBodyRefs()
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const renderer = canvas.current ? AirVolumeRenderer.create(canvas.current) : null
    const observer = renderer && canvas.current ? new ResizeObserver(() => renderer.resize()) : null
    if (observer && canvas.current) observer.observe(canvas.current)
    renderer?.resize()

    let frame = 0
    let last = performance.now()
    let drift = 0 // ambient motion clock; stops while paused so the scene holds still
    const draw = (now: number) => {
      const snapshot = engine.sample()
      if (snapshot.status !== 'paused') drift += Math.min(now - last, 100) / 1000
      last = now
      const b = breathState(snapshot)
      const pose = bodyPose(b.volume)
      updateBody(refs, pose, renderer ? undefined : b.volume)
      renderer?.render(airflowState(b), pose, drift)
      frame = requestAnimationFrame(draw)
    }
    draw(performance.now())
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      renderer?.dispose()
    }
    // refs is a stable bag of refs, so only the engine matters
  }, [engine])

  return (
    <div
      className="relative h-full max-w-full"
      style={{ aspectRatio: `${VIEW.width} / ${VIEW.height}` }}
      data-testid="anatomical-visualization"
    >
      <BodyFigure refs={refs} />
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" data-testid="air-volume" />
    </div>
  )
}
