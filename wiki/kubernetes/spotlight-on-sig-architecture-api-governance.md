---
title: Spotlight on SIG Architecture: API Governance
author: SEPilot AI
status: deleted
tags: [SIG Architecture, API Governance, Kubernetes, 위키 유지보수]
quality_score: 64
---

## 1. 문서 개요 및 목적
- **위키 유지보수 배경**  
  - Kubernetes 생태계에서 API 설계·관리 정책은 핵심 가버넌스 영역이며, 현재 위키에 해당 내용이 부족함.  
- **스포트라이트 시리즈 소개**  
  - SIG Architecture에서 진행하는 “Spotlight” 인터뷰 시리즈의 다섯 번째 편으로, API Governance 서브프로젝트를 조명함.  
  - 원문: [Kubernetes Blog – Spotlight on SIG Architecture: API Governance](https://kubernetes.io/blog/2026/02/12/sig-architecture-api-spotlight/)  
- **독자 대상 및 기대 효과**  
  - Kubernetes 기여자, SIG 멤버, API 설계·리뷰에 참여하고자 하는 개발자.  
  - API 안정성·일관성 확보를 위한 정책 이해와 실제 적용 방법을 제공함.

## 2. SIG Architecture 소개
- **역할과 미션**  
  - 클러스터 전체 아키텍처와 API 설계 방향을 정의·조정하는 커뮤니티 그룹.  
  - API Machinery와 협업해 시스템 전반에 걸친 설계 원칙을 구현함.  
- **주요 서브프로젝트와 관계망**  
  - API Governance, Code Organization, API Machinery 등 여러 서브프로젝트가 SIG Architecture 아래에서 운영됨.  
  - 각 서브프로젝트는 서로 연계돼 API 표준, 코드 구조, 버전 관리 등을 공동으로 관리한다.  
- **커뮤니티 내 위치와 영향력**  
  - Kubernetes 핵심 API와 그 진화에 직접적인 영향력을 행사하며, KEP(KEP) 프로세스와 API Review 절차를 주도한다.  

## 3. API Governance 서브프로젝트 개요
- **정의 및 역사**  
  - “API Governance”는 SIG Architecture의 서브프로젝트로, API 표면 전체에 대한 안정성·일관성·확장성을 책임진다.  
  - 2019년경부터 본격적인 활동을 시작했으며, 현재까지 지속적으로 정책을 다듬어 왔다. (출처: 인터뷰)  
- **담당 리더와 핵심 인물**  
  - **Jordan Liggitt** – 현재 서브프로젝트 리드이며, 2014년부터 Kubernetes 인증·인가 작업에 참여해 왔다. 2016년 API Reviewer, 2017년 Approver로 활동했으며, 2019년부터 API Governance에 집중하고 있다. (출처: [Kubernetes Blog](https://kubernetes.io/blog/2026/02/12/sig-architecture-api-spotlight/))  
- **현재 활동 범위와 주요 산출물**  
  - API 설계 가이드라인, 리뷰 프로세스 정의, 버전 관리 정책 등 문서화된 산출물 제공.  
  - 구체적인 정책 문서는 SIG Architecture README 및 관련 GitHub 레포지토리에서 확인 가능. (출처: [SIG Architecture README](https://github.com/kubernetes/community/blob/master/sig-architecture/README.md#architecture-and-api-governance-1))

## 4. API Governance 목표 및 원칙
- **안정성·일관성·확장성 확보**  
  - 전체 API 표면에 걸쳐 “stability, consistency, and cross‑cutting sanity”를 강화한다는 목표를 명시. (출처: 블로그)  
- **API 설계·리뷰·버전 관리 원칙**  
  - 설계 단계에서 KEP 제출을 의무화하고, 리뷰·승인 절차를 통해 호환성을 검증한다.  
- **교차‑cutting 정책**  
  - 보안, 인증, deprecation 등 모든 API에 적용되는 공통 정책을 정의한다. (구체적인 내용은 추가 조사가 필요합니다.)

## 5. API 설계·리뷰 프로세스
- **KEP 제출 흐름**  
  1. 제안자는 KEP(Kubernetes Enhancement Proposal)를 작성하고 SIG Architecture에 제출한다.  
  2. KEP는 초기 검토(“provisional”) 단계와 최종 승인 단계로 나뉜다.  
- **API Review 단계와 역할**  
  - **Reviewer**: 설계 적합성, 보안, 호환성 등을 검토.  
  - **Approver**: 최종 승인 권한을 가지고, KEP를 “Implemented” 상태로 전환한다.  
  - 인터뷰에서 Jordan Liggitt은 2016년 Reviewer, 2017년 Approver 역할을 수행했다고 언급함. (출처: 블로그)  
- **승인·거부 기준 및 피드백 루프**  
  - 호환성 위반, 명확하지 않은 버전 정책, 보안 위험 등이 발견되면 피드백을 제공하고 수정 요청한다.  
  - 수정 후 재검토를 통해 최종 승인 여부가 결정된다. (구체적인 체크리스트는 추가 조사가 필요합니다.)

## 6. 정책·가이드라인 상세
- **API Naming & Versioning 규칙**  
  - 이름은 의미가 명확하고, 버전은 `v1`, `v1beta1` 등으로 관리한다는 일반적인 관행이 존재하지만, 상세 규칙은 SIG 문서에 따로 명시되어 있지 않음. (추가 조사가 필요합니다.)  
- **필드/스키마 설계 베스트 프랙티스**  
  - 필수 필드와 선택적 필드를 명확히 구분하고, OpenAPI 스키마와 연동해 자동 검증을 권장한다. (출처: API Machinery와 연계된 정책 언급)  
- **호환성 보장(전방/후방) 전략**  
  - 기존 API를 깨뜨리지 않도록 “deprecation” 절차와 “graduation” 정책을 적용한다. 구체적인 단계는 SIG 문서에 정의되어 있음. (추가 조사가 필요합니다.)

## 7. 도구 및 자동화 지원
- **API Machinery와 연동되는 CI/CD 파이프라인**  
  - API Machinery는 Kubernetes API 서버와 연동되는 핵심 라이브러리이며, CI 파이프라인에서 자동 검증을 수행한다. (출처: SIG Architecture README)  
- **검증 도구**  
  - `kube-openapi` : OpenAPI 스키마 자동 생성 및 검증.  
  - `api-review` : API 설계 검토를 자동화하는 커뮤니티 도구. (구체적인 사용법은 공식 문서 참고)  
- **메트릭·대시보드 활용 방안**  
  - 리뷰 대기 시간, 승인 비율 등 메트릭을 대시보드에 시각화해 병목 현상을 파악한다. (구체적인 구현은 추가 조사가 필요합니다.)

## 8. 현재 과제와 개선 방향
- **리뷰 병목 현상 및 해결 시도**  
  - 리뷰 단계에서 인력 부족과 일정 지연이 발생하고 있어, 자동화 도구와 리뷰어 풀 확대를 검토 중이다. (출처: 인터뷰 내용 암시)  
- **신규 API 도입 시 교육·문서화 필요성**  
  - 신규 기여자를 위한 교육 자료와 체크리스트가 부족해, 문서화 작업이 진행 중이다.  
- **향후 로드맵**  
  - 정책 자동화, 커뮤니티 참여 확대, 더 정교한 메트릭 수집 등을 목표로 로드맵을 수립하고 있다. (구체적인 일정은 추가 조사가 필요합니다.)

## 9. 위키 콘텐츠 유지·보수 가이드
- **문서 구조·형식 표준화 지침**  
  - H2 수준 섹션을 기준으로 일관된 목차와 YAML frontmatter 사용을 권장한다.  
- **업데이트 주기 및 책임자 지정**  
  - 주요 정책 변경 시 최소 분기별 리뷰를 진행하고, SIG Architecture 담당자가 최종 검증한다.  
- **변경 로그 관리와 리뷰 프로세스**  
  - 모든 위키 수정은 PR 형태로 제출하고, 최소 2명의 리뷰어가 승인해야 반영한다. (GitHub 기반 워크플로우 참고)

## 10. 참고 자료 및 외부 링크
- **공식 블로그 포스트**  
  - [Spotlight on SIG Architecture: API Governance](https://kubernetes.io/blog/2026/02/12/sig-architecture-api-spotlight/)  
- **SIG Architecture README**  
  - [SIG Architecture – Architecture and API Governance](https://github.com/kubernetes/community/blob/master/sig-architecture/README.md#architecture-and-api-governance-1)  
- **커뮤니티 토론 및 KEP**  
  - KEP 프로세스와 관련된 논의는 Kubernetes Enhancement Proposal 레포지토리에서 확인 가능.  
- **추가 참고**  
  - FAUN.dev, Finextura 등 외부 기사에서도 SIG Architecture의 역할과 목표를 다루고 있으나, 공식 정책은 위 두 링크를 기준으로 한다.  

---  

*본 문서는 현재 공개된 자료를 기반으로 작성되었으며, 세부 정책·체크리스트 등은 추가 조사가 필요합니다.*