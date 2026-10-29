export type TimeSource = () => number

export const defaultTimeSource: TimeSource = () => performance.now()

/**
 * A stopwatch that can be paused. Elapsed time is always read from a
 * monotonic time source, never accumulated from frame or tick counts.
 */
export class PausableClock {
  private accumulated = 0
  private startedAt: number | null = null
  private readonly now: TimeSource

  constructor(now: TimeSource = defaultTimeSource) {
    this.now = now
  }

  get running(): boolean {
    return this.startedAt !== null
  }

  get elapsedMs(): number {
    return this.accumulated + (this.startedAt === null ? 0 : this.now() - this.startedAt)
  }

  start(): void {
    if (this.startedAt === null) this.startedAt = this.now()
  }

  pause(): void {
    if (this.startedAt === null) return
    this.accumulated += this.now() - this.startedAt
    this.startedAt = null
  }

  reset(): void {
    this.accumulated = 0
    this.startedAt = null
  }
}
