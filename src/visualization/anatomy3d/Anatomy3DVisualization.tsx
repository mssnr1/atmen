import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CubeIcon } from '../../components/icons'
import type { BreathSource } from '../breathState'
import { useI18n } from '../../i18n'
import { AbstractVisualization } from '../abstract/AbstractVisualization'
import { AnatomyModel } from './AnatomyModel'
import { Aura } from './Aura'

/** What the camera looks at by default: the middle of the chest. Its height is set per viewport by `fitView`. */
const TARGET = new THREE.Vector3(0, 1.37, 0.0)
/** Default view: straight from the front, slightly from above. A start never turns the figure sideways. */
const ELEVATION = THREE.MathUtils.degToRad(6)
/** While breathing the camera rises a little, so the lungs and their rings show their depth; after the exercise it comes back to the front. */
const RUN_ELEVATION = THREE.MathUtils.degToRad(17)
const elevation = (framing: Framing) => (framing === 'run' ? RUN_ELEVATION : ELEVATION)
const FOV = 28
/** Half the width that must be visible: the whole figure, arms included. */
const HALF_W = 0.32
/** Head to the middle of the lungs fill the part of the view above the controls; the lower lungs continue behind them. */
const TOP = 1.74
const BOTTOM = 1.2
/** Panning keeps the target inside this box so the model cannot be lost. */
const PAN_LIMIT = new THREE.Box3(new THREE.Vector3(-0.2, 0.6, -0.15), new THREE.Vector3(0.2, 1.7, 0.2))

/**
 * Default camera for a viewport of this aspect ratio, where only the top
 * `clear` fraction is not covered by the controls: head to diaphragm fill that
 * part, and the body continues down behind the controls.
 */
export function fitView(aspect: number, clear = 1, framing: Framing = 'idle', top = 0): { distance: number; target: THREE.Vector3 } {
  const t = Math.tan(THREE.MathUtils.degToRad(FOV) / 2)
  if (framing === 'start') {
    // The start screen: close on the chest, the lungs wide across the view, the head running out of the
    // top edge. The lower part of the view belongs to the text and buttons: on a wide screen the lungs
    // still have to fit into the part above them.
    const halfH = Math.max((START_TOP - START_BOTTOM) / (2 * START_CLEAR), START_HALF_W / aspect)
    return { distance: halfH / t, target: new THREE.Vector3(TARGET.x, START_TOP - halfH, TARGET.z) }
  }
  if (framing === 'done') {
    // After the exercise: close on the head and neck, the shoulders just above the controls.
    const halfH = Math.max((DONE_TOP - DONE_BOTTOM) / (2 * clear), DONE_HALF_W / aspect)
    return { distance: halfH / t, target: new THREE.Vector3(TARGET.x, DONE_TOP - halfH + 2 * halfH * top, TARGET.z) }
  }
  const halfH = Math.max((TOP - BOTTOM) / (2 * clear), HALF_W / aspect)
  // `top` is the share of the view hidden behind the top bar: the figure's head sits just below it.
  const target = new THREE.Vector3(TARGET.x, TOP - halfH + 2 * halfH * top, TARGET.z)
  if (framing === 'idle') return { distance: halfH / t, target }
  // Once the exercise runs, the camera also moves in closer, toward the lungs.
  target.y += (LUNG_Y - target.y) * 0.35
  // On a wide screen the height sets the view: nose and lungs stay above the phase word and the controls.
  const h = Math.max(halfH * RUN_ZOOM, (RUN_TOP - RUN_BOTTOM) / (2 * clear))
  const under = Math.max(1 - clear - top, 0)
  target.y = Math.min(target.y, RUN_BOTTOM + h * (1 - 2 * under))
  return { distance: h / t, target }
}

/** The view on the start screen, before an exercise, while breathing, and on the "well done" screen after it. */
export type Framing = 'start' | 'idle' | 'run' | 'done'
/** Framing of the start screen: from the nose down to under the lungs, and the half width the lungs need. */
const START_TOP = 1.655
const START_BOTTOM = 1.13
const START_HALF_W = 0.205
/** The share of the start screen's height, from the top, that the text and buttons leave free. */
const START_CLEAR = 0.6
/** Framing after the exercise: from a little above the head down to the shoulders, and the width that must fit. */
const DONE_TOP = 1.8
const DONE_BOTTOM = 1.36
const DONE_HALF_W = 0.11

/** How much closer the camera is once the exercise runs, and the height of the middle of the lungs it moves toward. */
const RUN_ZOOM = 0.76
const LUNG_Y = 1.33
/** What has to stay in view while breathing: from the nose down to under the lungs. */
const RUN_TOP = 1.655
const RUN_BOTTOM = 1.1

function defaultPosition(aspect: number, clear: number, framing: Framing = 'idle', top = 0): THREE.Vector3 {
  const { distance: d, target } = fitView(aspect, clear, framing, top)
  const e = elevation(framing)
  return new THREE.Vector3(target.x, target.y + d * Math.sin(e), target.z + d * Math.cos(e))
}

/** A slow zoom (and the way back from wherever the user turned the figure) that eases in and out with no jolt at either end (smootherstep). */
const TURN_S = 3.4
/** Reset view turns back the same way, a little quicker since it answers a tap. */
const RESET_S = 2
const easeInOut = (t: number) => t * t * t * (t * (6 * t - 15) + 10)

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** After the graphics were taken away: how long to wait before building the scene anew, and how often in what time before giving up. */
const REBUILD_AFTER_MS = 400
const MAX_REBUILDS = 3
const REBUILD_WINDOW_MS = 60_000
/** The stand-in waits this long before it appears, so a figure that is there at once is not preceded by a flicker. */
const STAND_IN_AFTER_MS = 600
const STAND_IN_FADE_MS = 700

/**
 * What stands in the figure's place while the figure is not on screen: it is still loading, or the
 * graphics were taken away and are being rebuilt. Fades in after a moment and out when the figure comes.
 */
function StandIn({ show, children }: { show: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(show)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (show) setMounted(true)
    else setVisible(false)
    const timer = window.setTimeout(() => (show ? setVisible(true) : setMounted(false)), show ? STAND_IN_AFTER_MS : STAND_IN_FADE_MS)
    return () => window.clearTimeout(timer)
  }, [show])
  if (!mounted) return null
  return (
    <div className="pointer-events-none absolute inset-0 transition-opacity ease-out" style={{ opacity: visible ? 1 : 0, transitionDuration: `${STAND_IN_FADE_MS}ms` }} data-testid="figure-stand-in">
      {children}
    </div>
  )
}

/** Shows the fallback instead of breaking the exercise if the model fails to load or render. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Rig({
  framing,
  controls,
  resetSignal,
  bottomInset,
  topInset,
  onReady,
}: {
  framing: Framing
  controls: React.RefObject<OrbitControlsImpl | null>
  resetSignal: number
  bottomInset: number
  topInset: number
  /** The first frame, with the camera in place, is on screen. */
  onReady: () => void
}) {
  const { camera, size } = useThree()
  const aspect = size.width / Math.max(1, size.height)
  const H = Math.max(1, size.height)
  const top = Math.min(Math.max(topInset / H, 0), 0.3)
  const clear = Math.min(Math.max(1 - bottomInset / H - top, 0.4), 1)
  // Read through a ref so a start zooms the camera smoothly instead of resetting it.
  const framingRef = useRef(framing)
  useLayoutEffect(() => {
    framingRef.current = framing
  }, [framing])
  /** The framing the camera is at (or heading for). */
  const framed = useRef(framing)
  // The latest default framing, read by the frame loop so a turn can head for it.
  const layout = useRef({ aspect, clear, top })
  layout.current = { aspect, clear, top }
  /** A tween of the whole camera pose: from where it was to the default view for the current framing and layout. */
  const turn = useRef<{ from: THREE.Spherical; fromTarget: THREE.Vector3; t: number; seconds: number } | null>(null)
  /** The camera and the controls' target stand at the default view (false until the controls exist). */
  const placed = useRef(false)
  const place = () => {
    const c = controls.current
    const { aspect: a, clear: cl, top: tp } = layout.current
    const { target } = fitView(a, cl, framingRef.current, tp)
    camera.position.copy(defaultPosition(a, cl, framingRef.current, tp))
    c?.target.copy(target)
    camera.lookAt(target)
    c?.update()
    placed.current = !!c
  }
  // Default view on mount and on Reset view. A layout change once started (the
  // controls panel shrinks as the exercise starts) eases there, as part of
  // the turn if one is running, so the figure never jumps.
  // A layout effect, so the camera stands before the first frame is drawn: a passive effect can run
  // after that frame, and it would show the camera's blank default, a view down at the feet.
  const lastSignal = useRef<number | null>(null)
  useLayoutEffect(() => {
    const c = controls.current
    const first = lastSignal.current === null
    const reset = !first && lastSignal.current !== resetSignal
    lastSignal.current = resetSignal
    const turnFromHere = (seconds: number) => {
      if (!c) return
      turn.current = { from: new THREE.Spherical().setFromVector3(new THREE.Vector3().subVectors(camera.position, c.target)), fromTarget: c.target.clone(), t: 0, seconds }
    }
    // Reset view: turn back to the default view smoothly, like the zoom at the start.
    if (reset && c) {
      framed.current = framingRef.current
      turnFromHere(RESET_S)
      return
    }
    // A change of framing is on its way (the frame loop starts its turn), or a turn is running:
    // either heads for the new layout by itself.
    if (!first && c && (turn.current || framed.current !== framingRef.current)) return
    // A layout change while breathing eases there, so the figure never jumps.
    if (!first && c && (framingRef.current === 'run' || framingRef.current === 'done')) {
      turnFromHere(TURN_S)
      return
    }
    // At rest (first load, the controls being measured, a resize) it just snaps.
    turn.current = null
    framed.current = framingRef.current
    place()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, aspect, clear, top, controls, resetSignal])

  // Zoom in when the exercise starts, and back out when it ends or goes back to the start.
  const spherical = useMemo(() => new THREE.Spherical(), [])
  const offset = useMemo(() => new THREE.Vector3(), [])
  const frames = useRef(0)
  useFrame((_, delta) => {
    // The second frame begins: the first, with everything compiled and the camera in place, is on screen.
    if (frames.current < 2 && ++frames.current === 2) onReady()
    const c = controls.current
    if (!c) return
    if (!placed.current) place()
    // After a pause (the figure hidden behind another screen) the first frame reports the whole gap.
    const dt = Math.min(delta, 0.1)
    if (framed.current !== framingRef.current) {
      framed.current = framingRef.current
      turn.current = { from: new THREE.Spherical().setFromVector3(offset.copy(camera.position).sub(c.target)), fromTarget: c.target.clone(), t: 0, seconds: TURN_S }
    }
    const tw = turn.current
    if (!tw) return
    tw.t = Math.min(tw.t + dt / tw.seconds, 1)
    const k = easeInOut(tw.t)
    const { aspect: a, clear: cl, top: tp } = layout.current
    const { distance, target } = fitView(a, cl, framingRef.current, tp)
    const mix = (x: number, y: number) => x + (y - x) * k
    // From wherever the user left the camera (turned, zoomed, panned) the shortest way round to the default view.
    c.target.lerpVectors(tw.fromTarget, target, k)
    const theta = THREE.MathUtils.euclideanModulo(tw.from.theta + Math.PI, 2 * Math.PI) - Math.PI
    spherical.set(mix(tw.from.radius, distance), mix(tw.from.phi, Math.PI / 2 - elevation(framingRef.current)), mix(theta, 0))
    camera.position.copy(c.target).add(offset.setFromSpherical(spherical))
    camera.lookAt(c.target)
    c.update()
    if (tw.t >= 1) turn.current = null
  })
  return null
}

export function Anatomy3DVisualization({
  engine,
  showProgress,
  bottomInset = 0,
  topInset = 0,
  framing = 'idle',
  paused = false,
  interactive = true,
}: {
  engine: BreathSource
  showProgress: boolean
  bottomInset?: number
  topInset?: number
  framing?: Framing
  /** Stop drawing: the figure is hidden behind another screen. */
  paused?: boolean
  /** The figure can be turned and zoomed (not on the start screen). */
  interactive?: boolean
}) {
  const { t } = useI18n()
  const controls = useRef<OrbitControlsImpl | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [supported] = useState(webglAvailable)
  // The figure fades in once its first frame is drawn, never while the graphics are still being prepared.
  const [shown, setShown] = useState(false)
  // A browser can take the graphics away from a page (a phone does, while the page is in the background),
  // and does not always give them back. The scene is then built anew: `life` counts how often.
  const [life, setLife] = useState(0)
  const [lost, setLost] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)
  const graphics = useRef<{ life: number; gl: WebGLRenderingContext | WebGL2RenderingContext } | null>(null)
  const rebuilds = useRef<number[]>([])
  const lose = (ofLife: number) => {
    // The scene that was taken down sends this too; only the one on screen counts.
    if (graphics.current?.life !== ofLife) return
    graphics.current = null
    setShown(false)
    setLost(true)
  }
  // Rebuild once the page is in front, where a new scene gets its graphics.
  useEffect(() => {
    if (!lost) return
    let timer = 0
    const rebuild = () => {
      window.clearTimeout(timer)
      if (document.visibilityState !== 'visible') return
      timer = window.setTimeout(() => {
        const now = performance.now()
        rebuilds.current = [...rebuilds.current.filter((t) => now - t < REBUILD_WINDOW_MS), now]
        // Taken away again and again: the breath sign leads on instead.
        if (rebuilds.current.length > MAX_REBUILDS) return setGaveUp(true)
        setLost(false)
        setLife((n) => n + 1)
      }, REBUILD_AFTER_MS)
    }
    rebuild()
    document.addEventListener('visibilitychange', rebuild)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', rebuild)
    }
  }, [lost])
  // Not every loss is announced: look when the page comes back to the front.
  useEffect(() => {
    const look = () => {
      const g = graphics.current
      if (document.visibilityState === 'visible' && g?.gl.isContextLost()) lose(g.life)
    }
    document.addEventListener('visibilitychange', look)
    window.addEventListener('pageshow', look)
    return () => {
      document.removeEventListener('visibilitychange', look)
      window.removeEventListener('pageshow', look)
    }
  }, [])
  // "Reset view" only shows once the figure has been turned or zoomed by hand.
  const [moved, setMoved] = useState(false)
  useEffect(() => setMoved(false), [framing])
  // A plain tap (it wakes the controls) is not a move; a drag, a pinch or the wheel is.
  const down = useRef<{ x: number; y: number } | null>(null)

  // The breath sign stands in for the figure, in the same place and rhythm: for good without WebGL
  // (then with a note), and for as long as the figure is not on screen yet.
  const start = framing === 'start'
  const sign = (note: boolean) => (
    <div
      className="pointer-events-none relative flex h-full w-full flex-col items-center justify-center px-8"
      style={start ? { paddingTop: '14dvh', paddingBottom: '46dvh' } : { paddingTop: topInset + 8, paddingBottom: bottomInset + 8 }}
    >
      {!paused && <AbstractVisualization engine={engine} showProgress={showProgress} />}
      {note && !start && (
        <p style={{ top: topInset + 4 }} className="absolute px-10 text-center text-note text-muted" data-testid="model-fallback">
          {t.modelFallback}
        </p>
      )}
    </div>
  )
  const fallback = sign(true)
  if (!supported || gaveUp) return fallback

  return (
    <div
      className={`relative h-full w-full select-none ${interactive ? 'touch-none' : 'pointer-events-none'}`}
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerMove={(e) => {
        const d = down.current
        if (d && !moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) setMoved(true)
      }}
      onPointerUp={() => {
        down.current = null
      }}
      onPointerCancel={() => {
        down.current = null
      }}
      onWheel={() => setMoved(true)}
      data-testid="anatomical-visualization"
    >
      <ModelBoundary fallback={fallback}>
        <Suspense
          fallback={
            <p className="sr-only" data-testid="model-loading">
              {t.modelLoading}
            </p>
          }
        >
          <Canvas
            key={life}
            className={shown ? 'fade-in' : 'opacity-0'}
            frameloop={paused ? 'never' : 'always'}
            dpr={[1, 1.75]}
            camera={{ fov: FOV, near: 0.05, far: 10, position: defaultPosition(1, 1) }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              graphics.current = { life, gl: gl.getContext() }
              gl.domElement.addEventListener('webglcontextlost', () => lose(life))
            }}
            data-testid="anatomy-canvas"
          >
            <ambientLight intensity={1.4} />
            <directionalLight position={[0.6, 2.2, 1.4]} intensity={1.6} />
            <directionalLight position={[-1, 1.2, -0.6]} intensity={0.5} color="#dfe8ff" />
            <Aura engine={engine} />
            <AnatomyModel engine={engine} />
            <OrbitControls
              ref={controls}
              makeDefault
              enabled={interactive}
              enableDamping
              dampingFactor={0.12}
              rotateSpeed={0.7}
              zoomSpeed={0.8}
              panSpeed={0.8}
              minDistance={0.45}
              maxDistance={2.6}
              minPolarAngle={THREE.MathUtils.degToRad(35)}
              maxPolarAngle={THREE.MathUtils.degToRad(140)}
              touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
              mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
              onChange={() => {
                const c = controls.current
                if (!c) return
                const clamped = PAN_LIMIT.clampPoint(c.target, new THREE.Vector3())
                if (!clamped.equals(c.target)) {
                  const shift = clamped.sub(c.target)
                  c.target.add(shift)
                  c.object.position.add(shift)
                }
              }}
            />
            <Rig framing={framing} controls={controls} resetSignal={resetSignal} bottomInset={bottomInset} topInset={topInset} onReady={() => setShown(true)} />
          </Canvas>
        </Suspense>
      </ModelBoundary>
      <StandIn show={!shown}>{sign(false)}</StandIn>
      {interactive && moved && (
        <button
          type="button"
          onClick={() => {
            setResetSignal((n) => n + 1)
            setMoved(false)
          }}
          aria-label={t.resetView}
          title={t.resetView}
          data-testid="reset-view"
          style={{ top: topInset + 8 }}
          className="fade-in absolute left-3 flex size-11 items-center justify-center rounded-full bg-paper/60 text-ink-2 ring-1 ring-line backdrop-blur md:left-5"
        >
          <CubeIcon className="size-5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}
