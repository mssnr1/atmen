import { useCallback, useState, type HTMLAttributes } from 'react'

/**
 * Rounded rectangle with smoothed (continuous) corners, as Figma's corner
 * smoothing draws them: `smoothing` 0 is a plain radius, 0.6 is the iOS look.
 */
export function squirclePath(w: number, h: number, radius: number, smoothing: number): string {
  const r = Math.min(radius, w / 2, h / 2)
  const p = Math.min((1 + smoothing) * r, Math.min(w, h) / 2)
  const rad = (deg: number) => (deg * Math.PI) / 180
  const arcMeasure = 90 * (1 - smoothing)
  const arc = Math.sin(rad(arcMeasure / 2)) * r * Math.SQRT2
  const p3ToP4 = r * Math.tan(rad((90 - arcMeasure) / 4))
  const beta = 45 * smoothing
  const c = p3ToP4 * Math.cos(rad(beta))
  const d = c * Math.tan(rad(beta))
  const b = (p - arc - c - d) / 3
  const a = 2 * b
  const s = a + b + c
  return [
    `M ${w - p} 0`,
    `c ${a} 0 ${a + b} 0 ${s} ${d}`,
    `a ${r} ${r} 0 0 1 ${arc} ${arc}`,
    `c ${d} ${c} ${d} ${b + c} ${d} ${s}`,
    `L ${w} ${h - p}`,
    `c 0 ${a} 0 ${a + b} ${-d} ${s}`,
    `a ${r} ${r} 0 0 1 ${-arc} ${arc}`,
    `c ${-c} ${d} ${-(b + c)} ${d} ${-s} ${d}`,
    `L ${p} ${h}`,
    `c ${-a} 0 ${-(a + b)} 0 ${-s} ${-d}`,
    `a ${r} ${r} 0 0 1 ${-arc} ${-arc}`,
    `c ${-d} ${-c} ${-d} ${-(b + c)} ${-d} ${-s}`,
    `L 0 ${p}`,
    `c 0 ${-a} 0 ${-(a + b)} ${d} ${-s}`,
    `a ${r} ${r} 0 0 1 ${arc} ${-arc}`,
    `c ${c} ${-d} ${b + c} ${-d} ${s} ${-d}`,
    'Z',
  ].join(' ')
}

/** A box clipped to a squircle that follows its own size. */
export function Squircle({ radius, smoothing = 0.6, style, ...props }: HTMLAttributes<HTMLDivElement> & { radius: number; smoothing?: number }) {
  const [size, setSize] = useState<[number, number] | null>(null)
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const ro = new ResizeObserver(() => setSize([el.offsetWidth, el.offsetHeight]))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const clip = size ? `path('${squirclePath(size[0], size[1], radius, smoothing)}')` : undefined
  return <div ref={measure} style={{ borderRadius: radius, clipPath: clip, ...style }} {...props} />
}
