---
title: "Dependency Update: @typescript-eslint packages to v8.57.0"
description: "Details of the bump from 8.56.1 to 8.57.0 for @typescript-eslint/parser and @typescript-eslint/eslint-plugin."
category: "Reference"
tags: ["dependency", "typescript-eslint", "upgrade"]
status: "draft"
issueNumber: null
createdAt: "2026-03-16T12:00:00Z"
updatedAt: "2026-03-16T12:00:00Z"
---

# Dependency Update: @typescript-eslint to v8.57.0

**Superseded by #506**

## What changed
- Bumped `@typescript-eslint/parser` from **8.56.1** to **8.57.0**.
- Bumped `@typescript-eslint/eslint-plugin` from **8.56.1** to **8.57.0**.

## Release notes (v8.57.0)
- **🚀 Features**
  - `eslint-plugin`: `[no-unnecessary-condition]` allow literal loop conditions in `for/do` loops ([#12080](https://github.com/typescript-eslint/typescript-eslint/pull/12080)).
- **🩹 Fixes**
  - `eslint-plugin`: `[strict-void-return]` false positives with overloads ([#12055](https://github.com/typescript-eslint/typescript-eslint/pull/12055)).
  - `eslint-plugin`: handle statically analyzable computed keys in `prefer-readonly` ([#12079](https://github.com/typescript-eslint/typescript-eslint/pull/12079)).
  - `eslint-plugin`: guard against negative `paramIndex` in `no-useless-default-assignment` ([#12077](https://github.com/typescript-eslint/typescript-eslint/pull/12077)).
  - `eslint-plugin`: `[prefer-promise-reject-errors]` add allow `TypeOrValueSpecifier` ([#12094](https://github.com/typescript-eslint/typescript-eslint/pull/12094)).
  - `eslint-plugin`: `[no-base-to-string]` fix false positive for `toString` with overloads ([#12089](https://github.com/typescript-eslint/typescript-eslint/pull/12089)).
  - `typescript-estree`: switch back to use `ts.getModifiers()` ([#12034](https://github.com/typescript-eslint/typescript-eslint/pull/12034)).
  - `typescript-estree`: if the template literal is tagged and the text has an invalid escape, `cooked` will be `null` ([#11355](https://github.com/typescript-eslint/typescript-eslint/pull/11355)).

## Why this PR was superseded
The change was later incorporated into PR #506, which includes additional updates and resolves the same version bump. This document records the original intent and notes the supersession for historical reference.

## References
- [GitHub Release v8.57.0](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.57.0)
- [Changelog entry for v8.57.0](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/CHANGELOG.md#8570-2026-03-09)
- Dependabot PR for the bump (original): `chore(deps): bump typescript-eslint from 8.56.1 to 8.57.0`.
