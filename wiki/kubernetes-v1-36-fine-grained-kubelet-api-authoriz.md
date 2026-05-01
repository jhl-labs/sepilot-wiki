---
title: Kubernetes v1.36: Fine‑Grained Kubelet API Authorization Graduates to GA
author: SEPilot AI
status: published
tags: [Kubernetes, Security, Authorization, Kubelet, GA]
---

## 1. 개요
Kubernetes SIG Auth와 SIG Node가 발표한 바와 같이 **Fine‑Grained Kubelet API Authorization** 기능이 Kubernetes **v1.36**에서 General Availability(GA) 단계에 올랐습니다. 이번 릴리즈는 노드‑레벨 API 접근 권한을 보다 세밀하게 제어함으로써 최소 권한 원칙(Least‑Privilege)을 실현하고, 기존 `nodes/proxy` 권한이 초래하던 보안 위험을 크게 감소시킵니다.  
이 문서는 클러스터 운영자, 보안 담당자, 그리고 CI/CD 파이프라인을 설계·운영하는 개발자를 주요 독자로 하여, 새로운 인증 모델의 개념, 활성화 방법, 마이그레이션 절차 및 베스트 프랙티스를 제공하고자 합니다.

## 2. 기존 Kubelet 인증 모델
- **Coarse‑grained(노드/프록시) 권한 구조**  
  기존에는 Kubelet HTTPS API 전체가 `nodes/proxy` 서브리소스 하나에 매핑되었습니다. 이 권한을 부여받은 워크로드는 메트릭, 로그, 헬스 체크 등 모든 엔드포인트에 접근할 수 있었습니다.  
- **`nodes/proxy` 서브리소스가 제공하던 기능**  
  - Pod 목록 조회  
  - 노드 메트릭 및 헬스 상태 조회  
  - 컨테이너 로그 스트리밍  
  - `exec`, `portforward` 등 명령 실행 기능  
- **보안·운영상의 문제점**  
  `nodes/proxy` 권한은 사실상 **노드‑레벨 슈퍼유저** 역할을 하며, 모니터링 에이전트나 로그 수집기 등에 부여될 경우 해당 워크로드가 침해당했을 때 전체 컨테이너에 대한 명령 실행 권한이 남게 됩니다. 이는 최소 권한 원칙을 위배하고, 사고 발생 시 블래스트 반경을 크게 확대합니다[[출처](https://kubernetes.io/blog/2026/04/24/kubernetes-v1-36-fine-grained-kubelet-authorization-ga/)].

## 3. Fine‑Grained Kubelet API Authorization 소개
- **`KubeletFineGrainedAuthz` 기능 게이트 개요**  
  - v1.32에서 알파(옵션)로 도입 → v1.33에서 베타(기본 활성화) → v1.36에서 GA 및 기능 게이트 고정(비활성화 불가) [[출처](https://kubernetes.io/blog/2026/04/24/kubernetes-v1-36-fine-grained-kubelet-authorization-ga/)].
- **지원되는 세분화 권한**  
  - `metrics` – 노드·포드 메트릭 조회  
  - `logs` – 컨테이너 로그 스트리밍  
  - `exec` – 컨테이너 내부 명령 실행  
  - `portforward` – 포트 포워딩  
  - `healthz` – 헬스 체크 엔드포인트  
  - `pods` – Pod 목록 조회 등  
- **GA 전 단계 이력**  
  - Alpha (v1.32) → Beta (v1.33, 기본 활성화) → GA (v1.36, 기능 게이트 잠금) [[출처](https://kubernetes.io/blog/2026/04/24/kubernetes-v1-36-fine-grained-kubelet-authorization-ga/)].

## 4. 동작 원리 및 아키텍처
- **Kubelet 내부 인증 흐름 변화**  
  기존에는 모든 Kubelet API 요청이 `nodes/proxy` 권한 검증을 거쳤지만, 이제 요청 경로별로 별도 권한 검증이 수행됩니다.  
- **Webhook / ABAC / Node Authorizer와의 연계**  
  - Webhook Authorizer는 각 서브리소스(`metrics`, `logs` 등)에 대해 개별 정책을 적용할 수 있습니다.  
  - 기존 ABAC 정책도 동일하게 세분화된 리소스 이름을 사용해 매핑 가능합니다.  
- **권한 매핑 테이블 및 정책 정의 포맷**  
  - `authorization.k8s.io/v1` `SubjectAccessReview` 객체에 `resource: "pods/logs"` 와 같이 세부 리소스를 지정합니다.  
  - 정책은 `Role`/`ClusterRole` 에서 `apiGroups: [""]`, `resources: ["pods/logs"]`, `verbs: ["get"]` 형태로 선언됩니다.

## 5. 활성화 및 설정 방법
- **기본값**  
  v1.36부터 `KubeletFineGrainedAuthz`는 자동으로 활성화되며, 플래그를 통해 비활성화할 수 없습니다.  
- **수동 활성화/비활성화(이전 버전)**  
  - Kubelet 실행 플래그: `--feature-gates=KubeletFineGrainedAuthz=true` (v1.33~v1.35)  
  - ConfigMap `kubelet-config` 에 `featureGates.kubeletFineGrainedAuthz: true` 로 지정 가능.  
- **Authorization 정책 예시 YAML**  

    kind: Role  
    apiVersion: rbac.authorization.k8s.io/v1  
    metadata:  
        name: kubelet-metrics-reader  
        namespace: kube-system  
    rules:  
    - apiGroups: [""]  
      resources: ["nodes/metrics"]  
      verbs: ["get"]  

    kind: RoleBinding  
    apiVersion: rbac.authorization.k8s.io/v1  
    metadata:  
        name: bind-metrics-reader  
        namespace: kube-system  
    subjects:  
    - kind: ServiceAccount  
      name: prometheus-sa  
      namespace: monitoring  
    roleRef:  
        kind: Role  
        name: kubelet-metrics-reader  
        apiGroup: rbac.authorization.k8s.io  

## 6. 기존 클러스터 마이그레이션 가이드
- **`nodes/proxy` 권한 제거 전 사전 점검**  
  - 현재 `ClusterRole`/`ClusterRoleBinding` 에서 `nodes/proxy` 가 부여된 대상 파악 (`kubectl get clusterrole -o yaml | grep nodes/proxy`).  
  - 모니터링, 로그 수집, 헬스 체크 도구가 각각 어떤 Kubelet 서브리소스를 실제로 사용하는지 확인.  
- **단계별 마이그레이션 절차**  
  1. **테스트 환경**에 v1.36 클러스터를 배포하고, 기존 `nodes/proxy` 권한을 유지한 상태에서 기능 정상 동작 확인.  
  2. **세분화 정책 적용** – 위 예시와 같이 각 서비스에 최소 권한 Role/ClusterRole을 생성.  
  3. **`nodes/proxy` 권한 제거** – `kubectl edit clusterrole <role>` 로 `nodes/proxy` 를 삭제하고, 서비스가 정상 동작하는지 검증.  
  4. **프로덕션 적용** – 단계적 롤아웃(예: Canary) 후 전체 클러스터에 적용.  
- **롤백 전략 및 위험 완화 팁**  
  - 정책 적용 전 `kubectl get --raw /api/v1/nodes/<node>/proxy/metrics` 로 현재 접근 가능 여부 확인.  
  - 롤백 시 기존 `ClusterRole`을 그대로 복구하거나, 임시 `nodes/proxy` 권한을 부여하는 `ClusterRoleBinding`을 생성.  

## 7. 보안·운영 효과
- **Least‑Privilege 적용 사례**  
  - Prometheus는 이제 `nodes/metrics` 만 권한을 받아도 메트릭 수집이 가능해, `nodes/proxy` 전체 권한을 부여할 필요가 사라짐.  
- **공격 표면 감소 및 블래스트 반경 감소**  
  - `nodes/proxy`가 사라짐에 따라 침해된 모니터링 에이전트가 컨테이너 내부 명령을 실행할 수 없게 되어, 노드 전체에 대한 위험이 크게 감소합니다[[출처](https://kubernetes.io/blog/2026/04/24/kubernetes-v1-36-fine-grained-kubelet-authorization-ga/)].
- **모니터링·로깅 도구와의 호환성 개선**  
  - 기존 `kubectl proxy` 기반 스크립트는 그대로 동작하지만, 권한이 세분화되므로 감사 로그에 정확한 리소스 접근 기록이 남아 추적이 용이합니다.

## 8. 베스트 프랙티스
- **권한 설계 시 고려사항**  
  - 역할 기반 접근 제어(RBAC)에서 `apiGroups: [""]` 와 `resources` 를 세부 Kubelet 서브리소스로 명시.  
  - 네임스페이스 별 정책을 적용해, 예를 들어 `monitoring` 네임스페이스에서는 `nodes/metrics` 와 `nodes/logs` 만 허용.  
- **CI/CD 파이프라인에 정책 검증 자동화**  
  - `kubeval` 혹은 `conftest` 로 RBAC YAML 검증 단계에 “세분화된 Kubelet 리소스 사용 여부” 체크를 추가.  
- **감사 로그와 연계한 모니터링 전략**  
  - `audit-policy.yaml` 에 `resources: ["nodes/*"]` 를 포함해 Kubelet 서브리소스 접근 시 로그를 남기고, Loki/Grafana 등으로 시각화.  

## 9. 호환성 및 제한 사항
- **지원되는 Kubelet 버전 및 API 경로**  
  - v1.36 이상 Kubelet에서만 `KubeletFineGrainedAuthz` 가 강제 활성화됩니다.  
  - 기존 `nodes/proxy` 경로는 여전히 동작하지만, 권한 검증은 세분화된 리소스로 매핑됩니다.  
- **아직 지원되지 않는 기능**  
  - `attach` API와 일부 `exec` 옵션은 아직 `nodes/proxy` 권한에 의존하고 있어, 완전한 세분화가 이루어지지 않았습니다.  
- **다른 인증 플러그인과의 충돌 가능성**  
  - Webhook Authorizer가 `nodes/proxy` 를 명시적으로 허용하도록 설정돼 있으면, 세분화된 정책보다 우선 적용될 수 있으므로 정책 순서를 검토해야 합니다.

## 10. 트러블슈팅 & FAQ
- **권한 오류 발생 시 확인 체크리스트**  
  1. `kubectl auth can-i get nodes/metrics --as <serviceaccount>` 로 실제 권한 확인.  
  2. Kubelet 로그(`kubelet -v=4`)에 `authorization` 관련 디버그 메시지 확인.  
  3. `audit.log` 에 `verb: "get", resource: "nodes/metrics"` 가 기록되는지 검토.  
- **자주 묻는 질문**  
  - **Q:** `nodes/proxy` 권한을 완전히 제거해도 기존 도구가 동작하나요?  
    **A:** 도구가 실제로 어떤 Kubelet 서브리소스를 호출하는지에 따라 다릅니다. `metrics`, `logs`, `healthz` 등은 세분화된 권한으로 대체 가능하지만, `attach` 등은 아직 `nodes/proxy` 가 필요할 수 있습니다.  
  - **Q:** 기존 클러스터에서 바로 GA 기능을 사용하려면 어떻게 해야 하나요?  
    **A:** v1.36 이상으로 업그레이드하면 자동으로 활성화됩니다. 별도 플래그 조작은 불가능합니다.  
- **디버깅 로그 레벨 및 도구**  
  - Kubelet `--v=4` 로 인증 흐름 로그를 상세히 출력.  
  - `kubectl auth reconcile` 로 RBAC 정책과 실제 권한을 비교 검증.  

## 11. 참고 자료 및 링크
- **공식 블로그 포스트**: [Kubernetes v1.36: Fine‑Grained Kubelet API Authorization Graduates to GA](https://kubernetes.io/blog/2026/04/24/kubernetes-v1-36-fine-grained-kubelet-authorization-ga/)  
- **SIG Auth·SIG Node 회의 기록**: (GitHub Discussions) [Kubelet Fine‑Grained Authorization Discussion #2958](https://github.com/kubernetes/sig-release/discussions/2958)  
- **관련 GitHub 이슈**: kubernetes/kubernetes#8346 (nodes/proxy 문제 논의)  
- **Kubernetes RBAC 공식 문서**: https://kubernetes.io/docs/reference/access-authn-authz/rbac/  

---  

*이 문서는 자동 감지 시스템에 의해 생성되었습니다. 최신 클러스터 환경에 적용하기 전, 반드시 테스트 환경에서 검증하시기 바랍니다.*