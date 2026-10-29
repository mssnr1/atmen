import type { BreathingEngine, EngineStatus } from '../engine'
import { AbstractVisualization } from './abstract/AbstractVisualization'
import { AnatomicalVisualization } from './anatomical/AnatomicalVisualization'
import type { VisualizationMode } from './modes'

interface Props {
  mode: VisualizationMode
  engine: BreathingEngine
  status: EngineStatus
}

/**
 * Renders the chosen visualization. Each mode reads its position from the
 * engine clock on every frame, so switching mid-session picks up at exactly
 * the current point of the breath without touching the session.
 */
export function Visualization({ mode, engine, status }: Props) {
  const active = status === 'running' || status === 'paused'
  const height =
    mode === 'abstract' ? 'h-[min(78vw,20rem,32dvh)]' : active ? 'h-[min(52dvh,34rem)]' : 'h-[min(36dvh,24rem)]'
  return (
    <div className={`flex w-full justify-center transition-[height] duration-500 ${height}`}>
      {mode === 'abstract' ? <AbstractVisualization engine={engine} /> : <AnatomicalVisualization engine={engine} />}
    </div>
  )
}
