/** Capture comparable browser views and rendering counters against a running server. */
import { chromium, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = new URL("./", import.meta.url);
const label = process.argv[2] || "after";
if (!["before", "after"].includes(label))
  throw new Error("Use before or after");
const html =
  label === "before"
    ? execFileSync("git", ["show", "HEAD:index.html"])
    : await readFile(new URL("../../index.html", root));
const results = [];
for (const [engine, browserType] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await browserType.launch();
  try {
    for (const [name, width, height, touch] of [
      ["desktop", 1280, 720, false],
      ["mobile", 844, 390, true],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        isMobile: touch,
        hasTouch: touch,
        deviceScaleFactor: 1,
      });
      const errors = [];
      const requests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (/^https?:/.test(request.url())) requests.push(request.url());
      });
      if (label === "before")
        await page.route("http://127.0.0.1:4173/", (route) =>
          route.fulfill({ body: html, contentType: "text/html" }),
        );
      await page.goto("http://127.0.0.1:4173");
      await page.waitForFunction(() => Boolean(globalThis.__WFS_TEST__), {
        timeout: 20000,
      });
      await page.evaluate(() => globalThis.__WFS_TEST__.reset(0x1a2b3c4d));
      await page.evaluate(() =>
        globalThis.__WFS_TEST__.step(1, {
          pitch: 0,
          roll: 0,
          throttleDelta: 0,
        }),
      );
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          }),
      );
      await mkdir(new URL("validation/", root), { recursive: true });
      const level = await page.evaluate(() => ({
        snapshot: globalThis.__WFS_TEST__.snapshot(),
        metrics: globalThis.__WFS_TEST__.metrics(),
      }));
      await page.screenshot({
        path: fileURLToPath(
          new URL(`validation/${label}-${engine}-${name}-level.png`, root),
        ),
      });
      await page.evaluate(() =>
        globalThis.__WFS_TEST__.step(60, {
          pitch: 0.02,
          roll: 0.5,
          throttleDelta: 0,
        }),
      );
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          }),
      );
      const banked = await page.evaluate(() => ({
        snapshot: globalThis.__WFS_TEST__.snapshot(),
        metrics: globalThis.__WFS_TEST__.metrics(),
      }));
      await page.screenshot({
        path: fileURLToPath(
          new URL(`validation/${label}-${engine}-${name}-banked.png`, root),
        ),
      });
      results.push({
        engine,
        version: browser.version(),
        viewport: { width, height },
        touch,
        errors,
        requests,
        level,
        banked,
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
      indexSha256: createHash("sha256").update(html).digest("hex"),
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `${label}: captured ${results.length} browser/viewport combinations`,
);
