import { useEffect, useRef } from 'react'

/** How many specks make up a word. Enough to read clearly, few enough to stay airy. */
const COUNT = 3000
/** Share of specks that drift loose and fade like a breath of air before they return. */
const LOOSE = 0.12

type Speck = {
  x: number
  y: number
  tx: number
  ty: number
  /** Phase and speed of the specks own small wander. */
  seed: number
  speed: number
  size: number
  alpha: number
  /** 0 = sitting in the word, >0 = drifting away (seconds left). */
  drift: number
}

/** Points inside the glyphs of `text`, sampled from an offscreen raster. */
function samplePoints(text: string, width: number, height: number, size: number, family: string): [number, number][] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(width))
  c.height = Math.max(1, Math.round(height))
  const g = c.getContext('2d', { willReadFrequently: true })
  if (!g) return []
  g.font = `500 ${size}px ${family}`
  // Shrink long words so they keep some air at the sides.
  const fit = Math.min(1, (c.width * 0.86) / g.measureText(text).width)
  if (fit < 1) g.font = `500 ${size * fit}px ${family}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = '#000'
  g.fillText(text, c.width / 2, c.height / 2)
  const data = g.getImageData(0, 0, c.width, c.height).data
  const points: [number, number][] = []
  const step = 2
  for (let y = 0; y < c.height; y += step) {
    for (let x = 0; x < c.width; x += step) {
      if (data[(y * c.width + x) * 4 + 3] > 120) points.push([x + Math.random() * step, y + Math.random() * step])
    }
  }
  return points
}

/**
 * A word drawn from many small specks of air in the accent blue. The specks wander
 * gently around the letter shapes, a few drift off and come back, and on a new word
 * they flow over into the new letters instead of switching at once.
 */
export function ParticleWord({ text, className, fontSize = 64 }: { text: string; className?: string; fontSize?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef<{ specks: Speck[]; retarget: (text: string) => void } | null>(null)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const specks: Speck[] = []
    let w = 0
    let h = 0
    let current = text
    let color = '#2f6bf5'

    const readColor = () => {
      color = getComputedStyle(el).color || color
    }

    const retarget = (word: string) => {
      current = word
      if (!w || !h) return
      const family = getComputedStyle(el).fontFamily
      const points = samplePoints(word, w, h, fontSize, family)
      if (!points.length) return
      // Pick targets and pair them with the specks from left to right, so each speck
      // only flows a short way into the new letters and the word stays readable.
      const targets = Array.from({ length: COUNT }, () => points[Math.floor(Math.random() * points.length)])
      targets.sort((a, b) => a[0] - b[0])
      if (specks.length === 0) {
        for (const [tx, ty] of targets) {
          specks.push({
            x: tx + (Math.random() - 0.5) * 30,
            y: ty + (Math.random() - 0.5) * 20,
            tx,
            ty,
            seed: Math.random() * 1000,
            speed: 0.7 + Math.random() * 0.6,
            size: 0.45 + Math.random() * 0.75,
            alpha: 0.45 + Math.random() * 0.55,
            drift: 0,
          })
        }
      } else {
        const order = specks.map((_, i) => i).sort((a, b) => specks[a].x - specks[b].x)
        order.forEach((i, n) => {
          specks[i].tx = targets[n][0]
          specks[i].ty = targets[n][1]
        })
      }
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
      retarget(current)
    }

    state.current = { specks, retarget }
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    const themeObserver = new MutationObserver(readColor)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    // Web fonts may arrive after the first raster.
    document.fonts?.ready.then(() => retarget(current))

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color
      for (const s of specks) {
        if (s.drift > 0) {
          // A loose speck rises and drifts to the side, fading out, then rejoins its letter.
          s.drift -= dt
          s.x += (14 + 10 * Math.sin(s.seed)) * dt
          s.y -= 6 * dt
          if (s.drift <= 0) {
            s.x = s.tx + (Math.random() - 0.5) * 6
            s.y = s.ty + (Math.random() - 0.5) * 6
          }
        } else {
          // Ease towards the letter, then wander softly around it.
          const k = 1 - Math.exp(-dt * 3.5 * s.speed)
          s.x += (s.tx - s.x) * k
          s.y += (s.ty - s.y) * k
          if (!reduced && Math.random() < LOOSE * dt * 0.25) s.drift = 1.2 + Math.random() * 1.6
        }
        const wander = reduced ? 0 : 1
        const ox = wander * (Math.sin(t * s.speed + s.seed) * 0.8 + Math.sin(t * 0.7 + s.ty * 0.05) * 0.5)
        const oy = wander * Math.cos(t * s.speed * 1.3 + s.seed * 1.7) * 0.7
        const fade = s.drift > 0 ? Math.min(1, s.drift / 1.5) : 1
        ctx.globalAlpha = s.alpha * fade * (0.75 + 0.25 * Math.sin(t * 1.5 + s.seed))
        ctx.beginPath()
        ctx.arc(s.x + ox, s.y + oy, s.size, 0, Math.PI * 2)
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
      state.current = null
    }
    // The canvas is set up once; word changes go through `retarget` below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontSize])

  useEffect(() => {
    state.current?.retarget(text)
  }, [text])

  return (
    <span className={`relative block ${className ?? ''}`}>
      <span className="sr-only">{text}</span>
      <canvas ref={canvas} aria-hidden className="block size-full" />
    </span>
  )
}
