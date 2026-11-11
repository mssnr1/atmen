import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { InsightTiles } from './BodyInsights'
import { bodyInsights, insightsShown } from './insights'

/** How long a note stays before it steps back: a little under one calm breath. */
const HOLD_MS = 9000
const FADE_MS = 1400

/**
 * The phone's body notes. A note shows for a moment when it arrives, just above the phase word and the controls, and then
 * steps back, so the figure stays free while breathing. All notes can be read at leisure in the sheet
 * about the exercise.
 */
export function InsightNote({ cycleIndex, active, bottom }: { cycleIndex: number; active: boolean; bottom: number }) {
  const { lang, t } = useI18n()
  const all = bodyInsights[lang]
  const count = active ? insightsShown(cycleIndex, all.length) : 0
  const [note, setNote] = useState<{ index: number; leaving: boolean } | null>(null)
  const seen = useRef(0)

  useEffect(() => {
    const isNew = count > seen.current
    seen.current = count
    if (!count) return setNote(null)
    if (!isNew) return
    setNote({ index: count - 1, leaving: false })
    const leave = window.setTimeout(() => setNote((n) => n && { ...n, leaving: true }), HOLD_MS)
    const gone = window.setTimeout(() => setNote(null), HOLD_MS + FADE_MS)
    return () => {
      window.clearTimeout(leave)
      window.clearTimeout(gone)
    }
  }, [count])

  if (!note) return null
  const it = all[note.index]
  return (
    <div
      className="pointer-events-none absolute inset-x-3 z-[5] transition-opacity ease-in-out"
      style={{ bottom, opacity: note.leaving ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
      role="status"
      aria-label={t.bodyInsights}
      data-testid="insight-note"
    >
      <div key={it.id} className="insight-in">
        <InsightTiles it={it} labels={{ place: t.insightPlace, impact: t.insightImpact }} size="phone" />
      </div>
    </div>
  )
}
