import { ParticleWord } from './ParticleWord'

/**
 * The letter-spaced "a t m e n" logo: a clear core of specks with an airy halo
 * of looser specks drifting around it.
 */
export function Wordmark({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <p className={`-mx-3 -my-3 ${className}`} data-testid="app-name" style={{ width: size * 9.2 + 24, height: size * 2.8 }}>
      <ParticleWord text="atmen" fontSize={size * 1.5} spacing={0.5} align="left" halo={0.4} className="size-full" />
    </p>
  )
}
