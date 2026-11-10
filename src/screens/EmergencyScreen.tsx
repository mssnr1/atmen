import { useEffect, useRef, useState, type ReactNode } from 'react'
import { calmText } from '../calm/texts'
import { BreathSign } from '../components/BreathSign'
import { CloseIcon } from '../components/icons'
import { useI18n } from '../i18n'
import { breathCurve } from '../lib/breathClock'
import { formatClock } from '../lib/format'
import { navigate } from '../lib/route'

/** A slow, simple rhythm without holds: 4 s in, 6 s out (6 breaths a minute). */
const IN_MS = 4000
const OUT_MS = 6000
const CYCLE_MS = IN_MS + OUT_MS
/** A new calming sentence every two breaths. */
const LINE_EVERY = 2

/**
 * Acute help: the breath sign to breathe with, large and alone, a calm sentence that changes every two
 * breaths, and below it grounding, the coming community help and where to find real help in an
 * emergency. The same sign and light as everywhere else; red marks only the way to help.
 */
export function EmergencyScreen() {
  const { lang } = useI18n()
  const s = calmText[lang].sos
  const sign = useRef<SVGSVGElement>(null)
  const [tick, setTick] = useState({ inhale: true, left: 4, cycle: 0, elapsed: 0 })

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const ms = now - start
      const t = ms % CYCLE_MS
      const inhale = t < IN_MS
      const level = inhale ? breathCurve(t / IN_MS) : 1 - breathCurve((t - IN_MS) / OUT_MS)
      if (sign.current) {
        sign.current.style.setProperty('--lv', level.toFixed(4))
        sign.current.style.transform = `scale(${(0.92 + 0.08 * level).toFixed(4)})`
      }
      const left = Math.ceil(((inhale ? IN_MS : CYCLE_MS) - t) / 1000)
      const cycle = Math.floor(ms / CYCLE_MS)
      const elapsed = Math.floor(ms / 1000)
      setTick((p) => (p.inhale === inhale && p.left === left && p.cycle === cycle && p.elapsed === elapsed ? p : { inhale, left, cycle, elapsed }))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const line = Math.floor(tick.cycle / LINE_EVERY) % s.lines.length

  return (
    <main className="relative z-10 min-h-dvh overflow-hidden bg-paper" data-testid="sos">
      <div className="safe-area relative mx-auto flex w-full max-w-md flex-col px-5 md:max-w-xl">
        <header className="flex items-center justify-between">
          <span className="eyebrow">{s.title}</span>
          <div className="flex items-center gap-2">
            <a href="tel:112" className="inline-flex h-11 items-center rounded-full px-4 text-[0.9375rem] font-semibold text-alert ring-1 ring-alert/50 ring-inset">
              {s.emergencyCall}
            </a>
            <button type="button" aria-label={s.close} onClick={() => navigate({ name: 'home' })} className="inline-flex size-11 items-center justify-center rounded-full text-ink ring-1 ring-line ring-inset hover:bg-ink/5">
              <CloseIcon className="size-5" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* The breath: fills most of the first screen, so nothing else needs reading. */}
        <section className="flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center pb-6">
          <BreathSign ref={sign} n={11} className="size-[min(64vw,17rem)] text-ink will-change-transform" style={{ ['--lv' as string]: 0 }} />
          <div className="mt-8 text-center">
            <div key={tick.inhale ? 'in' : 'out'} className="fade-in phase-word text-[1.75rem] md:text-[2rem]">
              {tick.inhale ? s.inhale : s.exhale}
            </div>
            <div className="mt-1 text-[1.0625rem] text-ink-2 tabular-nums">{tick.left}</div>
          </div>
          <p key={line} className="fade-in mt-8 min-h-[3.5rem] max-w-xs text-center text-[1.1875rem] leading-snug text-ink md:max-w-sm md:text-[1.375rem]" aria-live="polite">
            {s.lines[line]}
          </p>
          <p className="mt-4 text-[0.8125rem] text-muted tabular-nums">{s.since(formatClock(tick.elapsed * 1000))}</p>
        </section>

        <section className="space-y-3 pb-10">
          <Card>
            <h2 className="text-[1.0625rem] font-medium">{s.groundingTitle}</h2>
            <ol className="mt-3 space-y-1.5 text-[0.9375rem] text-ink-2">
              {s.grounding.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ol>
          </Card>

          {/* Community help: only sketched for now, not working yet. */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[1.0625rem] font-medium">{s.communityTitle}</h2>
              <span className="shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-medium text-ink-2 ring-1 ring-ink/25">{s.soon}</span>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-snug text-ink-2">{s.communityText}</p>
          </Card>

          <Card>
            <h2 className="text-[1.0625rem] font-medium">{s.helpTitle}</h2>
            <p className="mt-2 text-[0.9375rem] leading-snug text-ink-2">{s.helpText}</p>
            <a href="tel:112" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-alert text-[1rem] font-semibold text-on-solid" data-testid="sos-call">
              {s.emergencyCall}
            </a>
            <h2 className="mt-6 text-[1.0625rem] font-medium">{s.talkTitle}</h2>
            <p className="mt-2 text-[0.9375rem] leading-snug text-ink-2">{s.talkText}</p>
            <a href={`tel:${s.talkNumber}`} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full text-[1rem] font-semibold text-ink ring-1 ring-ink/30 ring-inset hover:bg-ink/5">
              {s.talkCall}
            </a>
          </Card>

          <p className="px-2 pt-2 text-center text-[0.8125rem] leading-snug text-muted">{s.disclaimer}</p>
        </section>
      </div>
    </main>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <div className="fluo-card rounded-[22px] p-5">{children}</div>
}
