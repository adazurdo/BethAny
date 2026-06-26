# Research: prototipo

## Decision 1: Shared Expo UI for web and mobile

- Decision: Use one shared Expo-based React UI that runs on web and mobile.
- Rationale: It is the simplest way to keep the prototype consistent across platforms while preserving a mobile-friendly bottom navigation experience.
- Alternatives considered: Separate web and mobile apps, rejected because it duplicates layout and navigation work.

## Decision 2: Python support layer for mock data

- Decision: Keep Python as a small local support layer for seeded mock data, ranking helpers, and session-state shaping.
- Rationale: It satisfies the constitution’s Python requirement without introducing a real backend service during the mock phase.
- Alternatives considered: Static JSON only, rejected because a thin Python helper layer better supports deterministic ranking and future growth.

## Decision 3: Embedded ranking summary

- Decision: Show the global ranking summary inside Home or Profile rather than adding a separate tab.
- Rationale: The spec clarification kept navigation simple and preserved the three-tab MVP.
- Alternatives considered: Dedicated ranking tab, rejected because it adds unnecessary navigation complexity.

## Decision 4: Session-only social interactions

- Decision: Make add/remove friend interactions mutate local session state only.
- Rationale: The feature is explicitly mock-only, and the prototype should not imply permanent account or social persistence.
- Alternatives considered: Server-backed persistence, rejected because it conflicts with the local-first, non-functional prototype scope.

## Decision 5: Seeded mock content and youthful visual direction

- Decision: Use deterministic seeded mock data for events, profile, ranking, and social groups, with an orange-and-white modern theme.
- Rationale: Stable fixtures make the prototype easy to demo while still feeling lively and believable.
- Alternatives considered: Randomized content on each load, rejected because it makes walkthroughs inconsistent.