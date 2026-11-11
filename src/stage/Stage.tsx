import { useEffect, useState } from 'react'
import { useStore } from '../storage/store'
import { Visualization } from '../visualization/Visualization'
import { stageSource, useStageState } from './stage'

/**
 * The figure, rendered once behind every screen. It mounts with the first screen that shows it (or that
 * asks for it ahead, see `useStageAhead`) and then stays: screens that do not show it only pause its
 * render loop, so coming back costs nothing. It comes into view slowly and leaves a little quicker.
 */
export function Stage() {
  const s = useStageState()
  const mode = useStore((d) => d.preferences.visualizationMode)
  const showProgress = useStore((d) => d.preferences.showProgress)
  const wanted = s.active || s.ahead
  const [mounted, setMounted] = useState(wanted)
  useEffect(() => {
    if (wanted) setMounted(true)
  }, [wanted])
  if (!mounted) return null
  return (
    <div
      className={`fixed inset-0 z-0 transition-opacity ${s.active ? 'opacity-100 duration-1000' : 'pointer-events-none opacity-0 duration-700'}`}
      aria-hidden={!s.active}
      data-testid="stage"
    >
      <Visualization
        mode={mode}
        engine={stageSource}
        showProgress={showProgress && s.framing !== 'start'}
        bottomInset={s.bottomInset}
        topInset={s.topInset}
        framing={s.framing}
        paused={!s.active}
        interactive={s.interactive}
      />
    </div>
  )
}
