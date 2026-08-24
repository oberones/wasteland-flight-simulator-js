---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Automated tests are REQUIRED for every behavior change. Include unit,
integration, contract, and end-to-end tasks at the levels applicable to each story,
plus regression-first tasks for defect fixes. Add manual evidence tasks where automation
cannot fully verify accessibility, visual behavior, security, or performance.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools
- [ ] T004 [P] Configure static/type checks and deterministic test tooling
- [ ] T005 [P] Configure dependency and vulnerability checks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T006 Setup database schema and migrations framework
- [ ] T007 [P] Implement authentication/authorization framework
- [ ] T008 [P] Setup API routing and middleware structure
- [ ] T009 Create base models/entities that all stories depend on
- [ ] T010 Configure safe error handling and secret-free logging infrastructure
- [ ] T011 Setup environment and secret configuration management

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Define test tasks before implementation tasks. For a defect, demonstrate
> the regression test failing before applying the fix.**

- [ ] T012 [P] [US1] Unit or contract tests for [behavior/interface] in [exact test path]
- [ ] T013 [P] [US1] Integration or end-to-end test for [user journey] in [exact test path]
- [ ] T014 [P] [US1] Accessibility, security, or performance test for [applicable requirement] in [exact test path]

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create [Entity1] model in [exact source path]
- [ ] T016 [P] [US1] Create [Entity2] model in [exact source path]
- [ ] T017 [US1] Implement [Service] in [exact source path] (depends on T015, T016)
- [ ] T018 [US1] Implement [interface/feature] in [exact source path]
- [ ] T019 [US1] Add input validation, authorization, and safe error handling
- [ ] T020 [US1] Add secret-free diagnostic logging for user story 1 operations
- [ ] T021 [US1] Record representative UX and performance verification evidence

**Checkpoint**: At this point, User Story 1 MUST be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (REQUIRED) ⚠️

- [ ] T022 [P] [US2] Unit or contract tests for [behavior/interface] in [exact test path]
- [ ] T023 [P] [US2] Integration or end-to-end test for [user journey] in [exact test path]
- [ ] T024 [P] [US2] Accessibility, security, or performance test for [applicable requirement] in [exact test path]

### Implementation for User Story 2

- [ ] T025 [P] [US2] Create [Entity] model in [exact source path]
- [ ] T026 [US2] Implement [Service] in [exact source path]
- [ ] T027 [US2] Implement [interface/feature] in [exact source path]
- [ ] T028 [US2] Integrate with User Story 1 components (if needed)
- [ ] T029 [US2] Record representative UX and performance verification evidence

**Checkpoint**: At this point, User Stories 1 AND 2 MUST both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (REQUIRED) ⚠️

- [ ] T030 [P] [US3] Unit or contract tests for [behavior/interface] in [exact test path]
- [ ] T031 [P] [US3] Integration or end-to-end test for [user journey] in [exact test path]
- [ ] T032 [P] [US3] Accessibility, security, or performance test for [applicable requirement] in [exact test path]

### Implementation for User Story 3

- [ ] T033 [P] [US3] Create [Entity] model in [exact source path]
- [ ] T034 [US3] Implement [Service] in [exact source path]
- [ ] T035 [US3] Implement [interface/feature] in [exact source path]
- [ ] T036 [US3] Record representative UX and performance verification evidence

**Checkpoint**: All user stories MUST now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Validation & Cross-Cutting Quality Gates

**Purpose**: Consolidate required project-wide evidence after story-specific quality work

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring with regression coverage
- [ ] TXXX Run configured formatter, linter, static analysis, and type checks
- [ ] TXXX Run all required unit, integration, contract, and end-to-end suites
- [ ] TXXX Complete security review, dependency/license review, and vulnerability checks
- [ ] TXXX Verify keyboard, focus, semantics, UX states, and representative responsive layouts
- [ ] TXXX Run performance workloads and compare recorded results with approved budgets
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but MUST remain independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but MUST remain independently testable

### Within Each User Story

- Test tasks MUST be defined before implementation tasks
- Regression tests for defects MUST fail before the fix and pass after it
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch independent tests for User Story 1 together:
Task: "Unit or contract tests for [behavior/interface] in [exact test path]"
Task: "Integration or end-to-end test for [user journey] in [exact test path]"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story MUST be independently completable and testable
- Include exact file paths and map tasks to functional and non-functional requirements
- Do not defer story-specific security, accessibility, UX, or performance work to final validation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
