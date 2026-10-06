import { expect, test } from "@playwright/test";
import {
  assertDocumentSecurity,
  RUNTIME_DEPENDENCIES,
} from "../helpers/runtime-dependencies.js";

/** @param {string} hex */
function hexToBytes(hex) {
  const pairs = hex.match(/.{2}/g);
  if (!pairs) throw new TypeError("hex digest is empty");
  return Uint8Array.from(pairs, (pair) => Number.parseInt(pair, 16));
}

/** @param {import("@playwright/test").Page} page */
async function acceptInjectedSimplexHash(page) {
  await page.addInitScript(
    ({ expectedBytes, expectedHash }) => {
      const originalDigest = crypto.subtle.digest.bind(crypto.subtle);
      const acceptedDigest = Uint8Array.from(expectedHash).buffer;
      Object.defineProperty(crypto.subtle, "digest", {
        configurable: true,
        value(
          /** @type {AlgorithmIdentifier} */ algorithm,
          /** @type {BufferSource} */ bytes,
        ) {
          if (bytes.byteLength === expectedBytes) {
            return Promise.resolve(acceptedDigest.slice(0));
          }
          return originalDigest(algorithm, bytes);
        },
      });
    },
    {
      expectedBytes: RUNTIME_DEPENDENCIES[1].expectedBytes,
      expectedHash: Array.from(hexToBytes(RUNTIME_DEPENDENCIES[1].sha384Hex)),
    },
  );
}

test.describe("verified runtime dependency loader", () => {
  test("uses the exact two-request manifest and exposes no partial application", async ({
    page,
  }, testInfo) => {
    /** @type {string[]} */
    const runtimeRequests = [];
    /** @type {string[]} */
    const networkRequests = [];
    /** @type {Array<Promise<{url: string, cookie: string | undefined, referer: string | undefined}>>} */
    const runtimeRequestPolicies = [];
    /** @type {string[]} */
    const consoleErrors = [];
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) networkRequests.push(request.url());
      if (request.url().startsWith("https://cdn.jsdelivr.net/")) {
        runtimeRequests.push(request.url());
        runtimeRequestPolicies.push(
          request.allHeaders().then((headers) => ({
            url: request.url(),
            cookie: headers.cookie,
            referer: headers.referer,
          })),
        );
      }
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    const startedAt = performance.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("loading-state")).toContainText(
      "Verifying flight systems",
    );
    const loadingFeedbackMs = performance.now() - startedAt;
    expect(loadingFeedbackMs).toBeLessThanOrEqual(500);
    await expect(page.getByTestId("application-state")).toHaveAttribute(
      "data-phase",
      /ready|flying/,
      { timeout: 15_000 },
    );
    const controllableMs = performance.now() - startedAt;
    expect(controllableMs).toBeLessThanOrEqual(5_000);

    expect(runtimeRequests.sort()).toEqual(
      RUNTIME_DEPENDENCIES.map(({ url }) => url).sort(),
    );
    expect(networkRequests.sort()).toEqual(
      [
        "http://127.0.0.1:4173/",
        ...RUNTIME_DEPENDENCIES.map(({ url }) => url),
      ].sort(),
    );
    const requestPolicies = await Promise.all(runtimeRequestPolicies);
    expect(requestPolicies).toHaveLength(2);
    expect(
      requestPolicies.every(({ cookie, referer }) => !cookie && !referer),
    ).toBe(true);
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(
      await page.evaluate(() => Object.isFrozen(globalThis.__WFS_TEST__)),
    ).toBe(true);
    assertDocumentSecurity(await page.content());
    expect(consoleErrors).toEqual([]);

    await testInfo.attach("dependency-success", {
      body: JSON.stringify(
        {
          project: testInfo.project.name,
          userAgent: await page.evaluate(() => navigator.userAgent),
          loadingFeedbackMs,
          controllableMs,
          requests: runtimeRequests.sort(),
          requestPolicies,
          consoleErrors,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });

  test("query, fragment, and stored values cannot select trusted behavior or UI", async ({
    page,
  }) => {
    const queryMarker = "QUERY_MARKER_DO_NOT_TRUST";
    const fragmentMarker = "FRAGMENT_MARKER_DO_NOT_TRUST";
    const storageMarker = "STORAGE_MARKER_DO_NOT_TRUST";
    await page.addInitScript((marker) => {
      localStorage.setItem("seed", marker);
      localStorage.setItem("dependency", marker);
      sessionStorage.setItem("quality", marker);
      sessionStorage.setItem("testMode", marker);
    }, storageMarker);
    /** @type {string[]} */
    const requests = [];
    page.on("request", (request) => {
      if (request.url().startsWith("https://cdn.jsdelivr.net/"))
        requests.push(request.url());
    });

    await page.goto(
      `/?seed=${queryMarker}&quality=${queryMarker}&dependency=${queryMarker}#${fragmentMarker}`,
    );
    await expect(page.getByTestId("application-state")).toHaveAttribute(
      "data-phase",
      /ready|flying/,
      { timeout: 15_000 },
    );
    expect(requests.sort()).toEqual(
      RUNTIME_DEPENDENCIES.map(({ url }) => url).sort(),
    );
    const boundary = await page.evaluate(() => ({
      bodyText: document.body.textContent ?? "",
      seed: globalThis.__WFS_TEST__.snapshot().seed,
      localSeed: localStorage.getItem("seed"),
      localDependency: localStorage.getItem("dependency"),
      sessionQuality: sessionStorage.getItem("quality"),
      sessionTestMode: sessionStorage.getItem("testMode"),
    }));
    expect(Number.isInteger(boundary.seed)).toBe(true);
    expect(boundary.bodyText).not.toContain(queryMarker);
    expect(boundary.bodyText).not.toContain(fragmentMarker);
    expect(boundary.bodyText).not.toContain(storageMarker);
    expect(boundary.localSeed).toBe(storageMarker);
    expect(boundary.localDependency).toBe(storageMarker);
    expect(boundary.sessionQuality).toBe(storageMarker);
    expect(boundary.sessionTestMode).toBe(storageMarker);
  });

  for (const failure of [
    { name: "HTTP error", mode: "http", code: "DEPENDENCY_NETWORK" },
    { name: "truncated body", mode: "truncate", code: "DEPENDENCY_SIZE" },
    { name: "oversized body", mode: "oversize", code: "DEPENDENCY_SIZE" },
    { name: "one-bit mutation", mode: "mutate", code: "DEPENDENCY_INTEGRITY" },
  ]) {
    test(`${failure.name} fails closed with controlled Retry`, async ({
      page,
    }) => {
      let changed = false;
      await page.route(RUNTIME_DEPENDENCIES[0].url, async (route) => {
        if (failure.mode === "http") {
          await route.fulfill({ status: 503, body: "untrusted diagnostic" });
          return;
        }
        const response = await route.fetch();
        const original = await response.body();
        const body = Buffer.from(original);
        if (failure.mode === "truncate") body.subarray(0, body.length - 1);
        if (failure.mode === "oversize") {
          await route.fulfill({
            response,
            body: Buffer.concat([body, Buffer.from(" ")]),
          });
          return;
        }
        if (failure.mode === "mutate") {
          body[Math.floor(body.length / 2)] ^= 1;
          changed = true;
        }
        await route.fulfill({
          response,
          body:
            failure.mode === "truncate"
              ? body.subarray(0, body.length - 1)
              : body,
        });
      });

      await page.goto("/");
      await expect(page.getByTestId("application-state")).toHaveAttribute(
        "data-phase",
        "error",
        {
          timeout: 15_000,
        },
      );
      await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
      await expect(page.getByTestId("error-code")).toHaveText(failure.code);
      await expect(page.locator("body")).not.toContainText(
        "untrusted diagnostic",
      );
      await expect(page.locator("canvas")).toHaveCount(0);
      if (failure.mode === "mutate") expect(changed).toBe(true);
    });
  }

  test("redirect-selected final URL is rejected before bytes can execute", async ({
    page,
  }) => {
    await page.addInitScript((targetUrl) => {
      const originalFetch = globalThis.fetch.bind(globalThis);
      globalThis.fetch = async (input, init) => {
        const response = await originalFetch(input, init);
        if (input !== targetUrl) return response;
        return new Proxy(response, {
          get(target, property) {
            if (property === "redirected") return true;
            if (property === "url") return `${targetUrl}.redirected`;
            const value = Reflect.get(target, property, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
      };
    }, RUNTIME_DEPENDENCIES[0].url);

    await page.goto("/");
    await expect(page.getByTestId("error-code")).toHaveText(
      "DEPENDENCY_REDIRECT",
      { timeout: 15_000 },
    );
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("a stalled dependency times out without automatic retry", async ({
    page,
  }) => {
    let requests = 0;
    await page.route(RUNTIME_DEPENDENCIES[1].url, () => {
      requests += 1;
      return new Promise(() => {});
    });

    await page.goto("/");
    await expect(page.getByTestId("error-code")).toHaveText(
      "DEPENDENCY_TIMEOUT",
      { timeout: 15_000 },
    );
    await page.waitForTimeout(500);
    expect(requests).toBe(1);
  });

  for (const failure of [
    { name: "parse failure", source: "export {", code: "DEPENDENCY_IMPORT" },
    {
      name: "missing export",
      source: "export const unrelated = true;",
      code: "DEPENDENCY_SHAPE",
    },
  ]) {
    test(`${failure.name} discards the verified partial module`, async ({
      page,
    }) => {
      await acceptInjectedSimplexHash(page);
      const body = Buffer.alloc(RUNTIME_DEPENDENCIES[1].expectedBytes, 0x20);
      body.write(failure.source, 0, "utf8");
      await page.route(RUNTIME_DEPENDENCIES[1].url, (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/javascript",
          headers: { "access-control-allow-origin": "*" },
          body,
        }),
      );

      await page.goto("/");
      await expect(page.getByTestId("error-code")).toHaveText(failure.code, {
        timeout: 15_000,
      });
      await expect(page.locator("canvas")).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText(failure.source);
    });
  }

  test("explicit keyboard or touch Retry performs a clean new attempt", async ({
    page,
  }, testInfo) => {
    let attempts = 0;
    await page.route(RUNTIME_DEPENDENCIES[1].url, async (route) => {
      attempts += 1;
      if (attempts === 1) await route.abort("failed");
      else await route.continue();
    });

    await page.goto("/");
    await expect(page.getByTestId("application-state")).toHaveAttribute(
      "data-phase",
      "error",
      {
        timeout: 15_000,
      },
    );
    const retry = page.getByRole("button", { name: "Retry" });
    await expect(retry).toBeFocused();
    if (testInfo.project.name.startsWith("mobile-")) await retry.tap();
    else await retry.press("Enter");
    await expect(page.getByTestId("application-state")).toHaveAttribute(
      "data-phase",
      /ready|flying/,
      { timeout: 15_000 },
    );
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.getByTestId("error-code")).toBeHidden();
    expect(
      await page.evaluate(() => Object.isFrozen(globalThis.__WFS_TEST__)),
    ).toBe(true);
    expect(attempts).toBe(2);
  });

  test("Retry revokes verified blobs and discards partial imports before success", async ({
    page,
  }, testInfo) => {
    await acceptInjectedSimplexHash(page);
    await page.addInitScript(() => {
      const create = URL.createObjectURL.bind(URL);
      const revoke = URL.revokeObjectURL.bind(URL);
      globalThis.__WFS_BLOB_AUDIT__ = { created: 0, revoked: 0 };
      URL.createObjectURL = (blob) => {
        globalThis.__WFS_BLOB_AUDIT__.created += 1;
        return create(blob);
      };
      URL.revokeObjectURL = (url) => {
        globalThis.__WFS_BLOB_AUDIT__.revoked += 1;
        return revoke(url);
      };
    });

    let attempts = 0;
    const fakeBody = Buffer.alloc(RUNTIME_DEPENDENCIES[1].expectedBytes, 0x20);
    fakeBody.write("export {", 0, "utf8");
    await page.route(RUNTIME_DEPENDENCIES[1].url, async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({
          status: 200,
          contentType: "text/javascript",
          headers: { "access-control-allow-origin": "*" },
          body: fakeBody,
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("error-code")).toHaveText(
      "DEPENDENCY_IMPORT",
      { timeout: 15_000 },
    );
    const failedAudit = await page.evaluate(
      () => globalThis.__WFS_BLOB_AUDIT__,
    );
    expect(failedAudit.created).toBeGreaterThanOrEqual(2);
    expect(failedAudit.revoked).toBe(failedAudit.created);
    await expect(page.locator("canvas")).toHaveCount(0);

    const retry = page.getByRole("button", { name: "Retry" });
    if (testInfo.project.name.startsWith("mobile-")) await retry.tap();
    else await retry.press("Enter");
    await expect(page.getByTestId("application-state")).toHaveAttribute(
      "data-phase",
      /ready|flying/,
      { timeout: 15_000 },
    );
    const recoveredAudit = await page.evaluate(
      () => globalThis.__WFS_BLOB_AUDIT__,
    );
    expect(recoveredAudit.revoked).toBe(recoveredAudit.created);
    expect(attempts).toBe(2);
    await expect(page.locator("canvas")).toHaveCount(1);
    const recoveredListeners = await page.evaluate(
      () => globalThis.__WFS_TEST__.metrics().listeners,
    );
    // Compare against a clean application, not an outdated fixed listener count.
    await page.reload();
    await expect(page.getByTestId("application-state")).toHaveAttribute(
      "data-phase",
      /ready|flying/,
      { timeout: 15_000 },
    );
    const cleanListeners = await page.evaluate(
      () => globalThis.__WFS_TEST__.metrics().listeners,
    );
    expect(cleanListeners).toBeGreaterThan(0);
    expect(recoveredListeners).toBe(cleanListeners);
  });
});
