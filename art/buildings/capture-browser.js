/** Capture reproducible release views plus explicitly instrumented inspection views. */
import { chromium, webkit } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = new URL("./", import.meta.url);
const baseline = "e2dd19fe78ee7f26b90e1eacd567250d70b71a74";
const label = process.argv[2] || "after";
assert(["before", "after"].includes(label), "Use before or after");
const html =
  label === "before"
    ? execFileSync("git", ["show", `${baseline}:index.html`]).toString()
    : await readFile(new URL("../../index.html", root), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
await mkdir(new URL("validation/", root), { recursive: true });
const fixturesPath = new URL("validation/inspection-fixtures.json", root);

/** Select the same appearance as the runtime without altering legacy descriptors. */
function appearance(ruin) {
  const mix = (value) => {
    let n = value >>> 0;
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    return (n ^ (n >>> 16)) >>> 0;
  };
  const seed = mix(ruin.damageMask ^ ruin.windowSeed);
  const modelId =
    ruin.id === "0:0:0"
      ? "office"
      : ["office", "residential", "industrial", "shell"][seed % 4];
  const variation = mix(seed ^ 0x35a14c21) / 4294967295;
  const height =
    modelId === "industrial"
      ? 30 + variation * 25
      : modelId === "shell"
        ? 12 + variation * 14
        : ruin.tierHeights.reduce((sum, value) => sum + value, 0);
  return { modelId, height, quarterTurn: (seed >>> 8) % 4 };
}

// This camera helper is inserted only into inspection pages served by Playwright.
// Normal flight views and all tests use the exact original HTML bytes.
const helper = `inspectBuilding: (id, height, quarterTurn) => {
  const ruin = [...this.world.activeRegions.values()].flatMap(region => region.ruins).find(ruin => ruin.id === id);
  if (!ruin) throw new Error("inspection ruin unavailable");
  this.manualStepping = true;
  const x = ruin.globalX - this.world.worldOrigin.x, z = ruin.globalZ - this.world.worldOrigin.z;
  const distance = Math.max(ruin.width * 2.2, height * 1.35);
  const cos = [1, 0, -1, 0][quarterTurn], sin = [0, 1, 0, -1][quarterTurn];
  const dx = distance * (cos * .72 + sin), dz = distance * (-sin * .72 + cos);
  const targetY = ruin.baseY + height * .42;
  let cameraY = ruin.baseY + height * .65 + distance * .35;
  // Keep the inspection ray above intervening terrain without changing the world.
  for (let sample = 1; sample <= 12; sample += 1) {
    const t = sample / 12;
    const ground = this.world.sample(ruin.globalX + dx*t, ruin.globalZ + dz*t).height;
    cameraY = Math.max(cameraY, (ground + 10 - targetY*(1-t)) / t);
  }
  this.camera.position.set(x + dx, cameraY, z + dz);
  this.camera.up.set(0, 1, 0);
  this.camera.lookAt(x, ruin.baseY + height * .42, z);
  this.gliderMesh.visible = false;
  this.sunLight.position.set(x - 280, ruin.baseY + 520, z + 180);
  this.sunLight.target.position.set(x, ruin.baseY, z);
  if (!this.sunLight.target.parent) this.scene.add(this.sunLight.target);
  this.needsRender = true;
  return { id, height, camera: this.camera.position.toArray() };
},\n`;
const inspectionHtml = html.replace(
  "metrics: () => structuredClone(this.metrics()),",
  helper + "metrics: () => structuredClone(this.metrics()),",
);
assert.notEqual(inspectionHtml, html, "inspection hook missing");

/** Wait for renderer counters and pixels to reflect the requested state. */
async function rendered(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

const results = [];
let fixtures = null;
if (label === "after")
  fixtures = JSON.parse(await readFile(fixturesPath, "utf8"));
for (const [engine, browserType] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await browserType.launch();
  try {
    for (const [layout, width, height, touch] of [
      ["desktop", 1280, 720, false],
      ["mobile", 844, 390, true],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        isMobile: touch,
        hasTouch: touch,
        deviceScaleFactor: 1,
      });
      const errors = [],
        requests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("request", (request) => {
        if (/^https?:/.test(request.url())) requests.push(request.url());
      });
      await page.route("http://127.0.0.1:4173/", (route) =>
        route.fulfill({ body: html, contentType: "text/html" }),
      );
      const started = performance.now();
      await page.goto("http://127.0.0.1:4173/");
      await page.waitForFunction(() => Boolean(globalThis.__WFS_TEST__), null, {
        timeout: 20000,
      });
      const controllableMs = performance.now() - started;
      await page.evaluate(() => globalThis.__WFS_TEST__.reset(0x1a2b3c4d));
      const views = [];
      for (const pose of ["level", "banked"]) {
        await page.evaluate(
          (banked) =>
            globalThis.__WFS_TEST__.step(banked ? 60 : 1, {
              pitch: banked ? 0.02 : 0,
              roll: banked ? 0.5 : 0,
              throttleDelta: 0,
            }),
          pose === "banked",
        );
        await rendered(page);
        views.push({
          pose,
          ...(await page.evaluate(() => ({
            snapshot: globalThis.__WFS_TEST__.snapshot(),
            memory: performance.memory
              ? {
                  usedJSHeapSize: performance.memory.usedJSHeapSize,
                  totalJSHeapSize: performance.memory.totalJSHeapSize,
                }
              : null,
            metrics: globalThis.__WFS_TEST__.metrics(),
          }))),
        });
        await page.screenshot({
          path: fileURLToPath(
            new URL(
              `validation/${label}-${engine}-${layout}-${pose}.png`,
              root,
            ),
          ),
        });
      }
      const flightRequests = [...requests];
      if (!fixtures) {
        fixtures = {};
        for (let z = -2; z <= 3 && Object.keys(fixtures).length < 4; z += 1) {
          for (let x = -2; x <= 3 && Object.keys(fixtures).length < 4; x += 1) {
            const region = await page.evaluate(
              ({ x, z }) => globalThis.__WFS_TEST__.region(x, z),
              { x, z },
            );
            for (const ruin of region.ruins) {
              const selected = appearance(ruin);
              fixtures[selected.modelId] ??= {
                regionX: x,
                regionZ: z,
                id: ruin.id,
                height: selected.height,
                quarterTurn: selected.quarterTurn,
                descriptor: ruin,
              };
            }
          }
        }
        assert.equal(
          Object.keys(fixtures).length,
          4,
          "missing inspection model",
        );
        await writeFile(fixturesPath, JSON.stringify(fixtures, null, 2) + "\n");
      }
      await page.unroute("http://127.0.0.1:4173/");
      await page.route("http://127.0.0.1:4173/", (route) =>
        route.fulfill({ body: inspectionHtml, contentType: "text/html" }),
      );
      await page.reload();
      await page.waitForFunction(() => Boolean(globalThis.__WFS_TEST__), null, {
        timeout: 20000,
      });
      await page.evaluate(() => globalThis.__WFS_TEST__.reset(0x1a2b3c4d));
      const inspections = [];
      for (const [modelId, fixture] of Object.entries(fixtures)) {
        const region = await page.evaluate(
          (f) => globalThis.__WFS_TEST__.region(f.regionX, f.regionZ),
          fixture,
        );
        assert.deepEqual(
          region.ruins.find((ruin) => ruin.id === fixture.id),
          fixture.descriptor,
          "world placement changed",
        );
        const camera = await page.evaluate(
          (f) =>
            globalThis.__WFS_TEST__.inspectBuilding(
              f.id,
              f.height,
              f.quarterTurn,
            ),
          fixture,
        );
        await rendered(page);
        inspections.push({
          modelId,
          camera,
          region,
          metrics: await page.evaluate(() => globalThis.__WFS_TEST__.metrics()),
        });
        await page.screenshot({
          path: fileURLToPath(
            new URL(
              `validation/${label}-${engine}-${layout}-${modelId}.png`,
              root,
            ),
          ),
        });
      }
      assert.deepEqual(errors, []);
      assert.equal(
        flightRequests.length,
        3,
        "unexpected release-document request",
      );
      results.push({
        engine,
        version: browser.version(),
        layout,
        viewport: { width, height },
        touch,
        controllableMs,
        errors,
        flightRequests,
        views,
        inspections,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  new URL(`validation/${label}-browser.json`, root),
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      baseline,
      indexSha256: sha256(html),
      documentBytes: Buffer.byteLength(html),
      inspectionHtmlSha256: sha256(inspectionHtml),
      inspectionNote:
        "Only inspection views inject a webdriver camera helper; normal views use the exact release document.",
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `${label}: captured ${results.length} browser/layout pairs, six views each`,
);
