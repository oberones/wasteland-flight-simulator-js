import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

export const EVIDENCE_SCHEMA_VERSION = 1;

export const WORKLOAD_IDS = Object.freeze([
  "flight-five-minute",
  "maximum-speed-ten-minute",
  "restart-twenty",
]);

/** @type {Readonly<Record<string, any>>} */
export const REFERENCE_MATRIX = Object.freeze({
  "desktop-m1": Object.freeze({
    cpuPattern: /Apple M1/i,
    memoryGiB: 16,
    browsers: Object.freeze(["Chrome", "Safari"]),
    viewport: Object.freeze({ width: 1920, height: 1080 }),
    requiresBattery: false,
  }),
  "android-pixel7": Object.freeze({
    devicePattern: /Pixel 7/i,
    cpuPattern: /Tensor G2/i,
    memoryGiB: 8,
    browsers: Object.freeze(["Chrome"]),
    requiresBattery: true,
  }),
  "ios-iphone13": Object.freeze({
    devicePattern: /iPhone 13/i,
    cpuPattern: /A15/i,
    memoryGiB: 4,
    browsers: Object.freeze(["Safari", "Chrome"]),
    requiresBattery: true,
  }),
});

export const DEPENDENCY_HASHES = Object.freeze({
  "Three.js":
    "718702a2c4b998a696c1cd9f891c7852c0d726bfe10a400f4175f4e2012e12e7b2140ce46e4aa4c8ff39bd1f67c8a178",
  "simplex-noise":
    "5666e8c9abefc5348abc53555ae66de04d4a6364d29cbd6966cc6df76a0579bf1de23a85682b9e49f120471447f235a2",
});

const QUALIFICATION_COMBINATIONS = Object.freeze([
  Object.freeze({ referenceId: "desktop-m1", browser: "Chrome" }),
  Object.freeze({ referenceId: "desktop-m1", browser: "Safari" }),
  Object.freeze({ referenceId: "android-pixel7", browser: "Chrome" }),
  Object.freeze({ referenceId: "ios-iphone13", browser: "Safari" }),
  Object.freeze({ referenceId: "ios-iphone13", browser: "Chrome" }),
]);

const REVIEW_GATES = Object.freeze([
  Object.freeze({
    label: "Dependency manifest",
    path: "evidence/dependency-manifest.json",
  }),
  Object.freeze({
    label: "Dependency review",
    path: "evidence/security/dependency-review.md",
  }),
  Object.freeze({
    label: "Static checks",
    path: "evidence/validation/static-checks.md",
  }),
  Object.freeze({
    label: "Automated tests",
    path: "evidence/validation/automated-tests.md",
  }),
  Object.freeze({
    label: "Runtime security review",
    path: "evidence/security/runtime-review.md",
  }),
  Object.freeze({
    label: "Accessibility review",
    path: "evidence/accessibility/us4-review.md",
  }),
  Object.freeze({
    label: "Final visual review",
    path: "evidence/visual/final-review.md",
  }),
  Object.freeze({
    label: "Quickstart validation",
    path: "evidence/validation/quickstart.md",
  }),
]);

/** @param {unknown} value @returns {value is Record<string, any>} */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @param {unknown} condition @param {string} message */
function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

/** @param {any} value @param {string} field */
function requireText(value, field) {
  requireCondition(
    typeof value === "string" && value.trim().length > 0,
    `${field} must be a non-empty string`,
  );
}

/** @param {any} value @param {string} field */
function requireFinite(value, field) {
  requireCondition(Number.isFinite(value), `${field} must be finite`);
}

/** @param {any} runId */
function validateRunId(runId) {
  requireCondition(
    typeof runId === "string" && /^[a-z0-9][a-z0-9.-]{2,159}$/.test(runId),
    "runId must use 3-160 lowercase letters, digits, dots, or hyphens",
  );
}

/** @param {string} path @param {unknown} document */
function atomicWriteJson(path, document) {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${globalThis.process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  renameSync(temporaryPath, path);
}

/** @param {string} path @param {string} text */
function atomicWriteText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${globalThis.process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, text, { encoding: "utf8", flag: "wx" });
  renameSync(temporaryPath, path);
}

/** @param {string | undefined} value */
export function resolvePerformanceProfile(value) {
  const name = value || "smoke";
  requireCondition(
    name === "smoke" || name === "full",
    "performance profile must be smoke or full",
  );
  return Object.freeze({
    name,
    frameSampleCount: name === "full" ? 1_200 : 120,
  });
}

/** @param {any} run */
export function validatePreflight(run) {
  requireCondition(isRecord(run), "preflight record must be an object");
  validateRunId(run.runId);
  const reference = REFERENCE_MATRIX[run.referenceId];
  requireCondition(reference, `unknown referenceId: ${run.referenceId}`);
  requireText(run.device, "device");
  requireText(run.cpu, "cpu");
  requireCondition(
    reference.cpuPattern.test(run.cpu),
    `cpu does not match ${run.referenceId}`,
  );
  if (reference.devicePattern) {
    requireCondition(
      reference.devicePattern.test(run.device),
      `device does not match ${run.referenceId}`,
    );
  }
  requireCondition(
    run.memoryGiB === reference.memoryGiB,
    `memoryGiB must be ${reference.memoryGiB} for ${run.referenceId}`,
  );
  requireText(run.os, "os");
  requireCondition(
    reference.browsers.includes(run.browser),
    `browser is not approved for ${run.referenceId}`,
  );
  requireText(run.browserVersion, "browserVersion");
  requireCondition(
    !/latest|current|unknown/i.test(run.browserVersion),
    "browserVersion must be exact",
  );
  requireCondition(
    isRecord(run.viewport) &&
      Number.isInteger(run.viewport.width) &&
      Number.isInteger(run.viewport.height) &&
      run.viewport.width > 0 &&
      run.viewport.height > 0,
    "viewport must contain positive integer width and height",
  );
  if (reference.viewport) {
    requireCondition(
      run.viewport.width === reference.viewport.width &&
        run.viewport.height === reference.viewport.height,
      `viewport must be ${reference.viewport.width}x${reference.viewport.height}`,
    );
  } else {
    requireCondition(
      run.viewport.width > run.viewport.height,
      "physical mobile viewport must be landscape",
    );
  }
  requireFinite(run.dpr, "dpr");
  requireCondition(run.dpr > 0, "dpr must be positive");
  requireText(run.power, "power");
  if (run.referenceId === "desktop-m1") {
    requireCondition(run.power === "AC", "desktop-m1 must use AC power");
  }
  if (reference.requiresBattery) {
    requireFinite(run.batteryPercent, "batteryPercent");
    requireCondition(
      run.batteryPercent >= 50,
      "physical mobile battery must be at least 50 percent",
    );
  }
  requireCondition(
    ["cool", "nominal"].includes(run.thermal),
    "thermal must be cool or nominal",
  );
  requireText(run.displayAttachment, "displayAttachment");
  requireCondition(
    isRecord(run.network) &&
      run.network.downMbps === 25 &&
      run.network.upMbps === 5 &&
      run.network.rttMs === 50,
    "network must be shaped to 25/5 Mbps with 50 ms RTT",
  );
  requireCondition(
    typeof run.commit === "string" && /^[a-f0-9]{40}$/.test(run.commit),
    "commit must be a full lowercase Git commit",
  );
  requireCondition(
    run.dirty === false,
    "dirty runtime artifacts fail preflight",
  );
  requireCondition(
    isRecord(run.dependencyHashes),
    "dependencyHashes must be an object",
  );
  for (const [name, expectedHash] of Object.entries(DEPENDENCY_HASHES)) {
    requireCondition(
      run.dependencyHashes[name] === expectedHash,
      `${name} dependency hash does not match the runtime contract`,
    );
  }
  requireCondition(
    WORKLOAD_IDS.includes(run.workload),
    `unsupported workload: ${run.workload}`,
  );
  requireCondition(run.preflight === "pass", "preflight field must be pass");
  requireCondition(
    run.runId.startsWith(`${run.referenceId}-`),
    "runId must begin with referenceId",
  );
  return structuredClone(run);
}

/** @param {string} manifestPath @param {any} run */
export function mergeEnvironmentManifest(manifestPath, run) {
  requireText(manifestPath, "manifestPath");
  const validatedRun = validatePreflight(run);
  /** @type {any} */
  let manifest = { schemaVersion: EVIDENCE_SCHEMA_VERSION, runs: {} };
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      throw new TypeError("environment manifest is not valid JSON");
    }
    requireCondition(
      manifest.schemaVersion === EVIDENCE_SCHEMA_VERSION,
      `environment manifest schemaVersion must be ${EVIDENCE_SCHEMA_VERSION}`,
    );
    requireCondition(
      isRecord(manifest.runs),
      "environment manifest runs must be an object",
    );
  }
  requireCondition(
    !(validatedRun.runId in manifest.runs),
    `duplicate runId rejected: ${validatedRun.runId}`,
  );
  manifest.runs[validatedRun.runId] = validatedRun;
  manifest.runs = Object.fromEntries(
    Object.entries(manifest.runs).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  atomicWriteJson(manifestPath, manifest);
  return structuredClone(manifest);
}

/** @param {string} kind @param {string} runId @param {any} document */
function validateEvidenceDocument(kind, runId, document) {
  requireCondition(isRecord(document), `${kind} evidence must be an object`);
  requireCondition(
    document.schemaVersion === EVIDENCE_SCHEMA_VERSION,
    `${kind} schemaVersion must be ${EVIDENCE_SCHEMA_VERSION}`,
  );
  requireCondition(document.runId === runId, `${kind} runId does not match`);
  if (kind === "summary") {
    requireCondition(
      ["pass", "fail"].includes(document.result),
      "summary result must be pass or fail",
    );
    requireCondition(
      isRecord(document.budgets),
      "summary budgets are required",
    );
    for (const [budget, passed] of Object.entries(document.budgets)) {
      requireText(budget, "budget name");
      requireCondition(
        typeof passed === "boolean",
        `summary budget ${budget} must be boolean`,
      );
    }
    requireCondition(
      Array.isArray(document.qualityTransitions),
      "summary qualityTransitions must be an array",
    );
  } else if (kind === "frames") {
    requireCondition(
      Array.isArray(document.samples) && document.samples.length > 0,
      "frames samples must be non-empty",
    );
    for (const sample of document.samples) {
      requireFinite(sample, "frame sample");
      requireCondition(sample >= 0, "frame samples cannot be negative");
    }
  } else if (kind === "network") {
    requireCondition(
      Array.isArray(document.requests),
      "network requests must be an array",
    );
    for (const request of document.requests) {
      requireCondition(isRecord(request), "network request must be an object");
      requireText(request.url, "network request URL");
      requireFinite(request.status, "network request status");
      requireFinite(request.transferredBytes, "network transferredBytes");
      requireFinite(request.decodedBytes, "network decodedBytes");
      requireFinite(request.durationMs, "network durationMs");
      requireCondition(
        Array.isArray(request.redirects),
        "network redirects must be an array",
      );
    }
  } else if (kind === "memory") {
    requireCondition(
      Array.isArray(document.samples),
      "memory samples must be an array",
    );
    for (const sample of document.samples) {
      requireCondition(isRecord(sample), "memory sample must be an object");
      requireText(sample.label, "memory sample label");
      requireFinite(sample.usedBytes, "memory usedBytes");
    }
  }
}

/** @param {string} directory @param {any} evidence */
export function writePerformanceEvidence(directory, evidence) {
  requireText(directory, "performance evidence directory");
  requireCondition(
    isRecord(evidence),
    "performance evidence must be an object",
  );
  validateRunId(evidence.runId);
  const documents = {
    summary: evidence.summary,
    frames: evidence.frames,
    network: evidence.network,
    memory: evidence.memory,
  };
  const paths = Object.fromEntries(
    Object.keys(documents).map((kind) => [
      kind,
      join(directory, `${evidence.runId}-${kind}.json`),
    ]),
  );
  for (const [kind, document] of Object.entries(documents)) {
    validateEvidenceDocument(kind, evidence.runId, document);
    requireCondition(
      !existsSync(paths[kind]),
      `${paths[kind]} already exists; evidence is append-only`,
    );
  }
  mkdirSync(directory, { recursive: true });
  for (const [kind, document] of Object.entries(documents)) {
    atomicWriteJson(paths[kind], document);
  }
  return Object.freeze({ ...paths });
}

/** @param {string} path @param {string} label @returns {any} */
function readJsonFile(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new TypeError(`${label} is missing or invalid JSON: ${path}`);
  }
}

/** @param {string} root @param {string} referenceId @param {any} bundle */
function validateQualificationBundle(root, referenceId, bundle) {
  requireCondition(
    isRecord(bundle) && isRecord(bundle.run) && isRecord(bundle.evidence),
    "qualification input must contain run and evidence objects",
  );
  const run = validatePreflight(bundle.run);
  requireCondition(
    run.referenceId === referenceId,
    `qualification input is for ${run.referenceId}, not ${referenceId}`,
  );
  requireCondition(
    bundle.evidence.runId === run.runId,
    "qualification evidence runId must match preflight runId",
  );
  const documents = {
    summary: bundle.evidence.summary,
    frames: bundle.evidence.frames,
    network: bundle.evidence.network,
    memory: bundle.evidence.memory,
  };
  for (const [kind, document] of Object.entries(documents)) {
    validateEvidenceDocument(kind, run.runId, document);
  }
  requireCondition(
    isRecord(bundle.screenshots),
    "qualification input must provide screenshot paths",
  );
  for (const label of ["initial", "ruin", "stall", "crash", "pause", "final"]) {
    requireText(bundle.screenshots[label], `screenshots.${label}`);
    const screenshotPath = resolve(root, bundle.screenshots[label]);
    requireCondition(
      existsSync(screenshotPath),
      `qualification screenshot is missing: ${screenshotPath}`,
    );
  }
  return { run, evidence: { runId: run.runId, ...documents } };
}

/** @param {string} root @param {string} referenceId @param {any} bundle */
export function ingestQualificationBundle(root, referenceId, bundle) {
  requireCondition(
    referenceId in REFERENCE_MATRIX,
    "unknown reference profile",
  );
  const validated = validateQualificationBundle(root, referenceId, bundle);
  const manifestPath = join(root, "evidence/environment-manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = readJsonFile(manifestPath, "environment manifest");
    requireCondition(
      !(validated.run.runId in (manifest.runs || {})),
      `duplicate runId rejected: ${validated.run.runId}`,
    );
  }
  const paths = writePerformanceEvidence(
    join(root, "evidence/performance"),
    validated.evidence,
  );
  const manifest = mergeEnvironmentManifest(manifestPath, validated.run);
  return { run: validated.run, manifest, paths };
}

/** @param {string} root @param {any} run @param {string[]} issues */
function inspectQualificationRun(root, run, issues) {
  try {
    validatePreflight(run);
  } catch (error) {
    issues.push(
      `${run.runId || "unknown run"} preflight failed: ${error instanceof Error ? error.message : "invalid record"}`,
    );
    return false;
  }
  let passed = true;
  for (const kind of ["summary", "frames", "network", "memory"]) {
    const path = join(
      root,
      "evidence/performance",
      `${run.runId}-${kind}.json`,
    );
    if (!existsSync(path)) {
      issues.push(`${run.runId} is missing ${kind} evidence`);
      passed = false;
      continue;
    }
    try {
      const document = readJsonFile(path, `${kind} evidence`);
      validateEvidenceDocument(kind, run.runId, document);
      if (kind === "summary" && document.result !== "pass") {
        issues.push(`${run.runId} summary result is not pass`);
        passed = false;
      }
    } catch (error) {
      issues.push(
        `${run.runId} ${kind} evidence failed: ${error instanceof Error ? error.message : "invalid document"}`,
      );
      passed = false;
    }
  }
  return passed;
}

/** @param {string} root */
export function generateQualificationReport(root = globalThis.process.cwd()) {
  /** @type {string[]} */
  const issues = [];
  /** @type {any[]} */
  const qualificationRows = [];
  const manifestPath = join(root, "evidence/environment-manifest.json");
  /** @type {any[]} */
  let runs = [];
  if (!existsSync(manifestPath)) {
    issues.push("evidence/environment-manifest.json is missing");
  } else {
    try {
      const manifest = readJsonFile(manifestPath, "environment manifest");
      requireCondition(
        manifest.schemaVersion === EVIDENCE_SCHEMA_VERSION,
        `environment manifest schemaVersion must be ${EVIDENCE_SCHEMA_VERSION}`,
      );
      requireCondition(
        isRecord(manifest.runs),
        "manifest runs must be an object",
      );
      runs = Object.values(manifest.runs);
    } catch (error) {
      issues.push(
        `environment manifest failed: ${error instanceof Error ? error.message : "invalid manifest"}`,
      );
    }
  }

  for (const combination of QUALIFICATION_COMBINATIONS) {
    for (const workload of WORKLOAD_IDS) {
      const run = runs.find(
        (candidate) =>
          candidate.referenceId === combination.referenceId &&
          candidate.browser === combination.browser &&
          candidate.workload === workload,
      );
      let result = "MISSING";
      if (!run) {
        issues.push(
          `${combination.referenceId} ${combination.browser} ${workload} qualification is missing`,
        );
      } else if (inspectQualificationRun(root, run, issues)) {
        result = "PASS";
      } else {
        result = "FAIL";
      }
      qualificationRows.push({ ...combination, workload, result });
    }
  }

  /** @type {any[]} */
  const reviewRows = [];
  for (const gate of REVIEW_GATES) {
    const path = join(root, gate.path);
    let result = "MISSING";
    if (!existsSync(path)) {
      issues.push(`${gate.path} is missing`);
    } else {
      const text = readFileSync(path, "utf8");
      if (
        /(?:release|gate|overall)\s+(?:status|result):\s*\*\*(?:BLOCKED|FAIL)|(?:status|result):\s*\*\*(?:BLOCKED|FAIL)\*\*/i.test(
          text,
        )
      ) {
        result = "FAIL";
        issues.push(`${gate.path} records a blocked or failed gate`);
      } else {
        result = "PRESENT";
      }
    }
    reviewRows.push({ ...gate, result });
  }

  const result = issues.length === 0 ? "pass" : "fail";
  const reportPath = join(root, "evidence/validation/final-report.md");
  const qualificationTable = qualificationRows
    .map(
      (row) =>
        `| ${row.referenceId} | ${row.browser} | ${row.workload} | ${row.result} |`,
    )
    .join("\n");
  const reviewTable = reviewRows
    .map((row) => `| ${row.label} | \`${row.path}\` | ${row.result} |`)
    .join("\n");
  const issueList = issues.length
    ? issues.map((issue) => `- ${issue}`).join("\n")
    : "- None.";
  const reportText = `# Wasteland Flight Simulator Final Validation Report

- Generated: ${new Date().toISOString()}
- Release status: **${result.toUpperCase()}**
- Policy: missing, malformed, dirty, non-reference, blocked, or over-budget evidence fails closed

## Physical qualification matrix

| Reference | Browser | Workload | Result |
| --- | --- | --- | --- |
${qualificationTable}

## Requirement, security, accessibility, visual, and automated gates

| Gate | Evidence | Result |
| --- | --- | --- |
${reviewTable}

## Missing or failed gates

${issueList}

## Conclusion

The release candidate ${result === "pass" ? "has complete passing evidence." : "is not qualified for release. Resolve every item above and regenerate this report."}
`;
  atomicWriteText(reportPath, reportText);
  return Object.freeze({
    result,
    issues: Object.freeze([...issues]),
    path: reportPath,
    qualificationRows: Object.freeze(qualificationRows),
    reviewRows: Object.freeze(reviewRows),
  });
}

/** @param {string | undefined} profileName */
function runPerformanceSuite(profileName) {
  const profile = resolvePerformanceProfile(profileName);
  const executable =
    globalThis.process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    executable,
    [
      "playwright",
      "test",
      "tests/e2e/performance.spec.js",
      "--project=desktop-chromium",
      "--project=desktop-webkit",
    ],
    {
      cwd: globalThis.process.cwd(),
      env: {
        ...globalThis.process.env,
        WFS_PERFORMANCE_PROFILE: profile.name,
      },
      stdio: "inherit",
    },
  );
  return typeof result.status === "number" ? result.status : 1;
}

/** @param {string[]} argumentsList */
function runCli(argumentsList) {
  const [command, value, explicitInput] = argumentsList;
  if (command === "run") return runPerformanceSuite(value);
  if (command === "preflight") {
    const inputPath =
      explicitInput || value || globalThis.process.env.WFS_QUALIFICATION_INPUT;
    requireText(inputPath, "qualification input path");
    if (!inputPath) throw new TypeError("qualification input path is required");
    const input = readJsonFile(resolve(inputPath), "qualification input");
    const run = validatePreflight(input.run || input);
    console.log(`preflight PASS: ${run.runId}`);
    return 0;
  }
  if (command === "qualify") {
    requireCondition(
      Boolean(value && value in REFERENCE_MATRIX),
      "qualify requires a referenceId",
    );
    if (!value) throw new TypeError("qualify requires a referenceId");
    const inputPath =
      explicitInput || globalThis.process.env.WFS_QUALIFICATION_INPUT;
    requireText(inputPath, "qualification input path");
    if (!inputPath) throw new TypeError("qualification input path is required");
    const bundle = readJsonFile(resolve(inputPath), "qualification input");
    const result = ingestQualificationBundle(
      globalThis.process.cwd(),
      value,
      bundle,
    );
    console.log(`qualification evidence accepted: ${result.run.runId}`);
    return 0;
  }
  if (command === "report") {
    const report = generateQualificationReport(globalThis.process.cwd());
    console.log(
      `qualification report: ${report.result.toUpperCase()} ${report.path}`,
    );
    return report.result === "pass" ? 0 : 1;
  }
  throw new TypeError(
    "usage: metrics.js run <smoke|full> | preflight <input.json> | qualify <referenceId> <input.json> | report",
  );
}

/** @param {import("@playwright/test").Page} page */
export function createNetworkCollector(page) {
  /** @type {Map<import("@playwright/test").Request, any>} */
  const requests = new Map();
  /** @param {import("@playwright/test").Request} request */
  const onRequest = (request) => {
    const redirectedFrom = request.redirectedFrom();
    requests.set(request, {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      startMs: performance.now(),
      status: 0,
      transferredBytes: 0,
      decodedBytes: 0,
      durationMs: 0,
      redirects: redirectedFrom ? [redirectedFrom.url()] : [],
      failure: null,
    });
  };
  /** @param {import("@playwright/test").Response} response */
  const onResponse = async (response) => {
    const request = response.request();
    const entry = requests.get(request);
    if (!entry) return;
    const headers = await response.allHeaders();
    const contentLength = Number(headers["content-length"] || 0);
    entry.status = response.status();
    entry.transferredBytes = Number.isFinite(contentLength) ? contentLength : 0;
    entry.decodedBytes = entry.transferredBytes;
    entry.durationMs = Math.max(0, performance.now() - entry.startMs);
  };
  /** @param {import("@playwright/test").Request} request */
  const onRequestFailed = (request) => {
    const entry = requests.get(request);
    if (!entry) return;
    entry.failure = request.failure()?.errorText || "request failed";
    entry.durationMs = Math.max(0, performance.now() - entry.startMs);
  };
  page.on("request", onRequest);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);
  return Object.freeze({
    snapshot() {
      return [...requests.values()]
        .map(({ startMs: _startMs, ...entry }) => structuredClone(entry))
        .sort((left, right) => left.url.localeCompare(right.url));
    },
    stop() {
      page.off("request", onRequest);
      page.off("response", onResponse);
      page.off("requestfailed", onRequestFailed);
    },
  });
}

/** @param {any} metrics */
export function collectQualityTransitions(metrics) {
  const transitions = metrics?.quality?.transitions;
  requireCondition(
    Array.isArray(transitions),
    "quality transition metrics are unavailable",
  );
  return transitions.map((/** @type {any} */ transition) =>
    structuredClone(transition),
  );
}

/** @param {any} budgetInput */
export function calculateBudgetResults(budgetInput) {
  const {
    frameSummary,
    coldFeedbackMs,
    coldControlMs,
    inputSamples,
    minuteTwoBytes,
    minuteTenBytes,
    restartTimesMs,
    externalRequestCount,
    unexpectedRequestCount,
    worldContinuity,
  } = budgetInput;
  const inputP95Ms = percentile(inputSamples || [], 0.95);
  const memoryRatio =
    Number.isFinite(minuteTwoBytes) &&
    minuteTwoBytes > 0 &&
    Number.isFinite(minuteTenBytes)
      ? minuteTenBytes / minuteTwoBytes
      : null;
  const budgets = {
    frameCadence:
      frameSummary !== null &&
      frameSummary.medianFps >= 60 &&
      frameSummary.within33msRatio >= 0.99,
    coldFeedback: Number.isFinite(coldFeedbackMs) && coldFeedbackMs <= 500,
    coldControl: Number.isFinite(coldControlMs) && coldControlMs <= 5_000,
    inputResponse: inputP95Ms !== null && inputP95Ms <= 100,
    memoryStability: memoryRatio !== null && memoryRatio <= 1.1,
    restart:
      Array.isArray(restartTimesMs) &&
      restartTimesMs.length === 20 &&
      restartTimesMs.every(
        (sample) => Number.isFinite(sample) && sample <= 2_000,
      ),
    network: externalRequestCount === 2 && unexpectedRequestCount === 0,
    worldContinuity: worldContinuity === true,
  };
  return {
    budgets,
    result: Object.values(budgets).every(Boolean) ? "pass" : "fail",
    inputP95Ms,
    memoryRatio,
  };
}

/** @param {import("@playwright/test").Page} page @param {number} sampleCount */
export async function collectFrameDurations(page, sampleCount = 120) {
  if (
    !Number.isInteger(sampleCount) ||
    sampleCount < 2 ||
    sampleCount > 36_000
  ) {
    throw new TypeError("sampleCount must be an integer from 2 through 36000");
  }
  return page.evaluate(
    (count) =>
      new Promise((resolve) => {
        const samples = new Float64Array(count);
        let index = 0;
        let previous = performance.now();
        /** @param {number} time */
        const sample = (time) => {
          samples[index] = time - previous;
          previous = time;
          index += 1;
          if (index === samples.length) resolve(Array.from(samples));
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
    sampleCount,
  );
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {() => (void | Promise<void>)} action
 */
export async function measureInputResponse(page, action) {
  const sampleCount = await page.evaluate(
    () => globalThis.__WFS_TEST__.metrics().inputResponseSamples.length,
  );
  await action();
  await page.waitForFunction(
    (previousCount) =>
      globalThis.__WFS_TEST__.metrics().inputResponseSamples.length >
      previousCount,
    sampleCount,
  );
  return page.evaluate(() => {
    const samples = globalThis.__WFS_TEST__.metrics().inputResponseSamples;
    return samples.at(-1);
  });
}

/** @param {import("@playwright/test").Page} page */
export async function sampleRuntimeMetrics(page) {
  return page.evaluate(() => {
    const facade = globalThis.__WFS_TEST__.metrics();
    const memory = performance.memory
      ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        }
      : null;
    return { ...facade, memory };
  });
}

/** @param {number[]} samples @param {number} quantile */
export function percentile(samples, quantile) {
  if (!Array.isArray(samples) || samples.length === 0) return null;
  if (!Number.isFinite(quantile) || quantile < 0 || quantile > 1) {
    throw new TypeError("quantile must be in [0, 1]");
  }
  const ordered = samples.slice().sort((left, right) => left - right);
  return ordered[
    Math.min(ordered.length - 1, Math.ceil(ordered.length * quantile) - 1)
  ];
}

/** @param {number[]} samples */
export function summarizeFrames(samples) {
  const p50 = percentile(samples, 0.5);
  const p99 = percentile(samples, 0.99);
  return {
    count: samples.length,
    medianFps: p50 ? 1_000 / p50 : 0,
    p99FrameMs: p99,
    within33msRatio:
      samples.filter((sample) => sample <= 33.3).length / samples.length,
  };
}

if (
  globalThis.process?.argv?.[1] &&
  import.meta.url.endsWith(globalThis.process.argv[1])
) {
  try {
    globalThis.process.exitCode = runCli(globalThis.process.argv.slice(2));
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "performance command failed",
    );
    globalThis.process.exitCode = 1;
  }
}
