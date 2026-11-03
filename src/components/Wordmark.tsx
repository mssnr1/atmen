import { useId } from 'react'

/**
 * The FLUO logo, drawn as paths so it looks the same everywhere: heavy, rounded
 * letters (F and L with a soft outer corner, a deep U, a round O) in pale lavender
 * with a faint glow. `size` is the letter height in px; `breathe` lets the glow
 * swell slowly with the resonance rhythm (start screen).
 */
export function Wordmark({ size = 22, className = '', breathe = false }: { size?: number; className?: string; breathe?: boolean }) {
  const id = useId()
  const fill = `url(#${CSS.escape(id)})`
  return (
    <svg
      viewBox="0 -6 950 232"
      height={size * (232 / 220)}
      width={size * (950 / 220)}
      className={`logo-fluo ${breathe ? 'logo-breathe' : ''} ${className}`}
      role="img"
      aria-label="Fluo"
      data-testid="app-name"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--logo-top)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-bottom)' }} />
        </linearGradient>
      </defs>
      <g fill={fill}>
        {/* F */}
        <path d="M14 220Q0 220 0 206L0 50Q0 0 50 0L219 0Q233 0 233 14L233 46Q233 60 219 60L74 60Q60 60 60 74L60 206Q60 220 46 220Z" />
        <rect x="0" y="88" width="213" height="60" rx="14" />
        {/* L */}
        <path d="M270 0L302 0Q316 0 316 14L316 160L432 160Q446 160 446 174L446 206Q446 220 432 220L306 220Q256 220 256 170L256 14Q256 0 270 0Z" />
        {/* U */}
        <path d="M480 0L512 0Q526 0 526 14L526 120A47.5 40 0 0 0 621 120L621 14Q621 0 635 0L667 0Q681 0 681 14L681 120A107.5 100 0 0 1 466 120L466 14Q466 0 480 0Z" />
        {/* O */}
        <path fillRule="evenodd" d="M825 -3A125 113 0 1 1 825 223A125 113 0 1 1 825 -3ZM825 55A65 55 0 1 0 825 165A65 55 0 1 0 825 55Z" />
      </g>
    </svg>
  )
}
