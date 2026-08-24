import { expect } from "@playwright/test";

/** @type {Readonly<Record<string, number>>} */
export const FIXTURES = Object.freeze({
  "level-flight": 0x1a2b3c4d,
  "stall-recovery": 0x5e6f7788,
  "terrain-impact": 0x0badc0de,
  "region-seam": 0x13579bdf,
  "restart-world": 0x2468ace0,
  "origin-rebase": 0x7f4a7c15,
});

export class FlightFixture {
  /** @param {import("@playwright/test").Page} page */
  constructor(page) {
    this.page = page;
  }

  async load() {
    await this.page.goto("/");
    await expect(this.page.getByTestId("application-state")).toHaveAttribute(
      "data-phase",
      /ready|flying/,
      { timeout: 15_000 },
    );
    await this.page.waitForFunction(() =>
      Object.isFrozen(globalThis.__WFS_TEST__),
    );
    return this;
  }

  /** @param {string | number} fixtureOrSeed */
  async reset(fixtureOrSeed) {
    const seed =
      typeof fixtureOrSeed === "string"
        ? FIXTURES[fixtureOrSeed]
        : fixtureOrSeed;
    if (!Number.isInteger(seed)) throw new TypeError("unknown fixture seed");
    return this.page.evaluate(
      (value) => globalThis.__WFS_TEST__.reset(value),
      seed,
    );
  }

  async step(
    /** @type {number} */
    stepCount,
    /** @type {{pitch: number, roll: number, throttleDelta: number}} */
    controlFrame = { pitch: 0, roll: 0, throttleDelta: 0 },
  ) {
    return this.page.evaluate(
      ({ count, frame }) => globalThis.__WFS_TEST__.step(count, frame),
      { count: stepCount, frame: controlFrame },
    );
  }

  async snapshot() {
    return this.page.evaluate(() => globalThis.__WFS_TEST__.snapshot());
  }

  /** @param {number} globalX @param {number} globalZ */
  async sampleTerrain(globalX, globalZ) {
    return this.page.evaluate(
      ({ x, z }) => globalThis.__WFS_TEST__.sampleTerrain(x, z),
      { x: globalX, z: globalZ },
    );
  }

  /** @param {number} regionX @param {number} regionZ */
  async region(regionX, regionZ) {
    return this.page.evaluate(
      ({ x, z }) => globalThis.__WFS_TEST__.region(x, z),
      { x: regionX, z: regionZ },
    );
  }

  async world() {
    return this.page.evaluate(() => globalThis.__WFS_TEST__.world());
  }

  /** @param {number} fps @param {number} seconds */
  async simulateQuality(fps, seconds) {
    return this.page.evaluate(
      ({ framesPerSecond, durationSeconds }) =>
        globalThis.__WFS_TEST__.simulateQuality(
          framesPerSecond,
          durationSeconds,
        ),
      { framesPerSecond: fps, durationSeconds: seconds },
    );
  }

  /** @param {string} event */
  async dispatchLifecycle(event) {
    return this.page.evaluate(
      (controlledEvent) =>
        globalThis.__WFS_TEST__.dispatchLifecycle(controlledEvent),
      event,
    );
  }

  async metrics() {
    return this.page.evaluate(() => globalThis.__WFS_TEST__.metrics());
  }
}
