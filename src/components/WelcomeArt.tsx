/**
 * One minimal line drawing per welcome card, in the style of the exercise
 * curves: white strokes on the blue page. Index order matches the cards:
 * "did you know", the body as a car, nasal breathing, a slow rhythm, a long exhale, breathing less.
 */
export function WelcomeArt({ index, className = '' }: { index: number; className?: string }) {
  const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  return (
    <svg viewBox="0 0 120 48" className={className} aria-hidden>
      {index === 0 && (
        // Hurried, shallow breathing settling into one long, calm wave.
        <g {...stroke}>
          <path d="M2 24 L6 18 L10 30 L14 17 L18 31 L22 19 L26 29 L30 21 L34 27 C40 20 44 16 52 16" opacity={0.45} />
          <path d="M52 16 C64 16 66 40 82 40 S104 12 118 24" />
        </g>
      )}
      {index === 1 && (
        // Breath as fuel: a calm wave flows along a line into a gauge whose needle stands high.
        <g {...stroke}>
          <path d="M2 30 C9 30 10 20 17 20 S25 30 32 30" />
          <path d="M36 30 C46 30 54 40 64 40" opacity={0.6} strokeDasharray="0.1 4.5" />
          <path d="M66 40 A22 22 0 0 1 110 40" />
          <path d="M69.5 29 L72.5 30.5 M77 21.5 L79 24 M88 18 L88 21 M99 21.5 L97 24 M106.5 29 L103.5 30.5" opacity={0.6} />
          <path d="M88 40 L97 27" />
          <circle cx={88} cy={40} r={1.6} fill="currentColor" stroke="none" />
        </g>
      )}
      {index === 2 && (
        // A nose seen from the front, with air rising from below into both nostrils.
        <g {...stroke}>
          <path d="M55 0 C55 9 52 16 48 21 C44 26 45 31 50 31.5 C53 32 54 30.5 56 31.5 C58 32.5 59 33 60 33 C61 33 62 32.5 64 31.5 C66 30.5 67 32 70 31.5 C75 31 76 26 72 21 C68 16 65 9 65 0" />
          <path d="M51.5 28.5 C53 27 55.5 27 56.5 28.5 M63.5 28.5 C64.5 27 67 27 68.5 28.5" opacity={0.7} />
          <path d="M22 47 C36 46 47 41 53 33" opacity={0.85} strokeDasharray="0.1 4.5" />
          <path d="M98 47 C84 46 73 41 67 33" opacity={0.85} strokeDasharray="0.1 4.5" />
          <path d="M38 48 C46 46 51 42 54.5 36" opacity={0.4} strokeDasharray="0.1 4.5" />
          <path d="M82 48 C74 46 69 42 65.5 36" opacity={0.4} strokeDasharray="0.1 4.5" />
        </g>
      )}
      {index === 3 && (
        // One long, slow wave: about 5.5 breaths a minute.
        <path {...stroke} d="M2 24 C17 24 17 6 32 6 S47 42 62 42 S77 6 92 6 S107 24 118 24" />
      )}
      {index === 4 && (
        // A short rise, then a long, unhurried fall that fades out.
        <g {...stroke}>
          <path d="M2 42 C12 42 16 6 26 6 C42 6 52 30 70 38" />
          <path d="M70 38 C84 43 96 42 118 42" opacity={0.45} strokeDasharray="1.5 5" />
        </g>
      )}
      {index === 5 && (
        // A big, effortful wave faded behind a small, quiet one.
        <g {...stroke}>
          <path d="M2 24 C12 24 14 2 24 2 S36 46 46 46 S58 2 68 2 S80 46 90 46 S102 24 118 24" opacity={0.3} />
          <path d="M2 24 C14 24 16 18 28 18 S44 30 56 30 S72 18 84 18 S100 24 118 24" />
        </g>
      )}
    </svg>
  )
}
