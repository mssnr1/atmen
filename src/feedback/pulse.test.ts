import { describe, expect, it } from 'vitest'
import { ringMoments } from '../lib/lungRings'
import { PULSE_RATE, pulseTrack } from './pulse'

/** The loudest sample in a stretch of the track. */
function peak(data: Float32Array, from: number, to: number): number {
  let max = 0
  for (let i = Math.max(0, Math.floor(from)); i < Math.min(data.length, Math.ceil(to)); i++) max = Math.max(max, Math.abs(data[i]))
  return max
}

describe('pulseTrack', () => {
  for (const kind of ['inhale', 'exhale'] as const) {
    it(`is a clean piece of sound for ${kind}`, () => {
      const data = pulseTrack(kind, 5.5)
      expect(data.every((v) => Number.isFinite(v))).toBe(true)
      // Room to spare below full scale, and nothing cut off at either end.
      expect(peak(data, 0, data.length)).toBeLessThan(0.9)
      expect(Math.abs(data[0])).toBeLessThan(1e-3)
      expect(Math.abs(data[data.length - 1])).toBeLessThan(1e-3)
    })

    it(`pulses with every ring for ${kind}`, () => {
      const dur = 8
      const data = pulseTrack(kind, dur)
      const moments = ringMoments(kind)
      // Silent until the first ring, and sounding right after each one.
      expect(peak(data, 0, moments[0].at * dur * PULSE_RATE - 1)).toBe(0)
      for (const m of moments) {
        const at = m.at * dur * PULSE_RATE
        expect(peak(data, at, at + 0.03 * PULSE_RATE)).toBeGreaterThan(0.1)
      }
    })
  }

  it('makes no sudden jumps', () => {
    const data = pulseTrack('inhale', 4)
    let jump = 0
    for (let i = 1; i < data.length; i++) jump = Math.max(jump, Math.abs(data[i] - data[i - 1]))
    // A pulse holds next to nothing above 700 Hz, and a tone of 1000 Hz moves at most this share of its
    // height from one sample to the next. A click would be a step of about the full height.
    expect(jump).toBeLessThan(((2 * Math.PI * 1000) / PULSE_RATE) * peak(data, 0, data.length))
  })
})
