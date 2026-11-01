import { lazy, Suspense } from 'react'
import type { BreathSource } from './breathState'
import { AbstractVisualization } from './abstract/AbstractVisualization'
import type { Framing } from './anatomy3d/Anatomy3DVisualization'
import type { VisualizationMode } from './modes'

// three.js and the model load only when the anatomical view is first shown.
const Anatomy3DVisualization = lazy(() => import('./anatomy3d/Anatomy3DVisualization').then((m) => ({ default: m.Anatomy3DVisualization })))

interface Props {
  mode: VisualizationMode
  engine: BreathSource
  showProgress: boolean
  /** Height in px of controls that float over the bottom of the area. */
  bottomInset?: number
  /** Height of the bar floating over the top edge; the figure runs on behind it. */
  topInset?: number
  /** Camera framing: before the start, while breathing (from the lead-in on), or after the exercise. */
  framing?: Framing
}

/**
 * Renders the chosen visualization, filling the space it is given. Each mode
 * reads its position from the engine clock on every frame, so switching
 * mid-session picks up at exactly the current point of the breath without
 * touching the session.
 */
export function Visualization({ mode, engine, showProgress, bottomInset = 0, topInset = 0, framing = 'idle' }: Props) {
  // The body runs on behind the floating controls; the abstract view stays clear of them.
  return mode === 'abstract' ? (
    <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: topInset + 8, paddingBottom: bottomInset + 8 }}>
      <AbstractVisualization engine={engine} showProgress={showProgress} />
    </div>
  ) : (
    <div className="absolute inset-0">
      <Suspense fallback={null}>
        <Anatomy3DVisualization engine={engine} showProgress={showProgress} bottomInset={bottomInset} topInset={topInset} framing={framing} />
      </Suspense>
    </div>
  )
}
