import { useState } from 'react'
import { MagicStartButton } from '../components/MagicStartButton'
import { Segmented } from '../components/Segmented'
import { Switch } from '../components/Switch'
import { TabBar } from '../components/TabBar'
import { Waveform } from '../components/Waveform'
import { exercises, type Exercise } from '../exercises'
import { useI18n } from '../i18n'
import { presetIndex, rhythmText } from '../lib/exerciseText'
import { startPractice } from '../lib/route'
import { store, useStore } from '../storage/store'

/**
 * Exercise selection: one large card per exercise, driven by the exercise configs.
 * A tap only selects a card (the top one is selected at first); the selected card opens up
 * with its settings, and the floating Start button begins it.
 */
export function HomeScreen() {
  const { lang, t } = useI18n()
  const paces = useStore((d) => d.preferences.paceByExercise)
  const [selected, setSelected] = useState(exercises[0].id)

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <main className="safe-area mx-auto w-full max-w-md flex-1 px-5 pb-24 md:pb-28 md:max-w-3xl md:px-14 lg:max-w-6xl lg:px-16">
        <h1 className="mt-10 mb-7 text-[1.875rem] leading-[1.15] font-normal tracking-[-0.01em] md:mt-8 md:mb-9 md:text-[2.5rem]">
          {t.chooseTitle[0]}
          <br />
          {t.chooseTitle[1]}
        </h1>
        <ul className="space-y-3.5 md:space-y-4 lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0" data-testid="exercise-list">
          {exercises.map((e) => {
            const text = e.text[lang]
            const scale = e.paces.options[presetIndex(e, paces[e.id]?.preset)].scale
            const on = e.id === selected
            return (
              <li
                key={e.id}
                className={`flex h-full flex-col rounded-[22px] transition-colors md:rounded-[26px] ${
                  on ? 'bg-blue-soft ring-1 ring-accent/45' : 'bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_6px_24px_rgb(0_0_0/0.05)] ring-1 ring-line/60'
                }`}
              >
                <button
                  type="button"
                  data-testid={`exercise-${e.id}`}
                  aria-pressed={on}
                  aria-expanded={on}
                  onClick={() => setSelected(e.id)}
                  className="group relative flex w-full flex-1 flex-col rounded-[22px] px-5 pt-5 pb-5 text-left transition active:scale-[0.99] md:rounded-[26px] md:px-7 md:pt-7 md:pb-7"
                >
                  <span className="flex items-start justify-between gap-3 lg:flex-col-reverse lg:justify-end lg:gap-6">
                    <span>
                      <span className="block text-[1.25rem] font-normal text-ink md:text-[1.625rem]">{text.name}</span>
                      <span className="mt-1 block text-[0.875rem] leading-snug text-muted md:text-[1rem]">
                        {text.purpose[0]}
                        <br />
                        {text.purpose[1]}
                      </span>
                    </span>
                    <span className="flex items-center pt-2 lg:pt-0">
                      <Waveform phases={e.pattern.phases} animate={on} scale={scale} className={`h-7 w-20 md:h-10 md:w-28 ${on ? 'text-accent' : 'text-ink-2'}`} />
                    </span>
                  </span>
                  <span className="mt-5 block text-[0.8125rem] text-muted md:text-[0.9375rem] lg:mt-auto lg:pt-8">{rhythmText(e, scale, lang, t)}</span>
                </button>
                {/* The selected card opens up with its settings; the others fold theirs away. */}
                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} inert={!on}>
                  <div className="overflow-hidden">
                    <CardSettings exercise={e} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        {/* Extra room on phones so the last line scrolls clear above the floating Start pill. */}
        <p className="mt-8 mb-20 text-center text-[0.8125rem] text-muted md:mb-6">{t.inspired}</p>
      </main>
      {/* Floats centred over the cards, just above the tab bar on phones. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),0.5rem)+4.5rem)] z-20 flex justify-center md:bottom-[max(env(safe-area-inset-bottom),2rem)]">
        <MagicStartButton onClick={() => startPractice(selected)} testId="home-start">
          {t.start}
        </MagicStartButton>
      </div>
      <TabBar current="home" />
    </div>
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
    <div className="mx-5 border-t border-line pt-3 pb-2 md:mx-7 md:pb-4" data-testid={`settings-${e.id}`}>
      <h3 className="mb-1.5 text-[0.8125rem] text-muted">{t.duration}</h3>
      <Segmented
        label={t.duration}
        options={e.durationOptionsMs.map((ms) => ({ value: ms, label: t.minutes(ms / 60_000) }))}
        value={durationMs}
        onChange={(ms) => store.setDuration(e.id, ms)}
      />
      <h3 className="mt-3.5 mb-1.5 text-[0.8125rem] text-muted">{t.breathingPace}</h3>
      <Segmented
        label={t.breathingPace}
        options={e.paces.options.map((o, i) => ({ value: i, label: o.label[lang] }))}
        value={preset}
        onChange={(i) => setPace({ preset: i })}
      />
      <div className="mt-1">
        <Switch label={t.slowDown} hint={t.slowDownHint} checked={slowDown} onChange={(v) => setPace({ slowDown: v })} testId={`slowdown-${e.id}`} />
      </div>
    </div>
  )
}
