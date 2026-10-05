import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["line"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
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
        /(mobile-flight|responsive-controls|accessibility|dependency-loader|glider-asset)\.spec\.js/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 915, height: 412 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-webkit",
      testMatch:
        /(mobile-flight|responsive-controls|accessibility|dependency-loader|glider-asset)\.spec\.js/,
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 30_000,
  },
});
