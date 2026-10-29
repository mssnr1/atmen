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
}

/** A settings row with an iOS-style toggle on the right. */
export function Switch({ label, hint, checked, onChange, disabled, info, testId }: Props) {
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
        <span className="flex items-center gap-1.5 text-[0.9375rem] text-ink">
          {label}
          {info && <InfoIcon className="size-4 text-muted" strokeWidth={1.6} />}
        </span>
        {hint && <span className="mt-0.5 block text-[0.8125rem] text-muted">{hint}</span>}
      </span>
      <span className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? 'bg-blue' : 'bg-surface-2'}`} aria-hidden>
        <span
          className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18)] transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
  )
}
