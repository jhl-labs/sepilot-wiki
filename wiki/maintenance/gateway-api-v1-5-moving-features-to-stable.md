---
title: Gateway API v1.5 – Stable 로 승격된 기능 정리 및 Wiki 유지보수 가이드
author: SEPilot AI
status: published
tags: [Gateway API, Kubernetes, Stable, Release, Wiki Maintenance]
---

## 개요
이 문서는 Kubernetes SIG Network에서 발표한 **Gateway API v1.5** 릴리즈와 관련된 주요 변경 사항을 정리하고, Wiki 유지보수 담당자가 최신 정보를 반영하기 위해 따라야 할 절차를 제공합니다.  
대상 독자는 **Kubernetes 운영자, 클러스터 관리자, 네트워킹 엔지니어, 그리고 Wiki 편집자**이며, 특히 기존에 Experimental 단계였던 기능을 Stable(표준) 채널로 옮긴 환경을 마이그레이션하려는 팀에 유용합니다.

## 릴리즈 요약
- **버전**: Gateway API v1.5 (v1.5.1 패치 포함)  
- **릴리즈 일자**: 2026년 3월 14일 (정식 발표는 2026년 4월 21일) – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)  
- **핵심 내용**: 기존 Experimental 기능 6개를 Standard(Stable) 채널로 승격하고, 새로운 **ListenerSet** 리소스를 도입함.  
- **패치 릴리즈**: v1.5.1이 이미 제공 중이며, 버그 수정 및 문서 업데이트가 포함됨.  

### 주요 변경 사항 한눈에 보기
| 구분 | 내용 |
|------|------|
| **Stable 승격** | TLSRoute, ReferenceGrant, HTTPRoute CORS Filter, Client Certificate Validation, Certificate Selection for Gateway TLS Origination, ListenerSet |
| **새로운 표준 리소스** | ListenerSet (GEP‑1713) |
| **릴리즈 프로세스** | Release train 모델 도입, Feature Freeze 시점 명시, Release Manager & Release Shadow 역할 추가 |
| **문서 동기화** | 문서가 준비되지 않으면 해당 기능은 릴리즈에 포함되지 않음 |

## Stable 채널로 승격된 기능

### TLSRoute
TLSRoute는 클라이언트가 TLS 핸드쉐이크 시 전송하는 **Server Name Indication (SNI)** 값을 매칭하여 요청을 적절한 백엔드로 라우팅합니다. 이번 승격으로 TLS 기반 트래픽 제어가 GA 수준으로 제공됩니다. – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)

### ReferenceGrant
ReferenceGrant는 서로 다른 네임스페이스 간에 Gateway API 리소스가 서로를 참조할 수 있도록 허용하는 권한 부여 메커니즘입니다. Stable 로 승격되어 멀티‑네임스페이스 환경에서 보안 정책을 일관되게 적용할 수 있습니다. – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)

### HTTPRoute CORS Filter
HTTPRoute에 CORS(Cross‑Origin Resource Sharing) 필터를 정의할 수 있게 되어, 브라우저 기반 클라이언트가 다른 오리진에 안전하게 접근하도록 제어할 수 있습니다. 이번 릴리즈에서 표준 기능으로 제공됩니다. – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)

### Client Certificate Validation
클라이언트 인증서 검증 기능이 추가되어, TLS 연결 시 클라이언트 인증서를 검증하고 허용된 인증서만 통과하도록 설정할 수 있습니다. – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)

### Certificate Selection for Gateway TLS Origination
Gateway가 TLS 연결을 시작할 때 사용할 인증서를 선택하는 로직이 표준화되었습니다. 이를 통해 다중 인증서 환경에서 적절한 인증서를 자동 선택할 수 있습니다. – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)

### GA 의미와 기대 효과
- **GA(General Availability)**: 기능이 Production 환경에서 안정적으로 사용될 수 있음을 의미합니다.  
- **기대 효과**: 운영 복잡도 감소, 보안 정책 일관성 강화, 멀티‑테넌시 지원 확대 등.

## 신규 표준 기능 – ListenerSet

### ListenerSet 소개
ListenerSet은 기존에 **Gateway** 객체에 직접 정의하던 Listener들을 별도 리소스로 분리한 새로운 표준 리소스입니다. – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)

#### 기존 Listener 구조와 차이점
- **기존**: 모든 Listener가 단일 Gateway 객체에 포함 → 팀 간 협업 시 동일 객체에 대한 동시 수정 충돌 위험.  
- **ListenerSet**: Listener를 독립적인 리소스로 관리 → 멀티‑테넌시, 권한 위임, 팀 별 독립적인 업데이트가 가능.

#### 멀티‑테넌시 및 협업 시나리오 개선점
- 플랫폼 팀과 애플리케이션 팀이 동일 Gateway에 대해 별도 ListenerSet을 소유·관리 가능.  
- Ownership delegation이 명확해져 운영 실수와 충돌을 최소화.

### 관련 GEP‑1713 개요
ListenerSet은 **GEP‑1713** 제안에 기반해 설계되었습니다. (구체적인 문서는 현재 공개된 URL이 없으므로 내부 GEP 문서 참조) – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)

### 기타 추가된 표준 리소스
- 위에서 언급한 5개의 기능 외에도 **ListenerSet** 자체가 새로운 표준 리소스로 GA 단계에 포함됩니다.

## 릴리즈 프로세스 변화

### Release Train 모델 도입 배경
v1.5부터 **Release Train** 모델을 적용해 Feature Freeze 시점에 준비된 모든 기능을 한 번에 릴리즈합니다. 이는 SIG Release 팀의 릴리즈 주기와 일관성을 맞추기 위함이며, 문서가 준비되지 않으면 해당 기능도 릴리즈에 포함되지 않도록 설계되었습니다. – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)

### Feature Freeze 시점 및 적용 범위
- **Feature Freeze**: 특정 날짜에 모든 기능(Experimental, Standard)과 문서가 최종 검토됩니다.  
- **적용 범위**: 코드, CRD, 그리고 공식 문서 모두 포함.

### Release Manager / Release Shadow 역할
- **Release Manager**: 전체 릴리즈 일정 관리 및 최종 승인.  
- **Release Shadow**: Release Manager를 지원하며, 품질 검증 및 릴리즈 노트 작성 담당.  
- 이번 릴리즈에서는 **Flynn (Buoyant)** 과 **Beka Modebadze (Google)** 가 각각 역할을 수행했습니다. – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)

### 문서 동기화 정책
- 기능이 Stable 로 승격될 경우, 해당 리소스 정의와 사용 예제가 공식 문서에 즉시 반영됩니다.  
- Wiki 팀은 공식 문서와 동기화된 내용만을 반영하도록 권고됩니다.

## 기존 환경에 미치는 영향

### Experimental 기능 마이그레이션 필요성
- 기존에 **Experimental** 단계였던 TLSRoute, ReferenceGrant 등은 이제 Stable 로 이동했으므로, **apiVersion** 및 **CRD** 버전 업데이트가 필요합니다.  
- 마이그레이션을 하지 않을 경우, 향후 Kubernetes 버전에서 해당 Experimental CRD가 삭제될 위험이 있습니다.

### 호환성 검증 체크리스트
- CRD 버전(`gateway.networking.k8s.io/v1alpha2` → `v1beta1`/`v1`) 확인  
- 기존 매니페스트에 `apiVersion` 및 `kind`가 최신 표준에 맞는지 검증  
- 클러스터에 적용된 **GatewayClass**, **Gateway**, **Listener** 설정이 ListenerSet과 충돌하지 않는지 확인  

### 다운그레이드/롤백 전략
- v1.5.1 패치 적용 전에는 **Snapshot**을 생성하고, 필요 시 `kubectl delete` 로 기존 Experimental CRD를 제거 후 이전 버전으로 롤백합니다.  
- 롤백 시에는 **CRD**와 **CustomResource** 모두 원래 버전으로 복구해야 합니다.

## 마이그레이션 가이드

### 단계별 마이그레이션 절차
1. **사전 검증**: 현재 클러스터에 적용된 Gateway API CRD 버전 확인.  
2. **Backup**: `kubectl get <resource> -o yaml > backup.yaml` 로 모든 관련 리소스 백업.  
3. **CRD 업데이트**: `kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.0/crds.yaml` (공식 CRD URL) – 실제 URL은 공식 릴리즈 페이지 참고.  
4. **매니페스트 변환**: `apiVersion: gateway.networking.k8s.io/v1beta1` 로 수정하고, Listener는 `ListenerSet` 리소스로 분리.  
5. **적용**: `kubectl apply -f transformed-manifests.yaml`  
6. **검증**: `kubectl describe <resource>` 로 상태 확인 및 로그 분석.  

### 예시 매니페스트 변환 방법
- 기존 `TLSRoute` 매니페스트에서 `apiVersion`을 `gateway.networking.k8s.io/v1beta1` 로 바꾸고, `spec.hostnames`에 SNI 매칭 정보를 유지합니다.  
- `Listener` 정의를 `ListenerSet` 리소스로 옮기고, `gatewayRef` 필드로 기존 Gateway와 연결합니다.

### 테스트 및 검증 팁
- **Smoke Test**: 간단한 HTTP/HTTPS 요청으로 라우팅 동작 확인.  
- **CORS 테스트**: 브라우저 콘솔에서 CORS 오류가 발생하지 않는지 확인.  
- **클라이언트 인증서 검증**: 인증서가 없는 클라이언트 요청이 차단되는지 확인.

### 흔히 발생하는 오류와 해결 방안
- **CRD 버전 불일치**: `apiVersion`이 최신이 아니면 `No matches for kind` 오류 발생 → CRD 업데이트 필요.  
- **ListenerSet 충돌**: 동일 Gateway에 기존 Listener와 ListenerSet이 동시에 존재하면 충돌 → 기존 Listener 삭제 후 ListenerSet만 남김.  
- **ReferenceGrant 권한 부족**: 네임스페이스 간 참조가 차단될 경우, 적절한 `ReferenceGrant` 리소스를 추가.

## Wiki 문서 업데이트 지침

### 신규 섹션 및 페이지 추가 방법
1. **Branch 생성**: `git checkout -b gateway-api-v1.5-update`  
2. **파일 추가**: `gateway-api/v1.5/README.md` 등 신규 디렉터리 구조에 맞게 파일 생성.  
3. **YAML Frontmatter** 작성 후 H2부터 본문 작성.  

### 기존 페이지 수정 시 버전 관리 정책
- **버전 태그**: 페이지 상단에 `{{< version "v1.5" >}}` 와 같은 템플릿 사용.  
- **변경 로그**: `## 변경 로그` 섹션에 날짜와 변경 내용을 기록.  

### 이미지·다이어그램 교체 가이드
- 공식 로고(`gateway-api-logo.svg`)는 블로그에서 제공된 URL을 그대로 사용: `https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/gateway-api-logo.svg` – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)  
- 다이어그램은 최신 CRD 구조를 반영하도록 업데이트하고, 파일명에 `v1.5` 접미사를 붙임.

### PR 템플릿 및 리뷰 체크리스트
- **PR 템플릿**: `docs/update-template.md`에 “Stable 승격 여부”, “이미지 출처”, “링크 검증” 항목 포함.  
- **리뷰 체크리스트**:  
  - [ ] 공식 블로그 및 GEP‑1713 내용과 일치하는가?  
  - [ ] 이미지 URL이 정확한가?  
  - [ ] 버전 태그가 올바르게 표시되는가?

## 기여자 및 커뮤니티 감사
- **주요 기여자**: Flynn (Buoyant), Beka Modebadze (Google) – Release Manager 및 Release Shadow 역할 수행. – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)  
- **커뮤니티 참여 방법**: SIG Network 메일링 리스트, GitHub `kubernetes-sigs/gateway-api` 레포지토리 이슈 및 PR.  
- **향후 로드맵 힌트**: 다음 릴리즈에서는 **HTTPRoute Rewrite**와 **Advanced ListenerSet 정책**이 후보 기능으로 거론되고 있습니다(공식 발표 전까지는 추후 확인 필요).

## FAQ

### Stable 승격과 관련된 일반적인 질문
- **Q**: 기존 Experimental 매니페스트를 그대로 사용해도 되나요?  
  **A**: 가능하지만, 향후 버전에서 Experimental CRD가 제거될 수 있으므로 가능한 빨리 Stable 버전으로 마이그레이션하는 것이 권장됩니다.

- **Q**: ListenerSet을 사용하지 않아도 기존 Gateway에 Listener를 그대로 둘 수 있나요?  
  **A**: 기술적으로는 가능하지만, 멀티‑테넌시 환경에서는 권장되지 않으며, 향후 deprecation 가능성이 있습니다.

### 마이그레이션 중 발생할 수 있는 문제와 답변
- **문제**: `kubectl apply` 시 “no matches for kind ListenerSet” 오류 발생  
  **해결**: 최신 CRD가 클러스터에 적용되지 않았음. 공식 CRD 파일을 재적용하세요.

- **문제**: CORS 설정이 적용되지 않음  
  **해결**: HTTPRoute에 `filters` 섹션에 `type: RequestHeaderModifier` 와 `corsPolicy` 를 정확히 정의했는지 확인.

### 지원 및 문의 채널 안내
- **SIG Network Slack**: `#gateway-api` 채널  
- **GitHub Discussions**: `kubernetes-sigs/gateway-api` 레포지토리  
- **메일링 리스트**: `network@kubernetes.io`

## 참고 자료
- **공식 블로그 포스트**: https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/ – [출처](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/)  
- **GEP‑1713** (ListenerSet 제안) – SIG Network 내부 문서 (공식 URL 미공개)  
- **SIG Network 회의록**: 2026년 2월 및 3월 회의록 (Kubernetes Community Docs)  
- **외부 해설·블로그**: Madero Solutions 기사 “Gateway API v1.5: Moving features to Stable” – [출처](https://www.maderosolutions.com/en/news/2c38d8e7e33f9787)  

---