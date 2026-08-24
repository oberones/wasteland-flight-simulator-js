import { expect, test } from "@playwright/test";

test.describe("reason-based lifecycle authority", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("application-state")).toHaveAttribute(
      "data-phase",
      /ready|flying/,
      { timeout: 15_000 },
    );
  });

  test("focus and orientation blockers require deliberate resume", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      const api = globalThis.__WFS_TEST__;
      api.dispatchLifecycle("FOCUS_LOST");
      api.dispatchLifecycle("PORTRAIT_ENTERED");
      api.dispatchLifecycle("FOCUS_READY");
      const blocked = api.snapshot().lifecycle;
      api.dispatchLifecycle("LANDSCAPE_READY");
      const readyButPaused = api.snapshot().lifecycle;
      api.dispatchLifecycle("RESUME");
      const resumed = api.snapshot().lifecycle;
      return { blocked, readyButPaused, resumed };
    });

    expect(state.blocked.phase).toBe("paused");
    expect(state.blocked.pauseReasons).toEqual(["orientation"]);
    expect(state.readyButPaused.resumeRequired).toBe(true);
    expect(state.resumed.phase).toBe("flying");
    expect(state.resumed.resumeRequired).toBe(false);
  });

  test("manual pause resumes only after a deliberate Resume event", async ({
    page,
  }) => {
    const state = await page.evaluate(() => {
      const api = globalThis.__WFS_TEST__;
      api.dispatchLifecycle("PAUSE");
      const paused = api.snapshot().lifecycle;
      api.dispatchLifecycle("RESUME");
      const resumed = api.snapshot().lifecycle;
      return { paused, resumed };
    });

    expect(state.paused.phase).toBe("paused");
    expect(state.paused.pauseReasons).toEqual(["manual"]);
    expect(state.paused.resumeRequired).toBe(true);
    expect(state.resumed.phase).toBe("flying");
    expect(state.resumed.pauseReasons).toEqual([]);
    expect(state.resumed.resumeRequired).toBe(false);
  });

  test("crash and error take priority and transitions are idempotent", async ({
    page,
  }) => {
    const states = await page.evaluate(() => {
      const api = globalThis.__WFS_TEST__;
      api.reset(0x0badc0de);
      api.dispatchLifecycle("PAUSE");
      api.dispatchLifecycle("TERRAIN_CRASH");
      const crashed = api.snapshot().lifecycle;
      api.dispatchLifecycle("TERRAIN_CRASH");
      const duplicate = api.snapshot().lifecycle;
      api.dispatchLifecycle("RESTART");
      const restarted = api.snapshot().lifecycle;
      return { crashed, duplicate, restarted };
    });

    expect(states.crashed.phase).toBe("crashed");
    expect(states.duplicate.revision).toBe(states.crashed.revision);
    expect(states.restarted.phase).toBe("flying");
    expect(states.restarted.pauseReasons).toEqual([]);
  });

  test("pause and crash always expose a neutral control frame", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const api = globalThis.__WFS_TEST__;
      api.reset(0x1a2b3c4d);
      api.step(1, { pitch: 1, roll: -1, throttleDelta: 1 });
      api.dispatchLifecycle("PAUSE");
      const paused = api.snapshot();
      api.dispatchLifecycle("RESUME");
      api.dispatchLifecycle("TERRAIN_CRASH");
      const crashed = api.snapshot();
      return { paused: paused.controls.frame, crashed: crashed.controls.frame };
    });

    expect(result.paused).toEqual({ pitch: 0, roll: 0, throttleDelta: 0 });
    expect(result.crashed).toEqual({ pitch: 0, roll: 0, throttleDelta: 0 });
  });

  test("dependency error has priority and Retry is idempotent", async ({
    page,
  }) => {
    const states = await page.evaluate(() => {
      const api = globalThis.__WFS_TEST__;
      api.dispatchLifecycle("PAUSE");
      api.dispatchLifecycle("DEPENDENCY_FAILED");
      const error = api.snapshot().lifecycle;
      api.dispatchLifecycle("DEPENDENCY_FAILED");
      const duplicate = api.snapshot().lifecycle;
      api.dispatchLifecycle("RETRY");
      const retry = api.snapshot().lifecycle;
      return { error, duplicate, retry };
    });

    expect(states.error.phase).toBe("error");
    expect(states.duplicate.revision).toBe(states.error.revision);
    expect(states.retry.phase).toBe("loading");
    expect(states.retry.errorCode).toBeNull();
  });
});
