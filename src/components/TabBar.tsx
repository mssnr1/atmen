import { useI18n } from '../i18n'
import { navigate } from '../lib/route'
import { GearIcon, HomeIcon, LearnIcon } from './icons'

type Tab = 'home' | 'learn' | 'settings'

/** The bottom navigation of the main screens. */
export function TabBar({ current }: { current: Tab }) {
  const { t } = useI18n()
  const tabs: { id: Tab; label: string; Icon: typeof HomeIcon }[] = [
    { id: 'home', label: t.nav.home, Icon: HomeIcon },
    { id: 'learn', label: t.nav.learn, Icon: LearnIcon },
    { id: 'settings', label: t.nav.settings, Icon: GearIcon },
  ]
  return (
    <nav className="sticky bottom-0 z-10 border-t border-line/70 bg-paper/92 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur" aria-label="Navigation">
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ id, label, Icon }) => {
          const active = id === current
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                // Tapping Home again while on it shows the welcome cards once more.
                onClick={() => navigate(active && id === 'home' ? { name: 'welcome' } : { name: id })}
                className={`flex w-full flex-col items-center gap-1 pt-2.5 pb-1 text-[0.6875rem] ${active ? 'text-blue' : 'text-muted'}`}
              >
                <Icon className="size-[22px]" strokeWidth={1.5} />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
