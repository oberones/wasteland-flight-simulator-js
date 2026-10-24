# Production container validation — 2026-10-24

Provenance: reviewed execution record by Codex against working-tree changes based
on commit `267781db1a3c8eb45b7c5e35f717386c31d56c42`. The application document is unchanged.

- Runtime SHA-384: `f9c45646549660dca90cdb3638a2c6055a392a9331e80817350cb7926e000329fdb09599ec45629c492377588d104db9`.
- Base: `nginx:1.30.6-alpine@sha256:47928bf67eb62a1863cb08d9ecb52d3e704304ba614eaee17884204677702951`; multi-platform digest resolved with `docker buildx imagetools inspect`.
- Built image index: `sha256:907c8f2e2fdf35cdf8ff4537e2a9a26c876ac3eb0b53f17e833513ee93f83ccd`.
- Environment: macOS arm64 host, Rancher Desktop Linux arm64 engine 29.1.3, Docker CLI 29.5.3-rd, Node v24.21.0, npm 12.2.0, Playwright 1.64.1 bundled Chromium/WebKit.
- Tooling deviation: installed Node/npm are older than the declared 24.22.1/12.2.1 baseline. This record is functional container validation, not baseline environment or physical-device qualification.

## Container and HTTP checks

`docker compose -p wfs-production-check config --quiet` and `build --pull` passed.
The isolated stack used `WFS_NETWORK=wfs-production-check WFS_PORT=18088` and
`docker compose -p wfs-production-check up -d --wait`; health reached healthy.

Inspection confirmed UID/GID 101, read-only root filesystem, all capabilities
dropped, zero process capability masks, `NoNewPrivs: 1`, 64-process limit,
16 MiB tmpfs configuration with noexec/nosuid/nodev, rotated logs, and
127.0.0.1-only host binding. `nginx -t` passed. A write attempt to the application
directory failed with “Read-only file system”. `/srv` contained only the release
HTML, and no Node executable was present.

The automated container HTTP contract checks both document routes and byte
identity, GET/HEAD, gzip, CSP parity with the document plus frame denial,
security headers on 200/404, hidden/repository/unknown-path rejection, and
POST/PUT/DELETE/OPTIONS rejection. Both desktop projects passed these checks.

## Application and static checks

Asset embedding checks, formatting, lint, TypeScript, and forbidden-runtime-API
checks passed. `npm run validate:automated` initially stopped at sandboxed CDN
access; `npm run verify:runtime-deps` and `npm run audit:dependencies` then passed
with network permission. The audit reports zero npm vulnerabilities and the
existing reviewed development-only transitive deprecation. This is not an OS
package/container-image vulnerability scan.

Browser command:

```sh
WFS_TEST_BASE_URL=http://127.0.0.1:18088 npx playwright test --workers=2
```

The first run loaded the previous hardcoded-origin cold-load assertion before
it was corrected. Its two desktop failures were test-origin mismatches, not
application failures. A focused rerun of `tests/e2e/performance.spec.js` with
`--grep 'records cold-load' --workers=1` passed both Chromium and WebKit checks.
The full run completed in 3.6 minutes: 234 passed, two stale-origin failures,
and four existing viewport-specific skips. Together with the corrected two-test
rerun, all 236 applicable cases passed. The temporary container and test network
were removed afterward; the built image remains available locally.

## Acceptance boundaries

No public proxy, TLS configuration, registry publication, or remote deployment
was changed. Public HTTPS/subpath verification, container OS vulnerability
review, and existing physical-device/performance release gates remain separate
acceptance steps. Local browser emulation does not satisfy those gates.
