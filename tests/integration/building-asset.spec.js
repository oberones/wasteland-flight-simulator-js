import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { FlightFixture } from "../helpers/flight-fixture.js";

const manifest = JSON.parse(
  await readFile(
    new URL("../../art/buildings/manifest.json", import.meta.url),
    "utf8",
  ),
);
const inspections = JSON.parse(
  await readFile(
    new URL(
      "../../art/buildings/validation/inspection-fixtures.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

/** Compare geometry content independently of which pooled region owns the buffers. */
function content(/** @type {any} */ region) {
  const { buildings } = region;
  return {
    descriptorHash: region.descriptorHash,
    instances: buildings.instances,
    bodyPosition: buildings.body.positionHash,
    bodyNormal: buildings.body.normalHash,
    windowPosition: buildings.windows.positionHash,
    panels: buildings.panels,
    bodyBounds: buildings.body.bounds,
    windowBounds: buildings.windows.bounds,
  };
}

test("all four Blender models fit legacy placements and regenerate exactly", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset(0x1a2b3c4d);
  for (const [modelId, entry] of Object.entries(inspections)) {
    const f = /** @type {any} */ (entry);
    const region = await fixture.region(f.regionX, f.regionZ);
    expect(region.ruins.find((/** @type {any} */ r) => r.id === f.id)).toEqual(
      f.descriptor,
    );
    const building = region.buildings.instances.find(
      (/** @type {any} */ b) => b.id === f.id,
    );
    expect(building.modelId).toBe(modelId);
    expect(building.height).toBeCloseTo(f.height, 8);
    const expectedTriangles = region.buildings.instances.reduce(
      (/** @type {number} */ sum, /** @type {any} */ b) =>
        sum + manifest.models[b.modelId].triangles,
      0,
    );
    expect(
      region.buildings.body.triangles + region.buildings.windows.triangles,
    ).toBe(expectedTriangles);
    expect(region.buildings.body.vertices).toBeLessThanOrEqual(
      region.buildings.body.vertexCapacity,
    );
    expect(region.buildings.windows.triangles * 3).toBeLessThanOrEqual(
      region.buildings.windows.indexCapacity,
    );
    expect(region.buildings.body.normalLengthError).toBeLessThan(0.00001);
    expect(region.buildings.body.faceNormalError).toBeLessThan(0.002);
    expect(region.buildings.windows.normalLengthError).toBeLessThan(0.00001);
    expect(building.bounds.max[0] - building.bounds.min[0]).toBeCloseTo(
      f.descriptor.width,
      6,
    );
    expect(building.bounds.max[2] - building.bounds.min[2]).toBeCloseTo(
      f.descriptor.depth,
      6,
    );
    expect(building.bounds.min[1]).toBeLessThan(f.descriptor.baseY - 7.9);
    const original = content(region);
    await fixture.region(20, -20);
    expect(content(await fixture.region(f.regionX, f.regionZ))).toEqual(
      original,
    );
    await fixture.dispatchLifecycle("TERRAIN_CRASH");
    await fixture.dispatchLifecycle("RESTART");
    expect(content(await fixture.region(f.regionX, f.regionZ))).toEqual(
      original,
    );
  }
  const spawn = await fixture.region(0, 0);
  expect(
    spawn.buildings.instances.find((/** @type {any} */ b) => b.id === "0:0:0")
      .modelId,
  ).toBe("office");
});

test("quality changes whole panels without rebuilding silhouettes or buffers", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset(0x1a2b3c4d);
  const before = await fixture.region(-2, -2);
  expect(before.buildings.panels.length).toBeGreaterThan(0);
  for (let tier = 0; tier < 3; tier += 1) await fixture.simulateQuality(40, 3);
  const reduced = await fixture.region(-2, -2);
  expect(content(reduced)).toEqual(content(before));
  const count = Math.floor(before.buildings.panels.length * 0.5);
  expect(reduced.buildings.visiblePanels).toBe(count);
  expect(reduced.buildings.windows.visibleTriangles * 3).toBe(
    before.buildings.panels[count - 1]?.endIndex || 0,
  );
  expect(reduced.buildings.body).toEqual(before.buildings.body);
  expect(reduced.buildings.windows.geometryId).toBe(
    before.buildings.windows.geometryId,
  );
  for (const instance of before.buildings.instances) {
    const visible = reduced.buildings.panels
      .slice(0, count)
      .filter((/** @type {any} */ p) =>
        p.id.startsWith(`${instance.id}:`),
      ).length;
    expect(Math.abs(visible - instance.windowPanels * 0.5)).toBeLessThanOrEqual(
      1,
    );
  }
  for (let tier = 0; tier < 3; tier += 1) await fixture.simulateQuality(60, 10);
  expect((await fixture.region(-2, -2)).buildings).toEqual(before.buildings);
});

test("recycled and empty regions retain bounded resources and valid culling bounds", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("region-seam");
  const resources = new Map();
  let empty = 0,
    occupied = 0;
  for (let z = -3; z <= 3; z += 1) {
    for (let x = -3; x <= 3; x += 1) {
      const region = await fixture.region(x * 3, z * 3);
      const { buildings: b, poolId } = region;
      const identity = {
        bodyId: b.body.geometryId,
        windowsId: b.windows.geometryId,
        bodyAttributes: b.body.attributes,
        windowAttributes: b.windows.attributes,
        bodyMaterial: b.bodyMaterialId,
        windowMaterial: b.windowMaterialId,
      };
      if (resources.has(poolId))
        expect(identity).toEqual(resources.get(poolId));
      else resources.set(poolId, identity);
      if (region.ruins.length === 0) {
        empty += 1;
        for (const layer of [b.body, b.windows]) {
          expect(layer.vertices).toBe(0);
          expect(layer.visibleTriangles).toBe(0);
          expect(layer.bounds).toEqual({ min: [0, 0, 0], max: [0, 0, 0] });
          expect(layer.sphere.radius).toBe(0);
        }
        expect(b.bodyVisible).toBe(false);
        expect(b.windowsVisible).toBe(false);
      } else {
        occupied += 1;
        expect(b.bodyVisible).toBe(true);
        expect(b.body.sphere.radius).toBeGreaterThan(0);
        expect(b.body.bounds.min.every(Number.isFinite)).toBe(true);
        expect(b.body.bounds.max.every(Number.isFinite)).toBe(true);
      }
    }
  }
  expect(empty).toBeGreaterThan(0);
  expect(occupied).toBeGreaterThan(0);
  expect(resources.size).toBeLessThanOrEqual(25);
  expect((await fixture.world()).poolSize).toBe(25);
});

test("origin rebasing retains authored content and building resource ownership", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("origin-rebase");
  const beforeWorld = await fixture.world();
  const before = await fixture.region(10, 0);
  await fixture.step(240, { pitch: 0, roll: 0, throttleDelta: 1 });
  const afterWorld = await fixture.world();
  const after = await fixture.region(10, 0);
  expect(afterWorld.originRevision).toBe(beforeWorld.originRevision + 1);
  expect(after.buildings).toEqual(before.buildings);
  expect(content(after)).toEqual(content(before));
});
