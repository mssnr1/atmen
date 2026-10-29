import type { PaceOption } from './types'

/** Three presets around an exercise's own rhythm: a quarter faster, as written, a quarter slower. */
export const scaledPaces: PaceOption[] = [
  { scale: 0.75, label: { de: 'Zügiger', en: 'Brisker' } },
  { scale: 1, label: { de: 'Standard', en: 'Default' } },
  { scale: 1.25, label: { de: 'Langsamer', en: 'Slower' } },
]
