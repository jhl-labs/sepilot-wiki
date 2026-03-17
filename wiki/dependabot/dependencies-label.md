---
title: "Adding `dependencies` label for Dependabot"
description: "Dependabot requires a `dependencies` label to be present. This guide explains how to create the label and adjust `dependabot.yml` if needed."
category: "Guide"
tags: ["dependabot", "labels", "github-actions"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-17T10:45:00Z"
updatedAt: "2026-03-17T10:45:00Z"
---

# Adding `dependencies` label for Dependabot

Dependabot automatically adds the `dependencies` label to pull requests that update dependencies. If this label does not exist in the repository, Dependabot will fail with an error like:

> The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.

## Why the label is needed

- **Visibility** – The label helps maintainers quickly identify dependency‑update PRs.
- **Automation** – Workflows that filter on `dependencies` (e.g., auto‑merge bots) rely on the label being present.

## Steps to create the label

1. **Navigate to the repository’s Settings**
   - Go to **Settings → Labels**.
2. **Create a new label**
   - Click **New label**.
   - **Name:** `dependencies`
   - **Color:** Choose any color you prefer (commonly `#0366d6`).
   - **Description (optional):** `Pull requests that update project dependencies`.
3. **Save** the label.

## Verify Dependabot configuration

Open the `.github/dependabot.yml` file and ensure it does **not** contain an invalid `labels` entry. A minimal configuration looks like:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # Optional: you can explicitly set labels, but they must exist.
    # labels:
    #   - "dependencies"
```

- If you have a custom `labels` list, make sure `dependencies` is included **and** that the label exists in the repository.
- If you prefer not to specify labels, simply remove the `labels:` block; Dependabot will add the default `dependencies` label automatically.

## Common pitfalls

- **Typo in label name** – Labels are case‑sensitive. Use the exact name `dependencies`.
- **Missing permission** – Only users with admin or maintain‑er rights can create labels.
- **Multiple `dependabot.yml` files** – Ensure you edit the one located at `.github/dependabot.yml`.

## After fixing

- Re‑run the Dependabot PR or trigger a new one by pushing a commit that changes a dependency version.
- Verify that the PR now shows the `dependencies` label.

---

*If you encounter further issues, refer to the official Dependabot documentation or open an issue in this wiki.*