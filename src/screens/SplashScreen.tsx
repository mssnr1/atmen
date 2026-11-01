import { useEffect, useState, type ReactNode } from 'react'
import { BreathField, breathAt } from '../calm/BreathField'
import { calmText } from '../calm/texts'
import { LeafIcon, LifebuoyIcon, LungsIcon } from '../components/icons'
import { ParticleWord } from '../components/ParticleWord'
import { useI18n } from '../i18n'
import { navigate, startPractice } from '../lib/route'

const FADE_MS = 600
/** The breath of the start screen: 5.5 s in, 5.5 s out. */
const BREATH_MS = 5500
/** The logo's letter spacing (em) breathes with the background: close when out, wide when in. */
const SPACING_OUT = 0.22
const SPACING_IN = 0.55
/** The exercise behind "I'm stressed": the long exhale. */
const STRESS_EXERCISE = 'relax'

/**
 * The start screen shown each time the app opens: the "atmen" logo breathing
 * with a living background, and three ways in: normal training, a quick
 * wind-down when stressed, and acute help in a panic.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const { lang, t } = useI18n()
  const c = calmText[lang].start
  const [leaving, setLeaving] = useState(false)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [spacing, setSpacing] = useState(reduced ? 0.4 : SPACING_OUT)

  // The specks follow each new spacing smoothly, so a few updates a second are enough.
  useEffect(() => {
    if (reduced) return
    const start = performance.now()
    const id = setInterval(() => {
      const b = breathAt(performance.now() - start, BREATH_MS, BREATH_MS)
      setSpacing(Math.round((SPACING_OUT + (SPACING_IN - SPACING_OUT) * b) * 100) / 100)
    }, 120)
    return () => clearInterval(id)
  }, [reduced])

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
      className="safe-area fixed inset-0 z-50 flex flex-col overflow-hidden bg-paper px-5"
      style={leaving ? { animation: `fade-out ${FADE_MS}ms ease-in forwards` } : undefined}
      data-testid="splash"
    >
      <BreathField center={[0.5, 0.36]} />
      <div className="relative flex flex-1 items-center justify-center pb-[8vh]">
        <div className="flex flex-col items-center">
          <ParticleWord text="atmen" spacing={spacing} fitSpacing={SPACING_IN} fontSize={56} className="h-20 w-[min(88vw,26rem)] text-breath md:h-24" />
          <p className="splash-tagline -mt-1 text-[0.9375rem] font-medium tracking-[0.14em] text-breath/80 md:text-[1.0625rem]">{t.splashTagline}</p>
        </div>
      </div>
      <nav className="start-choices relative mx-auto mb-4 flex w-full max-w-sm flex-col gap-3 md:mb-10 md:max-w-md" data-testid="start-choices">
        <Choice icon={<LungsIcon />} title={c.training.title} hint={c.training.hint} tone="primary" onClick={() => choose(() => navigate({ name: 'home' }))} testId="start-training" />
        <Choice icon={<LeafIcon />} title={c.stressed.title} hint={c.stressed.hint} tone="soft" onClick={() => choose(() => startPractice(STRESS_EXERCISE))} testId="start-stressed" />
        <Choice icon={<LifebuoyIcon />} title={c.panic.title} hint={c.panic.hint} tone="alert" onClick={() => choose(() => navigate({ name: 'sos' }))} testId="start-panic" />
      </nav>
    </div>
  )
}

const TONES = {
  primary: 'bg-blue text-white [&_.hint]:text-white/75',
  soft: 'bg-card/60 text-ink ring-1 ring-line backdrop-blur-xl [&_.hint]:text-muted',
  alert: 'bg-alert text-white shadow-[0_8px_28px_-10px_var(--color-alert)] [&_.hint]:text-white/80',
} as const

function Choice({ icon, title, hint, tone, onClick, testId }: { icon: ReactNode; title: string; hint: ReactNode; tone: keyof typeof TONES; onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`relative flex min-h-[4.25rem] w-full items-center justify-center rounded-[22px] px-16 py-3 text-center transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${TONES[tone]}`}
    >
      <span className="absolute left-5 top-1/2 -translate-y-1/2 [&>svg]:size-6">{icon}</span>
      <span>
        <span className="block text-[1.0625rem] leading-tight font-medium">{title}</span>
        <span className="hint mt-0.5 block text-[0.8125rem] leading-snug">{hint}</span>
      </span>
    </button>
  )
}
