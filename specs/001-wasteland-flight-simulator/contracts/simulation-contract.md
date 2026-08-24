# Simulation and World Contract

**Authority**: Observable flight, terrain, collision, restart, and deterministic tests

## Coordinate and Unit Contract

- Right-handed world: +Y is up, initial forward is -Z, and +X is screen-right at spawn.
- Positive simulation heading turns forward travel toward +X; Three.js render yaw uses
  the negated heading so the local -Z nose remains aligned with that travel direction.
- Positions and terrain dimensions use meters; time uses seconds; airspeed uses m/s;
  angles use radians internally.
- HUD speed is `airspeed × 3.6` rounded to 1 km/h.
- HUD altitude is terrain clearance rounded to 1 m.
- HUD coordinates are global X/Y/Z meters rounded to 1 m and remain continuous across rebases.

## Baseline Configuration

| Constant                     |                               Value |
| ---------------------------- | ----------------------------------: |
| Fixed simulation step        |                            `1/60 s` |
| Maximum catch-up steps       |                                 `5` |
| Spawn speed                  |                            `55 m/s` |
| Minimum bounded speed        |                            `20 m/s` |
| Maximum bounded speed        |                            `95 m/s` |
| Stall entry                  |                           `<30 m/s` |
| Stall recovery               | `>=38 m/s` after nose-down recovery |
| Maximum pitch command        |                             `45°/s` |
| Maximum roll command         |                             `75°/s` |
| Spawn terrain clearance      |                             `160 m` |
| Aircraft collision clearance |         `2 m` above sampled surface |
| Region size                  |                             `768 m` |
| Region samples               |      `33×33` including shared edges |
| Active region window         |          `5×5` centered on aircraft |
| Origin rebase interval       |                 `8,192 m` on X or Z |

Tuning coefficients for thrust response, drag, lift, bank-to-heading coupling,
self-stabilization, stall nose-down moment, and the exact camera mount MUST live in one
frozen `CONFIG` object. Adjusting a coefficient requires updating deterministic fixture
expectations and rerunning the full physics/performance suite.

## Command Contract

The simulation accepts exactly one immutable control frame per fixed step:

```text
ControlFrame {
  pitch: number in [-1, 1]
  roll: number in [-1, 1]
  throttleDelta: number in [-1, 1]
}
```

Keyboard, desktop virtual joystick, and touch virtual joystick are adapters; they never
mutate aircraft state directly. Opposing values cancel before clamping. Paused, crashed,
loading, error, or portrait-blocked lifecycle states always supply a neutral frame and do
not call `stepFlight`.

## Fixed-Step Order

For each active step:

1. Copy current global position into previous position.
2. Apply bounded throttle delta and compute thrust response.
3. Compute quadratic drag opposing airspeed.
4. Apply pitch and roll command rates to quaternion orientation.
5. Apply weak released-input self-stabilization.
6. Evaluate stall entry/recovery hysteresis and apply low-speed lift loss plus gentle
   nose-down recovery moment.
7. Compute speed-squared lift along aircraft up, gravity along -Y, and bank-to-heading turn.
8. Integrate finite airspeed, vertical velocity, orientation, and global position.
9. Ensure the terrain region underneath the complete step segment is ready.
10. Sample the rendered triangle surface along the step segment; update clearance.
11. If clearance is zero or negative, clamp to surface, zero active motion, and emit one
    `TERRAIN_CRASH`; otherwise commit the step.
12. Rebase render origin if the local X or Z threshold is crossed.

Every vector/quaternion temporary is preallocated. Any non-finite value transitions to a
controlled fatal simulation error in development and fails the corresponding test; it
must never reach HUD text or renderer transforms.

## Flight Behavior Invariants

- Level orientation at spawn speed and neutral controls remains within ±5 m altitude
  over 60 simulated seconds after the initial settling window.
- Full positive/negative pitch and roll commands approach but never exceed configured rates.
- Released pitch/roll input trends toward level without snapping or preventing deliberate turns.
- Reducing throttle to stall range causes descent and stall state; nose-down plus increased
  throttle restores ≥38 m/s and exits recovery when terrain clearance permits.
- No input combination yields speed outside 20–95 m/s, a non-normalized quaternion, or a
  non-finite position/velocity.
- Render-frame cadence does not change the result for the same fixed-step command stream.

## Terrain Contract

- One `heightSample(globalX, globalZ, sessionSeed)` function owns base and ridged noise.
- Shared region edges sample identical global coordinates and MUST be byte-equal.
- Rendered collision height uses barycentric interpolation of the selected stored triangle,
  not a separate continuous-noise estimate.
- A region MUST be ready before it enters the active collision horizon; missing terrain
  pauses safely rather than treating it as open air.
- Region generation depends only on session seed and integer coordinates.
- Fracture lines are decorative and do not change collision height.
- Ruin descriptors use a region-derived random stream, reject mountain slopes and the
  spawn corridor, and never participate in collision.

## Origin Rebase Contract

When local X or Z exceeds 8,192 m:

- choose an integer 8,192 m offset on each exceeded axis;
- add it to `worldOrigin` and subtract it from aircraft, camera, lights, ash, and pooled
  render roots in the same rendered frame;
- retain global aircraft position, region keys, session seed, and HUD coordinates;
- recompute the exact glider-local camera mount on the rebase frame;
- produce no visible jump larger than one rendered pixel in the reference view.

## Crash and Restart Contract

Terrain clearance crossing from positive to zero/negative emits exactly one crash event.
The crashed lifecycle freezes physics and input, clamps the glider to the surface, keeps
the current world visible, announces the crash, and exposes Restart.

Restart MUST:

- increment attempt number but retain session seed and world descriptors;
- recreate spawn aircraft state at terrain height + 160 m with 55 m/s and neutral input;
- clear all keys, touches, pointer displacement/lock, pause reasons, accumulator, camera
  velocity, crash state, and stale HUD values;
- reset ash around the new local spawn without duplicating the point system;
- leave region pool size, terrain, cracks, ruins, dependency modules, renderer, materials,
  and listeners unchanged;
- become controllable within two seconds without document reload.

## Webdriver-Only Test Facade

When and only when `navigator.webdriver === true`, expose a frozen facade with methods
that return clones or accept validated primitives:

```text
reset(seed)
step(stepCount, controlFrame)
snapshot()
sampleTerrain(globalX, globalZ)
dispatchLifecycle(controlledEvent)
metrics()
```

`reset` accepts unsigned 32-bit seeds only. `stepCount` is an integer 1–36,000. Control
values must be finite and within bounds. The facade cannot change dependencies, URLs,
quality budgets, DOM text, or production feature scope.

## Required Fixtures

The fixture seeds and purposes in [data-model.md](../data-model.md) are normative. Each
fixture MUST record initial state, command stream, expected terminal state, and tolerance.
Seam/restart fixtures additionally hash height arrays and ruin descriptors. Performance
fixtures use the same public flight path but collect metrics rather than weakening assertions.
