import { useEffect } from 'react'
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

function Screen() {
  const route = useRoute()
  const welcomeSeen = useStore((d) => d.preferences.welcomeSeen)
  // A new page starts at its top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.name])
  const exercise = route.name === 'practice' ? getExercise(route.exerciseId) : undefined
  if (exercise) return <PracticeScreen key={exercise.id} exercise={exercise} />
  if (route.name === 'sos') return <EmergencyScreen />
  if (route.name === 'welcome') return <WelcomeScreen />
  if (route.name === 'exercise') return <ExerciseScreen key={route.exerciseId} exerciseId={route.exerciseId} />
  if (route.name === 'history') return <HistoryScreen />
  if (route.name === 'learn') return <LearnScreen />
  if (route.name === 'settings') return <SettingsScreen />
  // The very first open begins with one breath instead of a menu.
  if (!welcomeSeen) return <FirstBreath />
  return <StartScreen />
}
