import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'

/** How long the logo stays before it fades away, and how long the fade takes. */
const HOLD_MS = 2900
const FADE_MS = 600

/**
 * The logo page shown when the app opens: "atmen" slowly widening like an
 * inhale, with the tagline below. Tap to skip.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const [leaving, setLeaving] = useState(false)

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
        <p className="splash-word text-[2.5rem] leading-none font-light text-ink lowercase md:text-[3.25rem]">atmen</p>
        <p className="splash-tagline mt-5 text-[0.9375rem] tracking-[0.06em] text-muted md:text-[1.0625rem]">{t.splashTagline}</p>
      </div>
    </div>
  )
}
