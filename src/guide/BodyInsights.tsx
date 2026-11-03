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

export function TargetIcon({ className = 'size-[0.7rem]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={`${className} flex-none`} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" aria-hidden>
      <circle cx="6" cy="6" r="3.9" />
      <path d="M6 0.6v2.6M6 8.8v2.6M0.6 6h2.6M8.8 6h2.6" />
      <circle cx="6" cy="6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function OutcomeIcon({ className = 'size-[0.7rem]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={`${className} flex-none`} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9 9 3M4.2 3H9v4.8" />
    </svg>
  )
}

/** A small HUD label: icon plus uppercase word. */
export function Label({ icon, children, className = 'text-[0.5625rem] md:text-[0.625rem] lg:text-[0.75rem]', onDark }: { icon: React.ReactNode; children: string; className?: string; onDark?: boolean }) {
  return (
    <span className={`flex items-center gap-1 leading-none font-bold tracking-[0.08em] uppercase ${onDark ? 'text-white/70' : 'text-ink-2'} ${className}`}>
      {icon}
      {children}
    </span>
  )
}

function Column({ items, labels, className }: { items: BodyInsight[]; labels: { place: string; impact: string }; className: string }) {
  return (
    <div className={`absolute flex w-[clamp(6.75rem,20%,15rem)] lg:w-[clamp(16rem,24%,24rem)] flex-col gap-2 ${className}`}>
      {items.map((it) => (
        <Squircle
          key={it.id}
          radius={14}
          smoothing={0.6}
          role="listitem"
          className="insight-in shadow-[0_4px_18px_-6px_rgb(21_24_38/0.35)] backdrop-blur-[10px]"
          data-testid={`insight-${it.id}`}
        >
          <p className="sr-only">{it.title}</p>
          {/* Where it happens. */}
          <div className="fluo-location px-2.5 pt-2 pb-1.5 md:px-4 md:pt-3 md:pb-2.5 lg:px-5 lg:pt-4 lg:pb-3.5">
            <div className="flex items-center justify-between gap-2">
              <Label icon={<TargetIcon className="size-[0.7rem] lg:size-[0.85rem]" />} onDark>
                {labels.place}
              </Label>
              <span className="hud-dot" aria-hidden />
            </div>
            <p className="mt-1 text-[0.8125rem] leading-tight font-bold break-words text-white [hyphens:auto] md:mt-1.5 md:text-[1rem] lg:mt-2 lg:text-[1.375rem]">{it.place}</p>
            <p className="mt-0.5 text-[0.625rem] leading-tight text-white/60 [hyphens:auto] md:text-[0.6875rem] lg:mt-1 lg:text-[0.875rem]">{it.term}</p>
          </div>
          {/* What it does. */}
          <div className="fluo-impact px-2.5 pt-1.5 pb-1.5 md:px-4 md:pt-2 md:pb-3 lg:px-5 lg:pt-3 lg:pb-4">
            <Label icon={<OutcomeIcon className="size-[0.7rem] lg:size-[0.85rem]" />}>{labels.impact}</Label>
            <p className="mt-1 text-[0.75rem] leading-snug font-bold text-ink md:text-[0.9375rem] lg:mt-1.5 lg:text-[1.1875rem]">{it.impact}</p>
            {it.value && <p className="mt-0.5 hidden text-[0.6875rem] leading-tight text-ink-2 tabular-nums md:block lg:mt-1 lg:text-[0.875rem]">{it.value}</p>}
          </div>
        </Squircle>
      ))}
    </div>
  )
}
