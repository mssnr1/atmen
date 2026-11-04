import { useEffect, useState } from 'react'
import { calmText } from '../calm/texts'
import { ArrowRightIcon, LifebuoyIcon } from '../components/icons'
import { FluoAir } from '../components/FluoAir'
import { Wordmark } from '../components/Wordmark'
import { useI18n } from '../i18n'
import { navigate, startPractice } from '../lib/route'

const FADE_MS = 600
/** The exercise behind "I'm stressed": the long exhale. */
const STRESS_EXERCISE = 'relax'

/**
 * The start screen shown each time the app opens: the "FLUO" logo breathing
 * with a living background, and three ways in: normal training, a quick
 * wind-down when stressed, and acute help in a panic.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const { lang } = useI18n()
  const c = calmText[lang].start
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (!leaving) return
    const done = setTimeout(onDone, FADE_MS)
    return () => clearTimeout(done)
  }, [leaving, onDone])

  const choose = (go: () => void) => {
    if (leaving) return
    go()
    setLeaving(true)
  }

  return (
    <div
      className="safe-area fixed inset-0 z-50 flex flex-col overflow-hidden bg-paper"
      style={leaving ? { animation: `fade-out ${FADE_MS}ms ease-in forwards` } : undefined}
      data-testid="splash"
    >
      {/* A faint violet light behind the title, as in the style guide. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_45%_at_15%_20%,rgb(154_140_255/0.12),transparent_70%)]" aria-hidden />
      <header className="relative mx-auto w-full max-w-md px-7 pt-[6vh] md:max-w-lg">
        <Wordmark size={64} breathe />
        <h1 className="mt-6 text-[2.5rem] leading-[1.08] font-extrabold tracking-[-0.01em] text-ink md:text-[3rem]">
          {c.title[0]}
          <br />
          {c.title[1]}
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-snug text-ink-2">
          {c.lead[0]}
          <br />
          {c.lead[1]}
        </p>
      </header>
      <FluoAir className="pointer-events-none relative -mt-2 -ml-[6%] h-[24vh] w-[112%] max-w-none flex-none md:h-[28vh]" />
      <nav className="start-choices relative mx-auto mt-auto mb-2 flex w-full max-w-md flex-col items-center gap-3.5 px-6 md:mb-10 md:max-w-lg" data-testid="start-choices">
        <button
          type="button"
          onClick={() => choose(() => navigate({ name: 'home' }))}
          data-testid="start-training"
          className="bg-fluo relative flex h-[3.75rem] w-full items-center justify-center rounded-full text-[1.1875rem] font-bold transition active:scale-[0.98]"
        >
          {c.training.title}
          <ArrowRightIcon className="absolute right-7 size-6" />
        </button>
        <button
          type="button"
          onClick={() => choose(() => startPractice(STRESS_EXERCISE))}
          data-testid="start-stressed"
          className="flex h-[3.25rem] w-full items-center justify-center rounded-full text-[1.0625rem] font-bold text-ink ring-[1.5px] ring-lavender/70 transition hover:bg-ink/5 active:scale-[0.98]"
        >
          {c.stressed.title}
        </button>
        {/* Acute help stays one tap away, where the guide shows its text link. */}
        <button
          type="button"
          onClick={() => choose(() => navigate({ name: 'sos' }))}
          data-testid="start-panic"
          className="mt-1 flex items-center gap-2 rounded-full px-4 py-2.5 text-[1.0625rem] font-semibold text-alert transition hover:bg-alert/10"
        >
          <LifebuoyIcon className="size-5" />
          {c.panic.title}
        </button>
      </nav>
    </div>
  )
}
