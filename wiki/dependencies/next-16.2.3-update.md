---
title: "Next.js 16.2.3 Dependency Update"
description: "Updates Next.js from 16.1.6 to 16.2.3, including security fixes for CVE‑2026‑23869."
category: "Reference"
tags: ["dependency", "next", "security"]
status: "draft"
issueNumber: 0
createdAt: "2026-05-12T09:30:00Z"
updatedAt: "2026-05-12T09:30:00Z"
---

# Next.js 16.2.3 Dependency Update

## Overview
This document records the upgrade of the **Next.js** framework from version **16.1.6** to **16.2.3** in the SEPilot Wiki repository. The bump is driven by Dependabot and includes important security and bug‑fix releases.

## Release notes (v16.2.3)
- **Core Changes**
  - Ensure app‑page reports stale ISR revalidation errors via `onRequestError` [#92282]([https://redirect.github.com/vercel/next.js/issues/92282](https://redirect.github.com/vercel/next.js/issues/92282))
  - Fix manifest.ts breaks HMR in Next.js 16.2 [#91981]([https://redirect.github.com/vercel/next.js/issues/91981](https://redirect.github.com/vercel/next.js/issues/91981))
  - Deduplicate output assets and detect content conflicts on emit [#92292]([https://redirect.github.com/vercel/next.js/issues/92292](https://redirect.github.com/vercel/next.js/issues/92292))
  - Fix styled‑jsx race condition: styles lost due to concurrent rendering [#92459]([https://redirect.github.com/vercel/next.js/issues/92459](https://redirect.github.com/vercel/next.js/issues/92459))
  - turbo‑tasks‑backend: stability fixes for task cancellation and error handling [#92254]([https://redirect.github.com/vercel/next.js/issues/92254](https://redirect.github.com/vercel/next.js/issues/92254))

*Full release notes are available on the official Next.js releases page* [[GitHub Releases](https://github.com/vercel/next.js/releases)](https://github.com/vercel/next.js/releases).

## Security fix – CVE‑2026‑23869
Next.js 16.2.3 contains the patch for **CVE‑2026‑23869**, a high‑severity (CVSS 7.5) denial‑of‑service vulnerability in React Server Components.
- Fixed in: **Next.js 16.2.3** (previously affected versions 13.x‑16.x) [[Vercel Changelog](https://vercel.com/changelog/summary-of-cve-2026-23869)](https://vercel.com/changelog/summary-of-cve-2026-23869).
- Recommendation: upgrade to 16.2.3 or later as soon as possible.

## Superseded notice
The original Dependabot pull request for this bump has been **superseded by #769**. No further action is required on that PR; the upgrade is now tracked by this document.

## References
- Next.js repository – [GitHub](https://github.com/vercel/next.js)
- Release notes – [GitHub Releases](https://github.com/vercel/next.js/releases)
- CVE‑2026‑23869 details – [Vercel Changelog](https://vercel.com/changelog/summary-of-cve-2026-23869)
- Dependabot update example – [Beaulewis1977/lazy‑agents#19](https://dependabot.ecosyste.ms/hosts/GitHub/repositories/Beaulewis1977/lazy-agents/issues/19)

---
*Document created automatically in response to Dependabot feedback.*