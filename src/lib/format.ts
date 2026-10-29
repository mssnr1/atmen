/** 125_000 -> "2:05". Rounds up so the display never shows 0:00 early. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000 - 1e-6))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** 297_000 -> "4 min 57 s", 120_000 -> "2 min". */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m === 0) return `${s} s`
  return s === 0 ? `${m} min` : `${m} min ${s} s`
}

/** 5500 -> "5.5", 4000 -> "4". */
export function formatSeconds(ms: number): string {
  const s = ms / 1000
  return Number.isInteger(s) ? `${s}` : s.toFixed(1)
}
