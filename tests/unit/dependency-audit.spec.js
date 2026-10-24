import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  auditLockfile,
  prepareModuleSource,
  reviewDirectReleases,
  selectCompatibleRelease,
} from "../helpers/runtime-dependencies.js";

const metadata = {
  versions: {
    "1.0.0": {},
    "1.1.0": { engines: { node: ">=20" } },
    "2.0.0": { engines: { node: ">=26" } },
    "3.0.0-beta.1": {},
  },
};

test("exact pins cannot hide a newer compatible stable release", async () => {
  const review = await reviewDirectReleases(
    { example: "1.0.0" },
    "24.22.1",
    async () => new globalThis.Response(JSON.stringify(metadata)),
  );
  expect(review.example).toMatchObject({
    current: "1.0.0",
    compatibleVersion: "1.1.0",
    latestStable: "2.0.0",
    currentCompatible: false,
  });
});

test("Node declarations track the selected Node major", () => {
  const release = selectCompatibleRelease(
    "@types/node",
    { versions: { "24.19.1": {}, "24.19.2": {}, "26.6.5": {} } },
    "24.22.1",
  );
  expect(release.compatibleVersion).toBe("24.19.2");
  expect(release.latestStable).toBe("26.6.5");
});

test("a current manifest pin cannot hide an outdated locked artifact", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const releases = Object.fromEntries(
    Object.entries(manifest.devDependencies).map(([name, version]) => [
      name,
      { compatibleVersion: version, currentCompatible: true },
    ]),
  );
  releases.eslint.compatibleVersion = "999.0.0";
  const report = auditLockfile(
    process.cwd(),
    { metadata: { vulnerabilities: { total: 0 } } },
    {},
    releases,
    {},
  );
  expect(report.reviewResult).toBe("fail");
  expect(report.provenance.directBehindCompatibleVersionCount).toBe(1);
  expect(
    report.developmentDependencies.packages.find(
      (record) => record.name === "eslint",
    )?.maintenance.directPackageCurrent,
  ).toBe(false);
});

test("missing registry and advisory evidence cannot pass the audit", async () => {
  await expect(
    reviewDirectReleases(
      { example: "1.0.0" },
      "24.22.1",
      async () => new globalThis.Response("unavailable", { status: 503 }),
    ),
  ).rejects.toThrow("Registry request failed");
  await expect(
    reviewDirectReleases(
      { example: "1.0.0" },
      "24.22.1",
      async () => new globalThis.Response("{}"),
    ),
  ).rejects.toThrow("Missing registry metadata");
  expect(() =>
    auditLockfile(".", { error: "unavailable" }, {}, {}, {}),
  ).toThrow("no valid vulnerability report");
});

test("only the two reviewed core references can be linked", () => {
  const bytes = (/** @type {string} */ source) =>
    Uint8Array.from(Buffer.from(source)).buffer;
  const record = { coreReferences: 2 };
  const source =
    "import { Scene } from './three.core.js';\nexport { Scene } from './three.core.js';";
  const result = prepareModuleSource(
    record,
    bytes(source),
    "blob:verified-core",
  );
  expect(result.match(/blob:verified-core/g)).toHaveLength(2);
  expect(result).not.toContain("./three.core.js");
  expect(() =>
    prepareModuleSource(
      record,
      bytes("export const unrelated = 1;"),
      "blob:core",
    ),
  ).toThrow("module graph changed");
  expect(() =>
    prepareModuleSource(
      record,
      bytes(source.replaceAll("three.core.js", "unexpected.js")),
      "blob:core",
    ),
  ).toThrow("unexpected module reference");
});
