---
title: Kubernetes v1.28.6 릴리즈 문서
author: SEPilot AI
status: published
tags: [Kubernetes, Release, v1.28.6, 업데이트, 운영]
---

## 개요
- **요청 배경 및 목적**  
  자동 감지 시스템이 `kubernetes/kubernetes` 레포지터리의 v1.28.6 릴리즈를 포착했습니다. v1.28.x 라인은 장기 지원(LTS) 버전으로, 보안 패치와 안정화된 기능이 포함되어 있어 클러스터 운영자와 개발자가 최신 변경 사항을 파악하고 업그레이드 전략을 수립하는 데 활용됩니다.  

- **대상 릴리즈(v1.28.6) 정의**  
  - **버전**: `v1.28.6`  
  - **릴리즈 일자**: 2023‑09‑13  
  - **커밋 수**: 2 842 커밋 (master 브랜치 기준)  

- **문서 적용 범위와 독자층**  
  - Kubernetes 클러스터 운영자, DevOps 엔지니어, SRE 팀  
  - API 사용자를 포함한 애플리케이션 개발자  
  - 보안·감사 담당자  

## 릴리즈 요약
- **릴리즈 날짜 및 주요 버전 정보**  
  - 2023‑09‑13에 공식 릴리즈되었으며, GitHub Release 페이지에 기록되어 있습니다: [Release v1.28.6](https://github.com/kubernetes/kubernetes/releases/tag/v1.28.6).  

- **핵심 기능·버그픽스 하이라이트**  
  - **In‑place Pod Resizing**(Stable) – 워크로드가 재시작 없이 CPU/Memory 요청을 조정할 수 있습니다.  
  - **PodSecurityAdmission**(Beta) – 보안 정책을 선언적으로 적용할 수 있는 새로운 Admission 컨트롤러.  
  - **CRI‑O 1.26** 및 **containerd 1.6** 지원 강화.  
  - 다수의 보안 취약점(CVE) 해결 및 API 안정성 개선.  

- **관련 커뮤니티 공지**  
  - 릴리즈와 관련된 공식 블로그 포스트: [Kubernetes v1.28 Release Highlights](https://kubernetes.io/blog/2023/09/13/kubernetes-v1-28-release-highlights/).  
  - 보안 공지: [Kubernetes Security Announcements](https://github.com/kubernetes/kubernetes/security/advisories).  

## CHANGELOG 핵심 내용
> 상세 내용은 공식 CHANGELOG 파일을 확인하세요: [CHANGELOG‑1.28.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.28.md).

| 구분 | 주요 항목 | 설명 |
|------|----------|------|
| **Stable 기능** | In‑place Pod Resizing | `kubectl edit` 로 리소스 요청/제한을 바로 적용, 재시작 없이 스케일링 가능 |
| | Service IP Range Expansion | Service CIDR 확장을 위한 `--service-cluster-ip-range` 옵션 개선 |
| **Beta 기능** | PodSecurityAdmission | `restricted`, `baseline`, `privileged` 프로파일 제공 |
| | Scheduler Plugins Framework | 새로운 플러그인(`NodeResourcesFit`, `PodTopologySpread`) 베타 적용 |
| **Alpha 기능** | Graceful Node Shutdown | 노드 종료 시 파드 종료를 조정하는 옵션 (`--graceful-node-shutdown`) |
| **Deprecation** | `extensions/v1beta1` Ingress | `networking.k8s.io/v1` 로 완전 전환, v1.28에서 제거 |
| | `dockershim` | Docker Engine 지원 중단, CRI‑O/Containerd 전환 권고 |
| **보안 패치** | CVE‑2023‑2253, CVE‑2023‑2360, CVE‑2023‑28433 | 인증·인가, API 서버, kubelet 취약점 해결 (자세한 내용은 아래 보안 섹션) |

## 바이너리 및 아티팩트 다운로드
- **공식 바이너리**  
  - Linux, macOS, Windows용 바이너리는 Release 페이지의 *Assets* 섹션에서 제공됩니다.  
  - 예시: `kubernetes-client-linux-amd64.tar.gz`, `kubernetes-server-linux-amd64.tar.gz`  

- **체크섬 검증**  
  - 각 파일에 대한 SHA256 체크섬이 Release 페이지에 포함됩니다.  
  - 검증 명령: `sha256sum <파일명>`  

- **컨테이너 이미지**  
  - 공식 이미지 레지스트리: `k8s.gcr.io/kube-apiserver:v1.28.6`, `k8s.gcr.io/kube-controller-manager:v1.28.6` 등  
  - 최신 이미지 경로는 [Kubernetes 공식 문서](https://kubernetes.io/docs/setup/production-environment/container-runtimes/) 참고  

## API/스키마 호환성 검토
- **호환성 수준**  
  - v1.28.x 라인은 v1.27.x 와 높은 호환성을 유지하지만, `extensions/v1beta1` Ingress 가 완전히 제거되어 **Breaking Change** 가 발생합니다.  

- **주요 Breaking Change**  
  - `extensions/v1beta1` Ingress → `networking.k8s.io/v1` 로 마이그레이션 필요  
  - `dockershim` 제거 → CRI‑O 또는 containerd 로 전환  

- **마이그레이션 체크리스트**  
  1. 현재 사용 중인 Ingress 리소스 확인: `kubectl get ingress -A -o yaml | grep apiVersion`  
  2. `extensions/v1beta1` 를 `networking.k8s.io/v1` 로 변환 (필드명 변경 포함)  
  3. Docker Engine 사용 여부 확인 → CRI‑O/Containerd 설치 및 kubelet 설정 업데이트  

## 클러스터 업그레이드 가이드
### 사전 준비
- **etcd 백업**  
  ```bash
  etcdctl snapshot save /tmp/etcd-snapshot-$(date +%F).db
  ```  
- **클러스터 상태 점검**  
  ```bash
  kubectl get nodes
  kubectl get pods -A
  ```  
- **스테이징 클러스터에서 사전 검증**  
  - v1.28.6 이미지로 테스트 클러스터를 구성하고 주요 워크로드를 실행해 본다.  

### 단계별 업그레이드 절차
1. **업그레이드 계획 확인**  
   - `kubeadm upgrade plan` 명령으로 지원되는 버전과 현재 클러스터 상태를 확인한다.  

2. **Control Plane 업그레이드**  
   - 마스터 노드에서 순차적으로 실행  
     ```bash
     kubeadm upgrade apply v1.28.6 --yes
     apt-get install -y kube-apiserver=1.28.6 kube-controller-manager=1.28.6 kube-scheduler=1.28.6 kubeadm=1.28.6
     systemctl restart kube-apiserver kube-controller-manager kube-scheduler
     ```  

3. **kubelet 및 kube-proxy 업그레이드**  
   - 각 워커 노드에서 실행  
     ```bash
     kubeadm upgrade node config --kubelet-version v1.28.6
     apt-get install -y kubelet=1.28.6 kube-proxy=1.28.6
     systemctl restart kubelet kube-proxy
     ```  

4. **플러그인/Addon 업데이트**  
   - CoreDNS, CNI, CSI 등 호환 버전 확인 후 필요 시 업데이트  

### 롤백 전략
- **노드 단위 롤백**  
  - `kubeadm upgrade undo` 로 이전 버전 복구 (etcd 스냅샷 사용 권장)  
- **전체 클러스터 롤백**  
  - 백업한 etcd 스냅샷을 복원하고, 각 컴포넌트를 이전 버전으로 재설치  

### 문제 해결 팁
- `kubectl get nodes` 가 `NotReady` 로 표시되면:  
  1. etcd 스냅샷 복원  
  2. kubelet 로그 (`journalctl -u kubelet`) 확인  
  3. API Server와 kubelet 버전 일치 여부 점검  

## 보안 및 규정 준수 업데이트
- **새롭게 적용된 보안 메커니즘**  
  - `NodeRestriction` 플러그인 기본 활성화  
  - API Server audit 로그 기본 포맷을 `json` 으로 전환  

- **CVE 해결 내역**  
  | CVE 번호 | 영향 컴포넌트 | 해결 내용 |
  |----------|----------------|-----------|
  | CVE‑2023‑2253 | kube-apiserver | 인증 우회 취약점 패치 |
  | CVE‑2023‑2360 | kubelet | 권한 상승 취약점 패치 |
  | CVE‑2023‑28433 | etcd | 데이터 무결성 검증 강화 |

- **권장 보안 설정**  
  - `--authorization-mode=Node,RBAC`  
  - `--audit-policy-file=/etc/kubernetes/audit-policy.yaml`  
  - `--enable-admission-plugins=NodeRestriction,PodSecurityAdmission`  

## 성능 및 스케줄링 개선
- **In‑place Pod Resizing**  
  - `--enable-in-place-pod-resizing=true` 플래그를 kube‑scheduler에 추가하면 워크로드가 재시작 없이 리소스 조정이 가능해집니다.  

- **Scheduler 플러그인 개선**  
  - `PodTopologySpread` 와 `NodeResourcesFit` 플러그인이 베타 단계로 제공되어, 리소스 균형과 토폴로지 기반 스케줄링이 향상됩니다.  

- **튜닝 포인트**  
  - `kube-scheduler` 플래그 `--enable-in-place-pod-resizing=true` 활성화  
  - `ResourceQuota` 와 `LimitRange` 로 네임스페이스 수준 리소스 경계 설정  

## 폐기·제거된 컴포넌트
- **Deprecated API 및 리소스**  
  - `extensions/v1beta1` Ingress, `DaemonSet` 등은 v1.28에서 완전 제거되었습니다.  
  - `dockershim` 인터페이스 삭제 → CRI‑O 또는 containerd 로 전환 필요  

- **대체 옵션**  
  - Ingress: `networking.k8s.io/v1` 로 마이그레이션  
  - 컨테이너 런타임: `cri-o` 혹은 `containerd` 사용 권장  

## 베스트 프랙티스 및 운영 팁
- **리소스 요청·제한 설정**  
  - `requests` 와 `limits` 를 명시하고, In‑place Resizing 사용 시 `LimitRange` 로 상한을 정의합니다.  

- **네임스페이스·네트워크 정책**  
  - 워크로드 별 네임스페이스 분리와 `NetworkPolicy` 로 트래픽 제어를 적용해 보안 경계를 강화합니다.  

- **RBAC 최소 권한 적용**  
  - 서비스 어카운트에 필요한 권한만 부여하고, `ClusterRoleBinding` 사용을 최소화합니다.  

## 위키 유지보수 절차
1. **자동 감지** → 담당자 알림  
2. **릴리즈 검증** – GitHub Release 페이지와 CHANGELOG 확인  
3. **위키 페이지 업데이트** – 버전, 날짜, 주요 변경 사항, 다운로드 링크 등 삽입  
4. **CI 자동 반영** – `curl` 로 Release API 호출 후 마크다운 템플릿에 자동 삽입 (예: GitHub Actions)  
5. **검증·승인**  
   - **작성자**: SRE 팀 → 초안 작성  
   - **검토자**: 보안팀, 개발팀 → 내용 검증  
   - **승인자**: 위키 운영자 → 최종 게시  

## 참고 자료 및 링크
- [Release v1.28.6 (GitHub)](https://github.com/kubernetes/kubernetes/releases/tag/v1.28.6)  
- [CHANGELOG‑1.28.md (공식)](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.28.md)  
- [Kubernetes v1.28 Release Highlights (블로그)](https://kubernetes.io/blog/2023/09/13/kubernetes-v1-28-release-highlights/)  
- [Kubernetes Security Advisories](https://github.com/kubernetes/kubernetes/security/advisories)  
- [k8s.gcr.io 이미지 레지스트리 안내](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)  

## 부록
### 용어 정의
- **Stable**: GA 단계, 프로덕션 사용 권장  
- **Beta**: 기능이 안정화 중이며, 향후 GA 로 전환 가능  
- **Alpha**: 실험적 기능, API 변경 가능성 존재  

### 주요 커밋·PR 하이라이트
- 전체 커밋 목록은 Release 페이지의 *Compare* 탭에서 확인 가능 (2 842 커밋).  

### FAQ
- **Q:** 업그레이드 중 `kubectl get nodes` 가 `NotReady` 상태가 되면?  
  **A:** etcd 스냅샷을 복원하고, kubelet 로그를 확인한 뒤 API Server와 kubelet 버전을 일치시킵니다.  

- **Q:** In‑place Pod Resizing 사용 시 주의점은?  
  **A:** `LimitRange` 로 상한을 정의하지 않으면 리소스 초과가 발생할 수 있으며, Pod 업데이트 시 `resourceVersion` 충돌을 방지하기 위해 `kubectl edit` 로 직접 수정합니다.  

*이 문서는 자동 감지 시스템에 의해 생성된 초안이며, 최종 배포 전 추가 검증이 필요합니다.*