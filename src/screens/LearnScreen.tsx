import { Page } from '../components/Page'
import { Waveform } from '../components/Waveform'
import { WelcomeArt } from '../components/WelcomeArt'
import { exercises } from '../exercises'
import { useI18n } from '../i18n'
import { rhythmText } from '../lib/exerciseText'
import { navigate } from '../lib/route'

/** The breath curve is breath, so it may carry breath light. */
const CURVE_TINT: [string, string] = ['var(--color-breath-2)', 'var(--color-breath)']

/** The basics from the first two intro cards, then what each exercise is, why it may help and how to do it. */
export function LearnScreen() {
  const { lang, t } = useI18n()
  return (
    <Page title={t.learnTitle} lead={t.learnIntro} testId="learn">
      <article className="fluo-card mt-8 rounded-[22px] p-6 md:p-8" data-testid="learn-basics">
        <h2 className="eyebrow">{t.learnBasics}</h2>
        <div className="mt-5 divide-y divide-line md:grid md:grid-cols-2 md:gap-10 md:divide-y-0">
          {t.welcome.slice(0, 2).map((p, i) => (
            <section key={p.title} className="py-6 first:pt-0 last:pb-0 md:py-0">
              <WelcomeArt index={i} className="mb-5 h-12 w-32 text-ink-2" />
              {p.eyebrow && <p className="text-note text-ink-2">{p.eyebrow}</p>}
              <h3 className="display mt-1 text-[1.625rem]">{p.title}</h3>
              <div className="mt-4 space-y-3 text-body leading-relaxed text-ink-2">
                {p.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              {p.closing && <p className="mt-4 border-l border-ink/40 pl-4 text-body leading-relaxed">{p.closing}</p>}
            </section>
          ))}
        </div>
        <button type="button" onClick={() => navigate({ name: 'welcome' })} className="mt-6 text-body font-medium text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink" data-testid="learn-intro">
          {t.intro}
        </button>
      </article>

      <div className="mt-4 space-y-4 lg:mt-5 lg:grid lg:grid-cols-3 lg:items-start lg:gap-5 lg:space-y-0">
        {exercises.map((e) => {
          const text = e.text[lang]
          return (
            <article key={e.id} className="fluo-card rounded-[22px] p-5 md:p-7">
              <header className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[1.25rem] tracking-[-0.01em]">{text.name}</h2>
                  <p className="mt-0.5 text-note text-ink-2">{rhythmText(e, 1, lang, t)}</p>
                </div>
                <Waveform phases={e.pattern.phases} tint={CURVE_TINT} className="h-7 w-20" />
              </header>
              <p className="mt-4 text-body leading-relaxed text-ink-2">{text.summary}</p>
              <h3 className="eyebrow mt-5">{t.whyItWorks}</h3>
              <p className="mt-1.5 text-body leading-relaxed text-ink-2">{text.howItWorks}</p>
              <h3 className="eyebrow mt-5">{t.howTo}</h3>
              <ol className="mt-2 space-y-2">
                {text.instructions.map((step, i) => (
                  <li key={step} className="flex gap-3 text-body leading-snug text-ink-2">
                    <span className="w-4 shrink-0 text-ink tabular-nums">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </article>
          )
        })}
      </div>
      <p className="mt-8 mb-6 text-center text-note text-muted">{t.inspired}</p>
    </Page>
  )
}
