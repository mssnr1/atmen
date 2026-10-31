import { Segmented } from '../components/Segmented'
import { Switch } from '../components/Switch'
import { TabBar } from '../components/TabBar'
import { audioSupported } from '../feedback/audio'
import { vibrationSupported } from '../feedback/haptics'
import { languages, useI18n } from '../i18n'
import { navigate } from '../lib/route'
import { themePreferences } from '../lib/themePreferences'
import { store, useStore } from '../storage/store'
import { visualizationModes } from '../visualization/modes'

/** App-wide preferences. Exercise settings live in the sheet on the exercise screen. */
export function SettingsScreen() {
  const { lang, t } = useI18n()
  const prefs = useStore((d) => d.preferences)
  const sessions = useStore((d) => d.sessions.length)

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <main className="safe-area mx-auto w-full max-w-md flex-1 px-5">
        <h1 className="mt-10 text-[1.875rem] font-normal tracking-[-0.01em]">{t.settingsTitle}</h1>
        <p className="mt-2 text-[0.9375rem] text-muted">{t.defaultsHint}</p>

        <section className="mt-8">
          <h2 className="mb-2 text-[0.9375rem]">{t.language}</h2>
          <Segmented
            label={t.language}
            options={languages.map((l) => ({ value: l.id, label: l.label }))}
            value={lang}
            onChange={(language) => store.updatePreferences({ language })}
          />
        </section>

        <section className="mt-7">
          <h2 className="mb-2 text-[0.9375rem]">{t.appearance}</h2>
          <Segmented
            label={t.appearance}
            options={themePreferences.map((id) => ({ value: id, label: t.themes[id] }))}
            value={prefs.theme}
            onChange={(theme) => store.updatePreferences({ theme })}
          />
        </section>

        <section className="mt-7">
          <h2 className="mb-2 text-[0.9375rem]">{t.visualization}</h2>
          <Segmented
            label={t.visualization}
            options={visualizationModes.map((m) => ({ value: m.id, label: t.modes[m.id].label, title: t.modes[m.id].description }))}
            value={prefs.visualizationMode}
            onChange={(visualizationMode) => store.updatePreferences({ visualizationMode })}
          />
        </section>

        <section className="mt-5 divide-y divide-line">
          <Switch
            label={t.sound}
            checked={prefs.audioEnabled}
            disabled={!audioSupported()}
            onChange={(audioEnabled) => store.updatePreferences({ audioEnabled })}
          />
          <Switch
            label={t.vibration}
            checked={prefs.vibrationEnabled}
            disabled={!vibrationSupported()}
            onChange={(vibrationEnabled) => store.updatePreferences({ vibrationEnabled })}
          />
          <Switch
            label={t.showProgress}
            hint={t.showProgressHint}
            checked={prefs.showProgress}
            onChange={(showProgress) => store.updatePreferences({ showProgress })}
          />
        </section>

        <section className="mt-8 rounded-[22px] bg-surface p-5 text-[0.875rem] leading-relaxed text-ink-2">
          <h2 className="text-[0.9375rem] text-ink">{t.about}</h2>
          <p className="mt-1">{t.inspired}</p>
          <p className="mt-1 text-muted">{t.sessionsCompleted(sessions)}</p>
          <button type="button" onClick={() => navigate({ name: 'welcome' })} className="mt-3 text-blue">
            {t.welcome[0].title}
          </button>
          <h2 className="mt-5 text-[0.9375rem] text-ink">{t.credits}</h2>
          <p className="mt-1" data-testid="anatomy-credit">
            {t.anatomyCredit}{' '}
            <a className="text-blue underline-offset-2 hover:underline" href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noreferrer">
              Z-Anatomy
            </a>{' '}
            ·{' '}
            <a className="text-blue underline-offset-2 hover:underline" href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/" target="_blank" rel="noreferrer">
              BodyParts3D
            </a>{' '}
            ·{' '}
            <a className="text-blue underline-offset-2 hover:underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
              CC BY-SA 4.0
            </a>
          </p>
        </section>
        <div className="h-8" />
      </main>
      <TabBar current="settings" />
    </div>
  )
}
