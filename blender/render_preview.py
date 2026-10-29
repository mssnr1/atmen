"""
Renders a still of the prepared anatomy, lungs and diaphragm in the inhaled pose.

    python -I blender/render_preview.py <atmen-anatomy.blend> <out.png>
    blender -b <atmen-anatomy.blend> -P blender/render_preview.py -- <atmen-anatomy.blend> <out.png>
"""

import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
bpy.ops.wm.open_mainfile(filepath=argv[0], load_ui=False)
scene = bpy.context.scene

for o in scene.objects:
    keys = o.data.shape_keys if o.type == "MESH" else None
    if keys:
        for k in keys.key_blocks[1:]:
            k.value = 1.0 if k.name == "Inhale" else 0.3

# Same framing as the app: a 3/4 view from the model's left, centred on the chest.
target = Vector((0, 0, 1.37))
cam_data = bpy.data.cameras.new("Preview")
cam_data.lens_unit = "FOV"
cam_data.angle_y = math.radians(28)
cam_data.sensor_fit = "VERTICAL"
cam = bpy.data.objects.new("Preview", cam_data)
scene.collection.objects.link(cam)
d = 1.55
az, el = math.radians(28), math.radians(6)
cam.location = target + Vector((d * math.cos(el) * math.sin(az), -d * math.cos(el) * math.cos(az), d * math.sin(el)))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

key = bpy.data.lights.new("Key", "AREA")
key.energy = 40
key.size = 2
key_o = bpy.data.objects.new("Key", key)
key_o.location = (0.8, -1.6, 2.4)
key_o.rotation_euler = (math.radians(50), 0, math.radians(25))
scene.collection.objects.link(key_o)

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0

scene.render.use_freestyle = False  # the template draws outlines
scene.render.use_compositing = False
scene.render.use_sequencer = False
scene.render.film_transparent = False
print("exposure", scene.view_settings.exposure, scene.view_settings.look, scene.view_settings.gamma, "mat override", [vl.material_override for vl in scene.view_layers])
for o in scene.objects:
    o.hide_render = False
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
for vl in scene.view_layers:
    vl.material_override = None
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.cycles.transparent_max_bounces = 32
scene.view_settings.view_transform = "Standard"
scene.render.resolution_x = 600
scene.render.resolution_y = 800
scene.render.filepath = argv[1]
bpy.ops.render.render(write_still=True)
print("rendered", argv[1])
