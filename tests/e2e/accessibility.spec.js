import { expect, test } from "@playwright/test";
import { FlightFixture } from "../helpers/flight-fixture.js";

/** @param {string} hex */
function hexRgb(hex) {
  return [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
}

/**
 * @param {number[]} foreground
 * @param {number} opacity
 * @param {number[]} background
 */
function blend(foreground, opacity, background) {
  return foreground.map((channel, index) =>
    Math.round(channel * opacity + background[index] * (1 - opacity)),
  );
}

/** @param {number[]} rgb */
function luminance(rgb) {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

/** @param {number[]} left @param {number[]} right */
function contrast(left, right) {
  const first = luminance(left);
  const second = luminance(right);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test("exposes controlled landmarks, names, headings, and live status", async ({
  page,
}) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("level-flight");

  await expect(
    page.getByRole("main", { name: "Wasteland Flight Simulator" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Wasteland flight view" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Flight instruments" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("#hud[aria-live]")).toHaveCount(0);
  await expect(page.locator("[role='status']")).toHaveCount(1);
  await expect(page.locator("#live-status")).toHaveText("Flight active");

  const namedControls = await page
    .locator("button, canvas")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        hidden:
          (element instanceof window.HTMLElement && element.hidden) ||
          window.getComputedStyle(element).display === "none",
        name: element.getAttribute("aria-label") || element.textContent.trim(),
      })),
    );
  for (const control of namedControls.filter((entry) => !entry.hidden))
    expect(control.name.length).toBeGreaterThan(0);
});

test("keyboard-only pause, resume, crash, and restart keep focus visible", async ({
  page,
}, testInfo) => {
  const fixture = await new FlightFixture(page).load();
  await fixture.reset("level-flight");
  await expect(page.locator("#flight-canvas")).toBeFocused();
  if (testInfo.project.name.includes("webkit")) {
    await page.keyboard.press("p");
  } else {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Pause" })).toBeFocused();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("button", { name: "Resume" })).toBeFocused();
  await expect(page.locator("#live-status")).toHaveText("Flight paused.");
  const resumeOutline = await page
    .getByRole("button", { name: "Resume" })
    .evaluate((element) => window.getComputedStyle(element).outlineStyle);
  expect(resumeOutline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.locator("#flight-canvas")).toBeFocused();

  await fixture.reset("terrain-impact");
  await fixture.step(120, { pitch: -1, roll: 0, throttleDelta: 1 });
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#flight-canvas")).toBeFocused();
  await expect(page.locator("#live-status")).toHaveText("Flight active");
});

test("text and shape cues survive reduced motion without changing simulation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const fixture = await new FlightFixture(page).load();
  const initial = await fixture.reset("level-flight");
  const terminal = await fixture.step(600, {
    pitch: 0.1,
    roll: 0.15,
    throttleDelta: 0.2,
  });
  const metrics = await fixture.metrics();
  expect(terminal.simulationConfigHash).toBe(initial.simulationConfigHash);
  expect(metrics.reducedMotion).toBe(true);
  expect(metrics.ash.count).toBeLessThanOrEqual(260);
  expect(metrics.ash.drift).toBeLessThanOrEqual(3);
  await expect(page.locator("#rotate-overlay")).toContainText(
    "Rotate to landscape",
  );
  await expect(page.locator("#crash-overlay")).toContainText("Terrain impact");
  const motion = await page.locator(".static-progress").evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      animationDuration: style.animationDuration,
      transitionDuration: style.transitionDuration,
    };
  });
  expect(["0s", "0.001ms", "1e-06s", "0.000001s"]).toContain(
    motion.animationDuration,
  );
  expect(["0s", "0.001ms", "1e-06s", "0.000001s"]).toContain(
    motion.transitionDuration,
  );
});

test("foreground and panel tokens preserve non-color readable hooks", async ({
  page,
}, testInfo) => {
  await new FlightFixture(page).load();
  const tokens = await page.evaluate(() => {
    const root = window.getComputedStyle(document.documentElement);
    const panelElement = document.querySelector("#hud");
    const speedLabel = document.querySelector("#hud dt");
    const rotateOverlay = document.querySelector("#rotate-overlay");
    if (!panelElement || !speedLabel || !rotateOverlay)
      throw new Error("required accessibility review elements are missing");
    const panel = window.getComputedStyle(panelElement);
    return {
      foreground: root.color,
      rustLight: root.getPropertyValue("--rust-light").trim(),
      panelBorder: panel.borderTopStyle,
      speedLabel: speedLabel.textContent?.trim() ?? "",
      rotateText: rotateOverlay.textContent?.trim() ?? "",
    };
  });
  expect(tokens.foreground).toBe("rgb(255, 247, 232)");
  expect(tokens.rustLight).toBe("#ffb866");
  expect(tokens.panelBorder).not.toBe("none");
  expect(tokens.speedLabel).toBe("Speed");
  expect(tokens.rotateText).toContain("Rotate to landscape");

  const worstCasePanel = blend(hexRgb("#120c09"), 0.88, hexRgb("#ff7028"));
  const ratios = {
    bodyTextOnPanel: contrast(hexRgb("#fff7e8"), worstCasePanel),
    amberLabelOnPanel: contrast(hexRgb("#ffc27a"), worstCasePanel),
    buttonTextOnRust: contrast(hexRgb("#fffdf8"), hexRgb("#8b3f1d")),
    focusRingOnRust: contrast(hexRgb("#fff3b0"), hexRgb("#8b3f1d")),
  };
  expect(ratios.bodyTextOnPanel).toBeGreaterThanOrEqual(4.5);
  expect(ratios.amberLabelOnPanel).toBeGreaterThanOrEqual(4.5);
  expect(ratios.buttonTextOnRust).toBeGreaterThanOrEqual(4.5);
  expect(ratios.focusRingOnRust).toBeGreaterThanOrEqual(3);
  await testInfo.attach("contrast-ratios", {
    body: JSON.stringify({ project: testInfo.project.name, ratios }, null, 2),
    contentType: "application/json",
  });
});
