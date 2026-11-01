import { Squircle } from '../components/Squircle'
import { useI18n } from '../i18n'
import { bodyInsights, insightsShown, type BodyInsight } from './insights'

const PER_SIDE = 3

/**
 * Heads-up cards beside the head that name what is happening in the body.
 * They gather on the left (at most three), then continue on the right, and
 * stay narrow so the middle of the view is left to the figure.
 */
export function BodyInsights({ cycleIndex, visible }: { cycleIndex: number; visible: boolean }) {
  const { lang, t } = useI18n()
  const all = bodyInsights[lang]
  const shown = all.slice(0, insightsShown(cycleIndex, all.length))
  const left = shown.slice(0, PER_SIDE)
  const right = shown.slice(PER_SIDE, PER_SIDE * 2)
  return (
    <div
      className={`pointer-events-none absolute inset-0 transition-opacity duration-[1200ms] ${visible ? 'opacity-100' : 'opacity-0'}`}
      aria-label={t.bodyInsights}
      role="list"
      data-testid="body-insights"
    >
      <Column items={left} className="left-3 top-2 md:left-5" />
      <Column items={right} className="right-3 top-14 md:right-5" />
    </div>
  )
}

function Column({ items, className }: { items: BodyInsight[]; className: string }) {
  return (
    <div className={`absolute flex w-[clamp(6.5rem,20%,15rem)] flex-col gap-2 ${className}`}>
      {items.map((it) => (
        <Squircle
          key={it.id}
          radius={14}
          smoothing={0.6}
          role="listitem"
          className="insight-in bg-panel px-2.5 py-2 shadow-[0_1px_8px_rgb(0_0_0/0.05)] ring-1 ring-line/60 backdrop-blur-[6px] md:px-4 md:py-3"
          data-testid={`insight-${it.id}`}
        >
          <p className="text-[0.5625rem] leading-tight tracking-[0.04em] [hyphens:auto] text-accent uppercase md:text-[0.6875rem]">{it.term}</p>
          <p className="mt-1 text-[0.8125rem] leading-snug text-ink md:hidden">{it.short}</p>
          <p className="mt-1 hidden text-[0.875rem] leading-snug text-ink md:block">{it.title}</p>
          {it.value && <p className="mt-1 hidden text-[0.75rem] leading-tight text-muted tabular-nums md:block">{it.value}</p>}
        </Squircle>
      ))}
    </div>
  )
}
