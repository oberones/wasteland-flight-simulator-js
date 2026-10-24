# Phase 0 Research: Wasteland Flight Simulator

**Date**: 2026-08-21
**Feature**: [spec.md](./spec.md)

## Runtime Libraries and Delivery

**Decision (updated 2026-10-24)**: Pin Three.js `0.186.1` and simplex-noise `4.0.3`.
Use the official `three.module.js`, `three.core.js`, and simplex-noise ESM artifacts.
The user approved expanding the runtime budget from two to three requests for this migration.

**Rationale**: Three.js 0.186.x replaces the standalone CommonJS build with a Node-only
shim calling `process.emitWarning` and `require('./three.module.js')`. It cannot run in
the former browser adapter. The official ESM renderer has exactly two static references
to its core module; both can be linked to one verified blob without additional requests.
The authored merger, seeded PRNG, deterministic terrain, and no-addons boundary remain.

**Primary sources**:

- [Three.js npm package](https://www.npmjs.com/package/three?activeTab=versions)
- [Three.js CDN installation guide](https://threejs.org/manual/en/installation.html)
- [Three.js WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html)
- [simplex-noise npm package](https://www.npmjs.com/package/simplex-noise)
- [simplex-noise 4.0.3 release](https://github.com/jwagner/simplex-noise.js/releases/tag/4.0.3)

## Development Tooling Baseline

**Decision**: Pin `@playwright/test` `1.64.1` (Apache-2.0), ESLint `10.13.0` (MIT),
TypeScript `7.0.2` (Apache-2.0), Prettier `3.9.10` (MIT), and `http-server` `14.1.1`
(MIT), `@types/node` `24.19.2`, `semver` `7.8.5`, and `@types/semver` `7.8.0` (MIT) as exact development-only dependencies in `package.json` and `package-lock.json`.
Review the complete lockfile license and vulnerability surface before release, not only
the three runtime CDN artifacts.

**Rationale**: These reviewed 2026-10-24 registry releases cover browser automation,
linting, strict JavaScript analysis, formatting, and deterministic local static serving.
Exact package and lockfile versions keep development checks reproducible. None of these
packages is imported by `index.html` or changes the three-request runtime boundary.

**Primary sources**:

- [Playwright test package](https://www.npmjs.com/package/@playwright/test)
- [ESLint package](https://www.npmjs.com/package/eslint)
- [TypeScript package](https://www.npmjs.com/package/typescript)
- [Prettier package](https://www.npmjs.com/package/prettier)
- [http-server package](https://www.npmjs.com/package/http-server)

## Dependency Integrity and Failure Isolation

**Decision**: Fetch and hash all three raw byte streams before evaluation. Validate the
reviewed static import graph, create a verified core blob, and replace only the two
approved renderer core references with that blob URL. Import namespaces, check required
exports, and revoke all URLs after all imports settle. Keep the existing restrictive CSP.

**Rationale**: This supports current Three.js while preserving integrity before evaluation,
the one-document delivery, and an exact three-request allowlist. Unexpected graph edges,
redirects, bad hashes, invalid exports, and failed imports remain controlled failures.
Retry always uses the same three reviewed URLs. Direct CDN imports or import maps alone
would not establish the required integrity boundary.

**Verified artifacts**:

| Artifact      | Version | License | Exact URL                                                                    | Expected bytes | SHA-384 (hex)                                                                                      |
| ------------- | ------- | ------- | ---------------------------------------------------------------------------- | -------------: | -------------------------------------------------------------------------------------------------- |
| Three.js      | 0.186.1 | MIT     | `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js`           |         662772 | `9bc268157e7657a346bf6bac8a99e52c92a725f2fb204f1d6e788f0c309219242fdc79b89fa3e37d5eacc95c1fba845c` |
| simplex-noise | 4.0.3   | MIT     | `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js` |          18735 | `5666e8c9abefc5348abc53555ae66de04d4a6364d29cbd6966cc6df76a0579bf1de23a85682b9e49f120471447f235a2` |
| Three.js core | 0.186.1 | MIT     | `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.core.js`             |        1458113 | `99d29e0b03c471b0efcdac70866f8c56e2e8328bbe13b8d0aabb38b66bbf9fc1c160f188d6466dd0c909c65311e3314c` |

## Renderer and Capability Baseline

**Decision**: Use `THREE.WebGLRenderer` with WebGL 2, `setAnimationLoop`, antialiasing,
high-performance preference, capped device pixel ratio, enabled PCF shadows, sRGB output,
and fog. Detect renderer creation/capability failure locally and route it to the same
recoverable error presentation without fetching an addon.

**Rationale**: Current Three.js `WebGLRenderer` uses WebGL 2 and exposes shadow-map,
capability, render-call, triangle, geometry, and texture information needed by this plan.
The required browser matrix supports WebGL 2 on suitable hardware, and the feature does
not benefit from a WebGPU-only path that would split rendering and testing.

**Alternatives considered**:

- WebGPU was rejected because it is not the common supported baseline across the accepted
  Chrome/Safari desktop/mobile matrix.
- A separate Three.js WebGL capability addon was rejected because a direct context test
  and caught renderer construction provide the required error state without another request.
- Logarithmic depth was rejected because origin rebasing bounds scene coordinates and the
  renderer documentation warns that logarithmic depth can reduce early-fragment performance.

## Single-Document Architecture and Testability

**Decision**: Keep one inline application module but enforce explicit component classes,
pure state transitions, frozen configuration, owned mutable buffers, and a webdriver-only
frozen test facade. Keep all tests, lint configuration, lockfiles, and evidence outside
the shipped runtime.

**Rationale**: Splitting production modules would violate the single-document request,
while unstructured global code would violate the constitution. Logical modules preserve
reviewability. Playwright can exercise pure functions and full browser behavior through
the same code path without creating alternate runtime implementations.

**Alternatives considered**:

- A build step that bundles multiple source modules was rejected because the requested
  artifact is directly authored and runnable as `index.html`, not generated output.
- Duplicating physics in test files was rejected because preview, collision, HUD, and
  acceptance tests must share one implementation.
- A production debug API was rejected; the test facade exists only when browser automation
  is explicitly detectable and exposes cloned snapshots rather than subsystem references.

## Deterministic World Generation and Streaming

**Decision**: Use an in-memory crypto-generated session seed, local `mulberry32`, a
stable integer hash per region, one `createNoise2D` instance, a pooled 5x5 region window,
33x33 shared-edge height samples per 768 m region, and 8,192 m origin rebasing.

**Rationale**: Stable region-derived streams make results independent of traversal order;
restart preserves the world without persistence. The bounded pool prevents memory growth,
while shared global sampling eliminates seams. Origin rebasing keeps render coordinates
precise during long forward travel while HUD coordinates remain global.

**Alternatives considered**:

- `Math.random()` was rejected because restart, test replay, and region ordering would be
  nondeterministic.
- A finite map or wraparound was rejected because the player must not encounter a visible edge.
- Background workers were rejected because they complicate the one-file CSP and introduce
  asynchronous collision gaps; the bounded region geometry is small enough for synchronous
  edge-row generation outside the per-frame hot path.
- Collision against the continuous noise function was rejected because it can diverge
  from the rendered triangle surface. Collision interpolates the stored rendered heights.

## Procedural Geometry and Visual Direction

**Decision**: Generate terrain, fracture lines, ruins, emissive windows, and ash
procedurally. Author the Dustkite glider offline in Blender and embed its merged
geometry in the document, without external textures or models. Merge owned position/normal/color/index buffers locally;
reuse materials and pool scene groups. Use `#3d2817` background/fog, charcoal/rust vertex
colors, warm ambient/directional light, and shadow-casting opaque geometry.

**Rationale**: Procedural world buffers and offline-authored embedded aircraft geometry
meet the visual request and external-asset ban.
Merged per-region meshes bound draw calls; tattered custom wing triangles and damaged
ruin prisms create recognizable silhouettes without runtime images. One points buffer
provides ash with bounded cost.

**Alternatives considered**:

- Textures, models, fonts, and sprite sheets were rejected as external asset dependencies.
- One mesh per building/window was rejected because the draw-call growth conflicts with
  mobile performance budgets.
- Fully custom terrain shaders were rejected for the first slice because vertex colors,
  standard lit materials, fracture lines, fog, and shadows satisfy the requested look
  with simpler cross-browser behavior.

## Flight Model and Time Integration

**Decision**: Use custom forgiving glider physics at a fixed 60 Hz: bounded scalar
airspeed, quaternion attitude, gravity, speed-squared lift, quadratic drag, pitch/roll
rates, bank-to-heading coupling, weak self-leveling, and a recoverable low-speed stall.
Use at most five substeps per render and discard excess wall time.

**Rationale**: The accepted clarification requires understandable arcade handling, not
rigid-body simulation. Fixed steps make input, stall, collision, restart, and fixtures
deterministic across render rates. Five bounded substeps handle short jank without a
terrain-tunneling leap or an unbounded catch-up spiral.

**Alternatives considered**:

- A third-party physics engine was rejected as a third runtime dependency and excessive
  complexity for one aircraft and terrain-only collision.
- Variable-delta integration was rejected because browser jank would change handling and
  collision outcomes.
- Hard stalls, spins, damage, and aerodynamic surface simulation were rejected by the
  forgiving-handling clarification and explicit feature scope.

## Input, Lifecycle, and Accessibility

**Decision**: Normalize keyboard, desktop relative-pointer, and multi-touch adapters into
one bounded control frame. Model pause as a set of reasons with deliberate resume. Use
semantic HTML for all status/actions, ordinary labeled HUD text, a dedicated live region,
safe-area-aware touch controls, and a portrait rotate prompt.

**Rationale**: A single normalized path keeps flight behavior consistent and testable.
Reason-based pause prevents returning focus or landscape from bypassing another blocker.
Semantic overlays provide focus, names, state, and recovery independent of the 3D canvas.

**Alternatives considered**:

- Device-specific physics paths were rejected because they would drift.
- Automatic resume was rejected by clarification and could cause unattended crashes.
- Continuous live announcement of 10 Hz HUD values was rejected because it would overwhelm
  assistive technology; status changes are announced, while HUD labels remain inspectable text.
- Portrait gameplay was rejected by clarification; portrait is a supported paused state.

## Performance Qualification

**Decision**: Qualify release-equivalent `index.html` on one Apple M1 8-core/16 GiB Mac
at 1920x1080 on AC power, one physical Pixel 7, and one physical iPhone 13. Record exact
OS/browser versions, viewport/DPR, power/thermal state, dependency hashes, commit, profile,
and workload. Use emulation only for earlier functional checks.

**Rationale**: Relative throttling and desktop mobile emulation cannot prove actual GPU,
touch, safe-area, Safari, or thermal behavior. Exact evidence and fail-closed preflight
make the 60 frames/s, latency, load, and memory claims reproducible and honest.

**Alternatives considered**:

- “Modern desktop/mobile” without named references was rejected as non-reproducible.
- Browser emulation as final evidence was rejected because it does not reproduce device
  GPU, memory pressure, thermal throttling, or mobile browser chrome.
- Lowering simulation cadence or HUD correctness under load was rejected; adaptive quality
  may reduce only ash, shadows, emissive window density, and render pixel ratio.

## Scope Decisions

**Decision**: Plan only the accepted free-flight feature. Do not add combat/shooting,
interactive landmarks/checkpoints, missions, landing, fuel, audio, persistence, multiplayer,
gamepad, or ruin collision.

**Rationale**: These systems change user journeys, controls, state, collision, content,
performance, and testing. The specification explicitly defers them, and the user's trailing
questions are offers for later scope rather than authorization to include them now.

**Alternatives considered**: Adding placeholders or dormant systems was rejected because
unused complexity would violate the constitution and obscure completion of the requested slice.

## Blender building graphics

The four-model building replacement follows the glider's offline Blender-to-inline-buffer
workflow. Separate body/window exports retain the two meshes per pooled region, with
fixed-capacity reusable attributes and indices. Named panel boundaries replace the old
36-index box assumption in adaptive window density. Existing seeded ruin descriptors
are retained verbatim; model choice and rotation use an independent hash. See
`art/buildings/README.md` for source, budgets, regeneration, and evidence limitations.
