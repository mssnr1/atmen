import { useState } from 'react'

/** Text that crossfades to its new value instead of switching at once. */
export function CrossfadeText({ text, durationMs = 900 }: { text: string; durationMs?: number }) {
  const [shown, setShown] = useState({ current: text, previous: null as string | null, key: 0 })
  if (shown.current !== text) setShown({ current: text, previous: shown.current, key: shown.key + 1 })
  const ease = `${durationMs}ms cubic-bezier(0.45, 0, 0.55, 1) both`
  return (
    <span className="inline-grid justify-items-center">
      {shown.previous !== null && (
        <span key={`p${shown.key}`} aria-hidden className="[grid-area:1/1]" style={{ animation: `fade-out ${ease}` }}>
          {shown.previous}
        </span>
      )}
      <span key={`c${shown.key}`} className="[grid-area:1/1]" style={shown.key ? { animation: `fade-in ${ease}` } : undefined}>
        {shown.current}
      </span>
    </span>
  )
}
