import { transitionsBetween, type PhaseType, type SessionPlan } from '../engine'

/** Tone per phase: rising pitch to breathe in, lower to breathe out. */
const PHASE_TONES: Record<PhaseType, number> = {
  inhale: 523.25, // C5
  holdIn: 587.33, // D5
  exhale: 392.0, // G4
  holdOut: 349.23, // F4
}

type AudioContextCtor = typeof AudioContext

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
}

export const audioSupported = () => getAudioContextCtor() !== undefined

/**
 * Plays soft bell tones on phase changes. Cues for the rest of the session are
 * scheduled ahead on the Web Audio clock, so they keep exact time even when the
 * screen is off or the tab is throttled.
 */
export class AudioCues {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private scheduled: OscillatorNode[] = []

  /** Must be called from a user gesture (tap) to unlock audio on mobile. */
  async unlock(): Promise<void> {
    const Ctor = getAudioContextCtor()
    if (!Ctor) return
    if (!this.ctx) {
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.5
      this.master.connect(this.ctx.destination)
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
    const sessionZero = ctx.currentTime - elapsed / 1000
    // On a fresh start, unlocking audio may take a moment; still cue the first breath.
    const from = includeCurrent ? Math.max(0, elapsed - 250) : elapsed + 1
    for (const t of transitionsBetween(plan, from, plan.totalDurationMs)) {
      if (t.phase.quiet) continue
      this.bell(sessionZero + t.atMs / 1000, PHASE_TONES[t.phase.type], 1.6, 0.35)
    }
    const end = sessionZero + plan.totalDurationMs / 1000
    this.chime(end)
  }

  cancel(): void {
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

/**
 * One instance for the whole app, so a tap on the home screen can unlock audio
 * for the session that starts right after it.
 */
export const audioCues = new AudioCues()
