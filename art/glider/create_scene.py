"""Build the editable Dustkite ultralight; coordinates below use game meters."""

import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
PALETTE = {
    "soot": "292b28", "steel": "626960", "rust": "a9542f",
    "red": "733b2a", "canvas": "b6a071", "bone": "dcc89a",
    "olive": "737250", "leather": "4d392b", "skin": "aa7852",
    "glass": "567b7a", "rubber": "262322",
}


def linear(value):
    """Convert authored sRGB palette values for Blender/Three linear shading."""
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def point(value):
    """Map game +Y up/-Z forward to Blender +Z up/+Y forward."""
    x, y, z = value
    return Vector((x, -z, y))


def finish(obj, name, material):
    """Name and move an editable part into the export collection."""
    obj.name = name
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    ASSET.objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(MATERIALS[material])
    return obj


def panel(name, vertices, material, faces=None):
    """Make a flat-shaded panel with editable polygon topology."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([point(v) for v in vertices], [], faces or [list(range(len(vertices)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    ASSET.objects.link(obj)
    obj.data.materials.append(MATERIALS[material])
    return obj


def box(name, center, size, material):
    """Create a scaled box without baking its editable transform."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=point(center))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    return finish(obj, name, material)


def tube(name, a, b, radius, material="steel", sides=6):
    """Create a low-sided welded tube or cable between game-space points."""
    start, end = point(a), point(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=(end-start).length,
                                      end_fill_type="NGON", location=(start+end)/2)
    obj = bpy.context.object
    obj.rotation_euler = (end-start).to_track_quat("Z", "Y").to_euler()
    return finish(obj, name, material)


def ellipsoid(name, center, scale, material):
    """Use a faceted low-poly volume for pilot clothing and the helmet."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=point(center))
    obj = bpy.context.object
    obj.scale = (scale[0], scale[2], scale[1])
    return finish(obj, name, material)


def make_wings():
    """Build cambered patchwork sails with authored, asymmetric missing sections."""
    for sign, label in [(-1, "port"), (1, "starboard")]:
        xs = [0.65, 2.3, 4.2, 6.25, 8.35 if sign < 0 else 8.1]
        front = [-1.75, -1.60, -1.23, -0.70, 0.05]
        back = [1.65, 1.90, 2.15, 1.65, 0.78]
        heights = [0.88, 0.92, 1.03, 1.16, 1.24]

        def sail_height(x, z):
            """Place repairs on the cambered sail instead of floating over it."""
            i = next(i for i in range(4) if xs[i] <= x <= xs[i+1])
            t = (x-xs[i])/(xs[i+1]-xs[i])
            f = front[i]*(1-t)+front[i+1]*t
            b = back[i]*(1-t)+back[i+1]*t
            h = heights[i]*(1-t)+heights[i+1]*t
            middle = f+(b-f)*.46
            camber = (z-f)/(middle-f) if z <= middle else (b-z)/(b-middle)
            return h+.15*camber+.015

        for i in range(4):
            x0, x1 = sign*xs[i], sign*xs[i+1]
            h0, h1 = heights[i], heights[i+1]
            f0, f1, b0, b1 = front[i], front[i+1], back[i], back[i+1]
            mid0, mid1 = f0 + (b0-f0)*0.46, f1+(b1-f1)*0.46
            panel(f"{label} canvas leading panel {i}", [(x0,h0,f0),(x1,h1,f1),
                  (x1,h1+.15,mid1),(x0,h0+.15,mid0)], ["bone","canvas","olive","canvas"][i])
            # Torn trailing teeth differ on each wing; the spar remains visible.
            tear = .42 if (i + (sign > 0)) % 2 else .78
            panel(f"{label} torn trailing panel {i}", [(x0,h0+.15,mid0),
                  (x1,h1+.15,mid1),(x1,h1,b1-.1),
                  (x0+(x1-x0)*.73,h0*.27+h1*.73,b0*.27+b1*.73-.03),
                  (x0+(x1-x0)*.51,h0*.49+h1*.51,b0*.49+b1*.51-tear),
                  (x0+(x1-x0)*.33,h0*.67+h1*.33,b0*.67+b1*.33-.08),
                  (x0,h0,b0-.1)], (["canvas","red","canvas","bone"] if sign<0 else ["olive","canvas","red","canvas"])[i])
            tube(f"{label} leading spar {i}",(x0,h0,f0),(x1,h1,f1),.065,"soot")
            tube(f"{label} trailing spar {i}",(x0,h0,b0),(x1,h1,b1),.043,"rust",5)
            tube(f"{label} exposed rib {i}",(x0,h0+.025,f0),(x0,h0+.18,mid0),.038,"steel",5)
            tube(f"{label} rear rib {i}",(x0,h0+.18,mid0),(x0,h0+.025,b0),.032,"steel",5)
        # Broad repair patches and straps are legible at the in-game camera distance.
        for j, (x,z,w,d,col) in enumerate([(2.85,-.9,.8,.7,"red"),(5.0,.0,1.0,.7,"bone"),(6.7,.45,.48,.65,"olive")]):
            corners = [(x,z),(x+w,z+.12),(x+w-.12,z+d),(x-.12,z+d-.08)]
            panel(f"{label} stitched repair {j}",[(sign*px,sail_height(px,pz),pz) for px,pz in corners],col)
            for k in range(3):
                sx = x+.13+k*w/3
                tube(f"{label} repair stitch {j}-{k}",(sign*sx,sail_height(sx,z-.025),z-.025),
                     (sign*sx,sail_height(sx,z+.12),z+.12),.018,"soot",4)
        tube(f"{label} main lift strut",(sign*.48,-.40,.25),(sign*4.9,1.08,-.7),.075,"rust")
        tube(f"{label} aft lift strut",(sign*.48,-.40,.25),(sign*4.9,1.14,1.8),.048,"steel")
        tube(f"{label} kingpost tension cable",(0,2.12,.2),(sign*7.8,1.25,.15),.024,"soot",4)


def make_body():
    """Assemble an open scrap cockpit, truss tail, and salvaged stabilizers."""
    box("cockpit floor",(0,-.38,-1.38),(1.23,.12,3.15),"soot")
    for sign, label in [(-1,"port"),(1,"starboard")]:
        tube(f"{label} lower chassis",(sign*.5,-.35,-3.7),(sign*.55,-.35,1.3),.072,"rust")
        tube(f"{label} cockpit rail",(sign*.64,.50,-2.45),(sign*.58,.60,.70),.065,"steel")
        for i,z in enumerate([-2.35,-.55,.65]):
            tube(f"{label} upright {i}",(sign*.53,-.32,z),(sign*.62,.55,z),.055,"rust")
        panel(f"{label} scavenged side plate",[(sign*.65,-.26,-2.55),(sign*.65,.37,-2.23),
              (sign*.65,.43,-.85),(sign*.65,-.25,-.35)],"rust")
        panel(f"{label} rear olive plate",[(sign*.62,-.25,-.26),(sign*.62,.44,-.46),
              (sign*.60,.53,.65),(sign*.60,-.25,.80)],"olive")
        tube(f"{label} tail boom",(sign*.5,-.27,.75),(sign*.16,.35,4.92),.065,"steel")
        tube(f"{label} tail diagonal",(sign*.5,.58,.75),(sign*.16,.35,4.92),.046,"rust")
        tube(f"{label} nose rail",(sign*.52,-.32,-2.55),(sign*.26,.06,-4.68),.06,"steel")
        panel(f"{label} nose cowling",[(sign*.54,-.24,-2.62),(sign*.5,.4,-2.6),
              (sign*.26,.10,-4.7),(sign*.20,-.15,-4.72)],"red" if sign<0 else "rust")
        for i,z in enumerate([-2.0,-1.5,-1.0]):
            box(f"{label} panel rivet {i}",(sign*.67,.29,z),(.055,.055,.055),"bone")
    for i,z in enumerate([1.5,2.7,3.8]):
        width=.5-(z-.75)*.08
        tube(f"tail cross brace {i}",(-width,-.12,z),(width,.37,z+.7),.04,"soot",5)
    tube("kingpost",(0,.2,.15),(0,2.12,.2),.055,"rust")
    tube("upper longitudinal brace",(0,.6,.72),(0,.4,4.8),.045,"soot")
    box("patched seat cushion",(0,-.12,-.28),(.83,.24,.75),"leather")
    box("seat back",(0,.36,.13),(.80,.92,.16),"leather")
    box("instrument panel",(0,.47,-1.82),(1.02,.40,.13),"soot")
    for x in [-.28,.08,.32]:
        tube("salvaged instrument dial",(x,.49,-1.735),(x,.49,-1.715),.095 if x<0 else .063,"bone",8)
    tube("control stick",(0,-.25,-1.13),(0,.48,-.98),.045,"steel")
    tube("control grip",(-.14,.49,-.98),(.14,.49,-.98),.055,"rubber")
    box("rear cargo tool box",(0,.10,.97),(.65,.45,.65),"olive")
    box("tool box strap",(0,.335,.97),(.13,.025,.7),"leather")
    # Tail is deliberately uneven but remains inside the existing camera envelope.
    panel("port tail canvas",[(0,.39,3.7),(-2.08,.43,4.25),(-1.68,.44,5.12),(0,.43,4.88)],"canvas")
    panel("starboard tail repair",[(0,.39,3.7),(1.86,.48,4.17),(1.68,.47,4.93),(.85,.45,4.72),(0,.43,4.88)],"red")
    tube("tail leading spar",(-2.08,.43,4.25),(0,.39,3.7),.05,"steel")
    tube("tail repaired spar",(0,.39,3.7),(1.86,.48,4.17),.05,"steel")
    panel("uneven tail fin",[(0,.4,3.65),(0,1.78,4.32),(0,1.56,4.93),(0,.44,5.12)],"olive")
    panel("fin identification stripe",[(.015,.75,3.91),(.015,1.08,4.05),(.015,1.06,4.99),(.015,.79,5.06)],"bone")
    tube("tail fin post",(0,.4,3.65),(0,1.78,4.32),.045,"rust")
    tube("landing skid",(0,-.77,-3.2),(0,-.77,.8),.095,"soot")
    tube("skid nose",(0,-.77,-3.2),(0,-.30,-3.8),.095,"soot")


def make_pilot():
    """Seat a static goggled pilot below the wing with visible shoulders and helmet."""
    ellipsoid("pilot jacket",(0,.62,-.36),(.43,.66,.30),"olive")
    ellipsoid("pilot collar",(0,1.12,-.4),(.28,.18,.26),"bone")
    ellipsoid("pilot helmet",(0,1.48,-.45),(.31,.36,.31),"leather")
    ellipsoid("pilot face scarf",(0,1.34,-.64),(.24,.17,.12),"canvas")
    box("goggle leather strap",(0,1.53,-.712),(.55,.14,.08),"soot")
    for sign in [-1,1]:
        box("goggle lens",(sign*.135,1.54,-.764),(.19,.12,.045),"glass")
        tube("pilot upper sleeve",(sign*.35,.89,-.40),(sign*.51,.54,-.82),.14,"olive")
        tube("pilot forearm",(sign*.51,.54,-.82),(sign*.13,.49,-1.01),.12,"olive")
        ellipsoid("pilot glove",(sign*.13,.49,-1.01),(.13,.12,.16),"leather")
        tube("pilot thigh",(sign*.20,.0,-.45),(sign*.24,.0,-1.13),.18,"leather")
        tube("pilot shin",(sign*.24,.0,-1.13),(sign*.26,-.19,-1.80),.14,"leather")
        box("pilot boot",(sign*.26,-.17,-1.91),(.27,.24,.44),"soot")
        tube("pilot shoulder harness",(sign*.24,1.07,-.57),(sign*.20,.18,-.65),.042,"bone",4)
    panel("scarf resting on shoulder",[(-.16,1.12,-.21),(.11,1.1,-.18),(.31,.78,-.15),(.10,.58,-.16)],"red")


def studio():
    """Set a reusable neutral studio, excluded by the collection-only exporter."""
    scene = bpy.context.scene
    scene.world = bpy.data.worlds.new("Dustkite studio")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.065,.08,.10,1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = .45
    for name, pos, energy, size in [("Key",(3,-5,10),2100,9),("Fill",(-7,0,5),1500,8),("Rim",(2,8,8),2300,7)]:
        bpy.ops.object.light_add(type="AREA", location=pos)
        light = bpy.context.object
        light.name = name
        light.data.energy, light.data.shape, light.data.size = energy,"DISK",size
        light.rotation_euler = (-light.location).to_track_quat("-Z","Y").to_euler()
    bpy.ops.object.camera_add(location=(12,-17,10))
    scene.camera = bpy.context.object
    scene.camera.rotation_euler = (Vector((0,0,.4))-scene.camera.location).to_track_quat("-Z","Y").to_euler()
    scene.camera.data.type = "ORTHO"
    scene.camera.data.ortho_scale = 20
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1400,1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    scene.render.film_transparent = False


if __name__ == "__main__":
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    ASSET = bpy.data.collections.new("Dustkite_EXPORT")
    bpy.context.scene.collection.children.link(ASSET)
    MATERIALS = {}
    for name, hex_color in PALETTE.items():
        rgba = tuple(linear(int(hex_color[i:i+2],16)/255) for i in (0,2,4)) + (1,)
        material = bpy.data.materials.new(name)
        material.diffuse_color = rgba
        material.use_nodes = True
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = rgba
        shader.inputs["Roughness"].default_value = .85
        shader.inputs["Metallic"].default_value = .15
        MATERIALS[name] = material
    make_wings()
    make_body()
    make_pilot()
    studio()
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "dustkite.blend"))
    print(f"Saved Dustkite: {len(ASSET.objects)} editable mesh parts")
