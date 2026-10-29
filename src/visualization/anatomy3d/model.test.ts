import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AIRWAY, makeParticles, particleState, routes, type ParticleState } from './airflow3d'
import type { BreathState } from '../breathState'

/** The JSON chunk of a GLB: enough to check structure without decoding meshes. */
function gltfJson(path: string) {
  const buf = readFileSync(path)
  expect(buf.readUInt32LE(0)).toBe(0x46546c67) // "glTF"
  const len = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + len).toString('utf8'))
}

describe('exported anatomy model', () => {
  const gltf = gltfJson('public/models/atmen-anatomy.glb')
  const meshByNode = Object.fromEntries(
    gltf.nodes.filter((n: { mesh?: number }) => n.mesh !== undefined).map((n: { name: string; mesh: number }) => [n.name, gltf.meshes[n.mesh]]),
  )

  it('keeps every anatomical structure as its own object', () => {
    for (const name of ['Body_Shell', 'Head', 'Nasal_Cavity', 'Trachea', 'Bronchi', 'Lung_Left', 'Lung_Right', 'Heart', 'Diaphragm', 'Abdomen']) {
      expect(meshByNode[name], name).toBeDefined()
    }
  })

  it('has the morph targets the app drives', () => {
    const targets = (name: string) => meshByNode[name].extras?.targetNames
    for (const name of ['Lung_Left', 'Lung_Right', 'Diaphragm', 'Abdomen', 'Body_Shell']) expect(targets(name)).toContain('Inhale')
    expect(targets('Heart')).toContain('Beat')
    expect(meshByNode.Lung_Left.primitives[0].targets.length).toBe(1)
  })

  it('carries its licence and materials', () => {
    expect(gltf.asset.copyright).toMatch(/CC BY-SA 4\.0/)
    expect(gltf.materials.map((m: { name: string }) => m.name).sort()).toEqual(['Airway', 'Diaphragm', 'Heart', 'Lung', 'Skin'])
  })
})

describe('air volume', () => {
  const state = (volume: number, phase: BreathState['phase'] = 'inhale', phaseProgress = volume): BreathState => ({
    volume,
    direction: phase === 'inhale' ? 1 : -1,
    flow: 0.5,
    phaseProgress,
    phase,
    elapsedS: 0,
  })
  const particles = makeParticles(400)
  const sample = (b: BreathState) => particles.map((p) => ({ ...particleState(p, b, 0, { position: [0, 0, 0], alpha: 0, size: 1, used: 0 } as ParticleState) }))
  const nostril = routes[0].points[0]

  it('is all outside before an inhale and all inside the airways and lungs after it', () => {
    const insideAfter = particles.filter((p) => p.b - 0 >= 0).length
    expect(insideAfter).toBe(particles.length)
    expect(particles.every((p) => p.b - 1 <= 0)).toBe(true)
  })

  it('never puts air below the diaphragm', () => {
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      for (const s of sample(state(v))) if (s.alpha > 0) expect(s.position[1]).toBeGreaterThan(1.15)
    }
  })

  it('travels from the nose to the lungs as volume rises', () => {
    const meanY = (v: number) => {
      const vis = sample(state(v)).filter((s) => s.alpha > 0.01)
      return vis.reduce((sum, s) => sum + s.position[1], 0) / vis.length
    }
    expect(meanY(0.2)).toBeGreaterThan(meanY(0.6))
    expect(meanY(0.6)).toBeGreaterThan(meanY(1))
    expect(meanY(0.05)).toBeGreaterThan(nostril[1] - 0.06)
  })

  it('draws no cloud in front of the nose while breathing in, a red one while breathing out', () => {
    const outside = (b: BreathState) => particles.filter((p) => p.b - (1 - b.volume) < 0).map((p) => particleState(p, b, 0, { position: [0, 0, 0], alpha: 0, size: 1, used: 0 }))
    expect(outside(state(0.3, 'inhale', 0.3)).every((s) => s.alpha === 0)).toBe(true)
    const out = outside(state(0.5, 'exhale', 0.5))
    expect(out.some((s) => s.alpha > 0)).toBe(true)
    expect(out.every((s) => s.used === 1)).toBe(true)
  })

  it('gives the airways a share of the route', () => {
    expect(AIRWAY).toBeGreaterThan(0.2)
    expect(AIRWAY).toBeLessThan(0.6)
  })
})
