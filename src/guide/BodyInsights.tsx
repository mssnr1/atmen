import type React from 'react'
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

/** A small label: icon plus uppercase word. */
export function Label({ icon, children, className = 'text-[0.6875rem]' }: { icon: React.ReactNode; children: string; className?: string }) {
  return (
    <span className={`flex items-center gap-1.5 leading-none font-semibold tracking-[0.06em] text-ink/80 uppercase ${className}`}>
      {icon}
      {children}
    </span>
  )
}

type Size = 'phone' | 'tablet' | 'desktop'

/** Type sizes and padding of the insight cards (style guide: semibold titles, a quieter line below). */
const TEXT: Record<Size, { pad: string; label: string; icon: string; title: string; sub: string }> = {
  phone: { pad: 'px-3.5 pt-3 pb-3.5', label: 'text-[0.6875rem]', icon: 'size-[0.75rem]', title: 'mt-2 text-[1.0625rem]', sub: 'mt-1 text-[0.8125rem]' },
  tablet: { pad: 'px-3 pt-2.5 pb-3', label: 'text-[0.625rem]', icon: 'size-[0.6875rem]', title: 'mt-1.5 text-[0.9375rem]', sub: 'mt-0.5 text-[0.6875rem]' },
  desktop: { pad: 'px-5 pt-4 pb-[1.125rem]', label: 'text-[0.75rem]', icon: 'size-[0.875rem]', title: 'mt-2.5 text-[1.25rem]', sub: 'mt-1 text-[0.875rem]' },
}

type Labels = { place: string; impact: string }

function PlaceText({ it, labels, size }: { it: BodyInsight; labels: Labels; size: Size }) {
  const t = TEXT[size]
  return (
    <>
      <Label icon={<TargetIcon className={t.icon} />} className={t.label}>
        {labels.place}
      </Label>
      <p className={`${t.title} leading-tight font-semibold break-words text-ink [hyphens:auto]`}>{it.place}</p>
      <p className={`${t.sub} leading-snug text-ink-2 [hyphens:auto]`}>{it.term}</p>
    </>
  )
}

function ImpactText({ it, labels, size }: { it: BodyInsight; labels: Labels; size: Size }) {
  const t = TEXT[size]
  return (
    <>
      <Label icon={<OutcomeIcon className={t.icon} />} className={t.label}>
        {labels.impact}
      </Label>
      <p className={`${t.title} leading-tight font-semibold text-ink [hyphens:auto]`}>{it.impact}</p>
      {it.value && <p className={`${t.sub} leading-snug text-ink-2 tabular-nums`}>{it.value}</p>}
    </>
  )
}

/**
 * The guide's two tiles, the same during and after the exercise: location in violet glass, impact in glass from
 * violet to mint, both opaque pebbles with a glowing edge; side by side or one above the other.
 */
export function InsightTiles({ it, labels, size, dir = 'row', className = '' }: { it: BodyInsight; labels: Labels; size: Size; dir?: 'row' | 'col'; className?: string }) {
  const t = TEXT[size]
  return (
    <div className={`grid gap-2 ${dir === 'row' ? 'grid-cols-2' : 'grid-cols-1'} ${className}`} data-testid={`insight-${it.id}`}>
      <p className="sr-only">{it.title}</p>
      <div className={`fluo-tile fluo-tile-place rounded-[20px] ${t.pad}`}>
        <PlaceText it={it} labels={labels} size={size} />
      </div>
      <div className={`fluo-tile fluo-tile-impact rounded-[20px] ${t.pad}`}>
        <ImpactText it={it} labels={labels} size={size} />
      </div>
    </div>
  )
}

function Column({ items, labels, className }: { items: BodyInsight[]; labels: Labels; className: string }) {
  return (
    <div className={`absolute flex w-[clamp(7.5rem,21%,15rem)] flex-col gap-2.5 lg:w-[clamp(21rem,28%,29rem)] lg:gap-3 ${className}`}>
      {items.map((it) => (
        <div key={it.id} role="listitem" className="insight-in">
          {/* The guide's two tiles: side by side on wide screens, one above the other on narrower ones. */}
          <InsightTiles it={it} labels={labels} size="desktop" className="hidden lg:grid" />
          <InsightTiles it={it} labels={labels} size="tablet" dir="col" className="lg:hidden" />
        </div>
      ))}
    </div>
  )
}
