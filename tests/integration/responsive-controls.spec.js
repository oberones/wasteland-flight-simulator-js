import { expect, test } from "@playwright/test";
import { FlightFixture } from "../helpers/flight-fixture.js";

const DESKTOP_VIEWPORTS = [
  { width: 1_024, height: 576 },
  { width: 1_920, height: 1_080 },
  { width: 2_560, height: 1_440 },
];

const MOBILE_VIEWPORTS = [
  { width: 640, height: 360 },
  { width: 844, height: 390 },
  { width: 915, height: 412 },
  { width: 1_366, height: 1_024 },
];

/** @param {import("@playwright/test").Page} page */
async function layoutSample(page) {
  return page.evaluate(() => {
    /** @param {Element | null} element */
    const visible = (element) =>
      element &&
      (!(element instanceof HTMLElement) || !element.hidden) &&
      window.getComputedStyle(element).display !== "none";
    /** @param {string} selector */
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!visible(element)) return null;
      if (!element) throw new Error(`missing element: ${selector}`);
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
      };
    };
    const ids = [...document.querySelectorAll("[id]")].map(
      (element) => element.id,
    );
    const canvas = document.querySelector("#flight-canvas");
    if (!(canvas instanceof HTMLCanvasElement))
      throw new Error("flight canvas is missing");
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentSize: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      hud: rect("#hud"),
      pause: rect("#pause-button"),
      legend: rect("#control-legend"),
      stick: rect("#touch-stick"),
      throttleUp: rect("#throttle-up"),
      throttleDown: rect("#throttle-down"),
      canvas: rect("#flight-canvas"),
      uniqueIds: new Set(ids).size === ids.length,
      canvasCount: document.querySelectorAll("canvas").length,
      touchActions: Object.fromEntries(
        [
          "#flight-canvas",
          "#touch-stick",
          "#throttle-up",
          "#throttle-down",
        ].map((selector) => [
          selector,
          (() => {
            const element = document.querySelector(selector);
            if (!element) throw new Error(`missing element: ${selector}`);
            return window.getComputedStyle(element).touchAction;
          })(),
        ]),
      ),
      rendererSize: {
        width: canvas.width,
        height: canvas.height,
        dpr: window.devicePixelRatio,
      },
    };
  });
}

/** @param {any} rect @param {{width: number, height: number}} viewport */
function expectInsideViewport(rect, viewport) {
  expect(rect).not.toBeNull();
  expect(rect.left).toBeGreaterThanOrEqual(-0.5);
  expect(rect.top).toBeGreaterThanOrEqual(-0.5);
  expect(rect.right).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(rect.bottom).toBeLessThanOrEqual(viewport.height + 0.5);
}

/** @param {any} left @param {any} right */
function overlaps(left, right) {
  if (!left || !right) return false;
  return !(
    left.right <= right.left ||
    right.right <= left.left ||
    left.bottom <= right.top ||
    right.bottom <= left.top
  );
}

test("fits every contracted viewport with unique bounded controls", async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.startsWith("mobile-");
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("level-flight");
  const samples = [];

  for (const viewport of mobile ? MOBILE_VIEWPORTS : DESKTOP_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const sample = await layoutSample(page);
    samples.push(sample);
    expect(sample.documentSize.width).toBeLessThanOrEqual(viewport.width);
    expect(sample.documentSize.height).toBeLessThanOrEqual(viewport.height);
    expect(sample.uniqueIds).toBe(true);
    expect(sample.canvasCount).toBe(1);
    for (const rect of [sample.hud, sample.pause, sample.canvas])
      expectInsideViewport(rect, viewport);
    expect(overlaps(sample.hud, sample.pause)).toBe(false);

    if (mobile) {
      for (const rect of [
        sample.stick,
        sample.throttleUp,
        sample.throttleDown,
      ]) {
        expectInsideViewport(rect, viewport);
        if (!rect) throw new Error("mobile control is unexpectedly hidden");
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      }
      expect(overlaps(sample.stick, sample.legend)).toBe(false);
      expect(overlaps(sample.throttleUp, sample.legend)).toBe(false);
      expect(overlaps(sample.throttleDown, sample.legend)).toBe(false);
      for (const action of Object.values(sample.touchActions))
        expect(action).toBe("none");
    }
  }

  await testInfo.attach("responsive-layout-samples", {
    body: JSON.stringify({ project: testInfo.project.name, samples }, null, 2),
    contentType: "application/json",
  });
});

test("desktop zoom equivalents retain essential readable controls", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile-"));
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("level-flight");
  for (const zoom of [1, 1.5, 2]) {
    const viewport = {
      width: Math.round(1_024 / zoom),
      height: Math.round(576 / zoom),
    };
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const sample = await layoutSample(page);
    expectInsideViewport(sample.hud, viewport);
    expectInsideViewport(sample.pause, viewport);
    expect(sample.documentSize.width).toBeLessThanOrEqual(viewport.width);
    expect(sample.documentSize.height).toBeLessThanOrEqual(viewport.height);
  }
});

test("renderer follows aspect and capped device-pixel resize", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("level-flight");
  for (const viewport of [
    { width: 1_200, height: 500 },
    { width: 700, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const sample = await layoutSample(page);
    const scale = Math.min(sample.rendererSize.dpr, 2);
    expect(sample.rendererSize.width).toBe(Math.round(viewport.width * scale));
    expect(sample.rendererSize.height).toBe(
      Math.round(viewport.height * scale),
    );
  }
});

test("touch pointers remain independent and cancel to neutral", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile-"));
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("level-flight");
  const stick = page.locator("#touch-stick");
  const throttle = page.locator("#throttle-up");
  const box = await stick.boundingBox();
  if (!box) throw new Error("touch stick bounding box is unavailable");
  await stick.dispatchEvent("pointerdown", {
    pointerId: 71,
    pointerType: "touch",
    clientX: box.x + box.width * 0.8,
    clientY: box.y + box.height * 0.2,
  });
  await throttle.dispatchEvent("pointerdown", {
    pointerId: 72,
    pointerType: "touch",
  });
  const active = await fixture.snapshot();
  expect(active.controls.stickTouchId).toBe(71);
  expect(active.controls.throttleUpTouchIds).toEqual([72]);
  expect(active.controls.frame.pitch).toBeGreaterThan(0);
  expect(active.controls.frame.roll).toBeGreaterThan(0);
  expect(active.controls.frame.throttleDelta).toBe(1);

  await stick.dispatchEvent("pointercancel", {
    pointerId: 71,
    pointerType: "touch",
  });
  expect((await fixture.snapshot()).controls.frame.throttleDelta).toBe(1);
  await throttle.dispatchEvent("pointercancel", {
    pointerId: 72,
    pointerType: "touch",
  });
  const neutral = await fixture.snapshot();
  expect(neutral.controls.stickTouchId).toBeNull();
  expect(neutral.controls.throttleUpTouchIds).toEqual([]);
  expect(neutral.controls.frame).toEqual({
    pitch: 0,
    roll: 0,
    throttleDelta: 0,
  });
});
