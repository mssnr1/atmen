import type React from 'react'
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
  const labels = { place: t.insightPlace, impact: t.insightImpact }
  return (
    <div
      className={`pointer-events-none absolute inset-0 transition-opacity duration-[1200ms] ${visible ? 'opacity-100' : 'opacity-0'}`}
      aria-label={t.bodyInsights}
      role="list"
      data-testid="body-insights"
    >
      <Column items={left} labels={labels} className="left-3 top-2 md:left-5" />
      <Column items={right} labels={labels} className="right-3 top-14 md:right-5" />
    </div>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 12 12" className="size-[0.7rem] flex-none" fill="none" stroke="currentColor" strokeWidth={1.3} aria-hidden>
      <path d="M6 10.8S2.4 7.6 2.4 4.9a3.6 3.6 0 0 1 7.2 0C9.6 7.6 6 10.8 6 10.8Z" />
      <circle cx="6" cy="4.9" r="1.2" />
    </svg>
  )
}

function OutcomeIcon() {
  return (
    <svg viewBox="0 0 12 12" className="size-[0.7rem] flex-none" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9 9 3M4.2 3H9v4.8" />
    </svg>
  )
}

/** A small HUD label: icon plus uppercase word. */
function Label({ icon, children }: { icon: React.ReactNode; children: string }) {
  return (
    <span className="hud-glow flex items-center gap-1 text-[0.5625rem] leading-none tracking-[0.1em] text-accent uppercase md:text-[0.625rem]">
      {icon}
      {children}
    </span>
  )
}

function Column({ items, labels, className }: { items: BodyInsight[]; labels: { place: string; impact: string }; className: string }) {
  return (
    <div className={`absolute flex w-[clamp(6.75rem,20%,15rem)] flex-col gap-2 ${className}`}>
      {items.map((it) => (
        <Squircle
          key={it.id}
          radius={14}
          smoothing={0.6}
          role="listitem"
          className="insight-in bg-insight shadow-[0_2px_12px_rgb(0_0_0/0.06)] ring-1 ring-line/50 backdrop-blur-[10px] backdrop-saturate-150"
          data-testid={`insight-${it.id}`}
        >
          <p className="sr-only">{it.title}</p>
          {/* Where it happens. */}
          <div className="px-2.5 pt-2 pb-1.5 md:px-4 md:pt-3 md:pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label icon={<PinIcon />}>{labels.place}</Label>
              <span className="hud-dot" aria-hidden />
            </div>
            <p className="mt-1 text-[0.8125rem] leading-tight break-words text-ink [hyphens:auto] md:mt-1.5 md:text-[1rem]">{it.place}</p>
            <p className="mt-0.5 text-[0.625rem] leading-tight text-muted [hyphens:auto] md:text-[0.6875rem]">{it.term}</p>
          </div>
          {/* What it does. */}
          <div className="border-t border-accent/20 bg-accent/[0.07] px-2.5 pt-1.5 pb-1.5 md:px-4 md:pt-2 md:pb-3">
            <Label icon={<OutcomeIcon />}>{labels.impact}</Label>
            <p className="hud-glow mt-1 text-[0.75rem] leading-snug text-accent md:text-[0.9375rem]">{it.impact}</p>
            {it.value && <p className="mt-0.5 hidden text-[0.6875rem] leading-tight text-muted tabular-nums md:block">{it.value}</p>}
          </div>
        </Squircle>
      ))}
    </div>
  )
}
