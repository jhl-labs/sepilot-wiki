---
title: Automate Repository Tasks with GitHub Agentic Workflows
author: SEPilot AI
status: published
tags: [GitHub, Agentic Workflows, CI/CD, Repository Automation, AI]
redirect_from:
  - automate-repository-tasks-with-github-agentic-work
order: 6
related_docs: ["continuous-ai-agentic-ci.md", "continuous-ai.md"]
updatedAt: 2026-02-24
---

# Claude 기반 Git 커밋 리뷰 자동화 (git‑lrc)

이 문서는 Claude 모델을 이용해 커밋 전 자동 리뷰를 강제하는 **git‑lrc**(Git‑Lint‑Review‑Commit) 워크플로우를 소개합니다. 아래 섹션에서는 전체 흐름, 커밋에 표시되는 어노테이션 스킴, 그리고 CI/CD 파이프라인에 통합하는 방법을 다룹니다.

---

## Claude Review Workflow Overview

1. **스테이징된 diff 감지** – `git add` 로 스테이징된 모든 변경 사항이 자동으로 감지됩니다.  
2. **Claude에게 리뷰 요청** – 워크플로우는 스테이징된 diff를 Claude에게 전달하고, 위험한 변경점, 보안 이슈, 성능 퇴보 등을 강조하는 인라인 코멘트를 생성합니다.  
3. **엔지니어 검토** – 개발자는 Claude이 제공한 코멘트를 검토하고, 리뷰 결과를 선택합니다.  
4. **커밋 어노테이션 기록** – 선택된 결과가 커밋 메시지에 `[reviewed]`, `[vouched]`, `[skipped]` 중 하나로 자동 삽입되고, 해당 정보가 Git 로그에 영구 보관됩니다.

> **핵심 포인트**: 별도의 대시보드가 없으며, 기존 Git 워크플로우와 완전히 통합됩니다. 개발자는 여전히 최종 결정을 내리며, AI는 보조 역할만 수행합니다.

---

## Commit Annotation Scheme

| 어노테이션 | 의미 | 적용 시점 |
|-----------|------|-----------|
| `[reviewed]` | Claude이 리뷰를 수행하고, 개발자가 리뷰 결과를 수용했음 | `git commit` 직전 |
| `[vouched]` | 리뷰는 수행했지만, 개발자가 직접 검증하고 승인했음 | `git commit` 직전 |
| `[skipped]` | 리뷰를 의도적으로 건너뛰었음 – 로그에 명시적으로 기록됨 | `git commit` 직전 |

이 어노테이션은 커밋 메시지에 자동 삽입되며, `git log` 를 통해 언제 어떤 커밋이 리뷰되었는지, 혹은 리뷰 없이 배포되었는지를 추적할 수 있습니다.

---

## CI/CD Integration Steps

1. **전역 Git 훅 설치** – `git-lrc install` 명령을 실행하면 모든 레포에 전역 훅이 설정됩니다. 설치 시간은 약 60초 정도 소요됩니다.  
2. **Claude API 키 설정** – 무료 Gemini API 키(또는 Claude API 키)를 환경 변수 `CLAUDE_API_KEY` 로 지정합니다. 별도 좌석 기반 요금이 없습니다.  
3. **CI 파이프라인에 검증 단계 추가** – CI 설정 파일(`.github/workflows/ci.yml` 등)에서 `git-lrc verify` 명령을 실행해 리뷰가 누락된 커밋이 없는지 확인합니다.  
4. **리포지토리 보호 규칙** – GitHub 보호 규칙에 `Require status checks` 를 추가하고, `git-lrc verify` 를 필수 체크로 지정합니다.

```yaml
# .github/workflows/ci.yml 예시
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install git‑lrc
        run: curl -sSL https://example.com/git-lrc/install.sh | bash
      - name: Verify commit reviews
        run: git-lrc verify
      - name: Build & Test
        run: ./gradlew build test
```

위와 같이 설정하면, 리뷰가 누락된 커밋이 푸시될 경우 CI가 실패하고, 병합이 차단됩니다.

---

## 추가 참고
- **무료 티어**: Gemini API 키를 직접 가져와 사용할 수 있으며, 좌석 기반 요금이 없습니다.  
- **설정 시간**: 한 번 설치하면 머신 전체에 적용되어, 모든 레포에 즉시 동작합니다.  
- **오픈소스**: `git‑lrc`는 GitHub에 공개되어 있어 자유롭게 포크·기여·검토가 가능합니다. ([GitHub Repository](https://github.com/git-lrc))

---

### 문서 자동 업데이트
PR이 머지되면 에이전트가 변경된 API 시그니처를 찾아 `README.md` 혹은 `docs/` 파일을 최신화합니다.

### 테스트 보강 PR 자동 생성
커버리지가 낮은 파일을 감지하면, 에이전트가 기본 테스트 케이스를 생성하고 PR을 올립니다.

### 기타 확장 시나리오
- **보안 스캔**: 의존성 업데이트 후 자동 보안 검토  
- **린트 자동 적용**: 스타일 위반을 수정하고 커밋  
- **배포 자동화**: 특정 태그가 푸시되면 배포 파이프라인을 트리거  

## 5. 설정 및 배포 단계
### GitHub CLI 및 Agentic Workflows 확장 설치
```bash
gh extension install github/agentic-workflows
```  
위 명령은 GitHub CLI 공식 문서에 따라 설치합니다[[GitHub CLI Docs](https://cli.github.com/manual/)].

### 레포지토리 권한 및 시크릿 구성
- **권한 최소화** 예시 (`.github/workflows/issue-triage.yml`)

    name: Issue Triaging
    on:
      issues:
        types: [opened]
    permissions:
      contents: read
      issues: write
      pull_requests: write
    jobs:
      triage:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - name: Run Agentic Workflow
            uses: github/agentic-workflows@v1
            with:
              workflow-path: .github/agentic-workflows/issue-triage.md

- **시크릿**: AI 모델 호출에 필요한 API 키를 `AGENTIC_API_KEY` 로 저장하고, 워크플로에서 `secrets.AGENTIC_API_KEY` 로 참조합니다.

### 워크플로 활성화(트리거) 옵션
`on:` 필드에 `issues`, `pull_request`, `schedule` 등 GitHub Actions와 동일한 이벤트를 지정합니다.

### 검토 및 승인 프로세스 설정
`## Guardrails` 섹션에 `reviewers` 를 명시해 에이전트가 만든 PR이 자동 승인되지 않도록 합니다.

## 6. 가드레일 및 안전성 확보
### 실행 제한(시간·비용·리소스) 정책
`max-runtime` 과 `cost-budget` 파라미터로 실행 시간을 5분, 비용을 0.05 USD 이하로 제한할 수 있습니다.

### 권한 최소화 원칙 적용 방법
워크플로 파일에 `permissions:` 블록을 명시해 필요한 권한만 부여합니다. 예시에서는 `contents: read` 와 `issues: write` 만 허용했습니다.

### 결과 검증 및 인간 리뷰 워크플로
에이전트가 만든 PR에 `auto-review: false` 플래그를 두고, 팀원이 직접 검토 후 병합하도록 합니다.

### 로그·감사 추적 기능 활용
GitHub Actions UI에서 **Agentic Workflow** 라벨이 붙은 실행 로그를 확인하고, `audit.log` 아티팩트로 내보낼 수 있습니다.

## 7. 모니터링 및 디버깅
### 실행 로그 확인
워크플로 실행 페이지에 **Agentic Workflow** 섹션이 표시되며, 단계별 출력과 AI 프롬프트·응답을 확인할 수 있습니다.

### 성능 메트릭 수집
`## Guardrails` 에 `metrics:` 를 추가해 `duration`, `tokens-used` 등을 기록하고, 외부 모니터링(예: Datadog)으로 전송합니다.

    ## Guardrails
    - metrics: ["duration", "tokens-used"]
    - reviewers: ["team-lead"]

### 오류 재현 및 재시도 전략
`workflow_dispatch` 로 수동 트리거하여 동일 입력을 재현하고, `retry:` 옵션을 통해 자동 재시도를 구성합니다.

## 8. 베스트 프랙티스
1. **목표 선언을 구체적이고 제한적으로** 작성 – “`needs‑triage` 라벨을 붙인다”가 “라벨을 붙인다”보다 명확합니다.  
2. **작은 워크플로부터 시작** – 단일 이슈 라벨링 같은 간단한 시나리오로 검증 후 확장합니다.  
3. **팀 차원의 정책 수립** – 승인 흐름, 비용 한도, 사용 가능한 모델 버전을 문서화합니다.  
4. **커뮤니티와 피드백 루프 구축** – 프리뷰 피드백을 GitHub Discussions에 공유해 개선점을 수집합니다[[GitHub Discussions](https://github.com/github/agentic-workflows/discussions)].

### Workspace Layer for Cross‑Repo Automation

**출처**: [euno.news – “The missing workspace layer for agentic polyrepo development”](https://euno.news/posts/ko/the-missing-workspace-layer-for-agentic-polyrepo-d-e91551)  

#### 문제 개요
코딩 에이전트는 단일 레포에서 사양 → 기능 → PR까지의 흐름을 자연스럽게 처리합니다. 하지만 실제 엔드‑투‑엔드 기능 구현은 여러 레포에 걸쳐 작업해야 하는 경우가 대부분입니다. 이를 위해서는  
* 전체 레포에 걸친 아키텍처 이해  
* 모든 레포에서 동일한 기능 브랜치 유지  
* 크로스‑레포 테스트 및 검증  

이러한 작업을 수동으로 수행하면 컨텍스트 전환, 브랜치 관리, 터미널 전환 등 비효율이 발생합니다.

#### 워크스페이스 레이어 개념
Mars 라는 도구는 **모든 레포를 하나의 트리 아래에 두는 워크스페이스**를 정의합니다.

```
workspace/
├── .claude/          # or .cursor/, .aider.conf — any agent config
├── CLAUDE.md         # shared context: architecture, standards, patterns
├── mars.yaml         # workspace definition
└── repos/
    ├── backend-api/
    ├── frontend-app/
    ├── shared-lib/
    └── infra/
```

* 워크스페이스 루트에 있는 에이전트 설정이 **모든 레포에 상속**됩니다.  
* 아키텍처 개요, 코딩 표준, 서비스 관계 등을 한 번만 정의하면 각 레포가 자동으로 동일한 컨텍스트를 공유합니다.  

#### 주요 명령 예시

| 명령 | 설명 |
|------|------|
| `mars sync` | 모든 레포 최신 상태로 pull |
| `mars status` | 레포별 브랜치, 더러움, ahead/behind 상태를 한 표로 표시 |
| `mars branch feature-auth --tag backend` | `backend` 태그가 붙은 레포에만 브랜치 생성 |
| `mars exec "npm test" --tag frontend` | `frontend` 레포에만 테스트 실행 |
| `mars clone` | `mars.yaml`에 정의된 모든 레포를 복제 |

#### 태그 기반 필터링
`mars.yaml`에 레포별 **tags** 를 지정하면 `--tag` 옵션으로 서브셋을 쉽게 선택할 수 있습니다.

```yaml
repos:
  - url: git@github.com:org/frontend.git
    tags: [frontend, web]
  - url: git@github.com:org/backend-api.git
    tags: [backend, api, payments]
  - url: git@github.com:org/shared-lib.git
    tags: [shared, backend, frontend]
```

#### 다른 멀티‑레포 도구와 비교

| Tool | Language | Config | Approach |
|------|----------|--------|----------|
| git submodules | git | .gitmodules | Git‑native, 고정 커밋 |
| gita | Python | CLI | Python 필요 |
| myrepos | Perl | .mrconfig | 강력하지만 복잡 |
| meta | Node | meta.json | 플러그인 시스템 |
| **Mars** | Bash | mars.yaml | 태그 기반, 무의존성, 에이전트‑구성 워크스페이스 |

Mars는 **에이전트‑구성 공유**를 기본 설계에 포함시켜, 다중 레포에서 동일한 AI 컨텍스트를 자연스럽게 사용할 수 있게 합니다.

#### 설치 & 빠른 시작

```bash
npm install -g @dean0x/mars   # 또는
brew install dean0x/tap/mars
# 또는
curl -fsSL https://raw.githubusercontent.com/dean0x/mars/main/install.sh | bash
```

```bash
# 워크스페이스 초기화
mars init
# 레포 추가 (태그 권장)
mars add https://github.com/org/frontend.git --tags frontend
mars add https://github.com/org/backend.git  --tags backend
# 전체 복제 및 상태 확인
mars clone
mars status
```

#### 언제 사용하면 좋은가
* 여러 레포에 걸친 기능을 구현할 때  
* 코딩 에이전트가 **공유 컨텍스트**와 **조정된 작업**을 필요로 할 때  
* 기존 모노레포가 아닌 **폴리레포** 환경에서 일관된 CI/CD 파이프라인을 구축하고 싶을 때  

#### 사용을 피해야 할 경우
* 이미 단일 모노레포로 모든 코드가 관리되는 경우  
* 무거운 플러그인 생태계가 필요하고, Mars가 제공하는 단순성이 부족한 경우  

---

## 9. 한계와 향후 로드맵
### 현재 프리뷰에서 지원되지 않는 기능
- **멀티‑레포지토리 트랜잭션**: 현재는 단일 레포지토리 내에서만 동작합니다.  
- **실시간 비용 청구**: 비용 추적은 로그 기반이며, 자동 청구는 아직 제공되지 않습니다.

### 보안·프라이버시 고려 사항
AI 모델에 레포지토리 코드를 전송하기 때문에, 민감한 코드가 포함된 경우 모델 제공자의 데이터 정책을 반드시 검토해야 합니다.

### 예정된 기능 업데이트
- **멀티‑에이전트 협업**: 복수 에이전트가 단계별로 작업을 분담하는 기능이 예정됩니다.  
- **정책 기반 자동 승인**: 사전 정의된 정책에 부합하면 자동 병합을 허용하는 옵션이 추가될 예정입니다.

## 10. Claude 기반 Git 커밋 리뷰 자동화 (git‑lrc)

AI가 코드 생산을 가속화하지만, 코드 품질은 자동으로 확장되지 않습니다. **git‑lrc**는 스테이징된 모든 diff를 커밋 전에 AI가 리뷰하도록 강제하는 도구입니다. 별도 대시보드나 컨텍스트 전환 없이, Git 훅 수준에서 동작합니다.

### 핵심 동작 방식
1. `git commit` 실행 시 pre‑commit 훅이 스테이징된 diff를 AI(Gemini/Claude)에 전달  
2. AI가 인라인 코멘트로 위험한 변경점을 강조  
3. 개발자가 검토 후 커밋에 **어노테이션**을 부여  

### 커밋 어노테이션 체계
| 어노테이션 | 의미 |
|-----------|------|
| `[reviewed]` | 개발자가 AI 리뷰를 확인하고 승인 |
| `[vouched]` | 개발자가 변경 내용을 보증 |
| `[skipped]` | 의도적으로 리뷰 없이 커밋 |

이 결정은 git 로그에 영구 기록되어, 팀이 어떤 변경이 리뷰되었고 어떤 변경이 리뷰 없이 배포되었는지 추적할 수 있습니다.

### 설치 및 설정 (~60초)
```bash
# 전역 설치 – 머신의 모든 레포에 자동 적용
npm install -g git-lrc
git-lrc init --global
```

무료 티어 Gemini API 키를 사용하며, 좌석 기반 요금이 없습니다.

### CI/CD 통합
GitHub Actions에서 `git log --format=%s` 를 파싱해 `[skipped]` 비율이 임계값을 초과하면 워크플로를 실패시키는 정책을 적용할 수 있습니다.

*출처: git‑lrc 프로젝트, euno.news (2026‑02‑22)*

---

## 11. 사례 연구: AI 에이전트를 활용한 Gumroad 제품 출시 자동화

### 소개
지난 밤 우리는 인간이 기술 작업을 전혀 하지 않고 Gumroad에 제품을 출시하려고 시도했습니다. 세 명의 Claude 기반 AI 에이전트(菠萝, 小墩, 그리고 小默)에게 하나의 작업을 부여했습니다: 제품 페이지를 만들고, 파일을 업로드하고, 게시 버튼을 누르는 것. 우리는 약 90 % 정도 성공했습니다. 아래는 잘 된 점, 문제가 있었던 점, 그리고 자동화가 멈추는 지점에 대한 핵심 교훈입니다.

*(내용 생략 – 기존 문서와 동일)*

---

## 12. 결론
GitHub Agentic Workflows는 **AI 코딩 에이전트**를 기존 GitHub Actions와 자연스럽게 결합해 레포지토리 관리 작업을 선언형으로 자동화합니다. 이를 통해 팀은 **이슈 triage**, **CI 자동 복구**, **문서 동기화** 등 반복적인 업무를 최소화하고, 실제 개발에 더 많은 시간을 투자할 수 있습니다.

### 시작을 위한 체크리스트
- [ ] GitHub CLI와 Agentic Workflows 확장 설치  
- [ ] `.github/agentic-workflows/` 디렉터리 생성  
- [ ] 첫 번째 간단한 Outcome(예: 이슈 라벨링) 선언  
- [ ] 권한·시크릿 설정 및 가드레일 검토  
- [ ] 팀 리뷰 프로세스와 비용 한도 정책 정의  

### 추가 리소스
- 공식 GitHub Blog 포스트: *Automate repository tasks with GitHub Agentic Workflows*[[GitHub Blog](https://github.blog/ai-and-ml/automate-repository-tasks-with-github-agentic-workflows/)]  
- GitHub Docs – Agentic Workflows[[GitHub Docs](https://docs.github.com/en/actions/using-workflows/agentic-workflows)]  
- GitHub CLI Manual[[GitHub CLI Docs](https://cli.github.com/manual/)]  

GitHub Agentic Workflows를 활용해 레포지토리 자동화의 새로운 장을 열어보세요.

---

## 13. Stripe Minions: 엔드‑투‑엔드 AI 코딩 에이전트 사례

Stripe가 내부에서 개발한 **Minions**는 “원샷(one‑shot), end‑to‑end 코딩 에이전트” 시스템으로, 개발자가 태스크를 한 번 정의하면 AI가 전체 개발 흐름을 자동으로 수행합니다. 2026년 2월 기준, Stripe는 **주당 1,000개 이상의 Pull Request**를 Minions를 통해 자동으로 병합하고 있습니다.

### 13.1 Minions 개요
- **원샷 모델**: 엔지니어가 Slack에서 `@minion` 을 태그하면, Minion이 즉시 개발 환경을 스핀업하고, 코드를 작성·테스트·PR 제출까지 전 과정을 수행합니다.  
- **핵심 흐름**  
  1. 엔지니어가 Slack에 작업 요청(예: “새 결제 플러그인 구현”)을 남김  
  2. Minion이 컨테이너 기반 개발 환경을 생성하고, 요구사항에 맞는 코드를 생성  
  3. 자동 테스트 스위트를 실행하고, 모든 테스트를 통과하면 PR을 생성  
  4. 인간 리뷰어가 최종 검토 후 병합  

> **출처**: Stripe Blog, “Minions: Stripe’s one‑shot, end‑to‑end coding agents” (2026‑02‑09) – Alistair Gray, Leverage 팀 소프트웨어 엔지니어.

### 13.2 코드 자동 생성·검증 파이프라인
| 단계 | 설명 | 사용 기술 |
|------|------|-----------|
| **요구사항 파싱** | Slack 메시지 → 구조화된 작업 정의 (JSON) | OpenAI/Claude LLM, Slack API |
| **환경 스핀업** | 격리된 컨테이너(또는 devcontainer)에서 코드 작성 | Docker, GitHub Codespaces |
| **코드 생성** | LLM이 파일·함수·테스트 코드 전부 생성 | Claude 2.1, Few‑shot 프롬프트 |
| **자동 테스트** | 생성된 테스트를 실행, 커버리지 확인 | Jest / PyTest / Go test |
| **PR 제출** | 테스트 통과 시 자동 PR 생성, 리뷰어 지정 | GitHub API, `gh` CLI |
| **자동 병합** | 사전 정의된 가드레일(예: 100% 테스트 통과, 보안 스캔 통과) 만족 시 자동 병합 | GitHub Branch Protection Rules |

Minions는 **LLM‑기반 코드 생성**과 **GitHub Actions 기반 검증**을 하나의 흐름으로 결합해, 인간이 직접 코드를 작성하고 검증하는 시간을 크게 단축합니다.

### 13.3 LLM‑기반 에이전트와 GitHub Actions 연동
1. **Minion 워크플로 정의** – `.github/workflows/minion.yml` 파일에 `on: workflow_dispatch` 로 수동 혹은 Slack webhook 트리거를 연결합니다.  
2. **시크릿 관리** – `MINION_API_KEY` 와 `GITHUB_TOKEN` 을 GitHub Secrets에 저장합니다.  
3. **액션 단계**  
   ```yaml
   steps:
     - name: Checkout
       uses: actions/checkout@v3
     - name: Run Minion
       env:
         MINION_API_KEY: ${{ secrets.MINION_API_KEY }}
       run: |
         curl -X POST https://minion.stripe.dev/run \
           -H "Authorization: Bearer $MINION_API_KEY" \
           -d '{"task":"implement-payment-webhook"}'
     - name: Wait for PR
       uses: stripe/minion-wait-action@v1
       with:
         timeout: 300
   ```
4. **가드레일 적용** – PR 생성 후 `required-status-checks` 에 `minion-tests` 와 `security-scan` 을 추가해 자동 병합을 제한합니다.

### 13.4 배포·운영 시 고려사항
| 고려사항 | 설명 |
|----------|------|
| **보안** | LLM에 전달되는 코드·요구사항은 민감 정보가 포함될 수 있음. 최소 권한 원칙을 적용하고, Stripe 내부 정책에 따라 데이터 보관 및 삭제를 관리해야 함. |
| **비용** | Minion 실행은 컨테이너 비용과 LLM 호출 비용이 발생. `max-runtime` 과 `cost-budget` 파라미터를 설정해 비용 초과를 방지. |
| **품질 보증** | 자동 테스트 외에도 정적 분석(SAST)·보안 스캔을 필수 체크로 지정. |
| **인간 검토** | 자동 병합 전 반드시 최소 1명의 엔지니어 리뷰를 요구하도록 `reviewers` 를 설정. |
| **모니터링** | Minion 실행 로그를 CloudWatch 또는 Datadog에 전송해 성공/실패 메트릭을 수집하고, 알림을 설정. |

### 13.5 실제 적용 예시
Stripe 내부에서는 **결제 플러그인** 개발, **대시보드 UI** 업데이트, **내부 SDK** 버전 업그레이드 등 다양한 작업에 Minions를 활용하고 있습니다. 결과적으로 평균 PR 사이클 타임이 **30분**에서 **5분** 수준으로 단축되었으며, 주당 1,000개 이상의 PR이 자동으로 병합되고 있습니다.

---

> **요약**: Stripe Minions는 LLM 기반 코딩 에이전트를 GitHub Actions와 결합해 전체 개발 파이프라인을 자동화하는 실전 사례입니다. 이 패턴을 우리 조직의 **GitHub Agentic Workflows**에 적용하면, 코드 생성·검증·병합까지의 흐름을 최소 인적 개입으로 구현할 수 있습니다.