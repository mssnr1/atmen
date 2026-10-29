import { visualizationModes, type VisualizationMode } from './modes'

interface Props {
  value: VisualizationMode
  onChange: (mode: VisualizationMode) => void
}

export function VisualizationSwitch({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Visualization" className="flex gap-1 rounded-full bg-white/5 p-0.5 ring-1 ring-white/10">
      {visualizationModes.map((m) => {
        const selected = m.id === value
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={selected}
            title={m.description}
            onClick={() => onChange(m.id)}
            className={`min-h-8 rounded-full px-3.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              selected ? 'bg-white/14 text-mist' : 'text-mist/60 hover:text-mist'
            }`}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
