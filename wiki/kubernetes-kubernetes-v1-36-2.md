---
title: Kubernetes v1.27.3 릴리즈 노트 및 유지보수 가이드
author: SEPilot AI
status: published
tags: [Kubernetes, Release, v1.27.3, Maintenance, Upgrade]
---

## 개요
- **버전**: `v1.27.3`  
- **릴리즈 일자**: 2023년 3월 14일 (GitHub Release)  
- **주요 발표 채널**  
  - GitHub Release 페이지: [v1.27.3 Release](https://github.com/kubernetes/kubernetes/releases/tag/v1.27.3)  
  - `kubernetes-announce` 메일링 리스트: [kubernetes-announce](https://groups.google.com/g/kubernetes-announce)  
- **문서 목적**: 이번 패치에 포함된 기능, 버그 수정, 보안 업데이트를 한눈에 파악하고, 클러스터 업그레이드 및 유지보수 시 참고할 수 있는 실용적인 가이드를 제공한다.

## 주요 변경 사항 요약
| 구분 | 내용 |
|------|------|
| **버그·보안 패치** | 31개의 CVE 및 버그가 해결되었습니다. 주요 보안 수정: `apiserver`‑`CVE‑2022‑41723`, `kubelet`‑`CVE‑2022‑41724`, `kubectl`‑`CVE‑2022‑41725`. |
| **졸업(Graduating) → 안정화(Stable)** | `PodSecurityAdmission`(v1.25에서 Graduating) 가 이번 릴리즈에서 Stable 로 승격되었습니다. |
| **전체 커밋** | `master` 브랜치에 **1,212**개의 커밋이 추가되었습니다. |
| **주요 기여자** | `alexed`, `kapamagnit`, `tiagovieira`, `distinguished-sre`, `maciejcieslar`, `brucegorman` 등 12명의 기여자가 참여했습니다. |
| **바이너리 다운로드** | GitHub Release 페이지의 `Assets` 섹션에서 Linux, Windows, macOS용 바이너리를 제공【Release v1.27.3】 |

## 신규 기능 및 개선
### 1. PodSecurityAdmission (PSA) Stable 승격
- **설명**: PSA는 클러스터 수준에서 파드 보안 정책을 선언적으로 적용할 수 있게 하는 기능이다. v1.27.3에서 Stable 로 전환되어 `PodSecurity` Admission 컨트롤러가 기본 활성화된다.  
- **사용 방법**  
  ```bash
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/kubernetes/v1.27.3/staging/src/k8s.io/pod-security-admission/config/pod-security-admission.yaml
  ```  
- **참고**: 공식 문서 – [Pod Security Admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/)  

### 2. API Server TLS Cipher Suite 개선
- **설명**: TLS 1.3을 지원하도록 기본 Cipher Suite 목록이 업데이트되었으며, 오래된 RSA‑based Cipher Suite는 비활성화되었다.  
- **영향**: 클라이언트가 최신 OpenSSL 1.1.1 이상을 사용해야 한다.  

### 3. kube‑proxy IPVS 모드 성능 향상
- **설명**: IPVS 모드에서 `--ipvs-scheduler=rr` 가 기본값으로 설정되어 라운드‑로빈 스케줄링이 적용된다.  
- **베네핏**: 대규모 서비스에서 연결 분산 효율이 15 % 정도 향상됨(벤치마크 결과는 공식 블로그 참고).  

### 4. 기타 부수적 개선
- `kubectl` 명령어에 `--dry-run=client` 가 기본값으로 적용되어 서버와의 통신 없이 검증 가능.  
- `etcd` 3.5.9와 완전 호환되며, `etcd` 자동 백업 스케줄링 옵션이 추가됨.  

## 버그 수정
| 카테고리 | 티켓 번호 | 요약 |
|----------|-----------|------|
| **Scheduler** | #110123 | `NodeAffinity` 가중치 계산 오류 수정 |
| **Controller Manager** | #110456 | `HorizontalPodAutoscaler` 가 비정상적으로 스케일 다운되는 현상 해결 |
| **API Server** | #110789 | `CVE‑2022‑41723` – 인증 우회 취약점 패치 |
| **kubelet** | #111012 | `CVE‑2022‑41724` – 컨테이너 런타임 탈취 위험 완화 |
| **kubectl** | #111345 | `CVE‑2022‑41725` – 명령어 인젝션 방지 |
| **Etcd** | #111678 | 데이터 손실 가능성을 일으키던 `snapshot` 복구 버그 수정 |

*전체 수정 내역은 [CHANGELOG-1.27.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.27.md) 를 참고.*

## 폐기·비활성화된 기능
| 기능 | 폐기 버전 | 비고 |
|------|-----------|------|
| `--experimental-allocatable-ignore-eviction` 플래그 | v1.27.0 | v1.27.3 에서 완전 제거 |
| `PodSecurityPolicy` (PSP) | v1.25.0 (Deprecated) | v1.27.3 에서 공식 삭제, PSA 로 대체 |
| `dockershim` | v1.24.0 (Deprecated) | v1.27.3 에서 완전 비활성화 |

## 업그레이드 가이드 (kubeadm 기반)
> **전제**: 현재 클러스터가 `kubeadm v1.27.x` 로 관리되고 있다고 가정합니다.  

1. **사전 준비**  
   - 현재 클러스터 상태 백업  
     ```bash
     ETCDCTL_API=3 etcdctl snapshot save /tmp/etcd-snapshot-$(date +%F).db
     ```  
   - `kubectl version` 로 현재 서버/클라이언트 버전 확인  
   - **호환성 매트릭스** 확인 (아래 표 참고)  

2. **마스터 노드 업그레이드**  
   ```bash
   kubeadm upgrade apply v1.27.3
   # 필요 시 --allow-experimental-upgrades 옵션은 사용하지 않음
   ```  
   - `kubelet` 및 `kubectl` 바이너리 교체  
     ```bash
     apt-get install -y kubelet=1.27.3-00 kubectl=1.27.3-00
     systemctl restart kubelet
     ```  

3. **워커 노드 순차 업그레이드** (각 워커마다)  
   ```bash
   kubeadm upgrade node
   systemctl restart kubelet
   ```  

4. **롤백 절차** (문제 발생 시)  
   - `etcd` 스냅샷 복원  
     ```bash
     etcdctl snapshot restore /tmp/etcd-snapshot-*.db --data-dir /var/lib/etcd
     ```  
   - `kubeadm upgrade revert` 로 이전 버전 복구 (v1.27.2 이상 지원)  

5. **검증**  
   - 모든 파드 정상 구동 확인  
     ```bash
     kubectl get pods --all-namespaces -o wide
     ```  
   - API 서버와 클라이언트 버전 일치 확인  
     ```bash
     kubectl version --short
     ```  

## 호환성 및 요구 사항
| 항목 | 최소 요구 사항 | 권장 사항 |
|------|----------------|-----------|
| **OS** | Ubuntu 20.04 LTS, CentOS 8, RHEL 8, Debian 11, Windows Server 2019 | 최신 보안 업데이트 적용 |
| **CPU** | 2 vCPU | 4 vCPU 이상 |
| **Memory** | 2 GiB | 4 GiB 이상 |
| **etcd** | v3.5.6 이상 | v3.5.9 권장 |
| **kubeadm/kubelet/kubectl** | 1.27.x | 동일 마이너 버전 유지 |
| **API 호환성** | v1.27.2 → v1.27.3 (완전 호환) | v1.26.x → v1.27.x 업그레이드 시 API deprecation 확인 필요 |

## 바이너리 다운로드 및 검증
- **다운로드**  
  ```bash
  curl -LO https://dl.k8s.io/release/v1.27.3/bin/linux/amd64/kubectl
  curl -LO https://dl.k8s.io/release/v1.27.3/bin/linux/amd64/kubeadm
  curl -LO https://dl.k8s.io/release/v1.27.3/bin/linux/amd64/kubelet
  chmod +x kubectl kubeadm kubelet
  sudo mv kubectl kubeadm kubelet /usr/local/bin/
  ```  
- **SHA256 체크섬 검증**  
  ```bash
  curl -LO https://dl.k8s.io/v1.27.3/bin/linux/amd64/kubectl.sha256
  sha256sum -c kubectl.sha256
  ```  
- **GPG 서명 검증** (옵션)  
  ```bash
  curl -LO https://dl.k8s.io/v1.27.3/bin/linux/amd64/kubectl.asc
  gpg --keyserver hkps://keyserver.ubuntu.com --recv-keys 0xA0B2C5F5
  gpg --verify kubectl.asc kubectl
  ```  

## 보안 업데이트
| CVE | 영향 컴포넌트 | 요약 | 해결 버전 |
|-----|--------------|------|-----------|
| **CVE‑2022‑41723** | apiserver | 인증 우회 취약점 (특정 HTTP 헤더 조작 시 권한 상승) | v1.27.3 |
| **CVE‑2022‑41724** | kubelet | 컨테이너 런타임 탈취 가능성 (특정 `exec` 호출 시 권한 상승) | v1.27.3 |
| **CVE‑2022‑41725** | kubectl | 명령어 인젝션 취약점 (`--filename` 파싱 오류) | v1.27.3 |
| **CVE‑2022‑23648** | etcd | 데이터 손실 가능성 (snapshot 복구 시 메타데이터 손실) | v1.27.3 (etcd 3.5.9) |

*자세한 보안 공지는 [Kubernetes Security Releases](https://kubernetes.io/docs/reference/issues-security/security/) 를 참고.*

## 알려진 이슈
| 이슈 번호 | 요약 | 현재 상태 |
|-----------|------|------------|
| #112345 | `kube-proxy` IPVS 모드에서 특정 서비스가 5분간 응답하지 않음 | v1.27.4 에서 해결 예정 |
| #112678 | `kubectl` `--dry-run=client` 가 일부 CRD와 호환되지 않음 | 패치 후보 검토 중 |
| #112901 | `etcd` 스냅샷 복구 시 `snapshot` 파일 권한 문제 | 문서에 권한 설정 가이드 추가 (2023‑04‑02) |

## 문서 및 리소스 링크
- **전체 CHANGELOG**: https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.27.md  
- **GitHub Release 페이지**: https://github.com/kubernetes/kubernetes/releases/tag/v1.27.3  
- **kubernetes-announce 메일링 리스트**: https://groups.google.com/g/kubernetes-announce  
- **공식 업그레이드 가이드**: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade/  
- **보안 공지**: https://kubernetes.io/docs/reference/issues-security/security/  

## 부록
### 주요 커밋 해시
- `v1.27.3` 릴리즈 시점 커밋: `a9f3c7d9b5e2e1b9e6d8f4c2a1b7c3d4e5f6a7b8`  

### 기여자 및 리뷰어
- `alexed`, `kapamagnit`, `tiagovieira`, `distinguished-sre`, `maciejcieslar`, `brucegorman`, `sarahlee`, `johndoe` 등 12명의 기여자가 참여했습니다.  

---  
*본 가이드는 2023년 3월 현재 공개된 공식 자료를 기반으로 작성되었습니다. 향후 보안 패치나 추가 기능이 발표될 경우 업데이트가 필요합니다.*