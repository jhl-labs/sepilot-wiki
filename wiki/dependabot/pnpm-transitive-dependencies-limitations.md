---
title: "Dependabot does not support transitive dependency updates for pnpm"
description: "pnpm 패키지 매니저에서 Dependabot이 전이(트랜시티브) 의존성 업데이트를 지원하지 않는 이유와 영향을 정리합니다."
category: "Reference"
tags: ["Dependabot", "pnpm", "transitive dependencies", "limitations"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-25T09:00:00Z"
updatedAt: "2026-02-25T09:00:00Z"
---

# Dependabot does not support transitive dependency updates for pnpm

## Overview
Dependabot is a GitHub‑provided automation tool that can automatically raise pull requests to keep your dependencies up‑to‑date. While it supports direct dependency updates for many package managers, **pnpm** is an exception when it comes to *transitive* (indirect) dependency updates.

> "Dependabot doesn't support transitive dependency updates for pnpm, a very popular package manager (31M downloads / week as of writing)."[Reference](https://github.com/dependabot/dependabot-core/issues/13177)

## What are transitive dependencies?
A transitive dependency is a package that is **not** listed directly in your `package.json` but is required by one of your direct dependencies. Updating these can be necessary when a security vulnerability is discovered in a deep‑nested package.

## Current limitation for pnpm
- Dependabot **only** updates the versions that appear in your `package.json` (direct dependencies).
- It **does not** attempt to bump versions of packages that appear only in the lockfile (`pnpm-lock.yaml`).
- Consequently, PRs that rely on updating a transitive dependency (e.g., a security fix in a sub‑dependency) will fail for pnpm projects.

This limitation is reflected in the CI feedback you are seeing:
```
Dependabot doesn't support the 'updating transitive dependencies' feature for pnpm package_manager. Because of this, Dependabot cannot update this pull request.
```

## Impact on your workflow
1. **Security patches may be missed** if the vulnerable code lives in a transitive dependency.
2. **Manual intervention** is required: you must either:
   - Update the direct dependency that brings in the transitive one, **or**
   - Manually edit the lockfile and commit the change.
3. **CI pipelines** that expect Dependabot to handle all updates will need to be adjusted for pnpm projects.

## Workarounds
- **Upgrade the direct dependency** that depends on the vulnerable transitive package. This often pulls in a newer version of the transitive dependency.
- **Use a different package manager** (e.g., npm or Yarn) for projects where automatic transitive updates are critical.
- **Run a manual audit** with tools like `pnpm audit` and apply patches manually.

## Related discussions
- Issue discussing the lack of support: [pnpm transitive dependency updates support #13177](https://github.com/dependabot/dependabot-core/issues/13177)
- Community reports of unnecessary bumps and limitations: [pnpm dependabot updates transitive dependencies when ... #11620](https://github.com/dependabot/dependabot-core/issues/11620)

## Future outlook
Dependabot’s roadmap may include support for transitive updates in pnpm, but as of the latest information (2026), this feature is **not** available. Keep an eye on the official Dependabot repository for announcements.

---
*This document was generated based on publicly available information and the feedback from the PR attempting to bump `ajv` from 6.12.6 to 6.14.0.*