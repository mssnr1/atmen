/** The small, light, letter-spaced "a t m e n". */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <p className={`font-light tracking-[0.55em] lowercase ${className}`} data-testid="app-name">
      atmen
    </p>
  )
}
