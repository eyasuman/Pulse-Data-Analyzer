---
name: Nested Expo EAS builds
description: Why Android builds must use the Expo artifact directory rather than the workspace root.
---

Run EAS metadata and build operations from the Expo artifact directory, not the repository root. Keep its package manifest installable without workspace-only dependency protocols when it is archived independently.

**Why:** A failed directory change left the shell at the monorepo root, so EAS uploaded the general workspace instead of the Expo app and failed in the Install dependencies phase.

**How to apply:** Before investigating or launching an EAS operation, confirm the current directory contains the mobile app's `app.json`, `package.json`, and EAS project link.