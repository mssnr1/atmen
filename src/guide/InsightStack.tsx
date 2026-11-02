import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from '../components/icons'
import { Squircle } from '../components/Squircle'
import { useI18n } from '../i18n'
import { Label, OutcomeIcon, TargetIcon } from './BodyInsights'
import { bodyInsights, insightsShown, type BodyInsight } from './insights'

/** How many older cards peek out above the newest one. */
const PEEK = 2
/** How far each older card peeks out above the one in front, in px. */
const PEEK_PX = 8

const cardClass = 'bg-insight shadow-[0_2px_14px_rgb(0_0_0/0.08)] backdrop-blur-[10px] backdrop-saturate-150'

/**
 * The phone's alternative to the insight columns: the cards lie in a stack
 * just above the controls panel, full width, the newest in front and the
 * older ones fanned out a little behind it. A tap fans them all open upwards,
 * one above the other, up to the top bar; past that the list scrolls.
 * `small` shows slim one-line cards, while the panel below is at full size.
 */
export function InsightStack({
  cycleIndex,
  visible,
  small,
  expanded,
  onExpandedChange,
  top,
  bottom,
  onHeight,
}: {
  cycleIndex: number
  visible: boolean
  small: boolean
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  /** Space taken by the top bar, in px. */
  top: number
  /** Space taken by the controls panel, in px. */
  bottom: number
  /** Reports the height the closed stack takes above the panel (0 without cards). */
  onHeight: (h: number) => void
}) {
  const { lang, t } = useI18n()
  const all = bodyInsights[lang]
  const shown = all.slice(0, insightsShown(cycleIndex, all.length))
  const newestFirst = [...shown].reverse()

  // The closed stack is as tall as its front card; the cards behind take that height too.
  const front = useRef<HTMLDivElement>(null)
  const [frontH, setFrontH] = useState(0)
  useLayoutEffect(() => {
    const el = front.current
    if (!el) {
      setFrontH(0)
      return
    }
    const ro = new ResizeObserver(() => setFrontH(el.offsetHeight))
    ro.observe(el)
    setFrontH(el.offsetHeight)
    return () => ro.disconnect()
  }, [shown.length, small, expanded])
  const peeks = Math.min(PEEK, Math.max(0, shown.length - 1))
  const stackH = shown.length && visible ? frontH + peeks * PEEK_PX + 8 : 0
  useEffect(() => {
    if (!expanded) onHeight(stackH)
  }, [stackH, expanded, onHeight])

  // Opening starts at the newest card, right under the fold button.
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (expanded) list.current?.scrollTo({ top: 0 })
  }, [expanded])

  if (!shown.length) return null
  const labels = { place: t.insightPlace, impact: t.insightImpact }

  if (expanded) {
    return (
      <div
        ref={list}
        className={`pointer-events-auto absolute inset-x-0 z-[5] flex flex-col bg-paper/55 backdrop-blur-[6px] overflow-y-auto overscroll-contain px-3 pb-2 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ top, bottom }}
        role="list"
        aria-label={t.bodyInsights}
        data-testid="insight-stack-open"
      >
        {/* Sits on the cards while there are few; meets the top bar and stays there once the list scrolls. */}
        <div className="sticky top-0 z-10 mt-auto flex justify-center pt-2 pb-2">
          <button
            type="button"
            onClick={() => onExpandedChange(false)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-card/85 px-4 text-[0.8125rem] text-ink shadow-[0_1px_8px_rgb(0_0_0/0.1)] ring-1 ring-line/60 backdrop-blur active:scale-95"
            aria-expanded
            data-testid="insight-collapse"
          >
            <ChevronDownIcon className="size-4" strokeWidth={1.8} />
            {t.insightsCollapse}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {newestFirst.map((it, i) => (
            <div key={it.id} role="listitem" className="stack-fan" style={{ animationDelay: `${i * 55}ms` }}>
              <Card it={it} labels={labels} small={false} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`absolute inset-x-0 z-[5] px-3 transition-opacity duration-[1200ms] ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      style={{ bottom: bottom + 8, height: frontH + peeks * PEEK_PX }}
      data-testid="insight-stack"
    >
      <button
        type="button"
        onClick={() => onExpandedChange(true)}
        className="pointer-events-auto relative block size-full text-left"
        aria-expanded={false}
        aria-label={`${t.insightsExpand} (${shown.length})`}
        data-testid="insight-expand"
      >
        {newestFirst.map((it, i) => {
          const behind = Math.min(i, PEEK + 1)
          return (
            <div
              key={it.id}
              ref={i === 0 ? front : undefined}
              className="absolute inset-x-0 bottom-0 origin-top transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                zIndex: 10 - i,
                height: i === 0 ? undefined : frontH,
                transform: `translateY(${-behind * PEEK_PX}px) scale(${1 - behind * 0.04})`,
                opacity: i > PEEK ? 0 : 1 - behind * 0.18,
              }}
              aria-hidden={i > 0}
            >
              {i === 0 ? (
                <div className="insight-in h-full">
                  <Card it={it} labels={labels} small={small} />
                </div>
              ) : (
                // The cards behind are bare shells: their text would show through the translucent front card.
                <Squircle radius={small ? 12 : 14} smoothing={0.6} className={`${cardClass} h-full`} />
              )}
            </div>
          )
        })}
        {shown.length > 1 && (
          <span className="absolute -top-2.5 right-3 z-20 rounded-full bg-accent px-1.5 text-[0.625rem] leading-4 text-paper tabular-nums" aria-hidden>
            {shown.length}
          </span>
        )}
      </button>
    </div>
  )
}

/** A full-width card: where it happens on the left, what it does on the right; or one slim line. */
function Card({ it, labels, small }: { it: BodyInsight; labels: { place: string; impact: string }; small: boolean }) {
  if (small) {
    return (
      <Squircle radius={12} smoothing={0.6} className={`${cardClass} flex h-full items-center gap-2 px-3 py-2`} data-testid={`insight-${it.id}`}>
        <span className="text-accent">
          <TargetIcon />
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] leading-tight text-ink">{it.place}</span>
        <span className="hud-glow flex min-w-0 items-center gap-1 truncate text-[0.75rem] leading-tight text-accent">
          <OutcomeIcon />
          {it.impact}
        </span>
        <span className="hud-dot ml-1" aria-hidden />
      </Squircle>
    )
  }
  return (
    <Squircle radius={14} smoothing={0.6} className={`${cardClass} grid h-full grid-cols-2`} data-testid={`insight-${it.id}`}>
      <p className="sr-only">{it.title}</p>
      <div className="px-3 pt-2.5 pb-2.5">
        <Label icon={<TargetIcon />}>{labels.place}</Label>
        <p className="mt-1 text-[0.9375rem] leading-tight break-words text-ink [hyphens:auto]">{it.place}</p>
        <p className="mt-0.5 text-[0.6875rem] leading-tight text-muted [hyphens:auto]">{it.term}</p>
      </div>
      <div className="relative border-l border-accent/20 bg-accent/[0.07] px-3 pt-2.5 pb-2.5">
        <span className="absolute top-3 right-3 flex" aria-hidden>
          <span className="hud-dot" />
        </span>
        <Label icon={<OutcomeIcon />}>{labels.impact}</Label>
        <p className="hud-glow mt-1 text-[0.875rem] leading-snug text-accent">{it.impact}</p>
        {it.value && <p className="mt-0.5 text-[0.6875rem] leading-tight text-muted tabular-nums">{it.value}</p>}
      </div>
    </Squircle>
  )
}
