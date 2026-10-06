"""Export the saved Blender asset as deterministic, game-space indexed buffers."""

import hashlib
import json
from pathlib import Path
import sys

import bpy

ROOT = Path(__file__).resolve().parent


def digest(path):
    """Hash a delivered source or export without modifying it."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rounded(values):
    """Quantize consistently and avoid negative zero in serialized geometry."""
    return tuple(0 if abs(v) < .000005 else round(v, 5) for v in values)


def material_color(material):
    """Read editable Principled base color; reject unsupported textured/alpha color."""
    rgba = material.diffuse_color
    if material.use_nodes:
        shaders = [node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"]
        if len(shaders) != 1:
            raise ValueError(f"Use one Principled shader: {material.name}")
        base = shaders[0].inputs["Base Color"]
        alpha = shaders[0].inputs["Alpha"]
        if base.is_linked or alpha.is_linked or alpha.default_value != 1:
            raise ValueError(f"Use opaque, unlinked palette colors: {material.name}")
        rgba = base.default_value
    if rgba[3] != 1:
        raise ValueError(f"Transparent material is unsupported: {material.name}")
    return rounded(rgba[:3])


def export():
    """Evaluate only named export parts and preserve split normals and colors."""
    vertices, normals, colors, indices, lookup = [], [], [], [], {}
    depsgraph = bpy.context.evaluated_depsgraph_get()
    parts = []
    for obj in sorted(bpy.data.collections["Dustkite_EXPORT"].all_objects, key=lambda item: item.name):
        if obj.type != "MESH":
            raise ValueError(f"Unsupported export object: {obj.name}")
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            transform = evaluated.matrix_world
            normal_transform = transform.to_3x3().inverted().transposed()
            first = len(indices)
            # Active corner/point colors need no material; palettes are a fallback.
            attr = mesh.color_attributes.active_color
            for triangle in mesh.loop_triangles:
                color = None if attr else material_color(mesh.materials[triangle.material_index])
                loops = list(triangle.loops)
                if transform.to_3x3().determinant() < 0:
                    loops.reverse()
                for loop_id in loops:
                    vertex_id = mesh.loops[loop_id].vertex_index
                    position = transform @ mesh.vertices[vertex_id].co
                    normal = (normal_transform @ mesh.corner_normals[loop_id].vector).normalized()
                    pos = rounded((position.x, position.z, -position.y))
                    nor = rounded((normal.x, normal.z, -normal.y))
                    rgb = rounded(attr.data[loop_id if attr.domain == "CORNER" else vertex_id].color[:3]) if attr else color
                    key = pos + nor + rgb
                    if key not in lookup:
                        lookup[key] = len(vertices) // 3
                        vertices.extend(pos)
                        normals.extend(nor)
                        colors.extend(rgb)
                    indices.append(lookup[key])
            parts.append({"name": obj.name, "firstIndex": first, "indexCount": len(indices)-first})
        finally:
            evaluated.to_mesh_clear()
    geometry = {"positions": vertices, "normals": normals, "colors": colors, "indices": indices}
    payload = json.dumps(geometry, separators=(",", ":"), allow_nan=False) + "\n"
    check = "--check" in sys.argv
    export_path = ROOT / "geometry.json"
    if check:
        if export_path.read_text() != payload:
            raise ValueError("Saved Blender source differs from geometry.json; regenerate and embed")
        print("PASS: fresh Blender export matches geometry.json byte for byte")
        return
    export_path.write_text(payload)
    manifest = {
        "asset": "Dustkite", "schemaVersion": 1, "blenderVersion": bpy.app.version_string,
        "source": "Original geometry authored for this project; no third-party assets or franchise logos",
        "usageRights": "Project-authored asset; no separate third-party license. Repository has no project license.",
        "transforms": "Evaluated modifiers/world transforms; Blender (x,y,z) -> game (x,z,-y); split normals; linear vertex colors; 5-decimal quantization; indexed merge",
        "sourceSha256": digest(ROOT / "dustkite.blend"), "geometrySha256": digest(export_path),
        "scriptsSha256": {name: digest(ROOT/name) for name in ["create_scene.py", "export_geometry.py", "render_previews.py", "embed-geometry.js"]},
        "vertices": len(vertices)//3, "triangles": len(indices)//3,
        "bounds": {"min": [min(vertices[i::3]) for i in range(3)], "max": [max(vertices[i::3]) for i in range(3)]},
        "parts": parts,
        "validation": "See validation/report.json; physical-device qualification remains separate",
    }
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2)+"\n")
    print(json.dumps({key: manifest[key] for key in ["vertices", "triangles", "bounds", "geometrySha256"]}))


if __name__ == "__main__":
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / "dustkite.blend"))
    export()
