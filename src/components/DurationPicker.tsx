interface Props {
  options: number[]
  value: number
  onChange: (ms: number) => void
}

export function DurationPicker({ options, value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Session duration" className="flex gap-1 rounded-full bg-white/6 p-1 ring-1 ring-white/10">
      {options.map((ms) => {
        const selected = ms === value
        return (
          <button
            key={ms}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(ms)}
            className={`min-h-10 min-w-20 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              selected ? 'bg-mist text-ink shadow' : 'text-mist/75 hover:text-mist'
            }`}
          >
            {ms / 60_000} min
          </button>
        )
      })}
    </div>
  )
}
