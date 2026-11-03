import { useI18n } from '../i18n'
import { navigate, showStart } from '../lib/route'
import { GearIcon, HomeIcon, LearnIcon } from './icons'

type Tab = 'home' | 'learn' | 'settings'

/** Two taps on Home within this time go back to the start screen. */
const DOUBLE_TAP_MS = 350
// Kept outside the component: the first tap can switch screens and remount the bar.
let lastHomeTap = 0
let pendingWelcome: ReturnType<typeof setTimeout> | undefined

function tapHome(active: boolean) {
  const now = performance.now()
  const double = now - lastHomeTap < DOUBLE_TAP_MS
  lastHomeTap = double ? 0 : now
  clearTimeout(pendingWelcome)
  if (double) {
    showStart()
    return
  }
  if (!active) {
    navigate({ name: 'home' })
    return
  }
  // Tapping Home again while on it shows the welcome cards once more, unless a second tap follows.
  pendingWelcome = setTimeout(() => navigate({ name: 'welcome' }), DOUBLE_TAP_MS)
}

/** The navigation of the main screens: a bar at the bottom on phones, a floating pill at the top on iPad and desktop. */
export function TabBar({ current }: { current: Tab }) {
  const { t } = useI18n()
  const tabs: { id: Tab; label: string; Icon: typeof HomeIcon }[] = [
    { id: 'home', label: t.nav.home, Icon: HomeIcon },
    { id: 'learn', label: t.nav.learn, Icon: LearnIcon },
    { id: 'settings', label: t.nav.settings, Icon: GearIcon },
  ]
  return (
    <nav
      className="sticky bottom-0 z-10 border-t border-line/70 bg-surface/92 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur md:pointer-events-none md:top-0 md:bottom-auto md:order-first md:flex md:justify-center md:border-0 md:bg-transparent md:pt-[max(env(safe-area-inset-top),1rem)] md:pb-0 md:backdrop-blur-none"
      aria-label="Navigation"
    >
      <ul className="mx-auto flex max-w-md md:pointer-events-auto md:mx-0 md:gap-1 md:rounded-full md:bg-surface/85 md:p-1 md:shadow-[0_1px_6px_rgb(0_0_0/0.06)] md:backdrop-blur">
        {tabs.map(({ id, label, Icon }) => {
          const active = id === current
          return (
            <li key={id} className="flex-1 md:flex-none">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                // Home: a double tap goes back to the start screen, see tapHome.
                onClick={() => (id === 'home' ? tapHome(active) : navigate({ name: id }))}
                className={`flex w-full flex-col items-center gap-1 pt-2.5 pb-1 text-[0.6875rem] md:flex-row md:gap-2 md:rounded-full md:px-5 md:py-2 md:text-[0.9375rem] md:transition-colors ${
                  active ? 'text-accent md:bg-thumb md:shadow-[0_1px_3px_rgb(0_0_0/0.08)]' : 'text-muted md:hover:text-ink'
                }`}
              >
                <Icon className="size-[22px] md:size-5" strokeWidth={1.5} />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
