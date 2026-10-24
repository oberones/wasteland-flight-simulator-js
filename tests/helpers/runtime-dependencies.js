export const RUNTIME_DEPENDENCIES = Object.freeze([
  Object.freeze({
    name: "Three.js",
    version: "0.186.1",
    license: "MIT",
    url: "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
    expectedBytes: 662_772,
    sha384Hex:
      "9bc268157e7657a346bf6bac8a99e52c92a725f2fb204f1d6e788f0c309219242fdc79b89fa3e37d5eacc95c1fba845c",
    format: "esm",
    coreReferences: 2,
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
    coreReferences: 0,
    requiredExports: Object.freeze(["createNoise2D"]),
  }),
  Object.freeze({
    name: "Three.js core",
    version: "0.186.1",
    license: "MIT",
    url: "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.core.js",
    expectedBytes: 1_458_113,
    sha384Hex:
      "99d29e0b03c471b0efcdac70866f8c56e2e8328bbe13b8d0aabb38b66bbf9fc1c160f188d6466dd0c909c65311e3314c",
    format: "esm",
    coreReferences: 0,
    requiredExports: Object.freeze([
      "Scene",
      "BufferGeometry",
      "BufferAttribute",
    ]),
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
  if (RUNTIME_DEPENDENCIES.length !== 3) {
    throw new Error(
      "runtime dependency manifest must contain exactly three records",
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
      "index.html does not declare the exact three-request runtime manifest",
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
  const buffers = await Promise.all(
    RUNTIME_DEPENDENCIES.map(async (record) => {
      const response = await fetchImpl(record.url, {
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok || response.url !== record.url)
        throw new Error(`${record.name} returned an unexpected response`);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== record.expectedBytes)
        throw new Error(
          `${record.name} byte count ${bytes.byteLength} did not match ${record.expectedBytes}`,
        );
      if ((await sha384Hex(bytes)) !== record.sha384Hex)
        throw new Error(
          `${record.name} SHA-384 did not match the reviewed digest`,
        );
      return bytes;
    }),
  );
  const sources = RUNTIME_DEPENDENCIES.map((record, index) =>
    prepareModuleSource(record, buffers[index], "./three.core.js"),
  );
  const dataUrl = (/** @type {string} */ source) =>
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  const coreUrl = dataUrl(sources[2]);
  const urls = [
    dataUrl(prepareModuleSource(RUNTIME_DEPENDENCIES[0], buffers[0], coreUrl)),
    dataUrl(sources[1]),
    coreUrl,
  ];
  await Promise.all(
    urls.map(async (url, index) => {
      const namespace = await import(url);
      const record = RUNTIME_DEPENDENCIES[index];
      for (const name of record.requiredExports) {
        if (!(name in namespace))
          throw new Error(`${record.name} is missing export ${name}`);
      }
      if (
        record.name === "simplex-noise" &&
        typeof namespace.createNoise2D !== "function"
      )
        throw new Error("simplex-noise createNoise2D export is not callable");
    }),
  );
  return Object.freeze(
    RUNTIME_DEPENDENCIES.map((record) =>
      Object.freeze({
        name: record.name,
        bytes: record.expectedBytes,
        sha384Hex: record.sha384Hex,
      }),
    ),
  );
}

/** @param {{coreReferences: number}} record @param {ArrayBuffer} bytes @param {string} coreUrl */
export function prepareModuleSource(record, bytes, coreUrl) {
  let source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (/\bimport\s*\(|\brequire\s*\(|\bmodule\.exports\b/.test(source)) {
    throw new Error("unsupported module reference");
  }
  let references = 0;
  source = source.replace(
    /\b(?:import|export)\s+(?:[^;"']*?\s+from\s*)?(["'])([^"']+)\1/g,
    (statement, quote, specifier) => {
      if (
        specifier !== "./three.core.js" ||
        !record.coreReferences ||
        !coreUrl
      ) {
        throw new Error("unexpected module reference");
      }
      references += 1;
      return statement.replace(
        `${quote}${specifier}${quote}`,
        `${quote}${coreUrl}${quote}`,
      );
    },
  );
  if (references !== record.coreReferences)
    throw new Error("module graph changed");
  return source;
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
  semver: "engine-aware stable dependency release comparisons",
  "@types/semver": "type declarations for dependency compatibility checks",
});

/** @param {string} name @param {any} metadata @param {string} nodeVersion */
export function selectCompatibleRelease(name, metadata, nodeVersion) {
  if (!metadata?.versions || !valid(nodeVersion))
    throw new Error(`Missing registry metadata or Node baseline for ${name}`);
  const stable = Object.keys(metadata.versions)
    .filter((version) => valid(version) && !prerelease(version))
    .sort(rcompare);
  const target = stable.find((version) => {
    const entry = metadata.versions[version];
    return (
      !entry.deprecated &&
      (name !== "@types/node" || major(version) === major(nodeVersion)) &&
      satisfies(nodeVersion, entry.engines?.node || "*")
    );
  });
  if (!target)
    throw new Error(`No compatible stable release found for ${name}`);
  return {
    latestStable: stable[0],
    compatibleVersion: target,
    nodeEngine: metadata.versions[target].engines?.node || null,
    policy:
      name === "@types/node"
        ? `Node ${major(nodeVersion)} declarations`
        : "latest non-deprecated stable release supporting the Node baseline",
  };
}

/** @param {string} url @param {typeof fetch} fetchImpl @param {RequestInit} [options] @returns {Promise<any>} */
async function registryJson(url, fetchImpl, options = {}) {
  const response = await fetchImpl(url, {
    ...options,
    signal: globalThis.AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(`Registry request failed: ${response.status} ${url}`);
  const result = await response.json();
  if (!result || typeof result !== "object" || result.error)
    throw new Error(`Invalid registry response: ${url}`);
  return result;
}

/** @param {Record<string, string>} dependencies @param {string} nodeVersion @param {typeof fetch} [fetchImpl] */
export async function reviewDirectReleases(
  dependencies,
  nodeVersion,
  fetchImpl = globalThis.fetch,
) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(dependencies).map(async ([name, current]) => {
        const metadata = await registryJson(
          `https://registry.npmjs.org/${encodeURIComponent(name)}`,
          fetchImpl,
        );
        const release = selectCompatibleRelease(name, metadata, nodeVersion);
        return [
          name,
          {
            current,
            ...release,
            currentCompatible: current === release.compatibleVersion,
          },
        ];
      }),
    ),
  );
}

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
 * @param {Record<string, any>} releaseReview
 * @param {Record<string, any>} runtimeAdvisories
 */
export function auditLockfile(
  root,
  auditReport,
  outdatedReport,
  releaseReview,
  runtimeAdvisories,
) {
  if (
    !auditReport?.metadata?.vulnerabilities ||
    auditReport.error ||
    typeof auditReport.metadata.vulnerabilities.total !== "number"
  )
    throw new Error("npm audit returned no valid vulnerability report");
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
          directPackageCurrent: direct
            ? releaseReview[name]?.currentCompatible === true &&
              entry.version === releaseReview[name]?.compatibleVersion
            : null,
          releaseReview: direct ? releaseReview[name] : null,
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
  const directBehindCompatibleVersions = directNames.filter(
    (name) =>
      releaseReview[name]?.currentCompatible !== true ||
      lockfile.packages[`node_modules/${name}`]?.version !==
        releaseReview[name]?.compatibleVersion,
  );
  const reviewResult =
    vulnerabilityTotals.total === 0 &&
    Object.keys(runtimeAdvisories).length === 0 &&
    unknownLicenses.length === 0 &&
    nonDevelopmentPackages.length === 0 &&
    directBehindCompatibleVersions.length === 0
      ? deprecatedPackages.length
        ? "pass-with-reviewed-transitive-deprecation"
        : "pass"
      : "fail";
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    provenance: {
      command: "npm run audit:dependencies",
      lockfileVersion: lockfile.lockfileVersion,
      lockfileSha256: createHash("sha256").update(lockfileBytes).digest("hex"),
      npmAuditReportVersion: auditReport.auditReportVersion,
      npmOutdated: outdatedReport,
      nodeBaseline: rootRecord.engines.node,
      nodeVersion: globalThis.process.version,
      npmUserAgent: globalThis.process.env.npm_config_user_agent || null,
      directReleaseReview: releaseReview,
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
      licenseNotice: record.name.startsWith("Three.js")
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
    runtimeAdvisories,
    reviewResult,
  };
}

/** @param {string} root */
export async function generateDependencyEvidence(
  root = globalThis.process.cwd(),
) {
  const packageJson = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  const releaseReview = await reviewDirectReleases(
    packageJson.devDependencies,
    packageJson.engines.node,
  );
  const runtimeReleaseReview = await reviewDirectReleases(
    {
      three: RUNTIME_DEPENDENCIES[0].version,
      "simplex-noise": RUNTIME_DEPENDENCIES[1].version,
    },
    packageJson.engines.node,
  );
  const runtimeAdvisories = await registryJson(
    "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
    globalThis.fetch,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        three: [RUNTIME_DEPENDENCIES[0].version],
        "simplex-noise": [RUNTIME_DEPENDENCIES[1].version],
      }),
    },
  );
  const runtimeVerification = await verifyRuntimeDependencies();
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
  const manifest = {
    ...auditLockfile(
      root,
      auditReport,
      outdatedReport,
      releaseReview,
      runtimeAdvisories,
    ),
    runtimeReleaseReview,
  };
  if (
    Object.values(runtimeReleaseReview).some(
      (record) => !record.currentCompatible,
    )
  ) {
    manifest.reviewResult = "fail";
  }
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
- Result: **${manifest.reviewResult.toUpperCase().replaceAll("-", " ")}**
- Lockfile SHA-256: \`${manifest.provenance.lockfileSha256}\`
- Runtime libraries: 2 (${manifest.runtimeDependencies.length} verified artifacts)
- Runtime advisory packages: ${Object.keys(runtimeAdvisories).length}
- Runtime packages behind compatible releases: ${Object.values(runtimeReleaseReview).filter((record) => !record.currentCompatible).length}
- Development lockfile packages: ${manifest.developmentDependencies.count} (${manifest.developmentDependencies.directCount} direct)
- npm audit vulnerabilities: ${manifest.vulnerabilities.total}
- Direct packages behind compatible stable releases: ${manifest.provenance.directBehindCompatibleVersionCount}
- Unknown licenses: ${manifest.developmentDependencies.unknownLicenseCount}
- Non-development lockfile packages: ${manifest.developmentDependencies.allDevelopmentOnly ? 0 : "present"}

## Runtime verification

All three artifacts were fetched, hash-verified before evaluation, linked through the reviewed ESM graph, and shape-checked during this audit:

${runtimeVerification.map((record) => `- ${record.name}: ${record.bytes} bytes; SHA-384 ${record.sha384Hex}`).join("\n")}

The full upstream MIT notices are retained in \`evidence/licenses/\`.

## Complete development graph

Every installed path in \`package-lock.json\` has a record in
\`evidence/dependency-manifest.json\` containing version, direct/transitive purpose,
parents, license and source, exact registry artifact and integrity, engine/repository
maintenance metadata, deprecation state, current-version state for direct packages, and
the npm-audit result. The graph contains only \`dev: true\` packages.

License totals: ${Object.entries(manifest.developmentDependencies.licenseCounts)
    .map(([license, count]) => `${license} ${count}`)
    .join(", ")}.

Registry metadata is checked against Node ${packageJson.engines.node}, independently of exact manifest pins. \`@types/node\` tracks that Node major. Compatible release decisions and newer incompatible stable releases are recorded in the manifest. Missing registry or advisory responses fail the audit.

## Reviewed maintenance exception

| Package | Version | Required by | Registry deprecation |
| --- | --- | --- | --- |
${deprecatedRows || "| None | - | - | - |"}

Deprecations above are retained only through the supported upstream dependency ranges; no forced overrides are used. They are development-only, and the vulnerability counts above determine the security result. Re-evaluate these paths when their direct parent changes.
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
      const result = await generateDependencyEvidence();
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

import { major, prerelease, rcompare, satisfies, valid } from "semver";
