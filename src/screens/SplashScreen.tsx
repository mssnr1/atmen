import { useEffect, useState } from 'react'
import { ParticleWord } from '../components/ParticleWord'
import { useI18n } from '../i18n'

/** How long the logo stays before it fades away, and how long the fade takes. */
const HOLD_MS = 2900
const FADE_MS = 600
/** The logo's letter spacing (em) widens in small steps like an inhale; the specks flow along. */
const SPACING_FROM = 0.22
const SPACING_TO = 0.6
const SPACING_STEPS = 6
const STEP_MS = 400

/**
 * The logo page shown when the app opens: "atmen" slowly widening like an
 * inhale, with the tagline below. Tap to skip.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const [leaving, setLeaving] = useState(false)
  const [step, setStep] = useState(0)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const spacing = reduced ? 0.45 : SPACING_FROM + ((SPACING_TO - SPACING_FROM) * step) / SPACING_STEPS

  useEffect(() => {
    if (reduced || step >= SPACING_STEPS) return
    const next = setTimeout(() => setStep(step + 1), step === 0 ? 150 : STEP_MS)
    return () => clearTimeout(next)
  }, [step, reduced])

  useEffect(() => {
    if (leaving) {
      const done = setTimeout(onDone, FADE_MS)
      return () => clearTimeout(done)
    }
    const leave = setTimeout(() => setLeaving(true), HOLD_MS)
    return () => clearTimeout(leave)
  }, [leaving, onDone])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper px-6"
      style={leaving ? { animation: `fade-out ${FADE_MS}ms ease-in forwards` } : undefined}
      onClick={() => setLeaving(true)}
      data-testid="splash"
    >
      <div className="text-center">
        <ParticleWord text="atmen" spacing={spacing} fontSize={56} className="h-24 w-[min(88vw,26rem)] text-breath md:h-28" />
        <p className="splash-tagline mt-3 text-[0.9375rem] tracking-[0.06em] text-muted md:text-[1.0625rem]">{t.splashTagline}</p>
      </div>
    </div>
  )
}
