interface Props<T extends string | number> {
  label: string
  options: { value: T; label: string; title?: string }[]
  value: T
  onChange: (value: T) => void
  size?: 'md' | 'sm'
  className?: string
}

/** A row of mutually exclusive options. */
export function Segmented<T extends string | number>({ label, options, value, onChange, size = 'md', className = '' }: Props<T>) {
  const item = size === 'md' ? 'min-h-12 flex-1 px-4 text-lg' : 'min-h-9 px-3.5 text-[0.9375rem]'
  return (
    <div role="radiogroup" aria-label={label} className={`flex gap-1 rounded-full bg-white/8 p-1 ${className}`}>
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`rounded-full font-bold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${item} ${
              selected ? 'bg-mist text-ink' : 'text-mist/65 hover:text-mist'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
