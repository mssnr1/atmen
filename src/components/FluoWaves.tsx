import { useId } from 'react'

/**
 * The soft glowing waves of the style guide: a lavender hill on the left melting into a mint one on
 * the right, over the ink background. They rise and settle slowly with the resonance rhythm.
 */
export function FluoWaves({ className = '' }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="none" className={`fluo-waves ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`${id}back`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2c2f6e" stopOpacity="0" />
          <stop offset="0.4" stopColor="#3a6aa8" stopOpacity="0.6" />
          <stop offset="1" stopColor="#8af0cf" />
        </linearGradient>
        <linearGradient id={`${id}backFade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}backMask`}>
          <rect width="400" height="220" fill={`url(#${id}backFade)`} />
        </mask>
        <linearGradient id={`${id}front`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b8a4ff" />
          <stop offset="0.5" stopColor="#7563e0" />
          <stop offset="1" stopColor="#4656b0" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`${id}frontFade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}frontMask`}>
          <rect width="400" height="220" fill={`url(#${id}frontFade)`} />
        </mask>
        <filter id={`${id}glow`} x="-10%" y="-30%" width="120%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g className="fluo-wave-back">
        <path d="M0 130 C 90 120 150 90 230 62 C 300 38 350 24 400 30 L400 220 L0 220Z" fill={`url(#${id}back)`} mask={`url(#${id}backMask)`} />
        <path d="M150 92 C 230 64 300 34 400 30" fill="none" stroke="#a7f3d0" strokeOpacity="0.8" strokeWidth="5" filter={`url(#${id}glow)`} />
      </g>
      <g className="fluo-wave-front">
        <path d="M0 98 C 60 82 120 84 180 110 C 240 136 300 150 400 140 L400 220 L0 220Z" fill={`url(#${id}front)`} mask={`url(#${id}frontMask)`} />
        <path d="M0 98 C 60 82 120 84 180 110 C 230 132 270 142 320 144" fill="none" stroke="#d4c9ff" strokeOpacity="0.85" strokeWidth="4" filter={`url(#${id}glow)`} />
      </g>
    </svg>
  )
}
