/** Exercise export rejection in disposable copies without changing delivered artifacts. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const cases = [
  [
    "invalid index",
    (g) => {
      g.models.office.body.indices[0] = -1;
    },
    /invalid index/,
  ],
  [
    "non-finite position",
    (g) => {
      g.models.office.body.positions[0] = null;
    },
    /non-finite position/,
  ],
  [
    "non-unit normal",
    (g) => {
      g.models.office.body.normals.splice(0, 3, 0, 0, 0);
    },
    /non-unit normal/,
  ],
  [
    "degenerate triangle",
    (g) => {
      g.models.office.body.indices[1] = g.models.office.body.indices[0];
    },
    /degenerate triangle/,
  ],
  [
    "window panel boundary",
    (g) => {
      g.models.office.windows.parts[1].firstIndex += 3;
    },
    /noncontiguous part range/,
  ],
  [
    "triangle budget",
    (g) => {
      const body = g.models.office.body;
      const firstIndex = body.indices.length;
      const extra = Array.from({ length: 100 }, () =>
        body.indices.slice(0, 3),
      ).flat();
      body.indices.push(...extra);
      body.parts.push({
        name: "budget overflow",
        firstIndex,
        indexCount: extra.length,
      });
    },
    /triangle budget exceeded/,
  ],
];
const temporary = await mkdtemp(join(tmpdir(), "wfs-building-guards-"));
const results = [];
try {
  await symlink(
    fileURLToPath(new URL("node_modules", root)),
    join(temporary, "node_modules"),
    "dir",
  );
  await writeFile(join(temporary, "package.json"), '{"type":"module"}\n');
  const target = join(temporary, "art/buildings");
  await cp(fileURLToPath(new URL("art/buildings", root)), target, {
    recursive: true,
    filter: (path) => !/\/(previews|validation)(\/|$)/.test(path),
  });
  const html = await readFile(new URL("index.html", root), "utf8");
  await writeFile(join(temporary, "index.html"), html);
  const original = await readFile(join(target, "geometry.json"), "utf8");
  for (const [name, mutate, pattern] of cases) {
    const geometry = JSON.parse(original);
    mutate(geometry);
    await writeFile(join(target, "geometry.json"), JSON.stringify(geometry));
    let output = "";
    try {
      execFileSync(
        process.execPath,
        [join(target, "embed-geometry.js"), "--check"],
        { stdio: "pipe" },
      );
    } catch (error) {
      output = error.stderr.toString();
    }
    assert.match(
      output,
      pattern,
      `${name} was not rejected for the intended reason`,
    );
    results.push({ name, status: "PASS", expectedRejection: pattern.source });
  }
  await writeFile(join(target, "geometry.json"), original);
  await writeFile(
    join(temporary, "index.html"),
    html.replace(
      "const BUILDING_GEOMETRY =",
      "const BUILDING_GEOMETRY_DRIFT =",
    ),
  );
  let drift = "";
  try {
    execFileSync(
      process.execPath,
      [join(target, "embed-geometry.js"), "--check"],
      { stdio: "pipe" },
    );
  } catch (error) {
    drift = error.stderr.toString();
  }
  assert.match(drift, /building embedding drift/);
  results.push({ name: "embedding drift", status: "PASS" });
  await writeFile(join(temporary, "index.html"), html);
  await writeFile(join(target, "buildings.blend"), "stale source");
  let stale = "";
  try {
    execFileSync(
      process.execPath,
      [join(target, "embed-geometry.js"), "--check"],
      { stdio: "pipe" },
    );
  } catch (error) {
    stale = error.stderr.toString();
  }
  assert.match(stale, /stale source manifest/);
  results.push({ name: "source drift", status: "PASS" });
} finally {
  await rm(temporary, { recursive: true, force: true });
}
await writeFile(
  new URL("validation/export-guards.json", import.meta.url),
  JSON.stringify({ schemaVersion: 1, results }, null, 2) + "\n",
);
console.log(`${results.length} malformed export/provenance cases rejected`);
