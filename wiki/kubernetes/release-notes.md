---
title: "Kubernetes 버전별 릴리즈 노트"
menu: "K8s 릴리즈 노트"
description: "Kubernetes v1.23 부터 최신 v1.35+까지 주요 변경 사항을 간략히 정리한 가이드"
category: "Guide"
tags: ["Kubernetes", "Release Notes", "버전", "version", "changelog"]
status: "published"
issueNumber: 0
createdAt: "2026-02-10T12:15:00Z"
updatedAt: 2026-02-24
related_docs: ["api-governance.md", "node-readiness-controller.md", "cgroup-migration.md", "ingress-nginx-deprecation-guide.md"]
order: 5
redirect_from:
  - kubernetes-kubernetes-release-notes
  - kubernetes-kubernetes-v1-33-8
quality_score: 89
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

## 2026‑xx‑xx: ImagePullBackOff caused by node IAM permissions

- **핵심 원인**: 이미지 레지스트리는 정상 동작하지만, 노드에 할당된 IAM 역할/서비스 계정이 레지스트리 접근 권한을 갖지 못해 `401 Unauthorized` 응답이 반환됩니다.  
- **증상**: `kubectl describe pod <pod>` 에서 `ImagePullBackOff` 와 함께 `failed to authorize` 혹은 `no basic auth credentials` 와 같은 메시지가 나타납니다.  
- **주요 시나리오**  
  - AWS EKS: 노드 인스턴스 프로파일에 `AmazonEC2ContainerRegistryReadOnly` 또는 `ecr:GetAuthorizationToken` 권한이 누락.  
  - Azure AKS: `AcrPull` 역할이 아직 전파되지 않아 인증 실패.  
  - GCP GKE: 노드가 기본 `Storage Read‑Only` 스코프로 생성돼 Artifact Registry에 접근 불가.  
- **공통 요인**: 단기 인증 토큰이 만료되었거나, 시계 오차(NTP 장애), IMDS 접근 제한, 혹은 정책 누락으로 인해 Credential Provider가 유효 토큰을 발급하지 못함.

### Troubleshooting checklist

1. **실제 오류 확인**  
   ```bash
   kubectl describe pod <pod-name>
   ```  
   `rpc error: code = Unknown desc = failed to authorize` 혹은 `401 Unauthorized` 가 보이면 IAM 인증 문제.

2. **노드에서 직접 이미지 풀 테스트**  
   ```bash
   # SSH to the node
   crictl pull <registry>/<image>:<tag>
   ```  
   - 성공 → IAM은 정상, ServiceAccount / `imagePullSecrets` 확인.  
   - 실패 → 노드 IAM/네트워크/시계 설정을 점검.

3. **IAM 역할/서비스 계정 검증**  
   - **AWS**: 노드 역할에 `AmazonEC2ContainerRegistryReadOnly` 또는 `ecr:GetAuthorizationToken`/`ecr:BatchGetImage` 정책 추가.  
   - **Azure**: `AcrPull` 역할이 전파될 때까지(≈10 분) 기다리거나 `az aks show … --query "identityProfile.kubeletidentity.clientId"` 로 확인.  
   - **GCP**: Workload Identity 사용 또는 노드 풀에 `cloud-platform` 스코프 부여.

4. **토큰 만료·시계 동기화**  
   - EKS: 토큰 12 시간마다 만료.  
   - GKE: 메타데이터 토큰 1 시간마다 만료.  
   - NTP/IMDS 장애 시 `node-problem-detector` 로 알림 설정.

5. **네트워크 경로 확인**  
   ```bash
   curl -v https://<registry-host>/v2/
   ```  
   - `200 OK` → 네트워크 정상, 인증 문제.  
   - `401 Unauthorized` → IAM 문제.  
   - 타임아웃/연결 오류 → VPC Endpoint, PrivateLink, Security Group 등 네트워크 정책 점검.

6. **권장 보안 강화**  
   - **Workload Identity**: 노드 인스턴스 프로파일 대신 Kubernetes ServiceAccount에 IAM 역할 바인딩.  
   - **VPC Endpoint / PrivateLink** 활성화로 레지스트리 트래픽을 프라이빗하게 유지.  
   - **IMDS 모니터링**: 접근 불가 시 알림 발생.  
   - **401 오류 알림**: Prometheus/Alertmanager 로 ImagePullBackOff 또는 401 응답 감시.  
   - **노드 주기적 교체**: 구성 드리프트 방지.  
   - **containerd 사용**: `crictl` 로 이미지 풀 테스트 권장.

**TL;DR**  
`ImagePullBackOff`는 대부분 레지스트리 자체 문제가 아니라 노드 IAM/자격 증명 문제입니다. 노드의 Credential Provider, IAM 정책, 시계 동기화, 그리고 네트워크 경로를 확인하면 대부분의 사례를 빠르게 해결할 수 있습니다.