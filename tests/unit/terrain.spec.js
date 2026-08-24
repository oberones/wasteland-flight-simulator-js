import { expect, test } from "@playwright/test";
import { FlightFixture } from "../helpers/flight-fixture.js";

/** @param {any} region @param {number} globalX @param {number} globalZ */
const interpolateRenderedCell = (region, globalX, globalZ) => {
  const cellSize = region.regionSize / (region.samplesPerSide - 1);
  const localX = globalX - region.regionX * region.regionSize;
  const localZ = globalZ - region.regionZ * region.regionSize;
  const cellX = Math.min(
    region.samplesPerSide - 2,
    Math.max(0, Math.floor(localX / cellSize)),
  );
  const cellZ = Math.min(
    region.samplesPerSide - 2,
    Math.max(0, Math.floor(localZ / cellSize)),
  );
  const tx = localX / cellSize - cellX;
  const tz = localZ / cellSize - cellZ;
  /** @param {number} x @param {number} z */
  const index = (x, z) => z * region.samplesPerSide + x;
  const h00 = region.heights[index(cellX, cellZ)];
  const h10 = region.heights[index(cellX + 1, cellZ)];
  const h01 = region.heights[index(cellX, cellZ + 1)];
  const h11 = region.heights[index(cellX + 1, cellZ + 1)];
  if (tx + tz <= 1) {
    return h00 + (h10 - h00) * tx + (h01 - h00) * tz;
  }
  return h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz);
};

test.describe("deterministic rendered terrain", () => {
  test.beforeEach(async ({ page }) => {
    const fixture = await new FlightFixture(page).load();
    await fixture.reset("region-seam");
  });

  test("global height samples and region descriptor hashes replay exactly", async ({
    page,
  }, testInfo) => {
    const fixture = new FlightFixture(page);
    const coordinates = [
      [0, 0],
      [767.75, -320.25],
      [-1536, 2304],
      [8191.5, -8192.5],
    ];
    const first = [];
    for (const [x, z] of coordinates) {
      first.push(await fixture.sampleTerrain(x, z));
    }
    const firstRegion = await fixture.region(-2, 3);
    await fixture.reset("region-seam");
    const second = [];
    for (const [x, z] of coordinates.toReversed()) {
      second.unshift(await fixture.sampleTerrain(x, z));
    }
    const secondRegion = await fixture.region(-2, 3);

    expect(second).toEqual(first);
    expect(secondRegion.descriptorHash).toBe(firstRegion.descriptorHash);
    expect(secondRegion.heightHash).toBe(firstRegion.heightHash);
    expect(secondRegion.ruinHash).toBe(firstRegion.ruinHash);
    await testInfo.attach("region-seam-descriptor", {
      body: JSON.stringify(
        {
          project: testInfo.project.name,
          seed: 0x13579bdf,
          region: firstRegion.key,
          descriptorHash: firstRegion.descriptorHash,
          heightHash: firstRegion.heightHash,
          ruinHash: firstRegion.ruinHash,
          edgeHashes: firstRegion.edgeHashes,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });

  test("shared edges are byte-equal and sampling uses rendered triangles", async ({
    page,
  }) => {
    const fixture = new FlightFixture(page);
    const west = await fixture.region(0, 0);
    const east = await fixture.region(1, 0);
    const south = await fixture.region(0, 1);

    expect(west.edgeHashes.east).toBe(east.edgeHashes.west);
    expect(west.edgeHashes.south).toBe(south.edgeHashes.north);
    expect(west.edges.east).toEqual(east.edges.west);
    expect(west.edges.south).toEqual(south.edges.north);

    const globalX = 312.375;
    const globalZ = 551.625;
    const rendered = interpolateRenderedCell(west, globalX, globalZ);
    const sampled = await fixture.sampleTerrain(globalX, globalZ);
    expect(sampled.height).toBeCloseTo(rendered, 6);
    expect(sampled.ready).toBe(true);
    expect(sampled.topology).toMatch(/lower|upper/);
  });

  test("cracks are cosmetic while slope and ruin rules remain deterministic", async ({
    page,
  }) => {
    const fixture = new FlightFixture(page);
    const region = await fixture.region(0, 0);
    const world = await fixture.world();

    expect(region.crackSegments.length).toBeGreaterThan(0);
    for (const endpoint of region.crackSegments.slice(0, 8)) {
      const terrain = await fixture.sampleTerrain(
        endpoint.globalX,
        endpoint.globalZ,
      );
      expect(endpoint.y).toBeGreaterThan(terrain.height);
    }
    expect(region.cracksAffectCollision).toBe(false);
    expect(world.slopeClasses).toEqual(
      expect.arrayContaining(["flat", "hills", "mountain"]),
    );
    expect(world.ruinClusters).toBeGreaterThanOrEqual(4);
    expect(world.spawnVisibleRuinClusters).toBeGreaterThanOrEqual(1);
    for (const ruin of world.activeRuins) {
      expect(ruin.slopeClass).toBe("flat");
      const inSpawnCorridor =
        Math.abs(ruin.globalX) < 180 &&
        ruin.globalZ <= 160 &&
        ruin.globalZ >= -1200;
      expect(inSpawnCorridor).toBe(false);
    }
  });
});
