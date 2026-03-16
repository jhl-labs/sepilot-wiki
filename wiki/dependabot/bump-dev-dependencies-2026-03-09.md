---
title: "Dependabot PR: dev‑dependencies bump (2026‑03‑09) – no longer needed"
description: "Summary of the Dependabot pull request that attempted to bump @types/node, @typescript-eslint/eslint‑plugin, and @typescript-eslint/parser, and why it was closed."
category: "Troubleshooting"
tags: ["dependabot", "dependency‑bump", "dev‑dependencies", "typescript-eslint", "@types/node"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-16T08:30:00Z"
updatedAt: "2026-03-16T08:30:00Z"
---

# Dependabot PR – dev‑dependencies bump (2026‑03‑09)

A Dependabot pull request was opened to bump the **dev‑dependencies** group in the repository root:

- `@types/node` from **25.3.0 → 25.4.0**
- `@typescript-eslint/eslint-plugin` from **8.56.1 → 8.57.0**
- `@typescript-eslint/parser` from **8.56.1 → 8.57.0**

## Why the PR was closed

The repository maintainers observed that these dependencies can be updated through an alternative workflow (e.g., a shared internal upgrade script or a monorepo‑wide version management tool). Consequently, the automatic Dependabot PR was deemed unnecessary and was closed with the comment:

> "Looks like these dependencies are updatable in another way, so this is no longer needed."

## References

- **@types/node** source tree: [DefinitelyTyped/types/node](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/HEAD/types/node) – shows the latest typings and version history.
- **@typescript-eslint/eslint-plugin** repository: [typescript-eslint/packages/eslint-plugin](https://github.com/typescript-eslint/typescript-eslint/tree/HEAD/packages/eslint-plugin) – includes changelog for v8.57.0.
- **@typescript-eslint/parser** repository: [typescript-eslint/packages/parser](https://github.com/typescript-eslint/typescript-eslint/tree/HEAD/packages/parser) – includes changelog for v8.57.0.
- Dependabot grouping feature announcement: [GitHub Blog – Dependabot can group updates by dependency name across multiple directories](https://github.blog/changelog/2026-02-24-dependabot-can-group-updates-by-dependency-name-across-multiple-directories/)

## What to do next?

If you need to manually bump these dependencies in the future, consider using the same alternative workflow that the team employs (e.g., a centralized upgrade script). Keep an eye on the official release notes of the packages for any breaking changes before applying version bumps.

---
*This document was generated automatically based on the Dependabot PR feedback.*