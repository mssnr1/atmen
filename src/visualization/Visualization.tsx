import type { BreathingEngine } from '../engine'
import { AbstractVisualization } from './abstract/AbstractVisualization'
import { AnatomicalVisualization } from './anatomical/AnatomicalVisualization'
import type { VisualizationMode } from './modes'

interface Props {
  mode: VisualizationMode
  engine: BreathingEngine
}

/**
 * Renders the chosen visualization, filling the space it is given. Each mode
 * reads its position from the engine clock on every frame, so switching
 * mid-session picks up at exactly the current point of the breath without
 * touching the session.
 */
export function Visualization({ mode, engine }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center py-2">
      {mode === 'abstract' ? <AbstractVisualization engine={engine} /> : <AnatomicalVisualization engine={engine} />}
    </div>
  )
}
