import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'
import { BottomSheet } from './BottomSheet'
import { IconButton } from './Button'
import { FullscreenExitIcon, FullscreenIcon } from './icons'

// Safari only knows the prefixed names on older versions.
type Doc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void }
type El = HTMLElement & { webkitRequestFullscreen?: () => void }

const doc = document as Doc

const fullscreenSupported = () => Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled)
const isFullscreen = () => Boolean(doc.fullscreenElement || doc.webkitFullscreenElement)
/** Started from the Home Screen: there is no browser bar to hide. */
const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
/** iPhone Safari has no fullscreen API; the way there is adding the app to the Home Screen. */
const isIos = () => /iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !fullscreenSupported())

/**
 * Hides the browser's own bars. Where the browser can't do that (iPhone), it
 * explains how to open atmen from the Home Screen instead.
 */
export function FullscreenButton() {
  const { t } = useI18n()
  const [on, setOn] = useState(isFullscreen)
  const [hintOpen, setHintOpen] = useState(false)
  const closeHint = useCallback(() => setHintOpen(false), [])

  useEffect(() => {
    const update = () => setOn(isFullscreen())
    document.addEventListener('fullscreenchange', update)
    document.addEventListener('webkitfullscreenchange', update)
    return () => {
      document.removeEventListener('fullscreenchange', update)
      document.removeEventListener('webkitfullscreenchange', update)
    }
  }, [])

  if (isStandalone()) return null
  const supported = fullscreenSupported()
  if (!supported && !isIos()) return null

  const toggle = () => {
    if (!supported) return setHintOpen(true)
    if (isFullscreen()) {
      if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => {})
      else doc.webkitExitFullscreen?.()
      return
    }
    const root = document.documentElement as El
    if (root.requestFullscreen) void root.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
    else root.webkitRequestFullscreen?.()
  }

  return (
    <>
      <IconButton label={on ? t.exitFullscreen : t.fullscreen} pressed={on} onClick={toggle} data-testid="fullscreen">
        {on ? <FullscreenExitIcon className="size-5" strokeWidth={1.5} /> : <FullscreenIcon className="size-5" strokeWidth={1.5} />}
      </IconButton>
      {/* Portalled, so the sheet sits above the controls rather than inside the header's layer. */}
      {!supported &&
        createPortal(
          <BottomSheet open={hintOpen} title={t.fullscreenIos.title} closeLabel={t.close} onClose={closeHint}>
            <ol className="list-decimal space-y-2 pt-2 pl-5 text-[0.9375rem] leading-relaxed">
              {t.fullscreenIos.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-4 pb-2 text-[0.875rem] leading-relaxed text-muted">{t.fullscreenIos.note}</p>
          </BottomSheet>,
          document.body,
        )}
    </>
  )
}
