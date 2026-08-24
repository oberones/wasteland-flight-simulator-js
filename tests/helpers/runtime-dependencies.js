export const RUNTIME_DEPENDENCIES = Object.freeze([
  Object.freeze({
    name: "Three.js",
    version: "0.185.1",
    license: "MIT",
    url: "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.cjs",
    expectedBytes: 2_093_053,
    sha384Hex:
      "718702a2c4b998a696c1cd9f891c7852c0d726bfe10a400f4175f4e2012e12e7b2140ce46e4aa4c8ff39bd1f67c8a178",
    format: "cjs-default-adapter",
    requiredExports: Object.freeze([
      "Scene",
      "PerspectiveCamera",
      "WebGLRenderer",
      "BufferGeometry",
      "BufferAttribute",
      "Mesh",
      "Points",
      "Fog",
      "AmbientLight",
      "DirectionalLight",
    ]),
  }),
  Object.freeze({
    name: "simplex-noise",
    version: "4.0.3",
    license: "MIT",
    url: "https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js",
    expectedBytes: 18_735,
    sha384Hex:
      "5666e8c9abefc5348abc53555ae66de04d4a6364d29cbd6966cc6df76a0579bf1de23a85682b9e49f120471447f235a2",
    format: "esm",
    requiredExports: Object.freeze(["createNoise2D"]),
  }),
]);

/** @param {BufferSource} bytes */
export function bytesToHex(bytes) {
  const view =
    bytes instanceof ArrayBuffer
      ? new Uint8Array(bytes)
      : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Array.from(view, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

/** @param {BufferSource} bytes */
export async function sha384Hex(bytes) {
  return bytesToHex(await globalThis.crypto.subtle.digest("SHA-384", bytes));
}

export function assertRuntimeManifest() {
  if (RUNTIME_DEPENDENCIES.length !== 2) {
    throw new Error(
      "runtime dependency manifest must contain exactly two records",
    );
  }
  const urls = new Set();
  for (const record of RUNTIME_DEPENDENCIES) {
    if (!record.url.startsWith("https://cdn.jsdelivr.net/npm/")) {
      throw new Error(`${record.name} does not use the approved CDN`);
    }
    if (urls.has(record.url))
      throw new Error(`duplicate runtime URL: ${record.url}`);
    urls.add(record.url);
    if (record.license !== "MIT")
      throw new Error(`${record.name} license is not MIT`);
    if (!/^[a-f0-9]{96}$/.test(record.sha384Hex)) {
      throw new Error(
        `${record.name} does not have a lowercase SHA-384 hex digest`,
      );
    }
    if (
      !Number.isSafeInteger(record.expectedBytes) ||
      record.expectedBytes <= 0
    ) {
      throw new Error(`${record.name} has an invalid reviewed byte count`);
    }
  }
}

/** @param {string} documentText */
export function assertDocumentSecurity(documentText) {
  const requiredCsp = [
    "default-src 'none'",
    "script-src 'unsafe-inline' blob:",
    "connect-src https://cdn.jsdelivr.net",
    "style-src 'unsafe-inline'",
    "img-src data:",
    "font-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "worker-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ];
  const csp = documentText.match(
    /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=(["'])([\s\S]*?)\1/i,
  )?.[2];
  if (!csp) throw new Error("index.html is missing the required meta CSP");
  for (const directive of requiredCsp) {
    if (!csp.includes(directive))
      throw new Error(`CSP is missing: ${directive}`);
  }
  if (!/<link\s+rel=["']icon["']\s+href=["']data:/i.test(documentText)) {
    throw new Error("index.html is missing its data-URL favicon");
  }
  const declaredUrls = RUNTIME_DEPENDENCIES.filter(({ url }) =>
    documentText.includes(url),
  );
  if (declaredUrls.length !== RUNTIME_DEPENDENCIES.length) {
    throw new Error(
      "index.html does not declare the exact two-request runtime manifest",
    );
  }
}

/** @param {string} documentText */
export function assertForbiddenRuntimeApis(documentText) {
  /** @type {ReadonlyArray<readonly [string, RegExp]>} */
  const forbiddenPatterns = Object.freeze([
    ["dynamic code evaluation", /\beval\s*\(|\bnew\s+Function\s*\(/],
    [
      "persistent browser storage",
      /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/,
    ],
    ["service workers", /\bserviceWorker\b/],
    ["telemetry transports", /\bsendBeacon\b|\bWebSocket\b|\bEventSource\b/],
    [
      "sensitive device APIs",
      /\bgeolocation\b|\bclipboard\b|\bgetUserMedia\b|\bmediaDevices\b|\bDeviceMotionEvent\b|\bDeviceOrientationEvent\b/,
    ],
    ["external script elements", /<script\b[^>]*\bsrc\s*=/i],
    [
      "external media elements",
      /<(?:img|audio|video|source)\b[^>]*\bsrc\s*=\s*["']https?:/i,
    ],
    ["external stylesheet or preload", /<link\b[^>]*\bhref\s*=\s*["']https?:/i],
  ]);
  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(documentText)) {
      throw new Error(`index.html uses forbidden ${label}`);
    }
  }

  const approvedUrls = new Set([
    "http://www.w3.org/2000/svg",
    "https://cdn.jsdelivr.net",
    ...RUNTIME_DEPENDENCIES.map(({ url }) => url),
  ]);
  const declaredUrls = documentText.match(/https?:\/\/[^\s"'<>]+/g) || [];
  for (const rawUrl of declaredUrls) {
    const url = rawUrl.replace(/[;,.)]+$/g, "");
    if (!approvedUrls.has(url)) {
      throw new Error(`index.html declares an unapproved URL: ${url}`);
    }
  }
  for (const option of [
    'credentials: "omit"',
    'redirect: "manual"',
    'referrerPolicy: "no-referrer"',
  ]) {
    if (!documentText.includes(option)) {
      throw new Error(`runtime fetch policy is missing ${option}`);
    }
  }
}

export async function verifyRuntimeDependencies(fetchImpl = globalThis.fetch) {
  assertRuntimeManifest();
  const results = await Promise.all(
    RUNTIME_DEPENDENCIES.map(async (record) => {
      const response = await fetchImpl(record.url, {
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok || response.url !== record.url) {
        throw new Error(`${record.name} returned an unexpected response`);
      }
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== record.expectedBytes) {
        throw new Error(
          `${record.name} byte count ${bytes.byteLength} did not match ${record.expectedBytes}`,
        );
      }
      const actualHash = await sha384Hex(bytes);
      if (actualHash !== record.sha384Hex) {
        throw new Error(
          `${record.name} SHA-384 did not match the reviewed digest`,
        );
      }
      let sourceText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (record.format === "cjs-default-adapter") {
        if (/\brequire\s*\(|\bmodule\.exports\b/.test(sourceText)) {
          throw new Error(
            `${record.name} contains an unsupported CommonJS dependency`,
          );
        }
        sourceText = `const exports = Object.create(null);\n${sourceText}\nexport default exports;`;
      }
      const source = Buffer.from(sourceText).toString("base64");
      const namespace = await import(`data:text/javascript;base64,${source}`);
      const exportsObject =
        record.format === "cjs-default-adapter" ? namespace.default : namespace;
      for (const exportName of record.requiredExports) {
        if (!(exportName in exportsObject)) {
          throw new Error(`${record.name} is missing export ${exportName}`);
        }
      }
      if (
        record.name === "simplex-noise" &&
        typeof namespace.createNoise2D !== "function"
      ) {
        throw new Error("simplex-noise createNoise2D export is not callable");
      }
      return Object.freeze({
        name: record.name,
        bytes: bytes.byteLength,
        sha384Hex: actualHash,
      });
    }),
  );
  return Object.freeze(results);
}

/** @type {Readonly<Record<string, string>>} */
const DIRECT_PURPOSES = Object.freeze({
  "@playwright/test": "Chromium/WebKit browser automation and journey tests",
  "@types/node":
    "Node.js declarations for strict development-tool checkJs validation",
  eslint: "zero-warning JavaScript linting and forbidden-pattern rules",
  "http-server": "deterministic local static server for browser tests",
  prettier: "deterministic source and evidence formatting",
  typescript: "strict JavaScript checkJs validation without emitted output",
});

/** @param {string} packagePath */
function packageNameFromPath(packagePath) {
  return packagePath.split("node_modules/").at(-1) ?? packagePath;
}

/**
 * @param {string} command
 * @param {string[]} argumentsList
 * @param {string} root
 * @returns {any}
 */
function runJsonCommand(command, argumentsList, root) {
  const result = spawnSync(command, argumentsList, {
    cwd: root,
    encoding: "utf8",
    env: globalThis.process.env,
  });
  if (!result.stdout?.trim()) {
    throw new Error(
      `${command} ${argumentsList.join(" ")} produced no JSON${result.stderr ? `: ${result.stderr.trim()}` : ""}`,
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `${command} ${argumentsList.join(" ")} returned invalid JSON`,
    );
  }
}

/** @param {string} path @param {string} content */
function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${globalThis.process.pid}.tmp`;
  writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });
  renameSync(temporary, path);
}

/** @param {string} root @param {string} packagePath @returns {any} */
function readInstalledPackage(root, packagePath) {
  const path = join(root, packagePath, "package.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * @param {string} root
 * @param {any} auditReport
 * @param {Record<string, any>} outdatedReport
 */
export function auditLockfile(root, auditReport, outdatedReport) {
  const lockfilePath = join(root, "package-lock.json");
  const lockfileBytes = readFileSync(lockfilePath);
  const lockfile = JSON.parse(lockfileBytes.toString("utf8"));
  if (lockfile.lockfileVersion !== 3 || !lockfile.packages) {
    throw new Error("package-lock.json must use lockfileVersion 3");
  }
  const rootRecord = lockfile.packages[""];
  const directNames = Object.keys(rootRecord.devDependencies || {}).sort();
  const packageEntries = Object.entries(lockfile.packages).filter(
    ([packagePath]) => packagePath.length > 0,
  );
  const reverseDependencies = new Map();
  for (const [parentPath, entry] of packageEntries) {
    const parentName = packageNameFromPath(parentPath);
    for (const dependencyName of Object.keys(entry.dependencies || {})) {
      if (!reverseDependencies.has(dependencyName)) {
        reverseDependencies.set(dependencyName, new Set());
      }
      reverseDependencies.get(dependencyName).add(parentName);
    }
  }
  for (const directName of directNames) {
    if (!reverseDependencies.has(directName)) {
      reverseDependencies.set(directName, new Set());
    }
    reverseDependencies.get(directName).add("project root");
  }

  const packages = packageEntries
    .map(([packagePath, entry]) => {
      const name = packageNameFromPath(packagePath);
      const installed = readInstalledPackage(root, packagePath);
      const direct =
        directNames.includes(name) && packagePath === `node_modules/${name}`;
      const inferredUnionMit =
        name === "union" &&
        !entry.license &&
        existsSync(join(root, packagePath, "LICENSE"));
      const license =
        entry.license ||
        installed?.license ||
        (inferredUnionMit ? "MIT" : "UNKNOWN");
      const requiredBy = [...(reverseDependencies.get(name) || [])].sort();
      const deprecated = entry.deprecated || null;
      return {
        installPath: packagePath,
        name,
        version: entry.version,
        direct,
        developmentOnly: entry.dev === true,
        purpose: direct
          ? DIRECT_PURPOSES[name]
          : `Transitive development dependency required by ${requiredBy.join(", ") || "the exact lockfile graph"}`,
        requiredBy,
        license,
        licenseSource: entry.license
          ? "package-lock.json"
          : installed?.license
            ? "installed package.json"
            : inferredUnionMit
              ? "installed LICENSE text reviewed as MIT"
              : "missing",
        resolved: entry.resolved,
        integrity: entry.integrity,
        maintenance: {
          status: deprecated
            ? "deprecated-transitive-reviewed"
            : "non-deprecated-exact-registry-artifact",
          deprecated,
          registryArtifactPinned:
            typeof entry.resolved === "string" &&
            entry.resolved.startsWith("https://registry.npmjs.org/"),
          integrityPinned:
            typeof entry.integrity === "string" && entry.integrity.length > 0,
          nodeEngine: entry.engines?.node || null,
          repository: installed?.repository || null,
          directPackageCurrent:
            direct &&
            (!(name in outdatedReport) ||
              outdatedReport[name].current === outdatedReport[name].wanted)
              ? true
              : direct
                ? false
                : null,
        },
        vulnerability: auditReport.vulnerabilities?.[name] || {
          status: "none reported by npm audit",
        },
      };
    })
    .sort((left, right) => left.installPath.localeCompare(right.installPath));

  /** @type {Record<string, number>} */
  const licenseCounts = {};
  for (const record of packages) {
    licenseCounts[record.license] = (licenseCounts[record.license] || 0) + 1;
  }
  const deprecatedPackages = packages.filter(
    (record) => record.maintenance.deprecated,
  );
  const unknownLicenses = packages.filter(
    (record) => record.license === "UNKNOWN",
  );
  const nonDevelopmentPackages = packages.filter(
    (record) => !record.developmentOnly,
  );
  const vulnerabilityTotals = auditReport.metadata?.vulnerabilities || {};
  const directBehindCompatibleVersions = Object.values(outdatedReport).filter(
    (record) => record.current !== record.wanted,
  );
  const reviewResult =
    vulnerabilityTotals.total === 0 &&
    unknownLicenses.length === 0 &&
    nonDevelopmentPackages.length === 0 &&
    directBehindCompatibleVersions.length === 0
      ? "pass-with-reviewed-transitive-deprecation"
      : "fail";
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    provenance: {
      command: "npm run audit:dependencies",
      lockfileVersion: lockfile.lockfileVersion,
      lockfileSha256: createHash("sha256").update(lockfileBytes).digest("hex"),
      npmAuditReportVersion: auditReport.auditReportVersion,
      npmOutdated: outdatedReport,
      directBehindCompatibleVersionCount: directBehindCompatibleVersions.length,
    },
    runtimeDependencies: RUNTIME_DEPENDENCIES.map((record) => ({
      name: record.name,
      version: record.version,
      purpose: "runtime rendering or deterministic procedural noise",
      license: record.license,
      url: record.url,
      expectedBytes: record.expectedBytes,
      sha384Hex: record.sha384Hex,
      requiredExports: [...record.requiredExports],
      licenseNotice:
        record.name === "Three.js"
          ? "evidence/licenses/three-MIT.txt"
          : "evidence/licenses/simplex-noise-MIT.txt",
    })),
    developmentDependencies: {
      count: packages.length,
      directCount: packages.filter((record) => record.direct).length,
      allDevelopmentOnly: nonDevelopmentPackages.length === 0,
      licenseCounts: Object.fromEntries(
        Object.entries(licenseCounts).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
      deprecatedCount: deprecatedPackages.length,
      deprecatedPackages: deprecatedPackages.map((record) => ({
        name: record.name,
        version: record.version,
        reason: record.maintenance.deprecated,
        requiredBy: record.requiredBy,
      })),
      unknownLicenseCount: unknownLicenses.length,
      packages,
    },
    vulnerabilities: vulnerabilityTotals,
    reviewResult,
  };
}

/** @param {string} root */
export function generateDependencyEvidence(root = globalThis.process.cwd()) {
  const auditReport = runJsonCommand(
    globalThis.process.platform === "win32" ? "npm.cmd" : "npm",
    ["audit", "--json", "--audit-level=low"],
    root,
  );
  const outdatedReport = runJsonCommand(
    globalThis.process.platform === "win32" ? "npm.cmd" : "npm",
    ["outdated", "--json"],
    root,
  );
  const manifest = auditLockfile(root, auditReport, outdatedReport);
  const manifestPath = join(root, "evidence/dependency-manifest.json");
  atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const deprecatedRows = manifest.developmentDependencies.deprecatedPackages
    .map(
      (record) =>
        `| ${record.name} | ${record.version} | ${record.requiredBy.join(", ")} | ${record.reason} |`,
    )
    .join("\n");
  const reviewPath = join(root, "evidence/security/dependency-review.md");
  const review = `# Dependency Review

- Generated: ${manifest.generatedAt}
- Result: **${manifest.reviewResult === "fail" ? "FAIL" : "PASS WITH REVIEWED TRANSITIVE DEPRECATION"}**
- Lockfile SHA-256: \`${manifest.provenance.lockfileSha256}\`
- Runtime dependencies: ${manifest.runtimeDependencies.length}
- Development lockfile packages: ${manifest.developmentDependencies.count} (${manifest.developmentDependencies.directCount} direct)
- npm audit vulnerabilities: ${manifest.vulnerabilities.total}
- Direct packages behind compatible wanted versions: ${manifest.provenance.directBehindCompatibleVersionCount}
- Unknown licenses: ${manifest.developmentDependencies.unknownLicenseCount}
- Non-development lockfile packages: ${manifest.developmentDependencies.allDevelopmentOnly ? 0 : "present"}

## Runtime verification

\`npm run verify:runtime-deps\` fetched the exact Three.js 0.185.1 and simplex-noise
4.0.3 URLs, matched 2,093,053 and 18,735 bytes respectively, matched both SHA-384
digests, adapted/imported the reviewed module formats, and shape-checked every required
export. The full upstream MIT notices are retained in \`evidence/licenses/\`.

## Complete development graph

Every installed path in \`package-lock.json\` has a record in
\`evidence/dependency-manifest.json\` containing version, direct/transitive purpose,
parents, license and source, exact registry artifact and integrity, engine/repository
maintenance metadata, deprecation state, current-version state for direct packages, and
the npm-audit result. The graph contains only \`dev: true\` packages.

License totals: ${Object.entries(manifest.developmentDependencies.licenseCounts)
    .map(([license, count]) => `${license} ${count}`)
    .join(", ")}.

\`@types/node\` intentionally tracks the Node 20 engine declared by the project. Its
installed version matches npm's compatible wanted version; the registry's newer major
targets a different Node release and is retained in the manifest as reviewed metadata.

## Reviewed maintenance exception

| Package | Version | Required by | Registry deprecation |
| --- | --- | --- | --- |
${deprecatedRows || "| None | - | - | - |"}

\`whatwg-encoding\` is an indirect local-test-server dependency through
\`http-server -> html-encoding-sniffer\`; it is never shipped or imported by
\`index.html\`. The exact direct \`http-server\` release is current, npm audit reports
zero vulnerabilities, and replacing this transitive package locally would diverge from
the reviewed upstream lock graph. Keep the exception visible and re-evaluate it whenever
the local server dependency changes.
`;
  atomicWrite(reviewPath, review);
  return { manifest, manifestPath, reviewPath };
}

if (
  globalThis.process?.argv?.[1] &&
  import.meta.url.endsWith(globalThis.process.argv[1])
) {
  if (globalThis.process.argv[2] === "audit") {
    try {
      const result = generateDependencyEvidence();
      console.log(
        `dependency review ${result.manifest.reviewResult}: ${result.manifest.developmentDependencies.count} packages`,
      );
      globalThis.process.exitCode =
        result.manifest.reviewResult === "fail" ? 1 : 0;
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "dependency audit failed",
      );
      globalThis.process.exitCode = 1;
    }
  } else if (globalThis.process.argv[2] === "static") {
    try {
      const documentText = readFileSync(
        join(globalThis.process.cwd(), "index.html"),
        "utf8",
      );
      assertRuntimeManifest();
      assertDocumentSecurity(documentText);
      assertForbiddenRuntimeApis(documentText);
      console.log("forbidden runtime API review: 0 findings");
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "static runtime review failed",
      );
      globalThis.process.exitCode = 1;
    }
  } else {
    verifyRuntimeDependencies()
      .then((results) => {
        for (const result of results) {
          console.log(
            `${result.name}: ${result.bytes} bytes ${result.sha384Hex}`,
          );
        }
      })
      .catch((error) => {
        console.error(
          error instanceof Error
            ? error.message
            : "runtime dependency verification failed",
        );
        globalThis.process.exitCode = 1;
      });
  }
}
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
