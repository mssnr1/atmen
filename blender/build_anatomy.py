"""
Builds the atmen breathing anatomy from the Z-Anatomy Blender template.

Run headless with Blender 5.x (or the `bpy` Python module):

    blender -b -P blender/build_anatomy.py -- <Startup.blend> <out_dir>
    python -I blender/build_anatomy.py <Startup.blend> <out_dir>

`Startup.blend` is inside `Z-Anatomy.zip` from
https://github.com/Z-Anatomy/Models-of-human-anatomy (CC BY-SA 4.0, models
derived from BodyParts3D, CC BY-SA 2.1 Japan). Only BodyParts3D/Z-Anatomy
geometry is used; the NC-licensed parts of the template (inner ear, kidney)
are never touched.

Output in <out_dir>:
    atmen-anatomy.blend   editable scene with the prepared objects
    atmen-anatomy.glb     mesh hierarchy, materials and morph targets for three.js

Objects (all children of the empty `Anatomy`):
    Body_Shell, Head, Abdomen        skin, split so the belly can move on its own
    Nasal_Cavity                     nasal mucosa and pharynx (upper airway)
    Trachea, Bronchi                 trachea mesh and main/lobar bronchi
    Lung_Left, Lung_Right            lobes joined per side
    Heart                            atria and ventricles
    Diaphragm

Morph targets (shape keys), all 0 = resting/exhaled:
    Lung_*.Inhale        3D expansion, mostly lower and lateral
    Diaphragm.Inhale     dome flattens and descends
    Abdomen.Inhale       belly wall moves out, edges stay put
    Body_Shell.Inhale    whole upper body fills out, shoulders lift, seamless with the belly
    Heart.Beat           ventricles contract, atria fill
"""

import math
import os
import sys

import bpy  # first: bmesh and mathutils come with it when run as a module
import bmesh
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
SOURCE, OUT = argv[0], argv[1]
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=SOURCE, load_ui=False)
src = bpy.data.objects

# ---------------------------------------------------------------- selection

LUNG_LEFT = ["Superior lobe of left lung", "Inferior lobe of left lung"]
LUNG_RIGHT = ["Superior lobe of right lung", "Middle lobe of right lung", "Inferior lobe of right lung"]
HEART = ["Left ventricle", "Right ventricle", "Left atrium", "Right atrium"]
NASAL = ["Mucosa of nasal cavity", "Nasopharynx", "Oropharynx", "Laryngopharynx"]
# Skin regions of the front belly wall: they form the Abdomen object.
ABDOMEN = ["Epigastric region", "Umbilical region", "Hypochondriac region", "Lateral region of abdomen", "Inframammary region"]
# Skin regions never wanted: limbs below the shoulder, hair, lashes.
SKIP_SKIN = ["arm", "elbow", "forearm", "Cubital", "bicipital", "Hairs", "Eyelashes", "Eyebrow", "wrist", "hand"]

LOW_CUT = 0.975  # metres: the skin ends just below the navel


def in_collection(o, name):
    return any(c.name == name for c in o.users_collection)


def skin_regions():
    picked = {"Head": [], "Abdomen": [], "Body_Shell": []}
    for o in src:
        if o.type != "MESH" or len(o.data.vertices) <= 10 or not in_collection(o, "9: Regions of human body"):
            continue
        if any(s.lower() in o.name.lower() for s in SKIP_SKIN):
            continue
        zs = [(o.matrix_world @ Vector(c)).z for c in o.bound_box]
        if max(zs) < LOW_CUT + 0.02:
            continue
        base = o.name.rsplit(".", 1)[0]
        if base in ABDOMEN:
            picked["Abdomen"].append(o)
        elif in_collection(o, "Head"):
            picked["Head"].append(o)
        else:
            picked["Body_Shell"].append(o)
    return picked


# ------------------------------------------------------------- mesh helpers


def bake(objects, name, subdiv=0, keep_mirror=True):
    """Evaluated copies of `objects` (modifiers applied as chosen) joined into one new mesh object."""
    bm = bmesh.new()
    deps = bpy.context.evaluated_depsgraph_get()
    for o in objects:
        saved = []
        for m in o.modifiers:
            want = (m.type == "MIRROR" and keep_mirror) or (m.type == "SUBSURF" and subdiv > 0)
            saved.append((m, m.show_viewport))
            m.show_viewport = want
            if m.type == "SUBSURF":
                m.levels = subdiv
        deps.update()
        if o.type == "CURVE":
            ev = o.evaluated_get(deps)
            me = bpy.data.meshes.new_from_object(ev, depsgraph=deps)
        else:
            me = bpy.data.meshes.new_from_object(o.evaluated_get(deps), depsgraph=deps)
        me.transform(o.matrix_world)
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
        for m, v in saved:
            m.show_viewport = v
    # Template objects already use our names; take a working name and rename at the end.
    mesh = bpy.data.meshes.new("atmen_" + name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("atmen_" + name, mesh)
    # Linked so the depsgraph evaluates its modifiers (subdivide, decimate).
    bpy.context.scene.collection.objects.link(obj)
    return obj


def clean(obj, merge=0.0004, subdivide=0, target_faces=None):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=merge)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-6)
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    if subdivide:
        m = obj.modifiers.new("sub", "SUBSURF")
        m.levels = subdivide
        apply_modifiers(obj)
    if target_faces and len(obj.data.polygons) > target_faces:
        m = obj.modifiers.new("dec", "DECIMATE")
        m.ratio = target_faces / len(obj.data.polygons)
        m.use_collapse_triangulate = True
        apply_modifiers(obj)
    for p in obj.data.polygons:
        p.use_smooth = True


def apply_modifiers(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(deps), depsgraph=deps)
    obj.modifiers.clear()
    old = obj.data
    obj.data = me
    bpy.data.meshes.remove(old)


def cut_below(obj, z):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_inner=True)
    bm.to_mesh(obj.data)
    bm.free()


def set_origin_to_center(obj):
    me = obj.data
    c = sum((v.co for v in me.vertices), Vector()) / max(1, len(me.vertices))
    me.transform(Matrix.Translation(-c))
    obj.location = c


# ---------------------------------------------------------------- materials


def material(name, color, alpha, roughness=0.5, emission=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Alpha"].default_value = alpha
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    m.surface_render_method = "BLENDED" if alpha < 1 else "DITHERED"
    return m


def srgb(hex_):
    h = hex_.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


MATS = {
    "Skin": material("Skin", srgb("#eef1f6"), 0.18, 0.7),
    "Lung": material("Lung", srgb("#7fa8f8"), 0.42, 0.45),
    "Airway": material("Airway", srgb("#3d7bff"), 0.85, 0.3, emission=srgb("#5b8fff"), strength=1.5),
    "Heart": material("Heart", srgb("#f0806f"), 0.95, 0.45),
    "Diaphragm": material("Diaphragm", srgb("#f4b49a"), 0.85, 0.55),
}


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(MATS[mat])


# -------------------------------------------------------------- shape keys


def smoothstep(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def add_key(obj, name, displace):
    """Basis plus one shape key whose vertices are moved by `displace(co, i)`."""
    if not obj.data.shape_keys:
        obj.shape_key_add(name="Basis", from_mix=False)
    key = obj.shape_key_add(name=name, from_mix=False)
    for i, v in enumerate(obj.data.vertices):
        key.data[i].co = v.co + displace(v.co, i)
    return key


def bounds(obj):
    vs = [v.co for v in obj.data.vertices]
    return Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))), Vector(
        (max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs))
    )


def lung_inhale(obj):
    """The lungs follow the chest wall all round (they cling to it through the
    pleura) and the diaphragm below, so they grow everywhere, most at the base."""
    lo, hi = bounds(obj)
    c = (lo + hi) / 2
    h = hi.z - lo.z

    def d(co, _):
        low = 1 - smoothstep(lo.z, hi.z, co.z)  # 1 at the base, 0 at the apex
        w = 0.65 + 0.35 * low
        lateral = (co.x - c.x) / ((hi.x - lo.x) / 2)
        front = (co.y - c.y) / ((hi.y - lo.y) / 2)
        rise = 0.03 * h * (1 - low) ** 2  # the apex lifts a little with the upper ribs
        return Vector((0.15 * w * lateral * (hi.x - lo.x) / 2, 0.14 * w * front * (hi.y - lo.y) / 2, -0.15 * h * low**1.5 + rise))

    add_key(obj, "Inhale", d)


def diaphragm_inhale(obj):
    lo, hi = bounds(obj)

    def d(co, _):
        dome = smoothstep(lo.z, hi.z, co.z)  # dome top 1, rib attachments 0
        return Vector((0, 0, -0.034 * dome**1.3 - 0.004 * dome))

    add_key(obj, "Inhale", d)


def boundary_falloff(obj, width):
    """Per vertex 0 at open edges of the mesh, rising to 1 at `width` metres inside."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    edge_vs = [v.co.copy() for v in bm.verts if any(e.is_boundary for e in v.link_edges)]
    bm.free()
    out = []
    for v in obj.data.vertices:
        dmin = min(((v.co - e).length for e in edge_vs), default=width)
        out.append(smoothstep(0, width, dmin))
    return out


def abdomen_inhale(obj):
    lo, hi = bounds(obj)
    fall = boundary_falloff(obj, 0.04)
    cx = (lo.x + hi.x) / 2

    def d(co, i):
        front = smoothstep(hi.y, lo.y, co.y)  # front of the belly moves most
        mid = 1 - min(1, abs(co.x - cx) / ((hi.x - lo.x) / 2)) ** 2
        return Vector((0, -0.012 * fall[i] * front * mid, 0))

    add_key(obj, "Inhale", d)


def body_inhale(obj):
    """The whole upper body fills out: the rib cage widens all round, most at
    the front, and the shoulders lift and spread a little with it."""
    fall = boundary_falloff(obj, 0.04)
    # Mesh coordinates are local to the object; heights below are world heights.
    m = obj.matrix_world
    world = [m @ v.co for v in obj.data.vertices]
    band_ys = [w.y for w in world if 1.15 < w.z < 1.4]
    yc = (min(band_ys) + max(band_ys)) / 2

    def d(_, i):
        w = world[i]
        trunk = smoothstep(1.02, 1.16, w.z) * (1 - smoothstep(1.5, 1.58, w.z))
        shoulder = smoothstep(1.36, 1.48, w.z)
        out = Vector((w.x, w.y - yc, 0))
        if out.length > 1e-6:
            out.normalize()
        front = 0.6 + 0.6 * smoothstep(yc + 0.03, yc - 0.06, w.y)  # front of the chest is -Y
        f = trunk * fall[i]
        grow = out * (0.008 * front * (1 - 0.4 * shoulder))
        return (grow + Vector((0, 0, 0.002 + 0.004 * shoulder))) * f

    add_key(obj, "Inhale", d)


def heart_beat(obj):
    lo, hi = bounds(obj)
    c = (lo + hi) / 2

    def d(co, _):
        r = co - c
        apex = 1 - smoothstep(lo.z, hi.z, co.z)  # ventricles sit low
        return r * (-0.07 * apex + 0.025 * (1 - apex))

    add_key(obj, "Beat", d)


# ------------------------------------------------------------------- build

parts = {}

regions = skin_regions()
for name, objs in regions.items():
    print(name, len(objs), "skin regions")
    o = bake(objs, name)
    clean(o, merge=0.0012, subdivide=1)
    if name != "Head":
        cut_below(o, LOW_CUT)
    clean(o, target_faces={"Body_Shell": 9000, "Head": 7000, "Abdomen": 2500}[name])
    assign(o, "Skin")
    parts[name] = o

parts["Nasal_Cavity"] = bake([src[n] for n in NASAL], "Nasal_Cavity", subdiv=1)
clean(parts["Nasal_Cavity"], target_faces=2500)
assign(parts["Nasal_Cavity"], "Airway")

parts["Trachea"] = bake([src["Trachea"]], "Trachea")
clean(parts["Trachea"], target_faces=1800)
assign(parts["Trachea"], "Airway")

# The template has the bronchi only as thin label curves. Their centre lines
# become the route of the air and, as tubes of airway calibre, the Bronchi mesh.


def bronchus_chains():
    tr = src["Trachea"]
    ws = [tr.matrix_world @ v.co for v in tr.data.vertices]
    zb = min(w.z for w in ws)
    carina = sum((w for w in ws if w.z < zb + 0.006), Vector()) / max(1, len([w for w in ws if w.z < zb + 0.006]))

    def polyline(name):
        sp = src[name].data.splines[0]  # the first spline is the bronchus itself
        pts = [src[name].matrix_world @ p.co.to_3d() for p in (list(sp.bezier_points) or list(sp.points))]
        return pts

    def chain(main, lobar):
        m = polyline(main)
        if (m[0] - carina).length > (m[-1] - carina).length:
            m.reverse()
        lb = polyline(lobar)
        if (lb[0] - m[-1]).length > (lb[-1] - m[-1]).length:
            lb.reverse()
        out = []
        for p in m + lb:
            if not out or (out[-1] - p).length > 1e-4:
                out.append(p)
        return out

    return {
        "left_upper": chain("Left main bronchus", "Left superior lobar bronchus"),
        "left_lower": chain("Left main bronchus", "Left inferior lobar bronchus"),
        "right_upper": chain("Right main bronchus", "Right superior lobar bronchus"),
        "right_lower": chain("Right main bronchus", "Right inferior lobar bronchus"),
    }


CHAINS = bronchus_chains()
cu = bpy.data.curves.new("atmen_bronchi", "CURVE")
cu.dimensions = "3D"
cu.bevel_depth = 0.0056
cu.bevel_resolution = 3
cu.use_fill_caps = True
for pts in CHAINS.values():
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1)
        # Main bronchi are wider than the lobar ones; taper along the chain.
        sp.points[i].radius = 1.0 - 0.4 * i / max(1, len(pts) - 1)
    sp.use_smooth = True
bronchi_curve = bpy.data.objects.new("atmen_bronchi_curve", cu)
bpy.context.scene.collection.objects.link(bronchi_curve)
parts["Bronchi"] = bake([bronchi_curve], "Bronchi")
bpy.data.objects.remove(bronchi_curve)
clean(parts["Bronchi"], merge=0.0002, subdivide=1, target_faces=3000)
assign(parts["Bronchi"], "Airway")

parts["Lung_Left"] = bake([src[n] for n in LUNG_LEFT], "Lung_Left", subdiv=1)
parts["Lung_Right"] = bake([src[n] for n in LUNG_RIGHT], "Lung_Right", subdiv=1)
for n in ("Lung_Left", "Lung_Right"):
    clean(parts[n], target_faces=4500)
    assign(parts[n], "Lung")

parts["Heart"] = bake([src[n] for n in HEART], "Heart", subdiv=1)
clean(parts["Heart"], merge=0.0008, target_faces=4000)
assign(parts["Heart"], "Heart")

parts["Diaphragm"] = bake([src["Diaphragm"]], "Diaphragm", subdiv=1)
clean(parts["Diaphragm"], target_faces=4000)
assign(parts["Diaphragm"], "Diaphragm")

# ------------------------------------------------------------ airway paths


def gl(v):
    """Blender Z-up world position to glTF/three.js Y-up."""
    return [round(v.x, 5), round(v.z, 5), round(-v.y, 5)]


def lung_points(obj, n, rng):
    """
    `n` points spread evenly through the whole volume of a lung, so the air can
    fill it out to its edges, plus its centre. A point is inside when a ray
    from it crosses the surface an odd number of times.
    """
    from mathutils.bvhtree import BVHTree

    mw = obj.matrix_world
    vs = [mw @ v.co for v in obj.data.vertices]
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.transform(mw)
    tree = BVHTree.FromBMesh(bm)
    bm.free()
    lo = Vector([min(v[i] for v in vs) for i in range(3)])
    hi = Vector([max(v[i] for v in vs) for i in range(3)])

    def inside(p):
        hits, o, d = 0, p.copy(), Vector((0.31, 0.17, 0.94)).normalized()
        while True:
            loc, _, _, _ = tree.ray_cast(o, d)
            if loc is None:
                return hits % 2 == 1
            hits += 1
            o = loc + d * 1e-5

    pts = []
    while len(pts) < n:
        p = Vector([rng.uniform(lo[i], hi[i]) for i in range(3)])
        if inside(p):
            pts.append(p)
    c = sum(pts, Vector()) / len(pts)
    return [gl(p) for p in pts], gl(c)


def airway_paths():
    """
    Centre lines the app moves the air volume along, plus points inside each
    lung for the air to spread to. Taken from the same source geometry.
    """
    import random

    random.seed(7)
    tr = parts["Trachea"]
    ws = [tr.matrix_world @ v.co for v in tr.data.vertices]
    z0, z1 = min(w.z for w in ws), max(w.z for w in ws)
    trachea = []
    for k in range(7):
        z = z1 - (z1 - z0) * k / 6
        ring = [w for w in ws if abs(w.z - z) < 0.006] or ws
        trachea.append(sum(ring, Vector()) / len(ring))

    def center(names):
        pts = [src[n].matrix_world @ Vector(c) for n in names for c in src[n].bound_box]
        return sum(pts, Vector()) / len(pts)

    nasal = center(["Mucosa of nasal cavity"])
    nose_tip = max((src[n].matrix_world @ v.co for n in ("Nasal region.l", "Nasal region.r") for v in src[n].data.vertices), key=lambda w: -w.y)
    nostril = Vector((0, nose_tip.y + 0.012, nose_tip.z - 0.012))
    upper = [
        Vector((0, nostril.y - 0.07, nostril.z - 0.02)),  # outside, in front of the nose
        nostril,
        Vector((0, nasal.y - 0.01, nasal.z - 0.006)),
        Vector((0, center(["Nasopharynx"]).y + 0.004, center(["Nasopharynx"]).z)),
        Vector((0, center(["Oropharynx"]).y + 0.012, center(["Oropharynx"]).z)),
        Vector((0, center(["Laryngopharynx"]).y - 0.004, center(["Laryngopharynx"]).z)),
    ]
    branches = {k: [gl(p) for p in v] for k, v in CHAINS.items()}

    left_pts, left_c = lung_points(parts["Lung_Left"], 900, random)
    right_pts, right_c = lung_points(parts["Lung_Right"], 900, random)
    return {
        "note": "Generated by blender/build_anatomy.py from Z-Anatomy geometry. glTF coordinates (Y up, metres).",
        "trunk": [gl(p) for p in upper] + [gl(p) for p in trachea],
        "branches": branches,
        "lungs": {"left": {"center": left_c, "points": left_pts}, "right": {"center": right_c, "points": right_pts}},
    }


# ---------------------------------------------------------- new clean scene

# Empty the template's scene and keep only the prepared objects.
scene = bpy.context.scene
for c in list(scene.collection.children):
    scene.collection.children.unlink(c)
for o in list(scene.collection.objects):
    scene.collection.objects.unlink(o)
for s in list(bpy.data.scenes):
    if s != scene:
        bpy.data.scenes.remove(s)
root = bpy.data.objects.new("Anatomy", None)
scene.collection.objects.link(root)
for o in parts.values():
    scene.collection.objects.link(o)
    o.parent = root
    set_origin_to_center(o)

import json

bpy.context.view_layer.update()  # matrix_world reflects the new origins
with open(os.path.join(OUT, "airway-paths.json"), "w") as f:
    json.dump(airway_paths(), f)

for n in ("Lung_Left", "Lung_Right"):
    lung_inhale(parts[n])
diaphragm_inhale(parts["Diaphragm"])
abdomen_inhale(parts["Abdomen"])
body_inhale(parts["Body_Shell"])
heart_beat(parts["Heart"])

# Drop all template data no longer used, so the saved .blend holds only our scene.
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)
keep = set(parts.values()) | {root}
for o in list(bpy.data.objects):
    if o not in keep:
        bpy.data.objects.remove(o)
# Also the template's definitions (Wikipedia texts), fonts, images, script and
# materials, none of which the model uses.
for t in list(bpy.data.texts):
    bpy.data.texts.remove(t)
for i in list(bpy.data.images):
    bpy.data.images.remove(i)
for m in list(bpy.data.materials):
    if m not in MATS.values():
        bpy.data.materials.remove(m)
for f in list(bpy.data.fonts):
    bpy.data.fonts.remove(f)
bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
for name, o in parts.items():
    o.name = name
    o.data.name = name
for name, m in MATS.items():
    m.name = name

for o in parts.values():
    print(f"{o.name:14s} verts {len(o.data.vertices):6d} faces {len(o.data.polygons):6d} keys {[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else []}")

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "atmen-anatomy.blend"), compress=True)

bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "atmen-anatomy.glb"),
    export_format="GLB",
    use_selection=False,
    export_apply=False,
    export_morph=True,
    export_morph_normal=True,
    export_morph_tangent=False,
    export_materials="EXPORT",
    export_yup=True,
    export_texcoords=False,
    export_normals=True,
    export_extras=True,
    export_copyright="Z-Anatomy (CC BY-SA 4.0), BodyParts3D, DBCLS (CC BY-SA 2.1 JP); adapted for atmen, CC BY-SA 4.0",
)
print("done")
