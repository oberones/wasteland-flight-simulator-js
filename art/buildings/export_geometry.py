"""Export saved building collections into reproducible normalized game-space buffers."""

import hashlib
import json
from pathlib import Path
import sys

import bpy
from mathutils import Matrix

ROOT = Path(__file__).resolve().parent
MODEL_IDS = ["office", "residential", "industrial", "shell"]
SCRIPTS = ["create_scene.py", "export_geometry.py", "render_previews.py", "embed-geometry.js"]


def digest(path):
    """Hash source and tooling so stale exports fail validation."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rounded(values):
    """Quantize tuples consistently and remove negative zero."""
    return tuple(0 if abs(v) < .000005 else round(v, 5) for v in values)


def color_of(material):
    """Accept only opaque palette colors; textures and linked effects are unsupported."""
    rgba = material.diffuse_color
    if material.use_nodes:
        shaders = [node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"]
        if len(shaders) != 1:
            raise ValueError(f"Use one Principled shader: {material.name}")
        shader = shaders[0]
        if any(socket.is_linked for socket in shader.inputs):
            raise ValueError(f"Linked material effects are unsupported: {material.name}")
        if shader.inputs["Alpha"].default_value != 1:
            raise ValueError(f"Transparent material: {material.name}")
        rgba = shader.inputs["Base Color"].default_value
    if rgba[3] != 1:
        raise ValueError(f"Transparent palette: {material.name}")
    return rounded(rgba[:3])


def bounds(positions):
    """Measure normalized geometry independently of declared model dimensions."""
    return {"min": [min(positions[i::3]) for i in range(3)],
            "max": [max(positions[i::3]) for i in range(3)]}


def export_collection(collection, dimensions, origin):
    """Evaluate parts, retaining split normals and contiguous named part ranges."""
    data = {"positions": [], "normals": [], "colors": [], "indices": [], "parts": []}
    lookup = {}
    depsgraph = bpy.context.evaluated_depsgraph_get()
    width, height, depth = dimensions
    conversion = Matrix(((1/width, 0, 0), (0, 0, 1/height), (0, -1/depth, 0)))
    for obj in sorted(collection.all_objects, key=lambda item: item.name):
        if obj.type != "MESH":
            raise ValueError(f"Unsupported export object: {obj.name}")
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            transform = evaluated.matrix_world
            linear_transform = conversion @ transform.to_3x3()
            normal_transform = linear_transform.inverted().transposed()
            first = len(data["indices"])
            for triangle in mesh.loop_triangles:
                color = color_of(mesh.materials[triangle.material_index])
                attr = mesh.color_attributes.active_color
                if attr and attr.domain not in ["CORNER", "POINT"]:
                    raise ValueError(f"Unsupported color domain: {attr.domain}")
                loops = list(triangle.loops)
                if linear_transform.determinant() < 0:
                    loops.reverse()
                for loop_id in loops:
                    vertex_id = mesh.loops[loop_id].vertex_index
                    world = transform @ mesh.vertices[vertex_id].co
                    world.x -= origin
                    pos = rounded(conversion @ world)
                    normal = rounded((normal_transform @ mesh.corner_normals[loop_id].vector).normalized())
                    rgb = rounded(attr.data[loop_id if attr.domain == "CORNER" else vertex_id].color[:3]) if attr else color
                    key = pos + normal + rgb
                    if key not in lookup:
                        lookup[key] = len(data["positions"]) // 3
                        for name, values in [("positions", pos), ("normals", normal), ("colors", rgb)]:
                            data[name].extend(values)
                    data["indices"].append(lookup[key])
            data["parts"].append({"name": obj.name, "firstIndex": first, "indexCount": len(data["indices"])-first})
        finally:
            evaluated.to_mesh_clear()
    data["bounds"] = bounds(data["positions"])
    return data


def export():
    """Export only the four named models, or compare against the saved output."""
    models = {}
    for model_id in MODEL_IDS:
        collection = bpy.data.collections[f"{model_id}_EXPORT"]
        models[model_id] = {kind: export_collection(bpy.data.collections[f"{model_id}_{kind}"],
                                                  collection["dimensions"], collection["originX"])
                            for kind in ["body", "windows"]}
    geometry = {"schemaVersion": 1, "models": models}
    payload = json.dumps(geometry, separators=(",", ":"), allow_nan=False) + "\n"
    path = ROOT / "geometry.json"
    if "--check" in sys.argv:
        if path.read_text() != payload:
            raise ValueError("Saved Blender geometry differs from geometry.json")
        print("PASS: fresh saved-source export is byte-identical")
        return
    path.write_text(payload)
    manifest = {"schemaVersion": 1, "asset": "Wasteland building set", "blenderVersion": bpy.app.version_string,
                "source": "Four original project-authored buildings; no third-party models, textures, or logos",
                "usageRights": "Project-authored; no separate third-party license. Repository has no project-level license.",
                "transforms": "Evaluated transforms/modifiers; remove gallery origin; Blender to normalized game (x,z,-y); inverse-transpose split normals; linear colors; 5-decimal quantization",
                "sourceSha256": digest(ROOT / "buildings.blend"), "geometrySha256": digest(path),
                "scriptsSha256": {name: digest(ROOT/name) for name in SCRIPTS},
                "triangleBudgetPerModel": 1000, "embeddedBudgetBytes": 1048576,
                "models": {key: {"triangles": sum(len(g["indices"])//3 for g in model.values()),
                                  "bodyVertices": len(model["body"]["positions"])//3,
                                  "windowVertices": len(model["windows"]["positions"])//3,
                                  "windowPanels": len(model["windows"]["parts"]),
                                  "bounds": model["body"]["bounds"]} for key, model in models.items()}}
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2)+"\n")
    print(json.dumps(manifest["models"]))


if __name__ == "__main__":
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / "buildings.blend"))
    export()
