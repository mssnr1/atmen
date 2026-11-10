import { useEffect, useState } from 'react'
import { useStore } from '../storage/store'
import { Visualization } from '../visualization/Visualization'
import { stageSource, useStageState } from './stage'

/**
 * The figure, rendered once behind every screen. It mounts with the first screen that shows it and then
 * stays: screens that do not show it only pause its render loop, so coming back costs nothing.
 */
export function Stage() {
  const s = useStageState()
  const mode = useStore((d) => d.preferences.visualizationMode)
  const showProgress = useStore((d) => d.preferences.showProgress)
  const [mounted, setMounted] = useState(s.active)
  useEffect(() => {
    if (s.active) setMounted(true)
  }, [s.active])
  if (!mounted) return null
  return (
    <div
      className={`fixed inset-0 z-0 transition-opacity duration-700 ${s.active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
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
