import { expect, test } from "@playwright/test";
import { FlightFixture } from "../helpers/flight-fixture.js";

test.describe("terrain crash and same-world restart", () => {
  test("sweeps into one clamped crash and freezes physics and input", async ({
    page,
  }) => {
    const fixture = await new FlightFixture(page).load();
    const initial = await fixture.reset("terrain-impact");
    expect(initial.aircraft.clearance).toBeGreaterThan(0);

    const crashed = await fixture.step(120, {
      pitch: -1,
      roll: 0.4,
      throttleDelta: 1,
    });
    expect(crashed.lifecycle.phase).toBe("crashed");
    expect(crashed.lifecycle.crashReason).toBe("terrain");
    expect(crashed.crashCount).toBe(1);
    expect(crashed.aircraft.clearance).toBe(0);
    expect(crashed.aircraft.globalPosition.y).toBeCloseTo(
      crashed.aircraft.terrainSurfaceY + 2,
      6,
    );
    expect(crashed.controls.frame).toEqual({
      pitch: 0,
      roll: 0,
      throttleDelta: 0,
    });

    const frozen = await fixture.step(600, {
      pitch: 1,
      roll: -1,
      throttleDelta: -1,
    });
    expect(frozen.aircraft).toEqual(crashed.aircraft);
    expect(frozen.crashCount).toBe(1);
    expect(frozen.elapsedFlightSeconds).toBe(crashed.elapsedFlightSeconds);
  });

  test("restarts within two seconds with fresh aircraft and the same world", async ({
    page,
  }) => {
    const fixture = await new FlightFixture(page).load();
    const initial = await fixture.reset("terrain-impact");
    const regionBefore = await fixture.region(0, 0);
    await fixture.step(120, { pitch: -1, roll: 0, throttleDelta: 1 });

    const startedAt = performance.now();
    await fixture.dispatchLifecycle("RESTART");
    const recoveryMs = performance.now() - startedAt;
    const restarted = await fixture.snapshot();
    const regionAfter = await fixture.region(0, 0);

    expect(recoveryMs).toBeLessThanOrEqual(2_000);
    expect(restarted.lifecycle.phase).toBe("flying");
    expect(restarted.attemptNumber).toBe(2);
    expect(restarted.crashCount).toBe(1);
    expect(restarted.seed).toBe(initial.seed);
    expect(restarted.aircraft.airspeed).toBe(55);
    expect(restarted.aircraft.clearance).toBeCloseTo(160, 6);
    expect(restarted.aircraft.verticalVelocity).toBe(0);
    expect(restarted.controls.frame).toEqual({
      pitch: 0,
      roll: 0,
      throttleDelta: 0,
    });
    expect(regionAfter.descriptorHash).toBe(regionBefore.descriptorHash);
    expect(regionAfter.heightHash).toBe(regionBefore.heightHash);
    expect(regionAfter.ruinHash).toBe(regionBefore.ruinHash);
  });

  test("holds listener, DOM, scene, world, and pool counts across 20 cycles", async ({
    page,
  }, testInfo) => {
    const fixture = await new FlightFixture(page).load();
    await fixture.reset("restart-world");
    const regionBefore = await fixture.region(0, 0);
    const baseline = await fixture.metrics();
    const recoveryTimesMs = [];

    for (let cycle = 0; cycle < 20; cycle += 1) {
      const crashed = await fixture.step(1_200, {
        pitch: -1,
        roll: 0,
        throttleDelta: 1,
      });
      expect(crashed.lifecycle.phase).toBe("crashed");
      const startedAt = performance.now();
      await fixture.dispatchLifecycle("RESTART");
      recoveryTimesMs.push(performance.now() - startedAt);
      const restarted = await fixture.snapshot();
      expect(restarted.lifecycle.phase).toBe("flying");
    }

    const terminal = await fixture.snapshot();
    const metrics = await fixture.metrics();
    const regionAfter = await fixture.region(0, 0);
    expect(terminal.attemptNumber).toBe(21);
    expect(terminal.crashCount).toBe(20);
    expect(Math.max(...recoveryTimesMs)).toBeLessThanOrEqual(2_000);
    expect(metrics.listeners).toBe(baseline.listeners);
    expect(metrics.domOverlays).toBe(baseline.domOverlays);
    expect(metrics.sceneObjects).toBe(baseline.sceneObjects);
    expect(metrics.world.poolSize).toBe(baseline.world.poolSize);
    expect(metrics.world.poolIds).toEqual(baseline.world.poolIds);
    expect(metrics.world.allocatedBytes).toBe(baseline.world.allocatedBytes);
    expect(regionAfter.descriptorHash).toBe(regionBefore.descriptorHash);

    await testInfo.attach("restart-twenty", {
      body: JSON.stringify(
        {
          project: testInfo.project.name,
          seed: terminal.seed,
          recoveryTimesMs,
          baseline,
          terminal,
          metrics,
          worldHash: regionAfter.descriptorHash,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });
});
