---
title: "Creating the `dependencies` label for Dependabot"
description: "Step‑by‑step guide to add the missing `dependencies` label so Dependabot can label its pull requests."
category: "Guide"
tags: ["github", "dependabot", "labels"]
status: "draft"
issueNumber: 0
createdAt: "2026-06-02T12:00:00Z"
updatedAt: "2026-06-02T12:00:00Z"
---

# Creating the `dependencies` label for Dependabot

Dependabot adds a label (by default `dependencies`) to the pull requests it creates. If that label does not exist in the repository, the pull request will fail with the error:

> The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.

This guide explains how to create the missing label and optionally adjust `dependabot.yml`.

## 1. Create the label via the GitHub UI

1. Navigate to your repository on GitHub.
2. Click **Issues** → **Labels** (or go directly to `https://github.com/<owner>/<repo>/labels`).
3. Click the **New label** button.
4. Fill in the fields:
   - **Name**: `dependencies`
   - **Description** (optional): `Pull requests opened by Dependabot for dependency updates.`
   - **Color**: choose a color (e.g., `#0366d6`).
5. Click **Create label**.

The label now exists and Dependabot can apply it automatically.

## 2. Create the label via the GitHub API (optional)

If you prefer automation, you can create the label with a `curl` request:

```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: token <YOUR_PERSONAL_ACCESS_TOKEN>" \
  https://api.github.com/repos/<owner>/<repo>/labels \
  -d '{"name":"dependencies","color":"0366d6","description":"Pull requests opened by Dependabot for dependency updates."}'
```

Replace `<owner>`, `<repo>`, and `<YOUR_PERSONAL_ACCESS_TOKEN>` with your values.

## 3. Verify Dependabot configuration

Open `.github/dependabot.yml` (or `dependabot.yml` at the repository root) and ensure the `labels` field (if present) includes `dependencies` or remove the field to let Dependabot use the default label.

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # Optional: custom labels – make sure they exist
    # labels:
    #   - "dependencies"
```

If you have custom labels, repeat step 1 for each of them.

## 4. Test the setup

Trigger a manual Dependabot run or wait for the next scheduled run. The new pull request should now appear with the `dependencies` label attached.

---

**References**
- [GitHub Docs – About labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-labels) (official documentation)
- [Dependabot configuration options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options) (official documentation)
