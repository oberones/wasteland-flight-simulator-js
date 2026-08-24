# US4 Accessibility and Responsive Review

- Date: 2026-08-22
- Gate status: **BLOCKED — external manual evidence required**
- Completed evaluator: trained Codex browser evaluator
- First-time evaluators completed: **0 of 5**
- Physical mobile devices completed: **none**

## Completed local and emulated review

The trained desktop browser review exercised keyboard-accessible flight, Pause, Resume,
pointer release, terrain crash, focused Restart, and clean respawn at 1280x720. Visible
focus uses a three-pixel pale outline with offset; primary actions remain centered, named,
and readable over the frozen scene. Chromium used Tab/Enter. WebKit automation used the
documented P shortcut and Enter because its test harness treats Tab as window focus loss;
manual Safari Full Keyboard Access remains outstanding below.

Screen-reader-oriented DOM inspection found one named main landmark, one named canvas with
off-canvas description, a named instruments region, controlled H1/H2 hierarchy, visible
button text, a named touch joystick, and one polite lifecycle status. HUD numbers are
ordinary text and are not live-announced. Pause, focus, orientation, crash, error, and
recovery states expose their reason and primary action as text rather than color alone.

Responsive visual inspection covered the Pixel 7 emulation profile in landscape and
portrait. Landscape retained a distinct HUD, centered touch legend, joystick, independent
throttle targets, safe edge spacing, and no overlap. Portrait now hides HUD, legend, and
flight controls so only the frozen scene, text-plus-shape rotate prompt, and non-flight
status remain active. Landscape return shows a focused Resume panel and does not restart
flight automatically.

Reduced-motion inspection showed a stable chase camera without overshoot and visibly
lower ash density while preserving terrain motion cues, HUD cadence, touch targets, and
the deterministic simulation hash. Automated state recorded 260 ash points at drift 3,
compared with the normal 520 at drift 7.

## Contrast review

WCAG relative-luminance checks used the lightest sunset scene token behind the 88% opaque
panel as the conservative panel case:

| Pair                      |   Ratio | Threshold | Result |
| ------------------------- | ------: | --------: | ------ |
| Body text / panel         | 15.74:1 |     4.5:1 | Pass   |
| Amber label / panel       | 10.58:1 |     4.5:1 | Pass   |
| Button text / rust button |  7.31:1 |     4.5:1 | Pass   |
| Focus ring / rust button  |  6.62:1 |       3:1 | Pass   |

The HUD also uses persistent labels, border separation, spacing, and font weight; the
rotate, crash, pause, and dependency states use headings and explanatory prose in addition
to their color treatment.

## Captures

- [Corrected touch-only landscape guidance](./us4-touch-landscape.png)
- [Portrait-only rotate prompt](./us4-portrait-prompt.png)
- [Landscape return with focused Resume](./us4-landscape-resume.png)
- [Reduced-motion touch flight](./us4-reduced-motion-touch.png)
- [Desktop pause, crash, focus, and respawn review](../visual/us3-hud-recovery.md)

These mobile captures are browser emulation evidence, not physical-device evidence.

## Blocking evidence still required for T062

1. Run the touch-only journey on at least one physical supported mobile device, including
   browser chrome, safe areas, portrait/landscape rotation, focus interruption, crash,
   and restart.
2. Run screen-reader software on the supported desktop/mobile combinations and record
   announced order, names, status changes, and numeric-HUD silence.
3. Run macOS Safari with Full Keyboard Access and record the Tab focus sequence.
4. Recruit five first-time evaluators, give no verbal assistance, record anonymized
   control-identification and controlled-flight start times, and require at least four to
   succeed within 30 seconds.

No evaluator timings or physical-device results have been invented. Until all four items
are completed, T062 and the US4 manual checkpoint remain open and release qualification
cannot begin.
