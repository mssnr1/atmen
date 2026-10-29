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
        // A nose in profile, facing left, with air flowing in at the nostril.
        <g {...stroke}>
          <path d="M84 2 C82 12 74 22 64 30 C60 33 61 37 66 37 C69 37 71 35 74 36 C77 37 77 41 75 46" />
          <path d="M6 30 C22 30 34 34 58 35" opacity={0.9} />
          <path d="M14 39 C28 38 40 37 56 36" opacity={0.55} />
          <path d="M22 22 C34 24 44 30 56 34" opacity={0.35} />
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
