import { ChevronRightIcon } from '../components/icons'
import { TabBar } from '../components/TabBar'
import { Waveform } from '../components/Waveform'
import { exercises } from '../exercises'
import { useI18n } from '../i18n'
import { presetIndex, rhythmText } from '../lib/exerciseText'
import { startPractice } from '../lib/route'
import { useStore } from '../storage/store'

/** Exercise selection: one large card per exercise, driven by the exercise configs. */
export function HomeScreen() {
  const { lang, t } = useI18n()
  const paces = useStore((d) => d.preferences.paceByExercise)
  const lastId = useStore((d) => d.sessions.at(-1)?.exerciseId)
  const highlighted = exercises.some((e) => e.id === lastId) ? lastId : exercises[0].id

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <main className="safe-area mx-auto w-full max-w-md flex-1 px-5">
        <h1 className="mt-10 mb-7 text-[1.875rem] leading-[1.15] font-normal tracking-[-0.01em]">
          {t.chooseTitle[0]}
          <br />
          {t.chooseTitle[1]}
        </h1>
        <ul className="space-y-3.5" data-testid="exercise-list">
          {exercises.map((e) => {
            const text = e.text[lang]
            const scale = e.paces.options[presetIndex(e, paces[e.id]?.preset)].scale
            const on = e.id === highlighted
            return (
              <li key={e.id}>
                <button
                  type="button"
                  data-testid={`exercise-${e.id}`}
                  onClick={() => startPractice(e.id)}
                  className={`group relative w-full rounded-[22px] px-5 pt-5 pb-5 text-left transition active:scale-[0.99] ${
                    on ? 'bg-blue-soft' : 'bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_6px_24px_rgb(0_0_0/0.05)] ring-1 ring-line/60'
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-[1.25rem] font-normal text-ink">{text.name}</span>
                      <span className="mt-1 block text-[0.875rem] leading-snug text-muted">
                        {text.purpose[0]}
                        <br />
                        {text.purpose[1]}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 pt-2">
                      <Waveform phases={e.pattern.phases} className={`h-7 w-20 ${on ? 'text-blue' : 'text-ink-2'}`} />
                      <ChevronRightIcon className="-mt-5 size-4 text-ink-2" />
                    </span>
                  </span>
                  <span className="mt-5 block text-[0.8125rem] text-muted">{rhythmText(e, scale, lang, t)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-8 mb-6 text-center text-[0.8125rem] text-muted">{t.inspired}</p>
      </main>
      <TabBar current="home" />
    </div>
  )
}
