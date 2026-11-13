import { useEffect, useState } from 'react'
import { getExercise } from './exercises'
import { useRoute } from './lib/route'
import { useApplyTheme } from './lib/theme'
import { EmergencyScreen } from './screens/EmergencyScreen'
import { ExerciseScreen } from './screens/ExerciseScreen'
import { FirstBreath } from './screens/FirstBreath'
import { HistoryScreen } from './screens/HistoryScreen'
import { LearnScreen } from './screens/LearnScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { StartScreen } from './screens/StartScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { Stage } from './stage/Stage'
import { useStore } from './storage/store'

/**
 * One room: the figure stands on the stage behind everything, and the screens are layers over it.
 * Start and practice let it show through; the other pages cover it like a sheet of paper.
 */
export default function App() {
  const theme = useApplyTheme()
  return (
    <>
      <Stage />
      <Screen />
      <EdgeTint key={theme} />
    </>
  )
}

/**
 * Safari on iOS 26 colours its bars above and below the page after what is fixed at the page's edges,
 * and looks again when something fixed appears there. Two hairlines in the page's colour, made anew
 * for each look, let the bars follow a change of look without a reload.
 */
function EdgeTint() {
  return (
    <>
      <div aria-hidden className="fixed inset-x-0 top-0 z-20 h-[3px] bg-paper" />
      <div aria-hidden className="fixed inset-x-0 bottom-0 z-20 h-[3px] bg-paper" />
    </>
  )
}

/**
 * Development phase: the first breath opens the app every time the start page is loaded, not only the
 * very first time, so it can be seen and worked on on every device (Jan, 2026-11-11). To be set to
 * false before the app goes out: then it comes once, as it is meant to.
 */
const FIRST_BREATH_EVERY_LOAD = true

function Screen() {
  const route = useRoute()
  const welcomeSeen = useStore((d) => d.preferences.welcomeSeen)
  // The first breath of this load is done (or the app was opened somewhere else than at its start).
  const [greeted, setGreeted] = useState(route.name !== 'home')
  // A new page starts at its top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.name])
  const exercise = route.name === 'practice' ? getExercise(route.exerciseId) : undefined
  if (exercise) return <PracticeScreen key={exercise.id} exercise={exercise} />
  if (route.name === 'sos') return <EmergencyScreen />
  if (route.name === 'welcome') return <WelcomeScreen />
  if (route.name === 'exercise') return <ExerciseScreen key={route.exerciseId} exerciseId={route.exerciseId} />
  if (route.name === 'history') return <HistoryScreen justDoneId={route.sessionId} />
  if (route.name === 'learn') return <LearnScreen />
  if (route.name === 'settings') return <SettingsScreen />
  // The very first open begins with one breath instead of a menu.
  if (!welcomeSeen || (FIRST_BREATH_EVERY_LOAD && !greeted)) return <FirstBreath onDone={() => setGreeted(true)} />
  return <StartScreen />
}
