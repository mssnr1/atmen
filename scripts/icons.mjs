// Renders PWA icons from public/icon.svg: node scripts/icons.mjs
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, size, pad] of [['pwa-192.png', 192, 0], ['pwa-512.png', 512, 0], ['pwa-maskable-512.png', 512, 0.12], ['apple-touch-icon.png', 180, 0]]) {
  await page.setViewportSize({ width: size, height: size })
  const inner = Math.round(size * (1 - pad * 2))
  await page.setContent(`<body style="margin:0;background:#0b1a24;display:grid;place-items:center;height:${size}px">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`)
  await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname })
}
await browser.close()
