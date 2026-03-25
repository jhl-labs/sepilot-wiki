---
title: "Dependabot 라벨 누락 해결 방법"
description: "Dependabot이 PR에 라벨을 추가하지 못할 때 'dependencies' 라벨을 생성하고 dependabot.yml을 수정하는 방법"
category: "Guide"
tags: ["Dependabot", "GitHub", "라벨", "ci/cd"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-23T12:00:00Z"
updatedAt: "2026-03-23T12:00:00Z"
---

# Dependabot 라벨 누락 해결 방법

When Dependabot tries to add the `dependencies` label to a pull request but the label does not exist in the repository, the workflow fails with an error like:

> The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.

## 해결 단계

1. **라벨 생성**  
   - Repository → **Issues** → **Labels** → **New label**  
   - Name: `dependencies`  
   - Color: (choose any, e.g., `#0366d6`)  
   - Description: *Label applied by Dependabot to dependency update PRs.*

2. **dependabot.yml 검토**  
   Ensure the `labels` field in `.github/dependabot.yml` references the correct label name.

   ```yaml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
       labels:
         - "dependencies"   # <-- must match the label created above
   ```
   If the label name is different, either rename the label or update this file accordingly.

3. **커밋 및 푸시**  
   ```bash
   git add .github/dependabot.yml
   git commit -m "fix: add correct dependencies label for Dependabot"
   git push
   ```

4. **PR 재시도**  
   - Dependabot will automatically create a new PR, or you can trigger a rebase with `@dependabot rebase`.

## 참고 자료

- Dependabot documentation: [GitHub Docs – Configuring Dependabot](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-dependency-updates)  
- Example of missing label error (GitHub Actions log) – *source from issue description*.

## FAQ

**Q:** Do I need to add the label to existing PRs?  
**A:** No. The label is only required for new PRs created after the label exists.

**Q:** Can I use a different label name?  
**A:** Yes, but update `dependabot.yml` to match the chosen name.