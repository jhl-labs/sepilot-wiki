---
title: Kubernetes v1.36 – Fine‑Grained Kubelet API Authorization GA
author: SEPilot AI
status: published
tags: [Kubernetes, Security, Kubelet, RBAC, GA, v1.36]
---

## 개요
- **기능명**: Fine‑Grained Kubelet API Authorization  
- **GA 시점**: Kubernetes v1.36 (2026‑04‑24)  
- **핵심 목표**: kubelet HTTPS API에 대한 접근 권한을 최소 권한 원칙에 맞게 세분화하여 `nodes/proxy` 권한의 과도한 범위를 해소함  

> “Fine‑grained kubelet API authorization graduates to GA” – Kubernetes Blog[[링크](https://kubernetes.io/blog/2026/04/24/kubernetes-v1-36-fine-grained-kubelet-authorization-ga/)]

## 배경 및 동기
- **기존 `nodes/proxy` 권한**은 kubelet의 모든 API 경로를 하나의 서브리소스로 매핑했으며, 모니터링·로그·헬스체크 워크로드가 **노드 전체 명령 실행 권한**을 얻게 됨.  
- 이는 **Least‑Privilege 원칙**에 위배되며, 워크로드가 침해될 경우 **컨테이너 전체에 대한 명령 실행**이 가능해 블라스트 반경이 크게 확대됨.  
- 커뮤니티 이슈 `kubernetes/kubernetes#8346` 등에서 “nodes/proxy 문제”가 오랫동안 제기되어 왔음[[링크](https://kubernetes.io/blog/2026/04/24/kubernetes-v1-36-fine-grained-kubelet-authorization-ga/)].

## 기능 개요
| 항목 | 내용 |
|------|------|
| **Feature gate** | `KubeletFineGrainedAuthz` |
| 도입 시점 | 알파 – v1.32, 베타(기본 활성화) – v1.33, GA – v1.36 |
| GA 시점 | Feature gate 고정(항상 `true`) |
| 제공되는 RBAC 서브리소스 | `metrics`, `logs`, `exec`, `portforward`, `healthz` 등 (kubelet API 경로별) |
| 기존 대체 대상 | `nodes/proxy` 서브리소스 |

> KEP #2862: Fine‑grained Kubelet API authorization[[링크](https://github.com/kubernetes/enhancements/issues/2862)]

## 주요 변경 이력
- **v1.32** – `KubeletFineGrainedAuthz` 알파 기능으로 옵션 제공.  
- **v1.33** – 베타 단계이며 기본값이 `true` 로 전환, 기존 `nodes/proxy` 권한을 대체하기 시작.  
- **v1.36** – GA 확정, feature gate 잠금(항상 활성화). `nodes/proxy` 권한은 더 이상 기본 권한이 아님.

## 작동 원리
1. **Webhook Authorization**을 통해 kubelet HTTPS 엔드포인트에 대한 요청을 가로채고, 요청 경로를 파악합니다.  
2. 각 경로를 **RBAC 서브리소스**에 매핑합니다. 예: `/metrics` → `nodes/metrics`, `/log` → `nodes/log`.  
3. **권한 검사 흐름**:  
   - 인증 → RBAC 서브리소스에 대한 `verb`(get, list, create 등) 확인 → 허용/거부.  
4. 감사 로그에 **권한 검사 결과**와 **사용된 서브리소스**가 기록됩니다.

## 사용 방법
### Feature gate 확인
`kubelet` 실행 옵션에 `--feature-gates=KubeletFineGrainedAuthz=true` 가 포함되어 있는지 확인합니다(GA에서는 자동 적용).  

### RBAC 정책 예시
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubelet-metrics-reader
rules:
- apiGroups: [""]
  resources: ["nodes/metrics"]
  verbs: ["get"]
```
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubelet-log-reader
rules:
- apiGroups: [""]
  resources: ["nodes/log"]
  verbs: ["get"]
```
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubelet-exec
rules:
- apiGroups: [""]
  resources: ["nodes/exec"]
  verbs: ["create"]
```
> 기존 `nodes/proxy` 권한은 더 이상 필요하지 않으며, 위와 같이 세분화된 서브리소스로 교체합니다.

### 권한 검증
`kubectl auth can-i` 명령으로 현재 사용자/서비스계정이 특정 서브리소스에 접근 가능한지 확인합니다.  

예시:  
`kubectl auth can-i get nodes/metrics --as=system:serviceaccount:monitoring:prometheus`  

## 마이그레이션 가이드
1. **현재 `nodes/proxy` 사용 현황 파악**  
   - `kubectl get clusterrole,role -o yaml | grep nodes/proxy` 로 기존 바인딩을 확인.  
2. **필요한 세분화 권한 식별**  
   - 모니터링 → `nodes/metrics`  
   - 로그 수집 → `nodes/log`  
   - 컨테이너 exec → `nodes/exec` 등.  
3. **Role/ClusterRole 업데이트**  
   - 기존 `nodes/proxy` 규칙을 삭제하고, 위에서 정의한 세분화 규칙을 적용.  
4. **단계적 테스트**  
   - 스테이징 클러스터에서 새 RBAC 적용 후 `kubectl auth can-i` 로 검증.  
   - 실제 워크로드(예: Prometheus, Fluentd)에서 정상 동작 확인.  
5. **불필요한 `nodes/proxy` 권한 제거**  
   - 모든 테스트가 성공하면 `nodes/proxy` 규칙을 완전 삭제.  

## 보안 영향
- **공격 표면 감소**: 최소 권한 원칙 적용으로 노드 수준 슈퍼유저 권한이 사라짐.  
- **블라스트 반경 제한**: 침해 시 컨테이너 단위 권한만 남아 전체 노드에 대한 제어가 차단됨.  
- **감사 로그 강화**: 서브리소스별 권한 사용 내역이 kubelet 감사 로그에 기록되어 추적이 용이함.  

## 호환성 및 제한 사항
- **지원되는 kubelet API 경로**: `metrics`, `logs`, `exec`, `portforward`, `healthz` 등 공식 문서에 명시된 경로만 세분화됨[[링크](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz#fine-grained-authorization)].  
- **비활성화 시**: feature gate를 강제로 끄면 기존 `nodes/proxy` 모델로 복귀하지만, GA에서는 비활성화가 불가능합니다.  
- **서드파티 툴**: 일부 오래된 모니터링/로그 수집 도구는 `nodes/proxy` 권한에 의존하므로, 최신 버전으로 업그레이드하거나 RBAC 매핑을 수정해야 합니다.  

## 모니터링 및 로깅
- **kubelet 감사 로그**에 `authorization.k8s.io` 필드가 포함되어, 어떤 서브리소스에 대한 허용/거부가 발생했는지 확인 가능.  
- 기존 `kubectl logs`, `metrics-server` 등 도구는 새로운 서브리소스(`nodes/log`, `nodes/metrics`)와 그대로 연동됩니다.  
- 필요 시 **AuditPolicy**를 커스터마이징하여 세분화된 권한 사용을 별도 로그 파일에 기록할 수 있습니다.  

## FAQ
**Q1. `nodes/proxy` 권한을 완전히 제거해도 되는가?**  
A. Yes. Fine‑grained authorization이 GA가 되면서 `nodes/proxy`는 더 이상 기본 권한이 아니며, 모든 기존 사용 사례는 `nodes/metrics`, `nodes/log`, `nodes/exec` 등으로 대체됩니다.  

**Q2. 베타 단계에서 발생할 수 있는 호환성 이슈는?**  
A. 베타(v1.33)에서는 feature gate가 기본 활성화되었지만, 일부 서드파티 툴이 아직 `nodes/proxy`에 의존하고 있어 권한 오류가 발생할 수 있습니다. 이 경우 해당 툴을 최신 버전으로 업그레이드하거나 RBAC를 새 서브리소스로 수정해야 합니다.  

**Q3. 다른 클러스터에서 바로 적용 가능한가?**  
A. v1.36 이상을 실행 중인 모든 클러스터에서는 feature gate가 자동으로 활성화됩니다. 다만, 클러스터마다 기존 `nodes/proxy` 바인딩이 존재할 수 있으므로, 위 마이그레이션 가이드를 따라 권한을 재정비하는 것이 권장됩니다.  

## 참고 자료
- **공식 블로그 포스트**: *Kubernetes v1.36: Fine‑Grained Kubelet API Authorization Graduates to GA*[[링크](https://kubernetes.io/blog/2026/04/24/kubernetes-v1-36-fine-grained-kubelet-authorization-ga/)]  
- **KEP #2862**: Fine‑grained Kubelet API authorization[[링크](https://github.com/kubernetes/enhancements/issues/2862)]  
- **Kubernetes Docs**: Kubelet authentication/authorization – Fine‑grained authorization 섹션[[링크](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz#fine-grained-authorization)]  
- **관련 GitHub 이슈**: `kubernetes/kubernetes#8346` (nodes/proxy 문제)  

---