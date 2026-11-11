import { useEffect, useRef, useState } from 'react'
import { BreathSign } from '../components/BreathSign'
import { Button } from '../components/Button'
import { Wordmark } from '../components/Wordmark'
import { useI18n } from '../i18n'
import { navigate } from '../lib/route'
import { store } from '../storage/store'

/** Seconds the sign takes to fill while held, and to empty once let go: an unhurried breath. */
const FILL_S = 4.6
/** How full the sign must have been for the breath to count. */
const ENOUGH = 0.3

type Step = 'ready' | 'in' | 'out' | 'short' | 'done'

/**
 * The very first open: no menu, no introduction, one breath. Holding the sign is breathing in, letting go
 * is breathing out; the light follows the finger. After that the app opens.
 */
export function FirstBreath({ onDone }: { onDone?: () => void }) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('ready')
  const sign = useRef<SVGSVGElement>(null)
  const state = useRef({ hold: false, level: 0, peak: 0, last: 0, frame: 0, done: false })

  useEffect(() => () => cancelAnimationFrame(state.current.frame), [])
  // The figure waits behind this page: fetch it now, so it is there when the page opens.
  useEffect(() => {
    if (store.get().preferences.visualizationMode !== 'abstract') void import('../visualization/anatomy3d/Anatomy3DVisualization').catch(() => {})
  }, [])

  const tick = (now: number) => {
    const s = state.current
    const dt = Math.min(0.05, (now - s.last) / 1000)
    s.last = now
    s.level = s.hold ? Math.min(1, s.level + dt / FILL_S) : Math.max(0, s.level - dt / FILL_S)
    s.peak = Math.max(s.peak, s.level)
    sign.current?.style.setProperty('--lv', s.level.toFixed(4))
    if (!s.hold && s.level === 0) {
      s.frame = 0
      if (s.peak > ENOUGH) {
        s.done = true
        setStep('done')
      } else setStep('short')
      s.peak = 0
      return
    }
    s.frame = requestAnimationFrame(tick)
  }
  const press = () => {
    const s = state.current
    if (s.done) return
    s.hold = true
    setStep('in')
    if (!s.frame) {
      s.last = performance.now()
      s.frame = requestAnimationFrame(tick)
    }
  }
  const release = () => {
    const s = state.current
    if (!s.hold) return
    s.hold = false
    if (!s.done) setStep('out')
  }
  const finish = () => {
    store.updatePreferences({ welcomeSeen: true })
    onDone?.()
    navigate({ name: 'home' })
  }

  const done = step === 'done'
  const [line, sub] =
    step === 'in'
      ? [t.phase.inhale, t.firstBreath.inhaleSub]
      : step === 'out'
        ? [t.phase.exhale, t.firstBreath.exhaleSub]
        : step === 'short'
          ? [t.firstBreath.longer, t.firstBreath.hold]
          : done
            ? [t.firstBreath.welcome, t.firstBreath.welcomeSub]
            : [t.firstBreath.hold, t.firstBreath.holdSub]
  const word = step === 'in' || step === 'out'

  return (
    <main className="safe-area relative z-10 flex h-dvh flex-col overflow-hidden bg-paper px-6" data-testid="first-breath">
      <header className="mx-auto flex w-full max-w-md items-center justify-between md:max-w-3xl">
        <Wordmark size={30} className="mt-1" />
        {!done && (
          <button type="button" onClick={finish} className="-mr-3 min-h-11 rounded-full px-3 text-body text-ink-2 hover:text-ink" data-testid="first-breath-skip">
            {t.skip}
          </button>
        )}
      </header>
      <div className="flex flex-1 flex-col items-center justify-center pb-[6dvh]">
        <button
          type="button"
          aria-label={t.firstBreath.pad}
          disabled={done}
          className="size-[min(60vw,15rem)] touch-none rounded-full text-ink outline-offset-8 transition-transform duration-700 select-none focus-visible:outline-2 focus-visible:outline-ink active:scale-[1.03]"
          style={{ WebkitTouchCallout: 'none' }}
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.setPointerCapture?.(e.pointerId)
            press()
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault()
              press()
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault()
              release()
            }
          }}
          data-testid="first-breath-pad"
        >
          <BreathSign ref={sign} n={9} className="size-full" style={{ ['--lv' as string]: done ? 1 : 0, ['--rest' as string]: 0.16 }} />
        </button>
        <div className="mt-10 min-h-[5.5rem] text-center" aria-live="polite">
          <p key={step} className={`fade-in ${word ? 'phase-word text-[1.75rem]' : 'display text-[1.5rem]'} text-ink`}>
            {line}
          </p>
          <p className="mt-2 text-body text-ink-2">{sub}</p>
        </div>
      </div>
      <div className="mx-auto h-14 w-full max-w-md">
        {done && (
          <Button onClick={finish} className="fade-up w-full" data-testid="first-breath-next">
            {t.next}
          </Button>
        )}
      </div>
    </main>
  )
}
