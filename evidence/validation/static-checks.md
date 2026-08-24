# Static Validation

- Gate status: **PASS**
- Runtime: Node.js 20.20.2, npm 10.8.2
- Formatter: Prettier 3.9.6
- Linter: ESLint 10.9.0
- JavaScript checker: TypeScript 7.0.2
- Warnings accepted: 0

## Results

| Command                                 | Result | Evidence                                                                                     |
| --------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| `npm run format:check`                  | PASS   | Every configured source, test, configuration, and evidence file matched Prettier formatting. |
| `npm run lint`                          | PASS   | ESLint completed with `--max-warnings 0`; no errors or warnings.                             |
| `npm run typecheck`                     | PASS   | TypeScript completed with `allowJs`, `checkJs`, `strict`, and `noEmit`; no diagnostics.      |
| `npm run verify:forbidden-runtime-apis` | PASS   | Zero forbidden runtime API findings.                                                         |

## Forbidden runtime surface

The scanner checks root `index.html` for dynamic evaluation, persistent browser
storage, IndexedDB, service workers, telemetry transports, sensitive device APIs,
external script/media/style elements, and URLs outside the exact approved dependency
manifest. It also requires every dependency request to omit credentials, reject
redirect-selected content, and use a no-referrer policy.
