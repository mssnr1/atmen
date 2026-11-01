/**
 * Soft ambient pads for breathing in and out, synthesised with the Web Audio API.
 *
 * - Breathing in: a bright, airy chord (D add9) that slowly swells while a
 *   low-pass filter opens, like light coming up.
 * - Breathing out: a lower, warmer chord (G maj7) that blooms quickly and then
 *   settles and fades while the filter closes.
 *
 * Each pad overlaps the next by a few seconds and everything runs through a
 * shared reverb, so the sound feels like one continuous surface. All functions
 * take a BaseAudioContext so the same code renders offline (for previews).
 */

export type PadKind = 'inhale' | 'exhale'

const INHALE_CHORD = [293.66, 440.0, 659.25, 739.99, 880.0] // D4 A4 E5 F#5 A5
const EXHALE_CHORD = [196.0, 293.66, 369.99, 493.88] // G3 D4 F#4 B4
/** Relative loudness of each chord note; the top notes stay in the background. */
const INHALE_LEVELS = [1, 0.85, 0.6, 0.45, 0.22]
const EXHALE_LEVELS = [1, 0.8, 0.65, 0.45]

/** How long a pad keeps sounding after its phase ends, overlapping the next one. */
export const PAD_RELEASE_S = 3

export interface PadBus {
  /** Where pad voices connect to. */
  input: AudioNode
  waveSoft: PeriodicWave
  waveBright: PeriodicWave
  noise: AudioBuffer
}

/** A scheduled pad that can be faded out and stopped early. */
export interface PadVoice {
  out: GainNode
  sources: AudioScheduledSourceNode[]
  endsAt: number
}

/**
 * Build the shared pad chain: compressor → dry + reverb → destination.
 * Call once per AudioContext.
 */
export function createPadBus(ctx: BaseAudioContext, destination: AudioNode): PadBus {
  const input = ctx.createGain()
  input.gain.value = 1

  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 3
  comp.attack.value = 0.05
  comp.release.value = 0.4
  input.connect(comp)

  const dry = ctx.createGain()
  dry.gain.value = 0.7
  const wet = ctx.createGain()
  wet.gain.value = 0.55
  const reverb = ctx.createConvolver()
  reverb.buffer = reverbImpulse(ctx, 4.5)
  comp.connect(dry).connect(destination)
  comp.connect(reverb).connect(wet).connect(destination)

  return {
    input,
    waveSoft: harmonicWave(ctx, [1, 0.35, 0.12, 0.05, 0.02]),
    waveBright: harmonicWave(ctx, [1, 0.5, 0.3, 0.2, 0.12, 0.08, 0.05, 0.03]),
    noise: noiseBuffer(ctx, 3),
  }
}

/**
 * Schedule one pad.
 * @param start  audio-clock time the phase begins (may lie in the past to join mid-phase)
 * @param dur    phase length in seconds
 * @param hold   seconds of quiet pause after the phase, during which the pad lingers
 */
export function schedulePad(
  ctx: BaseAudioContext,
  bus: PadBus,
  kind: PadKind,
  start: number,
  dur: number,
  hold = 0,
): PadVoice {
  const inhale = kind === 'inhale'
  const chord = inhale ? INHALE_CHORD : EXHALE_CHORD
  const levels = inhale ? INHALE_LEVELS : EXHALE_LEVELS
  const end = start + dur
  const holdEnd = end + hold
  const stopAt = holdEnd + PAD_RELEASE_S + 0.1
  const peak = inhale ? 0.26 : 0.24

  const out = ctx.createGain()
  out.gain.value = 1
  out.connect(bus.input)

  // Volume envelope.
  const env = ctx.createGain()
  const g = env.gain
  g.setValueAtTime(0.0001, start)
  if (inhale) {
    // Slow swell that keeps growing until the top of the breath.
    g.linearRampToValueAtTime(peak * 0.25, start + dur * 0.35)
    g.linearRampToValueAtTime(peak, end)
    if (hold > 0) g.linearRampToValueAtTime(peak * 0.75, holdEnd)
  } else {
    // Quick warm bloom, then settle and fade with the outgoing air.
    const attack = Math.min(1.2, dur * 0.25)
    g.linearRampToValueAtTime(peak, start + attack)
    g.linearRampToValueAtTime(peak * 0.55, start + dur * 0.6)
    g.linearRampToValueAtTime(peak * 0.3, end)
    if (hold > 0) g.linearRampToValueAtTime(peak * 0.18, holdEnd)
  }
  g.setTargetAtTime(0.0001, holdEnd, PAD_RELEASE_S / 4)
  env.connect(out)

  // Filter: opens on the way in, closes on the way out.
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 0.6
  const f = filter.frequency
  if (inhale) {
    f.setValueAtTime(380, start)
    f.exponentialRampToValueAtTime(2600, end)
    f.setTargetAtTime(900, holdEnd, PAD_RELEASE_S / 3)
  } else {
    f.setValueAtTime(1500, start)
    f.exponentialRampToValueAtTime(520, end)
    f.setTargetAtTime(350, holdEnd, PAD_RELEASE_S / 3)
  }
  filter.connect(env)

  const sources: AudioScheduledSourceNode[] = []
  const wave = inhale ? bus.waveBright : bus.waveSoft

  // Two slightly detuned oscillators per note give the slow, shimmering chorus.
  chord.forEach((freq, i) => {
    const noteGain = ctx.createGain()
    noteGain.gain.value = levels[i] * 0.5
    noteGain.connect(filter)
    for (const cents of [-7, 7]) {
      const osc = ctx.createOscillator()
      osc.setPeriodicWave(wave)
      osc.frequency.value = freq
      osc.detune.value = cents + (i % 2 ? 2 : -2)
      osc.connect(noteGain)
      sources.push(osc)
    }
  })

  // A breath of air: filtered noise that follows the same envelope.
  const air = ctx.createBufferSource()
  air.buffer = bus.noise
  air.loop = true
  const airFilter = ctx.createBiquadFilter()
  airFilter.type = 'bandpass'
  airFilter.Q.value = 0.8
  if (inhale) {
    airFilter.frequency.setValueAtTime(700, start)
    airFilter.frequency.exponentialRampToValueAtTime(2400, end)
  } else {
    airFilter.frequency.setValueAtTime(1600, start)
    airFilter.frequency.exponentialRampToValueAtTime(500, end)
  }
  const airGain = ctx.createGain()
  airGain.gain.value = inhale ? 0.22 : 0.16
  air.connect(airFilter).connect(airGain).connect(env)
  sources.push(air)

  const t0 = Math.max(start, ctx.currentTime)
  for (const s of sources) {
    s.start(t0)
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

function harmonicWave(ctx: BaseAudioContext, amps: number[]): PeriodicWave {
  const real = new Float32Array(amps.length + 1)
  const imag = new Float32Array(amps.length + 1)
  amps.forEach((a, i) => (imag[i + 1] = a))
  return ctx.createPeriodicWave(real, imag)
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  // Pinkish noise (Paul Kellet's filter) sounds softer than white noise.
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
  return buf
}

/** A long, smooth stereo reverb tail made from decaying noise. */
function reverbImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    let lp = 0
    for (let i = 0; i < len; i++) {
      const t = i / len
      // Slight low-pass so the tail is dark and soft rather than hissy.
      lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4
      data[i] = lp * Math.pow(1 - t, 3) * Math.min(1, i / (ctx.sampleRate * 0.03))
    }
  }
  return buf
}
