---
title: "Dependency Update: mermaid 11.13.0"
description: "Details of the mermaid library upgrade from 11.12.3 to 11.13.0, including new features and bug fixes."
category: "Reference"
tags: ["dependency", "mermaid", "upgrade"]
status: "draft"
issueNumber: null
createdAt: "2026-03-09T12:00:00Z"
updatedAt: "2026-03-09T12:00:00Z"
quality_score: 74
---

# Dependency Update: mermaid 11.13.0

This document records the **Dependabot** pull‑request that bumps the `mermaid` JavaScript library from version **11.12.3** to **11.13.0**.

## Why the bump?
- Security‑related updates and bug‑fixes in the 11.13.0 release.
- New diagram types and configuration options that improve developer experience.

## Release notes (summarised)
### Minor Changes
- Export `AsyncIconLoader`, `SyncIconLoader`, and `IconLoader` types. ([#7352](https://github.com/mermaid-js/mermaid/pull/7352))
- Add **venn‑beta** diagram. ([#5932](https://github.com/mermaid-js/mermaid/pull/5932))
- Add **half‑arrowheads** (solid & stick) and central connection support. ([#6789](https://github.com/mermaid-js/mermaid/pull/6789))
- Add **Ishikawa** diagram (ishikawa‑beta). ([#7387](https://github.com/mermaid-js/mermaid/pull/7387))
- Deprecate `flowchart.htmlLabels` in favour of root‑level `htmlLabels`. ([#6995](https://github.com/mermaid-js/mermaid/pull/6995))
- Allow notes in namespaces on `classDiagram`. ([#5814](https://github.com/mermaid-js/mermaid/pull/5814))

### Patch Changes
- Prevent HTML tags from being escaped in sandbox label rendering. ([#7075](https://github.com/mermaid-js/mermaid/pull/7075))
- Support edge animation in hand‑drawn look. ([#6843](https://github.com/mermaid-js/mermaid/pull/6843))
- Fix ER diagram edge label positioning. ([#7453](https://github.com/mermaid-js/mermaid/pull/7453))
- Resolve parsing error where direction `TD` was not recognised within subgraphs. ([#6989](https://github.com/mermaid-js/mermaid/pull/6989))
- Various SVG, viewBox, and layout fixes (e.g., responsive SVGs, correct viewBox casing, participant parsing, markdown auto‑wrap handling, architecture diagram line lengths, BT orientation arc sweep flags, etc.).
- Support the `htmlLabels` config value wherever possible. ([#6995](https://github.com/mermaid-js/mermaid/pull/6995))
- Prevent browser hangs with multiline `accDescr` in XY charts, improve block positioning for nested blocks, and many other stability improvements.

## References
- Official mermaid release page: https://github.com/mermaid-js/mermaid/releases (version 11.13.0)  
- Dependabot PR details (bump from 11.12.3 → 11.13.0) – see the original issue on Ecosyste.ms: https://dependabot.ecosyste.ms/hosts/GitHub/repositories/jagreehal/executable-stories/issues/51  
- Full changelog and commit list are available in the mermaid repository.

---
*This document was generated automatically to keep track of dependency updates.*