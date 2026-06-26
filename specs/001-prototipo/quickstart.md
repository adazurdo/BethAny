# Quickstart: prototipo

## Purpose

Validate the local-first mock MVP flow for BethAny on web and mobile.

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- Expo Go on a mobile device for handset validation

## Local Setup

1. Install the frontend dependencies.
2. Prepare any Python support utilities or seeded mock-data scripts.
3. Start the frontend with the required development command: `npm start dev`.

## Validation Flow

### Web

1. Open the web preview from the local dev server.
2. Confirm the home page shows mock featured events from multiple sports.
3. Confirm the home page also includes the global ranking summary inside the page content.
4. Switch to the profile page and verify the mock avatar, account name, and elo are visible.
5. Switch to the social page and verify the mock groups and friends list are visible.

### Mobile

1. Open the app in Expo Go on a physical mobile device.
2. Confirm the bottom navigation stays anchored and tappable.
3. Verify the orange-and-white design remains readable and balanced on a narrow screen.
4. Verify that add/remove friend interactions update the visible session state.

## Expected Outcome

- Three primary views are reachable through the bottom navigation.
- The ranking summary appears embedded in Home or Profile, not as its own tab.
- Mock content remains consistent, modern, and non-functional.
- Mobile and web render the same prototype without requiring cloud services.