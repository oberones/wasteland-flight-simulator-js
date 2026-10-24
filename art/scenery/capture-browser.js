/** Gallery and site review. Camera injection exists only in served inspection copies. */
import { chromium, webkit } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = new URL("./", import.meta.url),
  html = await readFile(new URL("../../index.html", root), "utf8");
const helper = `inspectScenery: (id, altitude = 0) => {
  const region=[...this.world.activeRegions.values()].find(r=>r.scenery.sites.some(s=>s.id===id));
  const site=region.scenery.sites.find(s=>s.id===id),items=region.scenery.instances.filter(i=>i.siteId===id);
  const lowX=Math.min(...items.map(i=>i.footprint.minX)),highX=Math.max(...items.map(i=>i.footprint.maxX));
  const lowZ=Math.min(...items.map(i=>i.footprint.minZ)),highZ=Math.max(...items.map(i=>i.footprint.maxZ));
  const x=(lowX+highX)/2-this.world.worldOrigin.x,z=(lowZ+highZ)/2-this.world.worldOrigin.z,y=Math.min(...items.map(i=>i.baseY));
  const span=Math.max(highX-lowX,highZ-lowZ,20),distance=span*1.45;
  this.manualStepping=true;this.gliderMesh.visible=false;
  this.camera.position.set(x+distance*.7,y+(altitude||distance*.7),z+distance);
  this.camera.up.set(0,1,0);this.camera.lookAt(x,y+3,z);
  this.sunLight.position.set(x-280,y+520,z+180);this.sunLight.target.position.set(x,y,z);
  if(!this.sunLight.target.parent)this.scene.add(this.sunLight.target);
  this.needsRender=true;
  return {site,items,camera:this.camera.position.toArray()};
},
mainPassComparison: () => {
  const shadow=this.renderer.shadowMap.enabled;this.renderer.shadowMap.enabled=false;
  const meshes=this.world.regionPool.flatMap(r=>Object.values(r.sceneryMeshes)),visible=meshes.map(m=>m.visible);
  this.renderer.render(this.scene,this.camera);const expanded={...this.renderer.info.render};
  meshes.forEach(m=>m.visible=false);this.renderer.render(this.scene,this.camera);const baseline={...this.renderer.info.render};
  meshes.forEach((m,i)=>m.visible=visible[i]);this.renderer.shadowMap.enabled=shadow;
  this.renderer.render(this.scene,this.camera);
  return {baseline,expanded,additionalCalls:expanded.calls-baseline.calls,activeRegions:this.world.activeRegions.size};
},
`;
const inspected = html.replace(
  "metrics: () => structuredClone(this.metrics()),",
  helper + "metrics: () => structuredClone(this.metrics()),",
);
assert.notEqual(inspected, html);
const server = createServer(async (req, res) => {
  if (req.url === "/") {
    res.setHeader("Content-Type", "text/html");
    res.end(html);
    return;
  }
  if (req.url === "/inspect") {
    res.setHeader("Content-Type", "text/html");
    res.end(inspected);
    return;
  }
  if (/^\/gallery\/(gallery\.html|[a-z_]+\.png)$/.test(req.url)) {
    res.setHeader(
      "Content-Type",
      req.url.endsWith(".png") ? "image/png" : "text/html",
    );
    res.end(
      await readFile(new URL("previews/" + req.url.split("/").at(-1), root)),
    );
    return;
  }
  res.statusCode = 404;
  res.end();
});
await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", resolve);
});
const url = `http://127.0.0.1:${server.address().port}`;
const results = [];
let fixtures, hashFixtures;
try {
  for (const [engine, type] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await type.launch();
    try {
      for (const [layout, width, height, touch] of [
        ["desktop", 1280, 720, false],
        ["mobile", 844, 390, true],
      ]) {
        const page = await browser.newPage({
          viewport: { width, height },
          deviceScaleFactor: 1,
          isMobile: touch,
          hasTouch: touch,
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(url + "/gallery/gallery.html");
        await page.screenshot({
          path: new URL(`previews/gallery-${engine}-${layout}.png`, root)
            .pathname,
          fullPage: true,
        });
        await page.goto(url + "/");
        await page.waitForFunction(() => Boolean(globalThis.__WFS_TEST__));
        await page.evaluate(() => globalThis.__WFS_TEST__.reset(0x1a2b3c4d));
        for (const seconds of [0, 20, 60]) {
          if (seconds)
            await page.evaluate(
              (n) =>
                globalThis.__WFS_TEST__.step(n * 60, {
                  pitch: 0,
                  roll: 0,
                  throttleDelta: 0,
                }),
              seconds === 20 ? 20 : 40,
            );
          await page.waitForTimeout(80);
          await page.screenshot({
            path: new URL(
              `validation/flight-${engine}-${layout}-${seconds}s.png`,
              root,
            ).pathname,
          });
        }
        await page.goto(url + "/inspect");
        await page.waitForFunction(() => Boolean(globalThis.__WFS_TEST__));
        await page.evaluate(() => globalThis.__WFS_TEST__.reset(0x1a2b3c4d));
        const hashes = await page.evaluate(() => {
          const rows = [];
          for (let z = -4; z <= 4; z++)
            for (let x = -4; x <= 4; x++)
              rows.push({
                x,
                z,
                hash: globalThis.__WFS_TEST__.region(x, z).scenery.hash,
              });
          return rows;
        });
        if (hashFixtures)
          assert.deepEqual(
            hashes,
            hashFixtures,
            "cross-browser scenery hashes differ",
          );
        else {
          hashFixtures = hashes;
          await writeFile(
            new URL("validation/scenery-hashes.json", root),
            JSON.stringify({ seed: 0x1a2b3c4d, regions: hashes }, null, 2) +
              "\n",
          );
        }
        if (!fixtures) {
          fixtures = await page.evaluate(() => {
            const found = {};
            for (let radius = 0; radius < 12; radius++)
              for (let z = -radius; z <= radius; z++)
                for (let x = -radius; x <= radius; x++) {
                  if (Math.max(Math.abs(x), Math.abs(z)) !== radius) continue;
                  const r = globalThis.__WFS_TEST__.region(x, z);
                  for (const site of r.scenery.sites) {
                    const count = site.instances.length;
                    if (
                      !found[site.template] ||
                      found[site.template].count < count
                    )
                      found[site.template] = { x, z, id: site.id, count };
                  }
                  if (
                    Object.keys(found).length === 6 &&
                    Object.values(found).every((f) => f.count >= 5)
                  )
                    return found;
                }
            return found;
          });
          assert.equal(Object.keys(fixtures).length, 6);
          await writeFile(
            new URL("validation/site-fixtures.json", root),
            JSON.stringify(fixtures, null, 2) + "\n",
          );
        }
        const sites = [];
        for (const [template, f] of Object.entries(fixtures)) {
          await page.evaluate(
            (f) => globalThis.__WFS_TEST__.region(f.x, f.z),
            f,
          );
          const inspection = await page.evaluate(
            (f) => globalThis.__WFS_TEST__.inspectScenery(f.id),
            f,
          );
          await page.waitForTimeout(80);
          await page.screenshot({
            path: new URL(
              `validation/${engine}-${layout}-${template}.png`,
              root,
            ).pathname,
          });
          const mainPass = await page.evaluate(() =>
            globalThis.__WFS_TEST__.mainPassComparison(),
          );
          assert(mainPass.additionalCalls <= 2 * mainPass.activeRegions);
          await page.evaluate(
            (f) => globalThis.__WFS_TEST__.inspectScenery(f.id, 160),
            f,
          );
          await page.waitForTimeout(80);
          await page.screenshot({
            path: new URL(
              `validation/${engine}-${layout}-${template}-160m.png`,
              root,
            ).pathname,
          });
          sites.push({ template, inspection, mainPass });
        }
        assert.deepEqual(errors, []);
        results.push({
          engine,
          version: browser.version(),
          layout,
          viewport: { width, height },
          emulated: touch,
          errors,
          sites,
        });
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}
await writeFile(
  new URL("validation/visual-review.json", root),
  JSON.stringify(
    {
      indexSha256: createHash("sha256").update(html).digest("hex"),
      inspectionNote:
        "Site cameras and main-pass comparison injected only into inspection copies. Flight views use release HTML; gallery shows saved Blender renders.",
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Captured 32-asset galleries, six sites near/160m, and normal flight in four browser/layout pairs",
);
