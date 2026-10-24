# Dependency Review

- Generated: 2026-10-24T17:32:03.781Z
- Result: **PASS WITH REVIEWED TRANSITIVE DEPRECATION**
- Lockfile SHA-256: `baac4120dd9aa57ade62d86e19caa35c2aea396e4d35f88145abf2b1161c790d`
- Runtime libraries: 2 (3 verified artifacts)
- Runtime advisory packages: 0
- Runtime packages behind compatible releases: 0
- Development lockfile packages: 152 (8 direct)
- npm audit vulnerabilities: 0
- Direct packages behind compatible stable releases: 0
- Unknown licenses: 0
- Non-development lockfile packages: 0

## Runtime verification

All three artifacts were fetched, hash-verified before evaluation, linked through the reviewed ESM graph, and shape-checked during this audit:

- Three.js: 662772 bytes; SHA-384 9bc268157e7657a346bf6bac8a99e52c92a725f2fb204f1d6e788f0c309219242fdc79b89fa3e37d5eacc95c1fba845c
- simplex-noise: 18735 bytes; SHA-384 5666e8c9abefc5348abc53555ae66de04d4a6364d29cbd6966cc6df76a0579bf1de23a85682b9e49f120471447f235a2
- Three.js core: 1458113 bytes; SHA-384 99d29e0b03c471b0efcdac70866f8c56e2e8328bbe13b8d0aabb38b66bbf9fc1c160f188d6466dd0c909c65311e3314c

The full upstream MIT notices are retained in `evidence/licenses/`.

## Complete development graph

Every installed path in `package-lock.json` has a record in
`evidence/dependency-manifest.json` containing version, direct/transitive purpose,
parents, license and source, exact registry artifact and integrity, engine/repository
maintenance metadata, deprecation state, current-version state for direct packages, and
the npm-audit result. The graph contains only `dev: true` packages.

License totals: (WTFPL OR MIT) 1, Apache-2.0 36, BlueOak-1.0.0 1, BSD-2-Clause 6, BSD-3-Clause 2, ISC 5, MIT 101.

Registry metadata is checked against Node 24.22.1, independently of exact manifest pins. `@types/node` tracks that Node major. Compatible release decisions and newer incompatible stable releases are recorded in the manifest. Missing registry or advisory responses fail the audit.

## Reviewed maintenance exception

| Package         | Version | Required by           | Registry deprecation                                                           |
| --------------- | ------- | --------------------- | ------------------------------------------------------------------------------ |
| whatwg-encoding | 2.0.0   | html-encoding-sniffer | Use @exodus/bytes instead for a more spec-conformant and faster implementation |

Deprecations above are retained only through the supported upstream dependency ranges; no forced overrides are used. They are development-only, and the vulnerability counts above determine the security result. Re-evaluate these paths when their direct parent changes.
