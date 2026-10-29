import { clickFeedback } from '../feedback/click'

interface Props {
  label: string
  /** Longer explanation, offered as a tooltip and to screen readers. */
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** A compact labelled toggle. */
export function Switch({ label, hint, checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-description={hint}
      title={hint}
      onClick={() => {
        clickFeedback(checked ? 0 : 3)
        onChange(!checked)
      }}
      className="flex min-h-11 shrink-0 items-center gap-2.5 text-sm text-mist/80 focus-visible:outline-2 focus-visible:outline-accent"
    >
      {label}
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-white/15'}`} aria-hidden>
        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-mist shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  )
}
