# Quickstart Validation

- Overall status: **BLOCKED**
- Automated/local sections: PASS
- External physical sections: not executed; required devices and input bundles are absent
- Revision: `efc43e2a903a490fa415575bc900baddcdb86d71`
- Runtime artifact state: dirty implementation worktree

## Completed steps

| Quickstart section                  | Result                                 | Evidence                                                                                                                                                                                                                                        |
| ----------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool installation                   | PASS                                   | `npm ci` installed 124 development packages; `npx playwright install chromium webkit` completed with the existing Chrome for Testing 151.0.7922.34 and WebKit 26.5 builds.                                                                      |
| Local startup                       | PASS                                   | Root document loaded at `http://127.0.0.1:4173/`; authored loading feedback preceded a ready flight view, one canvas, the HUD, contextual controls, and exactly two external dependency requests.                                               |
| Formatting/lint/checkJs/static APIs | PASS                                   | Formatting, zero-warning ESLint, strict TypeScript `checkJs`, and forbidden-runtime-API scanning all passed.                                                                                                                                    |
| Runtime dependencies                | PASS                                   | Exact Three.js and simplex-noise bytes, SHA-384 digests, module adaptation, and required exports passed after the clean install.                                                                                                                |
| Full automated matrix               | PASS                                   | Final aggregate `npm test`: 156 passed, four explicit cross-project applicability skips, zero failures, zero retries.                                                                                                                           |
| Focused unit                        | PASS                                   | 34 passed.                                                                                                                                                                                                                                      |
| Focused integration                 | PASS WITH EXPLICIT APPLICABILITY SKIPS | 72 passed; four desktop/mobile complement skips documented in the automated-test record.                                                                                                                                                        |
| Focused desktop/mobile journeys     | PASS                                   | 14 passed.                                                                                                                                                                                                                                      |
| Focused accessibility               | PASS                                   | 16 passed.                                                                                                                                                                                                                                      |
| Focused performance smoke           | PASS                                   | 20 passed.                                                                                                                                                                                                                                      |
| Focused network/security            | PASS                                   | 48 passed.                                                                                                                                                                                                                                      |
| Trained desktop manual review       | PASS                                   | Current live Chrome-compatible browser review plus story and cross-story captures covered flight, pointer/keyboard, Pause, loading/error/crash/restart, reduced motion, and responsive presentation.                                            |
| Emulated mobile review              | PASS AS FUNCTIONAL EVIDENCE            | Pixel 7/iPhone 13 Playwright profiles covered landscape touch, independent pointers, safe targets, portrait interruption, deliberate Resume, crash/restart, and reduced motion.                                                                 |
| Distribution                        | PASS                                   | Root `index.html` is the sole runtime artifact: 125,507 bytes, SHA-256 `07b4f9f69fa193ff88b5d6e1fda8518e14b8f93689b70e3b3083661d8818195d`. It contains no external element source/href; runtime requests are the two pinned fetch records only. |

## Required steps that remain open

- Physical Pixel 7 Chrome review on an approved HTTPS preview.
- Physical iPhone 13 Safari and Chrome review on an approved HTTPS preview.
- Physical browser chrome/safe-area, background/foreground, rotation, touch-cancel,
  stall/recovery, crash/restart, and reduced-motion journeys.
- Screen-reader software, macOS Safari Full Keyboard Access, and five first-time
  evaluators required by T062.
- Clean, exact Apple M1, Pixel 7, and iPhone 13 qualification bundles for every
  contracted workload/browser combination.

`npm run qualify:preflight`, `qualify:desktop`, `qualify:android`, and `qualify:ios`
were invoked without fabricated inputs. Each correctly exited nonzero and reported that
a qualification input path was required. Because the worktree is dirty, even a
hardware-matching sample would fail the current preflight. T072–T075 therefore remain
open, and the aggregate release check must remain fail-closed.
