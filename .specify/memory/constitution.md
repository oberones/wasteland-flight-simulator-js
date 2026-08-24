<!--
Sync Impact Report
- Version change: unratified template -> 1.0.0
- Modified principles:
  - Template Principle 1 -> I. Maintainable Code Is a Product Requirement
  - Template Principle 2 -> II. Secure by Design
  - Template Principle 3 -> III. Testing Is a Release Gate
  - Template Principle 4 -> IV. Consistent and Accessible User Experience
  - Template Principle 5 -> V. Performance Is a Budget
- Added sections:
  - Engineering Standards
  - Development Workflow and Quality Gates
- Removed sections: None; all template sections were concretized.
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ✅ .specify/templates/constitution-template.md (reviewed; generic bootstrap remains valid)
  - N/A .specify/templates/commands/*.md (directory is not present)
- Runtime guidance reviewed:
  - ✅ AGENTS.md (no principle reference changes required)
  - N/A current plan.md, README, and docs guidance (not present)
- Follow-up TODOs: None.
-->
# Wasteland Flight Simulator Constitution

## Core Principles

### I. Maintainable Code Is a Product Requirement
Production code MUST be organized into cohesive units with explicit responsibilities and
minimal coupling. Names, interfaces, and error paths MUST make behavior understandable
without relying on hidden state. Each change MUST pass the repository's configured
formatter, linter, static analysis, and type checks. Public contracts and non-obvious
design decisions MUST be documented alongside the code they govern. Duplication,
additional dependencies, and architectural complexity MUST be removed or justified in
the implementation plan's Complexity Tracking section. These rules keep future changes
reviewable and reduce regressions caused by accidental complexity.

### II. Secure by Design
Every input that crosses a trust boundary MUST be validated before use, and output MUST
be encoded for its destination. Authorization MUST be enforced at the protected action,
not only in the user interface. Secrets MUST NOT appear in source control, client
bundles, logs, error messages, or test fixtures. New or changed external interfaces,
persistent data, permissions, and third-party dependencies MUST receive a documented
security and privacy review. The system MUST fail closed when authorization, integrity,
or identity cannot be established, while returning actionable errors that disclose no
sensitive detail. Applicable dependency, vulnerability, and security regression checks
MUST pass before release. Security is an implementation constraint, not a later hardening
phase.

### III. Testing Is a Release Gate
Every behavior change MUST include automated tests at the lowest useful level and
integration or end-to-end coverage for affected boundaries and critical user journeys.
A defect fix MUST add a regression test that demonstrates the failure before the fix.
Tests MUST be deterministic, isolated from uncontrolled external state, and explicit
about fixtures and timing. Failing required tests block merge and release. A flaky test
counts as failing until fixed or quarantined with a tracked owner, reason, and removal
date. Manual verification MUST supplement, but MUST NOT replace, feasible automated
coverage for visual behavior, accessibility, security, and performance. Test counts or
coverage percentages never substitute for assertions against specified behavior.

### IV. Consistent and Accessible User Experience
User-facing work MUST reuse established interaction patterns, visual tokens,
terminology, and control behavior. Each applicable flow MUST specify and verify normal,
loading, empty, error, disabled, and recovery states. Essential actions MUST work with
keyboard-only input, expose semantic names and state, preserve visible focus, and remain
understandable without relying only on color, animation, timing, or pointer precision.
Layouts MUST remain usable at the supported viewport sizes, zoom levels, browsers, and
input methods declared in the feature plan. User-visible changes MUST include acceptance
criteria and recorded review at representative configurations. Consistency and
accessibility are functional correctness because an unusable feature is incomplete.

### V. Performance Is a Budget
Every feature specification MUST define measurable budgets for applicable startup or
load time, interaction latency, rendering or simulation cadence, memory, network use,
and asset size. The implementation plan MUST define representative workloads, target
environments, tools, and a reproducible baseline. Performance verification MUST exercise
release-equivalent builds and record results. No release may exceed an approved budget.
Any regression not covered by an existing budget MUST be reported and may be accepted
only through a documented exception with owner approval, rationale, and a remediation
or re-baselining plan. Hot paths MUST avoid unbounded work, and resource or network
degradation MUST preserve safe, responsive user feedback.

## Engineering Standards

- The feature specification is the source of truth for observable behavior and MUST
  contain testable functional, security, user-experience, accessibility, and performance
  requirements or an explicit, justified `N/A` for an inapplicable area.
- Dependencies MUST have a documented purpose, compatible license, maintained release,
  and version constraint. Removing a dependency is preferred when the required behavior
  is small enough to implement and test safely within the project.
- Errors MUST preserve diagnostic context for developers and provide users with a clear
  next action, without exposing secrets or internal implementation details.
- Shared state, nondeterminism, time, randomness, storage, and network access MUST be
  isolated behind explicit interfaces so core behavior remains testable and reproducible.
- Generated artifacts, third-party assets, and external data MUST record their source,
  license or usage rights, transformation steps, and validation status before release.

## Development Workflow and Quality Gates

1. A specification MUST define independently testable user journeys, trust boundaries,
   user-visible states, accessibility expectations, and measurable performance outcomes.
2. A plan MUST document architecture, dependencies, complexity, target environments,
   security controls, test strategy, UX verification, and performance measurement. Its
   Constitution Check MUST pass before research and be re-evaluated after design.
3. Tasks MUST pair each user story with its implementation and applicable automated,
   security, accessibility, UX, and performance verification. Story-specific quality
   work MUST NOT be deferred to a final polish phase.
4. Reviewers MUST verify requirement traceability and inspect evidence from configured
   formatting, static checks, tests, security checks, representative UX review, and
   performance measurements before approving a change.
5. A release MUST have no failing required checks or unapproved constitutional
   violations. Any exception MUST identify its scope, risk, owner, expiration condition,
   and remediation task; silent or indefinite exceptions are prohibited.

## Governance

This constitution supersedes conflicting project practices and templates. Amendments
require a documented proposal, project-owner approval, an updated Sync Impact Report,
and synchronized changes to affected templates and guidance. Backward-incompatible
principle or governance changes require a MAJOR version bump; new principles or
materially expanded obligations require MINOR; clarifications with no changed obligation
require PATCH.

Every implementation plan MUST evaluate the Constitution Check before Phase 0 and again
after Phase 1 design. Every change review and release decision MUST verify applicable
principles with evidence. A discovered violation MUST be corrected before merge or be
recorded as an approved exception under the workflow above. Compliance is judged by
observable artifacts and results, not by stated intent.

**Version**: 1.0.0 | **Ratified**: 2026-08-21 | **Last Amended**: 2026-08-21
