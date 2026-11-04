/** A heartbeat shape over one beat (0..1): a strong contraction, then a smaller one. */
export function heartbeat(phase: number): number {
  const g = (c: number, w: number) => Math.exp(-(((phase - c) / w) ** 2))
  return Math.min(1, g(0.12, 0.07) + 0.45 * g(0.36, 0.08))
}
