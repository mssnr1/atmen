import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

/** Buttons are neutral: breath light (lavender, sky) belongs to the breath alone. */
const styles: Record<Variant, string> = {
  primary: 'bg-solid text-on-solid hover:bg-solid/90',
  secondary: 'text-ink ring-1 ring-inset ring-ink/30 hover:bg-ink/5',
  ghost: 'text-ink-2 hover:bg-ink/5 hover:text-ink',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
  /** Icon after the label instead of before it. */
  trailingIcon?: ReactNode
}

export function Button({ variant = 'primary', icon, trailingIcon, className = '', children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-6 text-body font-semibold whitespace-nowrap transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40 [&>svg]:shrink-0 ${styles[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {trailingIcon}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  pressed?: boolean
}

export function IconButton({ label, pressed, className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`inline-flex size-11 items-center justify-center rounded-full transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-30 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
