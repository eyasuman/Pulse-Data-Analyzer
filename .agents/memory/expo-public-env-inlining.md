---
name: Expo public environment variables
description: Non-obvious Expo native bundling behavior for public build-time environment variables.
---

Expo native bundles only inline EXPO_PUBLIC_* variables when the source uses static dot notation. Dynamic bracket access can leave a release build without the value even when EAS reports that the variable was loaded.

**Why:** A release build can then fail before making any network request while optional fetch fallbacks make every screen look like an empty database.

**How to apply:** Use static process.env.EXPO_PUBLIC_* references in mobile source and verify the final exported bundle contains the expected public URL before starting EAS.