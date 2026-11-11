import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { cueAt, cues } from './cues'

const FADE_MS = 1600

/**
 * A line over the figure's head while breathing: it comes with an inhale, stays for that breath and
 * goes again. `turn` shifts which lines a session begins with, so they change from session to session.
 */
export function BreathCue({ cycleIndex, totalCycles, active, top, turn }: { cycleIndex: number; totalCycles: number; active: boolean; top: number; turn: number }) {
  const { lang } = useI18n()
  const slot = active ? cueAt(cycleIndex, totalCycles) : null
  const pool = slot ? cues[lang][slot.kind] : null
  const text = slot && pool ? pool[(slot.index + turn) % pool.length] : null
  const [line, setLine] = useState<{ text: string; leaving: boolean } | null>(null)

  useEffect(() => {
    if (text) {
      setLine({ text, leaving: false })
      return
    }
    setLine((l) => l && { ...l, leaving: true })
    const gone = window.setTimeout(() => setLine(null), FADE_MS)
    return () => window.clearTimeout(gone)
  }, [text])

  if (!line) return null
  return (
    <p
      className="breath-cue pointer-events-none absolute inset-x-0 z-[5] mx-auto max-w-[19rem] px-4 text-center text-lead leading-snug text-ink transition-opacity ease-in-out md:max-w-md md:text-[1.375rem]"
      style={{ top: top + 6, opacity: line.leaving ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
      role="status"
      data-testid="breath-cue"
    >
      <span key={line.text}>{line.text}</span>
    </p>
  )
}
