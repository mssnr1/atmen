import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { BreathingEngine } from '../../engine'
import { useTheme } from '../../lib/theme'
import { breathState } from '../breathState'
import { BreathSpecks } from './BreathSpecks'
import { simplifiedLung } from './lungShape'
import { makeMaterials, type MaterialKind } from './materials'
import { makeStripeMaterials, STRIPE_PALETTES, type EdgeMap } from './stripes'

/** Layer of the lung copies that only draw the edge map. */
const EDGE_LAYER = 5
/** Width of the rim along the edge between the lungs, in CSS pixels (like the outer rim). */
const EDGE_RIM_PX = 18

export const MODEL_URL = `${import.meta.env.BASE_URL}models/atmen-anatomy.glb`

/** Which look and draw order each object of the model gets. */
const PARTS: Record<string, { kind: MaterialKind; order: number }> = {
  Heart: { kind: 'heart', order: 0 },
  // The lungs go first and write depth (back wall at order 1, see below), so the
  // airways and diaphragm drawn after them are hidden where a lung covers them.
  Lung_Left: { kind: 'lung', order: 2 },
  Lung_Right: { kind: 'lung', order: 2 },
  Trachea: { kind: 'airway', order: 3 },
  Bronchi: { kind: 'airway', order: 3 },
  Nasal_Cavity: { kind: 'airway', order: 3 },
  Diaphragm: { kind: 'diaphragm', order: 4 },
  Abdomen: { kind: 'skin', order: 6 },
  Body_Shell: { kind: 'skin', order: 6 },
  Head: { kind: 'skin', order: 6 },
}

/**
 * How much more the breath moves each part than in life, so the motion reads
 * on a phone screen: the chest wall most, lungs, diaphragm and belly with it.
 */
const BREATH_GAIN: Record<string, number> = { Body_Shell: 2.6, Lung_Left: 1.7, Lung_Right: 1.7, Diaphragm: 1.25, Abdomen: 1.7 }

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
export function AnatomyModel({ engine }: { engine: BreathingEngine }) {
  const { scene } = useGLTF(MODEL_URL, false, true)
  const theme = useTheme()
  const level = useMemo(() => ({ value: 99 }), [])
  const { gl } = useThree()
  // Map of how far away the nearest lung surface is, drawn each frame before the scene.
  const edgeTarget = useMemo(() => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true }), [])
  const edges = useMemo<EdgeMap>(() => ({ map: { value: edgeTarget.texture }, size: { value: new THREE.Vector2(1, 1) }, radius: { value: EDGE_RIM_PX } }), [edgeTarget])
  useEffect(() => () => edgeTarget.dispose(), [edgeTarget])
  const lungRange = useRef<[number, number] | null>(null)
  const materials = useMemo(() => {
    // Contour-stripe look: the lungs show the breath by lighting up from the bottom as they fill.
    return { ...makeMaterials(theme), ...makeStripeMaterials(STRIPE_PALETTES[theme], theme === 'dark', level, edges) }
  }, [theme, level, edges])
  const morphs = useRef<{ mesh: THREE.Mesh; index: number; kind: 'breath' | 'beat'; gain: number }[]>([])
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
    model.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const part = PARTS[mesh.name] ?? PARTS[mesh.parent?.name ?? '']
      if (!part) return
      // The heart stays out of the picture so the lungs and diaphragm read clearly.
      if (part.kind === 'heart') {
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
      mesh.material = mesh.name === 'Head' || mesh.parent?.name === 'Head' ? materials.head : materials[part.kind]
      mesh.renderOrder = part.order
      const dict = mesh.morphTargetDictionary
      const gain = BREATH_GAIN[mesh.name] ?? BREATH_GAIN[mesh.parent?.name ?? ''] ?? 1
      if (dict?.Inhale !== undefined) found.push({ mesh, index: dict.Inhale, kind: 'breath', gain })
      if (dict?.Beat !== undefined) found.push({ mesh, index: dict.Beat, kind: 'beat', gain: 1 })
      // A second copy of each lung draws its far wall: the rings at the back, dimmed.
      if (part.kind === 'lung') {
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
    if (lungRange.current) {
      const [lo, hi] = lungRange.current
      level.value = lo + (hi - lo) * (0.04 + 0.98 * b.volume)
    }
    for (const m of morphs.current) {
      const influences = m.mesh.morphTargetInfluences
      if (influences) influences[m.index] = m.kind === 'beat' ? h : b.volume * m.gain
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
