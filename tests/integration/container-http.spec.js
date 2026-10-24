import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

test.describe("production container HTTP contract", () => {
  test.skip(
    !process.env.WFS_TEST_BASE_URL,
    "Requires the production container",
  );

  test("serves only the release document with security headers", async ({
    request,
  }) => {
    const source = await readFile(new URL("../../index.html", import.meta.url));
    const metaPolicy = source
      .toString()
      .match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
    expect(metaPolicy).toBeTruthy();
    for (const path of ["/", "/index.html"]) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(await response.body()).toEqual(source);
      expect(response.headers()["content-type"]).toContain("text/html");
      expect(response.headers()["content-security-policy"]).toBe(
        metaPolicy?.replace("base-uri", "frame-ancestors 'none'; base-uri"),
      );
      const head = await request.head(path);
      expect(head.status()).toBe(200);
      expect((await head.body()).length).toBe(0);
      expect(head.headers()["content-security-policy"]).toBe(
        response.headers()["content-security-policy"],
      );
    }
    const compressed = await request.get("/", {
      headers: { "Accept-Encoding": "gzip" },
    });
    expect(compressed.headers()["content-encoding"]).toBe("gzip");

    for (const path of [
      "/missing.js",
      "/.env",
      "/.git/config",
      "/package.json",
      "/nginx/nginx.conf",
      "/tests/",
      "/index.html/extra",
    ]) {
      expect((await request.get(path)).status()).toBe(404);
    }
    for (const path of ["/", "/index.html"]) {
      for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
        expect((await request.fetch(path, { method })).status()).toBe(403);
      }
    }
    for (const path of ["/", "/missing.js"]) {
      const response = await request.get(path);
      expect(response.headers()).toMatchObject({
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
        "cache-control": "no-cache",
      });
      expect(response.headers()["content-security-policy"]).toContain(
        "frame-ancestors 'none'",
      );
      expect(response.headers()["permissions-policy"]).toContain("camera=()");
      expect(response.headers().server).toBe("nginx");
    }
  });
});
