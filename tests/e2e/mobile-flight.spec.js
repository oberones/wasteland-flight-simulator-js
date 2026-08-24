import { expect, test } from "@playwright/test";
import { FlightFixture } from "../helpers/flight-fixture.js";
import { measureInputResponse, percentile } from "../helpers/metrics.js";

test("landscape touch controls fly with joystick and throttle concurrently", async ({
  page,
}, testInfo) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("level-flight");
  const stick = page.locator("#touch-stick");
  const throttle = page.locator("#throttle-up");
  await page.locator("#touch-controls").evaluate((element) => {
    element.style.display = "flex";
  });
  await testInfo.attach("us3-mobile-hud-spawn", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  const box = await stick.boundingBox();
  if (!box) throw new Error("touch stick bounding box is unavailable");

  await stick.dispatchEvent("pointerdown", {
    pointerId: 21,
    pointerType: "touch",
    clientX: box.x + box.width * 0.72,
    clientY: box.y + box.height * 0.28,
  });
  await throttle.dispatchEvent("pointerdown", {
    pointerId: 22,
    pointerType: "touch",
  });
  const active = await fixture.snapshot();
  expect(active.controls.frame.pitch).toBeGreaterThan(0);
  expect(active.controls.frame.roll).toBeGreaterThan(0);
  expect(active.controls.frame.throttleDelta).toBe(1);

  const banked = await fixture.step(600, active.controls.frame);

  await stick.dispatchEvent("pointerup", {
    pointerId: 21,
    pointerType: "touch",
  });
  await throttle.dispatchEvent("pointerup", {
    pointerId: 22,
    pointerType: "touch",
  });
  const neutral = await fixture.snapshot();
  expect(neutral.controls.frame).toEqual({
    pitch: 0,
    roll: 0,
    throttleDelta: 0,
  });

  const flown = await fixture.step(6_600, neutral.controls.frame);
  const straightLegDistance = Math.hypot(
    flown.aircraft.globalPosition.x - banked.aircraft.globalPosition.x,
    flown.aircraft.globalPosition.z - banked.aircraft.globalPosition.z,
  );
  expect(straightLegDistance).toBeGreaterThan(1_000);
  expect(flown.elapsedFlightSeconds).toBeCloseTo(120, 6);
  expect(flown.lifecycle.phase).toBe("flying");
  expect(flown.visual.gliderVisible).toBe(true);

  const touchInputResponseSamplesMs = [];
  for (let index = 0; index < 5; index += 1) {
    const pointerId = 100 + index;
    touchInputResponseSamplesMs.push(
      await measureInputResponse(page, () =>
        throttle.dispatchEvent("pointerdown", {
          pointerId,
          pointerType: "touch",
        }),
      ),
    );
    await throttle.dispatchEvent("pointercancel", {
      pointerId,
      pointerType: "touch",
    });
  }
  const touchInputResponseP95Ms = percentile(touchInputResponseSamplesMs, 0.95);
  expect(touchInputResponseP95Ms).toBeLessThanOrEqual(100);

  await testInfo.attach("us3-mobile-landscape", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  await fixture.reset("terrain-impact");
  const crashed = await fixture.step(120, {
    pitch: -1,
    roll: 0,
    throttleDelta: 1,
  });
  expect(crashed.lifecycle.phase).toBe("crashed");
  await expect(
    page.getByRole("heading", { name: "Glider crashed" }),
  ).toBeVisible();
  await testInfo.attach("us3-mobile-crash", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.getByRole("button", { name: "Restart" }).tap();
  await expect(page.getByTestId("application-state")).toHaveAttribute(
    "data-phase",
    "flying",
  );
  await page.waitForTimeout(300);
  await testInfo.attach("us3-mobile-respawn", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  await testInfo.attach("us1-touch-flight-metrics", {
    body: JSON.stringify(
      {
        project: testInfo.project.name,
        seed: flown.seed,
        commandStream: [
          { steps: 600, controlFrame: active.controls.frame },
          { steps: 6_600, controlFrame: neutral.controls.frame },
        ],
        expected: {
          elapsedFlightSeconds: 120,
          minimumStraightLegMeters: 1_000,
          lifecyclePhase: "flying",
          touchInputResponseP95BudgetMs: 100,
        },
        actual: {
          terminalAircraft: flown.aircraft,
          elapsedFlightSeconds: flown.elapsedFlightSeconds,
          straightLegDistanceMeters: straightLegDistance,
          lifecyclePhase: flown.lifecycle.phase,
          touchInputResponseSamplesMs,
          touchInputResponseP95Ms,
        },
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

test("touch lifecycle clears ownership and requires deliberate resume", async ({
  page,
}, testInfo) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("level-flight");
  await expect(page.locator("#legend-copy")).toContainText("Drag the joystick");

  const stick = page.locator("#touch-stick");
  const throttle = page.locator("#throttle-up");
  const box = await stick.boundingBox();
  if (!box) throw new Error("touch stick bounding box is unavailable");
  await stick.dispatchEvent("pointerdown", {
    pointerId: 41,
    pointerType: "touch",
    clientX: box.x + box.width * 0.75,
    clientY: box.y + box.height * 0.25,
  });
  await throttle.dispatchEvent("pointerdown", {
    pointerId: 42,
    pointerType: "touch",
  });
  expect((await fixture.snapshot()).controls.frame.throttleDelta).toBe(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Rotate to landscape" }),
  ).toBeVisible();
  const portrait = await fixture.snapshot();
  expect(portrait.lifecycle.phase).toBe("paused");
  expect(portrait.lifecycle.pauseReasons).toContain("orientation");
  expect(portrait.controls.frame).toEqual({
    pitch: 0,
    roll: 0,
    throttleDelta: 0,
  });
  await expect(page.locator("#touch-controls")).toBeHidden();
  await expect(page.locator("#hud")).toBeHidden();
  await expect(page.locator("#control-legend")).toBeHidden();
  await testInfo.attach("us4-portrait-prompt", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByRole("heading", { name: "Rotate to landscape" }),
  ).toBeHidden();
  expect((await fixture.snapshot()).lifecycle.phase).toBe("paused");
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await testInfo.attach("us4-landscape-resume", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.getByRole("button", { name: "Resume" }).tap();
  await expect(page.getByTestId("application-state")).toHaveAttribute(
    "data-phase",
    "flying",
  );

  await page.getByRole("button", { name: "Pause" }).tap();
  await expect(page.getByRole("button", { name: "Resume" })).toBeFocused();
  await page.getByRole("button", { name: "Resume" }).tap();
  await fixture.dispatchLifecycle("FOCUS_LOST");
  expect((await fixture.snapshot()).lifecycle.phase).toBe("paused");
  await fixture.dispatchLifecycle("FOCUS_READY");
  expect((await fixture.snapshot()).lifecycle.phase).toBe("paused");
  await page.getByRole("button", { name: "Resume" }).tap();
  expect((await fixture.snapshot()).lifecycle.phase).toBe("flying");
});

test("reduced-motion touch flight preserves controls and simulation", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const fixture = await new FlightFixture(page).load();
  const initial = await fixture.reset("level-flight");
  const stick = page.locator("#touch-stick");
  const box = await stick.boundingBox();
  if (!box) throw new Error("touch stick bounding box is unavailable");
  await stick.dispatchEvent("pointerdown", {
    pointerId: 81,
    pointerType: "touch",
    clientX: box.x + box.width * 0.7,
    clientY: box.y + box.height * 0.3,
  });
  const active = await fixture.snapshot();
  const terminal = await fixture.step(600, active.controls.frame);
  const metrics = await fixture.metrics();
  expect(terminal.simulationConfigHash).toBe(initial.simulationConfigHash);
  expect(terminal.aircraft.globalPosition).not.toEqual(
    initial.aircraft.globalPosition,
  );
  expect(metrics.reducedMotion).toBe(true);
  expect(metrics.ash.count).toBeLessThanOrEqual(260);
  expect(metrics.ash.drift).toBeLessThanOrEqual(3);
  await testInfo.attach("us4-reduced-motion-touch", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await stick.dispatchEvent("pointercancel", {
    pointerId: 81,
    pointerType: "touch",
  });
  expect((await fixture.snapshot()).controls.frame).toEqual({
    pitch: 0,
    roll: 0,
    throttleDelta: 0,
  });
});
