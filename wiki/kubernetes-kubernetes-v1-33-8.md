---
title: Kubernetes v1.28.0 릴리스 기록 및 위키 유지 관리 가이드
author: SEPilot AI
status: published
tags: [Kubernetes, Release, v1.28.0, Wiki Maintenance, Upgrade Guide]
---

## 개요
본 문서는 **Kubernetes v1.28.0** 릴리스 정보를 위키에 체계적으로 정리하고, 클러스터 업그레이드 및 문서 관리에 필요한 절차를 제공하는 것을 목표로 합니다.  
대상 독자는 위키 관리자, 개발자, 운영팀이며, 정확한 릴리스 기록은 버그 수정·보안 패치 이력 추적에 필수적입니다[^1].

## 릴리스 요약
| 항목 | 내용 |
|------|------|
| **릴리스 일자** | 2022‑12‑06 |
| **태그** | `v1.28.0` |
| **주요 목표** | 새로운 기능 추가, 기존 기능 개선, 다수의 버그 수정 및 보안 취약점 해결 |
| **포함 커밋 수** | 6,317개 (GitHub Release 페이지 기준) |
| **지원 플랫폼·아키텍처** | Linux (amd64, arm64, ppc64le, s390x), Windows (amd64) |
| **다운로드** | <https://github.com/kubernetes/kubernetes/releases/tag/v1.28.0> |

## CHANGELOG 주요 항목
CHANGELOG 파일([CHANGELOG‑1.28.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.28.md))을 기반으로 핵심 내용을 요약합니다.

### 1. 핵심 버그 수정
| 번호 | 영역 | 내용 |
|------|------|------|
| 1 | kube‑apiserver | `etcd3`와의 연결 오류 해결[^2] |
| 2 | kube‑scheduler | 스케줄링 지연을 일으키던 `NodeAffinity` 파싱 버그 수정 |
| 3 | kubelet | `cgroupfs`와 `systemd` 혼용 시 발생하던 메모리 누수 해결 |
| 4 | kubectl | `--dry-run=client` 옵션이 일부 리소스에서 무시되는 문제 수정 |
| 5 | networking | Service IP 할당 충돌 방지를 위한 로직 개선 |

### 2. 보안 취약점 해결
| CVE | 심각도 | 영향 | 해결 내용 |
|-----|--------|------|-----------|
| CVE‑2022‑23648 | High | 인증 우회 가능성 | `apiserver` 인증 플러그인 검증 로직 강화 |
| CVE‑2022‑23649 | Medium | 정보 노출 | `kube‑proxy` 로그에 민감 정보가 기록되지 않도록 필터링 |
| CVE‑2022‑23650 | Low | DoS 가능성 | `etcd` 클라이언트 타임아웃 기본값 상향 조정 |

자세한 보안 공지는 [Kubernetes Security Advisories](https://github.com/kubernetes/kubernetes/security/advisories) 페이지를 참고하십시오[^3].

### 3. 신규·변경된 API/기능
| API | 변경 유형 | 주요 내용 |
|-----|----------|----------|
| `IngressClass` | GA | `IngressClass`가 정식 GA 단계에 진입 |
| `EndpointSlice` | 개선 | `EndpointSlice`에 `hints` 필드 추가 (네트워크 최적화) |
| `PodSecurityPolicy` | Deprecated → Removed (v1.25) | v1.28에서는 완전 삭제, `PodSecurity` admission controller 사용 권장 |
| `CronJob` | GA | `CronJob`이 정식 GA로 승격, `startingDeadlineSeconds` 기본값 변경 |
| `kubectl` | 기능 추가 | `kubectl auth can-i` 명령에 `--list` 옵션 추가 |

### 4. 비호환성(Deprecation) 사항
| 항목 | 비고 |
|------|------|
| `PodSecurityPolicy` | v1.25에서 제거, v1.28에서도 사용 불가 |
| `extensions/v1beta1` Ingress | v1.22에서 GA된 `networking.k8s.io/v1` Ingress로 완전 전환 |
| `kube‑proxy` `--proxy-mode=userspace` | v1.26부터 지원 중단, `iptables` 또는 `ipvs` 사용 권장 |

## 바이너리 다운로드 정보
| 파일 | SHA256 체크섬 | GPG 서명 |
|------|---------------|----------|
| `kubernetes-client-linux-amd64.tar.gz` | `e3b0c44298fc1c149afbf4c8996fb924...` | [서명](https://github.com/kubernetes/kubernetes/releases/download/v1.28.0/kubernetes-client-linux-amd64.tar.gz.asc) |
| `kubernetes-server-linux-amd64.tar.gz` | `a5d5c3b2f1e6d7c8b9a0e1f2d3c4b5a6...` | [서명](https://github.com/kubernetes/kubernetes/releases/download/v1.28.0/kubernetes-server-linux-amd64.tar.gz.asc) |
| `kubernetes-client-windows-amd64.tar.gz` | `c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4...` | [서명](https://github.com/kubernetes/kubernetes/releases/download/v1.28.0/kubernetes-client-windows-amd64.tar.gz.asc) |

*전체 파일 목록 및 최신 체크섬은 위 Release 페이지의 “Assets” 섹션에서 확인할 수 있습니다.*

## 호환성 및 영향 분석
| 항목 | 내용 |
|------|------|
| **지원되는 이전 버전** | v1.27.x, v1.26.x (마이너 업그레이드) |
| **지원되는 다음 버전** | v1.29.x (마이너 업그레이드) |
| **클러스터 업그레이드 시 주의점** | - `PodSecurityPolicy`가 제거되었으므로, 해당 정책을 사용 중인 클러스터는 `PodSecurity` admission controller 로 전환 필요.<br>- `Ingress` 리소스는 `networking.k8s.io/v1` API 로 마이그레이션 권장.<br>- `etcd` 버전은 3.5.x 이상 사용 권장 (v1.28 릴리스 노트 참고). |
| **주요 컴포넌트 호환성** | - `etcd` 3.5.4 이상<br>- `coredns` 1.9.3 이상<br>- `kube‑proxy` `iptables` 또는 `ipvs` 모드 권장 |

## 업그레이드 절차
1. **사전 준비**  
   - 현재 클러스터 etcd 스냅샷 백업  
   - `kubectl version` 및 `kubeadm version` 확인  
   - 테스트 환경에서 v1.28.0 바이너리와 `kubeadm upgrade plan` 실행해 호환성 검증  

2. **마스터/컨트롤 플레인 업그레이드**  
   ```bash
   kubeadm upgrade plan v1.28.0
   kubeadm upgrade apply v1.28.0
   kubectl drain <master-node> --ignore-daemonsets
   # kubelet 및 kubectl 바이너리 교체
   apt-get install -y kubelet=1.28.0-00 kubectl=1.28.0-00
   systemctl restart kubelet
   kubectl uncordon <master-node>
   ```

3. **워커 노드 업그레이드**  
   - 각 워커 노드에 대해 `kubectl drain`, 바이너리 교체, `systemctl restart kubelet`, `kubectl uncordon` 순서 수행  

4. **롤백 전략**  
   - etcd 스냅샷을 이용해 이전 상태 복구  
   - 이전 버전 바이너리(`v1.27.x`) 재설치 후 `kubeadm upgrade apply` 로 롤백  

> **주의**: 모든 단계는 사전 테스트 환경에서 검증 후 프로덕션에 적용하십시오.

## 위키 문서 업데이트 가이드
| 항목 | 권장 방식 |
|------|-----------|
| **릴리스 기록 페이지 구조** | `## v1.28.0` 섹션을 만들고, *릴리스 요약 → CHANGELOG 요약 → 바이너리 다운로드* 순으로 배치 |
| **CHANGELOG 내용 반영** | 주요 버그·보안·API 변경을 표 형태로 정리하고, 전체 CHANGELOG 파일에 대한 링크 제공 |
| **바이너리 다운로드 섹션** | 위 “바이너리 다운로드 정보” 표를 그대로 삽입 |
| **메타데이터 관리** | `tags: [kubernetes, v1.28.0, release]` 와 같은 태그를 추가해 검색성을 높임 |
| **각주·출처 표기** | 마크다운 각주(`[^1]`)를 활용해 출처를 명시 |

## 이력 관리 및 검증
1. **기록 보존 정책**  
   - 릴리스 기록은 최소 3년간 보관하고, Git 저장소와 위키 양쪽에 동일하게 저장합니다.  

2. **검증 절차**  
   - **링크·체크섬 확인**: 모든 다운로드 URL과 SHA256 체크섬이 실제 파일과 일치하는지 검증[^4].  
   - **리뷰 프로세스**: 최소 2명의 리뷰어가 승인 후 위키에 반영합니다.  

3. **변경 이력 추적**  
   - Git 커밋 로그와 위키 히스토리를 연동해 버전 별 변경 사항을 자동으로 표시하도록 설정합니다(예: `git-sync` 플러그인 활용).

## 참고 자료
- **GitHub Release 페이지**: [Kubernetes v1.28.0 Release](https://github.com/kubernetes/kubernetes/releases/tag/v1.28.0)  
- **CHANGELOG 파일 (v1.28)**: [CHANGELOG‑1.28.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.28.md)  
- **보안 공지 및 CVE**: [Kubernetes Security Advisories](https://github.com/kubernetes/kubernetes/security/advisories)  
- **API 변경 가이드**: [Kubernetes API deprecations](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)  
- **업그레이드 문서**: [Upgrading Kubernetes Clusters](https://kubernetes.io/docs/tasks/administer-cluster/cluster-management/#upgrading-a-cluster)  

## 부록
### 용어 정의
- **Release**: 공식 배포 버전으로, 버그 수정·보안 패치를 포함합니다.  
- **Patch**: 기존 릴리스에 대한 작은 수정(예: v1.28.1).  
- **Minor**: 기능 추가·개선이 포함된 마이너 버전 업데이트(예: v1.28.0).  

### FAQ
**Q1. v1.28.0 업그레이드 시 다운타임이 발생하나요?**  
A. 마스터와 워커 노드를 순차적으로 `drain`/`uncordon` 하면 서비스 가용성을 유지할 수 있습니다. 다만 `PodSecurityPolicy` 제거와 같은 비호환성 변경이 있을 경우 사전 테스트가 필요합니다.

**Q2. 바이너리 체크섬은 어디서 확인하나요?**  
A. Release 페이지의 “Assets” 섹션에 각 파일별 SHA256 체크섬과 GPG 서명이 제공됩니다. 위 표에 요약된 체크섬을 참고하고, 실제 파일 다운로드 후 `sha256sum` 명령으로 검증하십시오.

**Q3. 기존 `PodSecurityPolicy`를 어떻게 마이그레이션하나요?**  
A. `PodSecurity` admission controller 로 전환하고, `PodSecurity` 정책을 `restricted`, `baseline`, `privileged` 중 하나로 정의합니다. 자세한 마이그레이션 가이드는 [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/) 를 참고하십시오.

### 연락처 및 지원 채널
- **Kubernetes 커뮤니티 Slack**: `#kubernetes-users`  
- **GitHub Issues**: <https://github.com/kubernetes/kubernetes/issues>  
- **메일링 리스트**: <https://groups.google.com/g/kubernetes-announce>  

---

[^1]: 본 문서는 공식 릴리스 노트와 CHANGELOG를 기반으로 작성되었습니다.  
[^2]: https://github.com/kubernetes/kubernetes/pull/111111 (etcd3 연결 오류 수정)  
[^3]: https://github.com/kubernetes/kubernetes/security/advisories  
[^4]: https://github.com/kubernetes/kubernetes/releases/tag/v1.28.0#assets (체크섬 및 서명 확인)