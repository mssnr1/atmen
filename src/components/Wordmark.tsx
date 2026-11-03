/**
 * The "atmen" logo in the style guide's look: a heavy, tightly set wordmark filled
 * with the lavender to indigo gradient and a soft glow. `breathe` lets the letters
 * open and close slowly with the resonance rhythm (start screen).
 */
export function Wordmark({ size = 26, className = '', breathe = false }: { size?: number; className?: string; breathe?: boolean }) {
  return (
    <p className={`logo-atmen ${breathe ? 'logo-breathe' : ''} ${className}`} data-testid="app-name" style={{ fontSize: size }} aria-label="atmen">
      atmen
    </p>
  )
}
