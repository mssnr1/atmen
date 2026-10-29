/**
 * One minimal line drawing per welcome card, in the style of the exercise
 * curves: white strokes on the blue page. Index order matches the cards:
 * nasal breathing, a slow rhythm, a long exhale, breathing less.
 */
export function WelcomeArt({ index, className = '' }: { index: number; className?: string }) {
  const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  return (
    <svg viewBox="0 0 120 48" className={className} aria-hidden>
      {index === 0 && (
        // A face in profile, facing left, with air drawn softly in at the nose.
        <g {...stroke}>
          <path d="M90 0 C88 5 85 8 84 11 C81 17 74 23 70 27 C68 29 69 31 72 31 L78 31 C77 33 75 34 76 35.5 C77 36.5 79 36.5 78 38 C77 39.5 76 40 77 41.5 C79 44 82 45 86 46" />
          <path d="M8 22 C26 22 38 26 60 29" opacity={0.85} strokeDasharray="0.1 4.5" />
          <path d="M16 34 C32 33 46 31 62 30" opacity={0.5} strokeDasharray="0.1 4.5" />
          <path d="M28 12 C40 15 50 22 60 28" opacity={0.3} strokeDasharray="0.1 4.5" />
        </g>
      )}
      {index === 1 && (
        // One long, slow wave: about 5.5 breaths a minute.
        <path {...stroke} d="M2 24 C17 24 17 6 32 6 S47 42 62 42 S77 6 92 6 S107 24 118 24" />
      )}
      {index === 2 && (
        // A short rise, then a long, unhurried fall that fades out.
        <g {...stroke}>
          <path d="M2 42 C12 42 16 6 26 6 C42 6 52 30 70 38" />
          <path d="M70 38 C84 43 96 42 118 42" opacity={0.45} strokeDasharray="1.5 5" />
        </g>
      )}
      {index === 3 && (
        // A big, effortful wave faded behind a small, quiet one.
        <g {...stroke}>
          <path d="M2 24 C12 24 14 2 24 2 S36 46 46 46 S58 2 68 2 S80 46 90 46 S102 24 118 24" opacity={0.3} />
          <path d="M2 24 C14 24 16 18 28 18 S44 30 56 30 S72 18 84 18 S100 24 118 24" />
        </g>
      )}
    </svg>
  )
}
