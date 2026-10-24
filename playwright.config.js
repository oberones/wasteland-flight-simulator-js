import { defineConfig, devices } from "@playwright/test";

const developmentPort = Number(process.env.WFS_DEV_PORT || 4173);
if (
  !Number.isInteger(developmentPort) ||
  developmentPort < 1024 ||
  developmentPort > 65535
)
  throw new RangeError(
    "WFS_DEV_PORT must be an integer from 1024 through 65535",
  );
const workers = process.env.WFS_TEST_WORKERS
  ? Number(process.env.WFS_TEST_WORKERS)
  : undefined;
if (workers !== undefined && (!Number.isInteger(workers) || workers < 1))
  throw new RangeError("WFS_TEST_WORKERS must be a positive integer");

export default defineConfig({
  workers,
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["line"], ["html", { open: "never" }]],
  use: {
    baseURL:
      process.env.WFS_TEST_BASE_URL || `http://127.0.0.1:${developmentPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: /mobile-flight\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "desktop-webkit",
      testIgnore: /mobile-flight\.spec\.js/,
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile-chromium",
      testMatch:
        /(mobile-flight|responsive-controls|accessibility|dependency-loader|glider-asset|building-asset|scenery)\.spec\.js/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 915, height: 412 },
        screen: { width: 915, height: 412 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-webkit",
      testMatch:
        /(mobile-flight|responsive-controls|accessibility|dependency-loader|glider-asset|building-asset|scenery)\.spec\.js/,
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 844, height: 390 },
        // Keep screen and viewport in the same orientation so WebKit emits a real resize.
        screen: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: process.env.WFS_TEST_BASE_URL
    ? undefined
    : {
        command: `node node_modules/http-server/bin/http-server . -a 127.0.0.1 -p ${developmentPort} -c-1 -s`,
        url: `http://127.0.0.1:${developmentPort}`,
        reuseExistingServer: false,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 30_000,
      },
});
