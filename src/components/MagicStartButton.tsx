import { useEffect, useRef, type ReactNode } from 'react'

/** How far the particle canvas reaches beyond the button (px), so specks can float off it. */
const PAD_X = 48
const PAD_TOP = 84
const PAD_BOTTOM = 20
/** New specks per second while the page is visible. */
const RATE = 90
const MAX = 320

type Speck = { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; alpha: number; seed: number }

/**
 * The floating Start pill with a little magic: a soft light runs around its outline and
 * fine specks of air, in the same style as the particle words, loosen from its edge and
 * drift upwards. With reduced motion only a calm, still outline remains.
 */
export function MagicStartButton({ onClick, children, testId }: { onClick: () => void; children: ReactNode; testId?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const specks: Speck[] = []
    let w = 0
    let h = 0
    let color = '#2f6bf5'
    const readColor = () => {
      color = getComputedStyle(el).color || color
    }
    const resize = () => {
      const rect = el.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = rect.width
      h = rect.height
      el.width = Math.round(w * dpr)
      el.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      readColor()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    const themeObserver = new MutationObserver(readColor)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    /** A point on the pill's outline and its outward direction; t runs 0..1 around it. */
    const edge = (t: number) => {
      const bw = w - 2 * PAD_X
      const bh = h - PAD_TOP - PAD_BOTTOM
      const r = bh / 2
      const straight = Math.max(0, bw - 2 * r)
      const total = 2 * straight + 2 * Math.PI * r
      let d = t * total
      const left = PAD_X + r
      const cy = PAD_TOP + r
      if (d < straight) return { x: left + d, y: PAD_TOP, nx: 0, ny: -1 }
      d -= straight
      if (d < Math.PI * r) {
        const a = -Math.PI / 2 + d / r
        return { x: left + straight + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) }
      }
      d -= Math.PI * r
      if (d < straight) return { x: left + straight - d, y: PAD_TOP + bh, nx: 0, ny: 1 }
      d -= straight
      const a = Math.PI / 2 + d / r
      return { x: left + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) }
    }

    let raf = 0
    let last = performance.now()
    let carry = 0
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      // The flow swells and settles slowly, like a calm breath (about 11 s per cycle).
      const breath = 0.55 + 0.45 * Math.sin((t / 11) * Math.PI * 2)
      carry += RATE * breath * dt
      while (carry >= 1 && w > 0) {
        carry -= 1
        if (specks.length >= MAX) break
        // Mostly from the upper half, so the specks rise off the top like air.
        const p = edge(Math.random() < 0.75 ? Math.random() * 0.5 : 0.5 + Math.random() * 0.5)
        const out = 6 + Math.random() * 12
        specks.push({
          x: p.x + (Math.random() - 0.5) * 2,
          y: p.y + (Math.random() - 0.5) * 2,
          vx: p.nx * out + (Math.random() - 0.5) * 6,
          vy: p.ny * out - 12 - Math.random() * 16,
          life: 1.8 + Math.random() * 2.2,
          age: 0,
          size: 0.7 + Math.random() * 1.1,
          alpha: 0.5 + Math.random() * 0.5,
          seed: Math.random() * 1000,
        })
      }
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color
      for (let i = specks.length - 1; i >= 0; i--) {
        const s = specks[i]
        s.age += dt
        if (s.age >= s.life) {
          specks.splice(i, 1)
          continue
        }
        // Slow down a little and sway, as if carried by a soft breeze.
        s.vx *= 1 - dt * 0.6
        s.vy *= 1 - dt * 0.35
        s.x += (s.vx + Math.sin(t * 1.3 + s.seed) * 4) * dt
        s.y += s.vy * dt
        const k = s.age / s.life
        // Fade in quickly, then out slowly.
        const fade = Math.min(1, k * 5) * (1 - k)
        ctx.globalAlpha = s.alpha * fade * (0.75 + 0.25 * Math.sin(t * 2 + s.seed))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      themeObserver.disconnect()
    }
  }, [])

  return (
    <span className="relative inline-block">
      <canvas
        ref={canvas}
        aria-hidden
        className="pointer-events-none absolute text-accent"
        style={{ left: -PAD_X, right: -PAD_X, top: -PAD_TOP, bottom: -PAD_BOTTOM, width: `calc(100% + ${2 * PAD_X}px)`, height: `calc(100% + ${PAD_TOP + PAD_BOTTOM}px)` }}
      />
      <button
        type="button"
        onClick={onClick}
        className="magic-start pointer-events-auto relative h-14 rounded-full bg-fluo px-12 text-[1.0625rem] font-semibold transition active:scale-95"
        data-testid={testId}
      >
        {children}
      </button>
    </span>
  )
}
