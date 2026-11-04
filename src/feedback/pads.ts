/**
 * A breath sound for breathing in and out, synthesised with the Web Audio API.
 *
 * There are no notes or chords: each breath is shaped noise, like air moving
 * through nose, throat and chest.
 *
 * - Body: deep brown noise behind a low-pass filter. This is the dark, full
 *   "whoosh" of a strong breath.
 * - Air: a quiet, softly band-passed layer on top so the breath stays airy,
 *   kept low so it never turns hissy or tinny.
 * - Throat: two gentle resonances (around 320 Hz and 750 Hz) give the noise a
 *   vowel-like colour, the open "hhh" of a relaxed throat.
 * - Breathing in rises smoothly and the filters open a little as the air speeds
 *   up; breathing out starts fuller and darker and sinks away like a sigh.
 * - Slow random wobble on level and filter imitates the turbulence of real air.
 *
 * A short, dark room reverb glues the breaths together. During quiet pauses the
 * breath falls silent, as a held breath does. All functions take a
 * BaseAudioContext so the same code renders offline (for previews).
 */

export type PadKind = 'inhale' | 'exhale'

/** How long a breath keeps sounding after its phase ends (its tail into the next). */
export const PAD_RELEASE_S = 1.6

export interface PadBus {
  /** Where breath voices connect to. */
  input: AudioNode
  /** Brown noise: most energy in the lows, for the body of the breath. */
  brown: AudioBuffer
  /** Pink noise: a little brighter, for the air on top. */
  pink: AudioBuffer
}

/** A scheduled breath that can be faded out and stopped early. */
export interface PadVoice {
  out: GainNode
  sources: AudioScheduledSourceNode[]
  endsAt: number
}

interface BreathShape {
  /** Overall loudness at the fullest point of the breath. */
  peak: number
  /** Envelope as [fraction of phase, level 0..1] points, smoothly ramped between. */
  env: [number, number][]
  /** Body low-pass cut-off at start and end of the phase (Hz). */
  bodyFrom: number
  bodyTo: number
  /** Air band-pass centre at start and end of the phase (Hz). */
  airFrom: number
  airTo: number
  /** Level of the air layer relative to the body. */
  air: number
}

const INHALE: BreathShape = {
  peak: 0.3,
  // Gentle start, steady fullness, softening just before the top.
  env: [
    [0, 0],
    [0.08, 0.35],
    [0.22, 0.75],
    [0.45, 0.92],
    [0.7, 1],
    [0.88, 0.8],
    [1, 0.35],
  ],
  bodyFrom: 340,
  bodyTo: 620,
  airFrom: 650,
  airTo: 1050,
  air: 0.4,
}

const EXHALE: BreathShape = {
  peak: 0.28,
  // Fuller at once, then a long sinking release like a sigh.
  env: [
    [0, 0],
    [0.07, 0.45],
    [0.16, 1],
    [0.35, 0.85],
    [0.6, 0.55],
    [0.82, 0.28],
    [1, 0.1],
  ],
  bodyFrom: 520,
  bodyTo: 240,
  airFrom: 800,
  airTo: 420,
  air: 0.3,
}

/**
 * Build the shared breath chain: warm EQ → gentle compressor → dry + dark
 * reverb → destination. Call once per AudioContext.
 */
export function createPadBus(ctx: BaseAudioContext, destination: AudioNode): PadBus {
  const input = ctx.createGain()
  input.gain.value = 1

  // A touch more chest, a little less edge.
  const low = ctx.createBiquadFilter()
  low.type = 'lowshelf'
  low.frequency.value = 220
  low.gain.value = 5
  const high = ctx.createBiquadFilter()
  high.type = 'highshelf'
  high.frequency.value = 2500
  high.gain.value = -8
  // Nothing below the rumble range, so the low end stays clean.
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 70
  hp.Q.value = 0.5

  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -20
  comp.ratio.value = 2.5
  comp.attack.value = 0.08
  comp.release.value = 0.5

  input.connect(hp).connect(low).connect(high).connect(comp)

  const dry = ctx.createGain()
  dry.gain.value = 0.85
  const wet = ctx.createGain()
  wet.gain.value = 0.3
  const reverb = ctx.createConvolver()
  reverb.buffer = reverbImpulse(ctx, 2.6)
  comp.connect(dry).connect(destination)
  comp.connect(reverb).connect(wet).connect(destination)

  return { input, brown: brownNoise(ctx, 6), pink: pinkNoise(ctx, 6) }
}

/**
 * Schedule one breath.
 * @param start  audio-clock time the phase begins (may lie in the past to join mid-phase)
 * @param dur    phase length in seconds
 * @param hold   seconds of quiet pause after the phase; the breath is silent then
 */
export function schedulePad(
  ctx: BaseAudioContext,
  bus: PadBus,
  kind: PadKind,
  start: number,
  dur: number,
  hold = 0,
): PadVoice {
  void hold // a held breath is silent; the reverb tail carries into the pause
  const shape = kind === 'inhale' ? INHALE : EXHALE
  const end = start + dur
  const stopAt = end + PAD_RELEASE_S + 0.1

  const out = ctx.createGain()
  out.gain.value = 1
  out.connect(bus.input)

  // Volume envelope, with a soft tail after the phase ends.
  const env = ctx.createGain()
  const g = env.gain
  g.setValueAtTime(0, start)
  for (const [at, level] of shape.env.slice(1)) g.linearRampToValueAtTime(level * shape.peak, start + at * dur)
  g.setTargetAtTime(0, end, 0.25)
  env.connect(out)

  // Slow turbulence: two unrelated slow wobbles on the level.
  const wobble = ctx.createGain()
  wobble.gain.value = 1
  wobble.connect(env)
  const sources: AudioScheduledSourceNode[] = []
  const lfo = (rate: number, depth: number, target: AudioParam) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = rate * (0.85 + Math.random() * 0.3)
    const d = ctx.createGain()
    d.gain.value = depth
    osc.connect(d).connect(target)
    sources.push(osc)
  }
  lfo(0.37, 0.08, wobble.gain)
  lfo(1.1, 0.05, wobble.gain)

  // Throat colour: two broad, gentle resonances.
  const f1 = ctx.createBiquadFilter()
  f1.type = 'peaking'
  f1.frequency.value = kind === 'inhale' ? 340 : 300
  f1.Q.value = 1.1
  f1.gain.value = 6
  const f2 = ctx.createBiquadFilter()
  f2.type = 'peaking'
  f2.frequency.value = kind === 'inhale' ? 780 : 680
  f2.Q.value = 1.4
  f2.gain.value = 3
  f1.connect(f2).connect(wobble)

  // Body: deep noise behind a moving low-pass.
  const body = ctx.createBufferSource()
  body.buffer = bus.brown
  body.loop = true
  const bodyLp = ctx.createBiquadFilter()
  bodyLp.type = 'lowpass'
  bodyLp.Q.value = 0.5
  bodyLp.frequency.setValueAtTime(shape.bodyFrom, start)
  bodyLp.frequency.exponentialRampToValueAtTime(shape.bodyTo, end)
  const bodyLp2 = ctx.createBiquadFilter()
  bodyLp2.type = 'lowpass'
  bodyLp2.Q.value = 0.5
  bodyLp2.frequency.value = 1400
  lfo(0.23, 40, bodyLp.frequency)
  const bodyGain = ctx.createGain()
  bodyGain.gain.value = 1
  body.connect(bodyLp).connect(bodyLp2).connect(bodyGain).connect(f1)
  sources.push(body)

  // Air: a soft, low-placed band of pink noise on top.
  const air = ctx.createBufferSource()
  air.buffer = bus.pink
  air.loop = true
  const airBp = ctx.createBiquadFilter()
  airBp.type = 'bandpass'
  airBp.Q.value = 0.7
  airBp.frequency.setValueAtTime(shape.airFrom, start)
  airBp.frequency.exponentialRampToValueAtTime(shape.airTo, end)
  const airLp = ctx.createBiquadFilter()
  airLp.type = 'lowpass'
  airLp.frequency.value = 1800
  airLp.Q.value = 0.5
  lfo(0.5, 60, airBp.frequency)
  const airGain = ctx.createGain()
  airGain.gain.value = shape.air
  air.connect(airBp).connect(airLp).connect(airGain).connect(f1)
  sources.push(air)

  const t0 = Math.max(start, ctx.currentTime)
  for (const s of sources) {
    // Start the noise loops at random points so no two breaths sound identical.
    if (s instanceof AudioBufferSourceNode && s.buffer) s.start(t0, Math.random() * s.buffer.duration)
    else s.start(t0)
    s.stop(stopAt)
  }
  sources[sources.length - 1].onended = () => out.disconnect()

  return { out, sources, endsAt: stopAt }
}

/** Fade a voice out quickly and stop it, without a click. */
export function fadeOutPad(ctx: BaseAudioContext, voice: PadVoice, seconds = 0.4): void {
  const now = ctx.currentTime
  if (voice.endsAt <= now) return
  voice.out.gain.cancelScheduledValues(now)
  voice.out.gain.setValueAtTime(voice.out.gain.value, now)
  voice.out.gain.linearRampToValueAtTime(0, now + seconds)
  for (const s of voice.sources) {
    try {
      s.stop(now + seconds + 0.05)
    } catch {
      // already stopped
    }
  }
  voice.endsAt = now + seconds + 0.05
}

function brownNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02
    data[i] = last * 3.5
  }
  smoothLoop(data, ctx.sampleRate)
  return buf
}

function pinkNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  // Paul Kellet's economy pink filter.
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99765 * b0 + w * 0.099046
    b1 = 0.963 * b1 + w * 0.2965164
    b2 = 0.57 * b2 + w * 1.0526913
    data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12
  }
  smoothLoop(data, ctx.sampleRate)
  return buf
}

/** Cross-fade the end of a noise buffer into its start so the loop has no click. */
function smoothLoop(data: Float32Array, rate: number): void {
  const n = Math.min(Math.floor(rate * 0.05), data.length >> 2)
  for (let i = 0; i < n; i++) {
    const t = i / n
    const j = data.length - n + i
    data[j] = data[j] * (1 - t) + data[i] * t
  }
}

/** A short, dark stereo room made from decaying, low-passed noise. */
function reverbImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    let lp = 0
    for (let i = 0; i < len; i++) {
      const t = i / len
      // Strong low-pass so the tail is warm, never hissy.
      lp = lp * 0.82 + (Math.random() * 2 - 1) * 0.18
      data[i] = lp * Math.pow(1 - t, 4) * Math.min(1, i / (ctx.sampleRate * 0.02))
    }
  }
  return buf
}
