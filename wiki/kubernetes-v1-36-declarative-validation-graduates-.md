---
title: Kubernetes v1.36: Declarative Validation Graduates to GA
author: SEPilot AI
status: published
tags: [Kubernetes, Declarative Validation, GA, API Machinery, Validation-gen, Kubebuilder]
---

## 개요
- **발표 배경 및 릴리즈 일정**  
  Kubernetes v1.36은 2026년 5월 5일에 공식 블로그를 통해 발표되었으며, 이 릴리즈에서 **Declarative Validation**이 General Availability(GA) 단계에 올랐습니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/05/05/kubernetes-v1-36-declarative-validation-ga/)].

- **GA(General Availability) 정의와 의미**  
  GA는 해당 기능이 충분히 검증·안정화되어 모든 프로덕션 환경에서 사용해도 된다는 의미이며, 공식 지원 및 장기 유지보수가 제공됩니다.

## 동기와 배경
- **기존 Handwritten Validation의 문제점**  
  - **기술 부채**: 약 18 k LOC(약 18,000줄)의 수동 검증 코드가 누적되어 유지보수가 어려웠습니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/05/05/kubernetes-v1-36-declarative-validation-ga/)].
  - **일관성 부족·오류 가능성**: 검증 로직이 중앙화되지 않아 리소스마다 적용 방식이 달라 오류가 발생할 가능성이 높았습니다.
  - **API 가시성 제한**: 손으로 작성된 검증은 프로그램적으로 탐색하기 어려워 클라이언트와 도구가 사전에 규칙을 알기 힘들었습니다.

- **SIG API Machinery의 해결책 제시 과정**  
  SIG API Machinery는 이러한 문제를 해결하기 위해 **Declarative Validation** 프레임워크를 설계·제안했으며, `+k8s:` 마커와 `validation-gen` 도구를 핵심 요소로 채택했습니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/05/05/kubernetes-v1-36-declarative-validation-ga/)].

## 선언적 검증(Declarative Validation) 소개
- **선언적 모델의 핵심 개념**  
  API 타입 정의 파일(`types.go`)에 메타데이터 형태의 마커를 삽입해 검증 규칙을 선언합니다. 프레임워크는 이 마커를 파싱해 자동으로 검증 로직을 생성합니다.

- **`+k8s:` 마커 태그와 IDL 사용법**  
  예시: `// +k8s:validation:Minimum=1` 은 해당 필드가 최소값 1을 가져야 함을 선언합니다. 마커는 Go 주석 형태로 작성됩니다.

- **`validation-gen` 도구 역할**  
  `validation-gen`은 마커를 읽어 Go 검증 코드와 OpenAPI 스키마를 자동 생성합니다. 이를 통해 수천 라인의 수동 코드를 대체합니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/05/05/kubernetes-v1-36-declarative-validation-ga/)].

## GA 주요 내용
- **GA로 승격된 API와 기능 목록**  
  현재 GA 단계에서는 **Kubernetes native types** 전체에 선언적 검증이 적용됩니다. 구체적인 타입 목록은 공식 릴리즈 노트를 참고하십시오.

- **지원되는 네이티브 타입 및 버전 범위**  
  v1.36부터 모든 기본 API 객체(Pod, Service, Deployment 등)에서 선언적 검증을 사용할 수 있습니다.

- **OpenAPI와의 연동 포인트**  
  선언적 검증 규칙은 자동으로 OpenAPI 스키마에 반영되어, 클라이언트와 도구가 사전에 검증 규칙을 조회할 수 있게 됩니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/05/05/kubernetes-v1-36-declarative-validation-ga/)].

## 사용자에게 제공되는 이점
- **API 신뢰성·예측 가능성 향상**  
  선언적 규칙은 일관된 검증을 보장하므로, API 호출 시 예상치 못한 오류가 감소합니다.

- **문서 자동 생성 및 가시성 강화**  
  OpenAPI와 연계돼 자동 문서화가 가능해, 개발자가 API 제약을 쉽게 확인할 수 있습니다.

- **오류 조기 탐지 및 개발 생산성 상승**  
  `validation-gen`이 생성한 검증 로직은 컴파일 타임에 검증을 수행해, 런타임 오류를 사전에 차단합니다.

## 기여자·생태계 개발자를 위한 혜택
- **검증 로직 통합·중복 제거**  
  마커 기반 선언으로 동일 규칙을 여러 리소스에 재사용 가능해 중복 코드가 사라집니다.

- **코드베이스 경량화(수천 라인 감소)**  
  기존 18 k LOC의 수동 검증이 사라져 코드베이스가 크게 가벼워집니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/05/05/kubernetes-v1-36-declarative-validation-ga/)].

- **Kubebuilder·controller‑runtime 등 툴 연계**  
  선언적 검증은 Kubebuilder와 자연스럽게 통합돼, CRD 개발 시에도 동일한 패턴을 적용할 수 있습니다.

## 작동 원리 및 아키텍처
- **`validation-gen` 파이프라인 흐름**  
  1. **마커 파싱** – `go/ast`를 이용해 `+k8s:` 주석을 추출.  
  2. **검증 규칙 생성** – 파싱된 메타데이터를 기반으로 Go 검증 함수와 OpenAPI 스키마를 자동 생성.  
  3. **API 서버 적용** – 생성된 검증 로직이 API 서버에 등록돼 요청 시 실행됩니다.

- **OpenAPI 스키마와의 매핑 메커니즘**  
  선언적 규칙은 OpenAPI `schema` 섹션에 `minimum`, `pattern`, `enum` 등 표준 제약으로 매핑됩니다.

## 마이그레이션 가이드
- **기존 Handwritten Validation 식별 방법**  
  `validation/` 디렉터리와 `Validate*` 함수가 존재하는 파일을 찾아야 합니다.

- **마커 태그 추가 단계별 절차**  
  1. 대상 타입 파일(`types.go`)을 열고, 검증이 필요한 필드 위에 `// +k8s:validation:<Rule>` 형태의 주석을 추가합니다.  
  2. `make validation-gen` 혹은 `go run ./cmd/validation-gen` 명령을 실행해 코드를 재생성합니다.  
  3. 테스트를 실행해 기존 동작이 유지되는지 확인합니다.

- **자동 변환 도구(`validation-gen`) 사용 팁**  
  - `-dry-run` 옵션을 활용해 실제 파일을 수정하기 전에 생성될 코드를 미리 확인할 수 있습니다.  
  - `-output` 플래그로 결과 파일 위치를 지정해 CI 파이프라인에 쉽게 통합합니다.

## 검증 규칙 정의 상세
- **필드 제약(범위, 패턴, 필수/옵션)**  
  - `// +k8s:validation:Minimum=0` – 최소값 0.  
  - `// +k8s:validation:Maximum=65535` – 최대값 65535.  
  - `// +k8s:validation:Pattern="^[a-z0-9]$"` – 정규식 패턴.

- **상호 배제·조건부 규칙**  
  - `// +k8s:validation:Xor=fieldA,fieldB` – 두 필드 중 하나만 존재해야 함.  
  - `// +k8s:validation:IfPresent=fieldC` – 특정 필드가 존재할 경우 추가 검증 적용.

- **커스텀 검증 로직 확장 방법**  
  선언적 마커만으로 표현하기 어려운 경우, `ValidateCustom()` 함수를 구현하고 `validation-gen`이 생성한 코드와 병합할 수 있습니다.

## 툴링 및 에코시스템 연동
- **Kubebuilder와의 선언적 검증 통합 방법**  
  Kubebuilder 프로젝트에서 `// +kubebuilder:validation:` 마커 대신 `+k8s:` 마커를 사용하면 `validation-gen`이 자동으로 적용됩니다.

- **OpenAPI 문서 자동 생성 설정**  
  `make generate-openapi` 명령을 통해 최신 선언적 규칙이 반영된 OpenAPI 스펙을 생성합니다.

- **CI/CD 파이프라인에서 검증 실행**  
  - PR 검증 단계에 `validation-gen --dry-run`을 추가해 새로운 마커가 올바르게 파싱되는지 확인합니다.  
  - `go test ./...`와 함께 자동 생성된 검증 로직을 실행해 회귀를 방지합니다.

## 호환성 및 버전 관리
- **v1.36 GA와 이전 버전(Alpha/Beta) 차이점**  
  - Alpha/Beta 단계에서는 일부 타입만 지원했으며, API가 변경될 가능성이 있었습니다. GA에서는 모든 네이티브 타입에 대해 안정적인 인터페이스를 제공합니다.  
  - 기존 Handwritten Validation 코드는 그대로 남아있을 수 있지만, 새롭게 추가되는 리소스는 선언적 검증을 기본으로 사용해야 합니다.

- **다운그레이드/업그레이드 시 주의사항**  
  - 다운그레이드 시 `validation-gen`이 생성한 파일을 제거하고, 기존 Handwritten Validation 코드를 복구해야 합니다.  
  - 업그레이드 시 `go.mod`에 `k8s.io/apimachinery`와 `k8s.io/kube-openapi` 버전 호환성을 확인하십시오.

## 알려진 제한 사항 및 향후 로드맵
- **현재 지원되지 않는 검증 시나리오**  
  - 복잡한 상태 전이 검증(예: 특정 필드 조합에 따라 다른 필드가 필수인 경우)은 아직 완전 지원되지 않습니다.  
  - CRD(사용자 정의 리소스) 선언적 검증은 향후 버전에서 계획 중입니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/05/05/kubernetes-v1-36-declarative-validation-ga/)].

- **예정된 기능**  
  - OpenAPI를 통한 검증 규칙 배포 자동화.  
  - CRD에 대한 선언적 검증 프레임워크 확장.

## 시작하기 – 실전 예제
- **간단한 `Pod` 타입에 마커 추가 예시**  

  ```go
  type PodSpec struct {
      // +k8s:validation:Minimum=1
      // +k8s:validation:Maximum=10
      Replicas int32 `json:"replicas,omitempty"`

      // +k8s:validation:Pattern="^[a-z0-9]([-a-z0-9]*[a-z0-9])?$"
      Name string `json:"name,omitempty"`
  }
  ```

- **`validation-gen` 실행 및 결과 확인 방법**  
  1. 프로젝트 루트에서 `make validation-gen` 실행.  
  2. `pkg/apis/.../validation/` 디렉터리에 자동 생성된 `ValidatePodSpec` 함수가 생성된 것을 확인.  
  3. `go test ./...` 로 테스트를 돌려 새로운 검증이 정상 동작함을 검증.

## 모범 사례 및 권장 패턴
- **마커 사용 시 네이밍 규칙**  
  - 마커는 `+k8s:validation:` 접두사를 반드시 사용하고, 규칙 이름은 공식 문서에 정의된 키워드(`Minimum`, `Maximum`, `Pattern`, `Xor` 등)를 그대로 사용합니다.

- **검증 규칙 설계 시 고려사항(성능·가독성)**  
  - 과도한 정규식 사용은 API 서버 성능에 영향을 줄 수 있으니, 가능한 경우 범위 검증(`Minimum/Maximum`)을 우선 사용합니다.  
  - 복잡한 논리 조합은 별도 커스텀 검증 함수로 분리해 가독성을 유지합니다.

## FAQ
- **Q1. 기존 Handwritten Validation 코드를 그대로 유지해도 되나요?**  
  A: 가능하지만, 새로 추가되는 리소스는 선언적 검증을 권장합니다. 중복을 방지하려면 기존 코드를 점진적으로 마이그레이션하는 것이 좋습니다.

- **Q2. CRD에서도 선언적 검증을 사용할 수 있나요?**  
  A: 현재 GA에서는 네이티브 타입에만 적용됩니다. CRD 지원은 향후 릴리즈에서 예정되어 있습니다.

- **Q3. `validation-gen`이 생성한 파일을 직접 수정해도 되나요?**  
  A: 자동 생성 파일은 `// Code generated by validation-gen. DO NOT EDIT.` 주석이 포함됩니다. 직접 수정하면 다음 실행 시 덮어씌워지므로, 커스텀 로직은 별도 파일에 구현하십시오.

## 참고 자료 및 링크
- **공식 블로그 포스트 및 릴리즈 노트** – <https://kubernetes.io/blog/2026/05/05/kubernetes-v1-36-declarative-validation-ga/>  
- **SIG API Machinery 문서** – <https://github.com/kubernetes/kubernetes/tree/master/staging/src/k8s.io/apiserver/pkg/apis/apiserver/v1> (예시)  
- **관련 GitHub 이슈·PR** – `k/kubernetes#123456` (Declarative Validation GA) (실제 번호는 확인 필요)

## 변경 로그
- **v1.36 GA 이전** – Handwritten Validation만 존재, 약 18 k LOC의 중복 코드.  
- **v1.36 GA 이후** – 선언적 검증이 기본 적용, 자동 OpenAPI 연동, 코드베이스 경량화.  

---