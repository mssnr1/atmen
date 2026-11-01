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
      <Column items={left} impactLabel={t.insightImpact} className="left-3 top-2 md:left-5" />
      <Column items={right} impactLabel={t.insightImpact} className="right-3 top-14 md:right-5" />
    </div>
  )
}

function Column({ items, impactLabel, className }: { items: BodyInsight[]; impactLabel: string; className: string }) {
  return (
    <div className={`absolute flex w-[clamp(6.75rem,20%,15rem)] flex-col gap-2 ${className}`}>
      {items.map((it) => (
        <Squircle
          key={it.id}
          radius={14}
          smoothing={0.6}
          role="listitem"
          className="insight-in bg-insight px-2.5 py-2 shadow-[0_2px_12px_rgb(0_0_0/0.08)] ring-1 ring-line/60 backdrop-blur-[14px] backdrop-saturate-150 md:px-4 md:py-3"
          data-testid={`insight-${it.id}`}
        >
          <p className="hud-glow flex items-start gap-1.5 text-[0.5625rem] leading-tight tracking-[0.06em] text-accent uppercase [hyphens:auto] md:text-[0.6875rem]">
            <span className="hud-dot mt-[0.2em] md:mt-[0.25em]" aria-hidden />
            <span className="min-w-0">{it.term}</span>
          </p>
          <p className="mt-1 hidden text-[0.875rem] leading-snug text-ink md:block">{it.title}</p>
          <p className="mt-1 flex flex-wrap md:mt-1.5 items-center gap-x-1.5 gap-y-0.5">
            <span className="rounded-full border border-accent/40 px-1.5 py-px text-[0.5rem] leading-tight tracking-[0.08em] text-accent uppercase md:text-[0.5625rem]">
              {impactLabel}
            </span>
            <span className="hud-glow text-[0.8125rem] leading-snug text-accent md:text-[0.75rem] md:leading-tight">{it.impact}</span>
          </p>
          {it.value && <p className="mt-1 hidden text-[0.75rem] leading-tight text-muted tabular-nums md:block">{it.value}</p>}
        </Squircle>
      ))}
    </div>
  )
}
