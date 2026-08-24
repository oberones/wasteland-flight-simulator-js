# Tasks: Wasteland Flight Simulator

**Input**: Design documents from `/specs/001-wasteland-flight-simulator/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`,
`quickstart.md`

**Tests**: Automated tests are required by QR-001 through QR-006. Define story tests
before implementation, use the webdriver-only production code path, and record manual
evidence where browser automation cannot establish visual, accessibility, physical-device,
security-review, or performance claims.

**Organization**: Tasks are grouped by user story. Root `index.html` is the only shipped
runtime artifact; every other file below is development tooling, test code, documentation,
or release evidence.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it uses a different file and has no dependency on
  another incomplete task in its phase.
- **[Story]**: Maps the task to US1, US2, US3, or US4.
- Every task names the exact file or evidence path it changes.

## Phase 1: Setup (Shared Development Infrastructure)

**Purpose**: Establish exact development tooling without adding runtime dependencies or
additional shipped files.

- [x] T001 Create `package.json` with the Node.js 20.20.2 baseline; exact development-only `@playwright/test` 1.62.1, ESLint 10.9.0, TypeScript 7.0.2, Prettier 3.9.6, and `http-server` 14.1.1 dependencies; and the command names defined in `specs/001-wasteland-flight-simulator/quickstart.md`
- [x] T002 Generate and review the exact development dependency resolution in `package-lock.json`, confirming all packages remain development-only and match the versions and licenses recorded in `specs/001-wasteland-flight-simulator/research.md`
- [x] T003 [P] Configure browser-code linting, security-sensitive API restrictions, and zero-warning enforcement in `eslint.config.js`
- [x] T004 [P] Configure ECMAScript 2023 browser libraries, strict `checkJs`, and no emitted output for `index.html` in `jsconfig.json`
- [x] T005 [P] Configure Chromium and WebKit desktop/mobile projects, deterministic local serving on `127.0.0.1:4173`, traces, and no silent project skips in `playwright.config.js`
- [x] T006 [P] Document evidence provenance, generated-versus-reviewed files, schema versioning, and fail-closed release rules in `evidence/README.md`

**Checkpoint**: Development commands resolve from an exact lockfile, and none of the
setup files are part of the shipped runtime.

---

## Phase 2: Foundational Runtime (Blocks All User Stories)

**Purpose**: Build and test the secure single-document shell, dependency boundary,
lifecycle authority, renderer, and deterministic test seam required by every story.

**Critical**: No user-story implementation begins until this phase passes.

### Foundational Tests

- [x] T007 [P] Implement exact URL, byte-count, SHA-384, export-shape, license, CSP, and two-request manifest assertions in `tests/helpers/runtime-dependencies.js`
- [x] T008 [P] Write dependency-loader integration tests for success, redirect, timeout, HTTP error, truncation, oversize, mutation, parse failure, missing export, controlled diagnostics, explicit Retry, and duplicate cleanup in `tests/integration/dependency-loader.spec.js`
- [x] T009 [P] Write lifecycle reducer tests for state priority, pause reasons, neutral input, deliberate resume, crash precedence, retry, and idempotent transitions in `tests/unit/lifecycle.spec.js`

### Foundational Implementation

- [x] T010 Create the semantic loading, ready, pause, crash, error, HUD, legend, and control markup; restrictive meta CSP; data favicon; responsive style foundation; and embedded dependency notices in `index.html`
- [x] T011 Implement the exact two-URL parallel loader with capability checks, omitted credentials, timeout/size/redirect guards, SHA-384 verification, verified blob imports, export shape checks, blob revocation, and fail-closed cleanup in `index.html`
- [x] T012 Implement frozen configuration, `ApplicationState`, reason-based lifecycle transitions, owned listener teardown, controlled public error codes, and the webdriver-only frozen facade boundary in `index.html`
- [x] T013 Implement WebGL 2 renderer construction, shadow support, color management, resize/DPR handling, `setAnimationLoop`, fixed-step accumulation, render gating, and controlled context failure in `index.html`
- [x] T014 Implement cloned snapshots, validated fixture reset/step calls, lifecycle dispatch, terrain hooks, and metric access in `tests/helpers/flight-fixture.js`, plus allocation-conscious base frame, input-response, memory, renderer, pool, and object-count sampling in `tests/helpers/metrics.js`
- [x] T015 Run the foundational dependency and lifecycle suites in Chromium and WebKit and record commands, versions, results, console output status, and request counts in `evidence/validation/foundation.md`

**Checkpoint**: The page fails closed or reaches a renderer-backed ready state; no partial
flight starts, no unapproved request occurs, and tests can observe state without mutating it.

---

## Phase 3: User Story 1 - Fly the Makeshift Glider (Priority: P1) MVP

**Goal**: Deliver a visible low-poly glider that continuously flies over a simple
deterministic surface with bounded throttle, pitch, roll, forgiving stalls, and a stable
third-person chase camera through keyboard, pointer, and basic landscape touch input.

**Independent Test**: Start the verified page with the `level-flight` and
`stall-recovery` fixtures; separately use keyboard, enabled pointer control, and touch
controls for two minutes; verify forward motion, simultaneous axes, bounds, gravity,
lift, drag, stall recovery, self-stabilization, and chase-camera tracking.

### Tests for User Story 1

- [x] T016 [P] [US1] Write deterministic fixed-step tests for spawn, throttle/speed bounds, pitch/roll rates, gravity, lift, drag, level stability, stall hysteresis/recovery, finite state, and render-cadence independence in `tests/unit/flight-model.spec.js`
- [x] T017 [P] [US1] Write keyboard, bounded pointer-stick, touch-stick, throttle-touch, opposing-input, simultaneous-axis, cancellation, and neutral-frame tests in `tests/unit/input.spec.js`
- [x] T018 [P] [US1] Write the two-minute keyboard and pointer flight journey, explicit pointer activation/centering/release, glider visibility, chase-camera assertions, and a smoke check that at least 95% of desktop input-to-render markers complete within 100 ms in `tests/e2e/desktop-flight.spec.js`
- [x] T019 [P] [US1] Write the basic landscape touch-only flight journey with simultaneous joystick and throttle input in `tests/e2e/mobile-flight.spec.js`

### Implementation for User Story 1

- [x] T020 [US1] Define the frozen flight tuning table, `FlightSession`, `AircraftState`, `ControlState`, `ControlFrame`, vector/quaternion ownership, and a deterministic flat `TerrainSampler` MVP in `index.html`
- [x] T021 [US1] Implement the 60 Hz glider step with thrust response, quadratic drag, gravity, speed-squared lift, quaternion pitch/roll, bank-to-heading coupling, weak self-leveling, stall hysteresis, recovery moment, finite checks, and bounded motion in `index.html`
- [x] T022 [US1] Implement normalized keyboard, bounded relative-pointer, and pointer-ID touch adapters with simultaneous input, opposing-input cancellation, explicit pointer activation/release, and neutral cleanup in `index.html`
- [x] T023 [US1] Build and manually merge the scrap-metal body, two exposed pipe supports, asymmetrically tattered wings, soot/rust vertex colors, and shadow flags into one low-poly glider in `index.html`
- [x] T024 [US1] Implement the fixed glider-local behind-and-above chase camera, forward look target, aircraft-relative up vector, no-orbit ordinary maneuvering, and restart-safe camera state in `index.html`
- [x] T025 [US1] Integrate normalized controls, fixed-step flight, glider transforms, chase rendering, session timing, and the `level-flight` and `stall-recovery` facade fixtures in `index.html`
- [x] T026 [US1] Run the US1 unit and Chromium/WebKit journey suites and record seed, command-stream, expected/actual terminal state, tolerances, input-response percentile against the 100 ms budget, and results in `evidence/validation/us1-flight.md`
- [x] T027 [US1] Have a trained evaluator fly for five minutes, change altitude and heading, recover three intentionally induced stalls, and avoid terrain without invalid state or unintended control loss while reviewing the glider silhouette, wings, pipes, controls, and camera; save timings, outcomes, captures, and findings in `evidence/visual/us1-flight.md`

**Checkpoint**: US1 is a playable and independently demonstrable flight MVP over the
simple deterministic ground surface.

---

## Phase 4: User Story 2 - Traverse the Procedural Wasteland (Priority: P2)

**Goal**: Replace the MVP surface with a deterministic, continuously streamed wasteland
of cracked charcoal/rust terrain, mountains, ruins, windows, fog, sunset shadows, and ash.

**Independent Test**: Use `region-seam` and `origin-rebase`, then fly the maximum-speed
route for ten minutes; verify shared edges, rendered-height collision queries, bounded
5x5 pooling, stable descriptors, origin continuity, required ruin encounters, coherent
atmosphere, and no visible world edge or duplicate scenery.

### Tests for User Story 2

- [x] T028 [P] [US2] Write deterministic terrain tests for global height sampling, shared-edge byte equality, barycentric rendered-surface height, crack isolation, slope classification, spawn exclusion, ruin density, and descriptor hashes in `tests/unit/terrain.spec.js`
- [x] T029 [P] [US2] Write region streaming tests for the 5x5 active map, bounded recycling, collision-horizon readiness, direction-independent regeneration, restart stability, origin rebasing, and duplicate prevention in `tests/integration/world-streaming.spec.js`
- [x] T030 [P] [US2] Write the deterministic maximum-speed ten-minute traversal smoke scenario with region, pool, descriptor, rebase, scene-count, gap, memory-growth, adaptive-quality order/hysteresis, and protected simulation-invariant assertions in `tests/e2e/performance.spec.js`

### Implementation for User Story 2

- [x] T031 [US2] Implement `mulberry32`, stable integer region hashing, the session-seeded `createNoise2D` stream, global multi-octave/ridged height sampling, and deterministic region/ruin descriptors in `index.html`
- [x] T032 [US2] Implement 33x33 shared-edge `TerrainRegion` buffers, normals, stored triangle topology, barycentric surface queries, readiness rules, and replacement of the flat MVP sampler in `index.html`
- [x] T033 [US2] Implement the 5x5 region pool, bounded edge-row/column recycling, collision-horizon preparation, scene-root reuse, and 8,192 m origin rebasing with global coordinate continuity in `index.html`
- [x] T034 [US2] Render jagged hills and mountains with charcoal, dark-earth, and rust vertex colors plus deterministic fracture-line buffers that never affect collision in `index.html`
- [x] T035 [US2] Generate slope-filtered ruin clusters outside the spawn corridor and manually merge damaged gray tiers, missing corners/sections, and bounded emissive orange window panels per region in `index.html`
- [x] T036 [US2] Add `#3d2817` background/fog, warm ambient and orange directional lighting, texel-stabilized following shadows, and cast/receive settings for the glider, terrain, and nearby ruins in `index.html`
- [x] T037 [US2] Implement a bounded reusable ash points field that follows the local aircraft area, falls continuously, remains HUD-independent, and supports cosmetic count/drift profiles in `index.html`
- [x] T038 [US2] Preserve the crypto-generated session seed, region descriptors, cracks, ruins, and pool identity across attempts while keeping full reload generation ephemeral in `index.html`
- [x] T039 [US2] Implement `QualityState` hysteresis and the ash, shadow, window-density, and pixel-ratio degradation/restoration order without changing simulation invariants, then expose cloned terrain samples, descriptor hashes, counts, quality transitions, and `region-seam`/`origin-rebase` results through the webdriver-only facade in `index.html`
- [x] T040 [US2] Run the terrain, streaming, and traversal suites and record fixture hashes, region/pool maxima, rebases, scene counts, gap checks, minute-2/minute-10 memory growth, quality transitions, protected-invariant results, and outcomes in `evidence/validation/us2-world.md`
- [x] T041 [US2] Review terrain colors/cracks, jagged profiles, at least one spawn-visible and three route ruin clusters, broken silhouettes, orange windows, fog, lighting, shadows, ash, seams, and long-flight composition in `evidence/visual/us2-wasteland.md`

**Checkpoint**: US2 provides a stable, edge-free wasteland traversal while US1 flight
behavior remains unchanged.

---

## Phase 5: User Story 3 - Read Flight State and Recover (Priority: P3)

**Goal**: Provide accurate HUD feedback, terrain-relative collision, an unmistakable
crash state, and deterministic same-world restart without a page reload or leaked state.

**Independent Test**: Drive `terrain-impact` and `restart-world`; compare every displayed
field with authoritative state, cross zero clearance, verify surface clamping and frozen
input, then complete 20 restarts within two seconds each with stable world hashes and counts.

### Tests for User Story 3

- [x] T042 [P] [US3] Write integration tests for swept terrain impact, one crash event, surface clamp, frozen controls/physics, complete reset, same-world hashes, two-second recovery, and 20-cycle listener/DOM/pool stability in `tests/integration/crash-restart.spec.js`
- [x] T043 [P] [US3] Extend the desktop journey with 10 Hz HUD cadence, unit/label/finite/rounding checks, terrain-relative altitude, global coordinates through rebase, keyboard Restart, and post-restart freshness in `tests/e2e/desktop-flight.spec.js`

### Implementation for User Story 3

- [x] T044 [US3] Sweep each fixed-step path against ready rendered terrain triangles, compute two-meter clearance, clamp zero/negative clearance to the surface, and emit exactly one `TERRAIN_CRASH` in `index.html`
- [x] T045 [US3] Derive and render 10 Hz `HUDSnapshot` values for integer km/h speed, terrain-relative meter altitude, global X/Y/Z meters, lifecycle label, and controlled primary action without live-announcing numeric churn in `index.html`
- [x] T046 [US3] Implement the semantic crash overlay, terrain message, keyboard/focus-operable Restart, frozen crashed scene, and attempt/crash counters in `index.html`
- [x] T047 [US3] Implement same-document restart cleanup for aircraft, controls, pointer lock, touches, pause reasons, accumulator, camera, HUD, and ash while retaining seed, world, renderer, materials, listeners, and bounded pools in `index.html`
- [x] T048 [US3] Run HUD and crash/restart suites, including 20 consecutive impacts, and record accuracy samples, recovery times, hashes, object/listener counts, and results in `evidence/validation/us3-recovery.md`
- [x] T049 [US3] Review HUD contrast and composition plus paused impact, crash, restart-focus, and clean respawn states at representative desktop and mobile landscape sizes in `evidence/visual/us3-hud-recovery.md`

**Checkpoint**: US3 makes flight state readable and every terrain crash recoverable
without altering the current wasteland.

---

## Phase 6: User Story 4 - Use a Resilient and Accessible Flight View (Priority: P4)

**Goal**: Complete consistent lifecycle presentation, keyboard-only desktop operation,
touch-only mobile operation, responsive layouts, focus/orientation safety, controlled
dependency recovery, accessible semantics, and reduced-motion behavior.

**Independent Test**: Exercise every presentation state in Chromium and WebKit at all
contract viewports and zoom levels; complete keyboard-only and landscape touch-only
journeys; rotate mobile to portrait and back; lose/restore focus; inject each dependency
failure; verify deliberate resume, safe areas, semantics, and non-overlap.

### Tests for User Story 4

- [x] T050 [P] [US4] Write responsive-control integration tests for every viewport row, 100/150/200% desktop zoom, aspect/DPR resize, 44x44 targets, safe areas, touch-action, simultaneous touches, pointer cancellation, and DOM uniqueness in `tests/integration/responsive-controls.spec.js`
- [x] T051 [P] [US4] Extend the touch-only journey with throttle/stick concurrency, pause/resume, focus loss, crash/restart, portrait entry, touch clearing, landscape return, deliberate resume, browser chrome, and reduced motion in `tests/e2e/mobile-flight.spec.js`
- [x] T052 [P] [US4] Write automated semantics, names, headings, focus order/visibility, live-region discipline, keyboard-only actions, text/non-color cues, contrast hooks, and reduced-motion assertions in `tests/e2e/accessibility.spec.js`
- [x] T053 [P] [US4] Extend dependency journeys to verify immediate loading feedback, controlled error copy, inactive flight, keyboard/touch Retry, no raw diagnostics, no automatic loop, and clean successful recovery in `tests/integration/dependency-loader.spec.js`

### Implementation for User Story 4

- [x] T054 [US4] Finish consistent overlay typography, terminology, contrast, focus styles, DOM exclusivity, semantic headings/status/buttons, canvas name/description, and desktop 1024x576–2560x1440 layouts in `index.html`
- [x] T055 [US4] Implement manual and focus pause reasons, visibility/blur input clearing before the next step, keyboard and semantic Pause/Resume, environmental readiness checks, and deliberate non-automatic resume in `index.html`
- [x] T056 [US4] Finish the landscape touch joystick, independent throttle pointers, semantic touch actions, 44x44 targets, safe-area padding, browser-gesture suppression, and 640x360–1366x1024 mobile layouts in `index.html`
- [x] T057 [US4] Implement portrait detection, immediate orientation pause/input clearing, hidden disabled flight controls, static text-plus-shape rotate prompt, safe-area layout, landscape restoration, and mandatory deliberate Resume in `index.html`
- [x] T058 [US4] Implement device-context control legends, pointer activation/neutral/bounds/release status, first-flight guidance, and keyboard/touch equivalents for Pause, Resume, Restart, and Retry in `index.html`
- [x] T059 [US4] Honor `prefers-reduced-motion` by removing camera overshoot/shake and reducing ash count/drift without changing simulation, collision, controls, terrain cues, or HUD cadence in `index.html`
- [x] T060 [US4] Complete controlled capability/dependency error presentation and explicit Retry integration so failed attempts discard buffers, blob URLs, partial modules, renderer/scene state, and listeners before reinitializing in `index.html`
- [x] T061 [US4] Run all US4 Chromium/WebKit projects across the responsive matrix and record browser builds, viewports, zoom, input mode, lifecycle transitions, accessibility assertions, dependency cases, loading feedback within 500 ms, controllable load within five seconds, touch input-response smoke results, and outcomes in `evidence/validation/us4-resilience.md`
- [ ] T062 [US4] Conduct keyboard-only desktop, touch-only physical mobile, screen-reader-oriented, contrast, reduced-motion, and responsive visual reviews; test five first-time evaluators without verbal assistance and require at least four to identify controls and begin controlled flight within 30 seconds; record anonymized timings, pass count, findings, and captures in `evidence/accessibility/us4-review.md`

**Checkpoint**: All four stories are functional and independently replayable through
their deterministic fixtures, with complete desktop and mobile interaction paths.

---

## Phase 7: Validation and Cross-Cutting Release Gates

**Purpose**: Qualify the story-owned adaptive performance behavior and produce fail-closed
evidence for the complete single-document release candidate.

- [x] T063 Extend the foundational collector in `tests/helpers/metrics.js` with network, quality-transition, atomic `schemaVersion: 1` environment-manifest merge, duplicate-`runId` rejection, and contracted `evidence/performance/<run-id>-*.json` validation/output
- [x] T064 Extend all three normative workloads, cold-load timing, budget calculations, preflight rejection, lossless attachments, screenshots, and summary output in `tests/e2e/performance.spec.js`
- [x] T065 Run the full adaptive-quality regression matrix, verifying hysteresis, ash/shadow/window/pixel-ratio order, restoration, recorded transitions, and unchanged simulation, terrain, collision, input, lifecycle, HUD, seed, and fixtures in `tests/e2e/performance.spec.js`, and record results in `evidence/validation/adaptive-quality.md`
- [x] T066 Wire smoke/full workload selection, strict preflight, desktop/Android/iOS qualification, report generation, and aggregate validation commands to `tests/helpers/metrics.js` through `package.json`
- [x] T067 [P] Verify exact CDN bytes/hashes/exports and both MIT notices, audit every direct and transitive development package in `package-lock.json` for version, purpose, license, maintenance, and vulnerabilities, and write provenance/results to `evidence/dependency-manifest.json`, `evidence/licenses/three-MIT.txt`, `evidence/licenses/simplex-noise-MIT.txt`, and `evidence/security/dependency-review.md`
- [x] T068 [P] Run formatting, ESLint, TypeScript `checkJs`, and forbidden-runtime-API checks with zero warnings and record tool versions and results in `evidence/validation/static-checks.md`
- [x] T069 Run all unit, integration, Chromium, WebKit, accessibility, network, and performance-smoke projects without silent skips and record commands, retries, failures, and final results in `evidence/validation/automated-tests.md`
- [x] T070 Inspect CSP, public diagnostics, query/fragment/storage isolation, credential/referrer behavior, request allowlisting, privacy boundaries, unexpected console errors, and the absence of assets/telemetry in `evidence/security/runtime-review.md`
- [x] T071 Complete the cross-story manual visual and accessibility matrix for glider, terrain, ruins, atmosphere, HUD, every lifecycle state, all representative layouts, keyboard, touch, non-color cues, and reduced motion in `evidence/visual/final-review.md`
- [ ] T072 Qualify cold load plus `flight-five-minute`, `maximum-speed-ten-minute`, and `restart-twenty` on the Apple M1 Chrome/Safari reference and write its environment entry plus `desktop-m1-<run-id>` raw samples, network/memory files, captures, and summaries in `evidence/environment-manifest.json` and `evidence/performance/`
- [ ] T073 Qualify shaped-network cold feedback/control, touch input response, `flight-five-minute`, `maximum-speed-ten-minute`, and `restart-twenty` on the physical Pixel 7 Chrome reference and atomically add its environment entry plus `android-pixel7-<run-id>` raw samples, network/memory files, captures, and summaries to `evidence/environment-manifest.json` and `evidence/performance/`
- [ ] T074 Qualify shaped-network cold feedback/control, touch input response, `flight-five-minute`, `maximum-speed-ten-minute`, and `restart-twenty` on the physical iPhone 13 Safari/Chrome reference and atomically add its environment entry plus `ios-iphone13-<run-id>` raw samples, network/memory files, captures, and summaries to `evidence/environment-manifest.json` and `evidence/performance/`
- [ ] T075 Execute every local, desktop, mobile, network, and distribution check in `specs/001-wasteland-flight-simulator/quickstart.md`, verify root `index.html` is the sole runtime artifact, and record deviations and results in `evidence/validation/quickstart.md`
- [x] T076 Run `npm run validate`, fail on missing/flaky/over-budget evidence, and consolidate requirement, browser/device, security, accessibility, visual, and performance outcomes in `evidence/validation/final-report.md`

**Checkpoint**: Release claims are supported by complete reviewed evidence; missing
hardware, dirty artifacts, changed dependency hashes, failed preflight, flaky tests, or
missed budgets remain explicit failures.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: Starts immediately.
- **Phase 2 — Foundational Runtime**: Depends on T001–T006 and blocks every story.
- **Phase 3 — US1**: Depends on Phase 2 and produces the recommended MVP.
- **Phase 4 — US2**: Depends on Phase 2; its data/render work can begin beside US1, but
  its playable traversal checkpoint integrates the US1 aircraft and camera.
- **Phase 5 — US3**: Depends on US1 aircraft state and US2 rendered terrain sampling.
- **Phase 6 — US4**: Its UI-state work can begin after Phase 2; its complete journeys
  integrate US1 controls, US2 scenery, and US3 crash/restart.
- **Phase 7 — Release Gates**: Depends on all selected stories. T072–T074 also depend on
  T063–T071 and require separate named physical reference environments.

### User Story Dependency Graph

```text
Setup → Foundation ─┬→ US1 ─┬→ US3 ─┐
                    ├→ US2 ─┘       ├→ Release Gates
                    └→ US4 shell ────┘
                         └─ complete journeys require US1–US3
```

### Within Each Story

- Write the story's tests before changing `index.html` for that story.
- Run deterministic unit/contract tests before browser journeys.
- Keep all simulation, rendering, input, and lifecycle authority in `index.html`; tests
  use the webdriver-only facade and do not duplicate production algorithms.
- Complete automated results and manual evidence before declaring the story checkpoint.
- A defect task must first make its regression test fail, then make the same test pass.

## Parallel Opportunities

- After T002, T003–T006 can proceed concurrently in separate configuration/evidence files.
- After setup, T007–T009 can define independent foundational assertions concurrently.
- After Phase 2, US1 test tasks T016–T019 can run in parallel.
- After Phase 2, US2 test tasks T028–T030 can run in parallel and US2 world-data work can
  proceed beside US1 flight work if `index.html` edits are coordinated serially.
- US3 test tasks T042–T043 can run in parallel.
- US4 test tasks T050–T053 can run in parallel.
- T067 and T068 can run beside the performance harness work after the stories complete.
- T072–T074 use separate physical references but merge one reviewed environment manifest,
  so execute them serially unless the evidence writer provides conflict-free merge staging.

## Parallel Example: User Story 1

```text
Task T016: Flight-model deterministic tests in tests/unit/flight-model.spec.js
Task T017: Normalized input tests in tests/unit/input.spec.js
Task T018: Desktop flight journey in tests/e2e/desktop-flight.spec.js
Task T019: Basic mobile flight journey in tests/e2e/mobile-flight.spec.js
```

## Parallel Example: User Story 2

```text
Task T028: Terrain determinism and surface tests in tests/unit/terrain.spec.js
Task T029: Streaming, pooling, and rebase tests in tests/integration/world-streaming.spec.js
Task T030: Long-traversal smoke test in tests/e2e/performance.spec.js
```

## Parallel Example: User Story 3

```text
Task T042: Collision/restart integration tests in tests/integration/crash-restart.spec.js
Task T043: HUD/recovery journey tests in tests/e2e/desktop-flight.spec.js
```

## Parallel Example: User Story 4

```text
Task T050: Responsive control tests in tests/integration/responsive-controls.spec.js
Task T051: Mobile lifecycle journey in tests/e2e/mobile-flight.spec.js
Task T052: Accessibility assertions in tests/e2e/accessibility.spec.js
Task T053: Dependency error/retry journey in tests/integration/dependency-loader.spec.js
```

## Requirements Coverage

| Requirement group                                                      | Owning tasks                      |
| ---------------------------------------------------------------------- | --------------------------------- |
| FR-001, FR-025–FR-026, FR-030; SR-001–SR-005                           | T007–T015, T053, T060, T067, T070 |
| FR-002–FR-012, FR-031–FR-032 core input; QR-001, QR-003; SC-002–SC-003 | T016–T027                         |
| FR-013–FR-019; PR-004–PR-005 world invariants; SC-004, SC-009          | T028–T041, T063–T065              |
| FR-020–FR-024; SC-005–SC-006                                           | T042–T049                         |
| FR-027–FR-034; UXR-001–UXR-008; SC-001, SC-008, SC-011–SC-012          | T050–T062                         |
| PR-001–PR-007; QR-002, QR-004–QR-006; SC-007, SC-009–SC-010            | T063–T076                         |

## Implementation Strategy

### MVP First

1. Complete Phase 1 setup.
2. Complete Phase 2 secure runtime foundation.
3. Complete Phase 3 US1 flight over the deterministic simple surface.
4. Stop and validate the US1 fixture, keyboard, pointer, touch, and visual evidence.
5. Demonstrate the playable glider MVP before adding world, recovery, and resilience.

### Incremental Delivery

1. Setup + Foundation → secure renderer-backed state shell.
2. US1 → independently playable flight MVP.
3. US2 → continuously streamed wasteland traversal.
4. US3 → accurate HUD, collision, and same-world restart.
5. US4 → complete resilient, accessible desktop/mobile experience.
6. Release gates → evidence-backed compatibility, security, and performance claims.

## Notes

- `[P]` indicates separate files with no unfinished dependency, never simultaneous edits
  to the single runtime `index.html`.
- Development tests and evidence do not relax the one-file runtime or two-request limit.
- Combat, shooting, checkpoints, interactive landmarks, missions, landing, fuel, audio,
  persistence, multiplayer, gamepad input, and ruin collision remain out of scope.
- Commit after each task or coherent task group; stop at any checkpoint for independent review.
