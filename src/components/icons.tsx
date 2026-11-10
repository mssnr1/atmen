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
export const ArrowLeftIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />
  </svg>
)
export const ArrowRightIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </svg>
)
export const ChevronRightIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9.5 6l6 6-6 6" />
  </svg>
)
export const ChevronLeftIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14.5 6l-6 6 6 6" />
  </svg>
)
export const LearnIcon = (p: P) => (
  <svg {...base} {...p}>
    {/* An open book. */}
    <path d="M12 6.6C10.4 5.3 8.3 4.6 6 4.6H3.5v13.3H6c2.3 0 4.4.7 6 2 1.6-1.3 3.7-2 6-2h2.5V4.6H18c-2.3 0-4.4.7-6 2zM12 6.6v13.3" />
  </svg>
)
export const GearIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8l1.6 2.3 2.7-.7.7 2.7 2.6 1-.9 2.6 1.6 2.3-2.3 1.6.3 2.8-2.8.2-1.1 2.6-2.4-1.4-2.4 1.4-1.1-2.6-2.8-.2.3-2.8-2.3-1.6 1.6-2.3-.9-2.6 2.6-1 .7-2.7 2.7.7z" />
  </svg>
)
export const SlidersIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
)
export const InfoIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
)
export const FaceIcon = ({ mood, ...p }: P & { mood: 1 | 2 | 3 | 4 | 5 }) => {
  // Mouth from a wide smile (1) to a frown (5).
  const mouth = ['M8 13.5c2 2.5 6 2.5 8 0', 'M8.5 14c1.8 1.2 5.2 1.2 7 0', 'M8.5 14.5h7', 'M8.5 15c1.8-1.2 5.2-1.2 7 0', 'M8 15.5c2-2.5 6-2.5 8 0'][mood - 1]
  return (
    <svg {...base} {...p}>
      <path d="M9 9.5v.5M15 9.5v.5" strokeWidth={2.2} />
      <path d={mouth} />
    </svg>
  )
}
/** A 3D box: resets the 3D view. */
export const CubeIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
  </svg>
)
export const FullscreenIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </svg>
)
export const FullscreenExitIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />
  </svg>
)
export const LifebuoyIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M6 6l3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5" />
  </svg>
)
export const RingsIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="2.25" />
    <circle cx="12" cy="12" r="5.6" />
    <circle cx="12" cy="12" r="9" />
  </svg>
)
