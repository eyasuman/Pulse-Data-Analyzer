---
name: Nested pnpm package installs
description: Workspace-specific dependency installation behavior for nested Replit artifacts
---

Dependency installation helpers may default to the workspace root and reject adding packages there when a nested artifact is the intended target. Use an explicit pnpm workspace filter for dependencies that belong to one artifact.

**Why:** Installing test dependencies without a package filter either fails the workspace-root guard or risks putting artifact-only packages in the root manifest.

**How to apply:** Before adding a package, identify the owning artifact and run the package-manager operation scoped to that workspace package; keep its manifest and lockfile entry local to the artifact importer.