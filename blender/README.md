# Anatomy model

The 3D body in the Anatomical view is built from the open Z-Anatomy atlas with
Blender, by script, so it can be rebuilt and changed.

| File | What it is |
| --- | --- |
| `build_anatomy.py` | Extracts, cleans and simplifies the structures, adds the breathing shape keys and exports `.blend`, `.glb` and the airway paths |
| `render_preview.py` | Renders a still in the inhaled pose |
| `atmen-anatomy.blend` | Editable Blender scene (output of the build) |
| `preview.png` | Preview render |
| `../public/models/atmen-anatomy.glb` | Model used by the app (meshopt-compressed) |
| `../src/visualization/anatomy3d/airway-paths.json` | Centre lines from nose to lungs and points inside the lungs, used by the air volume |

## Source and licence

- **Z-Anatomy – The libre 3D atlas of anatomy**, CC BY-SA 4.0,
  <https://github.com/Z-Anatomy/Models-of-human-anatomy> (`Z-Anatomy.zip` → `Startup.blend`).
- Its models derive from **BodyParts3D, © The Database Center for Life Science**, CC BY-SA 2.1 Japan,
  <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/>.

Only BodyParts3D/Z-Anatomy geometry is used: skin regions of head, neck and
trunk, nasal mucosa and pharynx, trachea, the five lung lobes, the four heart
chambers and the diaphragm. The bronchi are tubes along the template's
bronchus centre lines. Parts of the template under other licences (the
NC-licensed inner ear and kidney, the University of Washington brain models),
the Wikipedia definitions (texts), fonts and images are not used and are
removed from the saved `.blend`.

**The adapted model (`atmen-anatomy.blend`, `atmen-anatomy.glb`,
`airway-paths.json`) is licensed under CC BY-SA 4.0** and must be credited as:

> Anatomy adapted from “Z-Anatomy – The libre 3D atlas of anatomy” (CC BY-SA 4.0)
> and “BodyParts3D, © The Database Center for Life Science” (CC BY-SA 2.1 Japan).
> Changes: selection, simplification, materials, breathing shape keys.

Anyone who redistributes it, changed or not, must keep this credit and share
it under CC BY-SA 4.0. The app shows the credit under Settings → Sources and
licences. The app's own code is not affected by this licence.

## Objects and shape keys

All objects are children of the empty `Anatomy`, positioned anatomically in
metres (Blender Z up; the glTF is Y up).

| Object | Shape key | Driven by |
| --- | --- | --- |
| `Lung_Left`, `Lung_Right` | `Inhale`: expand in 3D, mostly lower and lateral | lung volume 0–1 |
| `Diaphragm` | `Inhale`: dome flattens and moves down | lung volume |
| `Abdomen` | `Inhale`: belly wall moves out, edges fixed | lung volume |
| `Body_Shell` | `Inhale`: chest fills out all round (most at the front), shoulders lift and spread | lung volume |
| `Heart` | `Beat`: ventricles contract, atria fill | its own illustrative rhythm (not the user's pulse) |
| `Head`, `Nasal_Cavity`, `Trachea`, `Bronchi` | – | – |

In three.js the keys are `mesh.morphTargetDictionary.Inhale` / `.Beat`; the app
sets `morphTargetInfluences` every frame from the breathing engine.

Budget: about 80k triangles in total, 2 MB uncompressed, under 0.5 MB with meshopt.

## Rebuild

```bash
pip install bpy                       # Blender 5.x as a Python module, or use a Blender install
unzip Z-Anatomy.zip Z-Anatomy/Startup.blend
python -I blender/build_anatomy.py Z-Anatomy/Startup.blend build/
npx @gltf-transform/cli meshopt build/atmen-anatomy.glb public/models/atmen-anatomy.glb
cp build/airway-paths.json src/visualization/anatomy3d/
cp build/atmen-anatomy.blend blender/
python -I blender/render_preview.py blender/atmen-anatomy.blend blender/preview.png
```

The build takes about four minutes on a laptop CPU.
