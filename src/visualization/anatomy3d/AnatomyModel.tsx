import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useTheme } from '../../lib/theme'
import { breathState, type BreathSource } from '../breathState'
import { intoFrame, simplifiedDiaphragm } from './diaphragmShape'
import { airwayTree, type Branch } from './airwayTree'
import { BreathSpecks } from './BreathSpecks'
import { addCalmMorph } from './face'
import { withHolesFilled } from './holes'
import { simplifiedLung } from './lungShape'
import { makeMaterials, type MaterialKind } from './materials'
import { makeStripeMaterials, STRIPE_PALETTES, type EdgeMap, type Fade } from './stripes'

/** Layer of the lung copies that only draw the edge map. */
const EDGE_LAYER = 5
/** Width of the rim along the edge between the lungs, in CSS pixels (like the outer rim). */
const EDGE_RIM_PX = 18
/** Seconds the lungs take to fade out (and the skin to brighten) after the exercise; about three times this until it settles. */
const FADE_TAU = 1.1
/** How much more the skin shows once the lungs have faded out. */
const SKIN_BOOST = 0.1

export const MODEL_URL = `${import.meta.env.BASE_URL}models/atmen-anatomy.glb`

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
  Abdomen: { kind: 'skin', order: 6 },
  // Its far wall goes before the neck and the head (which write depth), so they hide none of it.
  Body_Shell: { kind: 'skin', order: 2.3 },
  // Right after the neck (2.4, see below); it writes depth and hides what lies inside or behind it (see `head` in stripes.ts).
  Head: { kind: 'skin', order: 2.5 },
}

/**
 * How much more the breath moves each part than in life, so the motion reads
 * on a phone screen: the chest wall most, lungs, diaphragm and belly with it.
 */
/**
 * Whether the simplified diaphragm sheet under the lungs is drawn. Off for now: its motion did not
 * show how it pulls the lungs down, so only the lungs breathe. Set to true to bring it back.
 */
const SHOW_DIAPHRAGM = false

const BREATH_GAIN: Record<string, number> = { Body_Shell: 2.6, Lung_Left: 1.7, Lung_Right: 1.7, Diaphragm: 1.25, Abdomen: 1.7 }

/**
 * Windpipe and main bronchi, drawn as one smooth piece instead of the model's
 * separate, overlapping trachea and bronchi (world metres, along the model's
 * airway; the bronchi end inside the lungs, which hide their ends).
 */
const AIRWAY_TOP = 1.4606
/** Below this height the model's throat (mouth and lower pharynx) is left out; the nose above stays. */
const NOSE_FLOOR = 1.552
/** Behind this depth (world z) the upper throat (nasopharynx, wider than the nose, with side flaps) is left out too. */
const NOSE_BACK = 0.047
const CARINA: [number, number, number] = [-0.0005, 1.362, -0.013]
const AIRWAY_BRANCHES: Branch[] = [
  { points: [[0, AIRWAY_TOP + 0.004, 0.01], [-0.0004, 1.4257, 0.005], [-0.0004, 1.3904, -0.0033], CARINA], r0: 0.0105, r1: 0.0095 },
  // Up the back of the throat into the back of the nose, so nose and windpipe join without mouth or throat.
  { points: [[0, AIRWAY_TOP + 0.004, 0.01], [0, 1.483, 0.02], [0, 1.53, 0.03], [0, 1.56, 0.042], [0, 1.566, 0.056]], r0: 0.0105, r1: 0.008 },
  { points: [CARINA, [0.027, 1.335, -0.018], [0.044, 1.321, -0.021], [0.062, 1.306, -0.02]], r0: 0.0078, r1: 0.0058 },
  { points: [CARINA, [-0.014, 1.348, -0.017], [-0.031, 1.318, -0.021], [-0.044, 1.297, -0.026]], r0: 0.0078, r1: 0.0058 },
]

/** The geometry with only the triangles whose centre lies above `floor` (world height) and in front of `back` (world z). */
function noseOnly(geometry: THREE.BufferGeometry, world: THREE.Matrix4, floor: number, back: number): THREE.BufferGeometry {
  const out = geometry.clone()
  const index = geometry.index
  const pos = geometry.attributes.position
  if (!index) return out
  const v = new THREE.Vector3()
  const keep: number[] = []
  for (let i = 0; i < index.count; i += 3) {
    let y = 0
    let z = 0
    for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(pos, index.getX(i + k)).applyMatrix4(world)
      y += v.y / 3
      z += v.z / 3
    }
    if (y > floor && z > back) keep.push(index.getX(i), index.getX(i + 1), index.getX(i + 2))
  }
  out.setIndex(keep)
  return out
}

/** A heartbeat shape over one beat (0..1): a strong contraction, then a smaller one. */
export function heartbeat(phase: number): number {
  const g = (c: number, w: number) => Math.exp(-(((phase - c) / w) ** 2))
  return Math.min(1, g(0.12, 0.07) + 0.45 * g(0.36, 0.08))
}

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
  const fade = useMemo<Fade>(() => ({ inner: { value: 1 }, skin: { value: 1 } }), [])
  const materials = useMemo(() => {
    // Contour-stripe look: the lungs show the breath by lighting up from the bottom as they fill.
    return { ...makeMaterials(theme), ...makeStripeMaterials(STRIPE_PALETTES[theme], theme === 'dark', level, edges, fade) }
  }, [theme, level, edges, fade])
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
      mesh.material = mesh.name === 'Head' ? materials.head : materials[part.kind]
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
      // Of the nose and throat only the nose is drawn: the mouth and throat below its floor and the
      // upper throat behind it are left out, and the airway tube above runs up to meet its back.
      if (mesh.name === 'Nasal_Cavity' && !mesh.geometry.userData.noseOnly) {
        mesh.geometry = noseOnly(mesh.geometry, mesh.matrixWorld, NOSE_FLOOR, NOSE_BACK)
        mesh.geometry.userData.noseOnly = true
      }
      // Second copies: the inner wall of the head (filling the gaps under the jaw) and the near wall of the neck.
      if (mesh.name === 'Head' || mesh.name === 'Body_Shell') {
        const copy = mesh.clone(false)
        copy.material = mesh.name === 'Head' ? materials.headInner : materials.skinNeck
        // The neck just before the head, so each hides what of the other lies behind it; the head's inner
        // wall after everything else, so it shows only where neither covers it.
        copy.renderOrder = mesh.name === 'Head' ? 6.2 : 2.4
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
    fade.skin.value = 1 + SKIN_BOOST * d
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
    </group>
  )
}

useGLTF.preload(MODEL_URL, false, true)
