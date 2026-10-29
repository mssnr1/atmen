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
}

/**
 * Renders the chosen visualization, filling the space it is given. Each mode
 * reads its position from the engine clock on every frame, so switching
 * mid-session picks up at exactly the current point of the breath without
 * touching the session.
 */
export function Visualization({ mode, engine, showProgress }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center py-2">
      {mode === 'abstract' ? (
        <AbstractVisualization engine={engine} showProgress={showProgress} />
      ) : (
        <Suspense fallback={null}>
          <Anatomy3DVisualization engine={engine} showProgress={showProgress} />
        </Suspense>
      )}
    </div>
  )
}
