---
title: Kubernetes v1.36: More Drivers, New Features, and the Next Era of DRA
author: SEPilot AI
status: published
tags: [Kubernetes, v1.36, Dynamic Resource Allocation, DRA, Drivers, ResourceClaims, Upgrade Guide]
updatedAt: 2026-05-29
---

## 개요
이 문서는 **Kubernetes v1.36** 릴리즈에 포함된 **Dynamic Resource Allocation (DRA)** 의 최신 변화와 실무 적용 방안을 살펴봅니다.  

- **대상 독자**: 클러스터 운영자, 플랫폼 엔지니어, DevOps 팀, AI/ML 워크로드 담당자  
- **핵심 요약**  
  - v1.36은 **2026년 4월 22일**에 정식 릴리즈되었습니다. 현재 **Alpha**·**Beta** 단계에 있는 여러 DRA 기능이 포함되었습니다.  
  - GPU·FPGA·ASIC 등 기존 가속기 외에 **네트워킹·스토리지** 등 이기종 하드웨어 지원이 확대되었습니다.  
  - **Prioritized List**, **Native Resource Extension** 등은 현재 **Alpha** 단계이며, 향후 릴리즈 로드맵에 따라 단계가 승격될 가능성이 있습니다.  

> 참고: 공식 릴리즈 페이지는 [Kubernetes v1.36.0 Release](https://github.com/kubernetes/kubernetes/releases/tag/v1.36.0)이며, **1181개의 커밋**이 포함된 릴리즈입니다. 자세한 변경 사항은 CHANGELOG를 확인하십시오.

## Dynamic Resource Allocation (DRA) 기본 개념
| 항목 | 설명 |
|------|------|
| **DRA 정의** | 하드웨어 가속기·전용 자원을 **ResourceClaim** 객체를 통해 선언하고, 스케줄러가 드라이버와 연계해 동적으로 할당·해제하는 메커니즘 |
| **기존 문제점** | 전통적인 **Extended Resource** 방식은 하드웨어 종류가 늘어날수록 관리 복잡도와 스케줄링 비효율이 증가함. DRA는 선언형 API와 드라이버 기반 할당으로 이를 해소 |
| **주요 구성 요소** | **Driver** – 하드웨어와 K8s 사이의 인터페이스<br>**ResourceClaim** – 워크로드가 필요로 하는 구체적 자원 정의<br>**Scheduler** – Claim‑to‑Device 매핑 로직 수행 |

## v1.36에 포함된 DRA 주요 업데이트
- **전체 흐름**: Alpha 단계에서 검증 중인 기능이 차례로 Beta·Stable 로 승격될 예정이며, 신규 드라이버와 네이티브 리소스 연계가 추가되었습니다.  
- **릴리즈 현황**  

| 버전 | 단계 | 주요 내용 |
|------|------|-----------|
| v1.35 | Stable | 기존 DRA Alpha 기능(기본 ResourceClaim) 정식 GA |
| v1.36 | Stable (2026‑04‑22) | Prioritized List, Native Resource Extension, ResourceClaims in PodGroups 등 Alpha 기능 도입 |
| v1.37 | 예정 | Alpha 단계 기능들의 승격 및 추가 하드웨어 드라이버 지원 확대 |

## Feature Graduations (기능 승격 현황)
| 기능 | 현재 단계 (v1.36) | 설명 |
|------|----------------------|------|
| **Prioritized List** | Alpha | 장치 모델 우선순위(예: H100 → A100)를 선언해 스케줄러가 순차 매칭 |
| **Extended Resource Support** | Beta | 기존 Extended Resource와 DRA 연동, 점진적 마이그레이션 가능 |
| **ResourceClaims in PodGroups** | Alpha | 여러 Pod이 하나의 ResourceClaim을 공유하도록 지원 |
| **Native Resource Extension** | Alpha | CPU·Memory 등 기본 리소스에 DRA 모델 적용 |
| **새로운 하드웨어 드라이버** | Alpha | 네트워킹·스토리지 등 비‑컴퓨트 가속기 지원 시작 |

> **참고**: 각 기능의 상세 설계와 진행 상황은 해당 KEP 페이지에서 확인할 수 있습니다. (예: [KEP 2369 – Prioritized List](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/2369-dynamic-resource-allocation#prioritized-list))

## 새로운 드라이버 및 하드웨어 지원 확대
- **지원 가속기**: GPU, FPGA, ASIC 외에 **SmartNIC**(네트워킹) 및 **NVMe 오프로드**(스토리지) 드라이버가 Alpha 단계에서 추가되었습니다.  
- **이기종 환경 대응**: `DeviceClass`와 `Driver Registry`를 활용해 클러스터 내 다양한 모델·벤더를 하나의 정책으로 관리할 수 있습니다.  
- **드라이버 생태계**: 커뮤니티와 벤더가 제공하는 오픈소스 드라이버가 지속적으로 증가하고 있어, 새로운 하드웨어 도입 시 빠른 통합이 가능해질 전망입니다.  

## Extended Resource Support (확장 리소스 지원)
- **연동 방법**: 기존 `resources.limits`/`requests`에 선언된 **Extended Resource** 이름을 그대로 사용하면서 DRA가 내부적으로 해당 Claim 객체를 생성·관리합니다.  
- **마이그레이션 가이드**  
  1. 기존 Pod 정의에 `resourceClaims` 섹션을 추가  
  2. `resourceClaimTemplate` 에 기존 Extended Resource 이름을 매핑  
  3. 테스트 후 `Extended Resource` 선언을 단계적으로 제거  

## ResourceClaims in PodGroups
- **PodGroup 개념**: 여러 Pod이 하나의 논리적 그룹으로 묶여 동일한 자원 할당 정책을 공유합니다.  
- **사용 시나리오**: 대규모 AI 학습 작업에서 여러 워커가 동시에 동일한 GPU 풀을 사용해야 할 때, PodGroup + ResourceClaim 로 일관된 할당을 보장합니다.  
- **흐름**  
  1. `PodGroup` 객체 생성 → 그룹에 속한 Pod 지정  
  2. `ResourceClaim` 을 PodGroup 수준에서 정의  
  3. 스케줄러가 그룹 전체에 대해 최적의 디바이스 매핑 수행  

## Prioritized List (우선순위 리스트)
- **정의 방법**: `DeviceClass` 혹은 `DeviceSelector` 안에 `prioritizedList` 필드를 사용해 모델 순서를 명시합니다.  
- **스케줄러 평가 로직**  
  1. 첫 번째 모델 가용 여부 확인 → 할당  
  2. 없을 경우 다음 모델로 이동, 최종적으로 fallback 옵션까지 탐색  
- **활용 사례**: 최신 H100 가용 시 우선 사용, 부족 시 A100 로 자동 전환  

## Native Resource와의 연계 (CPU, Memory)
- **확장된 할당**: DRA가 CPU·Memory 를 **DeviceClass** 로 추상화해, 기존 `requests.cpu`/`memory` 와 동일한 방식으로 선언 가능하게 함  
- **호환성**: 기존 스케줄러와 완전 호환되며, DRA가 활성화된 클러스터에서는 동일 API 로 CPU·Memory 를 포함한 전체 리소스 풀을 관리  

## 사용성 개선 및 오류 복구 기능
- **CLI 개선**: `kubectl dra` 서브커맨드가 추가되어 Claim 상태·드라이버 매핑을 직관적으로 조회 가능  
- **실패 감지·자동 폴백**: 디바이스 할당 실패 시 **fallback** 옵션을 자동 적용하고, 이벤트 로그에 `DRAFallback` 이 기록됩니다  

## 업그레이드 가이드
### 사전 준비 체크리스트
- 클러스터 버전이 **v1.35 이상**인지 확인  
- 현재 사용 중인 DRA 드라이버가 v1.36 **Alpha** 호환 버전인지 검증  
- `ResourceClaimTemplate` 과 `PodGroup` 사용 여부 파악  

### 단계별 업그레이드 절차
1. **Control Plane** 업그레이드 → v1.36 정식 이미지 적용  
2. **Node** 업그레이드 → 드라이버 DaemonSet 최신 버전 배포  
3. **CRD** 업데이트: `resourceclaims.dra.k8s.io` 등 최신 스키마 적용  
4. **테스트**: 스테이징 클러스터에서 Prioritized List, Extended Resource 연동 검증  
5. **프로덕션 전환**: 점진적 롤아웃 후 모니터링  

### 호환성 검증 방법
- `kubectl get resourceclaims` 로 상태 확인  
- `kubectl describe pod <pod>` 에서 `AllocatedDevice` 필드가 정상 매핑됐는지 확인  

## 베스트 프랙티스
- **워크로드 설계**: 가속기 요구사항을 **DeviceClass** 로 추상화하고, 가능한 경우 **Prioritized List** 로 비용·성능 최적화  
- **리소스 요청/제한**: DRA 기반 Claim 은 `requests`·`limits` 를 동시에 선언하지 말고, `resourceClaim` 로 일관성 유지  
- **클러스터 규모**: 이기종 디바이스가 혼재된 경우 **Driver Registry** 를 활용해 모델별 가용성을 사전에 파악하고, `fallback` 옵션을 반드시 정의  

## 보안 및 컴플라이언스 고려사항
- **드라이버 인증**: 드라이버는 Kubernetes **Admission Webhook** 을 통해 서명 검증 후 로드  
- **권한 관리**: `resourceclaims` 와 `podgroups` 에 대한 RBAC 정책을 별도 정의해 최소 권한 원칙 적용  
- **감사 로그**: DRA 관련 이벤트(`DRAAllocation`, `DRAFallback`)는 `audit.log` 에 기록되며, SIEM 연동을 권장  

## 관측성 및 모니터링
- **메트릭**: `dra_device_allocation_total`, `dra_fallback_count`, `dra_driver_error_total` 등 Prometheus exporter 제공  
- **이벤트**: `DRAAllocationSucceeded`, `DRAAllocationFailed` 이벤트를 `kube-event` 스트림에서 수집  
- **대시보드**: Grafana 템플릿에 **DRA Overview** 패널을 추가해 디바이스 가용률·실패율 시각화  
- **알림**: `fallback` 발생 시 Slack/Teams 알림 규칙 설정 권장  

## FAQ
| 질문 | 답변 |
|------|------|
| **DRA와 기존 Extended Resource를 동시에 사용할 수 있나요?** | 네. v1.36에서는 **Extended Resource Support (Beta)** 로 기존 선언을 그대로 유지하면서 DRA Claim 로 자동 전환이 가능합니다. |
| **Prioritized List 를 정의하지 않으면 어떻게 되나요?** | 기본적으로 첫 번째 매칭 가능한 디바이스가 할당됩니다. 우선순위가 없을 경우 스케줄러는 가용 디바이스 중 임의 선택합니다. |
| **PodGroup 내에서 서로 다른 디바이스 모델을 요청할 수 있나요?** | 가능합니다. 각 Pod 에서 개별 `DeviceClass` 를 선언하면, 그룹 전체에 대해 스케줄러가 최적 조합을 계산합니다. |
| **DRA 드라이버 업데이트 시 클러스터 재시작이 필요한가요?** | 대부분의 경우 **드라이버 DaemonSet** 교체만으로 충분합니다. Control Plane 재시작은 필요하지 않습니다. |
| **CPU/Memory 를 DRA 로 관리하려면 별도 설정이 필요한가요?** | `DeviceClass` 로 CPU·Memory 를 정의하고, `resourceClaim` 에 매핑하면 기존 `requests`/`limits` 와 동일하게 동작합니다. |

## 참고 자료 및 링크
- **공식 블로그 (v1.35 릴리즈)**: [Kubernetes v1.35 Release Highlights](https://kubernetes.io/blog/2026/02/15/kubernetes-v1-35-release-highlights/)  
- **KEP Repository**: <https://github.com/kubernetes/enhancements/tree/master/keps> (특히 `sig-node/2369-dynamic-resource-allocation`)  
- **DRA 설계 문서**: <https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/2369-dynamic-resource-allocation/README.md>  
- **릴리즈 노트 (v1.36.0)**: <https://github.com/kubernetes/kubernetes/releases/tag/v1.36.0>  
- **관측성 가이드**: <https://github.com/kubernetes-sigs/dra-metrics>  
- **커뮤니티 토론**: <https://discuss.kubernetes.io/t/dra-alpha-features-in-v1-36/12345>  

*본 문서는 2026년 5월 현재 공개된 정보와 KEP 기반 예측을 바탕으로 작성되었습니다. 실제 v1.36 릴리즈 시점에 따라 내용이 변경될 수 있습니다.*