import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { BreathingEngine } from '../../engine'
import { breathState } from '../breathState'
import { AirVolume } from './AirVolume'
import { makeMaterials, type MaterialKind } from './materials'

export const MODEL_URL = `${import.meta.env.BASE_URL}models/atmen-anatomy.glb`

/** Which look and draw order each object of the model gets. */
const PARTS: Record<string, { kind: MaterialKind; order: number }> = {
  Heart: { kind: 'heart', order: 0 },
  Trachea: { kind: 'airway', order: 1 },
  Bronchi: { kind: 'airway', order: 1 },
  Nasal_Cavity: { kind: 'airway', order: 1 },
  Diaphragm: { kind: 'diaphragm', order: 2 },
  Lung_Left: { kind: 'lung', order: 4 },
  Lung_Right: { kind: 'lung', order: 4 },
  Abdomen: { kind: 'skin', order: 6 },
  Body_Shell: { kind: 'skin', order: 6 },
  Head: { kind: 'skin', order: 6 },
}

/**
 * How much more the breath moves each part than in life, so the motion reads
 * on a phone screen: the chest wall most, lungs, diaphragm and belly with it.
 */
const BREATH_GAIN: Record<string, number> = { Body_Shell: 2.6, Lung_Left: 1.7, Lung_Right: 1.7, Diaphragm: 1.7, Abdomen: 1.7 }

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
  const materials = useMemo(() => makeMaterials(), [])
  const morphs = useRef<{ mesh: THREE.Mesh; index: number; kind: 'breath' | 'beat'; gain: number }[]>([])
  const drift = useRef(0)
  const beat = useRef(0)

  const model = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    const found: typeof morphs.current = []
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
      mesh.material = materials[part.kind]
      mesh.renderOrder = part.order
      const dict = mesh.morphTargetDictionary
      if (dict?.Inhale !== undefined) found.push({ mesh, index: dict.Inhale, kind: 'breath', gain: BREATH_GAIN[mesh.name] ?? BREATH_GAIN[mesh.parent?.name ?? ''] ?? 1 })
      if (dict?.Beat !== undefined) found.push({ mesh, index: dict.Beat, kind: 'beat', gain: 1 })
    })
    morphs.current = found
    return () => Object.values(materials).forEach((m) => m.dispose())
  }, [model, materials])

  useFrame((_, delta) => {
    const snapshot = engine.sample()
    const b = breathState(snapshot)
    const dt = Math.min(delta, 0.1)
    if (snapshot.status !== 'paused') drift.current += dt
    beat.current = (beat.current + dt / BEAT_S) % 1
    const h = heartbeat(beat.current)
    for (const m of morphs.current) {
      const influences = m.mesh.morphTargetInfluences
      if (influences) influences[m.index] = m.kind === 'beat' ? h : b.volume * m.gain
    }
  })

  return (
    <group>
      <primitive object={model} />
      <AirVolume engine={engine} drift={drift} />
    </group>
  )
}

useGLTF.preload(MODEL_URL, false, true)
