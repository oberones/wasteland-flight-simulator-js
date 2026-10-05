# Feature Specification: Wasteland Flight Simulator

**Feature Branch**: `001-wasteland-flight-simulator`
**Created**: 2026-08-21
**Status**: Draft
**Input**: User description: "Build a complete, self-contained, browser-playable 3D
flight simulator set above a procedurally generated post-apocalyptic wasteland."

## Clarifications

### Session 2026-08-21

- Q: What flight-handling model should govern the glider? → A: Forgiving simulation
  with speed-dependent lift, gentle self-stabilization, and recoverable stalls.
- Q: What should happen when the simulator loses focus? → A: Pause flight immediately
  and require deliberate player input to resume.
- Q: How should pointer input command pitch and roll? → A: Use a bounded virtual
  joystick whose displacement from center continuously commands pitch and roll.
- Q: Which browser and device variants must be supported? → A: Current stable Chrome
  and Safari on desktop and mobile, with fully playable touch controls on mobile.
- Q: Which mobile orientations must support gameplay? → A: Gameplay is landscape-only;
  portrait mode shows an accessible rotate-device prompt.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Fly the Makeshift Glider (Priority: P1)

As a player, I can take immediate control of a visible makeshift glider from a
third-person chase view, adjust its throttle, pitch, and roll, and experience flight
behavior in which speed, lift, gravity, and drag interact predictably.

**Why this priority**: Controllable, understandable flight is the core value of the
simulator. Without it, the environment and presentation do not form a playable product.

**Independent Test**: Start a session with a simple ground surface, use keyboard,
pointer, and touch controls separately on their supported devices, and verify continuous
forward motion, throttle response, pitch, roll, lift, gravity, drag, and chase-camera
tracking for a two-minute flight.

**Acceptance Scenarios**:

1. **Given** a newly loaded session, **When** the scene becomes ready, **Then** the
   glider moves forward at a controllable non-zero speed and the camera follows from
   behind and above it.
2. **Given** the glider is in stable flight, **When** the player increases or decreases
   throttle, **Then** speed changes smoothly within safe minimum and maximum limits.
3. **Given** the glider is in flight, **When** the player commands pitch or roll using
   either keyboard or mouse input, **Then** its attitude and direction change
   continuously without an instantaneous jump.
4. **Given** the player reduces speed until the glider stalls, **When** the player lowers
   the nose and increases throttle, **Then** the glider rebuilds airspeed and restores
   lift when adequate terrain clearance remains.
5. **Given** the player combines throttle, pitch, and roll inputs, **When** those inputs
   are held together, **Then** the glider responds to all active axes rather than
   discarding one control.

---

### User Story 2 - Traverse the Procedural Wasteland (Priority: P2)

As a player, I can fly through a coherent post-apocalyptic landscape of cracked uneven
ground, jagged mountains, broken skyscrapers, glowing ruins, fog, sunset light, shadows,
and falling ash without reaching a visible world edge.

**Why this priority**: The landscape provides the navigation challenge and distinctive
wasteland atmosphere that makes flight meaningful once the core controls work.

**Independent Test**: Fly at maximum speed in multiple directions for ten minutes and
verify continuous terrain coverage, varied landforms, distributed ruins, stable
lighting and shadows, and ash around the aircraft without visible gaps or world edges.

**Acceptance Scenarios**:

1. **Given** a session has loaded, **When** the player surveys the nearby world, **Then**
   dark charcoal and rust-brown terrain forms uneven ground and jagged mountain profiles.
2. **Given** the player travels through the world, **When** new terrain enters the
   visible flight area, **Then** it joins existing terrain without gaps, abrupt seams,
   or a visible end to the landscape.
3. **Given** the player approaches a ruined urban area, **When** the structures become
   visible, **Then** they appear as irregular broken gray towers with missing sections
   and clearly visible orange-lit windows.
4. **Given** the player changes direction and altitude, **When** the chase view moves
   through the environment, **Then** dark-brown fog, orange sunset illumination,
   shadows, and falling ash remain spatially coherent around the glider.
5. **Given** a session is restarted after a crash, **When** the world reappears, **Then**
   the terrain and ruin layout match the pre-crash session so the player can retry the
   same route.

---

### User Story 3 - Read Flight State and Recover (Priority: P3)

As a player, I can read speed, height above the local terrain, and world coordinates
while flying, recognize a terrain collision, and restart promptly from a safe state.

**Why this priority**: Clear feedback makes the flight model learnable, while immediate
recovery turns crashes into short retry loops instead of dead ends.

**Independent Test**: Compare the displayed values with controlled flight states, fly
the glider through zero terrain clearance, and restart without reloading the page.

**Acceptance Scenarios**:

1. **Given** active flight, **When** speed, terrain clearance, or position changes,
   **Then** the overlay updates labeled Speed, Altitude, and Coordinates values at least
   ten times per second without obscuring the glider.
2. **Given** the glider crosses below zero clearance relative to the local terrain,
   **When** collision is detected, **Then** flight input stops affecting motion, the
   glider does not pass through the ground, and an unmistakable crash state appears.
3. **Given** the crash state is visible, **When** the player activates Restart, **Then**
   a controllable glider returns at a safe altitude and speed within two seconds without
   a full page reload.
4. **Given** a restarted session, **When** the HUD resumes updating, **Then** no speed,
   altitude, coordinates, control input, or crash status leaks from the prior attempt.

---

### User Story 4 - Use a Resilient and Accessible Flight View (Priority: P4)

As a player, I receive clear loading, control, error, and crash information; can operate
every essential flight action through keyboard controls on desktop or touch controls on
mobile; and retain a usable HUD across supported screen sizes and zoom levels.

**Why this priority**: A smooth simulator is incomplete if players cannot discover the
controls, recover from dependency failure, or read essential state in their environment.

**Independent Test**: Exercise loading, ready, dependency-error, active-flight, and
crash states in current stable Chrome and Safari using keyboard-only desktop input and
touch-only mobile input at representative landscape screens, plus 200% desktop zoom;
verify the paused rotate-device flow in portrait.

**Acceptance Scenarios**:

1. **Given** the simulator is loading, **When** required runtime resources are not yet
   ready, **Then** a readable loading state appears and flight does not begin partially.
2. **Given** a required external runtime resource fails to load, **When** initialization
   cannot complete, **Then** the player sees a safe explanation and a retry action rather
   than a blank or frozen screen.
3. **Given** the flight view has focus, **When** the player uses only the keyboard,
   **Then** every essential desktop flight, pause/resume, and restart action remains available.
4. **Given** pointer flight control is inactive, **When** the player explicitly enables
   it, **Then** a visible bounded virtual joystick uses displacement from center to
   command pitch and roll continuously; returning it to center produces neutral input,
   and the player can release pointer control with a clearly documented action.
5. **Given** any supported viewport or 200% zoom, **When** the HUD, control guidance, or
   crash message appears, **Then** all text and actions remain visible, readable, and
   non-overlapping.
6. **Given** active flight, **When** the simulator loses focus, **Then** aircraft and
   world motion pause, all held controls clear, and flight resumes only after the player
   deliberately activates the visible Resume action.
7. **Given** the simulator is open in a supported mobile browser, **When** the player uses
   touch input only in landscape, **Then** the player can control throttle, pitch, and
   roll concurrently and can pause/resume, crash, and restart without a hardware keyboard
   or pointer.
8. **Given** a supported mobile device is in portrait or rotates to portrait during
   flight, **When** portrait is detected, **Then** flight pauses, active touches clear,
   and an accessible rotate-device prompt replaces flight controls until landscape returns.
9. **Given** a portrait-paused session returns to landscape, **When** the flight layout
   is ready, **Then** the simulator remains paused until the player deliberately resumes.

### Edge Cases

- Holding opposing controls simultaneously results in a neutral command on that axis
  rather than unstable alternating input.
- Losing window focus pauses aircraft and world motion and clears held controls; returning
  focus alone does not resume flight or restore an abandoned pitch, roll, throttle, or
  virtual-joystick command.
- Large frame delays do not allow the glider to tunnel below terrain or produce an
  unrecoverable position, speed, or orientation.
- Very low speed reduces lift and can cause a descent, but speed and orientation remain
  finite and recoverable until terrain contact.
- Maximum throttle, pitch, and roll remain bounded and never create invalid HUD values.
- Terrain directly beneath the glider is available before collision and altitude checks;
  missing world data cannot be treated as open air.
- Terrain transitions do not create unintended open cracks, overlaps, sudden height
  discontinuities, or visible empty space within the normal chase view; decorative
  surface cracking remains visible.
- Ruin placement avoids the safe spawn corridor and does not obscure the initial control
  guidance or HUD.
- Falling ash remains near the player during long travel but never blocks the HUD or
  changes flight physics.
- Window resize, display-density change, and 200% zoom preserve the scene aspect ratio
  and keep all overlay content operable.
- Mobile safe areas, browser chrome, and touch gestures do not cover the HUD or essential
  controls, trigger page scrolling, or prevent simultaneous throttle and flight input.
- Entering portrait during mobile flight clears all active touches and pauses motion;
  repeated orientation changes never duplicate prompts or resume flight automatically.
- A failed external dependency produces no repeated retry loop, untrusted diagnostic
  content, or partially interactive flight state.
- Repeated crash and restart cycles do not multiply overlays, controls, ash fields, or
  world elements and do not degrade responsiveness.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The simulator MUST present one self-contained browser entry point that
  transitions through loading, ready, active-flight, focus-paused, orientation-paused,
  crashed, and recoverable-error states.
- **FR-002**: The initial ready state MUST place one controllable glider at a safe
  altitude, orientation, and forward speed above generated terrain.
- **FR-003**: The glider MUST visibly include a central scrap-metal body, at least two
  exposed pipe-like supports, and two tattered wings with asymmetrical torn edges.
  The Blender-authored Dustkite design adds an open cockpit, static goggled pilot,
  and patched skeletal tail; its geometry is embedded in the delivered document.
- **FR-004**: A third-person chase view MUST remain behind and above the glider, keep both
  aircraft and forward flight path visible, and maintain one fixed glider-local chase
  transform without orbiting or interpolation lag during ordinary maneuvering.
- **FR-005**: The glider MUST maintain continuous forward motion during active flight
  and MUST stop aircraft and world motion while focus-paused, orientation-paused, or crashed.
- **FR-006**: `W` and `Shift` MUST each increase throttle; `S` and `Ctrl` MUST each
  decrease throttle on desktop; mobile MUST provide separate touch controls for throttle
  increase and decrease; throttle and speed MUST remain within defined safe bounds.
- **FR-007**: `Arrow Down` MUST command nose-down pitch and `Arrow Up` MUST command
  nose-up pitch.
- **FR-008**: `Arrow Left` and `Arrow Right` MUST command left and right roll respectively.
- **FR-009**: With pointer control enabled, a visible bounded virtual joystick MUST map
  displacement from center continuously and proportionally to pitch and roll: upward and
  downward displacement MUST command nose-up and nose-down pitch, left and right
  displacement MUST command matching roll, and the centered position MUST be neutral.
- **FR-010**: The player MUST be able to use throttle, pitch, and roll simultaneously,
  and opposing inputs on one axis MUST resolve to a neutral command for that axis.
- **FR-011**: Flight behavior MUST apply downward acceleration, speed-dependent lift,
  aerodynamic drag, and attitude-dependent movement continuously during active flight.
- **FR-012**: The flight model MUST provide forgiving simulation handling: reduced speed
  MUST increase descent tendency and lead to a recoverable stall, lowering the nose and
  increasing throttle MUST rebuild airspeed and lift, and released pitch and roll input
  MUST receive gentle self-stabilization. Spins and structural damage are out of scope,
  and all motion values MUST remain finite and bounded.
- **FR-013**: The world MUST provide uneven cracked ground, hills, and jagged mountains
  with dark charcoal and rust-brown visual variation.
- **FR-014**: The world MUST maintain terrain coverage around the player for at least
  ten uninterrupted minutes at maximum speed without a visible boundary, void, or seam.
- **FR-015**: The world MUST distribute ruined skyscrapers with irregular gray broken
  silhouettes, missing sections, and orange-lit windows across non-mountain terrain;
  at least one cluster MUST be visible from the safe spawn and at least three distinct
  clusters MUST appear during a five-minute straight flight at default throttle.
- **FR-016**: Ruins MUST remain outside the initial safe flight corridor and are visual
  navigation features rather than collision surfaces in this feature.
- **FR-017**: The scene MUST use dark-brown atmospheric fog matching `#3d2817`, warm
  orange ambient and directional sunset light, and visible cast or received shadows on
  the glider, nearby ruins, and elevated terrain.
- **FR-018**: Ash flakes MUST fall around and travel with the player's local flight area
  without affecting controls, flight behavior, HUD readability, or collision.
- **FR-019**: The terrain and ruin layout MUST remain stable across crash restarts within
  the same loaded session.
- **FR-020**: The HUD MUST show labeled Speed in kilometers per hour, Altitude as meters
  above local terrain, and three-axis Coordinates in world meters.
- **FR-021**: HUD values MUST update at least ten times per second during active flight
  and MUST never display non-finite or unlabeled values.
- **FR-022**: Crossing below zero altitude relative to local terrain MUST trigger a crash,
  stop active flight, and prevent the glider from moving through the terrain surface.
- **FR-023**: The crash state MUST identify the collision and offer a keyboard-operable
  Restart action.
- **FR-024**: Restart MUST reset the aircraft, controls, camera, HUD, and crash state to
  a safe spawn without reloading the browser document or changing the current world.
- **FR-025**: The delivered simulator MUST contain its authored code, styles, interface,
  and visual content in one browser-openable document and MUST request no external visual,
  audio, font, model, texture, or data assets.
- **FR-026**: The only permitted external runtime requests MUST be the two user-approved,
  version-pinned libraries needed for 3D presentation and terrain variation.
- **FR-027**: The simulator MUST present a visible control legend before or during the
  first flight and MUST show controls appropriate to the active input device, including
  how to enable, center, and release desktop virtual-joystick control.
- **FR-028**: Loss of document focus MUST pause aircraft and world motion, clear held
  input, suspend pointer-derived commands, show a keyboard-operable Resume action, and
  keep flight paused until the player deliberately activates Resume.
- **FR-029**: Resizing or changing display density MUST preserve the scene aspect ratio
  and reposition overlays without requiring a restart.
- **FR-030**: A required-library loading failure MUST show a readable failure reason and
  retry action while leaving flight controls inactive.
- **FR-031**: Mobile play MUST provide a bounded touch joystick whose displacement from
  center maps continuously and proportionally to pitch and roll in the same directions
  as desktop pointer control, separate throttle-increase and throttle-decrease controls,
  and touch actions for Pause, Resume, Restart, and Retry without requiring hardware input.
- **FR-032**: Mobile controls MUST accept throttle and pitch/roll touch input concurrently,
  cancel all active touches on focus loss, and prevent flight gestures from scrolling,
  zooming, or otherwise activating the surrounding browser page.
- **FR-033**: The supported browser matrix MUST include current stable Chrome on desktop,
  Android, and iOS and current stable Safari on macOS and iOS.
- **FR-034**: Mobile gameplay MUST be available only in landscape. Entering portrait MUST
  pause aircraft and world motion, clear all touches, replace flight controls with a
  rotate-device prompt, and keep flight paused after landscape returns until the player
  deliberately activates Resume.

### Security & Privacy Requirements _(mandatory)_

- **SR-001**: The simulator MUST NOT request, collect, retain, or transmit personal data,
  gameplay telemetry, credentials, or location data.
- **SR-002**: External runtime dependencies MUST be limited to the two approved sources,
  pinned to reviewed versions, covered by compatible license records, and verified by
  dependency and vulnerability review before release.
- **SR-003**: Query parameters, URL fragments, stored browser data, and external content
  MUST NOT alter executable behavior or be rendered as trusted interface text.
- **SR-004**: If an approved external resource is missing, modified, blocked, or invalid,
  the simulator MUST fail closed into the recoverable error state without executing
  partially initialized flight behavior.
- **SR-005**: Error and diagnostic messages shown to players MUST contain no source code,
  stack traces, local paths, secrets, or untrusted external response content.

### User Experience & Accessibility Requirements _(mandatory)_

- **UXR-001**: Loading, active-flight, focus-paused, orientation-paused, crashed,
  dependency-error, and retry states MUST use consistent typography, placement,
  terminology, and action styling.
- **UXR-002**: Every essential desktop action MUST have a keyboard path, every essential
  mobile action MUST have a touch path, and desktop pointer input MUST be optional,
  explicitly activated, and releasable with documented keyboard input.
- **UXR-003**: Focus MUST remain visible for interactive overlays, and status/action text
  MUST be exposed as text rather than encoded only by color, motion, or imagery.
- **UXR-004**: Speed, Altitude, Coordinates, loading, error, and crash information MUST
  remain readable against every scene background without relying solely on orange color.
- **UXR-005**: At mobile landscape CSS viewports from 640x360 through 1366x1024, desktop
  viewports from 1024x576 through 2560x1440, and desktop zoom levels of 100%, 150%, and
  200%, the scene, HUD, control guidance, and restart/error actions MUST remain visible,
  non-overlapping, and operable.
- **UXR-006**: Reduced-motion preferences MUST reduce nonessential camera motion and ash
  intensity while preserving control response, terrain motion cues, and the flight model.
- **UXR-007**: Mobile touch controls MUST account for safe-area insets, require no hover,
  have active targets at least 44 by 44 CSS pixels, and remain visually distinct from the HUD.
- **UXR-008**: The portrait rotate-device prompt MUST identify why flight is paused,
  provide text and an orientation cue that does not rely on motion or color alone, and
  remain readable with mobile safe-area insets applied.

### Performance Requirements _(mandatory)_

- **PR-001**: On the reference environment defined during planning, a five-minute flight
  at 1920x1080 MUST sustain a median of at least 60 frames per second, with at least 99%
  of frames completing within 33.3 milliseconds.
- **PR-002**: From a cold load over a stable 25 Mbps connection, the simulator MUST show
  a loading state within 500 milliseconds and become controllable within five seconds.
- **PR-003**: At least 95% of keyboard and pointer commands MUST produce visible aircraft
  response within 100 milliseconds during the representative desktop performance flight;
  the same budget MUST apply to touch commands on mobile reference devices.
- **PR-004**: A ten-minute maximum-speed flight MUST not show progressive frame-rate loss,
  duplicate world elements, or more than 10% growth in steady-state memory after the
  first two minutes.
- **PR-005**: Cosmetic workload MUST yield before input, flight, terrain-collision, and
  HUD correctness whenever the reference environment cannot maintain the target cadence.
- **PR-006**: The implementation plan MUST define one desktop, one Android, and one iOS
  reference device; their Chrome or Safari versions; the measurement procedure; terrain,
  ruin, and ash workload; and the release-equivalent build used to reproduce these budgets.
- **PR-007**: On each approved mobile reference device at its native CSS viewport, a
  five-minute landscape touch-controlled flight MUST sustain a median of at least 60
  frames per second, with at least 99% of frames completing within 33.3 milliseconds.

### Quality & Verification Requirements _(mandatory)_

- **QR-001**: Automated verification MUST cover control mappings, simultaneous and
  opposing inputs, throttle bounds, lift/gravity/drag behavior, terrain clearance,
  crash detection, restart reset, stable world layout, and HUD values.
- **QR-002**: End-to-end verification MUST cover cold load, active flight, ten-minute
  terrain traversal, keyboard-only desktop operation, pointer activation/release,
  touch-only mobile operation, simultaneous touches, focus-loss pause and deliberate
  resume, portrait pause and landscape recovery, resize/zoom, safe areas, crash/restart,
  reduced motion, and external-dependency failure across the supported Chrome and Safari
  matrix.
- **QR-003**: Reproducible world and control fixtures MUST allow failed physics, terrain,
  collision, and performance checks to be replayed without uncontrolled randomness.
- **QR-004**: Manual visual review MUST verify the glider silhouette, tattered wings,
  terrain colors and cracks, jagged mountains, ruined towers, orange windows, fog,
  lighting, shadows, ash, HUD contrast, and supported responsive layouts.
- **QR-005**: Release evidence MUST include configured formatting and static checks,
  automated test results, dependency/license and vulnerability review, accessibility
  results, visual review records, and performance measurements against every budget.
- **QR-006**: Any regression test added for a defect MUST demonstrate the failure before
  the fix and pass afterward; failing or flaky required checks block release.

### Key Entities _(include if feature involves data)_

- **Flight Session**: One loaded play session, including lifecycle state, focus-paused
  and orientation-paused status, stable world identity, elapsed flight time, crash count,
  and current aircraft spawn.
- **Aircraft State**: The glider's position, orientation, forward speed, vertical motion,
  throttle, terrain clearance, active/crashed status, and bounded physics values.
- **Control State**: Current keyboard commands, desktop and touch virtual-joystick
  displacement, throttle touches, pointer activation, focus status, and the neutral
  resolution of centered, released, cancelled, or opposing inputs.
- **Terrain Region**: A coherent portion of the surrounding world with stable landform
  heights, ground color variation, neighbor continuity, and associated ruins.
- **Ruin**: A visual landmark with position, scale, broken silhouette, missing sections,
  gray material variation, and orange window lights.
- **Ash Field**: Cosmetic flakes surrounding the local flight area with density, fall
  direction, visibility, and reduced-motion behavior.
- **HUD Snapshot**: The labeled, display-ready speed, terrain-relative altitude,
  coordinates, lifecycle message, and available recovery action.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least four of five first-time evaluators can identify the controls and
  begin controlled flight within 30 seconds without verbal assistance.
- **SC-002**: All specified keyboard and virtual-joystick mappings produce the expected
  throttle, pitch, or roll response in repeatable acceptance runs, including centered,
  bounded, simultaneous, and opposing inputs.
- **SC-003**: A trained evaluator can sustain controlled flight for five minutes, change
  altitude and heading, recover from three intentionally induced stalls, and avoid
  terrain without an unintended control loss or invalid state.
- **SC-004**: A maximum-speed ten-minute traversal shows no visible world edge, terrain
  gap, abrupt seam, missing collision surface, or unrecoverable scenery duplication.
- **SC-005**: Every induced terrain crash displays the crash state, prevents underground
  travel, and restores controllable flight within two seconds of Restart across 20
  consecutive crash/restart cycles.
- **SC-006**: HUD speed, terrain-relative altitude, and coordinates remain labeled,
  finite, and within one displayed unit of the verified flight state in 100% of sampled frames.
- **SC-007**: On the approved desktop, Android, and iOS reference environments, the
  simulator meets the 60-frame median, 99th-percentile frame-time, five-second cold-load,
  100-millisecond input, and steady-state memory budgets.
- **SC-008**: Keyboard-only desktop and touch-only mobile evaluators can load, fly, pause
  through focus loss, resume deliberately, crash, and restart successfully at every
  supported screen and applicable zoom level, with no clipped or overlapping essential text.
- **SC-009**: Manual review confirms all required wasteland, glider, ruin, sunset, fog,
  shadow, and ash characteristics at the supported representative viewports.
- **SC-010**: Network inspection records no requests other than the single document and
  two approved runtime libraries, and no player or gameplay data leaves the browser.
- **SC-011**: Blocking either approved runtime dependency produces a readable error and
  working retry action in every test, with no blank, frozen, or partially interactive scene.
- **SC-012**: In every tested mobile orientation change, entering portrait pauses motion
  and clears touches before the next flight update, the rotate-device prompt remains
  readable, and returning to landscape never resumes flight without deliberate input.

## Assumptions

- This feature is a single-player browser free-flight experience for current stable
  Chrome on desktop, Android, and iOS and current stable Safari on macOS and iOS, using
  devices with hardware-accelerated 3D graphics.
- Mobile gameplay is landscape-only. Portrait is a supported paused state with an
  accessible rotate-device prompt, not a playable flight layout.
- An internet connection is required for the initial retrieval of two approved runtime
  libraries. All authored visuals, interface elements, and simulation content are embedded
  in the single delivered document; exact technical selections are deferred to planning.
- The player begins in flight with enough speed and terrain clearance to learn the
  controls. Takeoff, landing, repair, fuel, missions, scoring, combat, enemies, audio,
  persistence, multiplayer, and gamepad input are outside this feature.
- Terrain collision is the only crash source in this feature. Ruined structures are
  non-colliding visual landmarks and never occupy the safe spawn corridor.
- Altitude means vertical clearance above the terrain directly beneath the glider, not
  height above a global sea-level origin.
- World layout remains stable for crash restarts in one loaded session; a full page load
  may create a different wasteland.
- Pointer control requires explicit player activation because browsers may restrict or
  release captured pointer input. Keyboard controls remain the desktop equivalent path;
  touch controls provide the complete mobile path.
- The implementation plan will pin the desktop, Android, and iOS reference hardware,
  Chrome and Safari versions, dependency versions and licenses, deterministic fixtures,
  and measurement tools required by the constitution and this specification.
