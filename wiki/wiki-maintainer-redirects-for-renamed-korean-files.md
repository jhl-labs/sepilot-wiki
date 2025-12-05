# Redirects for Renamed Korean Files

The following Korean‑named wiki pages have been renamed or moved.  Permanent (301) redirects are added so that existing external links continue to work and SEO value is preserved.

## Redirect table
| Old file (URL) | New location | Redirect type |
|---|---|---|
| `요청-bun이란.md` | `/bun/overview.md` | 301 (permanent) |
| `요청-github-actions로-bun을-쓰는-방법.md` | `/bun/ci/github-actions.md` | 301 (permanent) |
| `sepilot-wiki가-어떤-언어프레임워크로-구현되어-있나요.md` | `/about/technology-stack.md` | 301 (permanent) |

## Implementation

If the wiki is hosted on Netlify (or any platform that respects a `_redirects` file), add the following lines to the root `_redirects` file:

```text
/요청-bun이란.md               /bun/overview.md               301!
/요청-github-actions로-bun을-쓰는-방법.md   /bun/ci/github-actions.md   301!
/sepilot-wiki가-어떤-언어프레임워크로-구현되어-있나요.md   /about/technology-stack.md   301!
```

*The trailing `!` forces a **permanent** redirect.

If the wiki platform provides a built‑in redirect feature (e.g., front‑matter `redirect_to`), create a stub page at each old path with the following front‑matter:

```yaml
---
redirect_to: /bun/overview.md   # for 요청-bun이란.md
---
```

Repeat the same pattern for the other two files, adjusting the target path accordingly.

---
*This document was generated automatically to satisfy the maintainer request for permanent redirects.*