import { useCallback, useEffect, useState } from 'react'
import { getExercise } from './exercises'
import { onShowStart, useRoute } from './lib/route'
import { useApplyTheme } from './lib/theme'
import { EmergencyScreen } from './screens/EmergencyScreen'
import { ExerciseScreen, HomeScreen } from './screens/HomeScreen'
import { LearnScreen } from './screens/LearnScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SplashScreen } from './screens/SplashScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { useStore } from './storage/store'

export default function App() {
  useApplyTheme()
  // The start screen (logo and three ways in) shows each time the app opens, over the first screen.
  const [splash, setSplash] = useState(true)
  const hideSplash = useCallback(() => setSplash(false), [])
  // A double tap on Home brings it back.
  useEffect(() => onShowStart(() => setSplash(true)), [])
  return (
    <>
      <Screen />
      {splash && <SplashScreen onDone={hideSplash} />}
    </>
  )
}

function Screen() {
  const route = useRoute()
  const welcomeSeen = useStore((d) => d.preferences.welcomeSeen)
  const exercise = route.name === 'practice' ? getExercise(route.exerciseId) : undefined
  if (exercise) return <PracticeScreen key={exercise.id} exercise={exercise} />
  if (route.name === 'sos') return <EmergencyScreen />
  if (route.name === 'exercise') return <ExerciseScreen key={route.exerciseId} exerciseId={route.exerciseId} />
  if (route.name === 'welcome' || (!welcomeSeen && route.name === 'home')) return <WelcomeScreen />
  if (route.name === 'learn') return <LearnScreen />
  if (route.name === 'settings') return <SettingsScreen />
  return <HomeScreen />
}
