import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { FlightFixture } from "../helpers/flight-fixture.js";

test("embedded Blender aircraft retains its bounds and resources across flight and restart", async ({
  page,
}) => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../../art/glider/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  const fixture = await new FlightFixture(page).load();
  const initial = await fixture.reset("terrain-impact");
  const geometry = initial.visual.gliderGeometry;
  expect(geometry.vertices).toBe(manifest.vertices);
  expect(geometry.triangles).toBe(manifest.triangles);
  expect(geometry.triangles).toBeLessThanOrEqual(2500);
  expect(geometry.meshes).toBe(1);
  expect(geometry.materials).toBe(1);
  for (const bound of ["min", "max"]) {
    for (let axis = 0; axis < 3; axis += 1) {
      expect(geometry.bounds[bound][axis]).toBeCloseTo(
        manifest.bounds[bound][axis],
        5,
      );
    }
  }
  // Warm the restart view; asset IDs distinguish ownership from terrain uploads.
  await fixture.step(1200, { pitch: -1, roll: 0, throttleDelta: 1 });
  await fixture.dispatchLifecycle("RESTART");
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
  const baseline = await fixture.metrics();
  for (let cycle = 0; cycle < 5; cycle += 1) {
    const crashed = await fixture.step(1200, {
      pitch: -1,
      roll: 0,
      throttleDelta: 1,
    });
    expect(crashed.lifecycle.phase).toBe("crashed");
    await fixture.dispatchLifecycle("RESTART");
    const restarted = await fixture.snapshot();
    expect(restarted.visual.gliderGeometry).toEqual(geometry);
    expect(restarted.visual.gliderVisible).toBe(true);
  }
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
  const terminal = await fixture.metrics();
  expect(terminal.renderer.textures).toBe(baseline.renderer.textures);
  expect(terminal.sceneObjects).toBe(baseline.sceneObjects);
});
