import { getExercise } from './exercises'
import { useRoute } from './lib/route'
import { useApplyTheme } from './lib/theme'
import { HomeScreen } from './screens/HomeScreen'
import { LearnScreen } from './screens/LearnScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { useStore } from './storage/store'

export default function App() {
  useApplyTheme()
  const route = useRoute()
  const welcomeSeen = useStore((d) => d.preferences.welcomeSeen)
  const exercise = route.name === 'practice' ? getExercise(route.exerciseId) : undefined
  if (exercise) return <PracticeScreen key={exercise.id} exercise={exercise} />
  if (route.name === 'welcome' || (!welcomeSeen && route.name === 'home')) return <WelcomeScreen />
  if (route.name === 'learn') return <LearnScreen />
  if (route.name === 'settings') return <SettingsScreen />
  return <HomeScreen />
}
