# Implementation Plan: Wasteland Flight Simulator

**Branch**: `001-wasteland-flight-simulator` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-wasteland-flight-simulator/spec.md`

**Note**: This plan ends after research and design. `/speckit.tasks` creates the
dependency-ordered implementation work; this command does not implement the simulator.

## Summary

Deliver a free-flight 3D wasteland simulator whose entire shipped application—semantic
markup, CSS, shaders, scene construction, deterministic world generation, flight logic,
controls, HUD, and lifecycle—is contained in root `index.html`. The document retrieves
exactly two reviewed library artifacts from pinned jsDelivr URLs: Three.js `0.185.1`
`three.cjs` and the `simplex-noise` `4.0.3` ES module. It verifies each SHA-384 digest,
wraps the verified self-contained Three.js CommonJS export object in a local blob-module
adapter, imports both verified blob URLs, then builds the procedural world and a
Blender-authored glider from embedded geometry without external runtime assets.

The implementation uses a fixed 60 Hz pure simulation step, an in-memory session seed,
pooled terrain regions, merged ruin and glider geometry, bounded desktop and touch
virtual joysticks, reason-based pause state, adaptive cosmetic quality, and semantic HTML
overlays. Development-only test and evidence files remain outside `index.html`; they are
not part of the shipped runtime.

## Technical Context

**Language/Version**: HTML5, CSS, and browser-native ECMAScript 2023 modules; Node.js
20.20.2 and npm 10.8.2 for development tooling only
**Primary Dependencies**: Runtime—Three.js `0.185.1` and `simplex-noise` `4.0.3`, both
MIT-licensed and loaded from exact jsDelivr URLs; development—`@playwright/test` `1.62.1`
(Apache-2.0), ESLint `10.9.0` (MIT), TypeScript `7.0.2` (Apache-2.0), Prettier `3.9.6`
(MIT), and `http-server` `14.1.1` (MIT), all development-only and exact-lockfile resolved
**Storage**: In-memory state only; no cookies, local/session storage, IndexedDB, service
worker, telemetry, or server persistence
**Testing**: Playwright browser tests against Chromium and WebKit; deterministic
simulation fixtures exposed only under `navigator.webdriver`; ESLint; TypeScript
`checkJs`; dependency hash/license verification; real-device Chrome/Safari qualification
**Target Platform**: WebGL 2 browsers—current stable Chrome on desktop, Android, and iOS;
current stable Safari on macOS and iOS; mobile gameplay is landscape-only
**Project Type**: Single-document browser application with development-only test tooling
**Supported Environments**: Desktop 1024x576–2560x1440 at 100%, 150%, and 200% zoom;
mobile landscape 640x360–1366x1024 with safe-area insets; keyboard, optional desktop
pointer lock, and multi-touch controls
**Security & Privacy**: No user data or untrusted input; exact two-URL network allowlist;
SHA-384 verification before module evaluation; restrictive meta CSP; no URL/storage-driven
behavior; dependency license and vulnerability evidence required
**UX & Accessibility**: Semantic HTML status/actions; visible focus; keyboard-equivalent
desktop controls; 44x44 CSS-pixel touch targets; text plus non-color status cues; reduced
motion; loading, ready, flying, paused, crashed, dependency-error, retry, and portrait
rotation states
**Performance Goals**: Median ≥60 frames/s and 99% of frames ≤33.3 ms on each reference
environment; cold controllable load ≤5 s at 25 Mbps; 95% input-to-render response ≤100 ms;
≤10% steady-state memory growth from minute 2 through minute 10
**Constraints**: Root `index.html` is the only runtime artifact; exactly two external
runtime requests and no addons/external assets; fixed 60 Hz simulation; deterministic restarts;
terrain collision must match rendered terrain; mobile performance evidence must come
from physical devices rather than emulation
**Scale/Scope**: One player and one glider; 5x5 active terrain-region window; 768 m
regions with 33x33 height samples; at least three ruin clusters in a five-minute default
flight; ten-minute maximum-speed traversal; repeated crash/restart; no combat, missions,
checkpoints, landing, audio, persistence, multiplayer, gamepad, or ruin collision

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Research Gate

- **Code quality — PASS**: `index.html` remains physically singular but the inline module
  has explicit logical components: dependency loader, lifecycle reducer, seeded world,
  terrain/ruin renderer, aircraft simulation, input router, camera, ash, HUD, quality
  manager, and application coordinator. JSDoc contracts and development-only static
  checks prevent the single-file constraint from becoming unstructured global code.
- **Security — PASS**: The only trust boundary is two immutable CDN responses. Exact URLs,
  byte sizes, SHA-384 hashes, licenses, CSP, failure states, and a two-request network
  assertion are defined in [runtime-dependency-contract.md](./contracts/runtime-dependency-contract.md).
  The app reads no URL values, stored data, credentials, or personal data.
- **Testing — PASS**: Pure fixed-step behavior and seeded world functions are reachable
  through a frozen test-only API when `navigator.webdriver` is true. Playwright covers
  unit-level invariants, integration boundaries, and complete user journeys. Real mobile
  hardware remains mandatory for final Chrome/Safari and performance evidence.
- **User experience — PASS**: [ui-state-contract.md](./contracts/ui-state-contract.md)
  defines every lifecycle state, control mapping, HUD unit, focus behavior, portrait
  prompt, safe-area rule, reduced-motion rule, and keyboard/touch path.
- **Performance — PASS**: [performance-contract.md](./contracts/performance-contract.md)
  pins workloads, metrics, reference hardware classes, browser capture, preflight,
  adaptive-quality order, and fail-closed evidence rules for every specification budget.

### Post-Design Re-check

- **Code quality — PASS**: [data-model.md](./data-model.md) owns state and invariants;
  [simulation-contract.md](./contracts/simulation-contract.md) owns coordinates, commands,
  physics stepping, collision, restart, and deterministic fixture behavior. No additional
  runtime library or source file is needed.
- **Security — PASS**: The dependency contract contains concrete versioned URLs and
  SHA-384 values calculated from the reviewed CDN bytes. Retry never evaluates unverified
  code, and development tooling is excluded from runtime network assertions.
- **Testing — PASS**: [quickstart.md](./quickstart.md) separates automated emulation,
  actual Chrome/Safari compatibility, and physical-device qualification. Failing or
  missing device evidence blocks the corresponding claim.
- **User experience — PASS**: The state and input contracts cover manual, focus, and
  orientation pauses without automatic resume; all essential desktop and mobile actions
  have semantic controls and acceptance paths.
- **Performance — PASS**: Pooled regions, bounded geometry counts, manual geometry merge,
  origin rebasing, fixed time stepping, zero-allocation hot paths, bounded ash, and staged
  cosmetic degradation address the 60 frames/s and memory-growth gates without weakening
  simulation, collision, input, or HUD correctness.

No constitutional violations or exceptions are required.

## Project Structure

### Documentation (this feature)

```text
specs/001-wasteland-flight-simulator/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── performance-contract.md
│   ├── runtime-dependency-contract.md
│   ├── simulation-contract.md
│   └── ui-state-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md                         # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
index.html                           # Only shipped runtime artifact
art/glider/                          # Editable Blender source, scripts, previews, manifest, validation
package.json                         # Development commands and exact dev constraints
package-lock.json                    # Exact development dependency resolution
eslint.config.js                     # Development-only static rules
jsconfig.json                        # checkJs configuration for index.html
playwright.config.js                 # Automated browser projects and local server
tests/
├── helpers/
│   ├── flight-fixture.js            # Deterministic browser/test API driver
│   ├── metrics.js                   # Frame, input, memory, and network collection
│   └── runtime-dependencies.js      # Dependency manifest/security assertions
├── unit/
│   ├── flight-model.spec.js
│   ├── terrain.spec.js
│   ├── lifecycle.spec.js
│   └── input.spec.js
├── integration/
│   ├── dependency-loader.spec.js
│   ├── world-streaming.spec.js
│   ├── crash-restart.spec.js
│   └── responsive-controls.spec.js
└── e2e/
    ├── desktop-flight.spec.js
    ├── mobile-flight.spec.js
    ├── accessibility.spec.js
    └── performance.spec.js
evidence/                            # Generated/reviewed validation records, not runtime
├── README.md                        # Provenance, schemas, and review policy
├── dependency-manifest.json
├── environment-manifest.json
├── licenses/
├── security/
├── validation/
├── performance/
├── accessibility/
└── visual/
```

**Structure Decision**: The product remains one `index.html` exactly as requested. Test,
configuration, lockfile, and evidence files are development inputs only and are excluded
from the runtime package and runtime request count. The inline application code uses
classes, pure functions, frozen configuration, and explicit ownership boundaries rather
than external source modules.

## Design Overview

### Single-Document Composition

`index.html` contains, in order: metadata and restrictive CSP; all responsive CSS;
semantic loading/error/paused/crashed/HUD/control markup; one inline module loader; and
the application module. The loader fetches the two pinned artifact byte streams in
parallel and verifies their SHA-384 digests with Web Crypto. It UTF-8 decodes the verified
Three.js `three.cjs` bytes, prepends an owned `exports` object, appends a default ES-module
export, and imports that adapted blob; the verified simplex-noise bytes import directly
as a blob module. Application startup waits until both export objects pass shape checks.
World geometry, colors, shaders, UI icons, ash, and cracks are authored procedurally
or with CSS/SVG-like HTML primitives inside the document. The original Dustkite
glider is authored offline in Blender and embedded as indexed position, split-normal,
and linear-color arrays. Its editable sources and export tooling in `art/glider/`
are development inputs, never runtime requests.

The application module has no mutable globals except one private `Application` instance.
Subsystems exchange immutable command snapshots and owned state objects. `CONFIG` and
the dependency manifest are deeply frozen. A frozen `globalThis.__WFS_TEST__` facade is
installed only when `navigator.webdriver === true`; production sessions expose no reset,
seed, or mutation API.

### Lifecycle and Timing

The lifecycle reducer derives one presentation state from loading/error/crash status and
a set of pause reasons (`manual`, `focus`, `orientation`). Error and crash take priority;
portrait and focus reasons cannot be cleared by a generic resume. Returning focus or
landscape clears the environmental blocker but leaves `resumeRequired` until the player
activates Resume. Every pause clears keyboard keys, pointer displacement, active touch
IDs, and the simulation accumulator.

Three.js `renderer.setAnimationLoop` drives rendering. Active flight advances a 60 Hz
fixed-step accumulator with at most five simulation steps per rendered frame; excess
wall time is discarded rather than producing a collision-unsafe leap. Paused states
render only when presentation changes. HUD text refreshes at 10 Hz; frame metrics are
sampled without allocating in the hot loop.

### Deterministic Procedural World

A 32-bit session seed comes from `crypto.getRandomValues` after dependencies verify and
remains in memory through restarts. `mulberry32` supplies seeded values to
`createNoise2D` and to per-region ruin generation. Each region derives its random stream
from a stable hash of session seed and integer region coordinates, so creation order and
travel direction cannot change the world. Automated fixtures inject fixed seeds through
the webdriver-only facade.

The world maintains a 5x5 pool of 768 m terrain regions around the aircraft. Each region
uses a 33x33 shared-edge grid with multi-octave base noise plus ridged mountain noise;
vertex colors blend charcoal, dark earth, and rust. Sparse deterministic fracture lines
sit slightly above the mesh. Collision queries use barycentric interpolation of the same
stored triangle heights rendered by the region. Regions are generated synchronously
before they enter the collision horizon, then pooled and recycled without retaining
unbounded scene objects.

Eligible low-slope regions receive deterministic ruin descriptors. A local geometry
merger combines transformed box, cylinder, and custom damaged-prism buffers into one
opaque ruin mesh and one emissive-window mesh per region. Missing tiers, clipped roof
corners, irregular heights, and absent window bands create broken silhouettes. The safe
spawn corridor rejects ruin descriptors. Ruins remain non-colliding by specification.

Global coordinates use JavaScript numbers while render-space objects are rebased in
8,192 m increments. The HUD adds the accumulated origin offset, terrain keys remain
global, and rebasing moves pooled scene roots rather than mutating the deterministic
world definition.

### Glider, Camera, Atmosphere, and Shadows

The Dustkite glider uses one merged indexed buffer exported from its editable Blender
source: an open scrap ultralight with asymmetrically torn patchwork wings, exposed
tube supports, cockpit, static goggled pilot, and skeletal tail. Linear vertex colors
distinguish rust, soot, canvas, and patched metal without textures. Its single opaque,
double-sided material has roughness 0.85 and metalness 0.15. Export limits are 2,500
triangles, 750 KiB of formatted embedded geometry, and local bounds X ±8.5 m,
Y −1 to 2.5 m, Z −5.8 to 5.5 m. The exporter evaluates transforms/modifiers, preserves
split normals, converts Blender axes to +Y up/−Z forward, and deterministically
quantizes/deduplicates data. `npm run glider:check` verifies geometry, provenance
hashes, and embedding drift; fresh-process Blender re-export checks the saved source.
Front/side/rear previews and Chromium/WebKit desktop/mobile screenshots accompany
the asset; emulated mobile checks do not replace physical-device qualification.
The glider, terrain, and nearby opaque ruin bodies cast or receive shadows. A warm ambient light and one orange directional light create the sunset; the
directional shadow volume follows the glider and snaps to texel increments to limit shimmer.

Scene background and linear fog use `#3d2817`. A pooled point field recycles falling ash
around the aircraft; mobile/reduced-motion profiles reduce count and drift but do not
remove the atmospheric cue. The chase camera uses an exact glider-local behind/above
mount, forward look target, and aircraft-relative up vector so steering cannot make the
view lag or orbit around the glider; the scene horizon supplies the attitude cue without
secondary camera motion.

### Flight Model and Collision

The fixed-step model stores position, quaternion orientation, scalar airspeed, vertical
velocity, throttle, stall state, and prior collision sample. Throttle maps to bounded
forward acceleration; quadratic drag opposes speed; lift scales with squared speed and
aircraft-up alignment; gravity remains 9.81 m/s². Low speed ramps lift down, adds a gentle
nose-down recovery moment, and enters a recoverable stall. Released pitch and roll decay
toward level through weak self-stabilization. Bank angle couples to heading so the glider
turns without a separate yaw control. There are no spins, damage, fuel, or ruin collisions.

The baseline tuning table is owned by the simulation contract: 55 m/s spawn speed,
20–95 m/s bounds, 30 m/s stall entry, 38 m/s recovery, 45°/s pitch command, 75°/s roll
command, 160 m spawn clearance, and 2 m aircraft collision clearance. Collision samples
each fixed-step path against rendered terrain heights; zero or negative clearance clamps
the glider to the surface and transitions once to crashed. Restart rebuilds aircraft,
camera, input, HUD, and accumulator state without changing the session seed or world pool.

### Controls, HUD, and Responsive UI

Keyboard, pointer, and touch adapters feed one normalized `ControlFrame`. Keyboard uses
the specified throttle and arrow mappings; `P` pauses/resumes, `R` restarts when crashed,
`Enter` activates the focused primary action, and `Escape` releases pointer lock. Desktop
pointer input integrates relative motion into a visible bounded virtual-stick offset;
center is neutral. Touch uses a bounded pitch/roll stick plus separate throttle buttons
and semantic Pause, Resume, Restart, and Retry buttons. Pointer IDs allow throttle and
pitch/roll touches concurrently; cancellation clears only owned inputs.

The visual HUD shows speed in km/h, clearance in meters, and global X/Y/Z meters at 10 Hz.
Labels remain ordinary HTML text; status changes use a dedicated polite/urgent live region
rather than announcing numeric HUD updates continuously. CSS env safe-area insets protect
mobile controls. Portrait replaces flight controls with a non-color-only rotate prompt,
adds the orientation pause reason, and never resumes automatically after returning landscape.

### Performance and Adaptive Quality

Hot-loop code reuses vectors, quaternions, arrays, region groups, ruin buffers, ash points,
and HUD strings where values have not changed. No per-frame object, DOM, geometry, or
material creation is allowed. Region generation runs only on integer-region transitions
and is bounded to the missing edge row/column. Renderer pixel ratio is capped by profile.

Quality degradation uses hysteresis after three continuous seconds below 45 frames/s:
first reduce ash count, then shadow-map size/distance, then ruin window density, then cap
render pixel ratio. It never changes fixed-step timing, terrain collision heights, control
response, HUD cadence, or lifecycle behavior. Recovery requires ten seconds above 58
frames/s and restores one cosmetic tier at a time. Every transition is recorded in the
performance evidence stream without transmitting data.

### Verification Strategy

Playwright drives Chromium and WebKit desktop and emulated mobile viewports. Unit-style
tests call the webdriver-only pure simulation and world seams; integration tests intercept
dependency responses, alter hashes, cancel touches, cross region boundaries, induce
stalls/crashes, and repeat restart. End-to-end tests cover all four user stories, lifecycle
states, 200% desktop zoom, safe areas, portrait recovery, reduced motion, and network
allowlisting. Accessibility combines automated semantic checks with keyboard/touch and
screen-reader-oriented manual review.

Allocation-conscious frame, input, memory, renderer, and pool sampling is established in
the shared test foundation before story execution. US1 owns input-response smoke evidence;
US2 owns traversal memory and adaptive-quality behavior; US3 owns restart timing; and US4
owns loading and touch-response smoke evidence. Final qualification extends and aggregates
those story checks rather than introducing story-specific implementation after checkpoints.

Emulation is not performance evidence. Release qualification runs the performance
contract on one Apple M1 8-core/16 GiB Mac on AC power at 1920x1080, one physical Pixel 7,
and one physical iPhone 13. Exact OS/browser builds, thermal/power state, DPR, viewport,
dependency hashes, commit, and workload are captured. Missing preflight data, unavailable
hardware, failed budgets, or a changed dependency hash blocks the associated release claim.

## Phase 0: Research Outcomes

All technical unknowns are resolved in [research.md](./research.md). The decisions pin
runtime versions and hashes, justify verified blob imports and the reviewed CommonJS
adapter required by the current Three.js package layout, select WebGL 2 and fixed-step
custom physics, define deterministic generation and region pooling, choose responsive
input/lifecycle patterns, and establish the automated/physical-device validation split.

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md) defines owned state, fields, invariants, relationships,
  lifecycle transitions, validation rules, and deterministic fixtures.
- [simulation-contract.md](./contracts/simulation-contract.md) fixes units, coordinates,
  commands, tuning, stepping, collision, restart, origin rebasing, and test facade behavior.
- [ui-state-contract.md](./contracts/ui-state-contract.md) fixes lifecycle presentation,
  controls, HUD, focus, orientation, accessibility, and responsive behavior.
- [runtime-dependency-contract.md](./contracts/runtime-dependency-contract.md) fixes exact
  requests, integrity, CSP, error/retry behavior, licenses, and the network assertion.
- [performance-contract.md](./contracts/performance-contract.md) fixes reference hardware,
  workloads, metrics, adaptive quality, evidence shape, and fail-closed qualification.
- [quickstart.md](./quickstart.md) defines the implementation-time local, automated,
  responsive, security, accessibility, and physical-device validation workflow.
- `AGENTS.md` points contributors to this plan as the current technology and structure authority.

## Complexity Tracking

No Constitution Check violations require justification. The single-file runtime is an
explicit product constraint; logical component boundaries, verified loader complexity,
development-only tests, and evidence contracts are the minimum structure needed to meet
that constraint without weakening security, testability, accessibility, or performance.
