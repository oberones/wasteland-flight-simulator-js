# Performance Qualification Contract

## Reference Matrix

| ID | Physical reference | Required browser runs | Viewport |
|---|---|---|---|
| `desktop-m1` | Apple M1, 8-core CPU, 16 GiB RAM, AC power | Current stable Chrome and Safari | 1920x1080 CSS pixels, recorded DPR |
| `android-pixel7` | Google Pixel 7, Tensor G2, 8 GiB RAM, battery ≥50%, cool start | Current stable Chrome | Native landscape CSS viewport |
| `ios-iphone13` | Apple iPhone 13, A15, 4 GiB RAM, battery ≥50%, cool start | Current stable Safari and Chrome | Native landscape CSS viewport |

Functional automation may add browsers/viewports, but it cannot replace these physical
runs. Exact hardware model, OS build, browser version/UA, viewport, DPR, power mode,
battery, thermal state, display attachment, commit, and dependency hashes MUST be captured.

## Preflight

A run is invalid and recorded as failed evidence when:

- hardware does not match the named reference and no reviewed rebaseline exists;
- device is in low-power mode, thermally throttled, below the battery threshold, or has
  unrelated foreground applications/recording that alter results;
- browser version, viewport, DPR, network shape, commit, dirty state, or dependency hashes
  are missing;
- runtime console contains an uncaught error, hash mismatch, WebGL context loss, non-finite
  state, or unexpected network request;
- the release-equivalent `index.html` differs from the artifact under review.

## Network Profile and Cold Load

- Shape client access to 25 Mbps downstream, 5 Mbps upstream, and 50 ms round-trip latency.
- Clear page/CDN caches and service workers before each cold-load run.
- Start timing at document navigation; loading text must appear by 500 ms and controllable
  flight by 5,000 ms.
- Record request URL, status, redirect chain, transferred/decoded bytes, and completion time.
- Only document, Three.js, and simplex-noise responses are allowed.

## Workloads

### `flight-five-minute`

1. Load seed `0x1a2b3c4d` through the webdriver/evidence harness.
2. Fly 60 s level at default throttle.
3. Alternate full left/right bank every 20 s for 120 s.
4. Perform three stall/recovery cycles over 90 s.
5. Fly straight through ruin clusters for the remaining 30 s.

Collect every rendered frame duration, every input-to-render marker, draw calls,
triangles, active geometries/textures, quality transitions, and periodic memory evidence.

### `maximum-speed-ten-minute`

Fly at maximum throttle with deterministic shallow turns across region boundaries for
10 minutes. Collect frame/memory samples, active/pool counts, origin rebases, region
creation/recycle counts, scene object count, and any duplicate descriptors.

### `restart-twenty`

Induce terrain impact and activate Restart 20 times. Record time to controllable flight,
listener counts, scene object counts, pool sizes, DOM overlay counts, memory, and world hashes.

## Budgets

| Metric | Pass condition |
|---|---|
| Frame cadence | Median ≥60 frames/s and ≥99% frames ≤33.3 ms in five-minute run |
| Cold feedback | Loading state visible ≤500 ms |
| Cold control | Controllable flight ≤5,000 ms at shaped network |
| Input response | ≥95% event-to-render markers ≤100 ms for keyboard/pointer/touch |
| Memory stability | Minute-10 steady-state usage ≤110% of minute-2 baseline |
| World continuity | Zero visible gaps, missing collision regions, unbounded pool growth, or duplicates |
| Restart | Each attempt controllable ≤2,000 ms; counts return to baseline |
| Network | Exactly two external runtime requests; zero telemetry/assets/addons |

Chrome heap metrics alone are insufficient for cross-browser memory. Use browser/devtool
or platform instrumentation appropriate to each physical reference and also record
Three.js renderer geometry/texture/program counts plus application pool/object counts.

## Adaptive Quality

After three continuous seconds below 45 frames/s, apply one tier per evaluation interval:

1. Reduce ash count/drift.
2. Reduce shadow map size and shadow distance.
3. Reduce emissive window panel density without changing ruin silhouettes/cluster counts.
4. Reduce renderer pixel-ratio cap, never below 1.

After ten continuous seconds above 58 frames/s, restore one tier per interval in reverse
order. Hysteresis timers reset on opposite-threshold crossing. Quality adaptation MUST NOT
change fixed-step rate, physics coefficients, terrain samples, collision, input, lifecycle,
HUD cadence, world seed, ruin cluster descriptors, or acceptance fixtures.

A run may use adaptive quality and still pass only if all budgets pass and its transition
history is present. A profile that begins below full quality must be identified in evidence.

## Evidence Files

All runs share one `evidence/environment-manifest.json` document with this shape:

```json
{
  "schemaVersion": 1,
  "runs": {
    "<runId>": { "preflight": "exact qualification environment fields" }
  }
}
```

`runs` is keyed by the controlled `runId` from the data model and serialized in lexical
key order. Each run adds one complete entry atomically. Duplicate identifiers, overwrites,
partial entries, or a missing top-level schema version fail validation.

Each run additionally produces:

- `evidence/performance/<run-id>-summary.json` with budget results;
- `evidence/performance/<run-id>-frames.json` or lossless compressed equivalent;
- `evidence/performance/<run-id>-network.json`;
- `evidence/performance/<run-id>-memory.json`;
- screenshots of initial, ruin, stall, crash, pause, and final states;
- a reviewer note identifying pass/fail and any approved rebaseline reference.

Evidence schemas are versioned by a `schemaVersion: 1` field. Missing, malformed, edited
without provenance, or non-reference evidence is a failure. Rebaseline requires owner
approval, rationale, before/after comparison, and an update to this contract before a
performance claim can pass.
