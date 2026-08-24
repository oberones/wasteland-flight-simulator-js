# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories MUST be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you MUST still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently

  For user-visible stories, include applicable normal, loading, empty, error,
  disabled, and recovery states. Cover keyboard-only operation and representative
  supported viewports, zoom levels, browsers, devices, and input methods.
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?
- How does the system reject malformed or unauthorized input without exposing sensitive data?
- How does the experience behave with keyboard-only input, zoom, and constrained viewports?
- What safe and actionable feedback appears when a dependency is slow or unavailable?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]  
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Security & Privacy Requirements *(mandatory)*

- **SR-001**: [Identify trust boundaries, untrusted inputs, sensitive data, and required validation or state N/A with rationale]
- **SR-002**: [Define authorization, secret handling, safe failure, and user-data protections or state N/A with rationale]
- **SR-003**: [Define applicable dependency, vulnerability, and security regression evidence]

### User Experience & Accessibility Requirements *(mandatory)*

- **UXR-001**: [Define established patterns and the normal, loading, empty, error, disabled, and recovery states]
- **UXR-002**: [Define keyboard, focus, semantics, non-color cues, and assistive-technology behavior]
- **UXR-003**: [Define supported viewport, zoom, browser, device, and input configurations]

### Performance Requirements *(mandatory)*

- **PR-001**: [Set measurable budgets for applicable load, latency, cadence, memory, network, and asset size]
- **PR-002**: [Define representative workloads, target environments, baseline, and measurement method]
- **PR-003**: [Define safe, responsive behavior under resource or dependency degradation]

### Quality & Verification Requirements *(mandatory)*

- **QR-001**: [Map behavior and critical journeys to unit, integration, contract, and end-to-end coverage as applicable]
- **QR-002**: [Define required formatting, linting, static/type checks, security checks, manual reviews, and release evidence]
- **QR-003**: [Define regression-test expectations and any justified, time-bounded exceptions]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

Include measurable security, accessibility and UX, and performance outcomes for each
applicable requirement area. Technology-specific implementation metrics belong in the plan.

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- [Assumption about target users, e.g., "Users have stable internet connectivity"]
- [Assumption about scope boundaries, e.g., "Mobile support is out of scope for v1"]
- [Assumption about data/environment, e.g., "Existing authentication system will be reused"]
- [Dependency on existing system/service, e.g., "Requires access to the existing user profile API"]
