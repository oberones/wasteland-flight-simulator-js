import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { FlightFixture } from "../helpers/flight-fixture.js";
const baseline = JSON.parse(
  await readFile(
    new URL("../../art/scenery/validation/legacy-hashes.json", import.meta.url),
    "utf8",
  ),
);

const sceneryHashes = JSON.parse(
  await readFile(
    new URL(
      "../../art/scenery/validation/scenery-hashes.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

/** Content is independent of whichever region owns the fixed buffers. */
function content(/** @type {any} */ r) {
  return {
    hash: r.scenery.hash,
    instances: r.scenery.instances,
    sites: r.scenery.sites,
    batches: Object.values(r.scenery.batches).map((/** @type {any} */ b) => ({
      positions: b.positionHash,
      normals: b.normalHash,
      colors: b.colorHash,
      indices: b.indexHash,
      bounds: b.bounds,
    })),
  };
}

test("matches fixed scenery, terrain and ruin hashes across 81 regions", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset(baseline.seed);
  for (const b of baseline.regions) {
    const r = await fixture.region(b.x, b.z);
    expect(r.scenery.hash).toBe(
      sceneryHashes.regions.find(
        (/** @type {any} */ f) => f.x === b.x && f.z === b.z,
      ).hash,
    );
    expect({
      height: r.heightHash,
      ruin: r.ruinHash,
      descriptor: r.descriptorHash,
    }).toEqual({ height: b.height, ruin: b.ruin, descriptor: b.descriptor });
  }
});

test("all site templates respect caps, exclusions, and steep terrain can remain empty", async ({
  page,
}) => {
  await new FlightFixture(page).load();
  const data = await page.evaluate(() => {
    const api = globalThis.__WFS_TEST__,
      flat = [],
      steep = [];
    for (let seed = 0; seed < 100; seed++) {
      flat.push(api.sceneryFixture(seed, 0, 0));
      steep.push(api.sceneryFixture(seed, 0, 0, 1, 0.3));
    }
    return { flat, steep, catalog: api.sceneryCatalog() };
  });
  const templates = new Set(),
    assets = new Set();
  let zero = 0,
    two = 0;
  expect(Object.keys(data.catalog.models)).toHaveLength(32);
  for (const s of data.flat) {
    if (s.targetSites === 0) zero++;
    if (s.sites.length === 2) two++;
    expect(s.sites.length).toBeLessThanOrEqual(2);
    expect(s.counts.buildings).toBeLessThanOrEqual(2);
    expect(s.counts.others).toBeLessThanOrEqual(64);
    expect(s.counts.triangles).toBeLessThanOrEqual(6000);
    for (const site of s.sites) {
      templates.add(site.template);
      expect(site.attempt).toBeLessThan(8);
    }
    for (const i of s.instances) {
      assets.add(i.assetId);
      expect(i.footprint.minX).toBeGreaterThanOrEqual(0);
      expect(i.footprint.maxX).toBeLessThanOrEqual(768);
      expect(i.footprint.minZ).toBeGreaterThanOrEqual(0);
      expect(i.footprint.maxZ).toBeLessThanOrEqual(768);
      expect(i.footprint.minX >= 180 || i.footprint.minZ >= 160).toBe(true);
    }
    for (const kind of ["major", "minor"])
      expect(s.counts[kind]).toBeLessThanOrEqual(data.catalog.limits[kind]);
  }
  expect(templates.size).toBe(6);
  expect(assets.size).toBe(32);
  expect(zero).toBeGreaterThan(0);
  expect(two).toBeGreaterThan(0);
  expect(
    data.steep.every((/** @type {any} */ s) => s.instances.length === 0),
  ).toBe(true);
});

test("real footprints follow rendered terrain, remain clear, and refresh empty pooled batches", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset(0x1a2b3c4d);
  const buffers = new Map();
  let empty = 0,
    occupied = 0;
  const catalog = await page.evaluate(() =>
    globalThis.__WFS_TEST__.sceneryCatalog(),
  );
  for (let z = -3; z <= 3; z++)
    for (let x = -3; x <= 3; x++) {
      const r = await fixture.region(x * 2, z * 2),
        s = r.scenery;
      expect(s.affectsCollision).toBe(false);
      expect(s.counts.triangles).toBe(
        s.batches.major.triangles + s.batches.minor.triangles,
      );
      const identity = Object.values(s.batches).map((/** @type {any} */ b) => ({
        geometry: b.geometryId,
        buffers: b.bufferIds,
        bytes: b.allocatedBytes,
        attributes: b.attributes,
      }));
      if (buffers.has(r.poolId))
        expect(identity).toEqual(buffers.get(r.poolId));
      else buffers.set(r.poolId, identity);
      for (const [kind, b] of Object.entries(s.batches)) {
        const batch = /** @type {any} */ (b);
        expect(batch.materialId).toBe(r.buildings.bodyMaterialId);
        expect(batch.receiveShadow).toBe(true);
        expect(batch.castShadow).toBe(kind === "major");
        expect(batch.vertices).toBeLessThanOrEqual(batch.vertexCapacity);
        expect(batch.triangles * 3).toBeLessThanOrEqual(batch.indexCapacity);
        expect(batch.normalLengthError).toBeLessThan(0.000001);
        if (batch.triangles === 0) {
          empty++;
          expect(batch.visible).toBe(false);
          expect(batch.bounds).toEqual({ min: [0, 0, 0], max: [0, 0, 0] });
          expect(batch.sphere.radius).toBe(0);
        } else {
          occupied++;
          expect(batch.visible).toBe(true);
          expect(batch.sphere.radius).toBeGreaterThan(0);
        }
      }
      for (const i of s.instances) {
        const f = i.footprint,
          p = catalog.models[i.assetId].placement;
        expect(f.minX).toBeGreaterThanOrEqual(x * 2 * 768);
        expect(f.maxX).toBeLessThanOrEqual((x * 2 + 1) * 768);
        expect(f.minZ).toBeGreaterThanOrEqual(z * 2 * 768);
        expect(f.maxZ).toBeLessThanOrEqual((z * 2 + 1) * 768);
        expect(i.ground.variation).toBeLessThanOrEqual(
          p.maxVariation * i.scale + 1e-8,
        );
        expect(i.ground.slope).toBeLessThanOrEqual(p.maxSlope);
        expect(
          f.maxX <= -180 || f.minX >= 180 || f.maxZ <= -1200 || f.minZ >= 160,
        ).toBe(true);
        for (const ruin of r.ruins)
          expect(
            f.maxX <= ruin.globalX - ruin.width / 2 - 4 ||
              f.minX >= ruin.globalX + ruin.width / 2 + 4 ||
              f.maxZ <= ruin.globalZ - ruin.depth / 2 - 4 ||
              f.minZ >= ruin.globalZ + ruin.depth / 2 + 4,
          ).toBe(true);
        const heights = await page.evaluate((f) => {
          const out = [];
          for (let x = 0; x <= 4; x++)
            for (let z = 0; z <= 4; z++)
              out.push(
                globalThis.__WFS_TEST__.sampleTerrain(
                  f.minX + ((f.maxX - f.minX) * x) / 4,
                  f.minZ + ((f.maxZ - f.minZ) * z) / 4,
                ).height,
              );
          return out;
        }, f);
        expect(Math.max(...heights)).toBeLessThanOrEqual(i.ground.max + 1e-7);
        expect(Math.min(...heights)).toBeGreaterThanOrEqual(
          i.ground.min - 1e-7,
        );
        expect(i.baseY).toBeCloseTo(i.ground.max - p.embedDepth * i.scale, 8);
        expect(
          i.baseY + catalog.models[i.assetId].bounds.min[1] * i.scale,
        ).toBeLessThanOrEqual(i.ground.min + 0.00001);
      }
    }
  expect(empty).toBeGreaterThan(0);
  expect(occupied).toBeGreaterThan(0);
  expect(buffers.size).toBeLessThanOrEqual(25);
});

test("scenery repeats across reverse travel, recycling, restart, and rebasing", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset(0x1a2b3c4d);
  const locations = [
      [0, 0],
      [-2, -2],
      [3, 1],
      [-3, 4],
    ],
    before = [];
  for (const [x, z] of locations)
    before.push(content(await fixture.region(x, z)));
  await fixture.region(40, -40);
  for (let j = locations.length - 1; j >= 0; j--)
    expect(
      content(await fixture.region(locations[j][0], locations[j][1])),
    ).toEqual(before[j]);
  await fixture.dispatchLifecycle("TERRAIN_CRASH");
  await fixture.dispatchLifecycle("RESTART");
  for (let j = 0; j < locations.length; j++)
    expect(
      content(await fixture.region(locations[j][0], locations[j][1])),
    ).toEqual(before[j]);
  await fixture.reset("origin-rebase");
  const start = await fixture.region(10, 0),
    world = await fixture.world();
  await fixture.step(240, { pitch: 0, roll: 0, throttleDelta: 1 });
  expect((await fixture.world()).originRevision).toBe(world.originRevision + 1);
  expect((await fixture.region(10, 0)).scenery).toEqual(start.scenery);
  const full = await fixture.region(10, 0);
  for (let i = 0; i < 4; i++) await fixture.simulateQuality(40, 3);
  expect((await fixture.region(10, 0)).scenery).toEqual(full.scenery);
});
