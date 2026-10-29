import type { SVGProps } from 'react'

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

type P = SVGProps<SVGSVGElement>

export const PlayIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />
  </svg>
)
export const PauseIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
  </svg>
)
export const RestartIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4.5h4.5" />
  </svg>
)
export const CloseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const SoundIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
)
export const SoundOffIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </svg>
)
export const VibrateIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="8" y="4" width="8" height="16" rx="2" />
    <path d="M4.5 9v6M19.5 9v6" />
  </svg>
)
export const VibrateOffIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="8" y="4" width="8" height="16" rx="2" />
    <path d="M4 4l16 16" />
  </svg>
)
export const HomeIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5" />
  </svg>
)
