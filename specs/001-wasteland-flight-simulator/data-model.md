# Data Model: Wasteland Flight Simulator

**Date**: 2026-08-21
**Feature**: [spec.md](./spec.md)

## Modeling Rules

- World units are meters, seconds, meters per second, and radians internally.
- Render objects are views of model state; they never own authoritative simulation values.
- Runtime state is in memory only and is discarded on full page load.
- The session seed and global coordinates survive crash restart but not full page load.
- Mutable vectors, quaternions, typed arrays, and pooled groups have one explicit owner.
- External dependencies, DOM text, URL state, and browser storage never become model input.
- Test snapshots clone primitive values so tests cannot mutate live state accidentally.

## Application Model

### ApplicationState

Top-level owner coordinating dependencies, lifecycle, simulation, scene, input, HUD,
quality, and evidence sampling.

| Field                | Type                    | Rules                                                    |
| -------------------- | ----------------------- | -------------------------------------------------------- |
| `dependencyState`    | `DependencyState`       | Blocks all application construction until verified       |
| `lifecycle`          | `LifecycleState`        | Sole authority for whether simulation may advance        |
| `session`            | `FlightSession or null` | Created only after dependencies and WebGL 2 verify       |
| `quality`            | `QualityState`          | May change cosmetics only                                |
| `lastFrameTimeMs`    | number                  | Monotonic when rendering; reset on pause/resume          |
| `accumulatorSeconds` | number                  | Range 0–`5/60`; cleared on every pause or restart        |
| `hudElapsedSeconds`  | number                  | Triggers at 0.1 s; never drives physics                  |
| `destroyed`          | boolean                 | Prevents listeners or render loop from being reinstalled |

**Invariant**: `session` is non-null only when dependency state is `verified` and WebGL 2
construction succeeded.

## Lifecycle Model

### LifecycleState

| Field            | Type                                                          | Rules                                      |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------ |
| `phase`          | `loading`, `ready`, `flying`, `paused`, `crashed`, or `error` | Derived presentation state                 |
| `pauseReasons`   | set of `manual`, `focus`, `orientation`                       | Empty unless phase can resume              |
| `resumeRequired` | boolean                                                       | True after any pause until explicit Resume |
| `errorCode`      | `null` or controlled error enum                               | No raw exception or response content       |
| `crashReason`    | `null` or `terrain`                                           | Terrain is the only crash reason in scope  |
| `revision`       | non-negative integer                                          | Increments once per accepted transition    |

### Lifecycle Events

`DEPENDENCIES_VERIFIED`, `DEPENDENCY_FAILED`, `WEBGL_FAILED`, `START`, `PAUSE`,
`FOCUS_LOST`, `FOCUS_READY`, `PORTRAIT_ENTERED`, `LANDSCAPE_READY`, `RESUME`,
`TERRAIN_CRASH`, `RESTART`, and `RETRY` are the complete accepted event vocabulary.

### Derived Phase Priority

1. Dependency or WebGL error → `error`.
2. Terrain impact → `crashed`.
3. Dependencies still pending → `loading`.
4. Any pause reason or `resumeRequired` → `paused`.
5. Session constructed but flight not started → `ready`.
6. Otherwise → `flying`.

Returning focus or landscape removes only its environmental reason. It never clears
`resumeRequired`; only explicit Resume does so when no environmental reason remains.

## Flight Session

### FlightSession

| Field                  | Type                    | Rules                                               |
| ---------------------- | ----------------------- | --------------------------------------------------- |
| `seed`                 | unsigned 32-bit integer | Crypto-generated once; fixed through restart        |
| `elapsedFlightSeconds` | non-negative number     | Advances only during fixed simulation steps         |
| `attemptNumber`        | positive integer        | Starts at 1; increments after successful Restart    |
| `crashCount`           | non-negative integer    | Increments exactly once per terrain crash           |
| `worldOrigin`          | `{x, z}` Float64 pair   | Multiples of 8,192 m                                |
| `aircraft`             | `AircraftState`         | Replaced with spawn state on Restart                |
| `controls`             | `ControlState`          | Cleared on pause, crash, restart, and cancellation  |
| `world`                | `WorldState`            | Seed and active descriptors persist through Restart |
| `camera`               | `CameraState`           | Reset to spawn-relative chase pose on Restart       |
| `ash`                  | `AshState`              | Cosmetic pool reset around spawn on Restart         |
| `hud`                  | `HUDSnapshot`           | Derived from authoritative state at 10 Hz           |

**Relationships**: One session owns one aircraft, control state, world, camera, ash
field, and current HUD snapshot. Scene objects reference these states but cannot replace them.

## Aircraft and Physics

### AircraftState

| Field                    | Type                                 | Unit/range                               |
| ------------------------ | ------------------------------------ | ---------------------------------------- |
| `globalPosition`         | Float64 `{x,y,z}`                    | World meters; finite                     |
| `localPosition`          | Float32-compatible `{x,y,z}`         | Global minus world origin                |
| `orientation`            | normalized quaternion `{x,y,z,w}`    | Norm within `1 ± 1e-5`                   |
| `airspeed`               | number                               | 20–95 m/s                                |
| `verticalVelocity`       | number                               | m/s; finite and bounded by configuration |
| `throttle`               | number                               | 0–1                                      |
| `pitchRate`              | number                               | radians/s; bounded by 45°/s command      |
| `rollRate`               | number                               | radians/s; bounded by 75°/s command      |
| `stallState`             | `normal`, `stalled`, or `recovering` | Hysteresis at 30/38 m/s                  |
| `terrainSurfaceY`        | number                               | Interpolated rendered terrain height     |
| `clearance`              | number                               | `y - terrainSurfaceY - 2 m`              |
| `previousGlobalPosition` | Float64 `{x,y,z}`                    | Start of current collision sweep         |

### Aircraft Validation

- All numeric fields MUST remain finite after every step.
- Airspeed and throttle MUST remain within bounds.
- Quaternion MUST be normalized after integration.
- Stalled → normal transition is forbidden until recovery speed is reached.
- Clearance ≤0 during flying produces one `TERRAIN_CRASH`; crashed state performs no
  further physics steps.
- Restart uses the configured spawn values and current session seed, not prior aircraft values.

## Input Model

### ControlState

| Field                  | Type                      | Range/rules                            |
| ---------------------- | ------------------------- | -------------------------------------- |
| `keyboardPitch`        | number                    | -1, 0, or 1                            |
| `keyboardRoll`         | number                    | -1, 0, or 1                            |
| `keyboardThrottle`     | number                    | -1, 0, or 1                            |
| `desktopStick`         | `{x,y}`                   | Each component -1–1; center is neutral |
| `touchStick`           | `{x,y}`                   | Each component -1–1; center is neutral |
| `throttleUpTouchIds`   | set of integers           | Owned active pointers only             |
| `throttleDownTouchIds` | set of integers           | Owned active pointers only             |
| `stickTouchId`         | integer or null           | At most one owner                      |
| `pointerLockActive`    | boolean                   | False on pause/focus loss/release      |
| `activeKeys`           | set of accepted key codes | No arbitrary keys retained             |
| `revision`             | non-negative integer      | Changes when normalized output changes |

### ControlFrame

Immutable per-step projection:

| Field           | Type        | Derivation                             |
| --------------- | ----------- | -------------------------------------- |
| `pitch`         | number -1–1 | Sum active source commands, then clamp |
| `roll`          | number -1–1 | Sum active source commands, then clamp |
| `throttleDelta` | number -1–1 | Opposing up/down commands cancel       |

**Invariant**: Any pause, crash, orientation block, pointer cancellation, or visibility
loss produces a neutral control frame before another physics step can run.

## Procedural World

### WorldState

| Field              | Type                             | Rules                             |
| ------------------ | -------------------------------- | --------------------------------- |
| `sessionSeed`      | unsigned 32-bit integer          | Same value as FlightSession seed  |
| `regionSizeMeters` | constant 768                     | Immutable                         |
| `samplesPerSide`   | constant 33                      | Includes shared edges             |
| `activeCenter`     | integer `{regionX,regionZ}`      | Region containing aircraft        |
| `activeRegions`    | map from key to `TerrainRegion`  | Exactly 25 after initialization   |
| `regionPool`       | bounded array of `TerrainRegion` | Reused; never grows after warm-up |
| `originRevision`   | non-negative integer             | Increments on 8,192 m rebase      |

### TerrainRegion

| Field                | Type                      | Rules                                     |
| -------------------- | ------------------------- | ----------------------------------------- |
| `key`                | canonical string `x:z`    | Unique within active map                  |
| `regionX`, `regionZ` | signed integers           | Global region coordinates                 |
| `seed`               | unsigned 32-bit integer   | Stable hash of session and coordinates    |
| `heights`            | `Float32Array(1089)`      | Row-major 33x33 shared-edge samples       |
| `colors`             | `Float32Array(3267)`      | RGB per terrain vertex                    |
| `crackSegments`      | bounded Float32Array      | Deterministic dark fracture lines         |
| `ruins`              | array of `RuinDescriptor` | Bounded by region profile                 |
| `sceneGroup`         | owned pooled render group | Rebound only during region recycle        |
| `ready`              | boolean                   | True before region enters physics horizon |

**Identity rule**: Region key, heights, cracks, and ruin descriptors depend only on
session seed and integer coordinates. Recycling cannot alter their regenerated values.

### RuinDescriptor

| Field                | Type                    | Rules                                        |
| -------------------- | ----------------------- | -------------------------------------------- |
| `id`                 | `regionKey:index`       | Stable for session and region                |
| `globalX`, `globalZ` | number                  | Non-mountain, outside safe spawn corridor    |
| `baseY`              | number                  | Rendered terrain surface at footprint center |
| `width`, `depth`     | positive number         | Bounded by ruin profile                      |
| `tiers`              | 1–5                     | Missing tier gaps allowed                    |
| `tierHeights`        | bounded number array    | Produces irregular silhouette                |
| `damageMask`         | unsigned bit field      | Missing corners/tiers/window bands           |
| `windowSeed`         | unsigned 32-bit integer | Stable emissive pattern                      |
| `clusterId`          | stable string           | Supports encounter-density evidence          |

Ruins have no collision entity and never enter aircraft collision queries.

## Camera and Atmosphere

### CameraState

| Field           | Type         | Rules                                                        |
| --------------- | ------------ | ------------------------------------------------------------ |
| `position`      | owned vector | Exact glider-local behind/above mount after every fixed step |
| `lookTarget`    | owned vector | Aircraft plus forward look distance                          |
| `up`            | owned vector | Glider-local up transformed through aircraft orientation     |
| `reducedMotion` | boolean      | Reduces atmospheric motion; camera has no secondary motion   |

### AshState

| Field         | Type                 | Rules                                     |
| ------------- | -------------------- | ----------------------------------------- |
| `positions`   | bounded Float32Array | Reused points around aircraft             |
| `fallSpeeds`  | bounded Float32Array | Deterministic cosmetic values             |
| `count`       | positive integer     | Selected by quality and motion preference |
| `fieldCenter` | owned vector         | Follows local aircraft area               |
| `revision`    | integer              | Changes only when profile/count resets    |

Ash never contributes to physics, collision, HUD, or world seed evidence.

## HUD and Presentation

### HUDSnapshot

| Field               | Type                                    | Display rule                           |
| ------------------- | --------------------------------------- | -------------------------------------- |
| `speedKph`          | finite number                           | Rounded to nearest 1 km/h              |
| `altitudeMeters`    | finite number                           | Clearance rounded to nearest 1 m       |
| `coordinateX/Y/Z`   | finite numbers                          | Global meters rounded to nearest 1 m   |
| `lifecycleLabel`    | controlled string                       | No raw exception text                  |
| `primaryAction`     | `none`, `resume`, `restart`, or `retry` | Matches lifecycle                      |
| `controlMode`       | `keyboard`, `pointer`, or `touch`       | Drives legend only                     |
| `orientationPrompt` | boolean                                 | True only while portrait blocks mobile |

HUD snapshots are derived at 10 Hz. Numeric changes are ordinary text, not live-region
announcements; lifecycle changes use the status live region.

## Dependency and Quality Models

### DependencyRecord

| Field                        | Type                                           | Rules                                    |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------- |
| `name`, `version`, `license` | controlled constants                           | Embedded manifest                        |
| `url`                        | exact HTTPS URL                                | No redirect-derived execution target     |
| `expectedBytes`              | positive integer                               | Evidence check, not sole integrity check |
| `sha384Hex`                  | 96 lowercase hex characters                    | Compared before evaluation               |
| `status`                     | `pending`, `fetching`, `verified`, or `failed` | Monotonic per attempt                    |
| `failureCode`                | controlled enum or null                        | No raw response body                     |

### QualityState

| Field                             | Type              | Rules                                             |
| --------------------------------- | ----------------- | ------------------------------------------------- |
| `tier`                            | 0–4               | 0 is full quality; higher values reduce cosmetics |
| `lowFpsSeconds`                   | 0–3               | Reset above threshold                             |
| `recoverySeconds`                 | 0–10              | Reset below recovery threshold                    |
| `ashCount`                        | profile constant  | Cosmetic only                                     |
| `shadowMapSize`, `shadowDistance` | profile constants | Cosmetic only                                     |
| `windowDensity`                   | profile constant  | Does not change ruin silhouette                   |
| `pixelRatioCap`                   | profile constant  | Never below 1                                     |

Quality changes MUST NOT alter simulation step, terrain heights, collision, input,
lifecycle, HUD cadence, session seed, or control fixtures.

## Evidence Model

### EnvironmentManifest

One `evidence/environment-manifest.json` document owns preflight metadata for all
qualification runs:

| Field           | Type                    | Rules                                           |
| --------------- | ----------------------- | ----------------------------------------------- |
| `schemaVersion` | constant `1`            | Required at the document root                   |
| `runs`          | object keyed by `runId` | Keys are unique and serialized in lexical order |

Each `runs[runId]` value contains the exact device, CPU, memory, OS, browser/version,
viewport, DPR, power, battery, thermal state, display attachment, network shape, commit,
dirty state, dependency hashes, workload, and preflight result for that run. Evidence
writes are atomic, reject duplicate `runId` values, and never overwrite a prior entry.

### QualificationRun

| Field                                           | Type                     | Rules                                      |
| ----------------------------------------------- | ------------------------ | ------------------------------------------ |
| `runId`                                         | unique controlled string | Date/device/browser/workload               |
| `commit`                                        | full Git commit          | Required; dirty state recorded separately  |
| `device`, `cpu`, `memory`                       | exact strings/numbers    | Must match approved reference              |
| `os`, `browser`, `browserVersion`               | exact strings            | No “latest” in completed evidence          |
| `viewport`, `dpr`, `power`, `thermal`           | measured values          | Preflight required                         |
| `dependencyHashes`                              | map                      | Must equal runtime contract                |
| `workload`                                      | controlled workload ID   | No ad hoc substitution                     |
| `frameSamples`, `inputSamples`, `memorySamples` | numeric arrays/summaries | Raw or lossless attachment                 |
| `qualityTransitions`                            | timestamped tier list    | Required even when empty                   |
| `result`                                        | `pass` or `fail`         | Missing evidence is fail, not unknown/pass |

## Deterministic Fixture Set

| Fixture          |         Seed | Purpose                                            |
| ---------------- | -----------: | -------------------------------------------------- |
| `level-flight`   | `0x1a2b3c4d` | Stable level flight and HUD conversion             |
| `stall-recovery` | `0x5e6f7788` | Stall entry, nose-down recovery, hysteresis        |
| `terrain-impact` | `0x0badc0de` | Zero-clearance crash and surface clamp             |
| `region-seam`    | `0x13579bdf` | Shared heights, cracks, and streaming continuity   |
| `restart-world`  | `0x2468ace0` | Same terrain/ruins with reset aircraft/control/HUD |
| `origin-rebase`  | `0x7f4a7c15` | Global HUD continuity through 8,192 m rebase       |

Fixture seeds are test inputs only and are not selectable from URL, storage, or the
production interface.
