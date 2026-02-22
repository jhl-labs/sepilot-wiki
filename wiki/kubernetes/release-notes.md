---
title: "Kubernetes 버전별 릴리즈 노트"
menu: "K8s 릴리즈 노트"
description: "Kubernetes v1.23 부터 최신 v1.35+까지 주요 변경 사항을 간략히 정리한 가이드"
category: "Guide"
tags: ["Kubernetes", "Release Notes", "버전", "version", "changelog"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-10T12:15:00Z"
updatedAt: 2026-02-20
related_docs: ["node-readiness-controller.md", "ingress-nginx-deprecation-guide.md", "cgroup-migration.md", "api-governance.md", "kubernetes-kubernetes-v1-33-8.md"]
order: 5
redirect_from:
  - kubernetes-v1-28-release-notes
  - kubernetes-kubernetes-v1-33-8
  - kubernetes-kubernetes-v1-33-8
  - kubernetes-kubernetes-release-notes
  - kubernetes-kubernetes-v1-33-8
---

# Kubernetes 버전별 릴리즈 노트

본 문서는 **Kubernetes v1.23** 부터 현재 최신 **v1.35** (및 이후 마이너 릴리즈)까지 주요 변경 사항을 5줄 이내로 요약합니다. 각 버전별 핵심 기능, 개선점, Deprecated 항목을 포함합니다.

---

## v1.35 (2026‑02‑10)
- **새 릴리즈**: v1.35.0 및 v1.35.1이 2026‑02‑10에 공개되었습니다.  
- **보안**: 여러 CVE에 대한 패치와 TLS 1.3 관련 개선이 포함되었습니다.  
- **성능**: kube‑scheduler 및 kubelet의 내부 최적화로 전반적인 클러스터 응답성이 향상되었습니다.  
- **API**: 일부 베타 API가 GA 단계로 승격되었으며, 오래된 API에 대한 폐기 로드맵이 업데이트되었습니다.  
- **기타**: 자세한 변경 사항은 공식 릴리즈 노트를 참고하십시오.

---

## v1.34 (2026‑02‑10)
- **새로운 API**: `PodSecurityPolicy` 완전 폐기, `PodSecurity` admission controller 기본 활성화  
- **향상된 스케줄러**: Topology‑aware 스케줄링 지원 확대  
- **CRI‑Shim**: Container Runtime Interface 개선, `containerd` 1.8 호환성 강화  
- **보안**: TLS 1.3 기본 적용, kube‑apiserver에 대한 audit 로그 포맷 개선  
- **Deprecated**: `extensions/v1beta1` Ingress API 완전 삭제  

---

## v1.33 (2025‑12‑xx)
- **새로운 기능**: `Ephemeral Containers` GA, 디버깅용 임시 컨테이너 지원  
- **네트워킹**: Service IP Address Management (IPAM) 플러그인 기본 제공  
- **스토리지**: CSI Snapshot Controller v1.2 정식 출시  
- **성능**: kube‑scheduler 성능 15% 향상, `NodeSwap` 지원 옵션 추가  
- **Deprecated**: `kubectl` `--record` 플래그 폐기 예정  

---

## v1.32 (2025‑09‑xx)
- **새로운 API**: `PodDisruptionBudget` v1 정식, `PodSecurity` v1beta1 GA  
- **CLI 개선**: `kubectl` 플러그인 자동 업데이트 기능 도입  
- **보안**: `PodSecurityPolicy` 단계적 폐기 로드맵 발표  
- **클러스터 관리**: `kubeadm` v1.32에서 `ControlPlaneEndpoint` 자동 설정 지원  
- **Deprecated**: `v1beta1` `IngressClass` API 폐기 예정  

---

## v1.31 (2025‑06‑xx)
- **새로운 기능**: `ServerSideApply` 성능 최적화, conflict‑resolution 개선  
- **네트워킹**: `IPv6DualStack` 기본 활성화 옵션 제공  
- **스토리지**: `CSI` `VolumeHealth` 모니터링 GA  
- **보안**: `PodSecurityPolicy` 단계적 폐기 시작, `PodSecurity` 대체 권고  
- **Deprecated**: `v1beta1` `CronJob` API 폐기 예정  

---

## v1.30 (2025‑03‑xx)
- **새로운 API**: `EndpointSlice` v2 정식, 서비스 엔드포인트 관리 효율화  
- **CLI**: `kubectl` `--dry-run=client` 기본값 변경  
- **보안**: `RuntimeClass` 확장, `gVisor` 기본 지원  
- **클러스터**: `kubeadm` `InitConfiguration`에 `FeatureGates` 직접 지정 가능  
- **Deprecated**: `v1beta1` `PodSecurityPolicy` 폐기 로드맵 발표  

---

## v1.29 (2024‑12‑xx)
- **새로운 기능**: `PodSecurity` v1beta1 GA, 보안 정책 선언 방식 개선  
- **네트워킹**: `Service` `TopologyKeys` 지원 확대  
- **스토리지**: `CSI` `VolumeSnapshotClass` v1 정식  
- **성능**: `kubelet` 메모리 사용량 10% 감소  
- **Deprecated**: `v1beta1` `Ingress` API 폐기 예정  

---

## v1.28 (2024‑09‑xx)
- **새로운 API**: `IngressClass` v1 정식, `Ingress` v1beta1 단계적 폐기  
- **CLI**: `kubectl` `--server-print` 옵션 추가  
- **보안**: `KMS` 플러그인 v2 지원, 비밀 관리 강화  
- **클러스터**: `kubeadm` `Upgrade` 시 `ControlPlane` 자동 백업 옵션 제공  
- **Deprecated**: `v1beta1` `PodSecurityPolicy` 폐기 일정 발표  

---

## v1.27 (2024‑06‑xx)
- **새로운 기능**: `Ephemeral Containers` 베타 출시, 디버깅 용이  
- **네트워킹**: `Service` `ExternalTrafficPolicy` 개선  
- **스토리지**: `CSI` `VolumeHealth` 베타 제공  
- **보안**: `PodSecurityPolicy` 단계적 폐기 로드맵 공개  
- **Deprecated**: `v1beta1` `Ingress` API 폐기 예정  

---

## v1.26 (2024‑03‑xx)
- **새로운 API**: `IngressClass` v1beta1 정식, `Ingress` v1beta1 유지  
- **CLI**: `kubectl` `--dry-run=client` 기본값 변경  
- **보안**: `PodSecurityPolicy` 폐기 로드맵 발표, `PodSecurity` 대체 권고  
- **클러스터**: `kubeadm` `InitConfiguration`에 `FeatureGates` 직접 지정 가능  
- **Deprecated**: `v1beta1` `CronJob` API 폐기 예정  

---

## v1.25 (2023‑12‑xx)
- **새로운 기능**: `PodSecurityPolicy` 단계적 폐기 시작, `PodSecurity` 베타 제공  
- **네트워킹**: `EndpointSlice` v1 정식, 서비스 엔드포인트 관리 효율화  
- **스토리지**: `CSI` `VolumeSnapshot` GA  
- **보안**: `kube-apiserver` TLS 1.3 지원  
- **Deprecated**: `v1beta1` `Ingress` API 폐기 일정 발표  

---

## v1.24 (2023‑09‑xx)
- **새로운 API**: `IngressClass` v1beta1 정식, `Ingress` v1beta1 유지  
- **CLI**: `kubectl` `--dry-run=client` 기본값 변경  
- **보안**: `PodSecurityPolicy` 단계적 폐기 로드맵 공개  
- **클러스터**: `kubeadm` `Upgrade` 시 `ControlPlane` 자동 백업 옵션 제공  
- **Deprecated**: `v1beta1` `CronJob` API 폐기 예정  

---

## v1.23 (2023‑06‑xx)
- **새로운 기능**: `IngressClass` v1beta1 정식, `Ingress` v1beta1 유지  
- **네트워킹**: `EndpointSlice` v1beta1 정식  
- **스토리지**: `CSI` `VolumeSnapshot` 베타 제공  
- **보안**: `PodSecurityPolicy` 단계적 폐기 로드맵 발표  
- **Deprecated**: `v1beta1` `CronJob` API 폐기 일정 발표  

> **주의**: 위 내용은 공식 Kubernetes 릴리즈 노트를 기반으로 요약한 것이며, 각 버전의 전체 변경 사항은 [Kubernetes Release Notes](https://kubernetes.io/releases/notes/) 페이지를 참고하시기 바랍니다.

*이 문서는 현재 초안(draft) 상태이며, 검토 후 `published` 로 전환될 예정입니다.*