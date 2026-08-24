import { expect, test } from "@playwright/test";
import { FlightFixture } from "../helpers/flight-fixture.js";
import { measureInputResponse, percentile } from "../helpers/metrics.js";

const CHASE_CAMERA = Object.freeze({ height: 10, distance: 26 });

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

/** @param {any} left @param {any} right */
function vectorDistance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

/** @param {any} snapshot */
function chaseCameraAnchorError(snapshot) {
  const { aircraft, camera } = snapshot;
  const offset = rotateVectorByQuaternion(
    { x: 0, y: CHASE_CAMERA.height, z: CHASE_CAMERA.distance },
    aircraft.orientation,
  );
  return vectorDistance(camera.position, {
    x: aircraft.localPosition.x + offset.x,
    y: aircraft.localPosition.y + offset.y,
    z: aircraft.localPosition.z + offset.z,
  });
}

/** @param {any} snapshot */
function chaseCameraUpError(snapshot) {
  return vectorDistance(
    snapshot.camera.up,
    rotateVectorByQuaternion(
      { x: 0, y: 1, z: 0 },
      snapshot.aircraft.orientation,
    ),
  );
}

test("chase camera stays locked behind the glider while steering", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("level-flight");

  for (const controlFrame of [
    { pitch: 0.08, roll: 0.8, throttleDelta: 0.2 },
    { pitch: -0.04, roll: -0.8, throttleDelta: 0 },
    { pitch: 0, roll: 0, throttleDelta: 0 },
  ]) {
    const snapshot = await fixture.step(240, controlFrame);
    expect(snapshot.lifecycle.phase).toBe("flying");
    expect(chaseCameraAnchorError(snapshot)).toBeLessThan(1e-6);
    expect(chaseCameraUpError(snapshot)).toBeLessThan(1e-6);
    expect(snapshot.camera.distanceToAircraft).toBeCloseTo(
      Math.hypot(CHASE_CAMERA.distance, CHASE_CAMERA.height),
      6,
    );
  }
});

test("two-minute deterministic keyboard and pointer flight keeps the glider and chase view stable", async ({
  page,
}, testInfo) => {
  const fixture = await new FlightFixture(page).load();
  const initial = await fixture.reset("level-flight");
  const banked = await fixture.step(600, {
    pitch: 0.05,
    roll: 0.12,
    throttleDelta: 0.08,
  });
  const terminal = await fixture.step(6_600, {
    pitch: 0,
    roll: 0,
    throttleDelta: 0,
  });
  const straightLegDistance = Math.hypot(
    terminal.aircraft.globalPosition.x - banked.aircraft.globalPosition.x,
    terminal.aircraft.globalPosition.z - banked.aircraft.globalPosition.z,
  );
  expect(straightLegDistance).toBeGreaterThan(1_000);
  expect(terminal.elapsedFlightSeconds).toBeCloseTo(120, 6);
  expect(terminal.aircraft.globalPosition).not.toEqual(
    initial.aircraft.globalPosition,
  );
  expect(terminal.visual.gliderVisible).toBe(true);
  expect(terminal.camera.distanceToAircraft).toBeGreaterThan(8);
  expect(terminal.camera.distanceToAircraft).toBeLessThan(60);

  const responses = [];
  for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "w", "s"]) {
    responses.push(
      await measureInputResponse(page, async () => {
        await page.keyboard.down(key);
        await page.keyboard.up(key);
      }),
    );
  }
  const inputResponseP95Ms = percentile(responses, 0.95);
  expect(inputResponseP95Ms).toBeLessThanOrEqual(100);

  const canvas = page.locator("#flight-canvas");
  await canvas.click({ position: { x: 320, y: 180 } });
  await page.mouse.move(500, 260);
  const pointerActive = await fixture.snapshot();
  expect(pointerActive.controls.pointerLockActive).toBe(true);
  await page.keyboard.press("Escape");
  const pointerReleased = await fixture.snapshot();
  expect(pointerReleased.controls.pointerLockActive).toBe(false);
  expect(pointerReleased.controls.desktopStick).toEqual({ x: 0, y: 0 });

  await testInfo.attach("us1-flight-metrics", {
    body: JSON.stringify(
      {
        project: testInfo.project.name,
        seed: initial.seed,
        commandStream: [
          {
            steps: 600,
            controlFrame: { pitch: 0.05, roll: 0.12, throttleDelta: 0.08 },
          },
          {
            steps: 6_600,
            controlFrame: { pitch: 0, roll: 0, throttleDelta: 0 },
          },
        ],
        expected: {
          elapsedFlightSeconds: 120,
          minimumStraightLegMeters: 1_000,
          cameraDistanceMeters: { exclusiveMinimum: 8, exclusiveMaximum: 60 },
          inputResponseP95BudgetMs: 100,
        },
        actual: {
          terminalAircraft: terminal.aircraft,
          elapsedFlightSeconds: terminal.elapsedFlightSeconds,
          straightLegDistanceMeters: straightLegDistance,
          cameraDistanceMeters: terminal.camera.distanceToAircraft,
          inputResponseSamplesMs: responses,
          inputResponseP95Ms,
        },
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

test("stall-recovery fixture remains controllable after an induced stall", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("stall-recovery");
  const stalled = await fixture.step(2_400, {
    pitch: 0.35,
    roll: 0,
    throttleDelta: -1,
  });
  expect(stalled.aircraft.stallState).toBe("stalled");
  const recovered = await fixture.step(1_800, {
    pitch: -0.5,
    roll: 0.1,
    throttleDelta: 1,
  });
  expect(["recovering", "normal"]).toContain(recovered.aircraft.stallState);
  expect(recovered.lifecycle.phase).toBe("flying");
});

test("HUD remains authoritative through rebase, crash, and keyboard restart", async ({
  page,
}, testInfo) => {
  const fixture = await new FlightFixture(page).load();
  const cadenceBefore = (await fixture.snapshot()).hud.updateCount;
  await page.waitForTimeout(350);
  const cadenceAfter = (await fixture.snapshot()).hud.updateCount;
  expect(cadenceAfter - cadenceBefore).toBeGreaterThanOrEqual(3);

  await fixture.reset("origin-rebase");
  const rebased = await fixture.step(240, {
    pitch: 0,
    roll: 0,
    throttleDelta: 1,
  });
  const expectedSpeed = `${Math.round(rebased.aircraft.airspeed * 3.6)} km/h`;
  const expectedAltitude = `${Math.round(rebased.aircraft.clearance)} m`;
  const expectedCoordinates = `X ${Math.round(rebased.aircraft.globalPosition.x)} · Y ${Math.round(rebased.aircraft.globalPosition.y)} · Z ${Math.round(rebased.aircraft.globalPosition.z)} m`;
  expect(rebased.hud).toMatchObject({
    speedKph: Math.round(rebased.aircraft.airspeed * 3.6),
    altitudeMeters: Math.round(rebased.aircraft.clearance),
    coordinateX: Math.round(rebased.aircraft.globalPosition.x),
    coordinateY: Math.round(rebased.aircraft.globalPosition.y),
    coordinateZ: Math.round(rebased.aircraft.globalPosition.z),
    lifecycleLabel: "Flight active",
    primaryAction: "none",
    controlMode: "keyboard",
    orientationPrompt: false,
  });
  for (const value of [
    rebased.hud.speedKph,
    rebased.hud.altitudeMeters,
    rebased.hud.coordinateX,
    rebased.hud.coordinateY,
    rebased.hud.coordinateZ,
  ]) {
    expect(Number.isFinite(value)).toBe(true);
    expect(Number.isInteger(value)).toBe(true);
  }
  await expect(page.locator("#hud-speed")).toHaveText(expectedSpeed);
  await expect(page.locator("#hud-altitude")).toHaveText(expectedAltitude);
  await expect(page.locator("#hud-coordinates")).toHaveText(
    expectedCoordinates,
  );
  expect((await fixture.world()).worldOrigin.x).toBe(8192);

  await fixture.reset("terrain-impact");
  const crashed = await fixture.step(120, {
    pitch: -1,
    roll: 0,
    throttleDelta: 1,
  });
  expect(crashed.hud.lifecycleLabel).toBe("Terrain impact. Flight stopped.");
  expect(crashed.hud.primaryAction).toBe("restart");
  await expect(
    page.getByRole("heading", { name: "Glider crashed" }),
  ).toBeVisible();
  await page.keyboard.press("r");
  await expect(page.getByTestId("application-state")).toHaveAttribute(
    "data-phase",
    "flying",
  );
  const restarted = await fixture.snapshot();
  await expect(page.locator("#hud-speed")).toHaveText("198 km/h");
  await expect(page.locator("#hud-altitude")).toHaveText("160 m");
  expect(restarted.aircraft.clearance).toBeCloseTo(160, 6);
  expect(restarted.attemptNumber).toBe(2);
  expect(restarted.hud.lifecycleLabel).toBe("Flight active");
  expect(restarted.hud.primaryAction).toBe("none");

  await testInfo.attach("us3-hud-recovery", {
    body: JSON.stringify(
      {
        project: testInfo.project.name,
        cadence: {
          intervalMs: 100,
          observationMs: 350,
          updateCount: cadenceAfter - cadenceBefore,
        },
        rebase: {
          aircraft: rebased.aircraft,
          hud: rebased.hud,
          expected: {
            speed: expectedSpeed,
            altitude: expectedAltitude,
            coordinates: expectedCoordinates,
          },
        },
        crash: {
          lifecycle: crashed.lifecycle,
          aircraft: crashed.aircraft,
          hud: crashed.hud,
        },
        restart: {
          attemptNumber: restarted.attemptNumber,
          crashCount: restarted.crashCount,
          aircraft: restarted.aircraft,
          hud: restarted.hud,
        },
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});
