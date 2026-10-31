import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { ExpandIcon } from '../../components/icons'
import type { BreathingEngine } from '../../engine'
import { useI18n } from '../../i18n'
import { AbstractVisualization } from '../abstract/AbstractVisualization'
import { AnatomyModel } from './AnatomyModel'
import { Aura } from './Aura'

/** What the camera looks at by default: the middle of the chest. Its height is set per viewport by `fitView`. */
const TARGET = new THREE.Vector3(0, 1.37, 0.0)
/** Default view: slightly from the model's left and from above, a 3/4 perspective. */
const AZIMUTH = THREE.MathUtils.degToRad(28)
const ELEVATION = THREE.MathUtils.degToRad(6)
const FOV = 28
/** Half the width that must be visible, shoulder to shoulder. */
const HALF_W = 0.15
/** Head to the bottom of the lungs and the diaphragm fill the part of the view above the controls. */
const TOP = 1.8
const BOTTOM = 1.0
/** Panning keeps the target inside this box so the model cannot be lost. */
const PAN_LIMIT = new THREE.Box3(new THREE.Vector3(-0.2, 1.05, -0.15), new THREE.Vector3(0.2, 1.7, 0.2))

/**
 * Default camera for a viewport of this aspect ratio, where only the top
 * `clear` fraction is not covered by the controls: head to diaphragm fill that
 * part, and the body continues down behind the controls.
 */
export function fitView(aspect: number, clear = 1): { distance: number; target: THREE.Vector3 } {
  const t = Math.tan(THREE.MathUtils.degToRad(FOV) / 2)
  const halfH = Math.max((TOP - BOTTOM) / (2 * clear), HALF_W / aspect)
  const distance = halfH / t
  return { distance, target: new THREE.Vector3(TARGET.x, TOP - halfH, TARGET.z) }
}

function defaultPosition(aspect: number, clear: number, azimuth = AZIMUTH): THREE.Vector3 {
  const { distance: d, target } = fitView(aspect, clear)
  return new THREE.Vector3(
    target.x + d * Math.cos(ELEVATION) * Math.sin(azimuth),
    target.y + d * Math.sin(ELEVATION),
    target.z + d * Math.cos(ELEVATION) * Math.cos(azimuth),
  )
}

/** Before the exercise starts the figure faces the user; once it starts it turns to the 3/4 view. */
const facingFor = (started: boolean) => (started ? AZIMUTH : 0)
/** A slow turn that eases in and out with no jolt at either end (smootherstep). */
const TURN_S = 3.4
const easeInOut = (t: number) => t * t * t * (t * (6 * t - 15) + 10)

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
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
  started,
  controls,
  resetSignal,
  bottomInset,
}: {
  started: boolean
  controls: React.RefObject<OrbitControlsImpl | null>
  resetSignal: number
  bottomInset: number
}) {
  const { camera, size } = useThree()
  const aspect = size.width / Math.max(1, size.height)
  const clear = Math.min(Math.max(1 - bottomInset / Math.max(1, size.height), 0.4), 1)
  // Read through a ref so a start turns the camera smoothly instead of resetting it.
  const startedRef = useRef(started)
  useEffect(() => {
    startedRef.current = started
  }, [started])
  const facing = useRef(facingFor(started))
  // The latest default framing, read by the frame loop so a turn can head for it.
  const layout = useRef({ aspect, clear })
  layout.current = { aspect, clear }
  /** A tween of the whole camera pose: from where it was to the default view for the current facing and layout. */
  const turn = useRef<{ from: THREE.Spherical; fromTarget: THREE.Vector3; t: number } | null>(null)
  // Default view on mount and on Reset view. A layout change once started (the
  // controls panel shrinks as the exercise starts) eases there, as part of
  // the turn if one is running, so the figure never jumps.
  const lastSignal = useRef<number | null>(null)
  useEffect(() => {
    const c = controls.current
    // Before the exercise starts (first load, the panel being measured) it just snaps.
    if (lastSignal.current !== null && lastSignal.current === resetSignal && c && startedRef.current) {
      if (turn.current || facing.current !== facingFor(startedRef.current)) return
      turn.current = { from: new THREE.Spherical().setFromVector3(new THREE.Vector3().subVectors(camera.position, c.target)), fromTarget: c.target.clone(), t: 0 }
      return
    }
    lastSignal.current = resetSignal
    turn.current = null
    facing.current = facingFor(startedRef.current)
    const { target } = fitView(aspect, clear)
    camera.position.copy(defaultPosition(aspect, clear, facing.current))
    controls.current?.target.copy(target)
    camera.lookAt(target)
    controls.current?.update()
  }, [camera, aspect, clear, controls, resetSignal])

  // Turn around the model when the exercise starts (or goes back to the start).
  const spherical = useMemo(() => new THREE.Spherical(), [])
  const offset = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const want = facingFor(startedRef.current)
    if (want !== facing.current) {
      facing.current = want
      turn.current = { from: new THREE.Spherical().setFromVector3(offset.copy(camera.position).sub(c.target)), fromTarget: c.target.clone(), t: 0 }
    }
    const tw = turn.current
    if (!tw) return
    tw.t = Math.min(tw.t + dt / TURN_S, 1)
    const k = easeInOut(tw.t)
    const { aspect: a, clear: cl } = layout.current
    const { distance, target } = fitView(a, cl)
    const mix = (x: number, y: number) => x + (y - x) * k
    // From wherever the user left the camera (turned, zoomed, panned) the shortest way round to the default view.
    c.target.lerpVectors(tw.fromTarget, target, k)
    const theta = facing.current + THREE.MathUtils.euclideanModulo(tw.from.theta - facing.current + Math.PI, 2 * Math.PI) - Math.PI
    spherical.set(mix(tw.from.radius, distance), mix(tw.from.phi, Math.PI / 2 - ELEVATION), mix(theta, facing.current))
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
  started = false,
}: {
  engine: BreathingEngine
  showProgress: boolean
  bottomInset?: number
  started?: boolean
}) {
  const { t } = useI18n()
  const controls = useRef<OrbitControlsImpl | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [supported] = useState(webglAvailable)

  const fallback = (
    <div className="relative flex h-full w-full flex-col items-center justify-center pt-2" style={{ paddingBottom: bottomInset + 8 }}>
      <AbstractVisualization engine={engine} showProgress={showProgress} />
      <p style={{ bottom: bottomInset }} className="absolute px-6 text-center text-[0.8125rem] text-muted" data-testid="model-fallback">
        {t.modelFallback}
      </p>
    </div>
  )
  if (!supported) return fallback

  return (
    <div className="relative h-full w-full touch-none select-none" data-testid="anatomical-visualization">
      <ModelBoundary fallback={fallback}>
        <Suspense
          fallback={
            <p className="absolute inset-0 flex items-center justify-center text-[0.875rem] text-muted" data-testid="model-loading">
              {t.modelLoading}
            </p>
          }
        >
          <Canvas
            dpr={[1, 1.75]}
            camera={{ fov: FOV, near: 0.05, far: 10, position: defaultPosition(1, 1, 0) }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
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
            <Rig started={started} controls={controls} resetSignal={resetSignal} bottomInset={bottomInset} />
          </Canvas>
        </Suspense>
      </ModelBoundary>
      <button
        type="button"
        onClick={() => setResetSignal((n) => n + 1)}
        aria-label={t.resetView}
        title={t.resetView}
        data-testid="reset-view"
        className="absolute top-2 left-4 flex size-12 items-center justify-center rounded-full bg-card/80 text-ink-2 shadow-[0_1px_6px_rgb(0_0_0/0.06)] backdrop-blur"
      >
        <ExpandIcon className="size-5" strokeWidth={1.5} />
      </button>
    </div>
  )
}
