# Adaptive Quality Validation

- Date: 2026-08-22
- Evidence class: generated automated regression with reviewed summary
- Fixture: `region-seam`, seed `0x13579bdf`
- Projects: Playwright `desktop-chromium` and `desktop-webkit`

## Command and result

```text
WFS_PERFORMANCE_PROFILE=smoke npx playwright test tests/e2e/performance.spec.js \
  --project=desktop-chromium --project=desktop-webkit --grep "protected state"
```

Result: **PASS — 2 tests passed in 5.1 seconds; zero failures, retries, or skips.**

## Hysteresis and transition matrix

The regression proved that 2.99 seconds at 40 fps does not degrade quality, a 50 fps
sample resets both hysteresis timers, and each complete three-second 40 fps interval
degrades exactly one tier. Likewise, 9.99 seconds at 60 fps does not restore quality,
50 fps resets the recovery timer, and each complete ten-second 60 fps interval restores
exactly one tier.

| Tier | Ash count/drift | Shadow map/extent | Window density | Pixel-ratio cap |
| ---: | --------------: | ----------------: | -------------: | --------------: |
|    0 |         520 / 7 |        2048 / 700 |            1.0 |               2 |
|    1 |         260 / 3 |        2048 / 700 |            1.0 |               2 |
|    2 |         260 / 3 |        1024 / 430 |            1.0 |               2 |
|    3 |         260 / 3 |        1024 / 430 |            0.5 |               2 |
|    4 |         260 / 3 |        1024 / 430 |            0.5 |               1 |

Recorded transition actions were, in order:

```text
reduce-ash
reduce-shadows
reduce-windows
reduce-pixel-ratio
restore-pixel-ratio
restore-windows
restore-shadows
restore-ash
```

## Protected-state proof

Before degradation and after complete restoration, the test deep-compared the session
seed, attempt/crash counters, elapsed simulation time, lifecycle, frozen simulation
configuration hash, HUD snapshot and cadence, complete aircraft state, and complete
normalized input state. All remained byte-for-byte equal. The sampled rendered collision
height and the region height, descriptor, and ruin hashes also remained equal.

This is deterministic policy validation, not physical-device performance qualification.
Actual frame budgets and transition histories still require the named T072-T074 reference
environments.
