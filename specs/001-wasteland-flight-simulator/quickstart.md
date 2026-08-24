# Validation Quickstart: Wasteland Flight Simulator

This quickstart describes the expected workflow after implementation. At planning time,
`index.html`, development configuration, and tests do not exist yet, so no application
test or performance claim has been completed.

## Prerequisites

- Node.js `20.20.2` and npm `10.8.2` (the planning environment baseline)
- Current stable Chrome and Safari on desktop
- Physical Pixel 7 with current stable Chrome for final Android qualification
- Physical iPhone 13 with current stable Safari and Chrome for final iOS qualification
- An HTTPS preview or trusted local HTTPS origin for physical iOS/mobile Web Crypto tests
- AC power for the Apple M1 desktop reference and cool, sufficiently charged mobile devices

## Install Development Tooling

```bash
npm ci
npx playwright install chromium webkit
```

All npm dependencies are development-only and exact-resolved by `package-lock.json`.
Runtime Three.js and simplex-noise still come only from the two contract URLs.

## Run Locally

```bash
npm run serve
```

Open `http://127.0.0.1:4173/`. Localhost is a trustworthy context for Web Crypto.
Do not use a plain LAN HTTP address for physical mobile validation; use the documented
trusted HTTPS preview so `crypto.subtle` and module loading match production behavior.

Expected startup behavior:

1. Loading text appears immediately.
2. Exactly two external module requests complete.
3. The dependency hashes verify.
4. WebGL 2 initializes.
5. The glider appears above stable terrain with HUD and contextual controls.

## Static and Automated Gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm run verify:runtime-deps
npm test
```

`npm test` runs unit, integration, and end-to-end Playwright projects. It must cover the
six deterministic fixtures, all lifecycle states, browser projects, responsive matrix,
keyboard/pointer/touch paths, accessibility assertions, CDN failure/integrity cases,
terrain streaming, crash/restart, and performance smoke thresholds.

Run focused suites during development:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:accessibility
npm run test:performance:smoke
```

No suite may silently skip because a browser or dependency is unavailable. A documented
project-level skip is a failing release gate until the missing evidence is supplied.

## Dependency and Network Review

```bash
npm run verify:runtime-deps
npm run test:network
```

Confirm the exact URLs, sizes, SHA-384 values, MIT license records, namespace exports,
two-request allowlist, CSP, data favicon, and error/retry cases in
[runtime-dependency-contract.md](./contracts/runtime-dependency-contract.md). Intercept
and test redirect, timeout, HTTP failure, truncation, oversize, one-bit mutation, parse
failure, and missing-export responses.

## Desktop Manual Review

Run current Chrome and Safari at:

- 1024x576, 1920x1080, and 2560x1440;
- 100%, 150%, and 200% zoom;
- keyboard only;
- pointer control enabled, centered, bounded, released, and cancelled;
- reduced motion on and off.

Verify the makeshift glider components, charcoal/rust cracked terrain, mountains, broken
gray towers, missing sections, orange windows, `#3d2817` fog, warm lights, shadows, ash,
chase view, HUD contrast, loading/error/pause/crash states, focus pause, deliberate resume,
stall/recovery, terrain crash, and same-world restart.

## Mobile Manual Review

On Pixel 7 Chrome and iPhone 13 Safari/Chrome:

1. Load from the approved HTTPS preview in landscape.
2. Verify safe-area padding and 44x44 CSS-pixel targets.
3. Hold throttle while moving the touch joystick through all pitch/roll extremes.
4. Cancel each pointer, background/foreground the browser, and verify neutral paused input.
5. Rotate to portrait during flight; verify immediate pause and the non-color-only prompt.
6. Return landscape; verify flight stays paused until Resume.
7. Induce a stall, recover, crash into terrain, and Restart.
8. Repeat after browser chrome expands/collapses and with reduced motion enabled.

Touch emulation in desktop Playwright is useful but does not satisfy this physical review.

## Performance Qualification

Run the preflight and workloads from
[performance-contract.md](./contracts/performance-contract.md):

```bash
npm run qualify:preflight
npm run qualify:desktop
npm run qualify:android
npm run qualify:ios
npm run qualify:report
```

The commands must write exact environment, frame, input, network, memory, adaptive-quality,
and screenshot evidence under `evidence/`. Do not mark a device/browser combination passed
when hardware is absent, preflight fails, results exceed a budget, dependency hashes differ,
or the runtime artifact is dirty/different.

## Final Release Check

```bash
npm run validate
```

`validate` aggregates formatting, lint/type checks, dependency/license/security review,
all automated tests, quickstart assertions, evidence schema validation, physical-device
results, visual/accessibility sign-off, and every performance budget. The distributable
runtime is root `index.html` only; inspect its network log to confirm no hidden asset,
favicon, source-map, addon, telemetry, or fallback request.
