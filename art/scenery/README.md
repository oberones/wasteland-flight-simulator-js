# Wasteland scenery

32 original, editable Blender assets supplement the four legacy ruins. All scenery is decorative: terrain, collisions, physics, controls, ruin descriptors, and the spawn landmark retain their existing contracts.

[Open the labeled gallery](previews/gallery.html) · [Gallery image](previews/gallery-chromium-desktop.png) · [Provenance and per-model budgets](manifest.json) · [Validation record](validation/REPORT.md)

## Collection

| Category      | Assets                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Flora (6)     | Bare branching tree, broken snag, fallen trunk, thorn scrub, hardy grass clump, sparse green shrub                                       |
| Buildings (5) | Collapsed warehouse, roadside service station, scrap shack, ruined hangar, damaged water tower                                           |
| Landscape (5) | Jagged outcrop, layered rock stack, boulder group, scree patch, fractured concrete slab field                                            |
| Wreckage (8)  | Crushed car, stripped van, burned bus, cargo truck, tanker trailer, freight wagon, broken aircraft fuselage, detached wing               |
| Debris (8)    | Corrugated sheet pile, bent girders, concrete rubble with rebar, pipe bundle, barrel cluster, tire pile, broken crates, engine machinery |

Geometry creates the damage: bent frames, torn roofs, open vehicle cabins, hollow torn fuselage, ruptured water tank, cracked wall profiles, exposed rebar, and broken wood. Flat faces and opaque linear vertex colors carry the rust, concrete, dark rock, dead wood, and muted green palette. No textures, external models, logos, animation, or runtime asset downloads are used. These are project-authored assets; the repository currently has no project-level license.

## Reproduce

Run from the repository root with Blender installed at the macOS path below (substitute your Blender executable on other hosts):

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 4 --python-exit-code 1 --python art/scenery/create_scene.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python-exit-code 1 --python art/scenery/export_geometry.py
npm run scenery:embed
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python-exit-code 1 --python art/scenery/render_previews.py
npm run scenery:check
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 4 --python-exit-code 1 --python art/scenery/export_geometry.py -- --check
node art/scenery/check-guards.js
npx playwright test tests/integration/scenery.spec.js --workers=2
node art/scenery/capture-browser.js
```

`scenery.blend` contains one named `*_EXPORT` collection per asset, with independently editable named mesh parts. Gallery origins are 60 m apart along Blender X. Collection properties store the label, category, batch, local ground anchor, embedding depth, maximum ground variation, and maximum slope. Editing the saved Blender source and exporting does not require regenerating it with `create_scene.py`.

`export_geometry.py` uses the established building export helper with unit dimensions: evaluated geometry, game-space meters `(x,z,-y)`, removed gallery offset, inverse-transpose split normals, active CORNER/POINT vertex colors before palette fallback, and five-decimal quantization. The scenery wrapper also rejects animation and nonopaque vertex colors. Positions, normals, colors, indices, named parts, bounds, and placement metadata go into `geometry.json`. The manifest hashes the source, geometry, generation/export/preview/embedding scripts, and the shared exporter. Re-export after editing any hashed tool.

Small assets are limited to 200 triangles; buildings and wrecks to 800. The complete formatted geometry block in `index.html` must fit 2 MiB. `scenery:check` rejects invalid indices, nonfinite values, nonunit normals, invalid colors, degenerate triangles, stale bounds, malformed part ranges, wrong category counts, invalid placement metadata, exceeded budgets, stale provenance, and embedding drift. Negative validator fixtures run in disposable copies.

## Sites and placement

Six templates compose a service stop, scrapyard, freight salvage site, aircraft crash, industrial outpost, and rocky scrub grove. The industrial outpost alternates warehouse/hangar anchors, with an optional water tower. Template details may be omitted on unsuitable ground. Debris concentrates around matching structures and wrecks; flora remains sparse.

The scenery PRNG uses region seed XOR `0x73636e79`, independently of terrain, ruins, and cracks. A region targets zero, one, or two sites with probabilities 25%, 55%, and 20%. Each site gets at most eight candidate locations; an unsuitable anchor rejects the attempt. Centers remain at least 130 m apart. Yaw is unrestricted and uniform scale stays near authored real-world dimensions (site 0.9–1.1; secondary pieces vary another 0.95–1.05).

Rotated full-geometry bounds, including overhangs, must remain within the owning 768 m region. They cannot intersect the existing spawn corridor (X ±180 m, Z −1200 through 160 m), or a legacy ruin footprint plus a 4 m margin. Major assets have at least 1 m separation from other instances; small debris can deliberately overlap other small pieces within an assembly.

Terrain checks use the rendered 24 m triangle grid, including every corner and triangle-diagonal intersection clipped to the conservative footprint. Both terrain triangle gradients in touched cells are checked. Slope evidence is quantized to Float32 so browser math-library rounding cannot change descriptor hashes. Ground extrema therefore do not rely on a center sample or on the analytic noise function. Placement subtracts a small embedding depth from the maximum sampled height. Variation is also capped by embedding depth minus the actual minimum geometry Y, so the lowest geometry cannot float above the lowest terrain sample. Buried foundations and rock bases cover allowed variation. No placements are forced when slopes or height variation fail.

## Runtime storage

Each of the 25 pooled regions owns two fixed indexed batches: major structures/wrecks/rocks (4,800 triangles) and minor flora/debris (1,200 triangles). The combined limit is 6,000 triangles, two buildings, and 64 other instances per region. Capacity checks reject additions before rendering. Allocation is a fixed 17,100,000 CPU attribute/index bytes across the pool, counted separately in metrics; GPU copies are additional implementation-owned storage.

Buffers allocate once and update only when a region is assigned. Recycling resets active ranges, visibility, boxes, and spheres, including empty regions. Both batches share the existing opaque ruin material. Major scenery casts and receives shadows; minor scenery only receives them. Main-pass overhead is at most two draws per visible region. No quality tiers, dependency URLs/digests, network allowlist, or production API boundaries change.

The webdriver-only facade exposes copied descriptors, content hashes, instance/triangle counts, placement samples, batch bounds, material/geometry/buffer identities, and allocated bytes through `region()`, `world()`, and `sceneryCatalog()`. `sceneryFixture()` exercises flat/steep synthetic surfaces without mutating the live world. Inspection-camera helpers are injected only by the capture script into served copies, never shipped in the runtime.

## Evidence

`measure-browser.js before|after` compares the recorded pre-scenery Git revision with the current document using 600 simulated seconds, both browser engines, a fixed seed, 81 legacy hash fixtures, cold controllable load, region-transition timing, renderer counts, and memory samples. Chromium cold loads use CDP 25 Mbps/50 ms shaping; WebKit cold loads are unthrottled. Add `--soak` for a Chromium traversal paced over 600 actual seconds. This local headless evidence does not qualify reference hardware or physical mobile performance.

`capture-browser.js` records the complete gallery, all six sites near and at 160 m, and unmodified normal-flight views in desktop and emulated mobile Chromium/WebKit. The aircraft and world are unchanged in flight captures; only site inspection copies replace the camera. Small props naturally read as clusters at flight altitude, while buildings and wreck silhouettes provide the site identity. Fixed layouts can recur at distant locations; yaw, scale, site selection, and terrain rejection vary their appearance.

For concurrent local work, `WFS_DEV_PORT=18092 WFS_TEST_WORKERS=2 npm run validate:automated` uses an isolated development server. `WFS_TEST_BASE_URL` is reserved for a real production container and enables its HTTP/security-header checks.
