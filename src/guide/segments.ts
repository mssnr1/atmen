import type { EngineSnapshot } from '../engine'

export const SEGMENTS = 1

/** The filled part of one segment, as fractions of its width from the left. */
export interface SegmentFill {
  from: number
  to: number
}

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)

/**
 * The indicator shows one phase, not the session. Breathing in, blue fills it
 * from the left until it is full. Breathing out, the fill (now violet) keeps moving right
 * and leaves it, so it empties from the left. With more than one segment the
 * fill runs through them in turn.
 */
export function segmentFills(s: Pick<EngineSnapshot, 'status' | 'phase' | 'phaseProgress'>): SegmentFill[] {
  const p = clamp01(s.phaseProgress)
  return Array.from({ length: SEGMENTS }, (_, i) => {
    const local = clamp01(p * SEGMENTS - i)
    if (s.status === 'idle') return { from: 0, to: 0 }
    switch (s.phase.type) {
      case 'inhale':
        return { from: 0, to: local }
      case 'exhale':
        return { from: local, to: 1 }
      case 'holdIn':
        return { from: 0, to: 1 }
      case 'holdOut':
        return { from: 0, to: 0 }
    }
  })
}
