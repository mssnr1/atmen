import { ParticleWord } from './ParticleWord'

/** The small, letter-spaced "a t m e n", drawn as softly drifting specks. */
export function Wordmark({ size = 17, className = '' }: { size?: number; className?: string }) {
  return (
    <p className={className} data-testid="app-name" style={{ width: size * 8, height: size * 1.8 }}>
      <ParticleWord text="atmen" fontSize={size * 1.3} spacing={0.55} align="left" className="size-full" />
    </p>
  )
}
