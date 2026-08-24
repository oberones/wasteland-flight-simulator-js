# Foundation Validation

- Date: 2026-08-22
- Git revision at run: `efc43e2a903a490fa415575bc900baddcdb86d71`
- Worktree: dirty implementation worktree; this is development evidence, not release qualification
- Node.js: `v20.20.2`
- npm: `10.8.2`
- Playwright: `1.62.1`
- Chromium: Chrome for Testing `151.0.7922.34`, Playwright build `1234`
- WebKit: `26.5`, Playwright build `2336`

## Runtime dependency verification

Command: `npm run verify:runtime-deps` with live CDN access.

- Three.js `0.185.1` `three.cjs`: 2,093,053 bytes; SHA-384
  `718702a2c4b998a696c1cd9f891c7852c0d726bfe10a400f4175f4e2012e12e7b2140ce46e4aa4c8ff39bd1f67c8a178`;
  reviewed CommonJS adapter and required exports passed.
- simplex-noise `4.0.3`: 18,735 bytes; SHA-384
  `5666e8c9abefc5348abc53555ae66de04d4a6364d29cbd6966cc6df76a0579bf1de23a85682b9e49f120471447f235a2`;
  `createNoise2D` export passed.

## Browser suites

Command:

```text
npx playwright test tests/integration/dependency-loader.spec.js tests/unit/lifecycle.spec.js --project=desktop-chromium --project=desktop-webkit
```

Result: **PASS — 28 tests passed in 13.8 seconds; zero failures or skips.**

Covered success, exact two-request manifest, CSP/data favicon, HTTP failure, redirect-selected
URL, timeout, truncation, oversize, mutation, parse failure, missing export, controlled copy,
explicit retry cleanup, lifecycle priority, reason-specific pause, deliberate resume, crash,
restart, neutral input, idempotence, and retry state.

A focused follow-up ran the successful-load assertion in both engines after adding explicit
page-console and page-error collection: **PASS — 2 tests passed in 2.5 seconds**. Each page
made exactly the two approved CDN requests, created one canvas, exposed a frozen webdriver
facade, and produced zero browser console errors or uncaught page errors.

The development `http-server` process emitted Node's `DEP0066` deprecation warning for its
internal `_headers` usage. This did not come from the runtime page and is retained here rather
than being represented as clean server output.

## Static checks at checkpoint

- `npm run lint`: PASS, zero warnings.
- Prettier check over runtime, configuration, tests, and evidence: PASS.
- TypeScript `checkJs`: not part of this foundation result; the first strict run found missing
  JSDoc/types in the new development helpers. That remains open for the release static-check
  task and is not reported as passing here.
