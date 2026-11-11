import { createPadBus, PAD_RELEASE_S, schedulePad, type PadKind } from './pads'

/**
 * Breaths rendered ahead of time. The breath sound is a dozen filters, a reverb and four sources per
 * breath. Worked out live, that is a lot to ask of a phone's audio thread while it also draws the
 * figure, and every missed deadline is a crackle. So each breath is rendered once, off that thread,
 * into a buffer, and playing it costs next to nothing.
 */

/** How long a rendered breath runs on after its phase: its release and the room's tail. */
export const BREATH_TAIL_S = PAD_RELEASE_S + 1.6
/** Lengths are rendered in steps of five percent and played a touch faster or slower to fit. */
const STEP = 1.05

/** The length a sound of `dur` seconds is made in (`step` names it), and the playback rate that fits it to `dur`. */
export function fitted(dur: number): { step: number; length: number; rate: number } {
  const step = Math.round(Math.log(dur) / Math.log(STEP))
  const length = Math.pow(STEP, step)
  return { step, length, rate: length / dur }
}
/** Kept buffers. A breath is a few megabytes, so only the ones in use are kept. */
const MAX_BUFFERS = 10

export interface RenderedBreath {
  buffer: AudioBuffer
  /** Playback rate at which the buffer's phase lasts exactly the length asked for. */
  rate: number
}

type OfflineCtor = typeof OfflineAudioContext

function offlineCtor(): OfflineCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: OfflineCtor }).webkitOfflineAudioContext
}

export const breathRenderingSupported = () => offlineCtor() !== undefined

const cache = new Map<string, Promise<AudioBuffer>>()

/**
 * One breath of `dur` seconds at `sampleRate`, rendered or taken from the ones kept. `variant` tells
 * otherwise equal breaths apart, so the same noise does not come back with every breath.
 */
export function renderedBreath(kind: PadKind, dur: number, sampleRate: number, variant = 0): Promise<RenderedBreath> {
  const { step, length, rate } = fitted(dur)
  const key = `${sampleRate}:${kind}:${step}:${variant}`
  let buffer = cache.get(key)
  if (buffer) {
    // Used again: move it to the fresh end.
    cache.delete(key)
  } else {
    buffer = render(kind, length, sampleRate)
    // A failed render must not stay.
    buffer.catch(() => cache.delete(key))
    if (cache.size >= MAX_BUFFERS) cache.delete(cache.keys().next().value as string)
  }
  cache.set(key, buffer)
  return buffer.then((b) => ({ buffer: b, rate }))
}

function render(kind: PadKind, dur: number, sampleRate: number): Promise<AudioBuffer> {
  const Offline = offlineCtor()
  if (!Offline) return Promise.reject(new Error('no offline audio'))
  return new Promise<AudioBuffer>((resolve, reject) => {
    const ctx = new Offline(2, Math.ceil((dur + BREATH_TAIL_S) * sampleRate), sampleRate)
    const bus = createPadBus(ctx, ctx.destination)
    schedulePad(ctx, bus, kind, 0, dur)
    let finished = false
    const done = (buffer: AudioBuffer) => {
      if (finished) return
      finished = true
      resolve(endInSilence(buffer))
    }
    // Older Safari reports through the event only; everything else also returns a promise.
    ctx.oncomplete = (e) => done(e.renderedBuffer)
    const result = ctx.startRendering() as Promise<AudioBuffer> | undefined
    if (result && typeof result.then === 'function') result.then(done, reject)
  })
}

/** Take the last stretch of the tail down to nothing, so the buffer's end cannot click. */
function endInSilence(buffer: AudioBuffer): AudioBuffer {
  const n = Math.min(buffer.length, Math.floor(buffer.sampleRate * 0.3))
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < n; i++) data[data.length - 1 - i] *= i / n
  }
  return buffer
}
