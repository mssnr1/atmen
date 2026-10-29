import { useState } from 'react'
import { BluePage } from '../components/BluePage'
import { ArrowRightIcon } from '../components/icons'
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
  const current = t.welcome[page]

  return (
    <BluePage testId="welcome">
      <header className="flex items-center justify-between pt-4">
        <Wordmark className="text-[1.0625rem]" />
        {!last && (
          <button type="button" onClick={finish} className="-mr-2 rounded-full px-3 py-2 text-[0.9375rem] text-white/75 hover:text-white">
            {t.skip}
          </button>
        )}
      </header>

      <section key={page} className="flex flex-1 animate-[fade-in_400ms_ease-out] flex-col justify-center py-10" aria-live="polite">
        <h1 className="text-[2.75rem] leading-[1.08] font-normal tracking-[-0.01em] text-balance">{current.title}</h1>
        <p className="mt-10 text-[1.0625rem] leading-relaxed text-white/85">
          {current.lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </section>

      <footer className="flex items-center justify-between pb-6">
        <div className="flex gap-2" aria-hidden>
          {t.welcome.map((_, i) => (
            <span key={i} className={`size-2 rounded-full transition-colors ${i === page ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
        <button
          type="button"
          aria-label={t.next}
          data-testid="welcome-next"
          onClick={() => (last ? finish() : setPage(page + 1))}
          className="flex size-[4.5rem] items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_24px_rgb(0_0_0/0.12)] transition active:scale-95"
        >
          <ArrowRightIcon className="size-7" strokeWidth={1.6} />
        </button>
      </footer>
    </BluePage>
  )
}
