import { ArrowLeftIcon, ArrowRightIcon, ChevronRightIcon } from '../components/icons'
import { IconButton } from '../components/Button'
import { Segmented } from '../components/Segmented'
import { Switch } from '../components/Switch'
import { TabBar } from '../components/TabBar'
import { Waveform } from '../components/Waveform'
import { exercises, getExercise, type Exercise } from '../exercises'
import { useI18n } from '../i18n'
import { presetIndex, rhythmText } from '../lib/exerciseText'
import { navigate, showStart, startPractice } from '../lib/route'
import { store, useStore } from '../storage/store'

/** Each exercise's curve in two colours of the style guide. */
export const WAVE_TINTS: Record<string, [string, string]> = {
  resonance: ['var(--color-sky)', 'var(--color-indigo)'],
  energy: ['var(--color-mint)', 'var(--color-mint)'],
  relax: ['var(--color-indigo)', 'var(--color-lavender)'],
}

/** Exercise selection (style guide): one card per exercise; a tap opens its page with the settings and Start. */
export function HomeScreen() {
  const { lang, t } = useI18n()
  const paces = useStore((d) => d.preferences.paceByExercise)

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <main className="safe-area mx-auto w-full max-w-md flex-1 px-5 pb-10 md:max-w-3xl md:px-14 lg:max-w-6xl lg:px-16">
        <IconButton label={t.back} onClick={showStart} className="-ml-2.5 mt-2 text-ink" data-testid="home-back">
          <ArrowLeftIcon className="size-6" strokeWidth={1.8} />
        </IconButton>
        <h1 className="mt-5 mb-7 text-[1.875rem] leading-[1.15] font-extrabold tracking-[-0.01em] md:mb-9 md:text-[2.5rem]">
          {t.chooseTitle[0]}
          <br />
          {t.chooseTitle[1]}
        </h1>
        <ul className="space-y-3.5 md:space-y-4 lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0" data-testid="exercise-list">
          {exercises.map((e) => {
            const text = e.text[lang]
            const scale = e.paces.options[presetIndex(e, paces[e.id]?.preset)].scale
            return (
              <li key={e.id}>
                <button
                  type="button"
                  data-testid={`exercise-${e.id}`}
                  onClick={() => navigate({ name: 'exercise', exerciseId: e.id })}
                  className="fluo-card relative flex w-full items-start justify-between gap-3 rounded-[22px] px-5 pt-[1.125rem] pb-4 text-left transition active:scale-[0.99] md:px-7 md:py-6"
                >
                  <span className="min-w-0">
                    <span className="block text-[1.1875rem] leading-tight font-bold text-ink md:text-[1.5rem]">{text.name}</span>
                    <span className="mt-1 block text-[0.9375rem] leading-snug text-ink-2 md:text-[1.0625rem]">
                      {text.purpose[0]}
                      <br />
                      {text.purpose[1]}
                    </span>
                  </span>
                  <span className="flex flex-none flex-col items-end gap-4 self-stretch">
                    <Waveform phases={e.pattern.phases} scale={scale} tint={WAVE_TINTS[e.id]} className="mt-1 h-7 w-20 md:h-9 md:w-28" />
                    <ChevronRightIcon className="mt-auto size-5 text-ink" strokeWidth={2} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-8 text-center text-[0.8125rem] text-muted">{t.inspired}</p>
      </main>
      <TabBar current="home" />
    </div>
  )
}

/** One exercise's page (style guide): what it does, its rhythm, duration, pace, slowing down and Start. */
export function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const { lang, t } = useI18n()
  const e = getExercise(exerciseId) ?? exercises[0]
  const text = e.text[lang]
  const pacePref = useStore((d) => d.preferences.paceByExercise[e.id])
  const preset = presetIndex(e, pacePref?.preset)
  const scale = e.paces.options[preset].scale
  return (
    <main className="safe-area mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper px-6 md:max-w-2xl md:px-14" data-testid={`exercise-page-${e.id}`}>
      <IconButton label={t.back} onClick={() => navigate({ name: 'home' })} className="-ml-2.5 mt-2 text-ink" data-testid="exercise-back">
        <ArrowLeftIcon className="size-6" strokeWidth={1.8} />
      </IconButton>
      <h1 className="mt-4 text-[1.875rem] leading-tight font-extrabold tracking-[-0.01em] md:text-[2.5rem]">{text.name}</h1>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[1rem] leading-snug text-ink-2">
          {text.purpose[0]}
          <br />
          {text.purpose[1]}
        </p>
        <Waveform phases={e.pattern.phases} animate scale={scale} tint={WAVE_TINTS[e.id]} className="mb-1 h-9 w-28 flex-none" />
      </div>
      <p className="mt-5 text-[1rem] text-ink-2">{rhythmText(e, scale, lang, t)}</p>
      <div className="my-5 h-px bg-line" />
      <CardSettings exercise={e} />
      <div className="mt-auto pt-8 pb-4">
        <button
          type="button"
          onClick={() => startPractice(e.id)}
          data-testid="home-start"
          className="bg-fluo relative mx-auto flex h-[3.75rem] w-full max-w-[18rem] items-center justify-center rounded-full text-[1.25rem] font-bold transition active:scale-[0.98]"
        >
          {t.start}
          <ArrowRightIcon className="absolute right-7 size-6" />
        </button>
      </div>
    </main>
  )
}

/** Duration, pace and slowing down for one exercise, saved as its preferences (the practice screen reads the same). */
function CardSettings({ exercise: e }: { exercise: Exercise }) {
  const { lang, t } = useI18n()
  const durationMs = useStore((d) => d.preferences.durationByExercise[e.id]) ?? e.defaultDurationMs
  const pacePref = useStore((d) => d.preferences.paceByExercise[e.id])
  const preset = presetIndex(e, pacePref?.preset)
  const slowDown = pacePref?.slowDown ?? false
  const setPace = (patch: { preset?: number; slowDown?: boolean }) => store.setPace(e.id, { preset, slowDown, ...patch })
  return (
    <div data-testid={`settings-${e.id}`}>
      <h3 className="mb-2.5 text-[1rem] font-bold">{t.duration}</h3>
      <Segmented
        label={t.duration}
        options={e.durationOptionsMs.map((ms) => ({ value: ms, label: t.minutes(ms / 60_000) }))}
        value={durationMs}
        onChange={(ms) => store.setDuration(e.id, ms)}
      />
      <h3 className="mt-6 mb-2.5 text-[1rem] font-bold">{t.breathingPace}</h3>
      <Segmented
        label={t.breathingPace}
        options={e.paces.options.map((o, i) => ({ value: i, label: o.label[lang] }))}
        value={preset}
        onChange={(i) => setPace({ preset: i })}
      />
      <div className="mt-3">
        <Switch label={t.slowDown} hint={t.slowDownHint} checked={slowDown} onChange={(v) => setPace({ slowDown: v })} testId={`slowdown-${e.id}`} strong />
      </div>
    </div>
  )
}
