# Scenery implementation and verification

Recorded 2026-10-24T15:44:00.636957-04:00. Baseline Git revision: `0d0bf9ee079dc6901d873016e7add2496286f7a0`.
Final runtime SHA-256: `670ff6980eb6b76f266be6eecf0c6576d45ec5190c20c1b96c42c7c4bc8457bc`.

## Delivered

- All **32 original assets** have editable collections in `scenery.blend`, generation/export tooling, geometry, ground anchors, bounds, placement metadata, and hashed provenance. Total collection geometry: **6,204 triangles**. Largest small asset: 180 triangles; largest building/wreck: 528. Formatted embedding: **1,115,765 bytes**, below 2 MiB.
- Six deterministic site templates, a separate scenery random stream, rendered-triangle footprint sampling, full-footprint exclusions, buried bases, and bounded attempts. At most two buildings, 64 other instances, and 6,000 new triangles per region.
- Two fixed merged batches per region share the existing opaque material. Additional CPU attribute/index storage is exactly **17,100,000 bytes** across 25 regions. Minor scenery receives shadows without casting them. No new runtime requests or gameplay/collision behavior.
- [Labeled gallery](../previews/gallery.html), [desktop gallery image](../previews/gallery-chromium-desktop.png), four browser/layout galleries, 48 near/160 m site screenshots, and 12 unmodified normal-flight captures. Mobile gallery uses a responsive two-column layout.

## Automated and export evidence

- Full `WFS_DEV_PORT=18092 WFS_TEST_WORKERS=2 npm run validate:automated`: **250 passed, six container-only tests skipped**. Asset checks, formatting, lint, type checking, forbidden API inspection, and all three pinned dependency digests passed. See [full log](automated.log).
- After normalizing stored terrain slope evidence to Float32, **16 scenery tests passed** in desktop/emulated mobile Chromium and WebKit. The final fixed-hash regression added **four passing checks**, comparing all 81 scenery, terrain, and ruin region fixtures across those projects. See [scenery tests](scenery-tests.log), [hash checks](cross-browser-hashes.log), and [scenery fixtures](scenery-hashes.json).
- Tests cover flat/steep surfaces, all 32 asset choices and six templates, bounds/ground contact, corridor and ruin clearance, capacity limits, empty batches, fixed buffer identities, material/shadow behavior, forward/reverse travel, recycling, restart, quality changes, and origin rebasing.
- A fresh Blender process re-exported all 32 saved assets byte-for-byte: [fresh export](fresh-export.log). Shared exporter color-precedence regression: five test groups passed, including CORNER/POINT colors without materials and palette rejection/fallback: [log](export-colors.log).
- **11 malformed geometry/provenance cases rejected**: [guard evidence](export-guards.json). `scenery:check` verifies exact asset identities/categories, indices, unit normals, opaque RGB ranges, nondegenerate triangles, exact bounds, part ranges, metadata, per-asset/embedding budgets, source/tool hashes, and embedding consistency.
- Eight protected legacy source blocks remain byte-identical, including terrain/ruin generation, flight stepping, camera, restart, lifecycle, dependency loading, and quality logic: [source comparison](legacy-source-contracts.json). All 81 legacy terrain/ruin hashes match the baseline.

The earlier external-server attempt is retained under `attempts/`; it was interrupted after the default port was occupied by another project and an external-development-server workaround enabled container-only header checks. The isolated development-port run above resolved that configuration problem. Concurrent browser captures also encountered Chromium mobile full-page capture errors; the final responsive-gallery capture completed successfully. No runtime dependency or security checks were weakened.

## Local performance comparison

Host: Apple M2 Pro (Mac14,9), 16 GiB, macOS 26.6.2 build 25G83. Node 24.21.0 / npm 12.2.0 were installed (the project declares Node 24.22.1 / npm 12.2.1). Browser versions: Chromium 156.0.8078.4; WebKit 27.2. Both layouts below use 1280×720, DPR 1, headless automation. This is not the reference-device qualification environment.

Timing runs were sequential after the browser tests and paced memory runs. Chromium cold load uses 25 Mbps / 50 ms CDP shaping; WebKit is unthrottled. Transition timing includes 60 fixed simulation steps and read-only counters for each region transition; it is not an isolated GPU upload timer. Renderer counters below include the existing shadow passes. Independent shadow-disabled site captures observed **4–10 additional main-pass calls across the visible world**, with only two possible scenery meshes per region.

| Browser  | Cold controllable load | Transition p95 | Renderer calls | Renderer triangles | Frame median / p99           |
| -------- | ---------------------- | -------------- | -------------- | ------------------ | ---------------------------- |
| chromium | 767 → 1160 ms          | 6.9 → 7.5 ms   | 68 → 77        | 77,434 → 84,292    | 33.3 / 50.0 → 33.3 / 33.4 ms |
| webkit   | 349 → 359 ms           | 8.0 → 9.0 ms   | 68 → 77        | 77,434 → 84,292    | 17.0 / 18.0 → 17.0 / 18.0 ms |

Raw evidence: [baseline](before-performance.json), [expanded](after-performance.json), [site/main-pass comparison](visual-review.json). Each release-document run made exactly the same three dependency requests and reported no page errors.

The strict **60 FPS gate remains unmet in this local headless evidence** in both baseline and expanded worlds. Expanded Chromium reports `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)`; its median stays at roughly 30 FPS in both versions. WebKit reports Apple GPU and 17 ms median / 18 ms p99 in both versions, with all sampled frames below 33.3 ms, but that timer resolution does not establish the strict median ≥60 FPS gate. No scenery-attributable frame-cadence regression was observed; geometry/density remains within the tested limits. These results are not a performance release pass.

## Ten-minute paced traversal memory

Both runs used the existing maximum-speed workload: seed `0x13579bdf`, 120 seconds straight at full throttle, followed by six 80-second segments with one second of alternating ±0.05 roll. They advanced 36,000 fixed steps over at least 600 actual seconds, stayed flying, and crossed six origin rebases. These are separate browser processes; they were not used as uncontended frame-timing qualification. Raw CDP JS heap was sampled without forced garbage collection. GPU bytes and whole-process RSS were not measured; fixed CPU buffer accounting is reported separately.

| World    | Actual traversal | JS heap at minute 2 | JS heap at minute 10 | Growth | Accounted world buffers, unchanged |
| -------- | ---------------- | ------------------- | -------------------- | ------ | ---------------------------------- |
| Baseline | 601.9 s          | 8,683,360           | 8,600,652            | -0.95% | 6,217,900                          |
| Expanded | 600.6 s          | 11,464,836          | 11,689,812           | +1.96% | 23,317,900                         |

Both raw JS heap growth measurements satisfy the ≤10% local stability limit. Pool capacity and buffer identities remain bounded. See [baseline paced run](before-soak.json) and [expanded paced run](after-soak.json).

## Visual review and remaining qualification

The saved gallery makes each asset individually inspectable. Service stops, freight salvage, scrapyards, aircraft wrecks, industrial outposts, and rocky groves remain identifiable as clusters; buildings and wrecks carry the silhouettes at 160 m, while small debris becomes contextual detail. Sites remain sparse, with substantial open terrain. Template layouts can recur; yaw, uniform scale, choices, and terrain rejection vary their appearance. The existing dark sunset lighting and terrain palette remain unchanged. All six captured site descriptors, and the 81-region hash fixture, match across engines and layouts.

**Physical-device qualification: PENDING.** No physical Pixel 7, iPhone 13, reference M1 Mac, native Chrome/Safari acceptance, or hosted CI run was performed. Browser automation and emulated screenshots do not establish physical mobile performance. No commits, publication, or deployment were performed.
