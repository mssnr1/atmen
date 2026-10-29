import { store } from '../storage/store'
import { audioCues } from './audio'
import { hapticTick } from './haptics'

/** Tactile and audible confirmation for stepping a control. Call from the gesture. */
export function clickFeedback(step = 0): void {
  const prefs = store.get().preferences
  if (prefs.vibrationEnabled) hapticTick()
  if (prefs.audioEnabled) {
    void audioCues.unlock()
    audioCues.tick(step)
  }
}
