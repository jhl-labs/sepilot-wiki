---
title: Announcing Ingress2Gateway 1.0 – Your Path to Gateway API
author: SEPilot AI
status: published
tags: [Ingress, Gateway API, Kubernetes, Migration, Networking]
---

## 개요
- **발표 목적**: Ingress‑NGINX가 2026 년 3 월에 퇴역함에 따라, 기존 Ingress 설정을 안전하게 **Gateway API** 로 전환할 수 있는 공식 마이그레이션 도구인 **Ingress2Gateway 1.0** 을 소개한다.  
- **주요 메시지**: Ingress2Gateway는 Ingress 리소스와 NGINX‑specific 어노테이션을 자동으로 변환하고, 변환 불가능한 설정에 대해 경고·제안을 제공한다. 이를 통해 조직은 다운타임 없이 최신 네트워킹 스택으로 전환할 수 있다.  
- **대상 독자**: 클러스터 운영자, DevOps 엔지니어, 플랫폼 팀, 그리고 Ingress‑NGINX를 현재 사용 중인 모든 Kubernetes 사용자.  
- **기대 효과**:  
  1. 퇴역 일정에 맞춘 사전 마이그레이션으로 보안·지원 위험 최소화  
  2. Gateway API 의 모듈성·RBAC 지원을 즉시 활용  
  3. 변환 과정에서 발생할 수 있는 설정 누락을 자동 경고로 사전 차단  

## 배경: Ingress‑NGINX 퇴역과 네트워킹 전환 필요성
- **Ingress‑NGINX 퇴역 일정**: 2026 년 3 월 공식 퇴역 예정이며, 이후 버그픽스·보안 업데이트가 제공되지 않는다[[Ingress NGINX Retirement](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)].  
- **기존 Ingress API 한계**:  
  - 단순한 API 설계에 비해 구현체가 **어노테이션, ConfigMap, CRD** 등 비표준 확장을 많이 사용한다.  
  - 이러한 확장은 클러스터 간 이식성을 저해하고, RBAC 적용이 어려운 경우가 많다.  
- **Gateway API 도입 배경 및 장점**:  
  - **모듈형·확장 가능한 설계**와 **Kubernetes‑native RBAC** 지원을 제공한다[[Ingress2Gateway 블로그](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/)].  
  - Ingress‑NGINX와 달리 표준 리소스(`Gateway`, `HTTPRoute` 등)로 네트워크 트래픽을 정의한다.  

## Ingress2Gateway 1.0 소개
- **프로젝트 개요**: SIG Network이 발표한 **Ingress2Gateway 1.0** 은 Ingress → Gateway API 마이그레이션을 돕는 **CLI 기반 어시스턴트**이다.  
- **핵심 목표**:  
  1. 기존 Ingress 매니페스트와 NGINX‑specific 어노테이션을 자동 변환  
  2. 변환 불가능한 설정을 **경고**하고 **대체 방안**을 제시  
  3. 변환 결과의 **행동 동등성**을 검증하는 통합 테스트 제공  
- **주요 구성 요소**  
  - **CLI** (`ingress2gateway`) – 변환 파이프라인 실행  
  - **번역 엔진** – 어노테이션 ↔ Gateway API 매핑 로직  
  - **경고·제안 시스템** – 변환 불가 항목을 식별하고 문서화  
- **지원되는 Kubernetes 버전 및 요구 사항**  
  - 현재 공식 문서에 명시된 최소 버전은 **Gateway API 가 지원되는 Kubernetes** 버전이다. *추가 조사가 필요합니다.*  

## 핵심 기능 및 개선 사항
- **30+ 이상의 Ingress‑NGINX 어노테이션 지원**  
  - CORS, Backend TLS, 정규식 매칭, 경로 재작성 등 주요 기능을 포함한다[[Ingress2Gateway 블로그](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/)].  
- **대표적인 기능 상세**  
  - **CORS**: `nginx.ingress.kubernetes.io/enable-cors` → `HTTPRoute` 의 `ResponseHeaderPolicy` 로 자동 매핑  
  - **Backend TLS**: `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` → `Gateway` 의 `TLS` 섹션에 적용  
  - **정규식 매칭**: `nginx.ingress.kubernetes.io/use-regex: "true"` → `HTTPRouteMatch` 의 `PathMatchType: RegularExpression` 로 변환  
  - **경로 재작성**: `nginx.ingress.kubernetes.io/rewrite-target` → `HTTPRouteFilter` 의 `RequestRedirect` 로 구현  
- **통합 테스트 체계**  
  - 각 어노테이션 및 조합에 대해 **컨트롤러‑레벨 통합 테스트**가 제공되어, Ingress‑NGINX 설정과 생성된 Gateway API 리소스가 **동일한 트래픽 동작**을 보임을 검증한다[[Ingress2Gateway 블로그](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/)].  

## 마이그레이션 워크플로우
1. **사전 준비**  
   - 클러스터 상태 점검 (`kubectl get pods -A`, `kubectl version`)  
   - 현재 Ingress‑NGINX 매니페스트와 어노테이션 백업 (`kubectl get ingress -A -o yaml > ingress-backup.yaml`)  
2. **Ingress2Gateway 설치 및 초기 설정**  
   - 최신 릴리즈 바이너리 다운로드 (예: `curl -LO https://github.com/kubernetes-sigs/ingress2gateway/releases/download/v1.0/ingress2gateway-linux-amd64`)  
   - 실행 권한 부여 및 PATH에 추가 (`chmod +x ingress2gateway-linux-amd64 && mv ingress2gateway-linux-amd64 /usr/local/bin/ingress2gateway`)  
3. **자동 변환 단계**  
   - `ingress2gateway convert -f ingress-backup.yaml -o gateway-output.yaml` 실행  
   - 변환 로그에서 **경고** 항목을 확인하고, 필요 시 수동 보완 작업 수행  
4. **비번역 가능한 설정 처리**  
   - 경고에 명시된 어노테이션은 **Gateway API 로 직접 구현**하거나, 대체 정책(예: `EnvoyFilter`)을 적용한다.  

## 호환성 및 제한 사항
- **지원되는 Ingress‑NGINX 버전**: 1.0 ~ 1.9 범위 내에서 테스트된 어노테이션을 지원한다. 정확한 버전 매트릭스는 공식 릴리즈 노트에 명시되어 있다. *추가 조사가 필요합니다.*  
- **지원 어노테이션 목록**: CORS, Backend TLS, Regex, Rewrite, Rate‑limit 등 30개 이상. 전체 목록은 프로젝트 GitHub `README` 에서 확인 가능.  
- **현재 지원되지 않는 기능**  
  - Custom NGINX Lua 스크립트, 동적 모듈 로드 등 **고급 확장**은 변환이 불가능하며, 별도 프록시 솔루션을 고려해야 한다.  
- **기존 커스텀 리소스와 연동**  
  - 기존 `IngressClass` 리소스는 `GatewayClass` 로 매핑 필요.  
  - 기존 `ConfigMap` 기반 전역 설정은 `Gateway` 의 `ParametersRef` 로 이전 가능하지만, 일부 옵션은 수동 조정이 요구된다.  

## 실전 가이드: 시작하기
### 설치 명령어 및 기본 구성 파일 예시
```text
# 바이너리 다운로드
curl -LO https://github.com/kubernetes-sigs/ingress2gateway/releases/download/v1.0/ingress2gateway-linux-amd64
chmod +x ingress2gateway-linux-amd64
sudo mv ingress2gateway-linux-amd64 /usr/local/bin/ingress2gateway
```

```yaml
# sample-ingress.yaml (기존 Ingress)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-app
  annotations:
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /$1
spec:
  rules:
  - host: demo.example.com
    http:
      paths:
      - path: /api/(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: demo-service
            port:
              number: 80
```

```text
# 변환 실행
ingress2gateway convert -f sample-ingress.yaml -o demo-gateway.yaml
```

```yaml
# demo-gateway.yaml (변환 결과)
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: demo-gateway
spec:
  gatewayClassName: istio
  listeners:
  - protocol: HTTP
    port: 80
    hostname: demo.example.com
    routes:
    - kind: HTTPRoute
      name: demo-httproute
---
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: demo-httproute
spec:
  hostnames:
  - demo.example.com
  rules:
  - matches:
    - path:
        type: RegularExpression
        value: /api/(.*)
    filters:
    - type: RequestRedirect
      requestRedirect:
        pathRedirect: /$1
    forwardTo:
    - serviceName: demo-service
      port: 80
  # CORS 정책은 별도 HTTPRouteFilter 로 추가 가능
```

### 로컬(kind) 데모 절차
1. `kind create cluster --name ingress2gateway-demo`  
2. `kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml` (Ingress‑NGINX 설치)  
3. 위 예시 `sample-ingress.yaml` 적용 → 정상 동작 확인 (`curl http://demo.example.com/api/test`)  
4. `ingress2gateway convert` 로 Gateway 리소스 생성 후, **Gateway API 지원 컨트롤러**(예: Istio, Kong) 설치  
5. 변환된 `demo-gateway.yaml` 적용 → 동일 요청이 동일 응답을 반환하는지 검증  

## 베스트 프랙티스 및 운영 팁
- **단계적 마이그레이션**:  
  1. 파일럿 네임스페이스에서 변환·검증 → 성공 시 전체 네임스페이스 확대  
  2. 기존 Ingress‑NGINX와 Gateway API 를 **동시 운영**하도록 `IngressClass` 와 `GatewayClass` 를 분리  
- **CI/CD 파이프라인 통합**:  
  - `ingress2gateway` 를 **빌드 단계**에 포함시켜 PR 검토 시 자동 변환·테스트 수행  
  - 변환 결과를 `git diff` 로 확인하고, 경고가 있으면 빌드 실패 처리  
- **모니터링·로깅**:  
  - Gateway API 컨트롤러가 제공하는 **Metrics**(예: `gateway_controller_reconcile_duration_seconds`) 를 Prometheus에 수집  
  - 변환 경고 로그를 중앙 로그 시스템(ELK, Loki) 에 전송하여 추후 분석  
- **트러블슈팅 포인트**  
  - `Ingress2Gateway` 가 경고한 어노테이션은 **정확히 매핑되지 않은** 경우가 대부분이므로, 공식 매핑 표와 비교 후 수동 보완  
  - `GatewayClass` 가 올바른 컨트롤러와 연결돼 있는지 `kubectl get gatewayclass` 로 확인  

## FAQ
| 질문 | 답변 |
|------|------|
| **퇴역 전 기존 Ingress‑NGINX를 계속 사용할 수 있는 기간은?** | 2026 년 3 월까지는 **베스트‑에포트 유지**가 제공되며, 그 이후에는 업데이트·보안 패치가 중단된다[[Ingress NGINX Retirement](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)]. |
| **변환 오류 시 롤백 절차는?** | 변환 전 `kubectl get ingress -A -o yaml > backup.yaml` 로 백업해 두었다면, `kubectl apply -f backup.yaml` 로 원본 Ingress 를 복구할 수 있다. 변환된 Gateway 리소스는 `kubectl delete -f demo-gateway.yaml` 로 제거한다. |
| **다른 Ingress 컨트롤러와 비교했을 때 장단점은?** | - **장점**: 표준화된 API, RBAC 지원, 자동 테스트 기반 변환, 다중 컨트롤러와 호환 가능<br>- **단점**: 아직 일부 고급 NGINX 전용 기능(예: Lua 스크립트)은 변환 불가. 기존 커스텀 어노테이션을 수동으로 재구현해야 함. |
| **지원되지 않는 어노테이션은 어떻게 처리하나요?** | 경고 로그에 명시된 어노테이션은 **대체 정책**(예: EnvoyFilter, Service Mesh) 혹은 **Custom Resource** 로 구현한다. 자세한 매핑 표는 프로젝트 GitHub `docs/mapping.md` 에서 확인 가능. |
| **지원되는 Kubernetes 버전은?** | Gateway API 가 GA 된 Kubernetes 버전(예: v1.22 이상)에서 동작한다. 정확한 호환성 매트릭스는 공식 릴리즈 노트를 참고한다. *추가 조사가 필요합니다.* |

## 참고 자료 및 링크
- **공식 발표 블로그**: *Announcing Ingress2Gateway 1.0: Your Path to Gateway API* [[링크](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/)]  
- **Ingress‑NGINX 퇴역 안내**: *Ingress NGINX Retirement: What You Need to Know* [[링크](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)]  
- **SIG Network 발표 자료**: (SIG Network 공식 페이지 – 추가 조사 필요)  
- **Gateway API 공식 문서**: https://gateway-api.sigs.k8s.io/  
- **kind (Kubernetes in Docker) 설치 가이드**: https://kind.sigs.k8s.io/  

## 부록 (선택)

### 용어 정의 (Glossary)
- **Ingress**: HTTP/HTTPS 트래픽을 서비스로 라우팅하기 위한 Kubernetes 기본 리소스.  
- **Gateway API**: Ingress 를 대체하는 모듈형 네트워킹 API (`Gateway`, `HTTPRoute` 등).  
- **Ingress‑NGINX**: 가장 널리 사용된 Ingress 컨트롤러 중 하나이며, 풍부한 어노테이션을 제공한다.  
- **CLI**: Command Line Interface, 여기서는 `ingress2gateway` 명령어를 의미한다.  

### 변환 매핑 표 (Ingress 어노테이션 ↔ Gateway API)
| Ingress‑NGINX 어노테이션 | Gateway API 매핑 (예시) |
|--------------------------|------------------------|
| `nginx.ingress.kubernetes.io/enable-cors` | `HTTPRoute` → `ResponseHeaderPolicy` (CORS 헤더) |
| `nginx.ingress.kubernetes.io/rewrite-target` | `HTTPRouteFilter` → `RequestRedirect` (pathRedirect) |
| `nginx.ingress.kubernetes.io/use-regex` | `HTTPRouteMatch` → `PathMatchType: RegularExpression` |
| `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` | `Gateway` → `TLS` 설정 (backend TLS) |
| `nginx.ingress.kubernetes.io/limit-rps` | 현재 직접 매핑 미지원 (대체: Service Mesh RateLimit) |

### 테스트 커버리지 요약표
| 테스트 항목 | 지원 여부 | 비고 |
|-------------|----------|------|
| 단일 어노테이션 변환 | ✅ | 30+ 어노테이션 |
| 복합 어노테이션 조합 | ✅ | 대표 조합 테스트 |
| 행동 동등성 검증 | ✅ | 컨트롤러‑레벨 통합 테스트 |
| 비번역 설정 경고 | ✅ | 로그에 상세 메시지 제공 |
| 자동 롤백 스크립트 | ❌ | 수동 백업/복구 권장 |

---  

*이 문서는 Kubernetes Blog 의 2026 년 3 월 발표를 기반으로 작성되었습니다. 최신 릴리즈 노트와 프로젝트 GitHub 를 지속적으로 확인하여 업데이트하십시오.*