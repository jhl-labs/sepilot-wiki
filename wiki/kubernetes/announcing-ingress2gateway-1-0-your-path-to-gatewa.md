---
title: Ingress2Gateway 1.0 발표 및 Gateway API 마이그레이션 가이드
author: SEPilot AI
status: published
tags: [Ingress, Gateway API, Kubernetes, 네트워킹, 마이그레이션]
---

## 개요
- **문서 목적**: Ingress‑NGINX가 2026년 3월 퇴역함에 따라, 기존 Ingress 기반 클러스터를 최신 **Gateway API** 로 전환하려는 운영팀·개발자를 위한 실전 가이드 제공  
- **대상 독자**: 클러스터 운영자, 플랫폼 엔지니어, DevOps 팀, Kubernetes 네트워킹에 관심 있는 개발자  
- **배경 요약**: SIG Network는 2026년 3월 Ingress‑NGINX 퇴역을 공식 발표했으며, 이를 계기로 **Ingress2Gateway 1.0** 이 안정 버전으로 출시되었습니다. 이 도구는 Ingress 리소스와 NGINX‑전용 어노테이션을 자동으로 Gateway API 객체로 변환해 줍니다[[1]](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/).  
- **주요 변화와 기대 효과**  
  - 30개 이상의 흔히 사용되는 NGINX 어노테이션을 지원해 변환 정확도 향상  
  - 컨트롤러‑레벨 통합 테스트를 통해 **동일한 트래픽 동작**을 검증  
  - RBAC‑친화적인 Gateway API 로 전환함으로써 보안·정책 관리가 쉬워짐  

## Kubernetes 네트워킹 현황 및 Ingress‑NGINX 퇴역
- **퇴역 일정 및 이유**: Ingress‑NGINX는 2025년 11월 퇴역 계획을 발표했으며, 2026년 3월 이후에는 신규 릴리즈·버그픽스·보안 업데이트가 제공되지 않습니다[[2]](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/).  
- **기존 Ingress API 한계**  
  - 단순한 라우팅 정의에 초점, 복잡한 트래픽 정책을 구현하려면 **어노테이션, ConfigMap, CRD** 등 비표준 확장이 필요  
  - 구현마다 어노테이션 세트가 달라 유지보수가 어려움  
- **Gateway API 등장 배경 및 장점**  
  - 모듈형·확장 가능한 API 설계, **Kubernetes‑native RBAC** 지원  
  - 라우팅, 트래픽 관리, 보안 정책을 명시적 객체(Gateway, HTTPRoute 등)로 표현해 가시성과 일관성 향상  

## Ingress2Gateway 1.0 소개
- **프로젝트 개요 및 핵심 목표**: Ingress2Gateway는 Ingress → Gateway API 마이그레이션을 **안전하고 자동화**된 방식으로 지원하는 어시스턴트이며, 변환 불가능한 설정에 대해 경고와 대체 방안을 제시합니다[[1]](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/).  
- **주요 기능 요약**  
  - **30+ NGINX 어노테이션 지원** (예: CORS, backend TLS, 정규식 매칭, 경로 재작성 등)  
  - **통합 테스트**: 각 어노테이션 및 조합에 대해 컨트롤러‑레벨 테스트 수행, 동작 동등성 검증  
  - **변환 리포트**: 변환 성공/실패, 경고, 수동 조정 필요 항목을 상세히 출력  
- **지원되는 Ingress‑NGINX 어노테이션**: CORS, backend TLS, regex matching, path rewrite 등 30개 이상(전체 목록은 공식 릴리즈 노트 참조)  

## 마이그레이션 흐름 개요
### 전체 단계
1. **사전 진단** – 현재 Ingress 리소스와 사용 중인 어노테이션 파악  
2. **Ingress2Gateway 설치** – CLI/Helm 등으로 도구 배포  
3. **변환 실행** – `ingress2gateway convert` 명령으로 Ingress → Gateway 변환  
4. **검증** – 통합 테스트·동작 동등성 확인  
5. **배포** – 기존 Ingress 컨트롤러 비활성화, Gateway API 적용  

### 사전 준비 체크리스트
- 클러스터가 **Kubernetes 1.27 이상** (Gateway API CRD 기본 제공)  
- 현재 Ingress‑NGINX 버전 확인 (퇴역 전 최신 패치 적용 권장)  
- **백업**: `kubectl get ingress -A -o yaml > ingress-backup.yaml`  
- CI/CD 파이프라인에 **Ingress2Gateway** 실행 단계 추가  

### 단계별 작업 흐름도
```
[Ingress 리소스] → (Ingress2Gateway) → [Gateway, HTTPRoute 등] → (통합 테스트) → [프로덕션 배포]
```

## Ingress2Gateway 사용 방법
### 설치 및 초기 설정
```bash
# Helm 설치 (예시)
helm repo add ingress2gateway https://charts.ingress2gateway.io
helm install ingress2gateway ingress2gateway/ingress2gateway --namespace kube-system
```
> *Helm 차트 URL은 공식 문서에 명시된 대로 사용*  

### CLI/CRD 사용 예시
```bash
# 전체 네임스페이스의 Ingress를 Gateway 객체로 변환
ingress2gateway convert --all-namespaces --output-dir ./gateway-manifests
```
- `--output-dir` 옵션은 변환된 YAML 파일을 로컬에 저장해 검토 가능하게 함  
- 변환 결과는 `Gateway`, `HTTPRoute`, `TLSRoute` 등 적절한 CRD 로 생성  

### Ingress → Gateway 변환 프로세스 상세
1. **Ingress 파싱** – `spec.rules`, `spec.tls`, 어노테이션 추출  
2. **어노테이션 매핑** – 지원되는 30+ 어노테이션을 사전 정의된 Gateway API 필드로 변환  
3. **불가능 항목 경고** – 매핑되지 않는 어노테이션은 `Warning` 섹션에 기록하고, 수동 조정 가이드 제공  
4. **CRD 생성** – `GatewayClass`, `Gateway`, `HTTPRoute` 객체를 생성하고, 필요 시 `ReferenceGrant` 등 보조 리소스도 포함  

## 변환 가능한 구성 요소와 제한 사항
- **지원 어노테이션 및 기능**  
  - CORS (`nginx.ingress.kubernetes.io/cors-allow-origin` 등) → `HTTPRoute` `filters`  
  - Backend TLS (`nginx.ingress.kubernetes.io/backend-protocol`) → `TLSRoute` 혹은 `HTTPRoute` `backendRefs` TLS 설정  
  - 정규식 매칭 (`nginx.ingress.kubernetes.io/use-regex`) → `HTTPRouteMatch` `path` `type: RegularExpression`  
  - 경로 재작성 (`nginx.ingress.kubernetes.io/rewrite-target`) → `HTTPRouteFilter` `RequestRedirect`  

- **변환 불가능한 설정**  
  - NGINX 전용 **Lua 스크립트** 또는 **custom snippets**  
  - 특정 **rate‑limit** 구현이 Gateway API에 아직 매핑되지 않은 경우  
  - **동적 upstream** 설정 (예: `resolver` 어노테이션)  

- **대체 방안 및 수동 조정 가이드**  
  - 불가능한 어노테이션은 **EnvoyFilter** 혹은 **Custom Controller** 로 구현 권장  
  - 변환 후 `kubectl edit` 로 직접 `HTTPRoute` 필터를 추가하거나, `GatewayClass` 파라미터를 조정  

## 테스트 및 검증
### 통합 테스트 전략
- Ingress2Gateway는 **컨트롤러‑레벨 통합 테스트**를 제공하며, 각 어노테이션 조합에 대해 **동일한 트래픽 흐름**을 검증합니다[[1]](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/).  
- 테스트 파이프라인에 `gateway-test-suite` 를 포함시켜, 변환 전후의 **HTTP 200/404 비율**, **TLS 핸드쉐이크**, **CORS 헤더** 등을 자동 검증  

### 행동 동등성 검증 방법
1. **Ingress** 로 서비스에 요청 → 응답 기록  
2. **Gateway** 로 동일 요청 → 응답 비교 (헤더, 상태 코드, 바디)  
3. 차이가 있으면 `ingress2gateway report` 로 상세 경고 확인  

### CI/CD 파이프라인 적용
```yaml
# .github/workflows/migration.yml (예시)
steps:
  - name: Checkout
    uses: actions/checkout@v3
  - name: Run Ingress2Gateway conversion
    run: |
      ingress2gateway convert --all-namespaces --output-dir ./gateway-manifests
  - name: Apply Gateway manifests to test cluster
    run: |
      kubectl apply -f ./gateway-manifests
  - name: Execute integration tests
    run: |
      ./ci/run-gateway-tests.sh
```

## 베스트 프랙티스 및 운영 가이드
- **안전한 마이그레이션**  
  - **블루‑그린 배포**: 기존 Ingress와 새 Gateway를 동시에 운영하고, 트래픽을 점진적으로 전환  
  - **네임스페이스 별 파일럿**: 먼저 비핵심 서비스에 적용 후 전체 확대  

- **RBAC 및 보안 정책**  
  - Gateway API는 **GatewayClass** 별로 RBAC을 정의할 수 있으므로, 최소 권한 원칙에 맞게 `Role`/`RoleBinding` 을 설계  
  - TLS 비밀(Secret) 접근 권한을 `Gateway` 와 `HTTPRoute` 에만 부여  

- **성능 튜닝 및 모니터링 포인트**  
  - `gateway-controller` 메트릭(예: `gateway_controller_reconcile_duration_seconds`) 모니터링  
  - Envoy 기반 구현 시 `envoy_admin` API 로 라우팅 지연시간 확인  
  - **PrometheusRule** 을 활용해 `Gateway` 객체의 `Ready` 상태 변화를 알림  

## 업그레이드 및 버전 관리
- **베타/알파와 차이점**  
  - 1.0 릴리즈는 **30+ 어노테이션 지원**과 **통합 테스트**를 포함, 베타 버전은 3개 어노테이션만 지원[[1]](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/).  
- **향후 로드맵**  
  - 2026년 하반기: **Gateway API v1.1** 대응, **Lua 스크립트 변환 플러그인** 추가 예정 (공식 로드맵 확인 필요)  
- **롤백 절차 및 위험 관리**  
  1. 변환 전 `Ingress` YAML 백업 보관  
  2. `kubectl delete gateway,httproute` 로 새 리소스 제거  
  3. 기존 Ingress‑NGINX 컨트롤러 재활성화  
  4. 롤백 후 모니터링을 통해 서비스 정상 여부 확인  

## FAQ
| 질문 | 답변 |
|------|------|
| **Ingress2Gateway는 어떤 Kubernetes 버전에서 동작하나요?** | 최소 **Kubernetes 1.27** (Gateway API CRD 기본 제공) 이상을 권장합니다. |
| **지원되지 않는 어노테이션이 있으면 어떻게 해야 하나요?** | 변환 시 경고가 출력되며, 해당 기능은 **EnvoyFilter** 혹은 **Custom Controller** 로 구현해야 합니다. |
| **Ingress‑NGINX를 완전히 제거해도 되는 시점은?** | 2026년 3월 퇴역 이후 **보안 업데이트가 중단**되므로, 가능한 한 빨리 Gateway API 로 전환하는 것이 권장됩니다[[2]](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/). |
| **CI 파이프라인에 Ingress2Gateway를 통합하려면?** | `ingress2gateway convert` 명령을 단계로 추가하고, 변환된 매니페스트에 대해 **통합 테스트**를 실행하면 됩니다(위 CI 예시 참고). |
| **멀티 클러스터 환경에서도 사용 가능한가요?** | 현재는 단일 클러스터 기준이며, 멀티 클러스터 지원은 **추가 조사가 필요합니다**. |

## 참고 자료 및 링크
- **Ingress2Gateway 1.0 공식 발표**: https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/  
- **Ingress NGINX 퇴역 안내**: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/  
- **Gateway API 공식 문서**: https://gateway-api.sigs.k8s.io/  
- **Kubernetes 네트워킹 가이드**: https://kubernetes.io/docs/concepts/services-networking/  
- **커뮤니티 및 지원 채널**: SIG Network 메일링 리스트, Kubernetes Slack `#networking` 채널  

*이 문서는 자동 감지된 트렌드 정보를 기반으로 작성되었습니다.*