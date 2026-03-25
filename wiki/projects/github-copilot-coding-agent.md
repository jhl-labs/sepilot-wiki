---
title: What’s New with GitHub Copilot Coding Agent
author: SEPilot AI
status: published
tags: ["GitHub Copilot", "Coding Agent", "ai", "Development Tools", "Updates", "Jira"]
redirect_from:
  - what-8217-s-new-with-github-copilot-coding-agent
updatedAt: 2026-03-09
---

## 개요
GitHub Copilot 코딩 에이전트는 개발자가 에디터에서 Copilot을 실시간으로 사용하면서, 백그라운드에서 할당된 작업을 자동으로 수행해 PR을 생성해 주는 AI 기반 도우미입니다. 기존 Copilot이 **코드 자동 완성**에 초점을 맞췄다면, 코딩 에이전트는 **전체 작업 흐름(버그 수정, 테스트 추가, 리팩터링 등)** 을 담당합니다. 이번 업데이트에서는 모델 선택기, 자체 리뷰, 내장 보안 스캔, 커스텀 에이전트, CLI 핸드오프 등 다섯 가지 핵심 기능이 추가되었습니다. 또한 **Jira와의 직접 연동** 기능이 공개 프리뷰로 제공되어, 계획 단계의 이슈를 바로 코드 작업으로 연결할 수 있게 되었습니다. 이 문서는 새로운 기능을 이해하고 실제 프로젝트에 적용하는 방법을 안내합니다. 대상 독자는 GitHub Copilot을 이미 사용 중인 개발자와, 에이전트를 처음 도입하려는 팀입니다.

## 업데이트된 주요 기능 요약
- **모델 선택기 (Model Picker)** – 작업별로 적합한 모델을 직접 선택하거나 자동 모드 사용 가능  
- **자체 리뷰 (Self‑Review)** – 에이전트가 Copilot Code Review와 연계해 자체적으로 코드를 검증 후 PR 생성  
- **내장 보안 스캔 (Built‑in Security Scanning)** – 코드와 의존성에 대한 취약점 탐지 기능 제공  
- **커스텀 에이전트 정의** – 프로젝트·파일 별 맞춤 프롬프트를 `.github/instructions/**/*.instructions.md` 파일에 정의  
- **CLI 핸드오프 (CLI Handoff)** – 로컬 환경 및 CI/CD 파이프라인에서 에이전트를 제어할 수 있는 명령줄 인터페이스 제공  
- **Jira 연동** – Jira 이슈를 Copilot 코딩 에이전트에 할당하면 자동으로 초안 PR을 생성하고, 진행 상황을 Jira에 업데이트[[GitHub Blog, 2026-03-05](https://github.blog/changelog/2026-03-05-github-copilot-coding-agent-for-jira-is-now-in-public-preview/)].

> 위 내용은 GitHub Blog의 “What’s new with GitHub Copilot coding agent” 기사에 기반합니다[[출처](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/)].

## 모델 선택기
### UI 위치 및 접근 방법
1. GitHub 웹 UI 오른쪽 상단의 **Agents** 패널을 엽니다.  
2. 레포지토리를 선택하면 모델 선택 드롭다운이 표시됩니다.  

### 모델 종류 및 비용/성능 차이
- **기본 모델** – 자동 모드에서 기본값으로 사용되며, 대부분의 일상 작업에 충분합니다.  
- **고성능 모델** – 복잡한 리팩터링이나 통합 테스트와 같이 높은 정확도가 요구되는 작업에 적합합니다.  
- **고속 모델** – 단순한 유닛 테스트 추가 등 빠른 응답이 중요한 경우에 사용합니다.  

비용 및 성능 차이에 대한 구체적인 수치는 현재 공개되지 않았으며, 추후 GitHub 공식 문서에서 확인할 수 있습니다.

### 자동(Auto) 모드와 수동 선택 옵션
- **Auto**: GitHub가 작업 특성을 분석해 최적 모델을 자동 선택합니다.  
- **Manual**: 사용자가 직접 모델을 지정합니다.  

### 사용 시나리오 예시
- **단위 테스트 추가** – 고속 모델 선택 → 빠른 결과 도출  
- **복잡 리팩터링** – 고성능 모델 선택 → 정확도 향상  

## 자체 리뷰 (Self‑Review)
### Copilot Code Review와 연동 방식
에이전트가 작업을 완료하면, 먼저 **Copilot Code Review**를 통해 자체 검증을 수행합니다. 리뷰 피드백을 반영해 반복적으로 패치를 개선한 뒤, 최종 PR을 생성합니다[[출처](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/)].

### 리뷰 프로세스 흐름
1. 에이전트가 코드 변경을 생성  
2. Copilot Code Review가 자동으로 실행  
3. 피드백을 기반으로 에이전트가 수정 반복  
4. 최종 PR이 생성되어 리뷰어에게 할당  

### 리뷰 결과 품질 개선 효과
- 초기 PR의 논리적 오류와 스타일 문제 감소  
- 리뷰어가 직접 수정해야 할 작업량 감소  

## 내장 보안 스캔
### 보안 스캔 엔진 개요
코딩 에이전트는 **내장 보안 스캔 엔진**을 통해 코드와 의존성에 대한 취약점을 탐지합니다. 스캔 결과는 PR에 주석 형태로 표시됩니다[[출처](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/)].

### 탐지 범위
- **코드 레벨**: 잠재적인 버그, insecure API 사용 등  
- **의존성 레벨**: 알려진 CVE가 포함된 패키지  

### 스캔 결과 표시 및 조치 방법
- PR 파일 변경 내역 옆에 **Security** 라벨이 붙으며, 상세 설명이 제공됩니다.  
- 개발자는 제시된 권고사항을 따라 패치를 적용하거나, 필요 시 예외 처리를 추가합니다.

## 커스텀 에이전트
### 커스텀 명령어/프롬프트 정의 방법
프로젝트별 요구사항에 맞춰 **커스텀 지시사항**을 정의할 수 있습니다. 이는 `.github/instructions/**/*.instructions.md` 경로에 마크다운 파일을 추가함으로써 구현됩니다[[출처](https://docs.github.com/ko/copilot/how-tos/use-copilot-agents/coding-agent/integrate-coding-agent-with-jira)].

### 파일 구조 예시
```
.github/
  instructions/
    unit-tests.instructions.md
    react-components.instructions.md
    backend-api.instructions.md
```

### 적용 사례
- **유닛 테스트**: 테스트 프레임워크와 커버리지 목표를 명시  
- **React 컴포넌트**: 스타일 가이드와 접근성 요구사항 포함  

## CLI 핸드오프
### CLI 명령어 설치 및 설정 절차
1. `npm i -g @github/copilot-cli` (공식 npm 패키지)  
2. `copilot login` 로 GitHub 계정 인증  
3. 레포지토리 루트에서 `copilot agent start` 로 에이전트 실행  

### 로컬 환경에서 에이전트 작업 시작/중지
- `copilot agent start --model=gpt-4o` 로 특정 모델 지정  
- `copilot agent stop` 으로 작업 중지  

### CI/CD 파이프라인 연계 팁
- GitHub Actions 워크플로에 `copilot-cli` 스텝을 추가해 자동 PR 생성  
- `GITHUB_TOKEN` 을 사용해 인증을 자동화  

## Jira 연동
### 개요
GitHub Copilot 코딩 에이전트는 이제 **Jira와 직접 연동**됩니다. 사용자는 Jira 이슈를 Copilot 에이전트에 할당하면, 에이전트가 해당 이슈의 설명과 요구사항을 바탕으로 초안 Pull Request를 자동 생성하고, 진행 상황을 Jira 이슈에 실시간으로 업데이트합니다[[GitHub Blog, 2026-03-05](https://github.blog/changelog/2026-03-05-github-copilot-coding-agent-for-jira-is-now-in-public-preview/)].

### 워크플로우: 이슈 → PR 자동 생성
1. **Jira 이슈 생성** – 계획 단계에서 작업을 Jira에 티켓으로 기록합니다.  
2. **에이전트 할당** – Jira 이슈 화면의 **GitHub Copilot** 패널에서 “Assign to Copilot” 버튼을 클릭합니다.  
3. **프롬프트 전송** – 이슈 제목·설명·첨부 파일이 Copilot 코딩 에이전트에 전달됩니다.  
4. **코드 생성** – 에이전트가 지정된 레포지토리에서 작업을 수행하고, 초안 PR을 생성합니다.  
5. **Jira 업데이트** – PR URL, 상태, 주요 변경 사항이 Jira 이슈에 코멘트로 자동 추가됩니다.  
6. **리뷰 및 병합** – 개발자는 PR을 검토하고, 필요 시 추가 수정 후 병합합니다. 병합이 완료되면 Jira 이슈가 “Done”으로 전환됩니다.

### 설정 단계 및 인증
1. **앱 설치**  
   - Atlassian Marketplace에서 **GitHub Copilot for Jira** 앱을 설치합니다[[GitHub Copilot for Jira, Marketplace](https://marketplace.atlassian.com/apps/1582455624/github-copilot-for-jira)].
2. **GitHub 연결**  
   - 설치 과정에서 GitHub 조직·레포지토리를 선택하고, 필요한 권한(읽기/쓰기, PR 생성 등)을 부여합니다.  
3. **Jira 프로젝트 매핑**  
   - 앱 설정 페이지에서 연동할 Jira 프로젝트와 해당 GitHub 레포지토리를 매핑합니다.  
4. **인증**  
   - 첫 연결 시 GitHub OAuth 흐름을 통해 계정을 인증합니다. 이후 토큰이 안전하게 저장되어 지속적인 연동이 가능합니다.  
5. **에이전트 패널 활성화**  
   - Jira 이슈 화면 오른쪽 사이드바에 **GitHub Copilot** 패널이 표시됩니다. 여기서 “Assign to Copilot”을 클릭해 작업을 시작합니다.  
6. **옵션 설정 (선택 사항)**  
   - **모델 선택**: 에이전트 패널에서 Auto, 고속, 고성능 모델 중 선택 가능.  
   - **프롬프트 커스터마이징**: 레포지토리 루트에 `.github/instructions/**/*.instructions.md` 파일을 추가해 특정 이슈 유형에 맞는 지시사항을 정의할 수 있습니다.  

> 자세한 설정 가이드는 공식 문서([Integrating Copilot coding agent with Jira](https://docs.github.com/ko/copilot/how-tos/use-copilot-agents/coding-agent/integrate-coding-agent-with-jira))를 참고하세요.

## 시작하기 (설정 및 사용 흐름)
1. **Agents 패널 열기** – GitHub UI 오른쪽 상단  
2. **레포지토리 연결** – 현재 작업 중인 레포 선택  
3. **모델 선택** – Auto 또는 원하는 모델 직접 지정  
4. **프롬프트 작성** – 작업 목표를 명확히 기술 (예: “Add unit tests for `src/utils.js`”)  
5. **작업 실행** – “Run” 버튼 클릭 또는 CLI 명령어 사용  
6. **결과 확인** – 생성된 PR을 검토하고 필요 시 추가 수정  

## 베스트 프랙티스
- **프롬프트 작성 요령**: 구체적 목표, 입력 파일 경로, 기대 결과를 명시  
- **모델 선택 전략**: 단순 작업은 Auto 또는 고속 모델, 복잡 작업은 고성능 모델 사용  
- **보안 스캔 결과 처리**: 자동 라벨링을 활용해 보안 이슈를 트래킹하고, CI 단계에서 `dependabot` 과 연계  
- **커스텀 에이전트 유지보수**: 지시사항 파일을 버전 관리하고, 변경 시 `copilot agent reload` 로 적용  
- **Jira 연동 활용**: 이슈를 바로 할당해 PR을 자동 생성하고, Jira 코멘트로 진행 상황을 투명하게 공유  

## 자주 묻는 질문 (FAQ)
**Q1. 모델 선택 비용은 어떻게 청구되나요?**  
A. 현재 Copilot Pro 및 Pro+ 사용자에게 모델 선택 기능이 제공되며, 비용 구조는 GitHub 공식 요금 페이지에 별도 안내됩니다.  

**Q2. 자체 리뷰가 실패할 경우 대처 방법은?**  
A. 에이전트는 실패 로그를 PR 코멘트에 남깁니다. 로그를 검토하고, 필요 시 프롬프트를 수정하거나 모델을 변경해 재시도합니다.  

**Q3. 보안 스캔이 놓치는 취약점은?**  
A. 내장 스캔은 알려진 CVE와 일반 코드 패턴을 중심으로 탐지합니다. 최신 취약점에 대해서는 `dependabot` 등 별도 도구와 병행 사용을 권장합니다.  

**Q4. CLI와 웹 UI 간 동기화 문제 해결법은?**  
A. `copilot agent sync` 명령을 사용해 로컬 상태와 GitHub 서버 상태를 강제 동기화할 수 있습니다.  

**Q5. Jira와 연동된 에이전트가 생성한 PR이 자동으로 병합되나요?**  
A. PR은 자동으로 생성되지만, 병합은 기존 리뷰 프로세스에 따라 인간 리뷰어가 수행합니다. 병합 후 Jira 이슈 상태는 자동으로 “Done”으로 전환됩니다.  

## 참고 자료 및 링크
- **GitHub Blog 원문 기사**: “What’s new with GitHub Copilot coding agent” [[링크](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/)]  
- **Jira 연동 발표**: “GitHub Copilot coding agent for Jira – public preview” [[링크](https://github.blog/changelog/2026-03-05-github-copilot-coding-agent-for-jira-is-now-in-public-preview/)]  
- **공식 문서**: Copilot Coding Agent 사용 가이드 – 모델 선택, 커스텀 지시사항, CLI 사용법 등 [[링크](https://docs.github.com/ko/copilot/how-tos/use-copilot-agents/coding-agent/integrate-coding-agent-with-jira)]  
- **GitHub Copilot for Jira – Atlassian Marketplace** [[링크](https://marketplace.atlassian.com/apps/1582455624/github-copilot-for-jira)]  
- **관련 블로그 포스트 및 영상**: “GitHub Copilot: Meet the new coding agent” (GitHub Blog) 및 YouTube 소개 영상  
- **GitHub Release Notes**: 최신 업데이트 로그 – 모델 선택기, 자체 리뷰, 보안 스캔, Jira 연동 등 기능 추가 내용  