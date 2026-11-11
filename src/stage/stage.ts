import { useEffect, useSyncExternalStore } from 'react'
import type { Framing } from '../visualization/anatomy3d/Anatomy3DVisualization'
import type { BreathSource } from '../visualization/breathState'
import { ambientSource } from './ambient'

/**
 * The app is one room: the figure stands on a stage behind the screens, and a screen only says where the
 * camera is and what the figure breathes with. Start and practice share the figure, so going from one to
 * the other is a camera move, not a new page.
 */
export interface StageView {
  /** What the figure breathes with: the ambient breath, or a session. */
  source: BreathSource
  framing: Framing
  /** Height in px of what floats over the bottom and top of the view. */
  bottomInset?: number
  topInset?: number
  /** The figure can be turned and zoomed. */
  interactive?: boolean
}

interface StageState extends Required<StageView> {
  /** A screen is showing the figure. */
  active: boolean
  /** A screen that covers the figure wants it made ready behind it. */
  ahead: boolean
}

let state: StageState = { active: false, ahead: false, source: ambientSource, framing: 'start', bottomInset: 0, topInset: 0, interactive: false }
const listeners = new Set<() => void>()

function set(patch: Partial<StageState>) {
  const next = { ...state, ...patch }
  if ((Object.keys(next) as (keyof StageState)[]).every((k) => next[k] === state[k])) return
  state = next
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** The source the canvas reads: always the current screen's, under one identity, so the scene never remounts. */
export const stageSource: BreathSource = { sample: () => state.source.sample() }

export const useStageState = () => useSyncExternalStore(subscribe, () => state)

/** Puts the figure on stage for as long as the calling screen is shown. */
export function useStage({ source, framing, bottomInset = 0, topInset = 0, interactive = false }: StageView) {
  useEffect(() => {
    set({ active: true, source, framing, bottomInset, topInset, interactive })
  }, [source, framing, bottomInset, topInset, interactive])
  useEffect(() => () => set({ active: false, interactive: false }), [])
}

/**
 * Has the figure made ready behind the calling screen, which covers it: loaded, built and drawn once,
 * then at rest. The screen that shows it next only has to let it fade in.
 */
export function useStageAhead() {
  useEffect(() => {
    set({ ahead: true })
    return () => set({ ahead: false })
  }, [])
}
