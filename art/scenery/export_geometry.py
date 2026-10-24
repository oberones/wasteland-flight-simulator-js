"""Re-export the saved scenery library using the established split-normal/color exporter."""
import importlib.util
import json
from pathlib import Path
import sys
import bpy

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('building_exporter',ROOT.parent/'buildings/export_geometry.py')
base=importlib.util.module_from_spec(spec); spec.loader.exec_module(base)
SCRIPTS=['create_scene.py','export_geometry.py','render_previews.py','embed-geometry.js','../buildings/export_geometry.py']

def export():
    models={}
    for collection in sorted(bpy.data.collections,key=lambda c:c.name):
        if not collection.name.endswith('_EXPORT'): continue
        for obj in collection.all_objects:
            if obj.animation_data: raise ValueError('Animated scenery is unsupported')
            evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
            mesh=evaluated.to_mesh()
            try:
                attr=mesh.color_attributes.active_color
                if attr and any(abs(c.color[3]-1)>1e-6 for c in attr.data): raise ValueError('Transparent vertex color')
            finally: evaluated.to_mesh_clear()
        data=base.export_collection(collection,(1,1,1),collection['originX'])
        data['label']=collection['label']; data['category']=collection['category']; data['batch']=collection['batch']
        data['placement']={key:list(collection[key]) if key=='groundAnchor' else collection[key] for key in ['groundAnchor','embedDepth','maxVariation','maxSlope']}
        models[collection.name.removesuffix('_EXPORT')]=data
    if len(models)!=32: raise ValueError('Expected exactly 32 scenery assets')
    geometry={'schemaVersion':1,'units':'meters','models':models}
    payload=json.dumps(geometry,separators=(',',':'),allow_nan=False)+'\n'
    path=ROOT/'geometry.json'
    if '--check' in sys.argv:
        if path.read_text()!=payload: raise ValueError('Saved Blender source differs from geometry.json')
        print('PASS: all 32 saved-source exports are byte-identical'); return
    path.write_text(payload)
    manifest={'schemaVersion':1,'asset':'Wasteland scenery collection',
      'source':'32 original project-authored meshes; no third-party models, textures, or logos',
      'usageRights':'Project-authored; repository has no project-level license.',
      'blenderVersion':bpy.app.version_string,
      'transforms':'Game meters (x,z,-y); gallery origin removed; evaluated transforms and inverse-transpose split normals; active CORNER/POINT linear colors before palette fallback; 5-decimal quantization',
      'sourceSha256':base.digest(ROOT/'scenery.blend'),'geometrySha256':base.digest(path),
      'scriptsSha256':{name:base.digest(ROOT/name) for name in SCRIPTS},
      'smallTriangleBudget':200,'largeTriangleBudget':800,'embeddedBudgetBytes':2097152,
      'models':{key:{'label':v['label'],'category':v['category'],'triangles':len(v['indices'])//3,'vertices':len(v['positions'])//3,'bounds':v['bounds']} for key,v in models.items()}}
    (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({k:v['triangles'] for k,v in manifest['models'].items()}))

if __name__=='__main__':
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'scenery.blend'))
    export()
