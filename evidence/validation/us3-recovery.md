# US3 HUD, Crash, and Restart Validation

- Date: 2026-08-22
- Status: **PASS — automated development checkpoint**
- Restart fixture seed: `0x2468ace0` (`610839776`)
- Worktree: dirty implementation worktree; not release qualification
- Playwright: `1.62.1`
- Engines: desktop Chromium and desktop WebKit projects

## Commands and results

```text
npx playwright test tests/integration/crash-restart.spec.js tests/e2e/desktop-flight.spec.js --project=desktop-chromium --project=desktop-webkit
```

Result: **PASS — 12 tests passed in 15.2 seconds; zero failures or skips.** A
lossless JSON evidence rerun also passed all 12 cases in 16.4 seconds. The focused HUD
attachment rerun passed both engines in 4.7 seconds. After US4 added one intentional
reduced-motion media-query listener, the current-code crash/restart regression passed all
six cases in 10.4 seconds and refreshed the stability counts below.

## Collision and frozen-state evidence

The `terrain-impact` fixture started four meters above the rendered triangle surface with
negative vertical velocity. Each fixed step sampled four points along the swept movement
segment and refined the first contact interval eight times. Both engines recorded one
`TERRAIN_CRASH`, lifecycle reason `terrain`, zero clearance, neutral controls, and a
terminal global Y exactly two meters above the sampled terrain Y. Another 600 requested
steps changed neither aircraft state, elapsed time, nor crash count.

One retained sample reported terrain Y `0.1621783520` m and terminal aircraft Y
`2.1621783520` m. The crashed HUD displayed `0 km/h`, `0 m`, global coordinates, the
controlled lifecycle label `Terrain impact. Flight stopped.`, and primary action
`restart`.

## HUD accuracy and cadence

The live cadence check observed six updates in 350 ms on Chromium and four on WebKit,
meeting the 100 ms maximum interval. A deterministic rebase sample produced identical
authoritative and displayed values in both engines:

| Field             | Authoritative state | HUD output |
| ----------------- | ------------------: | ---------- |
| Speed             |       83.867574 m/s | `302 km/h` |
| Terrain clearance |        108.735085 m | `109 m`    |
| Global X          |       8443.434203 m | `X 8443`   |
| Global Y          |        229.998592 m | `Y 230`    |
| Global Z          |   approximately 0 m | `Z 0 m`    |

All five displayed numbers were finite integers. The authoritative world origin rebased
to X `8192` while the HUD continued to use global coordinates. Numeric HUD text remained
outside the lifecycle live region.

## Twenty-cycle restart stability

Each engine completed 20 induced impacts and 20 same-document restarts. Both terminated
flying on attempt 21 with crash count 20, seed `610839776`, region descriptor hash
`ef45eeb4`, and a fresh spawn at 55 m/s and 160 m terrain clearance.

| Metric                           |                  Chromium |                    WebKit |    Required |
| -------------------------------- | ------------------------: | ------------------------: | ----------: |
| Minimum restart                  |                  7.953 ms |                  8.240 ms | <= 2,000 ms |
| Median restart                   |                 40.437 ms |                 14.237 ms | <= 2,000 ms |
| Maximum restart                  |                 59.102 ms |                 45.761 ms | <= 2,000 ms |
| Listeners, before / after        |                   26 / 26 |                   26 / 26 |   unchanged |
| Primary overlays, before / after |                     4 / 4 |                     4 / 4 |   unchanged |
| Scene objects, before / after    |                     6 / 6 |                     6 / 6 |   unchanged |
| Region pool, before / after      |                   25 / 25 |                   25 / 25 |   unchanged |
| Pool allocation, before / after  | 2,400,700 B / 2,400,700 B | 2,400,700 B / 2,400,700 B |   unchanged |

Pool identifiers remained exactly 1–25. Restart cleared controls, pointer/touch ownership,
pause reasons, accumulator, camera transients, HUD cadence, and ash positions while
retaining the seed, generated world, renderer, scene resources, listeners, and pool.

This evidence establishes the US3 automated checkpoint. It does not replace the
physical-device, first-time-evaluator, or release performance gates in T062 and T072–T074.
