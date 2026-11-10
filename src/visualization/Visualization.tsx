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
  /** Camera framing: the start screen, before an exercise, while breathing (from the lead-in on), or after it. */
  framing?: Framing
  /** Nothing is drawn while paused (the figure is hidden behind another screen). */
  paused?: boolean
  /** The figure can be turned and zoomed. */
  interactive?: boolean
}

/**
 * Renders the chosen visualization, filling the space it is given. Each mode
 * reads its position from the engine clock on every frame, so switching
 * mid-session picks up at exactly the current point of the breath without
 * touching the session.
 */
export function Visualization({ mode, engine, showProgress, bottomInset = 0, topInset = 0, framing = 'idle', paused = false, interactive = true }: Props) {
  // The body runs on behind the floating controls; the simple view stays clear of them.
  if (mode === 'abstract') {
    // On the start screen the sign sits where the lungs would: in the upper middle, above the text.
    const pad = framing === 'start' ? { paddingTop: '14dvh', paddingBottom: '46dvh' } : { paddingTop: topInset + 8, paddingBottom: bottomInset + 8 }
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8" style={pad}>
        {!paused && <AbstractVisualization engine={engine} showProgress={showProgress} />}
      </div>
    )
  }
  return (
    <div className="absolute inset-0">
      <Suspense fallback={null}>
        <Anatomy3DVisualization
          engine={engine}
          showProgress={showProgress}
          bottomInset={bottomInset}
          topInset={topInset}
          framing={framing}
          paused={paused}
          interactive={interactive}
        />
      </Suspense>
    </div>
  )
}
