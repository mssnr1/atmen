import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const styles: Record<Variant, string> = {
  primary: 'bg-accent text-ink hover:bg-accent-soft active:scale-[0.98]',
  secondary: 'bg-white/10 text-mist hover:bg-white/15 active:scale-[0.98]',
  ghost: 'text-mist/80 hover:text-mist hover:bg-white/6',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
}

export function Button({ variant = 'primary', icon, className = '', children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full px-7 text-lg font-bold whitespace-nowrap [&>svg]:shrink-0 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 ${styles[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
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
      className={`inline-flex size-11 items-center justify-center rounded-full text-mist transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
