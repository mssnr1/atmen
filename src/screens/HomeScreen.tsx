import { Button } from '../components/Button'
import { PlayIcon } from '../components/icons'
import { Segmented } from '../components/Segmented'
import { exercises, featuredExercise } from '../exercises'
import { languages, useI18n } from '../i18n'
import { formatSeconds } from '../lib/format'
import { startPractice } from '../lib/route'
import { store, useStore } from '../storage/store'

export function HomeScreen() {
  const { lang, t } = useI18n()
  const sessions = useStore((d) => d.sessions)
  const durations = useStore((d) => d.preferences.durationByExercise)
  const ex = featuredExercise
  const text = ex.text[lang]
  const others = exercises.filter((e) => e.id !== ex.id)
  const durationMs = durations[ex.id] ?? ex.defaultDurationMs
  const rhythm = [...ex.pattern.phases.map((p) => `${formatSeconds(p.durationMs, lang)} s ${t.phaseShort[p.type]}`), t.nose]

  return (
    <main className="safe-area mx-auto flex min-h-dvh max-w-md flex-col px-6">
      <header className="flex justify-end">
        <Segmented
          size="sm"
          label={t.language}
          options={languages.map((l) => ({ value: l.id, label: l.label }))}
          value={lang}
          onChange={(language) => store.updatePreferences({ language })}
        />
      </header>

      <section className="pt-4">
        <h1 className="text-[5.5rem] leading-[0.9] font-black tracking-[-0.045em]" data-testid="app-name">
          {t.appName}
        </h1>
        <p className="mt-3 text-xl font-semibold text-mist/65">{t.tagline}</p>
      </section>

      <section aria-labelledby="featured" className="mt-10">
        <p className="text-sm font-extrabold tracking-[0.18em] text-accent uppercase">{t.exercise}</p>
        <h2 id="featured" className="mt-1.5 text-[2rem] leading-tight font-extrabold tracking-tight">
          {text.name}
        </h2>
        <p className="mt-1 text-lg font-medium text-mist/65" aria-label={rhythm.join(', ')}>
          {rhythm.join(' · ')}
        </p>

        <Segmented
          className="mt-6"
          label={t.duration}
          options={ex.durationOptionsMs.map((ms) => ({ value: ms, label: t.minutes(ms / 60_000) }))}
          value={durationMs}
          onChange={(ms) => store.setDuration(ex.id, ms)}
        />
        <Button className="mt-3 w-full" icon={<PlayIcon className="size-5" />} onClick={() => startPractice(ex.id)} data-testid="home-start">
          {t.start}
        </Button>
      </section>

      {others.length > 0 && (
        <section aria-label="More exercises" className="mt-8 space-y-3">
          {others.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => startPractice(e.id)}
              className="w-full rounded-2xl bg-white/6 p-4 text-left hover:bg-white/10"
            >
              <span className="block text-lg font-bold">{e.text[lang].name}</span>
              <span className="block text-mist/60">{e.text[lang].tagline}</span>
            </button>
          ))}
        </section>
      )}

      <section className="mt-14 space-y-4" aria-labelledby="why">
        <h3 id="why" className="text-2xl font-extrabold tracking-tight">
          {t.whyItWorks}
        </h3>
        <p className="text-lg leading-relaxed text-mist/85">{text.summary}</p>
        <p className="text-lg leading-relaxed text-mist/65">{text.howItWorks}</p>
        <ul className="space-y-2 pt-1">
          {text.benefits.map((b) => (
            <li key={b} className="flex items-center gap-3 text-lg font-semibold">
              <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 space-y-4" aria-labelledby="howto">
        <h3 id="howto" className="text-2xl font-extrabold tracking-tight">
          {t.howTo}
        </h3>
        <ol className="space-y-3">
          {text.instructions.map((step, i) => (
            <li key={step} className="flex gap-4 text-lg leading-snug text-mist/85">
              <span className="w-5 shrink-0 font-black text-accent tabular-nums">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-auto pt-14 pb-2 text-center text-[0.9375rem] font-medium text-mist/45">
        {sessions.length > 0 ? `${t.sessionsCompleted(sessions.length)} · ${t.inspired}` : t.inspired}
      </footer>
    </main>
  )
}
