import { TabBar } from '../components/TabBar'
import { Waveform } from '../components/Waveform'
import { exercises } from '../exercises'
import { useI18n } from '../i18n'
import { rhythmText } from '../lib/exerciseText'

/** What each exercise is, why it may help and how to do it. */
export function LearnScreen() {
  const { lang, t } = useI18n()
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <main className="safe-area mx-auto w-full max-w-md flex-1 px-5">
        <h1 className="mt-10 text-[1.875rem] font-normal tracking-[-0.01em]">{t.learnTitle}</h1>
        <p className="mt-2 text-[0.9375rem] text-muted">{t.learnIntro}</p>

        <div className="mt-8 space-y-4">
          {exercises.map((e) => {
            const text = e.text[lang]
            return (
              <article key={e.id} className="rounded-[22px] bg-surface p-5">
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
