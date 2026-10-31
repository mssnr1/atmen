import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { BluePage } from '../components/BluePage'
import { ArrowRightIcon } from '../components/icons'
import { WelcomeArt } from '../components/WelcomeArt'
import { Wordmark } from '../components/Wordmark'
import { useI18n } from '../i18n'
import { navigate } from '../lib/route'
import { store } from '../storage/store'

/** Fullscreen blue introduction: a few pages, dots and one arrow. */
export function WelcomeScreen() {
  const { t } = useI18n()
  const [page, setPage] = useState(0)
  const last = page === t.welcome.length - 1
  const finish = () => {
    store.updatePreferences({ welcomeSeen: true })
    navigate({ name: 'home' })
  }
  const count = t.welcome.length
  const go = (p: number) => setPage(Math.min(Math.max(p, 0), count - 1))

  // Swipe between the pages: the track follows the finger and snaps to the
  // nearest page on release, with a quick flick enough to turn one.
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; t: number; dx: number; horizontal: boolean | null } | null>(null)
  const [dx, setDx] = useState(0)
  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, horizontal: null }
  }
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const mx = e.clientX - d.x
    const my = e.clientY - d.y
    if (d.horizontal === null && Math.hypot(mx, my) > 8) {
      d.horizontal = Math.abs(mx) > Math.abs(my)
      if (d.horizontal) track.current?.setPointerCapture(e.pointerId)
    }
    if (!d.horizontal) return
    // Resist at the first and last page.
    const edge = (page === 0 && mx > 0) || (page === count - 1 && mx < 0)
    d.dx = edge ? mx / 3 : mx
    setDx(d.dx)
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.horizontal) return
    const width = track.current?.clientWidth ?? 1
    const speed = d.dx / Math.max(1, performance.now() - d.t)
    if (d.dx < -width * 0.2 || speed < -0.5) go(page + 1)
    else if (d.dx > width * 0.2 || speed > 0.5) go(page - 1)
    setDx(0)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPage((p) => Math.min(p + 1, count - 1))
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(p - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count])

  return (
    <BluePage testId="welcome">
      <header className="flex items-center justify-between pt-4">
        <Wordmark className="text-[1.0625rem] md:text-[1.25rem]" />
        {!last && (
          <button type="button" onClick={finish} className="-mr-2 rounded-full px-3 py-2 text-[0.9375rem] text-white/75 hover:text-white">
            {t.skip}
          </button>
        )}
      </header>

      <div
        ref={track}
        className="-mx-7 flex flex-1 touch-pan-y md:-mx-14 overflow-hidden select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-testid="welcome-track"
      >
        <div
          className={`flex w-full ${dx === 0 ? 'transition-transform duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]' : ''}`}
          style={{ transform: `translateX(calc(${-page * 100}% + ${dx}px))` }}
        >
          {t.welcome.map((p, i) => (
            <section
              key={i}
              className="flex w-full shrink-0 flex-col justify-center px-7 py-10 md:px-14 lg:grid lg:grid-cols-2 lg:content-center lg:items-center lg:gap-16"
              aria-hidden={i !== page}
              aria-live={i === page ? 'polite' : undefined}
            >
              <div>
              <WelcomeArt index={i} className={`${p.closing ? 'mb-7' : 'mb-10'} h-16 w-40 text-white md:h-24 md:w-64`} />
              {p.eyebrow && <p className="mb-3 text-[0.9375rem] tracking-[0.08em] text-white/70 md:text-[1.1875rem]">{p.eyebrow}</p>}
              <h1 className={`${p.closing ? 'text-[2.375rem]' : 'text-[2.75rem]'} leading-[1.08] font-normal tracking-[-0.01em] text-balance md:text-[4.5rem] lg:text-[5rem]`}>{p.title}</h1>
              </div>
              <div>
              <p className={`${p.closing ? 'mt-6 space-y-3' : 'mt-10'} max-w-2xl text-[1.0625rem] leading-relaxed text-white/85 md:text-[1.375rem] lg:mt-0`}>
                {p.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              {p.closing && (
                <p className="mt-6 border-l-2 border-white/45 pl-4 max-w-2xl text-[1.0625rem] leading-relaxed text-white md:text-[1.375rem]" data-testid="welcome-closing">
                  {p.closing}
                </p>
              )}
              </div>
            </section>
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-between pb-6">
        <div className="-ml-2 flex">
          {t.welcome.map((_, i) => (
            <button key={i} type="button" onClick={() => go(i)} aria-label={`${i + 1} / ${count}`} aria-current={i === page ? 'step' : undefined} className="p-2">
              <span className={`block size-2 rounded-full transition-colors ${i === page ? 'bg-white' : 'bg-white/40'}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label={t.next}
          data-testid="welcome-next"
          onClick={() => (last ? finish() : setPage(page + 1))}
          className="flex size-[4.5rem] md:size-20 items-center justify-center rounded-full bg-white text-night shadow-[0_8px_24px_rgb(0_0_0/0.12)] transition active:scale-95"
        >
          <ArrowRightIcon className="size-7" strokeWidth={1.6} />
        </button>
      </footer>
    </BluePage>
  )
}
