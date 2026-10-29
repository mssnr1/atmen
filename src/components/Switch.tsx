import { clickFeedback } from '../feedback/click'

interface Props {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Switch({ label, hint, checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        clickFeedback(checked ? 0 : 3)
        onChange(!checked)
      }}
      className="flex min-h-11 w-full items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span>
        <span className="block text-lg font-bold">{label}</span>
        {hint && <span className="block text-[0.9375rem] text-mist/60">{hint}</span>}
      </span>
      <span className={`relative h-8 w-13 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-white/15'}`} aria-hidden>
        <span
          className={`absolute top-1 left-1 size-6 rounded-full bg-mist shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
  )
}
