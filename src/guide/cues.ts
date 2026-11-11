import type { Language } from '../i18n/messages'
import { INSIGHT_EVERY, INSIGHT_FIRST_CYCLE } from './insights'

/**
 * A line over the figure's head while breathing. First something to sense, which ties attention to the
 * breath; later in the session a good thought to rest in. They are invitations, never claims.
 */
export const cues: Record<Language, { sense: string[]; thought: string[] }> = {
  de: {
    sense: [
      'Spüre die kühle Luft in deiner Nase.',
      'Stell dir vor, du trinkst die Luft.',
      'Spüre, wie sich dein Bauch hebt.',
      'Lass die Schultern sinken.',
      'Folge der Luft bis tief in die Lunge.',
    ],
    thought: ['Denke an etwas Gutes.', 'Denke an einen Menschen, dem du etwas Gutes getan hast.', 'Denke an das Gute in dir.', 'Wofür bist du heute dankbar?'],
  },
  en: {
    sense: ['Feel the cool air in your nose.', 'Imagine you are drinking the air.', 'Feel your belly rise.', 'Let your shoulders drop.', 'Follow the air deep into your lungs.'],
    thought: ['Think of something good.', 'Think of someone you did something good for.', 'Think of the good in you.', 'What are you grateful for today?'],
  },
}

/**
 * Cues come on the breaths the body notes leave free: the first with the third inhale, then on every
 * second breath. The last breath stays free. No line comes twice in a session: with more free breaths
 * than lines, the cues spread out over the session.
 */
export const CUE_FIRST_CYCLE = INSIGHT_FIRST_CYCLE + 1
export const CUE_EVERY = INSIGHT_EVERY
/** A cue leaves before its breath ends, so the next breath begins free. */
export const CUE_LEAVES_AT = 0.8

const SENSE_LINES = cues.de.sense.length
const THOUGHT_LINES = cues.de.thought.length

export interface CueSlot {
  kind: 'sense' | 'thought'
  /** Position within its kind, counted from the start of the session. */
  index: number
}

/** Which of `free` breaths carry a cue: all of them if there are lines enough, else evenly spread. */
function carriers(free: number): number[] {
  const n = Math.min(free, SENSE_LINES + THOUGHT_LINES)
  if (n <= 1) return n === 1 ? [0] : []
  return Array.from({ length: n }, (_, i) => Math.round((i * (free - 1)) / (n - 1)))
}

/** The cue for breath `cycleIndex` (0-based) of a session of `totalCycles` breaths, or null on a breath without one. */
export function cueAt(cycleIndex: number, totalCycles: number): CueSlot | null {
  const last = totalCycles - 2
  if (cycleIndex < CUE_FIRST_CYCLE || cycleIndex > last || (cycleIndex - CUE_FIRST_CYCLE) % CUE_EVERY !== 0) return null
  const free = Math.floor((last - CUE_FIRST_CYCLE) / CUE_EVERY) + 1
  const at = carriers(free)
  const slot = at.indexOf((cycleIndex - CUE_FIRST_CYCLE) / CUE_EVERY)
  if (slot < 0) return null
  // The first half is for sensing, the later half for thoughts; a single cue is one to sense.
  const sensing = Math.min(SENSE_LINES, Math.ceil(at.length / 2))
  return slot < sensing ? { kind: 'sense', index: slot } : { kind: 'thought', index: slot - sensing }
}
