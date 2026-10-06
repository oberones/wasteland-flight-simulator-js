"""Render a gallery plus front/rear inspection views directly from the saved source."""

from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT / "buildings.blend"))
scene = bpy.context.scene
(ROOT / "previews").mkdir(exist_ok=True)
scene.render.filepath = str(ROOT / "previews" / "gallery.png")
bpy.ops.render.render(write_still=True)
collections = [bpy.data.collections[f"{name}_EXPORT"] for name in ["office", "residential", "industrial", "shell"]]
for collection in collections:
    for other in collections:
        other.hide_render = other != collection
    origin = collection["originX"]
    width, height, depth = collection["dimensions"]
    target = Vector((origin, 0, height*.43))
    for label, direction in [("front", (1.2, -1.8, 1)), ("rear", (-1.4, 1.8, .9))]:
        scene.camera.location = target + Vector(direction)*max(width, height)
        scene.camera.rotation_euler = (target-scene.camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera.data.ortho_scale = max(height*1.95, width*1.9)
        scene.render.filepath = str(ROOT / "previews" / f"{collection['modelId']}-{label}.png")
        bpy.ops.render.render(write_still=True)
