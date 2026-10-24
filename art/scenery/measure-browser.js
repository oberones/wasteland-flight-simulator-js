/** Paired baseline/current browser evidence; --soak paces 600 simulation seconds in real time. */
import { chromium, webkit } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import assert from "node:assert/strict";
const baseline = "0d0bf9ee079dc6901d873016e7add2496286f7a0";
const label = process.argv[2] || "after";
assert(["before", "after"].includes(label));
const soak = process.argv.includes("--soak");
const root = new URL("./", import.meta.url);
const html =
  label === "before"
    ? execFileSync("git", ["show", `${baseline}:index.html`], {
        maxBuffer: 8 * 1024 * 1024,
      })
    : await readFile(new URL("../../index.html", root));
const server = createServer((_req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/html",
    "Cache-Control": "no-store",
  });
  res.end(html);
});
await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", resolve);
});
const url = `http://127.0.0.1:${server.address().port}/`;
const results = [];
try {
  for (const [engine, type] of soak
    ? [["chromium", chromium]]
    : [
        ["chromium", chromium],
        ["webkit", webkit],
      ]) {
    const browser = await type.launch();
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      });
      const errors = [],
        requests = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("request", (r) => {
        if (r.url().startsWith("https:")) requests.push(r.url());
      });
      let cdp;
      if (engine === "chromium") {
        cdp = await page.context().newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 50,
          downloadThroughput: 25e6 / 8,
          uploadThroughput: 5e6 / 8,
        });
      }
      const start = performance.now();
      await page.goto(url);
      await page.waitForFunction(() => Boolean(globalThis.__WFS_TEST__), null, {
        timeout: 30000,
      });
      const coldControlMs = performance.now() - start;
      const graphics = await page.evaluate(() => {
        const gl = document.querySelector("canvas").getContext("webgl2");
        const extension = gl.getExtension("WEBGL_debug_renderer_info");
        return {
          renderer: gl.getParameter(
            extension ? extension.UNMASKED_RENDERER_WEBGL : gl.RENDERER,
          ),
          vendor: gl.getParameter(
            extension ? extension.UNMASKED_VENDOR_WEBGL : gl.VENDOR,
          ),
        };
      });
      await page.evaluate(() => globalThis.__WFS_TEST__.reset(0x1a2b3c4d));
      const frameSamples = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const samples = [];
            let previous = performance.now();
            const tick = (now) => {
              samples.push(now - previous);
              previous = now;
              if (samples.length >= 360) resolve(samples);
              else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }),
      );
      const orderedFrames = [...frameSamples].sort((a, b) => a - b);
      const frameSummary = {
        medianMs: orderedFrames[180],
        p99Ms: orderedFrames[356],
        fractionWithin33_3:
          frameSamples.filter((ms) => ms <= 33.3).length / frameSamples.length,
      };
      const hashes = [];
      for (let z = -4; z <= 4; z++)
        for (let x = -4; x <= 4; x++)
          hashes.push(
            await page.evaluate(
              ([x, z]) => {
                const r = globalThis.__WFS_TEST__.region(x, z);
                return {
                  x,
                  z,
                  height: r.heightHash,
                  ruin: r.ruinHash,
                  descriptor: r.descriptorHash,
                  scenery: r.scenery?.hash ?? null,
                };
              },
              [x, z],
            ),
          );
      await page.evaluate(() => globalThis.__WFS_TEST__.reset(0x13579bdf));
      const samples = [],
        transitions = [];
      const started = performance.now();
      for (let second = 1; second <= 600; second++) {
        const t = await page.evaluate((second) => {
          const started = performance.now(),
            api = globalThis.__WFS_TEST__;
          const before = api.world().generationCount;
          const segment = Math.floor((second - 121) / 80);
          const roll =
            second > 120 && (second - 121) % 80 === 0
              ? segment % 2 === 0
                ? 0.05
                : -0.05
              : 0;
          const s = api.step(60, { pitch: 0, roll, throttleDelta: 1 });
          return {
            ms: performance.now() - started,
            transition: api.world().generationCount !== before,
            phase: s.lifecycle.phase,
          };
        }, second);
        assert.equal(t.phase, "flying");
        if (t.transition) transitions.push(t.ms);
        if (soak)
          await delay(Math.max(0, started + second * 1000 - performance.now()));
        else if (second % 10 === 0) await page.waitForTimeout(10);
        if (second === 120 || second === 600) {
          const heap = cdp
            ? (await cdp.send("Runtime.getHeapUsage")).usedSize
            : null;
          samples.push({
            second,
            wallSeconds: (performance.now() - started) / 1000,
            heap,
            metrics: await page.evaluate(() =>
              globalThis.__WFS_TEST__.metrics(),
            ),
          });
        }
        if (soak && second % 120 === 0)
          console.log(`${label}: ${second} seconds paced traversal`);
      }
      const terminal = await page.evaluate(() =>
        globalThis.__WFS_TEST__.snapshot(),
      );
      await page.evaluate(() => globalThis.__WFS_TEST__.reset(0x1a2b3c4d));
      await page.evaluate(() =>
        globalThis.__WFS_TEST__.step(1, {
          pitch: 0,
          roll: 0,
          throttleDelta: 0,
        }),
      );
      await page.waitForTimeout(100);
      await page.screenshot({
        path: new URL(`validation/${label}-${engine}-flight.png`, root)
          .pathname,
      });
      const metrics = await page.evaluate(() =>
        globalThis.__WFS_TEST__.metrics(),
      );
      assert.deepEqual(errors, []);
      assert.equal(requests.length, 3);
      transitions.sort((a, b) => a - b);
      results.push({
        engine,
        version: browser.version(),
        graphics,
        network: cdp ? "25 Mbps, 50 ms latency" : "unthrottled",
        coldControlMs,
        frameSummary,
        frameSamples,
        hashes,
        errors,
        requests,
        metrics,
        samples,
        terminal,
        transitionMs: {
          count: transitions.length,
          p50: transitions[Math.floor(transitions.length * 0.5)],
          p95: transitions[Math.floor(transitions.length * 0.95)],
          max: transitions.at(-1),
        },
        wallSeconds: (performance.now() - started) / 1000,
      });
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}
await writeFile(
  new URL(`validation/${label}-${soak ? "soak" : "performance"}.json`, root),
  JSON.stringify(
    {
      baseline,
      mode: soak
        ? "600 seconds paced traversal"
        : "600 simulated seconds accelerated",
      indexSha256: createHash("sha256").update(html).digest("hex"),
      documentBytes: html.length,
      workload:
        "region-seam seed 0x13579bdf; 120 s straight maximum throttle then six 80 s segments with a one-second alternating 0.05 roll input",
      physicalDeviceQualification: false,
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${label}: ${soak ? "paced" : "accelerated"} traversal complete`);
