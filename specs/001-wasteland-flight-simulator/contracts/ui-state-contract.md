# UI, Lifecycle, and Input Contract

## Presentation States

| Effective state | Visible content | Simulation | Primary action |
|---|---|---|---|
| `loading` | Title, loading message, non-animated progress cue | Not constructed | None |
| `ready` | Scene, HUD, contextual control legend | Spawned, not yet stepped | Start/implicit first input |
| `flying` | Scene, HUD, relevant controls | Fixed-step active | Pause |
| `paused:manual` | Frozen scene, Paused heading, reason, Resume | Frozen | Resume |
| `paused:focus` | Frozen scene, focus-loss reason, Resume | Frozen | Resume after focus ready |
| `paused:orientation` | Frozen/covered scene, rotate-device prompt | Frozen | Resume after landscape |
| `crashed` | Frozen scene, Crash heading, terrain message | Frozen/clamped | Restart |
| `error` | Safe error heading/message | Not active | Retry |

Loading, error, pause, crash, and portrait states use semantic headings, status text, and
real buttons. Hidden states are both visually hidden and removed from accessibility and
pointer interaction. Only one primary overlay may be active.

## Lifecycle Transition Rules

- `DEPENDENCIES_VERIFIED` and successful WebGL construction permit ready/flying.
- `PAUSE`, `FOCUS_LOST`, and `PORTRAIT_ENTERED` add their own pause reasons and clear input.
- `FOCUS_READY` and `LANDSCAPE_READY` remove only environmental reasons; neither resumes.
- Resume succeeds only when focus is ready, mobile orientation is landscape, and no
  blocking error/crash exists.
- `TERRAIN_CRASH` has priority over manual pause and exposes only Restart.
- Restart returns to flying with a fresh attempt and the same world.
- Retry exists only in error and reruns the verified dependency initialization path.
- No browser focus/orientation event, pointer-lock event, or key release can auto-resume.

## Desktop Controls

| Action | Keyboard | Optional pointer |
|---|---|---|
| Throttle increase | `W` or `Shift` | None |
| Throttle decrease | `S` or `Ctrl` | None |
| Nose up/down | `Arrow Up` / `Arrow Down` | Virtual stick up/down |
| Roll left/right | `Arrow Left` / `Arrow Right` | Virtual stick left/right |
| Enable pointer control | Focused canvas activation | Explicit pointer-lock request |
| Center pointer stick | Move reticle to center | Center is neutral |
| Release pointer control | `Escape` | Pointer-lock release |
| Pause/Resume | `P` | Semantic button |
| Restart after crash | `R` or focused Restart + `Enter` | Semantic button |
| Retry after error | Focused Retry + `Enter` | Semantic button |

The pointer reticle is visible while active, bounded to a circular control area, and
exposes its neutral/active state in the control legend. Pointer movement accumulates into
the bounded offset; release, pause, crash, focus loss, or orientation block resets center.

## Mobile Landscape Controls

- One bounded touch joystick controls pitch and roll proportionally with the same axes as desktop.
- Separate 44x44 CSS-pixel minimum Throttle + and Throttle − buttons support held input.
- Pause, Resume, Restart, and Retry are real semantic buttons with 44x44 minimum targets.
- Pointer IDs own controls independently so one joystick touch and one throttle touch work together.
- `pointercancel`, `visibilitychange`, blur, orientation change, pause, crash, and restart
  release owned IDs before the next simulation step.
- The control surface uses `touch-action: none` and prevents flight gestures from scrolling
  or zooming the document; semantic overlay buttons retain normal activation behavior.
- CSS safe-area insets pad HUD and controls away from notches, home indicators, and browser chrome.

## Portrait Contract

Mobile portrait is a supported paused presentation, not a flight layout. On entry:

1. Add the orientation pause reason and `resumeRequired`.
2. Clear every key, pointer, and touch command before another step.
3. Hide/disable flight controls and show a rotate-device heading, text, and static
   orientation cue that does not depend on color or motion.
4. Keep the prompt within safe-area insets and readable at the minimum viewport.
5. On landscape return, restore layout but keep paused until deliberate Resume.

## HUD Contract

The top-level HUD contains three ordinary text groups:

- `Speed` — integer km/h;
- `Altitude` — integer meters above rendered terrain;
- `Coordinates` — integer global `X`, `Y`, `Z` meters.

Visual values update no more slowly than 10 Hz and never show `NaN`, infinity, raw object
text, or an unlabeled number. The HUD does not use `aria-live`; lifecycle messages use a
separate live region so assistive technology is not flooded. HUD background, text, and
outline maintain readable contrast over both fog and emissive windows.

## Responsive Layout Matrix

| Context | Required checks |
|---|---|
| Desktop 1024x576 | Scene, three HUD values, legend, and primary overlay fit without overlap |
| Desktop 1920x1080 | Reference performance and full visual review |
| Desktop 2560x1440 | Canvas/aspect and anchored overlays remain bounded |
| Desktop 200% zoom | Essential text/actions remain visible and operable; canvas may crop before UI |
| Mobile landscape 640x360 | Minimal HUD plus touch controls and safe areas remain operable |
| Mobile landscape 844x390 | iPhone reference orientation and safe-area review |
| Mobile landscape 915x412 | Pixel reference orientation and browser-chrome review |
| Mobile landscape 1366x1024 | Tablet-scale layout remains bounded |
| Mobile portrait | Only rotate prompt and non-flight status are active |

## Accessibility and Motion

- The canvas has an accessible name and textual description; essential status is outside it.
- All buttons have visible text or an accessible name plus visible state.
- Keyboard focus is always visible and follows logical DOM order.
- Color is never the sole indicator of paused, crashed, error, throttle, or joystick state.
- Reduced motion removes camera overshoot/shake and reduces ash count/drift; it does not
  change physics, control magnitude, collision, terrain motion cues, or HUD cadence.
- Loading uses a static or gently changing text cue rather than essential animation.
- Error content uses controlled messages from the dependency contract.

## Verification

Automated and manual checks cover every state transition, keyboard-only desktop path,
pointer enable/center/release, simultaneous touch input, touch cancellation, safe areas,
all responsive matrix rows, 200% zoom, reduced motion, focus loss, portrait/landscape,
crash/restart, dependency error/retry, DOM uniqueness, and non-automatic resume.
