"""Render all saved assets in a labeled Blender studio; generate a browser gallery index."""
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'scenery.blend'))
scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.render.resolution_x=480; scene.render.resolution_y=360; scene.render.resolution_percentage=100
scene.display.shading.light='STUDIO'; scene.display.shading.studio_light='paint.sl'
scene.display.shading.color_type='MATERIAL'; scene.display.shading.show_shadows=True
scene.display.shading.show_cavity=True; scene.display.shading.cavity_type='BOTH'
scene.world=bpy.data.worlds.new('Studio'); scene.display.shading.background_type='WORLD'; scene.world.color=(.075,.082,.075)
scene.view_settings.view_transform='Standard'
collections=[c for c in bpy.data.collections if c.name.endswith('_EXPORT')]
for c in collections: c.hide_render=True
bpy.ops.object.camera_add(); camera=bpy.context.object; scene.camera=camera; camera.data.type='ORTHO'
manifest=json.loads((ROOT/'manifest.json').read_text()); cards=[]
for c in collections:
    c.hide_render=False; model_id=c.name.removesuffix('_EXPORT'); model=manifest['models'][model_id]
    low,high=model['bounds']['min'],model['bounds']['max']; span=max(high[i]-low[i] for i in range(3)); span=max(span,3)
    target=Vector((c['originX']+(low[0]+high[0])/2,-(low[2]+high[2])/2,(low[1]+high[1])/2))
    camera.location=target+Vector((1.15,-1.6,.95))*span
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.ortho_scale=span*1.55
    scene.render.filepath=str(ROOT/'previews'/f'{model_id}.png'); bpy.ops.render.render(write_still=True)
    cards.append(f'<figure><img src="{model_id}.png" alt="{model["label"]}"><figcaption>{model["label"]} · {model["triangles"]} triangles</figcaption></figure>')
    c.hide_render=True
(ROOT/'previews/gallery.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Wasteland scenery — 32 original assets</title><style>body{background:#202521;color:#e3dbc4;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;background:#30372f;border:1px solid #5a594a}img{width:100%;display:block}figcaption{padding:12px}h1{font-weight:500}@media(max-width:900px){main{grid-template-columns:repeat(2,minmax(0,1fr))}body{margin:12px}}figure{min-width:0}</style><h1>Wasteland scenery · 32 original assets</h1><main>'+''.join(cards)+'</main></html>')
print('Rendered all 32 assets and labeled gallery')
