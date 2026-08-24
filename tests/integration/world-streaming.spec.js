import { expect, test } from "@playwright/test";
import { FlightFixture } from "../helpers/flight-fixture.js";

test.describe("bounded deterministic world streaming", () => {
  test.beforeEach(async ({ page }) => {
    const fixture = await new FlightFixture(page).load();
    await fixture.reset("region-seam");
  });

  test("keeps an exactly 5x5 ready map while recycling a bounded pool", async ({
    page,
  }, testInfo) => {
    const fixture = new FlightFixture(page);
    const initial = await fixture.world();
    const initialPoolIds = initial.poolIds;

    await fixture.region(4, -3);
    const shifted = await fixture.world();
    await fixture.region(-5, 6);
    const reversed = await fixture.world();

    for (const state of [initial, shifted, reversed]) {
      expect(state.activeRegionCount).toBe(25);
      expect(state.poolSize).toBe(25);
      expect(new Set(state.activeKeys).size).toBe(25);
      expect(state.collisionHorizonReady).toBe(true);
      expect(state.duplicateDescriptors).toBe(0);
    }
    expect(shifted.poolIds.toSorted()).toEqual(initialPoolIds.toSorted());
    expect(reversed.poolIds.toSorted()).toEqual(initialPoolIds.toSorted());
    expect(reversed.recycleCount).toBeGreaterThan(0);
    await testInfo.attach("world-pool-metrics", {
      body: JSON.stringify(
        {
          project: testInfo.project.name,
          initial,
          shifted,
          reversed,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });

  test("regenerates descriptors independently of request direction and restart", async ({
    page,
  }) => {
    const fixture = new FlightFixture(page);
    const forward = await fixture.region(7, -4);
    await fixture.region(-8, 5);
    const afterReverse = await fixture.region(7, -4);
    expect(afterReverse.descriptorHash).toBe(forward.descriptorHash);

    const beforeCrash = await fixture.world();
    await fixture.dispatchLifecycle("TERRAIN_CRASH");
    await fixture.dispatchLifecycle("RESTART");
    const afterRestart = await fixture.world();
    const regeneratedAfterRestart = await fixture.region(7, -4);
    expect(afterRestart.sessionSeed).toBe(beforeCrash.sessionSeed);
    expect(regeneratedAfterRestart.descriptorHash).toBe(forward.descriptorHash);
    expect(afterRestart.poolIds.toSorted()).toEqual(
      beforeCrash.poolIds.toSorted(),
    );
  });

  test("rebases render space without changing global continuity", async ({
    page,
  }) => {
    const fixture = new FlightFixture(page);
    await fixture.reset("origin-rebase");
    const before = await fixture.snapshot();
    await fixture.step(240, { pitch: 0, roll: 0, throttleDelta: 1 });
    const after = await fixture.snapshot();
    const world = await fixture.world();

    expect(after.aircraft.globalPosition.x).toBeGreaterThan(
      before.aircraft.globalPosition.x,
    );
    expect(world.worldOrigin.x).toBe(8192);
    expect(world.originRevision).toBe(1);
    expect(Math.abs(after.aircraft.localPosition.x)).toBeLessThan(8192);
    expect(world.collisionHorizonReady).toBe(true);
    expect(world.duplicateDescriptors).toBe(0);
  });
});
