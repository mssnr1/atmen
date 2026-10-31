import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'white' | 'page' | 'ghost'

const styles: Record<Variant, string> = {
  primary: 'bg-blue text-white hover:bg-blue-deep',
  secondary: 'bg-surface text-ink hover:bg-surface-2',
  white: 'bg-white text-night hover:bg-white/90',
  /** The accent button on the full-colour pages: white in light mode, violet at night. */
  page: 'bg-page-button text-page-button-ink hover:opacity-90',
  ghost: 'text-ink-2 hover:bg-surface',
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
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-6 text-[1.0625rem] font-medium whitespace-nowrap transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-40 [&>svg]:shrink-0 ${styles[variant]} ${className}`}
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
      className={`inline-flex size-11 items-center justify-center rounded-full transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-blue disabled:opacity-30 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
