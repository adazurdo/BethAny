# Quickstart: base de datos

## Goal

Validate that a user can register, sign in, see the access gate first, and recover saved account data on a later sign-in.

## Prerequisites

- The repo is checked out locally.
- The local Python backend and Expo frontend can both be started from the workspace.
- The device or emulator used for mobile validation can reach the local development environment.

## Validation Flow

### 1. Start from a clean local session

Open the app and confirm the first screen is an access screen with register and sign-in actions.

**Expected result**: The main app is not visible before authentication.

### 2. Register a new account

Create a new account with a unique identifier and password.

**Expected result**: The account is stored locally and the app can move into the authenticated area.

### 3. Edit and preserve account data

Change the account-owned data that the app exposes in this feature, including profile details, elo, bets, and friends.

**Expected result**: The updated values remain visible for the active session and are written to local persistence.

### 4. Sign out

Use the logout action and return to the access screen.

**Expected result**: The app leaves the authenticated state and shows the initial entry screen again.

### 5. Sign back in

Sign in again with the same credentials.

**Expected result**: The same account data is restored, including profile, elo, bets, and friends.

## Recommended Checks

- Verify duplicate identifiers are rejected at registration.
- Verify invalid credentials are rejected at login.
- Verify the main app is not reachable until authentication succeeds.
- Verify the same account opens with its previously saved state after a later login.

## Mobile Validation

If the login or access flow is reviewed on a phone, validate it through Expo on a real device or simulator and confirm that the access screen, register screen, login screen, and logout flow remain usable.
