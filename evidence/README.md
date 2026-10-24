# Release Evidence

Evidence in this directory is development and review material. It is not part of the
single-file runtime distribution. Root `index.html` is the sole shipped artifact.

## Provenance classes

- `generated`: machine-produced raw samples, manifests, request logs, and summaries.
- `reviewed`: human findings that name the reviewer role, date, environment, method,
  source captures, result, and unresolved deviations.
- `derived`: deterministic summaries that identify their source files and command.

Every JSON evidence document uses an integer `schemaVersion`. Performance and environment
evidence use version `1`. The dependency manifest uses version `2`, adding registry-based
compatible release decisions, the Node baseline, three runtime artifact records, and
runtime advisory results. Writers must validate before an atomic rename, reject duplicate run identifiers,
and never overwrite a prior qualification entry.

## Fail-closed policy

A claim is failed—not assumed, skipped, or passed—when required evidence is missing,
malformed, collected on the wrong reference hardware, produced from a dirty or different
runtime artifact, exceeds a budget, contains an unexpected request or console error, or
lacks reviewer provenance. Browser emulation is functional evidence only and never
substitutes for the named physical-device performance runs.

Manual records must distinguish observations from automated assertions. Generated files
must identify the exact command, commit, runtime hash, tool/browser version, timestamp,
and inputs needed to reproduce them. Review edits are append-only or explicitly retain
the original attachment and change rationale.

The 2026-10-24 dependency migration changes the Three.js hashes and runtime request
budget. Earlier validation records remain historical evidence; they do not qualify the
updated runtime. See `validation/dependency-upgrade-2026-10-24.md` for fresh results.
