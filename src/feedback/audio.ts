import type { PhaseType, SessionPlan } from '../engine'
import { createPadBus, fadeOutPad, PAD_RELEASE_S, schedulePad, type PadBus, type PadVoice } from './pads'

/** Bell tone for a hold that is announced (not quiet). */
const HOLD_TONES: Partial<Record<PhaseType, number>> = {
  holdIn: 587.33, // D5
  holdOut: 349.23, // F4
}

/** How far ahead pads are scheduled, and how often the window is extended. */
const LOOKAHEAD_S = 120
const REFILL_MS = 10_000

type AudioContextCtor = typeof AudioContext

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
}

export const audioSupported = () => getAudioContextCtor() !== undefined

/**
 * Plays a dark, breath-like sound with each breath in and out. Cues are
 * scheduled ahead on the Web Audio clock (two minutes at a time, topped up
 * regularly), so they keep exact time even when the screen is off or the tab is
 * throttled.
 */
export class AudioCues {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private pads: PadBus | null = null
  private scheduled: OscillatorNode[] = []
  private voices: PadVoice[] = []
  private session: { plan: SessionPlan; zero: number; nextIndex: number; timer: number } | null = null

  /** Must be called from a user gesture (tap) to unlock audio on mobile. */
  async unlock(): Promise<void> {
    const Ctor = getAudioContextCtor()
    if (!Ctor) return
    if (!this.ctx) {
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.5
      this.master.connect(this.ctx.destination)
      this.pads = createPadBus(this.ctx, this.master)
    }
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => {})
  }

  /**
   * Schedule cues for every phase start from `elapsedMs` to the end of the
   * session, plus the completion chime. `includeCurrent` also plays the cue for
   * a phase starting exactly now (a fresh start, not a resume).
   */
  scheduleSession(plan: SessionPlan, getElapsedMs: () => number, includeCurrent: boolean): void {
    this.cancel()
    const ctx = this.ctx
    if (!ctx) return
    const elapsed = getElapsedMs()
    // Map session time onto the audio clock.
    const zero = ctx.currentTime - elapsed / 1000
    // On a fresh start, unlocking audio may take a moment; still cue the first breath.
    // Otherwise join the breath already under way so resuming isn't silent.
    const from = includeCurrent ? Math.max(0, elapsed - 250) : elapsed
    let nextIndex = plan.segments.findIndex((s) => s.startMs + s.durationMs > from)
    if (nextIndex < 0) nextIndex = plan.segments.length
    // Skip back over quiet pauses to the breath they belong to.
    while (nextIndex > 0 && nextIndex < plan.segments.length && isHold(plan.segments[nextIndex].phase.type) && plan.segments[nextIndex].phase.quiet) nextIndex--
    this.session = { plan, zero, nextIndex, timer: window.setInterval(() => this.fill(), REFILL_MS) }
    this.fill()
    this.chime(zero + plan.totalDurationMs / 1000)
  }

  /** Schedule pads up to the look-ahead horizon. */
  private fill(): void {
    const ctx = this.ctx
    const session = this.session
    if (!ctx || !this.pads || !session) return
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
      // Pauses that follow a breath are passed along (its tail rings into them).
      let hold = 0
      let j = i + 1
      while (j < segs.length && isHold(segs[j].phase.type)) hold += segs[j++].durationMs / 1000
      if (start + seg.durationMs / 1000 + hold + PAD_RELEASE_S > ctx.currentTime) {
        const kind = seg.phase.type === 'inhale' ? 'inhale' : 'exhale'
        this.voices.push(schedulePad(ctx, this.pads, kind, start, seg.durationMs / 1000, hold))
      }
      i++
    }
    session.nextIndex = i
    const now = ctx.currentTime
    this.voices = this.voices.filter((v) => v.endsAt > now)
  }

  cancel(): void {
    if (this.session) window.clearInterval(this.session.timer)
    this.session = null
    if (this.ctx) for (const v of this.voices) fadeOutPad(this.ctx, v)
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

/**
 * One instance for the whole app, so a tap on the home screen can unlock audio
 * for the session that starts right after it.
 */
export const audioCues = new AudioCues()
