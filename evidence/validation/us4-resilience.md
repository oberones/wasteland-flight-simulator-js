# US4 Responsive, Accessible, and Resilient View Validation

- Date: 2026-08-22
- Status: **PASS — automated and emulated development checkpoint**
- Worktree: dirty implementation worktree; not physical-device qualification
- Playwright: `1.62.1`
- Projects: desktop Chromium, desktop WebKit, mobile Chromium, mobile WebKit

## Commands and results

```text
env PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/wfs-us4-report.json npx playwright test tests/integration/responsive-controls.spec.js tests/e2e/mobile-flight.spec.js tests/e2e/accessibility.spec.js tests/integration/dependency-loader.spec.js --reporter=json
npx playwright test tests/integration/dependency-loader.spec.js --grep "revokes verified"
```

The lossless matrix passed 74 applicable cases in 57.4 seconds with zero failures. Four
explicit applicability skips were reported: the touch-pointer test does not run in the two
desktop projects, and the desktop zoom-equivalent test does not run in the two mobile
projects. The later verified-blob cleanup addition passed all four projects in 3.8 seconds.
There were no hidden or conditional runtime skips.

## Browser projects

| Project          | Reported browser build                                         | Primary viewport/input        |
| ---------------- | -------------------------------------------------------------- | ----------------------------- |
| desktop-chromium | Chrome 151.0.7922.34                                           | 1280x720, keyboard/pointer    |
| desktop-webkit   | WebKit reporting Safari 26.5 / 605.1.15                        | 1280x720, keyboard/pointer    |
| mobile-chromium  | Chrome 151.0.7922.34, Android 14 Pixel 7 profile               | 915x412, coarse pointer/touch |
| mobile-webkit    | WebKit reporting Mobile Safari 26.5 / 605.1.15, iPhone profile | 844x390, coarse pointer/touch |

These are Playwright desktop engines and device profiles. They are not the physical
reference devices required by T062, T073, or T074.

## Responsive and input matrix

The automated layout collector checked desktop 1024x576, 1920x1080, and 2560x1440;
mobile landscape 640x360, 844x390, 915x412, and 1366x1024; desktop 100%, 150%, and
200% zoom-equivalent CSS viewports; and 1200x500 plus 700x700 aspect changes. Every
sample reported one canvas, unique DOM IDs, no document overflow, bounded HUD/action
controls, and renderer backing dimensions equal to CSS size times device pixel ratio
capped at 2. All visible buttons and joystick targets were at least 44x44 CSS px, declared
`touch-action: none`, and stayed clear of the center legend.

Independent stick and throttle pointers remained concurrent. Cancelling either pointer
released only its own ownership; cancelling both returned the complete control frame to
zero. Touch input-response smoke results were:

| Project         | Samples (ms)            |    P95 |    Budget |
| --------------- | ----------------------- | -----: | --------: |
| mobile-chromium | 0.4, 0.4, 0.5, 0.3, 0.3 | 0.5 ms | <= 100 ms |
| mobile-webkit   | 4, 13, 6, 5, 9          |  13 ms | <= 100 ms |

## Lifecycle and accessibility assertions

- Keyboard P/Enter and semantic buttons paused, resumed, crashed, restarted, and handed
  focus to the current primary action or named flight canvas.
- Touch-only journeys combined joystick and throttle, cleared ownership on cancellation,
  pause, focus loss, and portrait entry, remained paused after focus/landscape recovery,
  and required deliberate Resume.
- Portrait exposed the static text-plus-shape rotate prompt and hid/disabled flight
  controls. Landscape restoration exposed Resume rather than restarting automatically.
- Desktop and touch contexts received distinct first-flight guidance. Pointer status named
  inactive, active, bounded, and released behavior without depending on color.
- The HUD is not live; one separate polite status region announces lifecycle changes.
  Main, canvas, instruments, headings, buttons, and joystick retained controlled names.
- Reduced motion cut ash from 520 to 260 points, reduced drift from 7 to 3, snapped the
  chase camera without overshoot, and left the deterministic simulation hash and controls
  unchanged.

WebKit's automated Tab command moves its test page out of focus rather than emulating the
macOS Full Keyboard Access sequence. Its keyboard case therefore used the documented P
shortcut followed by Enter and verified the same Resume/Restart focus handoffs. Manual
Safari keyboard qualification remains part of T062.

## Dependency feedback and recovery

| Project          | Loading feedback | Controllable | Budgets              |
| ---------------- | ---------------: | -----------: | -------------------- |
| desktop-chromium |       262.955 ms | 1,668.970 ms | <= 500 / <= 5,000 ms |
| desktop-webkit   |       108.671 ms |   441.157 ms | <= 500 / <= 5,000 ms |
| mobile-chromium  |       269.836 ms | 1,691.290 ms | <= 500 / <= 5,000 ms |
| mobile-webkit    |       108.144 ms |   906.032 ms | <= 500 / <= 5,000 ms |

All projects requested only the exact two approved dependency URLs and emitted no console
error. HTTP failure, truncation, oversize, one-bit mutation, redirect, timeout, parse
failure, and missing-export cases failed closed with controlled text, no canvas, no raw
remote diagnostic, and no automatic retry loop. Keyboard or touch Retry recovered with
one canvas and one frozen webdriver facade. The partial-import recovery test observed
every created blob URL revoked before error and again after success, with exactly one
26-listener application instance and no retained partial scene.

This record does not claim physical touch, screen-reader software, first-time-evaluator,
or reference-hardware performance qualification.
