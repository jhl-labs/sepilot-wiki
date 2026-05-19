---
title: Kubernetes v1.36: Advancing Workload-Aware Scheduling
author: SEPilot AI
status: published
tags: [Kubernetes, v1.36, Workload-Aware Scheduling, PodGroup, DRA]
---

## 개요
- **문서 목적**: Kubernetes v1.36에서 도입된 워크로드‑인식 스케줄링(Workload‑Aware Scheduling) 기능을 이해하고, 기존 클러스터에 적용하기 위한 실무 가이드를 제공한다.  
- **대상 독자**: 클러스터 운영자, 플랫폼 엔지니어, AI/ML·배치 워크로드를 운영하는 개발자, 그리고 Kubernetes 스케줄러 확장을 담당하는 팀.  
- **v1.36 릴리즈 핵심 요약**  
  - `scheduling.k8s.io/v1alpha2` API 그룹 도입, 기존 `v1alpha1` 대체.  
  - **Workload API** → 정적 템플릿 역할.  
  - **PodGroup API** → 런타임 상태 관리 객체.  
  - 새로운 **PodGroup Scheduling Cycle**, 토폴로지‑인식 스케줄링, 워크로드‑인식 프리엠션, ResourceClaim 연계(DRA) 등.  
- **워크로드‑인식 스케줄링이 왜 중요한가**  
  - AI/ML 트레이닝, HPC, 대규모 배치 잡은 수십·수백 개의 Pod이 동시에 배치돼야 의미가 있다. 기존 “Pod‑by‑Pod” 스케줄링은 자원 파편화와 비효율을 초래한다. v1.36은 이러한 워크로드를 **원자적으로** 스케줄링하고, 전체 워크로드 수준에서 프리엠션·토폴로지 제약을 적용한다.  

## 배경: AI/ML·배치 워크로드와 기존 스케줄링 한계
- **Pod‑by‑Pod 스케줄링의 제약**  
  - 각 Pod을 독립적으로 배치하므로, 동일 워크로드에 속한 Pod이 서로 다른 노드에 흩어질 수 있다.  
  - 자원 할당이 비효율적이며, 네트워크 대역폭·GPU 연결 비용이 증가한다.  
- **v1.35에서 도입된 최초 워크로드‑인식 기능 요약**  
  - **Workload API**(v1alpha1)와 **기본 Gang Scheduling**을 제공해, 동일 워크로드에 속한 Pod을 한 번에 스케줄링하도록 지원했다.  
  - **Opportunistic Batching** 기능으로 동일 사양 Pod을 배치 시 배치 효율을 높였다.  
  - (출처: [Kubernetes Blog, v1.35 소개](https://kubernetes.io/blog/2026/05/13/kubernetes-v1-36-advancing-workload-aware-scheduling/))  
- **실제 사용 사례와 문제점**  
  - **ML 트레이닝**: 수십 개 GPU를 필요로 하는 파라미터 서버와 워커가 서로 다른 노드에 흩어지면 학습 속도가 급격히 저하.  
  - **HPC 배치**: 노드 간 통신 비용이 높은 경우, 워크로드가 분산되면 전체 작업이 병목.  
  - **배치 잡**: 동일 사양의 대량 Pod이 클러스터 전역에 고르게 퍼지면서 스케줄링 대기 시간이 길어짐.  

## v1.35 회고
| 항목 | 내용 |
|------|------|
| **Workload API (v1alpha1)** | 워크로드를 정의하는 정적 템플릿 역할. Pod 그룹과 런타임 상태가 동일 리소스에 포함. |
| **기본 Gang Scheduling** | 워크로드에 속한 모든 Pod이 동시에 스케줄링될 때까지 대기. |
| **Opportunistic Batching** | 동일 사양 Pod을 배치 시 배치 효율을 높이는 보조 기능. |
| **제한점** | - 워크로드와 런타임 상태가 결합돼 확장성·성능에 한계. <br> - 토폴로지 제약·프리엠션 정책이 제한적. |  

## v1.36 주요 아키텍처 변화
- **API 그룹 `scheduling.k8s.io/v1alpha2` 도입**  
  - 기존 `v1alpha1`을 완전히 대체하고, API 책임을 명확히 분리한다.  
- **Workload API → 정적 템플릿**  
  - 워크로드 정의만 담당하고, 실제 실행 시점의 상태는 보관하지 않는다.  
- **PodGroup API → 런타임 상태 관리 객체**  
  - 워크로드 실행 중 발생하는 상태(예: `Pending`, `Running`, `Succeeded`, `Failed`)를 관리한다.  
- **효과**  
  - 워크로드와 상태가 분리돼 **성능·확장성**이 개선되고, Scheduler가 원자적으로 워크로드 전체를 처리할 수 있다. (출처: [Kubernetes Blog, v1.36 발표](https://kubernetes.io/blog/2026/05/13/kubernetes-v1-36-advancing-workload-aware-scheduling/))  

## Workload API 상세
### 주요 필드 및 스키마
```yaml
apiVersion: scheduling.k8s.io/v1alpha2
kind: Workload
metadata:
  name: <workload-name>
spec:
  # 워크로드가 요구하는 전체 리소스(예: CPU, memory, GPU)
  resourceTemplate:
    cpu: "64"
    memory: "256Gi"
    gpu: "8"
  # 워크로드 수준의 스케줄링 정책
  schedulingPolicy:
    # 예시: 최소 노드 수, 최대 스케줄링 지연 등
    minAvailable: 1
    maxSkew: 2
  # 토폴로지 제약(예: zone, rack)
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: "topology.kubernetes.io/zone"
      whenUnsatisfiable: "DoNotSchedule"
```
> **주의**: 위 예시는 `Workload`가 정적 템플릿임을 보여주기 위한 최소 스키마이며, 실제 필드는 공식 API 레퍼런스를 확인한다.  

### 기존 v1alpha1과의 호환성 매핑 가이드
| v1alpha1 필드 | v1alpha2 매핑 |
|---------------|----------------|
| `spec.template` | `spec.resourceTemplate` |
| `spec.gangScheduling` | `spec.schedulingPolicy` |
| `spec.topologySpreadConstraints` | 동일 (이동) |
| 런타임 상태 (`status`) | **PodGroup** 객체로 이동 |

## PodGroup API 상세
### 런타임 객체 구조와 상태 전이
```yaml
apiVersion: scheduling.k8s.io/v1alpha2
kind: PodGroup
metadata:
  name: <workload-name>-group
spec:
  workloadName: <workload-name>   # 연관된 Workload
  minMembers: 8                    # 전체 워크로드가 만족해야 하는 최소 Pod 수
status:
  phase: Pending | Running | Succeeded | Failed
  scheduledPods: 5                 # 현재 스케줄된 Pod 수
```
- **생성·관리 흐름**  
  1. 사용자는 `Workload` 객체를 정의한다.  
  2. Job/Controller가 `PodGroup`을 자동 생성하고 `minMembers` 등을 설정한다.  
  3. kube‑scheduler는 `PodGroup`을 관찰하며, `minMembers`가 충족될 때까지 해당 Pod을 대기시킨다.  
- **Scheduler와의 인터페이스**  
  - Scheduler는 `PodGroup` 객체를 읽어 **PodGroup Scheduling Cycle**을 수행한다.  
  - `PodGroup` 상태는 Scheduler가 원자적으로 업데이트한다 (`Pending → Running`).  

### 상태 조회 및 업데이트 베스트 프랙티스
- `kubectl get podgroup <name> -o yaml` 로 현재 상태 확인.  
- 상태 변경은 **Scheduler**가 전담하므로, 사용자는 `spec`만 수정하고 `status`는 직접 조작하지 않는다.  

## kube‑scheduler 확장
### 새로운 **PodGroup Scheduling Cycle**
- 기존 “Pod‑by‑Pod” 사이클 대신 **PodGroup** 단위로 스케줄링을 수행한다.  
- 워크로드 전체가 만족될 때까지 **원자적**으로 배치를 보류한다.  

### 플러그인 구조
| 플러그인 | 역할 |
|---------|------|
| `PodGroupPlugin` | `PodGroup` 객체를 인식하고, `minMembers` 충족 여부를 판단. |
| `WorkloadPreemptionPlugin` | 워크로드 수준 프리엠션 정책을 적용, 높은 우선순위 워크로드가 자원을 선점하도록 지원. |

### 기존 파이프라인과 차이점
- **전**: Scheduler는 각 Pod을 독립적으로 평가 → 스케줄링 지연·파편화 발생.  
- **후**: Scheduler는 `PodGroup` 전체를 평가 → 전체 워크로드가 동시에 배치되므로 자원 활용 효율 ↑.  

## 토폴로지‑인식 스케줄링 (Topology‑Aware Scheduling)
- **목표**: 워크로드가 특정 물리적 토폴로지(예: zone, rack, NUMA) 내에 고르게 분산되거나 집중되도록 제어.  
- **v1.36 제공 옵션**  
  - `topologySpreadConstraints`를 `Workload`에 선언해, 워크로드 수준에서 토폴로지 제약을 정의한다.  
  - `maxSkew`, `topologyKey`, `whenUnsatisfiable` 등 기존 필드를 그대로 사용하지만, **PodGroup** 단위로 적용된다.  

## 워크로드‑인식 프리엠션 (Workload‑Aware Preemption)
- **정책 개요**  
  - 워크로드 전체에 우선순위를 부여하고, 높은 우선순위 워크로드가 필요 시 기존 `PodGroup`을 프리엠션한다.  
- **시나리오**  
  - 긴급 AI 트레이닝 워크로드가 클러스터에 도착 → 현재 실행 중인 낮은 우선순위 배치 잡을 프리엠션하고, 필요한 GPU를 확보한다.  

## ResourceClaim와 동적 리소스 할당 (DRA) 연계
- **ResourceClaim 개념 복습**  
  - Pod이 실행 전에 동적으로 할당받는 리소스(예: GPU, FPGA, 특수 스토리지) 객체.  
- **PodGroup와 연동된 DRA 흐름**  
  1. `Workload` 정의 시 필요한 `ResourceClaimTemplate`을 명시.  
  2. Scheduler는 `PodGroup`이 생성될 때 해당 `ResourceClaim`을 일괄 생성·바인딩한다.  
  3. 워크로드가 실행되는 동안 동적 할당된 리소스가 유지된다.  
- **사용 팁**  
  - `ResourceClaim`을 `Workload` 수준에서 선언하면, 동일 워크로드 내 모든 Pod이 동일한 동적 리소스를 공유한다.  

## Job Controller와의 통합
- **연계 과정**  
  1. `Job` 객체가 생성되면, Job Controller는 자동으로 대응되는 `Workload`와 `PodGroup`을 생성한다.  
  2. `Workload`는 정적 템플릿을 제공하고, `PodGroup`은 실행 시점 상태를 관리한다.  
- **v1.36에서 지원되는 첫 단계**  
  - Job → Workload → PodGroup 연계가 **alpha** 수준에서 제공되어, 기존 Job 기반 배치 워크로드를 바로 활용할 수 있다. (출처: [Kubernetes Blog, v1.36 발표](https://kubernetes.io/blog/2026/05/13/kubernetes-v1-36-advancing-workload-aware-scheduling/))  
- **마이그레이션 시 주의사항**  
  - 기존 Job 매니페스트에 `spec.template`만 유지하고, `apiVersion: batch/v1`은 그대로 사용한다.  
  - 새 API가 자동으로 생성되므로, 별도 `Workload`/`PodGroup` 매니페스트를 작성할 필요가 없다.  

## 마이그레이션 가이드
### v1alpha1 → v1alpha2 API 변환 절차
1. **Workload 매니페스트 업데이트**  
   - `apiVersion: scheduling.k8s.io/v1alpha2` 로 변경.  
   - `spec.template` → `spec.resourceTemplate` 등 필드 매핑 적용.  
2. **PodGroup 매니페스트 추가 (필요 시)**  
   - 기존 `Workload.status`에 해당하던 부분을 `PodGroup` 객체로 분리.  
3. **컨트롤러/Operator 업데이트**  
   - Workload를 생성·조회하는 로직을 `v1alpha2` API 클라이언트로 교체.  
4. **테스트 전략**  
   - **스테이징 클러스터**에서 기존 워크로드를 `v1alpha2` 로 변환 후, `kubectl describe podgroup` 로 상태 확인.  
   - **롤백 플랜**: `v1alpha1` 매니페스트와 기존 컨트롤러를 유지하고, 새 API를 비활성화하는 FeatureGate(`WorkloadAwareScheduling`)를 끈다.  

### 기존 매니페스트 업데이트 체크리스트
- [ ] `apiVersion`을 `scheduling.k8s.io/v1alpha2` 로 변경.  
- [ ] `spec.template` → `spec.resourceTemplate` 매핑.  
- [ ] `status` 필드 제거 (PodGroup가 담당).  
- [ ] `topologySpreadConstraints` 유지 여부 확인.  
- [ ] `minMembers` 등 워크로드 규모 설정을 `PodGroup.spec.minMembers` 로 이동.  

## 베스트 프랙티스
- **API 선택 기준**  
  - **정적 템플릿만 필요** → `Workload`만 선언.  
  - **런타임 상태·프리엠션이 필요** → `PodGroup`을 함께 사용.  
- **스케줄링 정책 조합 예시**  
  - `Workload`에 `resourceTemplate`으로 GPU 8개, `minMembers: 8` 설정 → 전체 GPU가 한 노드에 모여야 함.  
  - `topologySpreadConstraints`를 `zone`에 적용해, 다중 AZ에 고르게 분산.  
- **성능·확장성 최적화 팁**  
  - `PodGroup` 객체 수를 최소화하고, 동일 워크로드는 하나의 `PodGroup`에 묶는다.  
  - `ResourceClaim`을 워크로드 수준에서 선언해, 동적 할당 오버헤드를 감소시킨다.  

## 관측 및 메트릭
- **새로운 스케줄링 메트릭**  
  - `scheduler_podgroup_pending_total` – 대기 중인 PodGroup 수.  
  - `scheduler_podgroup_scheduled_total` – 성공적으로 스케줄된 PodGroup 수.  
  - `scheduler_preemption_workload_total` – 워크로드 수준 프리엠션 발생 횟수.  
- **Prometheus 대시보드 예시**  
  ```yaml
  - job_name: 'kube-scheduler'
    static_configs:
      - targets: ['<scheduler-ip>:10259']
  ```  
  - Grafana 대시보드에 `PodGroup Pending`, `PodGroup Scheduled`, `Workload Preemptions` 패널을 추가한다.  
- **문제 진단**  
  - `kubectl get events --field-selector reason=PodGroupUnschedulable` 로 원인 파악.  
  - Scheduler 로그에 `PodGroupSchedulingCycle` 키워드 검색.  

## 보안 및 권한 관리
- **RBAC 모델**  
  ```yaml
  apiVersion: rbac.authorization.k8s.io/v1
  kind: Role
  metadata:
    name: workload-scheduler
    namespace: default
  rules:
  - apiGroups: ["scheduling.k8s.io"]
    resources: ["workloads", "podgroups"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  ```  
- **권한 최소화 원칙**  
  - 일반 개발자는 `Workload`만 `create`/`get` 가능하도록 하고, `PodGroup`은 Scheduler 전용 ServiceAccount에만 `update` 권한을 부여한다.  
- **보안 감사 로그**  
  - `audit-policy.yaml`에 `resource: "workloads"` 및 `resource: "podgroups"`에 대한 `verb: "create|update|delete"` 이벤트를 기록하도록 설정한다.  

## FAQ
| 질문 | 답변 |
|------|------|
| **v1.35에서 만든 Workload 매니페스트를 그대로 사용할 수 있나요?** | `apiVersion`과 필드 매핑만 적용하면 그대로 사용할 수 있다. `status`는 `PodGroup`으로 이동한다. |
| **PodGroup이 자동으로 생성되지 않으면 어떻게 해야 하나요?** | Job/Controller가 `Workload`와 연계된 `PodGroup`을 생성하도록 FeatureGate `WorkloadAwareScheduling`이 활성화돼 있는지 확인한다. |
| **프리엠션이 발생했을 때 어떤 로그를 확인해야 하나요?** | Scheduler 로그에 `WorkloadPreemptionPlugin` 관련 메시지와 `PodGroup` 객체의 `status.phase` 변화를 확인한다. |
| **DRA와 연계된 ResourceClaim이 적용되지 않을 때** | `Workload.spec.resourceTemplate`에 `resourceClaims`가 정의돼 있는지, 그리고 해당 `ResourceClass`가 클러스터에 존재하는지 검증한다. |
| **마이그레이션 중 API 버전 충돌 오류** | `kubectl api-resources | grep scheduling.k8s.io` 로 현재 지원되는 버전을 확인하고, `--validate=false` 옵션을 일시적으로 사용해 매니페스트를 적용한다. |

## 참고 자료
- **공식 블로그 포스트**: *Kubernetes v1.36: Advancing Workload-Aware Scheduling* – <https://kubernetes.io/blog/2026/05/13/kubernetes-v1-36-advancing-workload-aware-scheduling/> [출처]  
- **KEP-4671** (Workload‑Aware Scheduling) – GitHub PR #54667, kubernetes/website (관련 설계·토론)  
- **Kubernetes 공식 API 레퍼런스** – `scheduling.k8s.io/v1alpha2` (Workload, PodGroup)  
- **관련 강의·블로그**: Kubermatic “Kubernetes v1.36 ‘Haru’ Arrives After the Frost” – 워크로드‑인식 스케줄링 개요 제공.  

*이 문서는 자동 감지된 트렌드 정보를 기반으로 작성되었습니다. 최신 클러스터 환경에 적용하기 전, 반드시 테스트 환경에서 검증하시기 바랍니다.*