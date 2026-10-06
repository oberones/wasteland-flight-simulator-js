"""Check both exporters with real Blender color attributes and material fallbacks.

Run from the repository root:
Blender --background --factory-startup --threads 4 --python-exit-code 1 --python tests/blender/export-colors.py
"""

import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import bpy

ROOT = Path(__file__).resolve().parents[2]
PALETTE = (.125, .25, .5, 1)
COLORS = [(1, 0, 0, 1), (0, 1, 0, 1), (0, 0, 1, 1),
          (.25, .5, .75, 1), (.5, .75, .25, 1), (.75, .25, .5, 1)]


def load_exporter(asset):
    """Import an exporter without opening or modifying the delivered asset."""
    spec = importlib.util.spec_from_file_location(asset, ROOT / "art" / asset / "export_geometry.py")
    module = importlib.util.module_from_spec(spec)
    with patch.object(sys, "dont_write_bytecode", True):
        spec.loader.exec_module(module)
    return module


EXPORTERS = {asset: load_exporter(asset) for asset in ["glider", "buildings"]}


def fixture(domain, material):
    """Create two triangles whose shared vertices have distinct corner colors."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    collection = bpy.data.collections.new("Dustkite_EXPORT")
    bpy.context.scene.collection.children.link(collection)
    mesh = bpy.data.meshes.new("color_fixture")
    mesh.from_pydata([(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)], [],
                     [(0, 1, 2), (0, 2, 3)])
    collection.objects.link(bpy.data.objects.new("color_fixture", mesh))
    if material:
        palette = bpy.data.materials.new("palette")
        palette.use_nodes = True
        shader = palette.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = PALETTE
        if material == "unsupported":
            shader.inputs["Alpha"].default_value = .5
        mesh.materials.append(palette)
    if domain:
        attr = mesh.color_attributes.new(name="authored_color", type="FLOAT_COLOR", domain=domain)
        mesh.color_attributes.active_color = attr
        for item, rgba in zip(attr.data, COLORS):
            item.color = rgba
    bpy.context.view_layer.update()
    return collection


def expected_geometry(domain):
    """Describe the fixture after the documented Blender-to-game axis conversion."""
    points = [(0, 0, 0), (1, 0, 0), (1, 0, -1), (0, 0, -1)]
    order = [0, 1, 2, 0, 2, 3] if domain == "CORNER" else [0, 1, 2, 3]
    colors = COLORS[:len(order)] if domain else [PALETTE] * len(order)
    return {
        "positions": [float(v) if v else 0 for i in order for v in points[i]],
        "normals": [0, 1.0, 0] * len(order),
        "colors": [float(v) if v else 0 for rgba in colors for v in rgba[:3]],
        "indices": [0, 1, 2, 3, 4, 5] if domain == "CORNER" else [0, 1, 2, 0, 2, 3],
    }


class ExportColors(unittest.TestCase):
    """Exercise vertex-color precedence and the palette-only fallback in both assets."""

    def check_export(self, asset, domain, material):
        """Compare a real evaluated export to known geometry without touching assets."""
        collection = fixture(domain, material)
        exporter = EXPORTERS[asset]
        expected = expected_geometry(domain)
        if asset == "buildings":
            actual = exporter.export_collection(collection, (1, 1, 1), 0)
            self.assertEqual({key: actual[key] for key in expected}, expected)
        else:
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                (root / "geometry.json").write_text(json.dumps(expected, separators=(",", ":")) + "\n")
                with patch.object(exporter, "ROOT", root), patch.object(sys, "argv", ["export", "--check"]):
                    exporter.export()

    def test_vertex_colors_without_materials(self):
        """Both supported attribute domains work with zero material slots."""
        for asset in EXPORTERS:
            for domain in ["CORNER", "POINT"]:
                with self.subTest(asset=asset, domain=domain):
                    self.check_export(asset, domain, None)

    def test_vertex_colors_override_materials(self):
        """Active colors override palettes and bypass unused material validation."""
        for asset in EXPORTERS:
            for domain in ["CORNER", "POINT"]:
                for material in ["palette", "unsupported"]:
                    with self.subTest(asset=asset, domain=domain, material=material):
                        self.check_export(asset, domain, material)

    def test_palette_fallback(self):
        """Meshes without active colors still export their palette material."""
        for asset in EXPORTERS:
            with self.subTest(asset=asset):
                self.check_export(asset, None, "palette")

    def test_missing_palette_rejected(self):
        """Meshes with neither source of color cannot silently export a default."""
        for asset in EXPORTERS:
            with self.subTest(asset=asset), self.assertRaises(IndexError):
                self.check_export(asset, None, None)

    def test_unsupported_palette_rejected(self):
        """Palette validation remains active when no vertex colors replace it."""
        for asset in EXPORTERS:
            with self.subTest(asset=asset), self.assertRaisesRegex(ValueError, "opaque|Transparent"):
                self.check_export(asset, None, "unsupported")


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ExportColors)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise RuntimeError("Blender exporter color regression checks failed")
