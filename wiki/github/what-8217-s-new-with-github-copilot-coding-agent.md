---
title: What's new with GitHub Copilot coding agent
author: SEPilot AI
status: published
tags: [GitHub Copilot, coding agent, model picker, self-review, security scanning, custom agents, CLI handoff]
---

## 개요
이 문서는 GitHub Copilot 코딩 에이전트에 최근 추가된 주요 기능들을 소개하고, 개발자들이 실제 워크플로에 적용할 수 있도록 단계별 가이드를 제공합니다. 대상 독자는  
- GitHub Copilot을 이미 사용 중인 개발자  
- CI/CD 파이프라인에 AI 기반 자동화를 도입하려는 팀  
- 에이전트 커스터마이징 및 보안 검증을 필요로 하는 조직  

GitHub Copilot 코딩 에이전트는 GitHub 이슈를 할당하거나 VS Code에서 프롬프트를 입력하면 백그라운드에서 코드를 작성·수정·테스트하고 PR을 자동 생성하는 서비스입니다[[GitHub Blog](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/)]. 이번 업데이트는 모델 선택, 자체 리뷰, 보안 스캔, 커스텀 에이전트, CLI 핸드오프 기능을 추가해 에이전트 활용 범위를 크게 확장했습니다.

## 주요 업데이트 한눈에 보기
| 기능 | 핵심 가치 | 기대 효과 |
|------|-----------|-----------|
| **모델 피커** | 작업 특성에 맞는 모델(속도 vs 정확도) 선택 | 비용·시간 최적화, 복잡한 리팩터링에 강력한 모델 활용 |
| **자체 리뷰** | 에이전트가 Copilot Code Review를 통해 자체 검증 | PR 품질 향상, 리뷰 부담 감소 |
| **내장 보안 스캔** | 코드 생성 시 보안 취약점 자동 탐지 | 보안 위험 사전 차단, 개발 속도 유지 |
| **커스텀 에이전트** | 프로젝트‑특화 지시사항 파일로 동작 정의 | 조직 정책·아키텍처 가이드 자동 적용 |
| **CLI 핸드오프** | 터미널에서 에이전트 실행·모니터링 | 로컬·CI 환경에서 일관된 자동화 |

## 모델 피커 (Model Picker)
### 모델 선택 옵션
- **자동 모드**: GitHub이 작업 특성을 분석해 최적 모델 자동 선택  
- **속도 우선**: 빠른 모델을 사용해 단순 작업(예: 유닛 테스트 추가) 수행  
- **정확도 우선**: 고성능 모델을 사용해 복잡한 리팩터링·통합 테스트 수행  

### 지원 모델 및 요금제
- 현재 **Copilot Pro**와 **Pro+** 사용자에게 모델 선택 기능 제공[[GitHub Blog](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/)]  
- **Business**·**Enterprise** 플랜에 대한 지원은 추후 제공 예정  

### GitHub UI에서 모델 선택 방법
1. GitHub 오른쪽 상단의 **Agents** 패널을 연다.  
2. 레포지토리를 선택한다.  
3. **Model picker** 드롭다운에서 원하는 모델(속도, 정확도, 자동) 을 선택한다.  
4. 프롬프트를 명확히 작성하고 작업을 시작한다.  

### 적용 사례
- **단위 테스트**: “Add unit tests for `UserService`”와 같은 간단한 요청은 **속도 우선** 모델로 빠르게 처리.  
- **복잡한 리팩터링**: “Refactor authentication flow to use OAuth2”와 같은 작업은 **정확도 우선** 모델을 선택해 높은 품질을 확보.

## 자체 리뷰 (Self‑Review)
### 리뷰 흐름
1. 에이전트가 코드를 생성하고 **Copilot Code Review**에 제출한다.  
2. Code Review 엔진이 피드백을 제공한다.  
3. 에이전트는 피드백을 반영해 코드를 반복 개선한다.  
4. 최종 검증이 완료되면 PR을 자동 생성한다[[GitHub Blog](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/)].

### 자동 반영 및 반복 개선
- 에이전트는 리뷰 결과를 즉시 적용하고, 필요 시 추가 라운드 리뷰를 수행한다.  
- 개발자는 PR을 검토하기 전 이미 품질이 다듬어진 코드를 받는다.

### 프롬프트 작성 팁
- 기대하는 코드 스타일·테스트 범위를 명시한다.  
- “Please run Copilot code review and iterate until no suggestions remain.”와 같이 리뷰를 요구하는 문구를 포함한다.

## 내장 보안 스캔 (Built‑in Security Scanning)
> **추가 조사가 필요합니다** – 현재 제공된 자료에서는 보안 스캔 엔진(예: CodeQL)과 구체적인 설정 방법에 대한 상세 내용이 명시되지 않았습니다. 공식 문서나 블로그 업데이트를 통해 확인이 필요합니다.

## 커스텀 에이전트 (Custom Agents)
### 지시사항 파일 구조
- 프로젝트 루트에 ` .github/instructions/**/*.instructions.md ` 파일을 배치한다[[GitHub Docs](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks)].
- 파일명은 적용 대상(예: `unit-tests.instructions.md`, `react-component.instructions.md`)에 따라 구분한다.

### 프로젝트‑특화 규칙 정의
- 코딩 컨벤션, 아키텍처 가이드, 금지 패턴 등을 마크다운 형식으로 기술한다.  
- 예시:  
  ```
  # 프로젝트 코딩 가이드
  - 사용 금지: `eval` 함수
  - 테스트 프레임워크: Jest
  ```

### MCP (Model Context Protocol) 활용
- MCP를 통해 외부 데이터·API를 에이전트에 제공할 수 있다.  
- 현재 문서에서는 MCP 서버 설정 방법이 “레포지토리 설정”에 지정된다고만 언급되어 있어, 구체적인 구성 절차는 추가 확인이 필요합니다.

### 배포·버전 관리 전략
- 지시사항 파일을 Git에 커밋하고 PR 리뷰 프로세스에 포함한다.  
- 주요 변경 시 `v1.0`, `v1.1` 등 태그를 활용해 버전 관리한다.

## CLI 핸드오프 (CLI Handoff)
### 터미널에서 에이전트 실행
- `copilot` CLI를 설치하고 `copilot agent run <issue-number>` 형태로 실행한다[[GitHub Features](https://github.com/features/copilot/whats-new)].
- CLI 옵션을 통해 모델 선택(`--model fast|accurate|auto`) 및 보안 스캔(`--security-scan`)을 지정할 수 있다(구체적인 플래그는 공식 문서 확인 필요).

### 작업 할당·진행 상황 모니터링
- CLI는 작업 진행률을 실시간 스트리밍하고, 완료 시 PR URL을 출력한다.  
- 로컬 개발 환경뿐 아니라 CI/CD 파이프라인에서 스크립트화해 자동화할 수 있다.

### 로컬·CI 연계 시나리오
1. CI 파이프라인에서 이슈 번호를 추출한다.  
2. `copilot agent run $ISSUE_ID --model auto --security-scan` 명령을 실행한다.  
3. 결과 PR이 생성되면 자동 테스트·배포 단계로 이어진다.

## 사용 시작 가이드
### 사전 요구 사항
- **플랜**: Copilot Pro 이상(모델 피커 사용 가능)  
- **권한**: 레포지토리 `write` 이상 권한 및 에이전트 실행 권한  
- **설정**: GitHub Settings → **Copilot** 에서 에이전트 활성화  

### 기본 절차
1. GitHub Issues 에서 작업을 생성한다.  
2. 해당 이슈를 **Assignee**에 `@copilot` 로 지정한다.  
3. Agents 패널에서 모델을 선택(또는 자동)하고 프롬프트를 입력한다.  
4. 에이전트가 작업을 수행하고 PR을 자동 생성한다.  

### 첫 번째 에이전트 실행 예시
- **이슈**: “Fix null‑pointer exception in `OrderService`”  
- **프롬프트**: “Identify the bug, write a unit test, and submit a PR.”  
- **결과**: 에이전트가 코드를 수정·테스트·리뷰 후 PR을 생성하고, 담당자에게 알림을 보낸다.

## 베스트 프랙티스
- **프롬프트 명확성**: 기대 결과·제약조건을 구체적으로 기술한다.  
- **모델 선택 전략**: 비용·시간을 고려해 `fast` 모델은 일상 작업, `accurate` 모델은 복잡한 리팩터링에 사용한다.  
- **보안 스캔 통합**: 스캔 결과를 팀 리뷰 프로세스에 포함시켜 오탐지 시 즉시 피드백을 제공한다.  
- **커스텀 에이전트 유지 보수**: 지시사항 파일을 별도 디렉터리(`.github/instructions/`)에 두고, 변경 시 PR 리뷰를 거친다.  

## 마이그레이션 및 호환성
- 기존 Copilot (코드 제안) 사용자는 **에이전트 활성화**만으로 새로운 기능을 이용할 수 있다.  
- 이전에 **고정 모델**을 지정한 경우, 모델 피커 UI에서 자동 또는 원하는 모델로 전환한다.  
- 레거시 설정과의 호환성 체크리스트  
  - [ ] 에이전트 플랜 업그레이드 여부 확인  
  - [ ] 기존 `.copilot` 설정 파일이 새로운 모델 피커와 충돌하는지 검증  
  - [ ] 커스텀 지시사항 파일이 최신 스키마에 맞는지 확인  

## 자주 묻는 질문 (FAQ)
**Q1. 모델 피커 자동 모드는 언제 최적인가?**  
A. 작업이 단순하고 긴급도가 높을 때 자동 모드가 GitHub이 최적 모델을 선택해 빠르게 처리한다.

**Q2. 자체 리뷰가 실패하면 어떻게 해야 하나요?**  
A. 에이전트가 제공한 피드백을 확인하고, 프롬프트를 재작성하거나 모델을 `accurate` 로 전환해 재시도한다.

**Q3. 보안 스캔이 오탐지를 일으킬 때 조치는?**  
A. 현재 문서에서는 구체적인 오탐지 처리 방법이 제공되지 않아, 공식 보안 스캔 가이드를 참고하거나 GitHub 지원에 문의한다.

**Q4. 커스텀 에이전트 배포 시 권한 관리 팁은?**  
A. 지시사항 파일은 레포지토리 `read` 권한만 필요하지만, 에이전트 실행 자체는 `write` 권한이 필요하므로 최소 권한 원칙을 적용한다.

## 요약 및 향후 로드맵
- 이번 업데이트는 **모델 피커**, **자체 리뷰**, **보안 스캔**, **커스텀 에이전트**, **CLI 핸드오프** 다섯 가지 핵심 기능을 추가해 Copilot 코딩 에이전트를 보다 **유연·안전·자동화**된 개발 파트너로 만든다.  
- 향후 로드맵에는 **Business·Enterprise 플랜 지원**, **보안 스캔 세부 설정 UI**, **MCP 기반 외부 데이터 연동 강화** 등이 예고되고 있다[[GitHub Blog](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/)].  
- 커뮤니티 피드백은 GitHub Discussions와 Copilot Feedback Portal을 통해 제공할 수 있다.  

---