import * as THREE from 'three'
import { airwaySurface } from './airwayShape'
import { addCalmMorph } from './face'
import { withHolesFilled } from './holes'
import { addLimbAxis } from './limbs'
import { simplifiedLung } from './lungShape'

/**
 * The shapes the figure is drawn with are worked out from the model: each lung as a smooth shell, the
 * head closed over its eyes and lips, the limbs with their axes, the airway as one surface. Each is
 * made once and kept with the model's own geometry, which every copy of the model shares: a scene that
 * is built anew (the graphics were taken away and given back) finds them ready.
 */

/**
 * A lung as a simplified smooth body, without its lobes, borders and notches, so its contour lines run
 * calm and even. `gain` is how much the breath is exaggerated when drawn (the shell stays off the
 * body's midline at that strength too).
 */
export function smoothLung(lung: THREE.Mesh, gain: number): THREE.BufferGeometry {
  const source = lung.geometry
  if (source.userData.simplified) return source
  let shell = source.userData.shell as THREE.BufferGeometry | null | undefined
  if (shell === undefined) {
    const at = lung.getWorldPosition(new THREE.Vector3())
    const scale = lung.getWorldScale(new THREE.Vector3()).x
    const side = Math.sign(at.x) || 1
    // Body midline at world x = 0; keep 3 mm off it, flattening over about 3 cm.
    shell = simplifiedLung(source, { midline: { x: -at.x / scale, side, gap: 0.003 / scale, soft: 0.03 / scale, gain } })
    if (shell) shell.userData.simplified = true
    source.userData.shell = shell
  }
  return shell ?? source
}

/** The head closed over its eyes, brows and lips, so the lines run on across them, with the calm face it can settle into. */
export function closedHead(head: THREE.Mesh): THREE.BufferGeometry {
  const source = head.geometry
  if (source.userData.holesFilled) return source
  let closed = source.userData.closed as THREE.BufferGeometry | null | undefined
  if (closed === undefined) {
    closed = withHolesFilled(source, head.getWorldScale(new THREE.Vector3()).x)
    if (closed) {
      closed.userData.holesFilled = true
      addCalmMorph(closed, head.matrixWorld)
    }
    source.userData.closed = closed
  }
  return closed ?? source
}

/** Gives an arm or leg mesh the axis its skin lines run round (see `addLimbAxis`). */
export function limbAxis(limb: THREE.Mesh): void {
  if (!limb.geometry.getAttribute('axis')) addLimbAxis(limb.geometry, 0.01 / limb.getWorldScale(new THREE.Vector3()).x)
}

/**
 * Trachea and bronchi give way to one smooth airway with a clean fork (see `airwayTree`): its surface,
 * in the frame the model's trachea hangs in.
 */
export function airwayFor(trachea: THREE.Mesh): THREE.BufferGeometry | null {
  if (!trachea.parent) return null
  let tree = trachea.geometry.userData.tree as THREE.BufferGeometry | undefined
  if (!tree) {
    trachea.parent.updateWorldMatrix(true, false)
    tree = airwaySurface()
    tree.applyMatrix4(trachea.parent.matrixWorld.clone().invert())
    trachea.geometry.userData.tree = tree
  }
  return tree
}

/** Long enough for the page to draw a frame; where no frames are drawn (in the background), a short wait. */
const breather = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => window.setTimeout(resolve, 0))
    window.setTimeout(resolve, 150)
  })

/**
 * Does the jobs one after the other with a pause after each. Together the figure's shapes are a few
 * hundred milliseconds of work: in one go the page would stand still that long, and something that
 * follows a finger meanwhile (the first breath) would stop. A job that fails is left to whoever needs
 * its result: there it fails again, where the failure is caught.
 */
export async function inTurns(jobs: (() => void)[]): Promise<void> {
  for (const job of jobs) {
    await breather()
    try {
      job()
    } catch {
      // See above.
    }
  }
}
