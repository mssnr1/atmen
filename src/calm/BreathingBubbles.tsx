/**
 * Soft bubbles behind a screen that grow and shrink together like a breath
 * (5.5 s in, 5.5 s out by default) while they drift slowly, so the whole
 * background seems to breathe.
 */
const BUBBLES: {
  x: number;
  y: number;
  size: number;
  delay: number;
  drift: number;
  tone: "air" | "used";
}[] = [
  { x: 50, y: 34, size: 78, delay: 0, drift: 29, tone: "air" },
  { x: 12, y: 14, size: 34, delay: 0.4, drift: 23, tone: "used" },
  { x: 88, y: 20, size: 26, delay: 0.8, drift: 31, tone: "air" },
  { x: 82, y: 62, size: 40, delay: 0.3, drift: 27, tone: "used" },
  { x: 16, y: 70, size: 30, delay: 0.6, drift: 33, tone: "air" },
  { x: 60, y: 90, size: 36, delay: 0.2, drift: 25, tone: "air" },
  { x: 32, y: 44, size: 12, delay: 1, drift: 19, tone: "used" },
  { x: 72, y: 40, size: 9, delay: 0.7, drift: 21, tone: "air" },
  { x: 40, y: 8, size: 10, delay: 1.2, drift: 17, tone: "used" },
  { x: 24, y: 92, size: 8, delay: 0.5, drift: 22, tone: "used" },
];

export function BreathingBubbles({
  cycleMs = 11_000,
  variant = "even",
}: {
  cycleMs?: number;
  variant?: "even" | "long-out";
}) {
  const breathe =
    variant === "even" ? "bubble-breathe" : "bubble-breathe-long-out";
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="bubble absolute rounded-full"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.size}vmax`,
            height: `${b.size}vmax`,
            marginLeft: `${-b.size / 2}vmax`,
            marginTop: `${-b.size / 2}vmax`,
            background: `radial-gradient(circle at 38% 34%, var(--bubble-${b.tone}-core), var(--bubble-${b.tone}) 45%, transparent 70%)`,
            animation: `${breathe} ${cycleMs}ms cubic-bezier(0.45, 0, 0.55, 1) ${b.delay - 1.2}s infinite, bubble-drift ${b.drift}s ease-in-out ${-i * 3}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
