import { expect, test } from "@playwright/test";
import { FlightFixture } from "../helpers/flight-fixture.js";
import {
  calculateBudgetResults,
  collectFrameDurations,
  collectQualityTransitions,
  createNetworkCollector,
  generateQualificationReport,
  measureInputResponse,
  mergeEnvironmentManifest,
  resolvePerformanceProfile,
  sampleRuntimeMetrics,
  summarizeFrames,
  validatePreflight,
  writePerformanceEvidence,
} from "../helpers/metrics.js";

const PERFORMANCE_PROFILE =
  process.env.WFS_PERFORMANCE_PROFILE === "full" ? "full" : "smoke";
const FRAME_SAMPLE_COUNT = PERFORMANCE_PROFILE === "full" ? 1_200 : 120;

const DEPENDENCY_HASHES = Object.freeze({
  "Three.js":
    "718702a2c4b998a696c1cd9f891c7852c0d726bfe10a400f4175f4e2012e12e7b2140ce46e4aa4c8ff39bd1f67c8a178",
  "simplex-noise":
    "5666e8c9abefc5348abc53555ae66de04d4a6364d29cbd6966cc6df76a0579bf1de23a85682b9e49f120471447f235a2",
});

/** @param {string} runId @param {string} workload */
function qualificationRun(runId, workload = "flight-five-minute") {
  return {
    runId,
    referenceId: "desktop-m1",
    device: "Apple Mac mini",
    cpu: "Apple M1 8-core",
    memoryGiB: 16,
    os: "macOS 15.6 build 24G84",
    browser: "Chrome",
    browserVersion: "140.0.7339.81",
    viewport: { width: 1920, height: 1080 },
    dpr: 2,
    power: "AC",
    batteryPercent: null,
    thermal: "nominal",
    displayAttachment: "1920x1080 external display",
    network: { downMbps: 25, upMbps: 5, rttMs: 50 },
    commit: "0123456789abcdef0123456789abcdef01234567",
    dirty: false,
    dependencyHashes: DEPENDENCY_HASHES,
    workload,
    preflight: "pass",
  };
}

/**
 * @param {import("@playwright/test").TestInfo} testInfo
 * @param {string} name
 * @param {unknown} document
 */
async function attachJson(testInfo, name, document) {
  await testInfo.attach(name, {
    body: JSON.stringify(document, null, 2),
    contentType: "application/json",
  });
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {import("@playwright/test").TestInfo} testInfo
 * @param {string} name
 */
async function attachScreenshot(page, testInfo, name) {
  await testInfo.attach(name, {
    body: await page.screenshot(),
    contentType: "image/png",
  });
}

test.describe("performance evidence contract", () => {
  test("selects only explicit smoke or full workload profiles", () => {
    expect(resolvePerformanceProfile(undefined)).toEqual({
      name: "smoke",
      frameSampleCount: 120,
    });
    expect(resolvePerformanceProfile("full")).toEqual({
      name: "full",
      frameSampleCount: 1_200,
    });
    expect(() => resolvePerformanceProfile("fast")).toThrow(/profile/i);
  });

  test("rejects incomplete or non-reference preflight records", () => {
    expect(() =>
      validatePreflight({
        ...qualificationRun("desktop-m1-chrome-flight-five-minute"),
        dirty: true,
      }),
    ).toThrow(/dirty/i);
    expect(() =>
      validatePreflight({
        ...qualificationRun("desktop-m1-chrome-flight-five-minute"),
        viewport: { width: 1280, height: 720 },
      }),
    ).toThrow(/viewport/i);
  });

  test("merges environment runs atomically in lexical order and rejects duplicates", async ({
    page: _page,
  }, testInfo) => {
    const manifestPath = testInfo.outputPath("environment-manifest.json");
    const second = qualificationRun(
      "desktop-m1-chrome-maximum-speed-ten-minute",
      "maximum-speed-ten-minute",
    );
    const first = qualificationRun(
      "desktop-m1-chrome-flight-five-minute",
      "flight-five-minute",
    );
    mergeEnvironmentManifest(manifestPath, second);
    const manifest = mergeEnvironmentManifest(manifestPath, first);
    expect(manifest.schemaVersion).toBe(1);
    expect(Object.keys(manifest.runs)).toEqual([first.runId, second.runId]);
    expect(() => mergeEnvironmentManifest(manifestPath, first)).toThrow(
      /duplicate runId/i,
    );
    const { readFile } = await import("node:fs/promises");
    expect(JSON.parse(await readFile(manifestPath, "utf8"))).toEqual(manifest);
  });

  test("writes and validates the contracted performance evidence set", async ({
    page: _page,
  }, testInfo) => {
    const runId = "desktop-m1-chrome-flight-five-minute";
    const paths = writePerformanceEvidence(testInfo.outputPath("performance"), {
      runId,
      summary: {
        schemaVersion: 1,
        runId,
        result: "pass",
        budgets: {
          frameCadence: true,
          inputResponse: true,
          memoryStability: true,
          network: true,
        },
        qualityTransitions: [],
      },
      frames: { schemaVersion: 1, runId, samples: [16.6, 16.7] },
      network: {
        schemaVersion: 1,
        runId,
        requests: [
          {
            url: "https://cdn.jsdelivr.net/example.js",
            status: 200,
            transferredBytes: 100,
            decodedBytes: 100,
            durationMs: 25,
            redirects: [],
          },
        ],
      },
      memory: {
        schemaVersion: 1,
        runId,
        samples: [{ label: "minute-2", usedBytes: 100 }],
      },
    });
    expect(Object.keys(paths).toSorted()).toEqual([
      "frames",
      "memory",
      "network",
      "summary",
    ]);
    const { readFile } = await import("node:fs/promises");
    for (const [kind, path] of Object.entries(paths)) {
      const document = JSON.parse(await readFile(path, "utf8"));
      expect(document.runId).toBe(runId);
      expect(path).toContain(`${runId}-${kind}.json`);
    }
    expect(() =>
      writePerformanceEvidence(testInfo.outputPath("performance"), {
        runId,
        summary: {
          schemaVersion: 1,
          runId,
          result: "pass",
          budgets: {},
          qualityTransitions: [],
        },
        frames: { schemaVersion: 1, runId, samples: [16.6] },
        network: { schemaVersion: 1, runId, requests: [] },
        memory: { schemaVersion: 1, runId, samples: [] },
      }),
    ).toThrow(/already exists/i);
  });

  test("generates a fail-closed report when qualification evidence is missing", async ({
    page: _page,
  }, testInfo) => {
    const root = testInfo.outputPath("empty-repository");
    const report = generateQualificationReport(root);
    expect(report.result).toBe("fail");
    expect(report.issues).toContain(
      "evidence/environment-manifest.json is missing",
    );
    expect(report.issues.some((issue) => issue.includes("desktop-m1"))).toBe(
      true,
    );
    const { readFile } = await import("node:fs/promises");
    const reportText = await readFile(report.path, "utf8");
    expect(reportText).toContain("Release status: **FAIL**");
    expect(reportText).toContain("Missing or failed gates");
  });
});

test.describe("normative performance workload smoke", () => {
  test("records cold-load feedback, control, network, and initial capture", async ({
    page,
  }, testInfo) => {
    const collector = createNetworkCollector(page);
    const startedAt = performance.now();
    await page.goto("/", { waitUntil: "commit" });
    await page
      .getByTestId("loading-state")
      .waitFor({ state: "visible", timeout: 5_000 });
    const coldFeedbackMs = performance.now() - startedAt;
    await expect(page.getByTestId("application-state")).toHaveAttribute(
      "data-phase",
      /ready|flying/,
      { timeout: 15_000 },
    );
    const coldControlMs = performance.now() - startedAt;
    await page.waitForTimeout(50);
    const requests = collector.snapshot();
    collector.stop();
    const externalRequests = requests.filter((request) =>
      request.url.startsWith("https://cdn.jsdelivr.net/"),
    );
    const unexpectedRequests = requests.filter(
      (request) =>
        /^https?:/.test(request.url) &&
        request.url !== "http://127.0.0.1:4173/" &&
        !request.url.startsWith("https://cdn.jsdelivr.net/"),
    );
    expect(coldFeedbackMs).toBeLessThanOrEqual(500);
    expect(coldControlMs).toBeLessThanOrEqual(5_000);
    expect(externalRequests).toHaveLength(2);
    expect(unexpectedRequests).toEqual([]);
    expect(externalRequests.every((request) => request.status === 200)).toBe(
      true,
    );
    await attachJson(testInfo, "cold-load-network", {
      schemaVersion: 1,
      profile: PERFORMANCE_PROFILE,
      project: testInfo.project.name,
      coldFeedbackMs,
      coldControlMs,
      requests,
    });
    await attachScreenshot(page, testInfo, "cold-load-controllable");
  });

  test("runs the deterministic flight-five-minute workload with raw evidence", async ({
    page,
  }, testInfo) => {
    const fixture = await new FlightFixture(page).load();
    const initial = await fixture.reset("level-flight");
    const initialMemory = await sampleRuntimeMetrics(page);
    await attachScreenshot(page, testInfo, "flight-five-minute-initial");
    const frameSamplesPromise = collectFrameDurations(page, FRAME_SAMPLE_COUNT);

    await fixture.step(3_600, { pitch: 0, roll: 0, throttleDelta: 0 });
    for (let segment = 0; segment < 6; segment += 1) {
      await fixture.step(1_200, {
        pitch: 0.5,
        roll: segment % 2 === 0 ? -1 : 1,
        throttleDelta: 0,
      });
    }
    const stallStates = [];
    for (let cycle = 0; cycle < 3; cycle += 1) {
      stallStates.push(
        await fixture.step(900, {
          pitch: 0.35,
          roll: 0,
          throttleDelta: -1,
        }),
      );
      stallStates.push(
        await fixture.step(900, {
          pitch: -0.5,
          roll: 0,
          throttleDelta: 1,
        }),
      );
    }
    const terminal = await fixture.step(1_800, {
      pitch: 0,
      roll: 0,
      throttleDelta: 0,
    });
    const inputSamples = [];
    for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "w", "s"]) {
      inputSamples.push(
        await measureInputResponse(page, async () => {
          await page.keyboard.press(key);
        }),
      );
    }
    const frameSamples = await frameSamplesPromise;
    const frameSummary = summarizeFrames(frameSamples);
    const terminalMemory = await sampleRuntimeMetrics(page);
    const qualityTransitions = collectQualityTransitions(terminalMemory);
    const budgets = calculateBudgetResults({
      frameSummary,
      coldFeedbackMs: null,
      coldControlMs: null,
      inputSamples,
      minuteTwoBytes: initialMemory.memory?.usedJSHeapSize ?? null,
      minuteTenBytes: terminalMemory.memory?.usedJSHeapSize ?? null,
      restartTimesMs: [],
      externalRequestCount: null,
      unexpectedRequestCount: null,
      worldContinuity: terminal.lifecycle.phase === "flying",
    });

    expect(terminal.elapsedFlightSeconds).toBeCloseTo(300, 6);
    expect(terminal.lifecycle.phase).toBe("flying");
    expect(
      stallStates.filter((state) => state.aircraft.stallState === "stalled"),
    ).toHaveLength(3);
    expect(
      stallStates.filter((state) =>
        ["recovering", "normal"].includes(state.aircraft.stallState),
      ),
    ).toHaveLength(3);
    expect(Math.max(...inputSamples)).toBeLessThanOrEqual(100);
    await attachJson(testInfo, "flight-five-minute-summary", {
      schemaVersion: 1,
      profile: PERFORMANCE_PROFILE,
      project: testInfo.project.name,
      seed: initial.seed,
      commandStream: {
        levelSeconds: 60,
        alternatingBankSeconds: 120,
        stallRecoveryCycles: 3,
        stallRecoverySeconds: 90,
        finalRouteSeconds: 30,
      },
      terminal,
      frameSummary,
      inputSamples,
      qualityTransitions,
      budgets,
    });
    await attachJson(testInfo, "flight-five-minute-frames", {
      schemaVersion: 1,
      samples: frameSamples,
    });
    await attachJson(testInfo, "flight-five-minute-memory", {
      schemaVersion: 1,
      samples: [
        { label: "initial", metrics: initialMemory },
        { label: "terminal", metrics: terminalMemory },
      ],
    });
    await attachScreenshot(page, testInfo, "flight-five-minute-final");
  });

  test("runs restart-twenty with bounded recovery and stable ownership", async ({
    page,
  }, testInfo) => {
    const fixture = await new FlightFixture(page).load();
    await fixture.reset("restart-world");
    const baseline = await fixture.metrics();
    const worldBefore = await fixture.region(0, 0);
    const recoveryTimesMs = [];
    const memorySamples = [];
    await attachScreenshot(page, testInfo, "restart-twenty-initial");
    for (let cycle = 0; cycle < 20; cycle += 1) {
      const crashed = await fixture.step(1_200, {
        pitch: -1,
        roll: 0,
        throttleDelta: 1,
      });
      expect(crashed.lifecycle.phase).toBe("crashed");
      const startedAt = performance.now();
      await fixture.dispatchLifecycle("RESTART");
      recoveryTimesMs.push(performance.now() - startedAt);
      if (cycle === 0 || cycle === 19) {
        memorySamples.push({
          label: cycle === 0 ? "restart-1" : "restart-20",
          metrics: await sampleRuntimeMetrics(page),
        });
      }
    }
    const terminal = await fixture.snapshot();
    const metrics = await fixture.metrics();
    const worldAfter = await fixture.region(0, 0);
    expect(terminal.attemptNumber).toBe(21);
    expect(terminal.crashCount).toBe(20);
    expect(recoveryTimesMs.every((sample) => sample <= 2_000)).toBe(true);
    expect(metrics.listeners).toBe(baseline.listeners);
    expect(metrics.domOverlays).toBe(baseline.domOverlays);
    expect(metrics.sceneObjects).toBe(baseline.sceneObjects);
    expect(metrics.world.poolIds).toEqual(baseline.world.poolIds);
    expect(worldAfter.descriptorHash).toBe(worldBefore.descriptorHash);
    await attachJson(testInfo, "restart-twenty-summary", {
      schemaVersion: 1,
      profile: PERFORMANCE_PROFILE,
      project: testInfo.project.name,
      recoveryTimesMs,
      baseline,
      terminal,
      metrics,
      worldHash: worldAfter.descriptorHash,
    });
    await attachJson(testInfo, "restart-twenty-memory", {
      schemaVersion: 1,
      samples: memorySamples,
    });
    await attachScreenshot(page, testInfo, "restart-twenty-final");
  });
});

test.describe("deterministic maximum-speed traversal smoke", () => {
  test("traverses ten simulated minutes with bounded world and memory", async ({
    page,
  }, testInfo) => {
    const fixture = await new FlightFixture(page).load();
    await fixture.reset("region-seam");
    const start = await fixture.world();
    await attachScreenshot(page, testInfo, "maximum-speed-ten-minute-initial");
    const frameSamplesPromise = collectFrameDurations(page, FRAME_SAMPLE_COUNT);
    await fixture.step(7_200, { pitch: 0, roll: 0, throttleDelta: 1 });
    const minuteTwo = await fixture.world();
    const minuteTwoMetrics = await sampleRuntimeMetrics(page);
    for (let segment = 0; segment < 6; segment += 1) {
      await fixture.step(60, {
        pitch: 0,
        roll: segment % 2 === 0 ? 0.05 : -0.05,
        throttleDelta: 1,
      });
      await fixture.step(4_740, {
        pitch: 0,
        roll: 0,
        throttleDelta: 1,
      });
    }
    const terminal = await fixture.snapshot();
    const minuteTen = await fixture.world();
    const metrics = await fixture.metrics();
    const minuteTenMetrics = await sampleRuntimeMetrics(page);
    const frameSamples = await frameSamplesPromise;
    const frameSummary = summarizeFrames(frameSamples);
    const budgets = calculateBudgetResults({
      frameSummary,
      coldFeedbackMs: null,
      coldControlMs: null,
      inputSamples: [],
      minuteTwoBytes:
        minuteTwoMetrics.memory?.usedJSHeapSize ?? minuteTwo.allocatedBytes,
      minuteTenBytes:
        minuteTenMetrics.memory?.usedJSHeapSize ?? minuteTen.allocatedBytes,
      restartTimesMs: [],
      externalRequestCount: null,
      unexpectedRequestCount: null,
      worldContinuity:
        minuteTen.activeRegionCount === 25 &&
        minuteTen.duplicateDescriptors === 0 &&
        minuteTen.seamFailures === 0,
    });

    expect(terminal.elapsedFlightSeconds).toBeCloseTo(600, 6);
    expect(minuteTen.activeRegionCount).toBe(25);
    expect(minuteTen.poolSize).toBe(25);
    expect(minuteTen.poolIds.toSorted()).toEqual(start.poolIds.toSorted());
    expect(minuteTen.allocatedBytes).toBe(minuteTwo.allocatedBytes);
    expect(minuteTen.duplicateDescriptors).toBe(0);
    expect(minuteTen.seamFailures).toBe(0);
    expect(
      minuteTen.originRevision,
      JSON.stringify({
        globalPosition: terminal.aircraft.globalPosition,
        worldOrigin: minuteTen.worldOrigin,
        activeCenter: minuteTen.activeCenter,
      }),
    ).toBeGreaterThan(0);
    expect(metrics.world.poolSize).toBe(25);
    expect(metrics.world.activeRegionCount).toBe(25);
    expect(metrics.sceneObjects).toBeLessThanOrEqual(start.sceneObjectBudget);
    await testInfo.attach("maximum-speed-ten-minute", {
      body: JSON.stringify(
        {
          project: testInfo.project.name,
          seed: 0x13579bdf,
          start,
          minuteTwo,
          minuteTen,
          terminal,
          metrics,
          frameSummary,
          budgets,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
    await attachJson(testInfo, "maximum-speed-ten-minute-frames", {
      schemaVersion: 1,
      samples: frameSamples,
    });
    await attachJson(testInfo, "maximum-speed-ten-minute-memory", {
      schemaVersion: 1,
      samples: [
        { label: "minute-2", metrics: minuteTwoMetrics },
        { label: "minute-10", metrics: minuteTenMetrics },
      ],
    });
    await attachScreenshot(page, testInfo, "maximum-speed-ten-minute-final");
  });

  test("degrades and restores cosmetics in order without changing protected state", async ({
    page,
  }, testInfo) => {
    const fixture = await new FlightFixture(page).load();
    await fixture.reset("region-seam");
    const terrainBefore = await fixture.sampleTerrain(111.25, -222.75);
    const regionBefore = await fixture.region(0, 0);
    const snapshotBefore = await fixture.snapshot();
    const protectedBefore = {
      seed: snapshotBefore.seed,
      attemptNumber: snapshotBefore.attemptNumber,
      crashCount: snapshotBefore.crashCount,
      elapsedFlightSeconds: snapshotBefore.elapsedFlightSeconds,
      lifecycle: snapshotBefore.lifecycle,
      simulationConfigHash: snapshotBefore.simulationConfigHash,
      hud: snapshotBefore.hud,
      aircraft: snapshotBefore.aircraft,
      controls: snapshotBefore.controls,
    };

    const profiles = [];
    let quality = await fixture.simulateQuality(40, 2.99);
    expect(quality.tier).toBe(0);
    expect(quality.lowFpsSeconds).toBeCloseTo(2.99, 8);
    quality = await fixture.simulateQuality(50, 0.01);
    expect(quality.lowFpsSeconds).toBe(0);
    expect(quality.recoverySeconds).toBe(0);

    for (let tier = 1; tier <= 4; tier += 1) {
      quality = await fixture.simulateQuality(40, 3);
      expect(quality.tier).toBe(tier);
      profiles.push((await fixture.metrics()).qualityProfile);
    }
    const degraded = await fixture.world();
    expect(degraded.quality.transitionActions).toEqual([
      "reduce-ash",
      "reduce-shadows",
      "reduce-windows",
      "reduce-pixel-ratio",
    ]);
    expect(profiles).toEqual([
      {
        ashCount: 260,
        ashDrift: 3,
        shadowMapSize: 2_048,
        shadowExtent: 700,
        windowDensity: 1,
        pixelRatioCap: 2,
      },
      {
        ashCount: 260,
        ashDrift: 3,
        shadowMapSize: 1_024,
        shadowExtent: 430,
        windowDensity: 1,
        pixelRatioCap: 2,
      },
      {
        ashCount: 260,
        ashDrift: 3,
        shadowMapSize: 1_024,
        shadowExtent: 430,
        windowDensity: 0.5,
        pixelRatioCap: 2,
      },
      {
        ashCount: 260,
        ashDrift: 3,
        shadowMapSize: 1_024,
        shadowExtent: 430,
        windowDensity: 0.5,
        pixelRatioCap: 1,
      },
    ]);
    quality = await fixture.simulateQuality(60, 9.99);
    expect(quality.tier).toBe(4);
    quality = await fixture.simulateQuality(50, 0.01);
    expect(quality.lowFpsSeconds).toBe(0);
    expect(quality.recoverySeconds).toBe(0);
    for (let tier = 3; tier >= 0; tier -= 1) {
      quality = await fixture.simulateQuality(60, 10);
      expect(quality.tier).toBe(tier);
    }

    const terrainAfter = await fixture.sampleTerrain(111.25, -222.75);
    const regionAfter = await fixture.region(0, 0);
    const snapshotAfter = await fixture.snapshot();
    const metricsAfter = await fixture.metrics();
    const protectedAfter = {
      seed: snapshotAfter.seed,
      attemptNumber: snapshotAfter.attemptNumber,
      crashCount: snapshotAfter.crashCount,
      elapsedFlightSeconds: snapshotAfter.elapsedFlightSeconds,
      lifecycle: snapshotAfter.lifecycle,
      simulationConfigHash: snapshotAfter.simulationConfigHash,
      hud: snapshotAfter.hud,
      aircraft: snapshotAfter.aircraft,
      controls: snapshotAfter.controls,
    };
    expect(terrainAfter).toEqual(terrainBefore);
    expect(regionAfter.heightHash).toBe(regionBefore.heightHash);
    expect(regionAfter.descriptorHash).toBe(regionBefore.descriptorHash);
    expect(regionAfter.ruinHash).toBe(regionBefore.ruinHash);
    expect(protectedAfter).toEqual(protectedBefore);
    expect(snapshotAfter.quality.tier).toBe(0);
    expect(metricsAfter.quality.transitionActions).toEqual([
      "reduce-ash",
      "reduce-shadows",
      "reduce-windows",
      "reduce-pixel-ratio",
      "restore-pixel-ratio",
      "restore-windows",
      "restore-shadows",
      "restore-ash",
    ]);
    await attachJson(testInfo, "adaptive-quality-matrix", {
      schemaVersion: 1,
      project: testInfo.project.name,
      fixture: "region-seam",
      seed: snapshotBefore.seed,
      thresholds: {
        degrade: { fps: 40, seconds: 3 },
        neutralResetFps: 50,
        restore: { fps: 60, seconds: 10 },
      },
      profiles,
      transitions: metricsAfter.quality.transitions,
      protectedBefore,
      protectedAfter,
      terrain: { before: terrainBefore, after: terrainAfter },
      regionHashes: {
        before: {
          height: regionBefore.heightHash,
          descriptor: regionBefore.descriptorHash,
          ruin: regionBefore.ruinHash,
        },
        after: {
          height: regionAfter.heightHash,
          descriptor: regionAfter.descriptorHash,
          ruin: regionAfter.ruinHash,
        },
      },
    });
  });
});
