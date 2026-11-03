import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from '../components/icons'
import { Squircle } from '../components/Squircle'
import { useI18n } from '../i18n'
import { Label, OutcomeIcon, TargetIcon } from './BodyInsights'
import { bodyInsights, insightsShown, type BodyInsight } from './insights'

/** How many older cards peek out above the newest one. */
const PEEK = 2
/** How far each older card peeks out above the one in front, in px. */
const PEEK_PX = 8

/** Fanning open and folding back: slow and soft, like the breath. */
const OPEN_MS = 820
const CLOSE_MS = 700
const STAGGER_MS = 60
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'
/** How long a newly arrived card drifts in (see .insight-in). */
const ENTER_MS = 1400

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

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

  // A card drifts in only when it is new, not each time the stack closes again.
  const firstSeen = useRef(new Map<string, number>())
  const now = performance.now()
  for (const it of shown) if (!firstSeen.current.has(it.id)) firstSeen.current.set(it.id, now)
  const isEntering = (id: string) => now - (firstSeen.current.get(id) ?? 0) < ENTER_MS

  // Open, each card glides up out of the stack to its place in the list; closing, they slide back down into it.
  const list = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const fold = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLDivElement | null)[]>([])
  const [closing, setClosing] = useState(false)
  /** Where each card sits in the closed stack, as a transform from its place in the open list. */
  const stackPose = useCallback((el: HTMLElement, i: number) => {
    const area = list.current!.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const behind = Math.min(i, PEEK + 1)
    const dy = area.bottom - 8 - r.bottom - behind * PEEK_PX
    return { transform: `translateY(${dy}px) scale(${1 - behind * 0.04})`, opacity: i === 0 ? 1 : i > PEEK ? 0 : 0.5 }
  }, [])
  useLayoutEffect(() => {
    if (!expanded) return
    setClosing(false)
    list.current?.scrollTo({ top: 0 })
    if (reducedMotion()) return
    items.current.forEach((el, i) => {
      if (!el) return
      el.animate([stackPose(el, i), { transform: 'none', opacity: 1 }], { duration: OPEN_MS, delay: i * STAGGER_MS, easing: EASE, fill: 'backwards' })
    })
    veil.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS * 0.8, easing: 'ease-out', fill: 'backwards' })
    fold.current?.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: OPEN_MS * 0.45, easing: EASE, fill: 'backwards' })
  }, [expanded, stackPose])
  const close = () => {
    if (closing) return
    if (reducedMotion()) return onExpandedChange(false)
    setClosing(true)
    const els = items.current.filter((el): el is HTMLDivElement => !!el)
    const last = els.length - 1
    const runs = els.map((el, i) =>
      el.animate([{ transform: 'none', opacity: 1 }, stackPose(el, i)], { duration: CLOSE_MS, delay: (last - i) * STAGGER_MS, easing: EASE_IN_OUT, fill: 'forwards' }).finished,
    )
    const total = CLOSE_MS + last * STAGGER_MS
    veil.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: total, easing: 'ease-in-out', fill: 'forwards' })
    fold.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' })
    void Promise.all(runs)
      .catch(() => {})
      .then(() => onExpandedChange(false))
  }

  if (!shown.length) return null
  items.current.length = newestFirst.length
  const labels = { place: t.insightPlace, impact: t.insightImpact }

  if (expanded) {
    return (
      <>
      {/* Keys keep React from reusing the faded-out veil as the closed stack. */}
      <div key="veil" ref={veil} className={`pointer-events-none absolute inset-x-0 z-[5] bg-paper/55 backdrop-blur-[6px] transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`} style={{ top, bottom }} aria-hidden />
      <div
        key="list"
        ref={list}
        className={`absolute inset-x-0 z-[5] flex flex-col overflow-y-auto overscroll-contain px-3 pb-2 transition-opacity duration-500 ${closing ? 'pointer-events-none' : 'pointer-events-auto'} ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ top, bottom }}
        role="list"
        aria-label={t.bodyInsights}
        data-testid="insight-stack-open"
      >
        {/* Sits on the cards while there are few; meets the top bar and stays there once the list scrolls. */}
        <div ref={fold} className="sticky top-0 z-10 mt-auto flex justify-center pt-2 pb-2">
          <button
            type="button"
            onClick={close}
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
            <div
              key={it.id}
              ref={(el) => {
                items.current[i] = el
              }}
              role="listitem"
              className="relative origin-bottom will-change-transform"
              style={{ zIndex: newestFirst.length - i }}
            >
              <Card it={it} labels={labels} small={false} />
            </div>
          ))}
        </div>
      </div>
      </>
    )
  }

  return (
    <div
      key="stack"
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
                <div className={`h-full ${isEntering(it.id) ? 'insight-in' : ''}`}>
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
      <Squircle radius={12} smoothing={0.6} className={`${cardClass} flex h-full items-center gap-2 px-3 py-2.5`} data-testid={`insight-${it.id}`}>
        <span className="text-accent">
          <TargetIcon className="size-[0.8125rem]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.9375rem] leading-tight text-ink">{it.place}</span>
        <span className="hud-glow flex min-w-0 items-center gap-1 truncate text-[0.875rem] leading-tight text-accent">
          <OutcomeIcon className="size-[0.8125rem]" />
          {it.impact}
        </span>
        <span className="hud-dot ml-1" aria-hidden />
      </Squircle>
    )
  }
  return (
    <div className="grid h-full grid-cols-2 gap-1.5" data-testid={`insight-${it.id}`}>
      <p className="sr-only">{it.title}</p>
      <div className="fluo-location rounded-[14px] px-3.5 pt-3 pb-3">
        <Label icon={<TargetIcon className="size-[0.8125rem]" />} className="text-[0.6875rem]" onDark>
          {labels.place}
        </Label>
        <p className="mt-1.5 text-[1.0625rem] leading-tight font-bold break-words text-white [hyphens:auto]">{it.place}</p>
        <p className="mt-1 text-[0.8125rem] leading-snug text-white/60 [hyphens:auto]">{it.term}</p>
      </div>
      <div className="fluo-impact relative rounded-[14px] px-3.5 pt-3 pb-3 backdrop-blur-[10px]">
        <span className="absolute top-3 right-3 flex" aria-hidden>
          <span className="hud-dot" />
        </span>
        <Label icon={<OutcomeIcon className="size-[0.8125rem]" />} className="text-[0.6875rem]">
          {labels.impact}
        </Label>
        <p className="mt-1.5 text-[1.0625rem] leading-snug font-bold text-ink">{it.impact}</p>
        {it.value && <p className="mt-1 text-[0.8125rem] leading-snug text-ink-2 tabular-nums">{it.value}</p>}
      </div>
    </div>
  )
}
