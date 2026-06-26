# Data Model: prototipo

## Overview

The prototype uses mock entities only. All state is local, deterministic, and safe to reset at any time.

## Entities

### MockEvent

- `id`: Unique mock identifier.
- `title`: Event headline shown on Home.
- `sport`: Sport category such as football, tennis, basketball, or esports.
- `league`: Optional competition label.
- `startLabel`: Human-readable time context.
- `featured`: Boolean flag for highlight placement.
- `priority`: Ranking for display order.
- `tone`: Visual tag used for the card accent.

### MockProfile

- `id`: Unique mock profile identifier.
- `displayName`: Public account name.
- `avatarUrl`: Mock profile image.
- `elo`: Prediction score shown as the profile’s main metric.
- `rankLabel`: Friendly label for current level.
- `winRate`: Mock performance percentage.
- `streak`: Current positive or negative streak.
- `bio`: Short summary text.

### PredictionGroup

- `id`: Unique group identifier.
- `name`: Group name shown in the social area.
- `memberCount`: Number of members in the group.
- `ownerName`: Mock owner label.
- `lastActivityLabel`: Short activity summary.
- `score`: Optional group score for display.

### Friend

- `id`: Unique friend identifier.
- `name`: Display name.
- `avatarUrl`: Mock avatar image.
- `sportFocus`: Preferred sport or theme.
- `status`: Online, busy, or inactive mock status.
- `isSelected`: Session-only flag for add/remove interactions.

### RankingEntry

- `id`: Unique ranking identifier.
- `position`: Global ranking position.
- `displayName`: Name shown in the ranking summary.
- `elo`: Ranking score.
- `trend`: Up, down, or stable indicator.
- `badge`: Short label such as streak or tier.

### AppSessionState

- `activeTab`: Currently visible main section.
- `hiddenFriends`: Session-only list of removed friends.
- `selectedGroupIds`: Groups the user is previewing or emphasizing.
- `lastViewedEventId`: Helpful for lightweight UX continuity.

## Relationships

- `MockProfile` is the main identity shown in Profile and may be summarized in Home.
- `PredictionGroup` contains multiple `Friend` entries.
- `RankingEntry` can be derived from the profile plus the seeded leaderboard fixtures.
- `AppSessionState` owns the transient add/remove behavior and tab switching.

## Validation Rules

- `elo` values must be positive integers.
- `position` values must be unique and sorted ascending.
- `featured` events should appear before non-featured events in Home.
- Session-only friend changes reset when the app session is restarted.
- All mock records must remain synthetic and anonymized.

## State Transitions

- A friend can move from visible to hidden within the active session when removed.
- A hidden friend can be restored in the active session when re-added.
- Navigation changes only `activeTab`; it does not mutate profile or ranking data.