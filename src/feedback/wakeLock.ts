/** Keeps the screen on during a session where the Screen Wake Lock API exists. */
export class ScreenWakeLock {
  private sentinel: WakeLockSentinel | null = null
  private wanted = false

  constructor() {
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  async acquire(): Promise<void> {
    this.wanted = true
    if (!('wakeLock' in navigator) || this.sentinel || document.visibilityState !== 'visible') return
    try {
      this.sentinel = await navigator.wakeLock.request('screen')
      this.sentinel.addEventListener('release', () => (this.sentinel = null))
    } catch {
      // Denied (battery saver, unsupported context). Not critical.
    }
  }

  release(): void {
    this.wanted = false
    void this.sentinel?.release().catch(() => {})
    this.sentinel = null
  }

  dispose(): void {
    this.release()
    document.removeEventListener('visibilitychange', this.onVisibility)
  }

  // The lock is dropped whenever the page is hidden; take it back on return.
  private onVisibility = () => {
    if (this.wanted && document.visibilityState === 'visible') void this.acquire()
  }
}
