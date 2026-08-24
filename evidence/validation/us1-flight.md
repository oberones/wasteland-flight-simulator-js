# US1 Flight Validation

- Date: 2026-08-22
- Git revision at run: `efc43e2a903a490fa415575bc900baddcdb86d71`
- Worktree: dirty implementation worktree; development evidence, not release qualification
- Playwright: `1.62.1`
- Desktop Chromium: Chrome for Testing `151.0.7922.34`, Playwright build `1234`
- Desktop WebKit: `26.5`, Playwright build `2336`
- Mobile emulation: Playwright Pixel 7 Chromium and iPhone 13 WebKit landscape profiles

## Commands and result

```text
npx playwright test tests/unit/flight-model.spec.js tests/unit/input.spec.js tests/e2e/desktop-flight.spec.js tests/e2e/mobile-flight.spec.js
```

Result: **PASS — 22 tests passed in 10.6 seconds; zero failures, retries, or skips.**
Desktop unit and journey cases ran in Chromium and WebKit. The touch journey ran in the
corresponding landscape mobile-emulation projects.

The evidence-only rerun used Playwright's JSON reporter to retain lossless test attachments:

```text
env PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/wfs-us1-report.json npx playwright test tests/e2e/desktop-flight.spec.js tests/e2e/mobile-flight.spec.js --reporter=json
```

Result: **PASS — 6 journey tests passed in 3.8 seconds; zero failures, retries, or skips.**

## Deterministic command stream and tolerances

All journeys used `level-flight`, seed `0x1a2b3c4d` (`439041101`), and exactly 7,200
fixed 60 Hz steps (120 simulated seconds).

Desktop command stream:

1. 600 steps at `{ pitch: 0.05, roll: 0.12, throttleDelta: 0.08 }`.
2. 6,600 steps at the neutral frame.
3. Keyboard response markers for ArrowLeft, ArrowRight, ArrowUp, W, and S.
4. Explicit canvas pointer activation, relative motion, and Escape release.

Touch command stream:

1. Synthetic touch pointer 21 held the stick at normalized pitch/roll approximately
   `0.44/0.44` while touch pointer 22 held throttle-up for 600 steps.
2. Both pointers released to an exactly neutral frame.
3. 6,600 neutral steps completed the journey.

Acceptance tolerances were 120 seconds within `toBeCloseTo(..., 6)`, more than 1,000 m
of displacement on the straight leg, finite state, `normal` terminal stall state, visible
glider, active `flying` lifecycle, camera distance strictly between 8 m and 60 m, and
desktop input-to-render p95 no greater than 100 ms.

## Expected and actual terminal evidence

| Project          |             Terminal X/Y/Z (m) | Straight leg (m) | Camera (m) | Input p95 (ms) | Result |
| ---------------- | -----------------------------: | ---------------: | ---------: | -------------: | ------ |
| desktop-chromium |  `-6108.475 / 5000 / 4510.937` |       `7914.315` |   `52.167` |          `0.5` | PASS   |
| desktop-webkit   |  `-6108.475 / 5000 / 4510.937` |       `7914.315` |   `52.167` |           `17` | PASS   |
| mobile-chromium  | `-8707.500 / 5000 / -5373.418` |      `10390.383` |        n/a |            n/a | PASS   |
| mobile-webkit    | `-8707.500 / 5000 / -5373.418` |      `10390.383` |        n/a |            n/a | PASS   |

Every terminal snapshot reported `119.99999999999447` elapsed seconds and `normal` stall
state. Desktop terminal airspeed was `72.2629 m/s`; mobile terminal airspeed was the
bounded maximum `95 m/s`. Chromium and WebKit produced equal deterministic simulation
state apart from insignificant last-digit serialization differences in Z.

The input metric starts in the accepted browser input handler and closes immediately after
the next Three.js render. The five raw Chromium samples were `0.5`, `0.2`, `0.2`, `0.2`,
and `0.1` ms; WebKit samples were `3`, `9`, `17`, `7`, and `4` ms. Both p95 values passed
the 100 ms budget.

## Coverage and findings

The passing suite covers spawn stability, throttle/speed and attitude bounds, normalized
quaternions, gravity, speed-squared lift, quadratic drag, stall entry/hysteresis/recovery,
nose-down moment, finite state, weak self-leveling, render-cadence independence, keyboard
opposition, bounded pointer-stick centering/release, simultaneous pointer-ID touch input,
cancellation, pause neutralization, glider visibility, and chase-camera distance.

An exploratory run originally asserted large negative Z after holding roll for the entire
journey. That oracle was rejected because bank-to-heading coupling intentionally curves the
route; the final command stream measures a controlled bank followed by a long straight leg.
The same run also exposed browser-driver latency in the old probe and lack of automated
WebKit Pointer Lock. The final probe measures accepted-input-to-render inside the page, and
the explicit pointer mode now has a standards-compatible virtual-stick fallback while still
using native Pointer Lock when available.
