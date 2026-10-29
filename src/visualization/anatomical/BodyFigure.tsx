import { useRef, type RefObject } from 'react'
import { DIAPHRAGM_SPAN, HEAD, HILUM_LEFT, HILUM_RIGHT, VIEW, lungOutline, torsoHalfWidth, type BodyPose, type Ellipse } from './model'

/**
 * The semi-transparent body, drawn in SVG from the anatomical model. Static
 * parts render once; moving parts (torso wall, lungs, heart, diaphragm,
 * abdominal contents) are updated directly by `updateBody` each frame.
 */

export interface BodyRefs {
  torso: RefObject<SVGPathElement | null>
  lungLeft: RefObject<SVGPathElement | null>
  lungRight: RefObject<SVGPathElement | null>
  heart: RefObject<SVGEllipseElement | null>
  diaphragm: RefObject<SVGPathElement | null>
  abdomen: RefObject<SVGPathElement | null>
  belly: RefObject<SVGEllipseElement | null>
}

export function useBodyRefs(): BodyRefs {
  return {
    torso: useRef(null),
    lungLeft: useRef(null),
    lungRight: useRef(null),
    heart: useRef(null),
    diaphragm: useRef(null),
    abdomen: useRef(null),
    belly: useRef(null),
  }
}

const n = (x: number) => x.toFixed(1)
const TORSO_TOP = 112
const TORSO_BOTTOM = VIEW.height + 4

function torsoPath(pose: BodyPose): string {
  const left: string[] = []
  const right: string[] = []
  for (let y = TORSO_TOP; y <= TORSO_BOTTOM; y += 4) {
    const w = torsoHalfWidth(y, pose)
    left.push(`${n(100 - w)} ${n(y)}`)
    right.push(`${n(100 + w)} ${n(y)}`)
  }
  return `M${left.join(' L')} L${right.reverse().join(' L')} Z`
}

function diaphragmPath(pose: BodyPose): string {
  const pts: string[] = []
  for (let x = DIAPHRAGM_SPAN.left; x <= DIAPHRAGM_SPAN.right; x += 4) pts.push(`${n(x)} ${n(pose.diaphragmY(x))}`)
  return `M${pts.join(' L')}`
}

/** Abdominal contents fill the space between the diaphragm and the pelvis. */
function abdomenPath(pose: BodyPose): string {
  const top: string[] = []
  for (let x = DIAPHRAGM_SPAN.left + 6; x <= DIAPHRAGM_SPAN.right - 6; x += 4) top.push(`${n(x)} ${n(pose.diaphragmY(x) + 2.5)}`)
  const side: string[] = []
  const startY = pose.diaphragmY(DIAPHRAGM_SPAN.right - 6) + 2.5
  for (let y = startY; y <= TORSO_BOTTOM; y += 6) side.push(`${n(100 + torsoHalfWidth(y, pose) - 5)} ${n(y)}`)
  const otherSide = side.map((pt) => {
    const [x, y] = pt.split(' ').map(Number)
    return `${n(200 - x)} ${n(y)}`
  })
  return `M${top.join(' L')} L${side.join(' L')} L${otherSide.reverse().join(' L')} Z`
}

function lungPath(pose: BodyPose, side: 'lungLeft' | 'lungRight'): string {
  return `M${lungOutline(pose[side], pose)
    .map(([x, y]) => `${n(x)} ${n(y)}`)
    .join(' L')} Z`
}

function setEllipse(el: SVGEllipseElement | null, e: Ellipse) {
  if (!el) return
  el.setAttribute('cx', n(e.cx))
  el.setAttribute('cy', n(e.cy))
  el.setAttribute('rx', n(e.rx))
  el.setAttribute('ry', n(e.ry))
}

/** `fallbackFill` tints the lungs when the WebGL air volume is unavailable. */
export function updateBody(refs: BodyRefs, pose: BodyPose, fallbackFill?: number): void {
  refs.torso.current?.setAttribute('d', torsoPath(pose))
  refs.diaphragm.current?.setAttribute('d', diaphragmPath(pose))
  refs.abdomen.current?.setAttribute('d', abdomenPath(pose))
  // The belly wall pushed forward toward the viewer: a warm swell that grows with the bulge.
  const belly = refs.belly.current
  if (belly) {
    setEllipse(belly, { cx: 100, cy: 266 + pose.diaphragmDrop * 0.5, rx: 36 + pose.abdomenBulge * 1.4, ry: 24 + pose.abdomenBulge })
    belly.setAttribute('opacity', n(0.35 + pose.abdomenBulge * 0.07))
  }
  refs.lungLeft.current?.setAttribute('d', lungPath(pose, 'lungLeft'))
  refs.lungRight.current?.setAttribute('d', lungPath(pose, 'lungRight'))
  // The heart sits on the diaphragm in the left lung's notch and rides down with it.
  const heart = refs.heart.current
  if (heart) {
    const bottom = pose.diaphragmY(107) - 1
    setEllipse(heart, { cx: 107, cy: bottom - 14, rx: 13, ry: 17 })
    heart.setAttribute('transform', `rotate(-28 107 ${n(bottom - 14)})`)
  }
  if (fallbackFill !== undefined) {
    const o = n(0.06 + 0.4 * fallbackFill)
    refs.lungLeft.current?.setAttribute('fill-opacity', o)
    refs.lungRight.current?.setAttribute('fill-opacity', o)
  }
}

const skin = { fill: '#e8f3f1', fillOpacity: 0.045, stroke: '#e8f3f1', strokeOpacity: 0.28, strokeWidth: 0.8 }
const airwayStroke = { stroke: '#a6e8dd', strokeOpacity: 0.35, strokeWidth: 0.7, fill: 'none' }

export function BodyFigure({ refs }: { refs: BodyRefs }) {
  const tracheaRings = []
  for (let y = 100; y <= 142; y += 5) tracheaRings.push(<path key={y} d={`M96.6 ${y} Q100 ${y + 1.4} 103.4 ${y}`} {...airwayStroke} strokeOpacity={0.2} />)

  return (
    <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="abdomen-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9b48a" stopOpacity="0.16" />
          <stop offset="1" stopColor="#e9b48a" stopOpacity="0.02" />
        </linearGradient>
        <radialGradient id="belly-swell">
          <stop offset="0" stopColor="#f3c9a4" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f3c9a4" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Torso, neck, head */}
      <path ref={refs.torso} {...skin} strokeLinejoin="round" />
      <path d="M89.5 70 L88.5 113 M110.5 70 L111.5 113" {...skin} fill="none" />
      <rect x="89" y="72" width="22" height="42" fill={skin.fill} fillOpacity={skin.fillOpacity} />
      <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} {...skin} />
      <path d="M100 38 Q97.5 54 93 62.5 Q100 68.5 107 62.5 Q102.5 54 100 38" {...skin} fillOpacity={0.06} />
      <ellipse cx="96.6" cy="64.6" rx="1.6" ry="1" fill="#0b1a24" fillOpacity={0.6} />
      <ellipse cx="103.4" cy="64.6" rx="1.6" ry="1" fill="#0b1a24" fillOpacity={0.6} />

      {/* Nasal cavity, pharynx, trachea and bronchi */}
      <path d="M94.5 64 Q93 50 100 44 Q107 50 105.5 64" {...airwayStroke} strokeDasharray="1.5 1.5" />
      <path d="M96.6 66 L96.6 146 M103.4 66 L103.4 146" {...airwayStroke} />
      {tracheaRings}
      <path
        d={`M96.6 146 Q90 150 ${HILUM_LEFT.at[0]} ${HILUM_LEFT.at[1] - 2} M103.4 146 Q110 150 ${HILUM_RIGHT.at[0]} ${HILUM_RIGHT.at[1] - 2}`}
        {...airwayStroke}
      />

      {/* Lungs, diaphragm, abdominal contents */}
      <ellipse ref={refs.heart} fill="#e58f7f" fillOpacity={0.16} stroke="#e58f7f" strokeOpacity={0.4} strokeWidth={0.6} />
      <path ref={refs.lungLeft} fill="#7ed9cb" fillOpacity={0.06} stroke="#a6e8dd" strokeOpacity={0.5} strokeWidth={0.8} strokeLinejoin="round" />
      <path ref={refs.lungRight} fill="#7ed9cb" fillOpacity={0.06} stroke="#a6e8dd" strokeOpacity={0.5} strokeWidth={0.8} strokeLinejoin="round" />
      <path ref={refs.abdomen} fill="url(#abdomen-fill)" stroke="#e9b48a" strokeOpacity={0.14} strokeWidth={0.6} />
      <ellipse ref={refs.belly} fill="url(#belly-swell)" />
      <path ref={refs.diaphragm} fill="none" stroke="#e9b48a" strokeOpacity={0.85} strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  )
}
