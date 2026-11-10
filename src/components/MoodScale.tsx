import { useI18n } from '../i18n'
import type { Mood } from '../storage/types'
import { FaceIcon } from './icons'

const MOODS: Mood[] = [1, 2, 3, 4, 5]

/**
 * "How do you feel right now?": five faces from very tense to very calm. The same scale is asked before
 * and after an exercise, so the two answers can be set side by side. Nothing is measured.
 */
export function MoodScale({ label, value, onChange, testId }: { label: string; value?: number; onChange: (mood: Mood) => void; testId?: string }) {
  const { t } = useI18n()
  return (
    <div role="radiogroup" aria-label={label} className="mx-auto w-full max-w-[19rem]" data-testid={testId}>
      <div className="flex justify-between">
        {MOODS.map((m) => {
          const on = value === m
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t.moods[m - 1]}
              title={t.moods[m - 1]}
              onClick={() => onChange(m)}
              data-testid={testId ? `${testId}-${m}` : undefined}
              className={`flex size-12 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-95 ${
                on ? 'bg-solid text-on-solid' : 'bg-paper/40 text-ink ring-1 ring-ink/25 backdrop-blur-sm ring-inset hover:bg-ink/10'
              }`}
            >
              {/* The icon's own scale runs from a smile (1) to a frown (5). */}
              <FaceIcon mood={(6 - m) as Mood} className="size-7" strokeWidth={1.5} />
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between px-1 text-[0.75rem] text-ink-2" aria-hidden>
        <span>{t.moodEnds[0]}</span>
        <span>{t.moodEnds[1]}</span>
      </div>
    </div>
  )
}
