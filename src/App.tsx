import { getExercise } from './exercises'
import { useRoute } from './lib/route'
import { HomeScreen } from './screens/HomeScreen'
import { PracticeScreen } from './screens/PracticeScreen'

export default function App() {
  const route = useRoute()
  const exercise = route.name === 'practice' ? getExercise(route.exerciseId) : undefined
  if (exercise) return <PracticeScreen key={exercise.id} exercise={exercise} />
  return <HomeScreen />
}
