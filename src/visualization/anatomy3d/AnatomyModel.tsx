import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useTheme } from '../../lib/theme'
import { breathState, type BreathSource } from '../breathState'
import { intoFrame, simplifiedDiaphragm } from './diaphragmShape'
import { airwayTree, type Branch } from './airwayTree'
import { BreathSpecks } from './BreathSpecks'
import { LungGlow, type GlowBed } from './LungGlow'
import { heartbeat } from './heartbeat'
import { ImpactEffects } from './ImpactEffects'
import { addCalmMorph } from './face'
import { withHolesFilled } from './holes'
import { simplifiedLung } from './lungShape'
import { makeMaterials, type MaterialKind } from './materials'
import { addLimbAxis } from './limbs'
import { makeStripeMaterials, STRIPE_PALETTES, type EdgeMap, type Fade } from './stripes'

/** Layer of the lung copies that only draw the edge map. */
const EDGE_LAYER = 5
/** Width of the rim along the edge between the lungs, in CSS pixels (like the outer rim). */
const EDGE_RIM_PX = 18
/** Seconds the lungs take to fade out (and the skin to brighten) after the exercise; about three times this until it settles. */
const FADE_TAU = 1.1
/**
 * How much the skin shows at rest and at the start of an exercise (1 = at its end). At night light belongs
 * to the breath: the body is a dim outline at first and gains a little light with every breath, so the
 * figure itself shows how far the exercise has come. By day the body is an ink drawing and barely changes.
 */
const REST_SKIN = { dark: 0.42, light: 0.86 }
/** Seconds the skin takes to follow, so a start, a pause or the way back never jumps. */
const SKIN_TAU = 1.2
/** How much more the skin shows once the lungs have faded out. */
const SKIN_BOOST = 0.1

export const MODEL_URL = `${import.meta.env.BASE_URL}models/atmen-anatomy.glb`

/** Draw order of the skin's colour; its depth goes just before, the depth is cleared just after (see `PARTS`). */
const SKIN_ORDER = 0.2

/** Which look and draw order each object of the model gets. */
const PARTS: Record<string, { kind: MaterialKind; order: number; hidden?: boolean }> = {
  // The heart stays out of the picture so the lungs and diaphragm read clearly.
  Heart: { kind: 'heart', order: 0, hidden: true },
  // The lungs go first and write depth (back wall at order 1, see below), so the
  // airways and diaphragm drawn after them are hidden where a lung covers them.
  Lung_Left: { kind: 'lung', order: 2 },
  Lung_Right: { kind: 'lung', order: 2 },
  // The airways, nose and throat included, come before the neck and the head, whose skin writes
  // depth and would otherwise hide them: the whole way from the nose to the lungs stays visible.
  Trachea: { kind: 'airway', order: 2.2 },
  Bronchi: { kind: 'airway', order: 2.2 },
  Nasal_Cavity: { kind: 'airway', order: 2.2 },
  Diaphragm: { kind: 'diaphragm', order: 4 },
  // The skin goes first: its depth (order 0.1, see `skinDepth` in stripes.ts), then its colour, which
  // shows only the surface the eye looks at. Then the depth is cleared (order 0.5), so lungs, airways
  // and nose drawn after it stay visible inside the body.
  Body_Shell: { kind: 'skin', order: SKIN_ORDER },
  Head: { kind: 'skin', order: SKIN_ORDER },
  // Arms and legs: lines running round each limb.
  Arms: { kind: 'skin', order: SKIN_ORDER },
  Legs: { kind: 'skin', order: SKIN_ORDER },
}

/** Objects whose skin lines run round their own long axis (see `addLimbAxis`). */
const LIMBS = new Set(['Arms', 'Legs'])

/**
 * How much more the breath moves each part than in life, so the motion reads
 * on a phone screen: the chest wall most, lungs, diaphragm and belly with it.
 */
/**
 * Whether the simplified diaphragm sheet under the lungs is drawn. Off for now: its motion did not
 * show how it pulls the lungs down, so only the lungs breathe. Set to true to bring it back.
 */
const SHOW_DIAPHRAGM = false

const BREATH_GAIN: Record<string, number> = { Body_Shell: 2.6, Arms: 2.6, Lung_Left: 1.7, Lung_Right: 1.7, Diaphragm: 1.25 }

/**
 * Windpipe and main bronchi, drawn as one smooth piece instead of the model's
 * separate, overlapping trachea and bronchi (world metres, along the model's
 * airway; the bronchi end inside the lungs, which hide their ends).
 */
const AIRWAY_TOP = 1.4606
/**
 * The nasal cavity, front to back from its back end, as the model has it (world metres): depth z, floor,
 * roof and half its width. The airway is built along it, so nose, throat and windpipe are one surface
 * with the same lines everywhere, instead of the model's nasal cavity with its folds and inner walls.
 */
const NOSE_PROFILE: [z: number, floor: number, roof: number, w: number][] = [
  [0.053, 1.554, 1.5928, 0.0102],
  [0.057, 1.5544, 1.5942, 0.0101],
  [0.061, 1.5546, 1.5952, 0.0101],
  [0.065, 1.5545, 1.5961, 0.01],
  [0.069, 1.5545, 1.5968, 0.0098],
  [0.073, 1.5546, 1.5965, 0.0098],
  [0.077, 1.5545, 1.5955, 0.01],
  [0.081, 1.554, 1.5935, 0.0107],
  [0.085, 1.553, 1.592, 0.0114],
  [0.089, 1.552, 1.59, 0.0116],
  [0.093, 1.5512, 1.5878, 0.0112],
  [0.097, 1.5513, 1.5826, 0.0102],
  [0.101, 1.5514, 1.5773, 0.0085],
]
/** The nose's front, slanting down under the bridge: the airway is cut off beyond it (see `Branch.clip`). */
const NOSE_FRONT = { point: [0, 1.5878, 0.093] as [number, number, number], normal: [0, 0.39, 0.92] as [number, number, number] }
/** Where the throat's bend ends at the back of the nose: middle height, half its height, half its width. */
const NOSE_OPENING = { y: 1.5722, r: 0.0198, w: 0.0105 }
/** Radii of the throat's bend forward into the nose (world metres): its front wall's and its back wall's. */
const THROAT_INNER = 0.014
const THROAT_OUTER = 0.04
const TRACHEA_R = 0.0105
const CARINA: [number, number, number] = [-0.0005, 1.362, -0.013]
const AIRWAY_BRANCHES: Branch[] = [
  { points: [[0, AIRWAY_TOP + 0.004, 0.01], [-0.0004, 1.4257, 0.005], [-0.0004, 1.3904, -0.0033], CARINA], r0: 0.0105, r1: 0.0095 },
  // Up the back of the throat and forward through the nose, so nose and windpipe are one airway
  // without mouth or throat (see `throat`).
  throat(),
  { points: [CARINA, [0.027, 1.335, -0.018], [0.044, 1.321, -0.021], [0.062, 1.306, -0.02]], r0: 0.0078, r1: 0.0058 },
  { points: [CARINA, [-0.014, 1.348, -0.017], [-0.031, 1.318, -0.021], [-0.044, 1.297, -0.026]], r0: 0.0078, r1: 0.0058 },
]

/**
 * Throat and nose: straight up from the windpipe at its width, then in one round bend forward into the
 * back of the nose, widening on the way to the nose's size (`NOSE_OPENING`), and on along the nose
 * (`NOSE_PROFILE`).
 * The bend is drawn by its two walls, each a quarter circle: the front wall turns from the windpipe's
 * front into the nose's floor, the back wall from the windpipe's back into the nose's roof. The tube
 * runs midway between them, as wide as they are apart.
 */
function throat(): Branch {
  const y0 = AIRWAY_TOP + 0.004
  const z0 = 0.01
  const backZ = 0.0125
  const floor = NOSE_OPENING.y - NOSE_OPENING.r
  const roof = NOSE_OPENING.y + NOSE_OPENING.r
  const inner = { y: floor - THROAT_INNER, z: backZ + TRACHEA_R + THROAT_INNER, r: THROAT_INNER }
  const outer = { y: roof - THROAT_OUTER, z: backZ - TRACHEA_R + THROAT_OUTER, r: THROAT_OUTER }
  const wall = (c: { y: number; z: number; r: number }, a: number) => [c.y + c.r * Math.sin(a), c.z - c.r * Math.cos(a)]
  const points: [number, number, number][] = []
  const radii: number[] = []
  const widths: number[] = []
  const at = (y: number, z: number, r: number, grow: number) => {
    points.push([0, y, z])
    radii.push(r)
    widths.push(TRACHEA_R + (NOSE_OPENING.w - TRACHEA_R) * THREE.MathUtils.smoothstep(grow, 0, 1))
  }
  // Up the back of the neck to where the bend starts.
  const bendY = (wall(inner, 0)[0] + wall(outer, 0)[0]) / 2
  const steps = 8
  for (let i = 0; i < steps; i++) {
    const f = i / steps
    at(y0 + (bendY - y0) * f, z0 + (backZ - z0) * f, TRACHEA_R, 0)
  }
  // Round the bend, midway between its walls.
  const arc = 14
  for (let i = 0; i <= arc; i++) {
    const a = ((Math.PI / 2) * i) / arc
    const [yi, zi] = wall(inner, a)
    const [yo, zo] = wall(outer, a)
    at((yi + yo) / 2, (zi + zo) / 2, Math.hypot(yo - yi, zo - zi) / 2, i / arc)
  }
  // On through the nose to its front, where it ends round inside the nose.
  for (const [z, floor, roof, w] of NOSE_PROFILE) {
    points.push([0, (floor + roof) / 2, z])
    radii.push((roof - floor) / 2)
    widths.push(w)
  }
  return { points, r0: TRACHEA_R, r1: NOSE_OPENING.r, radii, widths, clip: NOSE_FRONT }
}

export { heartbeat }

/** Seconds per beat for the illustrative heartbeat; not the user's pulse. */
const BEAT_S = 60 / 62

/**
 * The anatomical model, driven by the breathing engine. Every frame it samples
 * the engine and sets the morph targets of lungs, diaphragm, belly and chest
 * from the same breath state the air volume and the breath indicator use, so
 * nothing runs on a timer of its own. Only the heartbeat runs on its own clock,
 * on purpose.
 */
export function AnatomyModel({ engine }: { engine: BreathSource }) {
  const { scene } = useGLTF(MODEL_URL, false, true)
  const theme = useTheme()
  const level = useMemo(() => ({ value: 99 }), [])
  const { gl } = useThree()
  // Map of how far away the nearest lung surface is, drawn each frame before the scene.
  const edgeTarget = useMemo(() => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true }), [])
  const edges = useMemo<EdgeMap>(() => ({ map: { value: edgeTarget.texture }, size: { value: new THREE.Vector2(1, 1) }, radius: { value: EDGE_RIM_PX } }), [edgeTarget])
  useEffect(() => () => edgeTarget.dispose(), [edgeTarget])
  const lungRange = useRef<[number, number] | null>(null)
  // 0 while breathing; eases to 1 once the exercise is done: the lungs fade out, the skin glows a little more.
  const done = useRef(0)
  // How far the exercise has come, 0..1, eased: the skin gains light with it.
  const glow = useRef(0)
  const fade = useMemo<Fade>(() => ({ inner: { value: 1 }, skin: { value: 1 } }), [])
  // Height range of the lungs, for their colour gradient from base to top (set once the model is known).
  const lungGradient = useMemo(() => ({ value: new THREE.Vector2(1.1, 1.45) }), [])
  // How strongly the lungs' outline lights up with the "more volume" card (set by ImpactEffects).
  const lungPulse = useMemo(() => ({ value: 0 }), [])
  // The bed of glowing specks under the lungs.
  const bed = useMemo<GlowBed>(() => ({ y: 0, x: 0, z: 0, rx: 0, rz: 0 }), [])
  const materials = useMemo(() => {
    // Contour-stripe look: the lungs show the breath by lighting up from the bottom as they fill.
    return { ...makeMaterials(theme), ...makeStripeMaterials(STRIPE_PALETTES[theme], theme === 'dark', level, edges, fade, lungGradient, lungPulse) }
  }, [theme, level, edges, fade, lungGradient, lungPulse])
  const morphs = useRef<{ mesh: THREE.Mesh; index: number; kind: 'breath' | 'beat' | 'calm'; gain: number }[]>([])
  const calm = useRef(0)
  const beat = useRef(0)

  const model = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    model.updateMatrixWorld(true)
    const found: typeof morphs.current = []
    // Remove the back-wall and edge-map copies of a previous theme before adding fresh ones.
    const stale: THREE.Object3D[] = []
    model.traverse((o) => o.userData.lungBack && stale.push(o))
    stale.forEach((o) => o.removeFromParent())
    const backs: [THREE.Mesh, THREE.Mesh][] = []
    // The cuts below (nose, lungs) work in world space: a fresh copy of the model may not have its
    // world matrices yet, and a cut made with the wrong matrix keeps the mouth and throat.
    model.updateMatrixWorld(true)
    let diaphragm: THREE.Mesh | null = null
    const lungMeshes: THREE.Mesh[] = []
    model.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const part = PARTS[mesh.name] ?? PARTS[mesh.parent?.name ?? '']
      if (!part) return
      if (part.hidden) {
        mesh.visible = false
        return
      }
      // Each lung is drawn as a simplified smooth body, not with its lobes, borders and notches,
      // so its contour lines run calm and even.
      if (part.kind === 'lung' && !mesh.geometry.userData.simplified) {
        const at = mesh.getWorldPosition(new THREE.Vector3())
        const scale = mesh.getWorldScale(new THREE.Vector3()).x
        const side = Math.sign(at.x) || 1
        const smooth = simplifiedLung(mesh.geometry, {
          // Body midline at world x = 0; keep 3 mm off it, flattening over about 3 cm.
          midline: { x: -at.x / scale, side, gap: 0.003 / scale, soft: 0.03 / scale, gain: BREATH_GAIN[mesh.name] ?? 1 },
        })
        if (smooth) {
          smooth.userData.simplified = true
          mesh.geometry = smooth
          mesh.updateMorphTargets()
        }
      }
      // The head is closed over its eyes, brows and lips, so the lines run on across them.
      if (mesh.name === 'Head' && !mesh.geometry.userData.holesFilled) {
        const filled = withHolesFilled(mesh.geometry, mesh.getWorldScale(new THREE.Vector3()).x)
        if (filled) {
          filled.userData.holesFilled = true
          addCalmMorph(filled, mesh.matrixWorld)
          mesh.geometry = filled
          mesh.updateMorphTargets()
        }
      }
      if (LIMBS.has(mesh.name) && !mesh.geometry.getAttribute('axis')) addLimbAxis(mesh.geometry, 0.01 / mesh.getWorldScale(new THREE.Vector3()).x)
      mesh.material = LIMBS.has(mesh.name) ? materials.limbs : materials[part.kind]
      // The anatomical diaphragm folds over itself in the front view; a simplified sheet under the
      // lungs takes its place once the lungs are known (see below).
      if (part.kind === 'diaphragm') {
        mesh.visible = false
        diaphragm = mesh
        return
      }
      // Trachea and bronchi give way to one smooth airway with a clean fork (see `airwayTree`).
      if (mesh.name === 'Bronchi') {
        mesh.visible = false
        return
      }
      if (mesh.name === 'Trachea' && mesh.parent) {
        mesh.visible = false
        let tree = mesh.geometry.userData.tree as THREE.BufferGeometry | undefined
        if (!tree) {
          tree = airwayTree(AIRWAY_BRANCHES, { top: 1.7 })
          tree.applyMatrix4(mesh.parent.matrixWorld.clone().invert())
          mesh.geometry.userData.tree = tree
        }
        const airway = new THREE.Mesh(tree, materials.airway)
        airway.renderOrder = part.order
        airway.userData.lungBack = true
        backs.push([mesh, airway])
        return
      }
      // The nose is part of the airway built above (see `throat`).
      if (mesh.name === 'Nasal_Cavity') {
        mesh.visible = false
        return
      }
      // The skin's depth, drawn just before its colour, so only its nearest surface shows (see `skinDepth`).
      if (part.kind === 'skin') {
        const copy = mesh.clone(false)
        copy.material = materials.skinDepth
        copy.renderOrder = SKIN_ORDER - 0.1
        copy.userData.lungBack = true
        backs.push([mesh, copy])
        const inhale = mesh.morphTargetDictionary?.Inhale
        if (inhale !== undefined) found.push({ mesh: copy, index: inhale, kind: 'breath', gain: BREATH_GAIN[mesh.name] ?? 1 })
        const calmIndex = mesh.morphTargetDictionary?.Calm
        if (calmIndex !== undefined) found.push({ mesh: copy, index: calmIndex, kind: 'calm', gain: 1 })
      }
      mesh.renderOrder = part.order
      const dict = mesh.morphTargetDictionary
      const gain = BREATH_GAIN[mesh.name] ?? BREATH_GAIN[mesh.parent?.name ?? ''] ?? 1
      if (dict?.Inhale !== undefined) found.push({ mesh, index: dict.Inhale, kind: 'breath', gain })
      if (dict?.Beat !== undefined) found.push({ mesh, index: dict.Beat, kind: 'beat', gain: 1 })
      if (dict?.Calm !== undefined) found.push({ mesh, index: dict.Calm, kind: 'calm', gain: 1 })
      // A second copy of each lung draws its far wall: the rings at the back, dimmed.
      if (part.kind === 'lung') {
        lungMeshes.push(mesh)
        const back = mesh.clone(false)
        back.material = materials.lungBack
        back.renderOrder = part.order - 1
        back.userData.lungBack = true
        // And one, seen only by the edge map, marks where this lung lies in front of the other.
        const depth = mesh.clone(false)
        depth.material = /Left/.test(mesh.name + (mesh.parent?.name ?? '')) ? materials.lungEdgeLeft : materials.lungEdgeRight
        depth.layers.set(EDGE_LAYER)
        depth.userData.lungBack = true
        backs.push([mesh, back], [mesh, depth])
        for (const copy of [back, depth]) if (dict?.Inhale !== undefined) found.push({ mesh: copy, index: dict.Inhale, kind: 'breath', gain })
      }
    })
    for (const [src, back] of backs) src.parent?.add(back)
    // After the skin, its depth is cleared: what lies inside the body (lungs, airways, nose) is drawn
    // after it and stays visible, hiding only itself where it should (a lung in front of an airway).
    const clearDepth = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ transparent: true, colorWrite: false, depthWrite: false }))
    clearDepth.renderOrder = SKIN_ORDER + 0.3
    clearDepth.frustumCulled = false
    clearDepth.userData.lungBack = true
    clearDepth.onBeforeRender = (renderer) => {
      // A clear leaves depth untouched while depth writes are off (as after the skin's colour).
      renderer.state.buffers.depth.setMask(true)
      renderer.clearDepth()
    }
    model.add(clearDepth)
    // Narrowing is lost across the traverse callback, hence the explicit type.
    const sheetOwner = diaphragm as THREE.Mesh | null
    if (SHOW_DIAPHRAGM && sheetOwner?.parent && lungMeshes.length) {
      const diaphragmMesh = sheetOwner
      const owner = sheetOwner.parent
      let sheet = diaphragmMesh.geometry.userData.sheet as THREE.BufferGeometry | undefined
      if (!sheet) {
        model.updateMatrixWorld(true)
        const built = simplifiedDiaphragm(lungMeshes.map((l) => ({ geometry: l.geometry, matrixWorld: l.matrixWorld, gain: BREATH_GAIN[l.name] ?? 1 })))
        if (built) sheet = diaphragmMesh.geometry.userData.sheet = intoFrame(built, owner)
      }
      if (sheet) {
        const mesh = new THREE.Mesh(sheet, materials.diaphragm)
        mesh.renderOrder = PARTS.Diaphragm.order
        mesh.userData.lungBack = true
        owner.add(mesh)
        // The lungs' own breath, already at its full strength, is baked into the sheet.
        found.push({ mesh, index: 0, kind: 'breath', gain: 1 })
      }
    }
    morphs.current = found
    const lungs = new THREE.Box3()
    model.updateMatrixWorld(true)
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && /^Lung_/.test(o.name)) lungs.expandByObject(o)
    })
    lungRange.current = lungs.isEmpty() ? null : [lungs.min.y, lungs.max.y]
    if (!lungs.isEmpty()) {
      lungGradient.value.set(lungs.min.y, lungs.max.y)
      const c = lungs.getCenter(new THREE.Vector3())
      const size = lungs.getSize(new THREE.Vector3())
      Object.assign(bed, { y: lungs.min.y - 0.025, x: c.x, z: c.z, rx: size.x * 0.62, rz: size.z * 0.45 })
    }
    return () => Object.values(materials).forEach((m) => m.dispose())
  }, [model, materials])

  useFrame(({ scene, camera }, delta) => {
    const snapshot = engine.sample()
    const b = breathState(snapshot)
    const dt = Math.min(delta, 0.1)
    beat.current = (beat.current + dt / BEAT_S) % 1
    const h = heartbeat(beat.current)
    done.current += ((snapshot.status === 'completed' ? 1 : 0) - done.current) * (1 - Math.exp(-dt / FADE_TAU))
    const d = done.current < 0.001 ? 0 : done.current > 0.999 ? 1 : done.current
    fade.inner.value = 1 - d
    const progress = snapshot.status === 'idle' ? 0 : Math.min(Math.max(snapshot.progress, 0), 1)
    glow.current += (progress - glow.current) * (1 - Math.exp(-dt / SKIN_TAU))
    const rest = REST_SKIN[theme]
    fade.skin.value = (rest + (1 - rest) * glow.current * glow.current * (3 - 2 * glow.current)) * (1 + SKIN_BOOST * d)
    // While they fade the lungs stop hiding what lies behind them, and once gone they are not drawn at all.
    for (const m of [materials.lung, materials.lungBack]) {
      m.depthWrite = d === 0
      m.visible = d < 1
    }
    for (const m of [materials.airway, materials.diaphragm]) m.visible = d < 1
    // The face settles (eyes close, a smile) a little after the lungs have begun to fade.
    const f = Math.min(Math.max((d - 0.3) / 0.7, 0), 1)
    calm.current = f * f * (3 - 2 * f)
    if (lungRange.current) {
      const [lo, hi] = lungRange.current
      level.value = lo + (hi - lo) * (0.04 + 0.98 * b.volume)
    }
    for (const m of morphs.current) {
      const influences = m.mesh.morphTargetInfluences
      if (influences) influences[m.index] = m.kind === 'beat' ? h : m.kind === 'calm' ? calm.current : b.volume * m.gain
    }
    // Edge map for the rim between the lungs, from the same camera as the frame about to be drawn.
    const buffer = gl.getDrawingBufferSize(new THREE.Vector2())
    const w = Math.max(1, buffer.x)
    const hgt = Math.max(1, buffer.y)
    if (edgeTarget.width !== w || edgeTarget.height !== hgt) edgeTarget.setSize(w, hgt)
    edges.size.value.copy(buffer)
    edges.radius.value = EDGE_RIM_PX * gl.getPixelRatio()
    const layers = camera.layers.mask
    const background = scene.background
    const clear = gl.getClearColor(new THREE.Color())
    const clearAlpha = gl.getClearAlpha()
    camera.layers.set(EDGE_LAYER)
    scene.background = null
    gl.setRenderTarget(edgeTarget)
    gl.setClearColor(0x000000, 0)
    gl.clear()
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    gl.setClearColor(clear, clearAlpha)
    scene.background = background
    camera.layers.mask = layers
  })

  return (
    <group>
      <primitive object={model} />
      <BreathSpecks engine={engine} />
      <LungGlow engine={engine} bed={bed} show={fade.inner} />
      <ImpactEffects engine={engine} model={model} lungPulse={lungPulse} />
    </group>
  )
}

useGLTF.preload(MODEL_URL, false, true)
