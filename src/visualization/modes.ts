export type VisualizationMode = 'abstract' | 'anatomical'

/** Labels and descriptions live in the i18n messages. */
export const visualizationModes: { id: VisualizationMode }[] = [{ id: 'abstract' }, { id: 'anatomical' }]

export const defaultVisualizationMode: VisualizationMode = 'anatomical'
