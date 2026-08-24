import { expect, test } from "@playwright/test";
import { FlightFixture } from "../helpers/flight-fixture.js";

/** @param {any} vector @param {any} quaternion */
function rotateVectorByQuaternion(vector, quaternion) {
  const tx = 2 * (quaternion.y * vector.z - quaternion.z * vector.y);
  const ty = 2 * (quaternion.z * vector.x - quaternion.x * vector.z);
  const tz = 2 * (quaternion.x * vector.y - quaternion.y * vector.x);
  return {
    x: vector.x + quaternion.w * tx + (quaternion.y * tz - quaternion.z * ty),
    y: vector.y + quaternion.w * ty + (quaternion.z * tx - quaternion.x * tz),
    z: vector.z + quaternion.w * tz + (quaternion.x * ty - quaternion.y * tx),
  };
}

/** @param {any} before @param {any} after */
function horizontalForwardAlignment(before, after) {
  const movement = {
    x: after.aircraft.globalPosition.x - before.aircraft.globalPosition.x,
    z: after.aircraft.globalPosition.z - before.aircraft.globalPosition.z,
  };
  const forward = rotateVectorByQuaternion(
    { x: 0, y: 0, z: -1 },
    after.aircraft.orientation,
  );
  return (
    (movement.x * forward.x + movement.z * forward.z) /
    (Math.hypot(movement.x, movement.z) * Math.hypot(forward.x, forward.z))
  );
}

test.describe("deterministic forgiving glider model", () => {
  test.beforeEach(async ({ page }) => {
    await new FlightFixture(page).load();
  });

  test("spawns in stable finite level flight", async ({ page }) => {
    const fixture = new FlightFixture(page);
    const initial = await fixture.reset("level-flight");
    expect(initial.aircraft.airspeed).toBe(55);
    expect(initial.aircraft.clearance).toBeCloseTo(160, 5);
    expect(initial.aircraft.orientation).toEqual({ x: 0, y: 0, z: 0, w: 1 });

    const terminal = await fixture.step(3_600);
    expect(terminal.aircraft.globalPosition.y).toBeGreaterThan(155);
    expect(terminal.aircraft.globalPosition.y).toBeLessThan(165);
    expect(terminal.aircraft.airspeed).toBeGreaterThanOrEqual(20);
    expect(terminal.aircraft.airspeed).toBeLessThanOrEqual(95);
    for (const value of Object.values(terminal.aircraft.globalPosition)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  test("bounds throttle, speed, pitch, roll, and normalized orientation", async ({
    page,
  }) => {
    const fixture = new FlightFixture(page);
    await fixture.reset("level-flight");
    const terminal = await fixture.step(3_600, {
      pitch: 1,
      roll: -1,
      throttleDelta: 1,
    });
    expect(terminal.aircraft.throttle).toBe(1);
    expect(terminal.aircraft.airspeed).toBeGreaterThan(55);
    expect(terminal.aircraft.airspeed).toBeLessThanOrEqual(95);
    expect(Math.abs(terminal.aircraft.pitchRate)).toBeLessThanOrEqual(
      Math.PI / 4 + 1e-8,
    );
    expect(Math.abs(terminal.aircraft.rollRate)).toBeLessThanOrEqual(
      (75 * Math.PI) / 180 + 1e-8,
    );
    const quaternionNorm = Math.hypot(
      ...Object.values(terminal.aircraft.orientation),
    );
    expect(quaternionNorm).toBeCloseTo(1, 5);
  });

  test("keeps the rendered nose aligned with travel through left and right banks", async ({
    page,
  }) => {
    const fixture = new FlightFixture(page);
    for (const roll of [-1, 1]) {
      let before = await fixture.reset("level-flight");
      for (let interval = 0; interval < 8; interval += 1) {
        const after = await fixture.step(30, {
          pitch: 0,
          roll,
          throttleDelta: 0,
        });
        expect(after.lifecycle.phase).toBe("flying");
        expect(horizontalForwardAlignment(before, after)).toBeGreaterThan(0.98);
        before = after;
      }
    }
  });

  test("applies gravity, lift, drag, stall hysteresis, and nose-down recovery", async ({
    page,
  }) => {
    const fixture = new FlightFixture(page);
    await fixture.reset("stall-recovery");
    const stalled = await fixture.step(2_400, {
      pitch: 0.35,
      roll: 0,
      throttleDelta: -1,
    });
    expect(stalled.aircraft.stallState).toBe("stalled");
    expect(stalled.aircraft.airspeed).toBeLessThan(30);
    expect(stalled.aircraft.verticalVelocity).toBeLessThan(0);

    const belowRecovery = await fixture.step(120, {
      pitch: -1,
      roll: 0,
      throttleDelta: 1,
    });
    if (belowRecovery.aircraft.airspeed < 38) {
      expect(belowRecovery.aircraft.stallState).toBe("stalled");
    }
    const recovered = await fixture.step(1_800, {
      pitch: -0.5,
      roll: 0,
      throttleDelta: 1,
    });
    expect(recovered.aircraft.airspeed).toBeGreaterThanOrEqual(38);
    expect(["recovering", "normal"]).toContain(recovered.aircraft.stallState);
  });

  test("is independent of render cadence for one command stream", async ({
    page,
  }) => {
    const fixture = new FlightFixture(page);
    await fixture.reset("level-flight");
    const oneBatch = await fixture.step(1_200, {
      pitch: 0.2,
      roll: 0.35,
      throttleDelta: 0.25,
    });
    await fixture.reset("level-flight");
    let chunked;
    for (let index = 0; index < 12; index += 1) {
      chunked = await fixture.step(100, {
        pitch: 0.2,
        roll: 0.35,
        throttleDelta: 0.25,
      });
    }
    expect(chunked.aircraft).toEqual(oneBatch.aircraft);
  });
});
