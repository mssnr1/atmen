import type { PhaseType, SessionPlan } from '../engine'
import { BREATH_TAIL_S, breathRenderingSupported, renderedBreath } from './breathBuffers'
import { createPadBus, fadeOutPad, JOIN_FADE_S, schedulePad, type PadBus, type PadKind, type PadVoice } from './pads'
import { PULSE_LEVEL, pulseBuffer } from './pulse'

/** Bell tone for a hold that is announced (not quiet). */
const HOLD_TONES: Partial<Record<PhaseType, number>> = {
  holdIn: 587.33, // D5
  holdOut: 349.23, // F4
}

/** The fade-in of a sound that begins a moment into itself, as the first breath of a session does. */
const START_FADE_S = 0.12
/** How far ahead breaths are scheduled, and how often the window is extended. */
const LOOKAHEAD_S = 120
const REFILL_MS = 10_000

interface Session {
  plan: SessionPlan
  /** Audio-clock time of the session's start. */
  zero: number
  nextIndex: number
  timer: number
  /** Play a pulse for every ring of the lungs. */
  pulse: boolean
}

/**
 * How long the device takes to turn scheduled sound into air, as far as the browser tells. Sound is
 * scheduled that much early, so the pulses meet the rings on the screen.
 */
function outputDelay(ctx: AudioContext): number {
  const delay = (ctx.baseLatency || 0) + (ctx.outputLatency || 0)
  return Number.isFinite(delay) ? Math.min(Math.max(delay, 0), 0.3) : 0
}

type AudioContextCtor = typeof AudioContext

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
}

export const audioSupported = () => getAudioContextCtor() !== undefined

/**
 * Plays a dark, breath-like sound with each breath in and out and, if wanted, a deep pulse for every
 * ring of the lungs. Everything is scheduled ahead on the Web Audio clock (two minutes at a time,
 * topped up regularly), so it keeps exact time even when the screen is off or the tab is throttled.
 *
 * The breaths are rendered ahead of time (see breathBuffers.ts) and the pulses are written into small
 * buffers (see pulse.ts): while breathing, the audio thread only plays buffers. That keeps it far from
 * its deadlines on a phone, where a missed one is a crackle.
 */
export class AudioCues {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  /** The chain for working a breath out live: only made if breaths cannot be rendered ahead. */
  private pads: PadBus | null = null
  private scheduled: OscillatorNode[] = []
  private voices: PadVoice[] = []
  private session: Session | null = null

  /** Must be called from a user gesture (tap) to unlock audio on mobile. */
  async unlock(): Promise<void> {
    const Ctor = getAudioContextCtor()
    if (!Ctor) return
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.5
      this.master.connect(this.ctx.destination)
      this.pads = null
    }
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => {})
  }

  /**
   * Call from the tap that leads into a session: begin with a fresh audio context. One that has lived
   * through hours in the background, a phone call or a change of headphones can crackle or run at the
   * wrong rate, and only a new one puts that right. Outside a tap nothing happens, because a context
   * made there would stay silent on a phone.
   */
  renew(): void {
    if (!getAudioContextCtor()) return
    const activation = typeof navigator === 'undefined' ? undefined : (navigator as { userActivation?: { isActive: boolean } }).userActivation
    if (activation && !activation.isActive) return
    this.cancel()
    const old = this.ctx
    const oldMaster = this.master
    this.ctx = null
    this.master = null
    this.pads = null
    if (old && old.state !== 'closed') {
      // Whatever still rings (the chime of the session before) is taken down first: a context closed in
      // mid-sound ends with a click.
      oldMaster?.gain.setTargetAtTime(0, old.currentTime, 0.02)
      window.setTimeout(() => void old.close().catch(() => {}), 200)
    }
    void this.unlock()
  }

  /**
   * Make the sounds of the first breaths of `plan` now, so they are ready when the session begins. One
   * after the other, so the work never comes in one lump while the figure moves.
   */
  warm(plan: SessionPlan, options: { pulse?: boolean } = {}): void {
    const ctx = this.ctx
    if (!ctx) return
    let made: Promise<unknown> = Promise.resolve()
    for (const seg of plan.segments.slice(0, 6)) {
      if (isHold(seg.phase.type)) continue
      const kind = kindOf(seg.phase.type)
      const dur = seg.durationMs / 1000
      const variant = seg.cycleIndex % 2
      made = made.then(() => {
        if (this.ctx !== ctx) return
        if (options.pulse) pulseBuffer(ctx, kind, dur)
        if (breathRenderingSupported()) return renderedBreath(kind, dur, ctx.sampleRate, variant).catch(() => {})
      })
    }
  }

  /**
   * Schedule cues for every phase start from `elapsedMs` to the end of the
   * session, plus the completion chime. `includeCurrent` also plays the cue for
   * a phase starting exactly now (a fresh start, not a resume). With `pulse`, every ring of the lungs
   * gets its pulse.
   */
  scheduleSession(plan: SessionPlan, getElapsedMs: () => number, includeCurrent: boolean, options: { pulse?: boolean } = {}): void {
    this.cancel()
    const ctx = this.ctx
    if (!ctx) return
    const elapsed = getElapsedMs()
    // Map session time onto the audio clock, early by the time the sound needs to reach the ear.
    const zero = ctx.currentTime - elapsed / 1000 - outputDelay(ctx)
    // On a fresh start, unlocking audio may take a moment; still cue the first breath.
    // Otherwise join the breath already under way so resuming isn't silent.
    const from = includeCurrent ? Math.max(0, elapsed - 250) : elapsed
    let nextIndex = plan.segments.findIndex((s) => s.startMs + s.durationMs > from)
    if (nextIndex < 0) nextIndex = plan.segments.length
    // Skip back over quiet pauses to the breath they belong to.
    while (nextIndex > 0 && nextIndex < plan.segments.length && isHold(plan.segments[nextIndex].phase.type) && plan.segments[nextIndex].phase.quiet) nextIndex--
    this.session = { plan, zero, nextIndex, timer: window.setInterval(() => this.fill(), REFILL_MS), pulse: options.pulse ?? false }
    this.fill()
    this.chime(zero + plan.totalDurationMs / 1000)
  }

  /** Schedule breaths up to the look-ahead horizon. */
  private fill(): void {
    const ctx = this.ctx
    const session = this.session
    if (!ctx || !session) return
    const { plan, zero } = session
    const horizon = ctx.currentTime + LOOKAHEAD_S
    const segs = plan.segments
    let i = session.nextIndex
    while (i < segs.length && zero + segs[i].startMs / 1000 < horizon) {
      const seg = segs[i]
      const start = zero + seg.startMs / 1000
      if (isHold(seg.phase.type)) {
        // Announced holds keep the gentle bell; quiet ones stay silent like a held breath.
        const tone = HOLD_TONES[seg.phase.type]
        if (!seg.phase.quiet && tone) this.bell(start, tone, 1.6, 0.2)
        i++
        continue
      }
      // A breath's tail rings into the pause that follows it.
      const dur = seg.durationMs / 1000
      if (start + dur + BREATH_TAIL_S > ctx.currentTime) this.breathe(session, kindOf(seg.phase.type), start, dur, seg.cycleIndex)
      i++
    }
    session.nextIndex = i
    // Breaths that have rung out leave the graph.
    const now = ctx.currentTime
    this.voices = this.voices.filter((v) => {
      if (v.endsAt > now) return true
      v.out.disconnect()
      return false
    })
  }

  /** One breath from `start` on: its sound and, if wanted, the pulse of each ring. */
  private breathe(session: Session, kind: PadKind, start: number, dur: number, cycle: number): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const out = ctx.createGain()
    out.connect(master)
    const voice: PadVoice = { out, sources: [], endsAt: start + dur + BREATH_TAIL_S }
    this.voices.push(voice)
    const play = (buffer: AudioBuffer, rate: number, level: number) => {
      const now = ctx.currentTime
      const late = now - start
      if (late >= buffer.duration / rate || voice.endsAt <= now) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = rate
      const gain = ctx.createGain()
      gain.gain.value = level
      // Not from its very beginning: come in softly. Joining part-way (after a pause, a change of pace,
      // coming back to the app) takes longer than the few hundredths a fresh start is behind.
      if (late > 0) {
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(level, now + (late > 0.05 ? JOIN_FADE_S : START_FADE_S))
      }
      source.connect(gain).connect(out)
      source.start(Math.max(start, now), Math.max(0, late) * rate)
      source.onended = () => gain.disconnect()
      voice.sources.push(source)
    }

    const current = () => this.session === session && this.ctx === ctx
    if (breathRenderingSupported()) {
      renderedBreath(kind, dur, ctx.sampleRate, cycle % 2).then(
        ({ buffer, rate }) => {
          if (current()) play(buffer, rate, 1)
        },
        () => {
          // Rendering ahead failed on this device: work the breath out live after all.
          if (current()) this.live(kind, start, dur)
        },
      )
    } else {
      this.live(kind, start, dur)
    }
    if (session.pulse) {
      const pulses = pulseBuffer(ctx, kind, dur)
      play(pulses.buffer, pulses.rate, PULSE_LEVEL)
    }
  }

  /** A breath worked out live on the audio thread, for devices that cannot render ahead. */
  private live(kind: PadKind, start: number, dur: number): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    this.pads ??= createPadBus(ctx, this.master)
    this.voices.push(schedulePad(ctx, this.pads, kind, start, dur))
  }

  cancel(): void {
    if (this.session) window.clearInterval(this.session.timer)
    this.session = null
    const stopped = this.voices
    if (this.ctx) for (const v of stopped) fadeOutPad(this.ctx, v)
    // Once they have faded, take them out of the graph (also the ones whose sound was still on its way).
    if (stopped.length) {
      window.setTimeout(() => {
        for (const v of stopped) v.out.disconnect()
      }, 1000)
    }
    this.voices = []
    for (const osc of this.scheduled) {
      try {
        osc.stop()
        osc.disconnect()
      } catch {
        // already stopped
      }
    }
    this.scheduled = []
  }

  /**
   * A short wooden click for stepping a control, pitched by `step` (0 = low).
   * Played right away, so call it from the tap or drag that caused it.
   */
  tick(step = 0): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const at = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07)
    gain.connect(this.master)
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    const freq = 660 * Math.pow(2, step / 6)
    osc.frequency.setValueAtTime(freq * 1.5, at)
    osc.frequency.exponentialRampToValueAtTime(freq, at + 0.03)
    osc.connect(gain)
    osc.start(at)
    osc.stop(at + 0.09)
    osc.onended = () => gain.disconnect()
  }

  /** Completion chime, played now. */
  playCompletion(): void {
    if (this.ctx) this.chime(this.ctx.currentTime + 0.05)
  }

  dispose(): void {
    this.cancel()
    void this.ctx?.close().catch(() => {})
    this.ctx = null
    this.pads = null
  }

  private chime(at: number) {
    ;[392.0, 493.88, 587.33, 783.99].forEach((f, i) => this.bell(at + i * 0.22, f, 3.2, 0.3))
  }

  private bell(at: number, freq: number, decay: number, volume: number) {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const start = Math.max(at, ctx.currentTime)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + decay)
    gain.connect(this.master)
    // Fundamental plus a quiet overtone for a soft bowl-like sound.
    for (const [mult, level] of [
      [1, 1],
      [2.01, 0.18],
    ] as const) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * mult
      const g = ctx.createGain()
      g.gain.value = level
      osc.connect(g).connect(gain)
      osc.start(start)
      osc.stop(start + decay + 0.05)
      osc.onended = () => {
        this.scheduled = this.scheduled.filter((o) => o !== osc)
        g.disconnect()
      }
      this.scheduled.push(osc)
    }
  }
}

function isHold(type: PhaseType): boolean {
  return type === 'holdIn' || type === 'holdOut'
}

const kindOf = (type: PhaseType): PadKind => (type === 'inhale' ? 'inhale' : 'exhale')

/**
 * One instance for the whole app, so a tap on the home screen can unlock audio
 * for the session that starts right after it.
 */
export const audioCues = new AudioCues()
