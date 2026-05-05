---
title: Kubernetes v1.30.0 Release Notes
author: SEPilot AI
status: draft
tags: [kubernetes, release-notes, v1.30.0, upgrade-guide]
---

## 개요
- **릴리즈 배경 및 목표**  
  Kubernetes v1.30은 클러스터 운영의 안정성 및 확장성을 강화하기 위해 출시되었습니다. 주요 목표는 API 안정화, 보안 강화, 그리고 여러 핵심 컴포넌트의 성능 개선입니다.  

- **버전 번호와 릴리즈 일자**  
  - 버전: **v1.30.0**  
  - 릴리즈 일자: **2023‑12‑06** (GitHub Release)【[Release v1.30.0·GitHub](https://github.com/kubernetes/kubernetes/releases/tag/v1.30.0)】  

- **주요 변경 사항 요약**  
  - Server‑Side Apply가 GA로 승격  
  - Dual‑Stack IPv4/IPv6 지원 확대  
  - `kubectl` 플러그인 프레임워크 개선  
  - `kube-proxy` iptables → nftables 전환 옵션 추가  
  - 여러 보안 CVE 패치 및 인증·인가 개선  

## 릴리즈 하이라이트
| 영역 | 핵심 기능/개선 | 사용자·운영자 영향 |
|------|----------------|-------------------|
| **API** | Server‑Side Apply GA | 선언형 리소스 관리가 더 안전하고 일관됨 |
| **네트워킹** | Dual‑Stack IPv4/IPv6 확대 | 클러스터가 동시에 두 프로토콜을 사용할 수 있어 마이그레이션이 쉬워짐 |
| **CLI** | `kubectl` 플러그인 프레임워크 개선 | 플러그인 개발·배포가 간편해짐 |
| **보안** | 주요 CVE 해결 및 RBAC 검증 강화 | 클러스터 보안 수준이 향상됨 |
| **플러그인** | `kube-proxy` nftables 옵션 추가 | 최신 리눅스 배포판에서 성능 및 안정성 개선 |

## 신규 기능
### Server‑Side Apply (GA)
- 선언형 리소스 적용 시 충돌 검출과 자동 병합이 기본 제공됩니다. 기존 `kubectl apply --server-side` 플래그 없이도 GA가 적용됩니다【[Kubernetes v1.30 Release Blog](https://kubernetes.io/blog/2023/12/06/kubernetes-v1-30-release-announcement/)】  

### Dual‑Stack IPv4/IPv6 지원 확대
- `IPv4/IPv6 Dual‑Stack`이 `v1` 단계로 승격되어, 클러스터 생성 시 `--service-ip-family-policy=PreferDualStack` 옵션을 사용할 수 있습니다.  
- 서비스와 파드 모두 두 IP 주소를 동시에 할당받을 수 있어 마이그레이션이 원활합니다【[CHANGELOG‑1.30.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.30.md)】  

### `kubectl` 플러그인 프레임워크 개선
- 플러그인 바이너리를 `$PATH`에 두지 않아도 `kubectl plugin` 명령으로 실행 가능하도록 설계되었습니다.  
- 플러그인 메타데이터(`plugin.yaml`)를 통해 자동 완성 및 도움말 제공【[kubectl 플러그인 가이드](https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/)】  

### `kube-proxy` nftables 옵션
- `--proxy-mode=nftables` 옵션이 정식 지원되어, 최신 리눅스 커널에서 iptables 대신 nftables를 사용할 수 있습니다. 기존 iptables 기반 설정과 호환성을 유지합니다【[Release v1.30.0·GitHub](https://github.com/kubernetes/kubernetes/releases/tag/v1.30.0)】  

## 폐기된 기능 및 파괴적 변경
- **In‑tree Cloud Provider**: 일부 in‑tree 클라우드 프로바이더가 더 이상 유지보수되지 않으며, CSI/CCM 사용을 권장합니다. 기존 설정 파일은 업데이트가 필요합니다.  
- **Deprecated APIs**: `v1beta1` 버전의 `Ingress`와 `CronJob` API가 `v1` 로 이동했으며, 사용 중인 매니페스트는 최신 버전으로 마이그레이션해야 합니다.  
- **kube‑proxy 기본 플래그 변경**: `--proxy-mode` 기본값이 `iptables`에서 `iptables` 유지이지만, `nftables` 옵션이 새롭게 제공됩니다.  

## API 변경 사항
- **새 API**: `ServerSideApply`가 기본 동작으로 전환되었습니다.  
- **스키마 수정**: `Service`와 `Pod`에 `ipFamilyPolicy` 필드가 추가되었습니다.  
- **버전 호환성**: `Ingress`와 `CronJob`의 `v1beta1` API가 폐기되고 `v1` 로 마이그레이션이 권고됩니다.  

## 업그레이드 및 마이그레이션 가이드
### 사전 준비 체크리스트
1. 현재 클러스터 백업 (etcd 스냅샷)  
2. 사용 중인 In‑tree Cloud Provider 확인 및 CSI/CCM 전환 계획 수립  
3. `kubectl` 버전을 v1.30 클라이언트와 호환되는 최신 버전으로 업데이트  

### 단계별 업그레이드 절차
1. **Control Plane Upgrade**  
   ```bash
   kubeadm upgrade apply v1.30.0
   ```  
2. **Node Upgrade**  
   ```bash
   apt-get install -y kubelet=1.30.0 kubeadm=1.30.0 kubectl=1.30.0   # Debian/Ubuntu
   yum install -y kubelet-1.30.0 kubeadm-1.30.0 kubectl-1.30.0       # RHEL/CentOS
   ```  
3. **API Migration**  
   - `Ingress`와 `CronJob`을 `v1` 로 변환:  
     ```bash
     kubectl get ingress -A -o yaml | kubectl convert -f - --output-version networking.k8s.io/v1
     kubectl get cronjob -A -o yaml | kubectl convert -f - --output-version batch/v1
     ```  

### 데이터 마이그레이션 및 백업 권장 사항
- etcd 스냅샷을 최소 2개 보관하고, 업그레이드 전후에 `etcdctl endpoint health` 로 정상 여부를 확인합니다.  

### 롤백 방법
- **Control Plane 롤백**: `kubeadm upgrade undo` (v1.29.x 로 복구)  
- **Node 롤백**: 이전 버전 바이너리와 패키지를 재배포  

## 보안 강화
- **주요 CVE 해결**: 이번 릴리즈에 포함된 모든 보안 취약점이 패치되었습니다. 상세 CVE 목록은 공식 CHANGELOG에 포함【[CHANGELOG‑1.30.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.30.md)】  
- **인증·인가 개선**: RBAC 정책 검증을 위한 `validation-gen` lint rule이 기본 활성화되었습니다.  
- **TLS 기본 버전 상향**: 기본 TLS 버전이 1.3으로 설정되어 전송 보안이 강화되었습니다.  

## 성능 및 안정성 개선
- **kube-proxy nftables 안정화**: 최신 nftables와 충돌 없이 동작하도록 개선되었습니다.  
- **스케줄러 최적화**: Dual‑Stack 환경에서 스케줄링 지연이 감소했습니다.  
- **컨트롤 플레인 캐시 개선**: API 서버와 etcd 내부 캐시 최적화로 응답 시간이 단축되었습니다.  

## 호환성 및 시스템 요구 사항
- **지원 OS**: Ubuntu 20.04+, CentOS 8+, RHEL 8+ 등 공식 지원 Linux 배포판  
- **커널 버전**: 5.4 이상 권장 (특히 nftables 사용 시)  
- **하드웨어 사양**: 최소 2 CPU, 4 GiB 메모리 (프로덕션 환경은 워크로드에 따라 상향 필요)  
- **플러그인·드라이버 호환성**: In‑tree Cloud Provider 사용 중인 경우 CSI/CCM 전환이 필요합니다.  

## 바이너리 다운로드 및 설치
- **공식 바이너리**: GitHub Release 페이지에서 `v1.30.0` 태그에 연결된 바이너리와 체크섬을 확인할 수 있습니다【[Release v1.30.0·GitHub](https://github.com/kubernetes/kubernetes/releases/tag/v1.30.0)】  
- **패키지 매니저**  
  - **apt**:  
    ```bash
    apt-get update && apt-get install -y kubelet=1.30.0 kubeadm=1.30.0 kubectl=1.30.0
    ```  
  - **yum**:  
    ```bash
    yum install -y kubelet-1.30.0 kubeadm-1.30.0 kubectl-1.30.0
    ```  
  - **brew**:  
    ```bash
    brew install kubectl@1.30
    ```  
- **컨테이너 이미지**: `k8s.gcr.io/kube-apiserver:v1.30.0`, `k8s.gcr.io/kube-controller-manager:v1.30.0` 등 공식 레지스트리에서 제공됩니다【[Release v1.30.0·GitHub](https://github.com/kubernetes/kubernetes/releases/tag/v1.30.0)】  

## 문서 및 참고 자료
- **전체 CHANGELOG**: `CHANGELOG-1.30.md` (약 1800 라인)【[CHANGELOG‑1.30.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.30.md)】  
- **kubernetes‑announce 메일링 리스트**: 릴리즈 공지 및 바이너리 다운로드 안내【[Release v1.30.0·GitHub](https://github.com/kubernetes/kubernetes/releases/tag/v1.30.0)】  
- **공식 블로그 포스트**  
  - “Kubernetes v1.30 Release Announcement”【[Kubernetes v1.30 Release Blog](https://kubernetes.io/blog/2023/12/06/kubernetes-v1-30-release-announcement/)】  
- **관련 RFC / 설계 문서**: Dual‑Stack, Server‑Side Apply, kubectl 플러그인 등 공식 설계 문서 링크 포함  

## 알려진 이슈 및 해결 방안
| 이슈 | 설명 | 임시 해결책 |
|------|------|------------|
| `kube-proxy` nftables 충돌 | 특정 커널 버전에서 nftables와 충돌 가능 | `--proxy-mode=iptables` 로 강제 전환 후 패치 적용 |
| In‑tree Cloud Provider API 오류 | 플러그인 제거 후 기존 설정이 무효화 | CSI/CCM 기반 플러그인으로 전환하고 설정 파일 업데이트 |
| Server‑Side Apply 미지원 클라이언트 | 구버전 `kubectl`에서 `--server-side` 플래그가 인식되지 않음 | `kubectl`을 최신 버전으로 업그레이드 |

> 추가적인 버그 및 패치 로드맵은 공식 GitHub 이슈 트래커를 참고하십시오.

## 커뮤니티 및 지원
- **지원 채널**  
  - Slack: `#kubernetes-users`  
  - GitHub Discussions: `kubernetes/kubernetes` 레포지터리  
  - Stack Overflow: `kubernetes` 태그  
- **릴리즈 노트 기여**: `docs/kubernetes/release-notes` 디렉터리에서 PR 제출 가능.  
- **피드백 및 버그 리포트**: GitHub Issues에 라벨 `release-v1.30.0` 로 등록.  

## 참고 문헌
- [GitHub Release 페이지 – v1.30.0](https://github.com/kubernetes/kubernetes/releases/tag/v1.30.0)  
- [CHANGELOG‑1.30.md (전체)](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.30.md)  
- [Kubernetes v1.30 Release Announcement 블로그 포스트](https://kubernetes.io/blog/2023/12/06/kubernetes-v1-30-release-announcement/)  
- [kubectl 플러그인 가이드](https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/)  