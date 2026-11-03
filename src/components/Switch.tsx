import { InfoIcon } from './icons'
import { clickFeedback } from '../feedback/click'

interface Props {
  label: string
  /** Second line under the label. */
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Show an info mark next to the label, as in the settings sheet. */
  info?: boolean
  testId?: string
  /** Bold label, as on the exercise page. */
  strong?: boolean
}

/** A settings row with an iOS-style toggle on the right. */
export function Switch({ label, hint, checked, onChange, disabled, info, testId, strong }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-testid={testId}
      onClick={() => {
        clickFeedback(checked ? 0 : 3)
        onChange(!checked)
      }}
      className="flex w-full items-center justify-between gap-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-blue disabled:opacity-40"
    >
      <span className="min-w-0">
        <span className={`flex items-center gap-1.5 text-ink ${strong ? 'text-[1rem] font-bold' : 'text-[0.9375rem] font-semibold'}`}>
          {label}
          {info && <InfoIcon className="size-4 text-muted" strokeWidth={1.6} />}
        </span>
        {hint && <span className="mt-1 block text-[0.875rem] text-ink-2">{hint}</span>}
      </span>
      <span className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? 'bg-fluo' : 'bg-surface-2 ring-1 ring-line'}`} aria-hidden>
        <span
          className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18)] transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
  )
}
