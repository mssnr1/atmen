import { Button } from '../components/Button'
import { Page } from '../components/Page'
import { Segmented } from '../components/Segmented'
import { Switch } from '../components/Switch'
import { Waveform } from '../components/Waveform'
import { exercises, getExercise } from '../exercises'
import { useI18n } from '../i18n'
import { presetIndex, rhythmText } from '../lib/exerciseText'
import { startPractice } from '../lib/route'
import { store, useStore } from '../storage/store'

/** The breath curve is breath, so it may carry breath light: sky rising into lavender. */
const CURVE_TINT: [string, string] = ['var(--color-breath-2)', 'var(--color-breath)']

/** One exercise's page: what it is for, its rhythm, and duration, pace and slowing down before the start. */
export function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const { lang, t } = useI18n()
  const e = getExercise(exerciseId) ?? exercises[0]
  const text = e.text[lang]
  const durationMs = useStore((d) => d.preferences.durationByExercise[e.id]) ?? e.defaultDurationMs
  const pacePref = useStore((d) => d.preferences.paceByExercise[e.id])
  const preset = presetIndex(e, pacePref?.preset)
  const scale = e.paces.options[preset].scale
  const slowDown = pacePref?.slowDown ?? false
  const setPace = (patch: { preset?: number; slowDown?: boolean }) => store.setPace(e.id, { preset, slowDown, ...patch })
  return (
    <Page title={text.need} eyebrow={text.name} testId={`exercise-page-${e.id}`} narrow>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-body leading-snug text-ink-2">
          {text.purpose[0]}
          <br />
          {text.purpose[1]}
        </p>
        <Waveform phases={e.pattern.phases} animate scale={scale} tint={CURVE_TINT} className="mb-1 h-9 w-28 flex-none" />
      </div>
      <p className="mt-4 text-body text-ink-2">{rhythmText(e, scale, lang, t)}</p>
      <div className="my-6 h-px bg-line" />
      <div data-testid={`settings-${e.id}`}>
        <h2 className="mb-2.5 text-body font-medium">{t.duration}</h2>
        <Segmented
          label={t.duration}
          options={e.durationOptionsMs.map((ms) => ({ value: ms, label: t.minutes(ms / 60_000) }))}
          value={durationMs}
          onChange={(ms) => store.setDuration(e.id, ms)}
        />
        <h2 className="mt-6 mb-2.5 text-body font-medium">{t.breathingPace}</h2>
        <Segmented label={t.breathingPace} options={e.paces.options.map((o, i) => ({ value: i, label: o.label[lang] }))} value={preset} onChange={(i) => setPace({ preset: i })} />
        <div className="mt-3">
          <Switch label={t.slowDown} hint={t.slowDownHint} checked={slowDown} onChange={(v) => setPace({ slowDown: v })} testId={`slowdown-${e.id}`} />
        </div>
      </div>
      <div className="mt-auto pt-10 pb-2">
        <Button onClick={() => startPractice(e.id)} className="w-full" data-testid="home-start">
          {t.start}
        </Button>
      </div>
    </Page>
  )
}
