export type VisualizationMode = 'abstract' | 'anatomical'

export const visualizationModes: { id: VisualizationMode; label: string; description: string }[] = [
  { id: 'abstract', label: 'Simple', description: 'An abstract circle that grows and shrinks with your breath' },
  { id: 'anatomical', label: 'Anatomical', description: 'Air moving through the nose, airways and lungs' },
]

export const defaultVisualizationMode: VisualizationMode = 'abstract'
