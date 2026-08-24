# Automated Test Matrix

- Gate status: **PASS**
- Final aggregate result: 156 passed, 4 explicitly non-applicable skips, 0 failed
- Configured retries: 0
- Browser builds: Chrome for Testing 151.0.7922.34; WebKit 26.5 (Playwright build 2336)

## Final commands

| Command                                                                                    | Result               | Coverage                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                                                 | PASS in 2.0 minutes  | 160 scheduled tests across desktop Chromium, desktop WebKit, mobile Chromium, and mobile WebKit; unit, integration, desktop/touch journeys, accessibility, network security, responsive layout, and performance smoke. |
| `npm run test:performance:smoke`                                                           | PASS in 18.5 seconds | 20/20 dedicated performance-contract and workload tests across desktop Chromium and WebKit.                                                                                                                            |
| `npx playwright test tests/integration/dependency-loader.spec.js --grep redirect-selected` | PASS                 | 4/4 focused redirect-security checks after repairing the typed test mock.                                                                                                                                              |

The four final skips are explicit project applicability guards: the desktop zoom test
does not run in the two mobile projects, and the touch-pointer ownership test does not
run in the two desktop projects. The complementary project variants ran and passed;
there were no silent, conditional-environment, or missing-browser skips.

## Attempt history

The first sandboxed invocation could not bind the local loopback server (`EPERM`) and
was rerun with permission to use `127.0.0.1:4173`. The first executable full matrix
then produced 148 passes, the same redirect-test-mock failure in four projects, and four
explicit applicability skips. The mock was corrected, all four focused variants passed,
and the entire matrix was repeated cleanly. Playwright itself performed no retries.

After the query/fragment/storage boundary test was added, the aggregate
`npm run validate` matrix repeated the expanded set: 156 passed, the same four explicit
applicability skips, and zero failures in 2.0 minutes.

The local server reports the known development-only `http-server` transitive Node
deprecation documented in the dependency review; it did not produce application console
errors or a test failure.
