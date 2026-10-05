"""Reopen the delivered Blender source and render three inspection views."""

from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT / "dustkite.blend"))
scene = bpy.context.scene
for name, position, scale in [("front", (0,20,7),20), ("side",(19,1,5),14),
                              ("rear-three-quarter",(11,-18,12),20)]:
    scene.camera.location = position
    scene.camera.rotation_euler = (Vector((0,0,.4))-scene.camera.location).to_track_quat("-Z","Y").to_euler()
    scene.camera.data.ortho_scale = scale
    scene.render.filepath = str(ROOT / "previews" / f"{name}.png")
    bpy.ops.render.render(write_still=True)
