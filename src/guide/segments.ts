import type { EngineSnapshot } from '../engine'

export const SEGMENTS = 4

/** The filled part of one segment, as fractions of its width from the left. */
export interface SegmentFill {
  from: number
  to: number
}

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)

/**
 * The four segments show one phase, not the session. Breathing in, blue fills
 * them from the left until all four are full. Breathing out, the blue keeps
 * moving right and leaves them, so they empty from the left. Fills are
 * continuous within a segment.
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
