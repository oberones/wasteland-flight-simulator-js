"""Author four original, editable wasteland buildings in a shared Blender studio."""

import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
PALETTE = {"concrete": "8b8980", "edge": "b6ae98", "soot": "383c3b",
           "rust": "925035", "steel": "565f5c", "brick": "6b5c4e", "glow": "ff852f"}
MODELS = [("office", (40, 100, 36), -90), ("residential", (44, 84, 36), -30),
          ("industrial", (48, 42, 40), 32), ("shell", (40, 22, 36), 92)]


def linear(value):
    """Convert palette sRGB values into linear material colors."""
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4


def point(value):
    """Map model-local game meters into the Blender gallery."""
    x, y, z = value
    return Vector((x + ORIGIN, -z, y))


def finish(obj, name, material):
    """Keep every editable mesh in its model's body or window collection."""
    obj.name = f"{MODEL}_{name}"
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    (WINDOWS if material == "glow" else BODY).objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(MATERIALS[material])
    return obj


def box(name, center, size, material="concrete"):
    """Create a solid architectural element with editable scale."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=point(center))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    return finish(obj, name, material)


def beam(name, a, b, thickness=.65, material="rust"):
    """Make a squared structural beam between two local points."""
    start, end = point(a), point(b)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(start + end) / 2)
    obj = bpy.context.object
    obj.scale = (thickness, thickness, (end-start).length)
    obj.rotation_euler = (end-start).to_track_quat("Z", "Y").to_euler()
    return finish(obj, name, material)


def broken_wall(name, profile, z, depth, material="concrete"):
    """Extrude a jagged XY profile, including the exposed interior and broken edge."""
    vertices = [point((x, y, zz)) for zz in (z-depth/2, z+depth/2) for x, y in profile]
    count = len(profile)
    faces = [list(range(count-1, -1, -1)), list(range(count, count*2))]
    faces += [[i, (i+1) % count, (i+1) % count + count, i+count] for i in range(count)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    BODY.objects.link(obj)
    return finish(obj, name, material)


def foundation(width, depth):
    """A recessed skirt fills terrain variation without expanding the footprint."""
    box("buried foundation", (0, -4.5, 0), (width, 11, depth), "soot")
    box("foundation lip", (0, 1, 0), (width, 1.3, depth), "edge")


def fractured_floor(name, y, width, depth):
    """Give upper floor plates a chipped corner with solid exposed slab edges."""
    obj = broken_wall(name, [(-width/2, -depth/2), (width/2, -depth/2),
                             (width/2, depth*.12), (width*.28, depth*.19),
                             (width*.34, depth*.32), (width*.06, depth/2),
                             (-width/2, depth/2)], 0, 1.6, "edge")
    # The reusable extrusion was authored in game XY; turn it into an XZ slab.
    for vertex in obj.data.vertices:
        old_y, old_z = vertex.co.y, vertex.co.z
        vertex.co.y, vertex.co.z = -old_z, y+old_y


def office():
    """A fractured, stepped tower with a visible core and open floor plates."""
    foundation(40, 36)
    box("stairwell core", (3, 42, -5), (10, 84, 12), "soot")
    for level, y in enumerate([3, 19, 35, 51, 67, 83]):
        width = 39 if level < 4 else 29
        if level > 3:
            fractured_floor(f"fractured upper floor {level}", y, width, 35)
        else:
            box(f"exposed floor {level}", (0, y, 0), (width, 1.8, 35), "edge")
        for column, x in enumerate([-17, -5, 8, 17]):
            if level > 3 and x == 17:
                continue
            box(f"front pier {level}-{column}", (x*.75 if level > 3 else x, y+6, 15), (1.6, 12, 1.6), "concrete")
        # Discontinuous banks reveal dark interior floors behind the glass.
        for side in [-1, 1]:
            box(f"weathered window sill {level}-{side}", (-2 if level > 3 else 0, y+2.5, side*14.5), (width-1, 2, 1.2), "brick")
            for bay, x in enumerate([-11, 1, 12]):
                if (level+bay+(side == 1)) % 4 == 0 or (level > 3 and bay == 2):
                    continue
                box(f"window {level}-{side}-{bay}", (x, y+6.5, side*14.5), (7, 6, .45), "glow")
    for i, x in enumerate([-17, -5, 8]):
        box(f"rear exposed column {i}", (x, 43, -14.5), (1.5, 80, 1.5), "concrete")
    broken_wall("fractured west facade", [(-19, 2), (-19, 91), (-15, 100), (-12, 87), (-7, 89), (-7, 2)], -15.5, 2)
    broken_wall("rear broken shoulder", [(8, 2), (8, 73), (12, 78), (14, 66), (19, 68), (19, 2)], -15.5, 2, "brick")
    for i, (a, b) in enumerate([((-17, 68, 15), (-5, 83, 15)), ((-17, 84, 15), (-13, 94, 15)),
                                ((-5, 84, 15), (-2, 89, 14)), ((8, 52, 15), (16, 65, 15))]):
        beam(f"exposed rebar frame {i}", a, b, .7)


def residential():
    """A broad residential slab with recessed bays, balconies, and a missing corner."""
    foundation(44, 36)
    box("charred internal spine", (0, 36, -4), (28, 72, 10), "soot")
    for level, y in enumerate([3, 18, 33, 48, 63]):
        if level > 2:
            fractured_floor(f"broken floor slab {level}", y, 39, 34)
        else:
            box(f"floor slab {level}", (0, y, 0), (43, 1.6, 34), "edge")
        box(f"front window sill {level}", (-3 if level > 2 else 0, y+2, 12.8), (35 if level > 2 else 42, 2, 1.6), "brick")
        for bay, x in enumerate([-15, -5, 5, 15]):
            if level > 2 and bay == 3:
                continue
            box(f"bay divider {level}-{bay}", (x-4, y+6, 15), (1.4, 12, 3), "brick")
            if (level+bay) % 5 != 0:
                box(f"recessed front window {level}-{bay}", (x, y+6, 12.8), (6, 6, .5), "glow")
            if (level+bay) % 3 == 0:
                box(f"balcony deck {level}-{bay}", (x, y+1.3, 15.5), (7, .9, 4), "concrete")
                box(f"balcony parapet {level}-{bay}", (x, y+3, 17), (7, 2, .8), "rust")
        if level % 2 == 0:
            box(f"rear window sill {level}", (0, y+3, -15), (42, 1.5, 1.5), "brick")
            for x in [-13, 0, 13]:
                box(f"rear window {level}-{x}", (x, y+6, -15), (8, 5, .6), "glow")
    for i, x in enumerate([-18, -5, 8, 18]):
        box(f"rear mullion {i}", (x, 36, -15), (1.3, 68, 1.6), "concrete")
    broken_wall("roof crown", [(-21, 66), (-21, 79), (-15, 84), (-10, 76), (-4, 79), (3, 69), (3, 66)], -15, 2)
    box("west shear wall", (-20, 34, -2), (2, 65, 28), "concrete")
    broken_wall("broken east return", [(15, 2), (21, 2), (21, 35), (18, 43), (15, 37)], -12, 3, "brick")
    beam("exposed corner diagonal", (16, 50, 14), (10, 71, 12), .9)


def industrial():
    """A collapsed sawtooth works with open trusses and a hollow octagonal chimney."""
    foundation(48, 40)
    box("rear works wall", (0, 8, -17), (44, 14, 2), "brick")
    broken_wall("front collapsed wall", [(-23, 1), (-23, 17), (-16, 19), (-12, 11), (-7, 13), (-7, 1)], 17, 2)
    broken_wall("front east remnant", [(8, 1), (8, 9), (13, 15), (22, 13), (22, 1)], 17, 2, "brick")
    for i, x in enumerate([-20, -7, 7, 20]):
        for z in [-16, 16]:
            beam(f"steel column {i}-{z}", (x, 2, z), (x, 19, z), 1, "steel")
        beam(f"roof truss west {i}", (x, 19, -16), (x, 25, 0), .8)
        beam(f"roof truss east {i}", (x, 25, 0), (x, 18 if i > 1 else 19, 16), .8)
        beam(f"roof tie {i}", (x, 19, -16), (x, 19, 16), .55, "steel")
    for x in [-14, -1, 12]:
        box(f"rear glowing furnace bay {x}", (x, 9, -15.8), (8, 5, .7), "glow")
    for z in [-8, 3, 12]:
        box(f"west clerestory {z}", (-21.8, 12, z), (.6, 4, 7), "glow")
    box("west clerestory sill", (-21.8, 9, 2), (1.3, 2, 30), "brick")
    for i, z in enumerate([-12, -3, 7, 16]):
        box(f"west wall mullion {i}", (-21.8, 8, z), (1.3, 14, 1.3), "concrete")
    # A short run of roof sheeting leaves most of the trusses exposed.
    for i, z in enumerate([-10, -3]):
        obj = box(f"buckled roof sheet {i}", (-14, 22+i*2, z), (12, .6, 8), "rust")
        obj.rotation_euler.x = .28
    # Separate walls form a real open chimney rather than a capped cylinder.
    for i in range(8):
        angle = i*math.tau/8
        x, z = 15 + 3.7*math.cos(angle), -9 + 3.7*math.sin(angle)
        obj = box(f"chimney hollow wall {i}", (x, 24, z), (3.1, 36 if i != 2 else 32, 1.0), "soot" if i % 3 else "brick")
        obj.rotation_euler.z = -angle + math.pi/2
    box("furnace housing", (9, 6, -5), (13, 10, 10), "steel")
    box("furnace mouth", (9, 6, .2), (7, 5, .5), "glow")
    beam("fallen girder", (-16, 2, 9), (10, 7, 12), 1.5)


def shell():
    """A low concrete shell with thick broken walls and an exposed upper room."""
    foundation(40, 36)
    broken_wall("jagged front west", [(-19, 1), (-19, 19), (-13, 22), (-9, 16), (-6, 18), (-6, 1)], 15, 2.2)
    broken_wall("jagged front east", [(6, 1), (6, 12), (10, 17), (15, 14), (19, 17), (19, 1)], 15, 2.2)
    broken_wall("rear broken wall", [(-19, 1), (-19, 18), (-10, 18), (-6, 12), (2, 15), (8, 8), (19, 10), (19, 1)], -15, 2.2, "brick")
    box("west interior wall", (-18, 9, 0), (2, 16, 28), "concrete")
    box("remaining upper floor", (-8, 10, 0), (19, 1.5, 28), "edge")
    box("stair block", (-10, 4, -6), (8, 6, 12), "soot")
    for i in range(3):
        box(f"exposed stair {i}", (-3+i*2, 2+i*2, -6), (2, 2, 7), "edge")
    for i, x in enumerate([-12, 12]):
        box(f"lit front recess {i}", (x, 6, 13.7), (6, 5, .6), "glow")
        box(f"door return {i}", (x-4, 6, 13), (1.5, 10, 3), "soot")
    for z in [-8, 3, 11]:
        box(f"east window {z}", (16, 6, z), (.7, 4.5, 5), "glow")
        box(f"east pier {z}", (17, 6, z-3.5), (2, 10, 1.4), "concrete")
    for i, (a, b) in enumerate([((-17, 19, 11), (-4, 16, 11)), ((-5, 11, -13), (10, 3, -8)),
                                ((-17, 19, -13), (-8, 20, -13))]):
        beam(f"roof remnant {i}", a, b, .8)
    for i, (x, z) in enumerate([(6, 1), (12, 6), (3, -10)]):
        obj = box(f"interior fallen concrete {i}", (x, 2, z), (6, 2, 3), "concrete")
        obj.rotation_euler.z = .3+i*.35


def studio():
    """Create neutral gallery lighting excluded from all exports."""
    scene = bpy.context.scene
    scene.world = bpy.data.worlds.new("Building studio")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.06, .075, .09, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = .7
    bpy.ops.object.light_add(type="SUN", location=(0, -70, 160))
    bpy.context.object.rotation_euler = (.45, -.5, -.6)
    bpy.context.object.data.energy = 2.5
    bpy.context.object.data.angle = .15
    bpy.ops.object.light_add(type="AREA", location=(0, 90, 100))
    bpy.context.object.data.energy = 160000
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 150
    bpy.context.object.rotation_euler = (Vector((0, 0, 30))-bpy.context.object.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=(160, -290, 190))
    scene.camera = bpy.context.object
    scene.camera.rotation_euler = (Vector((0, 0, 40))-scene.camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera.data.type = "ORTHO"
    scene.camera.data.ortho_scale = 260
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1440, 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"


if __name__ == "__main__":
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    MATERIALS = {}
    for name, value in PALETTE.items():
        rgba = tuple(linear(int(value[i:i+2], 16)/255) for i in (0, 2, 4)) + (1,)
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = rgba
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = rgba
        shader.inputs["Roughness"].default_value = .88
        shader.inputs["Metallic"].default_value = .08
        if name == "glow":
            shader.inputs["Emission Color"].default_value = rgba
            shader.inputs["Emission Strength"].default_value = 2
        MATERIALS[name] = mat
    for MODEL, dimensions, ORIGIN in MODELS:
        collection = bpy.data.collections.new(f"{MODEL}_EXPORT")
        collection["modelId"], collection["dimensions"], collection["originX"] = MODEL, dimensions, ORIGIN
        bpy.context.scene.collection.children.link(collection)
        BODY, WINDOWS = (bpy.data.collections.new(f"{MODEL}_{kind}") for kind in ["body", "windows"])
        collection.children.link(BODY)
        collection.children.link(WINDOWS)
        globals()[MODEL]()
    studio()
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "buildings.blend"))
    print("Saved four original building collections")
