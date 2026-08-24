# Dependency Review

- Generated: 2026-08-23T02:14:02.367Z
- Result: **PASS WITH REVIEWED TRANSITIVE DEPRECATION**
- Lockfile SHA-256: `c0393b0c8e61f9f625dbed24fc2e7a6b9cf5a3155df99ac87dbbcad8a03677ba`
- Runtime dependencies: 2
- Development lockfile packages: 143 (6 direct)
- npm audit vulnerabilities: 0
- Direct packages behind compatible wanted versions: 0
- Unknown licenses: 0
- Non-development lockfile packages: 0

## Runtime verification

`npm run verify:runtime-deps` fetched the exact Three.js 0.185.1 and simplex-noise
4.0.3 URLs, matched 2,093,053 and 18,735 bytes respectively, matched both SHA-384
digests, adapted/imported the reviewed module formats, and shape-checked every required
export. The full upstream MIT notices are retained in `evidence/licenses/`.

## Complete development graph

Every installed path in `package-lock.json` has a record in
`evidence/dependency-manifest.json` containing version, direct/transitive purpose,
parents, license and source, exact registry artifact and integrity, engine/repository
maintenance metadata, deprecation state, current-version state for direct packages, and
the npm-audit result. The graph contains only `dev: true` packages.

License totals: (WTFPL OR MIT) 1, Apache-2.0 36, BlueOak-1.0.0 1, BSD-2-Clause 6, BSD-3-Clause 2, ISC 4, MIT 93.

`@types/node` intentionally tracks the Node 20 engine declared by the project. Its
installed version matches npm's compatible wanted version; the registry's newer major
targets a different Node release and is retained in the manifest as reviewed metadata.

## Reviewed maintenance exception

| Package         | Version | Required by           | Registry deprecation                                                           |
| --------------- | ------- | --------------------- | ------------------------------------------------------------------------------ |
| whatwg-encoding | 2.0.0   | html-encoding-sniffer | Use @exodus/bytes instead for a more spec-conformant and faster implementation |

`whatwg-encoding` is an indirect local-test-server dependency through
`http-server -> html-encoding-sniffer`; it is never shipped or imported by
`index.html`. The exact direct `http-server` release is current, npm audit reports
zero vulnerabilities, and replacing this transitive package locally would diverge from
the reviewed upstream lock graph. Keep the exception visible and re-evaluate it whenever
the local server dependency changes.
