import { expect, test } from "@playwright/test";
import { FlightFixture } from "../helpers/flight-fixture.js";

test.describe("normalized keyboard, pointer, and touch input", () => {
  test.beforeEach(async ({ page }) => {
    await new FlightFixture(page).load();
  });

  test("combines axes and cancels opposing keyboard commands", async ({
    page,
  }) => {
    await page.keyboard.down("w");
    await page.keyboard.down("ArrowUp");
    await page.keyboard.down("ArrowRight");
    let frame = await page.evaluate(
      () => globalThis.__WFS_TEST__.snapshot().controls.frame,
    );
    expect(frame).toEqual({ pitch: 1, roll: 1, throttleDelta: 1 });

    await page.keyboard.down("ArrowDown");
    await page.keyboard.down("ArrowLeft");
    frame = await page.evaluate(
      () => globalThis.__WFS_TEST__.snapshot().controls.frame,
    );
    expect(frame).toEqual({ pitch: 0, roll: 0, throttleDelta: 1 });

    await page.keyboard.down("s");
    frame = await page.evaluate(
      () => globalThis.__WFS_TEST__.snapshot().controls.frame,
    );
    expect(frame.throttleDelta).toBe(0);
    await page.keyboard.up("w");
    await page.keyboard.up("s");
    await page.keyboard.up("ArrowUp");
    await page.keyboard.up("ArrowDown");
    await page.keyboard.up("ArrowLeft");
    await page.keyboard.up("ArrowRight");
  });

  test("bounds and centers explicit pointer-stick control", async ({
    page,
  }) => {
    const canvas = page.locator("#flight-canvas");
    await canvas.click({ position: { x: 300, y: 200 } });
    await page.mouse.move(1_200, 900);
    let controls = await page.evaluate(
      () => globalThis.__WFS_TEST__.snapshot().controls,
    );
    expect(Math.abs(controls.desktopStick.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(controls.desktopStick.y)).toBeLessThanOrEqual(1);

    await page.keyboard.press("Escape");
    controls = await page.evaluate(
      () => globalThis.__WFS_TEST__.snapshot().controls,
    );
    expect(controls.desktopStick).toEqual({ x: 0, y: 0 });
    expect(controls.pointerLockActive).toBe(false);
  });

  test("accepts simultaneous touch joystick and throttle pointers and cancels ownership", async ({
    page,
  }) => {
    const stick = page.locator("#touch-stick");
    const throttle = page.locator("#throttle-up");
    await page.locator("#touch-controls").evaluate((element) => {
      element.style.display = "flex";
    });
    const box = await stick.boundingBox();
    if (!box) throw new Error("touch stick bounding box is unavailable");
    await stick.dispatchEvent("pointerdown", {
      pointerId: 11,
      pointerType: "touch",
      clientX: box.x + box.width * 0.8,
      clientY: box.y + box.height * 0.2,
    });
    await throttle.dispatchEvent("pointerdown", {
      pointerId: 12,
      pointerType: "touch",
    });
    let controls = await page.evaluate(
      () => globalThis.__WFS_TEST__.snapshot().controls,
    );
    expect(controls.frame.pitch).toBeGreaterThan(0);
    expect(controls.frame.roll).toBeGreaterThan(0);
    expect(controls.frame.throttleDelta).toBe(1);

    await stick.dispatchEvent("pointercancel", {
      pointerId: 11,
      pointerType: "touch",
    });
    await throttle.dispatchEvent("pointercancel", {
      pointerId: 12,
      pointerType: "touch",
    });
    controls = await page.evaluate(
      () => globalThis.__WFS_TEST__.snapshot().controls,
    );
    expect(controls.frame).toEqual({ pitch: 0, roll: 0, throttleDelta: 0 });
  });

  test("pause clears every adapter before another frame", async ({ page }) => {
    await page.keyboard.down("w");
    await page.keyboard.down("ArrowUp");
    await page.keyboard.press("p");
    const snapshot = await page.evaluate(() =>
      globalThis.__WFS_TEST__.snapshot(),
    );
    expect(snapshot.lifecycle.phase).toBe("paused");
    expect(snapshot.controls.frame).toEqual({
      pitch: 0,
      roll: 0,
      throttleDelta: 0,
    });
    expect(snapshot.controls.activeKeys).toEqual([]);
  });
});
