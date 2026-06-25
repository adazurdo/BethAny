<!--
Sync Impact Report
- Version change: 1.0.0 -> 2.0.0
- Modified principles:
	- Template Principle 1 -> I. Simplicity Is Mandatory
	- Template Principle 2 -> II. Local-First Runtime
	- Template Principle 3 -> III. Stack Commitment: Python + React + Expo Validation
	- Template Principle 4 -> IV. TDD Deferred Activation
- Added sections:
	- Technical Scope & Current Constraints
	- Development Workflow & Quality Gates
- Removed sections:
	- None
- Templates requiring updates:
	- ✅ updated: .specify/templates/plan-template.md
	- ✅ updated: .specify/templates/spec-template.md
	- ✅ updated: .specify/templates/tasks-template.md
	- ⚠ pending: .specify/templates/commands/*.md (directory not present)
	- ✅ updated: README.md
- Follow-up TODOs:
	- None
-->

# BethAny Constitution

## Core Principles

### I. Simplicity Is Mandatory
All code MUST prioritize readability and low cognitive load over premature
abstraction. Each pull request MUST explain why any non-trivial pattern is
strictly necessary. If a simpler implementation can satisfy the same
requirement, the simpler option MUST be selected.

Rationale: Simplicity reduces regressions, speeds onboarding, and shortens
feedback cycles for an early-stage product.

### II. Local-First Runtime
Until explicitly amended, all development and execution MUST run locally.
Features MUST be designed to function without cloud dependencies. Networked
services MAY be mocked locally, but production integrations MUST remain out of
scope.

Rationale: Local-first development minimizes infrastructure overhead and allows
rapid iteration while the product model is still evolving.

### III. Stack Commitment: Python + React + Expo Validation
Backend and automation components MUST use Python. Frontend application layers
MUST use React. Mobile behavior validation MUST be performed through Expo on
real mobile devices when mobile flows are affected. The default developer
startup command for the frontend workflow is `npm start dev`.

Rationale: A fixed stack eliminates decision churn and keeps tooling consistent
across contributors.

### IV. TDD Deferred Activation
The team commits to test-driven development as the target engineering method,
but TDD enforcement is deferred until explicitly activated by the product owner.
Before activation, test work MAY be planned but is not a merge gate. Once
activated, all feature work MUST follow red-green-refactor and tests MUST fail
before implementation.

Rationale: This preserves speed during mock-first discovery while protecting a
clear transition path to disciplined quality engineering.

## Technical Scope & Current Constraints

- Security hardening is intentionally deferred during the mock stage.
- No production secrets, real credentials, or personal data may be used.
- Development data MUST be synthetic or anonymized.
- Any security-related work items during this stage MUST be documented as
	deferred tasks, not implemented controls, unless explicitly approved.
- Runtime target in this phase is development mode only.

## Development Workflow & Quality Gates

- Every spec and plan MUST include a Constitution Check against all four core
	principles.
- Each task list MUST explicitly mark whether TDD is deferred or active.
- If a task touches mobile UX, Expo validation steps on mobile MUST be included
	in quickstart or validation notes.
- Complexity exceptions MUST include a simpler alternative considered and the
	reason for rejection.

## Governance

This constitution supersedes conflicting project guidance. Amendments require:

1. A documented proposal describing the change and rationale.
2. Explicit approval by project maintainers.
3. Synchronization updates to impacted templates and runtime guidance.

Versioning policy:

- MAJOR: Breaking governance changes or principle removals/redefinitions.
- MINOR: New principle/section or materially expanded mandatory guidance.
- PATCH: Clarifications, wording improvements, and non-semantic refinements.

Compliance review expectations:

- Constitution compliance MUST be checked during plan creation and before merge.
- Any violation MUST be recorded in a Complexity Tracking or Exceptions section
	with owner and remediation intent.
- Periodic review SHOULD happen at least once per milestone to decide whether
	deferred TDD and deferred security constraints should be activated.

**Version**: 2.0.0 | **Ratified**: 2026-06-25 | **Last Amended**: 2026-06-25
