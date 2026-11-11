import { ringMoments } from '../lib/lungRings'
import { fitted } from './breathBuffers'
import type { PadKind } from './pads'

/**
 * A deep, soft pulse for every ring of the lungs: breathing in, one as each ring lights from the bottom
 * up; breathing out, one as each goes dark from the top down. The moments come from the same curve that
 * moves the picture, so the ear counts what the eye sees.
 *
 * A phase's pulses are written into one small buffer here and played as a single sound, so they cost
 * the audio thread next to nothing while breathing.
 */

/** Level of the pulses against the breath sound. */
export const PULSE_LEVEL = 0.49
/** The pulse tracks hold nothing above a few hundred hertz, so a low sample rate is plenty. */
export const PULSE_RATE = 24000
/** Length of one pulse, and the time it takes to swell in. */
const PULSE_S = 0.24
const ATTACK_S = 0.008
/** Pitch of the lowest and of the highest ring's pulse (Hz). */
const LOW_HZ = 66
const HIGH_HZ = 82

/** The pulse track of one phase of `dur` seconds, as samples at `rate`. */
export function pulseTrack(kind: PadKind, dur: number, rate = PULSE_RATE): Float32Array {
  const moments = ringMoments(kind)
  const data = new Float32Array(Math.ceil((dur + PULSE_S) * rate) + 1)
  moments.forEach((m, i) => {
    const height = m.of > 1 ? m.ring / (m.of - 1) : 0
    // Deeper low in the lungs, a little higher toward the top; breathing out sits a shade lower.
    const pitch = (LOW_HZ + (HIGH_HZ - LOW_HZ) * height) * (kind === 'inhale' ? 1 : 0.94)
    // Breathing in, the pulses grow as the lungs fill; breathing out they sink away with the air.
    const level = kind === 'inhale' ? 0.62 + 0.3 * height : 0.4 + 0.36 * height
    // The last one marks the turn of the breath.
    const turn = i === moments.length - 1 ? 1.25 : 1
    addPulse(data, Math.round(m.at * dur * rate), pitch, level * turn, rate, m.ring)
  })
  return data
}

/**
 * One pulse, built like a soft drum. Its body is a low tone that drops a little as it begins and is
 * gone in a quarter of a second, with overtones that die sooner. Its skin is a short, muffled knock of
 * noise. Small speakers cannot move the body's ground tone at all: there the knock and the overtones
 * carry the pulse, and the ear still reads it as deep.
 */
function addPulse(out: Float32Array, at: number, pitch: number, level: number, rate: number, ring: number): void {
  const n = Math.floor(PULSE_S * rate)
  let phase = 0
  for (let i = 0; i < n && at + i < out.length; i++) {
    const t = i / rate
    phase += (2 * Math.PI * pitch * (1 + 0.45 * Math.exp(-t / 0.02))) / rate
    const swell = t < ATTACK_S ? 0.5 - 0.5 * Math.cos((Math.PI * t) / ATTACK_S) : 1
    const close = Math.min(1, (PULSE_S - t) / 0.04)
    const tone =
      Math.sin(phase) +
      0.55 * Math.exp(-t / 0.045) * Math.sin(2 * phase) +
      0.32 * Math.exp(-t / 0.03) * Math.sin(3 * phase) +
      0.16 * Math.exp(-t / 0.022) * Math.sin(4 * phase)
    out[at + i] += BODY * level * swell * close * Math.exp(-t / 0.055) * tone
  }
  addKnock(out, at, level, rate, ring)
}

/**
 * How much of a pulse is body and how much knock. The knock's noise loses most of its level in its narrow
 * band, hence the large figure: at these two the knock sits well under the body.
 */
const BODY = 0.38
const KNOCK = 2.8
/** The knock: this long, swelling in and dying away this fast, its noise kept between these two pitches. */
const KNOCK_S = 0.08
const KNOCK_ATTACK_S = 0.004
const KNOCK_DECAY_S = 0.02
const KNOCK_FROM_HZ = 190
const KNOCK_TO_HZ = 700

function addKnock(out: Float32Array, at: number, level: number, rate: number, ring: number): void {
  // The noise is the same for a ring every time and different from ring to ring, so no two knocks in a
  // breath are copies of each other. Above its band it falls away steeply: a knock, not a hiss.
  const filters = [twoPole('highpass', KNOCK_FROM_HZ, rate), twoPole('lowpass', KNOCK_TO_HZ, rate), twoPole('lowpass', KNOCK_TO_HZ, rate)]
  let seed = (Math.imul(ring + 1, 2654435761) >>> 0) || 1
  const n = Math.floor(KNOCK_S * rate)
  for (let i = 0; i < n && at + i < out.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    let y = seed / 2147483648 - 1
    for (const f of filters) y = f(y)
    const t = i / rate
    const swell = t < KNOCK_ATTACK_S ? 0.5 - 0.5 * Math.cos((Math.PI * t) / KNOCK_ATTACK_S) : 1
    const close = Math.min(1, (KNOCK_S - t) / 0.02)
    out[at + i] += KNOCK * level * swell * close * Math.exp(-t / KNOCK_DECAY_S) * y
  }
}

/** A two-pole filter without resonance (Butterworth), as a function from one sample to the next. */
function twoPole(type: 'lowpass' | 'highpass', hz: number, rate: number): (x: number) => number {
  const w = (2 * Math.PI * hz) / rate
  const cos = Math.cos(w)
  const alpha = Math.sin(w) / Math.SQRT2
  const b1 = (type === 'lowpass' ? 1 - cos : -(1 + cos)) / (1 + alpha)
  const b0 = Math.abs(b1) / 2
  const a1 = (-2 * cos) / (1 + alpha)
  const a2 = (1 - alpha) / (1 + alpha)
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  return (x) => {
    const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2
    x2 = x1
    x1 = x
    y2 = y1
    y1 = y
    return y
  }
}

const tracks = new Map<string, AudioBuffer>()
const MAX_TRACKS = 12

/**
 * The pulse track of a phase as a buffer to play, with the playback rate that fits it to `dur`. Like the
 * breaths, tracks are made in steps of length and kept, so a session needs only a handful.
 */
export function pulseBuffer(ctx: BaseAudioContext, kind: PadKind, dur: number): { buffer: AudioBuffer; rate: number } {
  const { step, length, rate } = fitted(dur)
  const key = `${kind}:${step}`
  let buffer = tracks.get(key)
  if (buffer) {
    tracks.delete(key)
  } else {
    const data = pulseTrack(kind, length)
    buffer = ctx.createBuffer(1, data.length, PULSE_RATE)
    buffer.getChannelData(0).set(data)
    if (tracks.size >= MAX_TRACKS) tracks.delete(tracks.keys().next().value as string)
  }
  tracks.set(key, buffer)
  return { buffer, rate }
}
