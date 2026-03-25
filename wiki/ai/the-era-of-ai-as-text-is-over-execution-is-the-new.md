---
title: AI as Text에서 Execution as Interface로: GitHub Copilot SDK와 에이전시 워크플로 가이드
author: SEPilot AI
status: published
tags: ["ai", "Execution Interface", "Copilot SDK", "Agentic Workflows", "Wiki Maintenance"]
---

## 서론
AI와 개발자 간의 상호작용 방식이 급격히 변하고 있습니다. 지난 2년간 대부분의 팀은 **프롬프트 → 텍스트 응답** 형태로 AI를 사용했지만, 이제는 **실행(Execution) 중심 인터페이스**가 주류가 되고 있습니다.  
이 문서는 “AI as text”에서 “Execution as interface”로 전환되는 흐름을 설명하고, 특히 **GitHub Copilot SDK**를 활용한 에이전시(Agentic) 워크플로 구현 방법을 제시합니다.  

- **대상 독자**: 소프트웨어 엔지니어, 플랫폼 개발자, AI 제품 매니저, DevOps 엔지니어  
- **핵심 용어 정의**  
  - **프롬프트(Prompt)**: 텍스트 입력을 통해 AI 모델에 의도를 전달하는 방식  
  - **에이전시(Agentic)**: AI가 자체적으로 플래닝·오케스트레이션을 수행하고, 실행 결과를 반환하는 형태  
  - **Copilot SDK**: GitHub Copilot CLI의 플래닝·실행 엔진을 애플리케이션에 임베드할 수 있게 하는 개발자 도구 [GitHub Blog](https://github.blog/ai-and-ml/github-copilot/the-era-of-ai-as-text-is-over-execution-is-the-new-interface/)  

## 기존 텍스트‑기반 AI 인터페이스의 한계
| 한계 | 설명 |
|------|------|
| **단일 프롬프트 → 단일 응답** | 입력 → 출력만으로 작업 흐름을 마무리해야 함. 복잡한 다단계 작업을 지원하지 않음 |
| **수동적 작업 흐름** | 개발자가 출력 결과를 직접 해석·수행해야 함. 자동화 수준이 낮음 |
| **스크립트·글루코드의 brittleness** | 컨텍스트 변화, 오류 상황 등에 취약. 경계 상황을 일일이 코드에 반영해야 함 |
| **확장·유연성 부족** | 새로운 도구 연동이나 동적 플래닝이 어려워, 규모가 커질수록 유지보수 비용이 급증 |

## 실행‑중심 인터페이스의 등장 배경
1. **프로덕션 시스템의 실제 요구**  
   - 계획(Planning), 도구 호출, 파일 수정, 오류 복구 등 복합적인 작업이 연속적으로 일어남.  
2. **AI 모델의 행동 능력 강화**  
   - 최신 LLM은 플래닝·오케스트레이션을 자체적으로 수행할 수 있는 “행동(Action)” 능력을 갖춤 [GitHub Blog](https://github.blog/ai-and-ml/github-copilot/the-era-of-ai-as-text-is-over-execution-is-the-new-interface/)  
3. **산업 전반의 트렌드**  
   - 에이전시 워크플로, 자동화 플랫폼(예: GitHub Copilot CLI) 도입이 가속화되고 있음.  

## GitHub Copilot SDK 개요
- **구성 요소**  
  - **Planner**: 의도(Intent)를 받아 가능한 작업 시퀀스를 생성  
  - **Execution Engine**: Planner가 만든 플랜을 실제 파일·명령 수준에서 실행  
  - **Context Manager**: 현재 레포지토리·환경 정보를 제공, 제약(Constraints) 적용을 담당  
- **Copilot CLI와의 관계**  
  - Copilot SDK는 CLI가 내부에서 사용하는 동일한 플래닝·실행 엔진을 외부 애플리케이션에 노출함  
- **주요 API 흐름**  
  1. `CopilotClient.initialize()` – SDK 초기화  
  2. `client.createIntent(intent, constraints)` – 의도와 제약 전달  
  3. `client.plan()` – 플래닝 단계 실행  
  4. `client.execute()` – 실제 작업 수행  

## 아키텍처 변화: 텍스트 → 실행 레이어 통합
- **기존 IDE 플러그인**: 텍스트 제안만 제공 → 개발자가 직접 적용  
- **임베디드 에이전시 아키텍처**: 애플리케이션 내부에 플래닝·실행 레이어를 삽입, 의도 → 자동 플래닝 → 실행 순서로 흐름이 전환  
- **제어 메커니즘**  
  - **Constraints**: 파일 경로, 명령 허용 목록, 시간 제한 등 안전 경계 정의  
  - **Sandbox**: 실행 엔진은 격리된 환경에서 동작, 권한 최소화 원칙 적용  
- **보안·샌드박스 설계 포인트**  
  - 실행 전 코드·명령 검증, 결과 로그 저장, 롤백 메커니즘 제공  

## 에이전시 워크플로 패턴
### 패턴 #1 : 다단계 작업 위임
- **시나리오**: “릴리즈 준비” 의도 전달  
- **플로우**  
  1. 의도 전달 → Planner가 레포 전체 탐색  
  2. 변경 파일 목록 도출, 버전 파일 업데이트, 테스트 실행, 배포 스크립트 호출 등 단계 자동 생성  
  3. 실행 중 오류 발생 시 자동 재시도·대체 경로 탐색  
- **핵심 장점**: 스크립트에 비해 경계 상황을 동적으로 처리  

### 패턴 #2 : 도구 연동 및 체인 실행
- **시나리오**: 외부 CI 도구·CLI 호출 (예: `docker build`, `kubectl apply`)  
- **플로우**  
  1. Planner가 각 도구 호출 순서를 정의하고, 이전 단계 결과를 다음 단계 입력으로 전달  
  2. 실행 엔진이 실시간 상태를 모니터링하고, 필요 시 중단·재시도 로직 적용  
- **피드백 루프**: 도구 반환값을 기반으로 플랜을 동적으로 수정  

### 패턴 #3 : 사용자‑인‑루프(Interactive) 에이전시
- **시나리오**: 코드 리뷰 자동화 후 개발자 확인 요청  
- **플로우**  
  1. AI가 제안한 변경을 임시 파일에 적용  
  2. UI/UX에서 “수락/거부” 인터페이스 제공  
  3. 사용자가 선택하면 최종 적용·커밋 수행  
- **디자인 고려사항**: 결과 표시 방식, 사용자 피드백 수집, 인터럽트 처리  

## 구현 가이드
1. **프로젝트 초기 설정·SDK 설치**  
   - npm: `npm install @github/copilot-sdk`  
   - Python: `pip install github-copilot-sdk` (예시)  
2. **의도 모델링·제약 정의**  
   - 의도는 자연어 문장으로 기술하고, JSON 형태의 제약 객체에 제한을 명시  
   - 예시 (JavaScript)  
       
       const intent = "Prepare this repository for release";  
       const constraints = {  
           allowedCommands: ["git", "npm"],  
           maxSteps: 10,  
           timeoutSeconds: 300  
       };  
3. **플래너와 실행 엔진 연결 예제**  
       
       const { CopilotClient } = require("@github/copilot-sdk");  
       const client = new CopilotClient();  
       
       await client.initialize();  
       await client.createIntent(intent, constraints);  
       const plan = await client.plan();  
       const result = await client.execute(plan);  
       
   - `result` 객체에는 실행 로그, 변경 파일 목록, 오류 정보가 포함됨  
4. **로깅·모니터링·디버깅 전략**  
   - 실행 엔진은 `event` 스트림을 제공 → CloudWatch, Prometheus 등으로 전송  
   - 오류 발생 시 `result.error`를 파싱해 재시도 정책 적용  

## 베스트 프랙티스
- **최소 권한 원칙**: Constraints에 허용된 명령·파일만 명시  
- **재현 가능한 플래닝**: 플랜 생성 시 시드(seed)와 SDK 버전을 로그에 기록  
- **오류 시나리오 테스트**: 네트워크 장애·파일 충돌 등 케이스를 CI에 포함  
- **성능 최적화**: 플래닝 비용(LLM 호출 횟수)과 실행 지연을 모니터링, 필요 시 플랜 캐시 활용  

## 보안·신뢰성 고려사항
- **코드·명령 검증**: 실행 전 `git diff`·`dry-run` 옵션으로 변경 내용을 사전 검토  
- **프라이버시 보호**: 사용자 데이터는 SDK 내부에서 암호화된 상태로 전달, 로그에 민감 정보는 제외  
- **감사 로그·컴플라이언스**: 모든 의도·플랜·실행 단계는 immutable 로그 스토어에 저장, 규제 요구에 대응  

## 실제 적용 사례
- **오픈소스 프로젝트 자동 릴리즈 파이프라인**  
  - GitHub Copilot SDK를 이용해 `release.yml` 워크플로를 자동 생성·실행, 수동 스크립트 제거  
- **기업 내부 문서 자동화·업데이트**  
  - 사내 위키 페이지 수정 의도를 전달하면 SDK가 최신 데이터베이스 스키마를 조회·문서 템플릿을 자동 업데이트  
- **CI/CD 파이프라인 내 에이전시 활용**  
  - Pull Request 생성 시 자동 테스트·보안 스캔 플랜을 생성하고, 실패 시 자동 롤백·알림 전송  

## 향후 전망 및 연구 과제
- **멀티‑모달 에이전시 확장**: 텍스트·코드·데이터를 동시에 다루는 플래닝 모델 개발  
- **인간‑AI 협업 인터페이스 설계**: UI 레이어에서 의도·결과·피드백을 자연스럽게 연결하는 패턴 연구  
- **표준화된 에이전시 프로토콜·스키마**: 다양한 플랫폼 간 플래닝·실행 교환을 위한 오픈 표준 필요  

## 결론
Execution‑centric 인터페이스는 AI 활용 방식을 근본적으로 바꾸고 있습니다.  
- **조직 차원**: 에이전시 워크플로를 설계·운영할 전담 팀 구성  
- **개발자 차원**: Copilot SDK와 같은 실행 레이어를 애플리케이션에 임베드해, 의도 기반 자동화를 구현  
- **보안·운영 차원**: 최소 권한·샌드박스·감사 로그를 기본 설계에 포함  

이러한 준비가 향후 AI‑driven 소프트웨어 개발의 핵심 경쟁력이 될 것입니다.

## 참고 문헌 및 리소스
- GitHub Blog, “The era of ‘AI as text’ is over. Execution is the new interface.” (2026) – <https://github.blog/ai-and-ml/github-copilot/the-era-of-ai-as-text-is-over-execution-is-the-new-interface/>  
- LinkedIn 포스트 “The era of ‘AI as text’ is over. Execution is the new interface.” – <https://www.linkedin.com/pulse/era-ai-text-over-execution-new-interface-github-cgjpc>  
- “The Interface Is Text” – 조직 내 인터페이스 설계 논의 (참고) – <https://idratherbewriting.com/2010/08/11/the-interface-is-text-organizing-content-23>  
- 기타 AI 트렌드 기사 (2026) – <https://yeconomy.ai/news/index.php?section%5B%5D=10914&section%5B%5D=10917>  

---