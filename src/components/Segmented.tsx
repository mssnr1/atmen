import type { ReactNode } from 'react'

interface Props<T extends string | number> {
  label: string
  /** With an icon the option shows only the icon; its label becomes the accessible name. */
  options: { value: T; label: string; title?: string; icon?: ReactNode }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}

/** A row of mutually exclusive options. */
export function Segmented<T extends string | number>({ label, options, value, onChange, disabled, className = '' }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex gap-1 rounded-full bg-surface-2/70 p-1 ring-1 ring-line/70 ${disabled ? 'opacity-40' : ''} ${className}`}>
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={o.title ?? (o.icon ? o.label : undefined)}
            aria-label={o.icon ? o.label : undefined}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`min-h-11 flex-1 rounded-full px-3 text-body font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ink ${
              selected ? 'bg-solid text-on-solid' : 'text-ink-2 hover:bg-ink/5 hover:text-ink'
            }`}
          >
            {o.icon ?? o.label}
          </button>
        )
      })}
    </div>
  )
}
