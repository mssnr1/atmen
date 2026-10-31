import { TabBar } from '../components/TabBar'
import { Waveform } from '../components/Waveform'
import { WelcomeArt } from '../components/WelcomeArt'
import { exercises } from '../exercises'
import { useI18n } from '../i18n'
import { rhythmText } from '../lib/exerciseText'

/** The basics from the first two intro cards, then what each exercise is, why it may help and how to do it. */
export function LearnScreen() {
  const { lang, t } = useI18n()
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <main className="safe-area mx-auto w-full max-w-md flex-1 px-5 md:max-w-3xl md:px-14 lg:max-w-6xl lg:px-16">
        <h1 className="mt-10 text-[1.875rem] font-normal tracking-[-0.01em] md:mt-10 md:text-[3rem]">{t.learnTitle}</h1>
        <p className="mt-2 text-[0.9375rem] text-muted md:text-[1.0625rem]">{t.learnIntro}</p>

        <article className="mt-8 rounded-[22px] bg-blue-page p-6 text-white md:p-8" data-testid="learn-basics">
          <h2 className="text-[0.8125rem] font-medium tracking-wide text-white/70 uppercase">{t.learnBasics}</h2>
          <div className="mt-5 divide-y divide-white/20 md:grid md:grid-cols-2 md:gap-10 md:divide-y-0">
            {t.welcome.slice(0, 2).map((p, i) => (
              <section key={p.title} className="py-6 first:pt-0 last:pb-0 md:py-0">
                <WelcomeArt index={i} className="mb-5 h-12 w-32 text-white" />
                {p.eyebrow && <p className="text-[0.875rem] tracking-[0.08em] text-white/70">{p.eyebrow}</p>}
                <h3 className="mt-1 text-[1.625rem] leading-tight font-normal tracking-[-0.01em] text-balance">{p.title}</h3>
                <div className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-white/85">
                  {p.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                {p.closing && <p className="mt-4 border-l-2 border-white/45 pl-4 text-[0.9375rem] leading-relaxed">{p.closing}</p>}
              </section>
            ))}
          </div>
        </article>

        <div className="mt-4 space-y-4 lg:mt-5 lg:grid lg:grid-cols-3 lg:items-start lg:gap-5 lg:space-y-0">
          {exercises.map((e) => {
            const text = e.text[lang]
            return (
              <article key={e.id} className="rounded-[22px] bg-surface p-5 md:p-7">
                <header className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[1.25rem]">{text.name}</h2>
                    <p className="mt-0.5 text-[0.8125rem] text-muted">{rhythmText(e, 1, lang, t)}</p>
                  </div>
                  <Waveform phases={e.pattern.phases} className="h-7 w-20 text-blue" />
                </header>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-2">{text.summary}</p>
                <h3 className="mt-5 text-[0.8125rem] font-medium tracking-wide text-blue uppercase">{t.whyItWorks}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">{text.howItWorks}</p>
                <h3 className="mt-5 text-[0.8125rem] font-medium tracking-wide text-blue uppercase">{t.howTo}</h3>
                <ol className="mt-2 space-y-2">
                  {text.instructions.map((step, i) => (
                    <li key={step} className="flex gap-3 text-[0.9375rem] leading-snug text-ink-2">
                      <span className="w-4 shrink-0 text-blue tabular-nums">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </article>
            )
          })}
        </div>
        <p className="mt-8 mb-6 text-center text-[0.8125rem] text-muted">{t.inspired}</p>
      </main>
      <TabBar current="learn" />
    </div>
  )
}
