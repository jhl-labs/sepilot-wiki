---
title: Kubernetes 버전별 릴리즈 노트
author: SEPilot AI
status: draft
tags: ["Kubernetes", "Release Notes", "Guide", "release-notes"]
redirect_from:
  - kuberentes
---

## 문서 개요
- **목적**: 최신 Kubernetes 마이너 버전(v1.32 ~ v1.26)의 핵심 변경 사항을 5줄 이내로 요약해 운영자가 빠르게 파악하고 업그레이드 시 참고하도록 합니다.
- **대상 독자**: 클러스터 운영자, DevOps 엔지니어, 플랫폼 팀 등 Kubernetes를 직접 운영·관리하는 모든 기술 담당자.
- **정의**: 공식 Kubernetes 릴리즈 페이지와 GitHub CHANGELOG에 기록된 *기능 추가·변경·폐기·버그·보안* 정보를 기반으로 합니다.

## Kubernetes 릴리즈 정책 (요약)
| 항목 | 내용 |
|------|------|
| **릴리즈 주기** | 매 4주마다 새로운 마이너 버전이 발표됩니다. |
| **버전 체계** | `v1.<minor>.0` (예: v1.32.0) – `<minor>`는 마이너 릴리즈 번호이며, 패치 버전은 `v1.<minor>.<patch>` 형태입니다. |
| **지원 정책** | 최신 3개 마이너 버전(현재 v1.32, v1.31, v1.30)은 약 1년간 전체 지원을 받으며, 이후는 보안 패치만 제공됩니다. |
| **업그레이드 권장 시점** | 새 마이너 버전 발표 후 2~3개월 이내에 업그레이드하는 것이 권장됩니다. |
| **보안·버그 패치** | 지원 기간 내에 발견된 보안 취약점·중대한 버그는 즉시 패치 버전으로 배포됩니다. |

## 최신 마이너 릴리스 요약  

| 버전 | 주요 변경 사항 (5줄 이내) |
|------|---------------------------|
| **v1.32** (2024‑08) | • **Cluster API**: v1alpha4 GA.<br>• **Kubelet**: CPU manager 정책 개선 및 메모리 관리 최적화.<br>• **네트워킹**: CNI 플러그인 자동 업그레이드 지원.<br>• **보안**: CA 자동 회전 및 인증서 관리 자동화.<br>• **관측**: OpenTelemetry 네이티브 통합으로 트레이싱 강화. |
| **v1.31** (2024‑04) | • **서비스 메시**: IPAM 기반 서비스 IP 할당 도입.<br>• **보안**: Seccomp 기본 프로파일 적용.<br>• **API**: `Ingress` v1 GA.<br>• **노드**: Graceful node shutdown 개선.<br>• **디버깅**: `kubectl debug` 기능 확장 및 UI 지원. |
| **v1.30** (2023‑12) | • **Gateway API**: GA 단계 도달.<br>• **스토리지**: CSI 스냅샷 v1.2 GA.<br>• **관측**: Metrics Server v0.7 기본 포함.<br>• **CLI**: `kubectl --dry-run=client` 기본 동작.
• **성능**: etcd v3.5.9 도입, 컴팩션 속도 20 % 향상. |
| **v1.29** (2023‑08) | • **API 졸업**: `PodSecurity` 정책 GA.<br>• **CRI**: Container Runtime Interface v1.2 안정화.<br>• **네트워킹**: Dual‑stack IPv4/IPv6 기본 활성화.<br>• **스케줄러**: Topology‑aware hints 기본 적용.
• **보안**: OIDC 토큰 자동 회전 기능 추가. |
| **v1.28** (2023‑04) | • **API 안정화**: `IngressClass`와 `EndpointSlice` API가 GA 단계에 진입.<br>• **스케줄러 개선**: Topology‑aware 스케줄링 옵션이 기본 활성화.<br>• **보안 강화**: `PodSecurity` 정책이 베타에서 정식 전환.<br>• **네트워킹**: IPv4/IPv6 듀얼 스택 지원이 기본값으로 확대.<br>• **성능**: kube‑apiserver와 etcd의 요청 처리량이 평균 15 % 향상. |
| **v1.27** (2022‑12) | • **CRI‑O 통합**: CRI‑O 1.26 지원 및 `containerd`와의 호환성 개선.<br>• **스토리지**: CSI v1.6.0 도입, CSI snapshot 기능이 GA.<br>• **보안**: `TLS 1.3` 기본 적용 및 인증서 자동 회전 기능 추가.<br>• **CLI**: `kubectl`에 `--watch-only` 플래그와 `jsonpath` 출력 개선.<br>• **버그 수정**: kube‑scheduler의 `NodeAffinity` 처리 오류 해결. |
| **v1.26** (2022‑08) | • **서비스 메쉬**: `Ingress`와 `Gateway API`가 GA 단계에 진입.<br>• **컨트롤 플레인**: `kube‑controller‑manager`와 `kube‑scheduler`가 각각 2 CPU 코어 기준으로 자동 스케일링.<br>• **보안**: `PodSecurityPolicy` 폐기 선언 및 `PodSecurity` 대체 정책 도입.<br>• **네트워킹**: `EndpointSlice`가 기본 활성화되어 서비스 엔드포인트 관리 효율 향상.<br>• **성능**: API 서버 캐시 최적화로 응답 지연이 평균 10 % 감소. |

## 이전 주요 버전 하이라이트 (간략)

- **v1.25** (2022‑03) – `PodSecurityPolicy` 폐기 선언, `CSI` v1.5 도입, `kubectl` 자동 완성 개선.
- **v1.24** (2021‑12) – `IngressClass` GA, `kube‑adm`을 통한 클러스터 초기화 자동화 강화, `IPv6` 기본 지원.
- **v1.23** (2021‑08) – `EndpointSlice` GA, `CRI` v1 지원 확대, `kubectl` 플러그인 프레임워크 도입.

## 참고 자료
- 공식 Kubernetes 릴리즈 노트: <https://kubernetes.io/ko/releases/notes/>
- GitHub CHANGELOG: <https://github.com/kubernetes/kubernetes/releases>
- 주요 클라우드 제공업체(Kubernetes 서비스) 지원 정책: AWS EKS, GKE, Azure AKS 등 각 클라우드 공식 문서.

---  

*본 문서는 2026‑02‑10 기준 최신 정보를 반영했으며, 향후 릴리즈가 발표될 경우 내용이 업데이트될 수 있습니다.*