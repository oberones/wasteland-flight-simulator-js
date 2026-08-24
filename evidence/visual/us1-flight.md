# US1 Flight Visual Review

- Date: 2026-08-22
- Status: **PASS WITH FINDINGS**
- Task: T027
- Evaluator: trained Codex browser evaluator using the in-app browser at 1280x720
- Runtime: local release document at `http://127.0.0.1:4173/`

## Timed flight outcome

The qualifying flight leg remained active for more than seven minutes of real browser
time. It began at 160 m terrain clearance and 198 km/h, climbed above 4,800 m, completed
three intentionally induced stall/recovery cycles, and ended the long leg paused with
finite HUD values and 830 m of clearance. The minimum observed clearance during that
qualifying leg was 582 m; it did not contact terrain or lose control authority.

| Exercise |        Stall entry | Recovery checkpoint | Outcome |
| -------- | -----------------: | ------------------: | ------- |
| Stall 1  | 93 km/h at 4,027 m | 152 km/h at 1,813 m | PASS    |
| Stall 2  | 72 km/h at 4,455 m | 148 km/h at 2,439 m | PASS    |
| Stall 3  | 72 km/h at 4,378 m | 155 km/h at 1,372 m | PASS    |

Each recovery combined deliberate nose-down pointer-stick input with throttle increase,
crossed the 38 m/s recovery threshold, returned to accelerating flight, and retained
finite labeled speed, altitude, and coordinate values. A separate safe-altitude maneuver
changed the route from X 0 m to X 195 m while maintaining more than 3,100 m clearance,
establishing heading as well as altitude control.

## Visual and interaction review

- The central scrap-metal fuselage, two exposed pipe supports, and asymmetrically torn
  wing silhouette are identifiable against the dark-brown background.
- Rust/orange and darker patched surfaces distinguish the low-poly sections without a
  texture or external asset.
- The behind-and-above chase view kept the glider and forward area in frame through
  climbs, banks, stalls, and recoveries; no chase-offset snap was observed.
- The HUD and control legend remained readable throughout the flight and did not cover
  the glider.
- Pointer activation and Escape release were explicit in the control legend. Multiple
  relative motions were required to drive the accumulated virtual stick from one bound
  to the other, consistent with the bounded-stick design.

## Regression found and resolved

The first manual-pause check exposed an unintended control loss: `PAUSE` retained the
`manual` reason and `RESUME` could not clear it. A focused regression test reproduced the
failure in Chromium. The lifecycle reducer now clears only the manual reason on Resume,
while preserving focus/orientation blockers. The corrected lifecycle suite passed in
Chromium and WebKit (10 tests), and a browser-level Pause → Resume check returned to the
visible `Flight active` state.

An earlier exploratory training attempt descended to the 2 m MVP terrain safety floor
while establishing the pointer-stick direction. It was aborted and excluded from the
qualifying leg; no invalid numeric state or uncontrolled input persisted after reload.

## Captures

- [Initial glider and HUD](./us1-flight-initial.png)
- [Safe heading-change leg](./us1-flight-heading.png)
- [Paused terminal state](./us1-flight-paused.png)

All captures were taken from the in-app browser during this review and saved without
post-processing.
