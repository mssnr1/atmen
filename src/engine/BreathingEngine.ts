import { PausableClock, defaultTimeSource, type TimeSource } from './clock'
import { defaultPace, positionAt, replan, resolvePlan } from './timeline'
import type {
  BreathingPattern,
  EngineEvent,
  EngineSnapshot,
  EngineStatus,
  Pace,
  SessionLength,
  SessionPlan,
  SessionSummary,
} from './types'

/** Starts calling `cb` periodically and returns a function that stops it. */
export type Ticker = (cb: () => void) => () => void

const defaultTicker: Ticker = (cb) => {
  const id = setInterval(cb, 50)
  return () => clearInterval(id)
}

export interface EngineOptions {
  pattern: BreathingPattern
  length: SessionLength
  pace?: Pace
  now?: TimeSource
  ticker?: Ticker
  /** Wall clock, used only for session dates. */
  wallClock?: () => Date
}

type Listener = (event: EngineEvent) => void

/**
 * Runs a breathing session. Holds no UI or audio concerns: it owns a pausable
 * clock and derives every position from elapsed time, emitting events when the
 * phase or status changes. Ticks only decide *when* events are noticed, never
 * *what* the position is, so timing stays accurate at any frame or tick rate.
 */
export class BreathingEngine {
  private plan: SessionPlan
  private readonly clock: PausableClock
  private readonly ticker: Ticker
  private readonly wallClock: () => Date
  private stopTicker: (() => void) | null = null
  private status: EngineStatus = 'idle'
  private listeners = new Set<Listener>()
  private lastPhaseKey: string | null = null
  private startedAt: Date | null = null
  private snapshot: EngineSnapshot

  constructor(options: EngineOptions) {
    this.plan = resolvePlan(options.pattern, options.length, options.pace ?? defaultPace)
    this.clock = new PausableClock(options.now ?? defaultTimeSource)
    this.ticker = options.ticker ?? defaultTicker
    this.wallClock = options.wallClock ?? (() => new Date())
    this.snapshot = this.sample()
  }

  /** Cached snapshot, refreshed on every tick and command. Stable between updates. */
  getSnapshot = (): EngineSnapshot => this.snapshot

  /** Fresh snapshot computed from the clock right now. Use for animation frames. */
  sample(): EngineSnapshot {
    return { ...positionAt(this.plan, this.clock.elapsedMs), status: this.status, plan: this.plan }
  }

  getPlan(): SessionPlan {
    return this.plan
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Change pattern or length. Resets the session to idle. */
  configure(pattern: BreathingPattern, length: SessionLength): void {
    this.plan = resolvePlan(pattern, length, this.plan.pace)
    this.reset()
  }

  /**
   * Change how fast to breathe. Before a session this re-plans it (a duration
   * keeps roughly its length); during one the change applies from the next
   * phase and the number of breaths stays the same.
   */
  setPace(pace: Pace): void {
    const { scale, slowDown } = this.plan.pace
    if (pace.scale === scale && pace.slowDown === slowDown) return
    this.plan =
      this.status === 'idle'
        ? resolvePlan(this.plan.pattern, this.plan.length, pace)
        : replan(this.plan, this.clock.elapsedMs, pace)
    this.snapshot = this.sample()
    this.emit({ type: 'plan', snapshot: this.snapshot })
  }

  start(): void {
    if (this.status === 'running') return
    if (this.status === 'paused') return this.resume()
    // A fresh session drops pace changes made during the last one, keeping the current pace.
    this.plan = resolvePlan(this.plan.pattern, this.plan.length, this.plan.pace)
    this.clock.reset()
    this.lastPhaseKey = null
    this.startedAt = this.wallClock()
    this.clock.start()
    this.setStatus('running')
    this.startTicking()
    this.update()
  }

  pause(): void {
    if (this.status !== 'running') return
    this.clock.pause()
    this.stopTicking()
    this.setStatus('paused')
  }

  resume(): void {
    if (this.status !== 'paused') return
    this.clock.start()
    this.setStatus('running')
    this.startTicking()
    this.update()
  }

  restart(): void {
    this.stopTicking()
    this.status = 'idle'
    this.start()
  }

  reset(): void {
    this.stopTicking()
    this.clock.reset()
    this.lastPhaseKey = null
    this.startedAt = null
    this.setStatus('idle')
  }

  dispose(): void {
    this.stopTicking()
    this.listeners.clear()
  }

  private startTicking(): void {
    this.stopTicking()
    this.stopTicker = this.ticker(() => this.update())
  }

  private stopTicking(): void {
    this.stopTicker?.()
    this.stopTicker = null
  }

  private setStatus(status: EngineStatus): void {
    this.status = status
    this.snapshot = this.sample()
    this.emit({ type: 'status', snapshot: this.snapshot })
  }

  /** Re-read the clock and emit whatever changed since the last update. */
  private update(): void {
    if (this.status !== 'running') return
    const snapshot = this.sample()
    this.snapshot = snapshot

    if (snapshot.done) {
      this.clock.pause()
      this.stopTicking()
      this.status = 'completed'
      this.snapshot = { ...snapshot, status: 'completed' }
      const summary: SessionSummary = {
        startedAt: this.startedAt ?? this.wallClock(),
        completedAt: this.wallClock(),
        durationMs: snapshot.elapsedMs,
        completedCycles: snapshot.completedCycles,
      }
      this.emit({ type: 'status', snapshot: this.snapshot })
      this.emit({ type: 'complete', snapshot: this.snapshot, summary })
      return
    }

    const key = `${snapshot.cycleIndex}:${snapshot.phaseIndex}`
    if (key !== this.lastPhaseKey) {
      this.lastPhaseKey = key
      this.emit({ type: 'phase', snapshot })
    }
    this.emit({ type: 'tick', snapshot })
  }

  private emit(event: EngineEvent): void {
    for (const l of this.listeners) l(event)
  }
}
