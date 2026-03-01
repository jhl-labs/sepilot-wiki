---
title: Introducing Node Readiness Controller
author: SEPilot AI
status: published
tags: [Kubernetes, NodeReadiness, Scheduler, Reliability]
redirect_from:
  - introducing-node-readiness-controller
order: 1
related_docs: ["cgroup-migration.md", "api-governance.md", "release-notes.md"]
quality_score: 77
---

## 1. 서론
이 문서는 **Node Readiness Controller**(NRC)를 처음 접하는 클러스터 운영자와 플랫폼 엔지니어를 대상으로 합니다.  
NRC는 기존 “Ready” 조건만으로는 충분히 표현되지 않는 복합 인프라 의존성을 선언형으로 관리하도록 설계되었습니다. 이를 통해 **스케줄링 정확성**과 **서비스 안정성**을 크게 향상시킬 수 있습니다 [Introducing Node Readiness Controller](https://kubernetes.io/blog/2026/02/03/introducing-node-readiness-controller/).

## 2. 기존 Kubernetes “Ready” 상태 한계
- **단일 이진 Ready 조건**: 현재 Kubernetes는 `NodeReady` 라는 하나의 불리언 플래그만을 사용해 노드가 워크로드를 받을 수 있는지를 판단합니다 [Introducing Node Readiness Controller](https://kubernetes.io/blog/2026/02/03/introducing-node-readiness-controller/).
- **복합 인프라 의존성**: 현대 클러스터에서는 네트워크 에이전트, 스토리지 드라이버, GPU 펌웨어, 사용자 정의 헬스 체크 등 여러 요소가 모두 정상이어야 실제로 “준비된” 상태가 됩니다.  
- **운영상의 문제**: Ready 플래그가 `True`라 하더라도 아직 초기화되지 않은 DaemonSet이나 드라이버가 존재하면, 워크로드가 조기에 스케줄링되어 서비스 장애가 발생할 수 있습니다 [Introducing Node Readiness Controller](https://kubernetes.io/blog/2026/02/03/introducing-node-readiness-controller/).

## 3. Node Readiness Controller 개요
- **프로젝트 소개**: Kubernetes 커뮤니티가 발표한 새로운 컨트롤 플레인 기능으로, 노드 부팅 과정에서 **맞춤형 스케줄링 게이트**를 선언형으로 정의합니다 [Introducing Node Readiness Controller](https://kubernetes.io/blog/2026/02/03/introducing-node-readiness-controller/).
- **핵심 목표**  
  1. **Custom Readiness** – 플랫폼별 “준비됨” 정의를 가능하게 함.  
  2. **자동 Taint 관리** – 조건 변화에 따라 노드에 자동으로 taint를 적용·제거.  
  3. **Declarative Bootstrapping** – 다단계 초기화 흐름을 명확히 관찰 가능하게 함.  
- **설계 원칙**: Node‑centric, 선언형 API를 통해 운영자가 복잡한 부팅 로직을 코드가 아닌 YAML로 관리하도록 합니다.

## 4. 핵심 개념 및 아키텍처
| 개념 | 설명 |
|------|------|
| **Readiness Gate** | 사용자가 정의하는 커스텀 조건(예: DaemonSet 상태, 외부 HTTP 헬스 체크 등)을 `NodeReadinessGate` CRD 형태로 선언합니다. |
| **Taint & Toleration 자동화** | 조건이 만족되지 않으면 `node-readiness.kubernetes.io/not-ready` taint가 자동으로 부여되고, 조건이 충족되면 자동 제거됩니다. |
| **Controller Loop** | API Server를 watch하고, `NodeReadinessGate`와 실제 노드 상태를 비교해 리컨실리시에이션을 수행합니다. |
| **구성 요소 간 인터페이스** | - **API Server**: CRD와 노드 상태를 저장·조회.<br>- **Scheduler**: taint 기반으로 스케줄링 결정을 내림.<br>- **Kubelet**: 기본 `Ready` 조건을 지속적으로 업데이트. |

## 5. Custom Readiness 정의 방법
### CRD: `NodeReadinessGate`
- **apiVersion**: `node.k8s.io/v1alpha1`  
- **kind**: `NodeReadinessGate`  
- **spec**:  
  - `nodeSelector`: 대상 노드 그룹을 라벨로 지정.  
  - `conditions`: 배열 형태로 정의된 개별 체크 항목. 각 항목은 `type`(HealthCheck, DaemonSet, ExternalSignal 등)과 `target`(예: DaemonSet 이름, HTTP endpoint) 등을 포함합니다.  

> **예시** (핵심 포인트만)  
```yaml
apiVersion: node.k8s.io/v1alpha1
kind: NodeReadinessGate
metadata:
  name: gpu-node-gate
spec:
  nodeSelector:
    node.kubernetes.io/instance-type: gpu
  conditions:
  - type: DaemonSet
    name: nvidia-driver-installer
  - type: ExternalSignal
    url: https://health.example.com/gpu
```  
※ 실제 필드 상세는 공식 CRD 스키마를 참고하십시오 [공식 문서](https://kubernetes.io/docs/reference/).

## 6. 자동 Taint 관리 메커니즘
- **기본 Taint**: `node-readiness.kubernetes.io/not-ready:NoSchedule` 가 자동으로 생성됩니다.  
- **트리거**:  
  - **조건 변화**: 모든 `Readiness Gate`가 `True`가 되면 taint가 제거됩니다.  
  - **타임아웃**: 지정된 기간 내에 조건이 충족되지 않으면 taint가 유지됩니다.  
- **충돌 방지**: 기존 사용자 정의 taint와 네임스페이스가 겹치지 않도록 `node-readiness.kubernetes.io/` 네임스페이스를 전용으로 사용합니다.

## 7. 선언형 노드 부트스트래핑 워크플로우
1. **네트워크 초기화** – 네트워크 에이전트 DaemonSet이 `Ready`가 될 때까지 `not-ready` taint 유지.  
2. **스토리지 연결** – CSI 플러그인 헬스 체크가 성공하면 두 번째 gate가 해제.  
3. **특수 하드웨어** – GPU 드라이버, FPGA 펌웨어 등 추가 조건이 모두 만족될 때 최종적으로 taint가 제거되어 스케줄링이 가능해집니다.  

> **상태 전이 다이어그램**: `NotReady → (조건1 OK) → (조건2 OK) → Ready`  
> **관찰 포인트**: `kubectl get nodes -o wide` 로 현재 taint 상태 확인, `kubectl describe node <name>` 로 개별 gate 상태 확인.

## 8. 실사용 사례
- **GPU 노드**: `NodeReadinessGate`에 NVIDIA 드라이버 DaemonSet과 외부 펌웨어 검증 endpoint을 지정해, 드라이버가 완전히 로드된 뒤에만 GPU 워크로드가 스케줄됩니다.  
- **스토리지 전용 노드**: CSI 플러그인 헬스 체크를 `ExternalSignal` 로 연결해, 스토리지 서비스가 정상 작동할 때만 PVC를 바인딩합니다.  
- **Edge/5G 노드**: 네트워크 에이전트(예: Open5GS) 가용성을 `DaemonSet` 조건으로 지정해, 네트워크 연결이 확보된 시점에만 엣지 워크로드가 배포됩니다.  
- **다중 클러스터/하이브리드**: 각 클러스터별 라벨링 전략과 `NodeReadinessGate`를 조합해, 동일한 워크로드가 서로 다른 준비 조건을 갖는 노드에 자동으로 맞춤 배포됩니다.  

## 9. 설치 및 설정 가이드
1. **배포 방법**  
   - **Helm Chart**: `helm repo add node-readiness-controller https://charts.k8s.io` → `helm install nrc node-readiness-controller`  
   - **Kustomize**: `kustomize build ./config/default | kubectl apply -f -`  
2. **필수 RBAC**  
   - `node-readiness-controller` ServiceAccount에 `nodes`, `nodeprovisioners`, `customresourcedefinitions`에 대한 `get/list/watch` 권한 부여.  
3. **API Server 설정**  
   - `--runtime-config=node.k8s.io/v1alpha1=true` 플래그를 활성화해야 CRD가 인식됩니다.  
4. **기본값 vs 커스텀**  
   - 기본값: 모든 노드에 `node-readiness.kubernetes.io/not-ready` taint 적용, `NodeReadinessGate`가 없으면 기존 `Ready`와 동일하게 동작.  
   - 커스텀: 특정 라벨에만 적용, 조건 타임아웃 조정, 추가 taint 키 지정 가능.  

## 10. 운영 베스트 프랙티스
- **조건 설계**: 지연 허용 범위와 실패 재시도 정책을 명확히 정의하고, 중요한 인프라(예: 스토리지)에서는 보수적인 타임아웃을 설정합니다.  
- **Taint/Toleration 호환성**: 기존 워크로드가 새로운 `node-readiness.kubernetes.io/not-ready` taint를 tolerates하도록 `PodSpec.tolerations`에 추가하거나, 필요 시 워크로드 별로 별도 toleration을 선언합니다.  
- **CI/CD 연계**: PR 검증 단계에서 `kubectl wait --for=condition=Ready node/<node>` 대신 `NodeReadinessGate`가 모두 `True`가 되는지 확인하는 스크립트를 포함합니다.  

## 11. 보안 및 접근 제어
- **CRD 접근 최소화**: `NodeReadinessGate`는 `cluster-admin` 수준이 아닌, 특정 네임스페이스에 제한된 Role을 통해 관리합니다.  
- **외부 신호 연동**: HTTP 기반 헬스 체크는 TLS와 인증 토큰을 사용해 보호해야 하며, API Server는 해당 endpoint에 대한 네트워크 정책을 적용합니다.  
- **권한 상승 방지**: 악의적인 사용자가 임의의 taint를 삽입하지 못하도록 `node-readiness.kubernetes.io/` 네임스페이스에 대한 `create`/`update` 권한을 제한합니다.  

## 12. 모니터링·관찰성
- **주요 메트릭** (kube‑state‑metrics, Prometheus)  
  - `node_readiness_gate_status{node="<name>",condition="<type>",status="true|false"}`  
  - `node_readiness_taint_active{node="<name>"}`  
- **이벤트 로그**: `kubectl get events --field-selector involvedObject.kind=Node` 로 taint 적용·제거 이벤트 확인.  
- **Grafana 대시보드**: 노드별 gate 진행 상황, 현재 taint 상태, 조건 실패 비율 등을 시각화하는 템플릿이 공식 레포지토리에서 제공됩니다 [공식 문서](https://kubernetes.io/docs/).  

## 13. 업그레이드·마이그레이션 가이드
1. **단계적 적용**: 먼저 비핵심 워크로드가 있는 테스트 클러스터에 NRC를 배포하고, `NodeReadinessGate` 없이 기본 동작을 확인합니다.  
2. **버전 호환성**: NRC는 Kubernetes 1.28 이상에서 지원됩니다 [Introducing Node Readiness Controller](https://kubernetes.io/blog/2026/02/03/introducing-node-readiness-controller/).  
3. **롤백**: `helm uninstall nrc` 혹은 `kubectl delete -f <nrc-manifests>` 로 컨트롤러를 제거하면 기존 `Ready` 플래그만 남게 됩니다. 기존 taint는 자동으로 정리됩니다.  

## 14. 트러블슈팅 FAQ
- **조건이 인식되지 않음**  
  - `kubectl describe node <name>` 에서 `Readiness Gates` 섹션을 확인하고, CRD가 올바르게 적용됐는지 검증합니다.  
- **Taint가 남아 있음**  
  - 조건이 `True`가 되더라도 타임아웃이 설정돼 있으면 자동 제거가 지연될 수 있습니다. `NodeReadinessGate.spec.timeoutSeconds` 값을 확인합니다.  
- **Controller 로그 확인**  
  - 컨트롤러 Pod의 로그 레벨을 `--v=4` 로 높이면 상세 이벤트를 확인할 수 있습니다.  

## 15. 기존 Ready 조건과 비교
| 항목 | 기존 Ready | Node Readiness Controller |
|------|------------|---------------------------|
| 정의 범위 | 단일 이진 플래그 | 다중 커스텀 조건 (Readiness Gate) |
| 자동 Taint | 없음 (수동) | `node-readiness.kubernetes.io/not-ready` 자동 적용/제거 |
| 가시성 | `kubectl get nodes` 에서 Ready/NotReady만 표시 | 각 Gate 별 상태와 메트릭 제공 |
| 사용 시점 | 모든 노드에 적용 | 특정 라벨/노드 그룹에 선택적 적용 가능 |

**언제 기존 Ready만으로 충분한가?**  
- 단순한 클러스터(네트워크, 스토리지, 하드웨어 의존성이 거의 없는 경우)에서는 기존 Ready가 충분합니다.  
- 복합 인프라(전용 GPU, CSI, 엣지 네트워크 등)에서는 NRC 도입을 권장합니다.

## 16. 향후 로드맵 및 커뮤니티 참여
- **예정 기능**  
  - 멀티‑Gate 조합을 통한 정책 기반 스케줄링.  
  - Gate 상태에 따른 자동 스케일링 정책 연동.  
- **기여 방법**  
  - GitHub `kubernetes-sigs/node-readiness-controller` 레포지토리에서 이슈 제기 및 PR 제출.  
  - SIG‑Node 토론에 참여해 피드백을 공유합니다.  

## 17. 참고 자료 및 링크
- **공식 블로그 포스트**: [Introducing Node Readiness Controller](https://kubernetes.io/blog/2026/02/03/introducing-node-readiness-controller/)  
- **GitHub 레포지토리**: `https://github.com/kubernetes-sigs/node-readiness-controller` (공식 구현)  
- **CRD 스키마 문서**: `https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#nodereadinessgate-v1alpha1`  
- **관련 사례 블로그**: Jerry Lee의 “Node Ready를 믿지 마세요!” (LinkedIn) [링크](https://www.linkedin.com/posts/jeeunglee_node-ready%EB%A5%BC-%EB%AF%BF%EC%A7%80-%EB%A7%88%EC%84%B8%EC%9A%94-node-readiness-activity-7426756404750897152-SRxo)  

---