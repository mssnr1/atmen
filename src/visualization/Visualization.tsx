import { lazy, Suspense } from 'react'
import type { BreathingEngine } from '../engine'
import { AbstractVisualization } from './abstract/AbstractVisualization'
import type { VisualizationMode } from './modes'

// three.js and the model load only when the anatomical view is first shown.
const Anatomy3DVisualization = lazy(() => import('./anatomy3d/Anatomy3DVisualization').then((m) => ({ default: m.Anatomy3DVisualization })))

interface Props {
  mode: VisualizationMode
  engine: BreathingEngine
  showProgress: boolean
  /** Height in px of controls that float over the bottom of the area. */
  bottomInset?: number
}

/**
 * Renders the chosen visualization, filling the space it is given. Each mode
 * reads its position from the engine clock on every frame, so switching
 * mid-session picks up at exactly the current point of the breath without
 * touching the session.
 */
export function Visualization({ mode, engine, showProgress, bottomInset = 0 }: Props) {
  // The body runs on behind the floating controls; the abstract view stays clear of them.
  return mode === 'abstract' ? (
    <div className="absolute inset-0 flex items-center justify-center pt-2" style={{ paddingBottom: bottomInset + 8 }}>
      <AbstractVisualization engine={engine} showProgress={showProgress} />
    </div>
  ) : (
    <div className="absolute inset-0">
      <Suspense fallback={null}>
        <Anatomy3DVisualization engine={engine} showProgress={showProgress} bottomInset={bottomInset} />
      </Suspense>
    </div>
  )
}
