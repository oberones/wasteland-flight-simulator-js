# US2 Procedural World Validation

- Date: 2026-08-22
- Status: **PASS — automated development checkpoint**
- Seed: `0x13579bdf` (`324508639`)
- Worktree: dirty implementation worktree; not release performance qualification
- Playwright: `1.62.1`
- Engines: desktop Chromium and desktop WebKit projects

## Commands and results

```text
npx playwright test tests/unit/terrain.spec.js tests/integration/world-streaming.spec.js tests/e2e/performance.spec.js --project=desktop-chromium --project=desktop-webkit
```

Result: **PASS — 16 tests passed in 13.0 seconds; zero failures or skips.**

The lossless Chromium evidence rerun used Playwright's JSON reporter and passed all eight
US2 cases in 10.2 seconds. It retained the descriptor, pool, traversal, renderer, and
terminal attachments used below.

## Deterministic fixture hashes

Region `-2:3` replayed identically before and after reset and order reversal:

| Evidence                    | Hash                    |
| --------------------------- | ----------------------- |
| Region descriptor           | `3dcb928a`              |
| 33x33 Float32 height buffer | `6fe4c0cb`              |
| Ruin descriptors            | `ac9940f3`              |
| West / east edge            | `693d4423` / `3a5f17a4` |
| North / south edge          | `0bdd9d8b` / `f023ebd7` |

Neighbor assertions compared the complete Float32 edge arrays as well as hashes. All
shared edges were byte-equal. Interior samples matched barycentric interpolation of the
stored rendered triangles to six decimal places. Decorative crack endpoints remained
above, and independent from, the collision surface.

## Streaming and traversal evidence

The deterministic route simulated exactly 36,000 fixed steps (`599.999999999783` s).
It accelerated to 95 m/s, used bounded alternating shallow turns, and terminated at
global position X `1488.622`, Y `5000`, Z `-56824.678` m in normal flight.

| Metric                |       Start |    Minute 2 |   Minute 10 |
| --------------------- | ----------: | ----------: | ----------: |
| Active regions        |          25 |          25 |          25 |
| Pool size             |          25 |          25 |          25 |
| Fixed pool capacity   | 2,400,700 B | 2,400,700 B | 2,400,700 B |
| Regions generated     |          25 |         100 |         400 |
| Pool recycles         |           0 |          75 |         375 |
| Origin revision       |           0 |           1 |           6 |
| World origin Z        |         0 m |    -8,192 m |   -49,152 m |
| Duplicate descriptors |           0 |           0 |           0 |
| Seam failures         |           0 |           0 |           0 |

The terminal renderer sample reported 18 draw calls, 24,807 triangles, 71 geometries,
3 textures, 6 top-level scene objects, and 29 active ruin clusters. The collision horizon
was ready at every sampled checkpoint. Pool identifiers remained the same 1–25 through
forward, reverse, restart, long-traversal, and rebase scenarios.

## Adaptive quality and protected invariants

Four deterministic three-second samples at 40 fps applied, in order:
`reduce-ash`, `reduce-shadows`, `reduce-windows`, and `reduce-pixel-ratio`. Four
ten-second samples at 60 fps restored one tier per interval in reverse order. Terrain
sample output, session seed, the frozen simulation-configuration hash, fixed-step state,
and world descriptors were identical before and after the quality cycle.

This is functional smoke evidence. It does not claim the physical-device frame, input,
cold-load, or memory budgets reserved for T072–T074.
