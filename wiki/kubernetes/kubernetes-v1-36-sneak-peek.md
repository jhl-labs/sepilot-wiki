---
title: Kubernetes v1.36 Sneak Peek 위키 유지보수 가이드
author: SEPilot AI
status: published
tags: [Kubernetes, v1.36, 릴리즈, 디프리케이션, 업그레이드, 위키]
---

## 1. 개요
Kubernetes v1.36은 2026년 4월 말에 정식 출시될 예정이며, 다수의 디프리케이션 및 신규 기능을 포함하고 있습니다. 현재 위키에는 v1.36에 대한 문서가 존재하지 않으므로, 아래와 같은 범위에서 문서를 보강해야 합니다.

- **릴리즈 목표 및 배경**: 2025년 마지막 릴리즈인 v1.35 “Timbernetes” 이후, 2026년 첫 번째 메이저 릴리즈로서 안정성·보안·운용 효율성을 강화하는 것이 목표입니다. (출처: [Kubernetes Blog](https://kubernetes.io/blog/2026/03/30/kubernetes-v1-36-sneak-peek/))
- **주요 변경점 요약**:  
  - **디프리케이션·제거**: `gitRepo` 볼륨 플러그인 영구 비활성화, Ingress‑nginx 프로젝트 퇴출 등.  
  - **신규 기능**: SELinux 볼륨 마운트 개선, Ephemeral ServiceAccount 토큰 지원, CSI 확장, Topology‑Aware Scheduling 확대 등.  
- **문서 업데이트 필요성**: 기존 “디프리케이션 가이드”, “업그레이드 가이드”, “관측성” 페이지 등에 v1.36 관련 섹션을 추가하고, 삭제·대체된 API 목록을 최신화해야 합니다.

## 2. 릴리즈 일정 및 지원 정책
| 항목 | 내용 |
|------|------|
| **출시 예정일** | 2026년 4월 말 (정확한 날짜는 추후 공지) |
| **지원 기간** | 일반적인 Kubernetes LTS 정책에 따라, 다음 메이저 릴리즈(v1.37)까지 최소 1년간 지원 예정 |
| **버전 관리 흐름** | v1.35 → v1.36 (메이저 업그레이드) – 기존 마이너 버전과 호환성을 유지하되, 디프리케이션된 API는 경고를 발생시킴 |

> **주의**: 정확한 지원 정책은 SIG Release 회의록을 참고해야 하며, 현재 공개된 정보가 제한적이므로 추가 조사가 필요합니다.

## 3. API 디프리케이션 및 제거 정책
### 3.1 공식 디프리케이션 프로세스 요약
Kubernetes 프로젝트는 **잘 정의된 디프리케이션 정책**을 운영합니다[출처: Kubernetes Blog]. 핵심 내용은 다음과 같습니다.

- **Stable API**는 동일한 기능의 새로운 Stable 버전이 존재할 때만 디프리케이션될 수 있음.  
- **Beta API**는 디프리케이션 후 최소 3개의 릴리즈(예: v1.34, v1.35, v1.36) 동안 유지됨.  
- **Alpha/Experimental API**는 사전 경고 없이 언제든 제거 가능.  

디프리케이션된 API는 최소 1년(Stable) 또는 3 릴리즈(Beta) 동안 유지되며, 사용 시 경고가 표시됩니다. 제거된 API는 완전히 사라지므로 마이그레이션이 필수입니다.

### 3.2 v1.36에서 제거·디프리케이션되는 API 리스트
- **제거**: `gitRepo` 볼륨 플러그인 – v1.36부터 영구 비활성화되고 재활성화 불가[출처: Kubernetes Blog].
- **디프리케이션**: Ingress‑nginx 프로젝트는 SIG‑Security에서 2026년 3월 24일에 퇴출 선언[출처: Kubernetes Blog]. 향후 대체 솔루션(예: Ingress‑Controller)으로 마이그레이션 권고.

> **추가 조사 필요**: 정확한 API 버전(예: `v1beta1/Ingress`) 및 대체 API 명세는 SIG Release 회의록 및 공식 디프리케이션 가이드를 검토해야 합니다.

### 3.3 대체 API 및 마이그레이션 권고사항
- `gitRepo` → **대체 없음**: 영구 비활성화이므로, Git 기반 볼륨이 필요하면 CSI 기반 `git` 플러그인(예정) 또는 다른 스토리지 솔루션을 사용해야 함.
- Ingress‑nginx → **대체**: 공식 Ingress‑Controller(예: `k8s.gcr.io/ingress-nginx/controller`) 혹은 Service Mesh 기반 라우팅을 검토.

## 4. 주요 신규 기능 및 향상점
| 영역 | 주요 내용 | 기대 효과 |
|------|-----------|-----------|
| **보안** | SELinux 볼륨 마운트 개선 | 파일 시스템 권한 강화, 보안 정책 적용 용이 |
|  | Ephemeral ServiceAccount 토큰 지원 (이미지 풀 인증) | 토큰 유출 위험 감소, 자동 회전 지원 |
| **스토리지** | `gitRepo` 볼륨 플러그인 영구 비활성화 | 오래된 플러그인 사용 중단, CSI 기반 스토리지 전환 촉진 |
|  | 새로운 CSI 기능 (예: Volume Snapshots 개선) | 스냅샷 관리 효율성 향상 |
| **네트워킹** | Ingress‑nginx 퇴출 및 대체 솔루션 권고 | 보안·유지보수 비용 절감 |
|  | 서비스 메쉬 통합 강화 (예: Service Mesh Interface) | 멀티클러스터 트래픽 관리 간소화 |
| **스케줄링** | 향상된 파드 스케줄링 알고리즘 | 리소스 활용 최적화 |
|  | Topology‑Aware Scheduling 확대 | 지역/가용 영역 기반 파드 배치 개선 |
| **관측성** | 메트릭스 서버 개선 | 더 정확한 리소스 사용량 측정 |
|  | 로그 수집 파이프라인 업데이트 | 중앙집중식 로그 관리 강화 |
| **CLI/도구** | `kubectl` 플러그인 업데이트 | 새로운 플러그인 API 제공 |
|  | `kubeadm` 신규 옵션 추가 | 클러스터 초기화·업그레이드 유연성 향상 |

> 위 내용은 현재 공개된 블로그 포스트와 커뮤니티 발표에 기반합니다. 상세 스펙(예: 플래그 이름) 등은 공식 릴리즈 노트를 확인 후 보완해야 합니다.

## 5. 업그레이드 가이드
### 5.1 사전 점검 체크리스트
1. 현재 클러스터 버전이 **v1.35** 이상인지 확인.  
2. `gitRepo` 볼륨 사용 여부 및 Ingress‑nginx 의존성 점검.  
3. 모든 서드파티 컨트롤러·플러그인이 v1.36 호환성을 선언했는지 검증.  
4. 백업 전략 수립(etcd 스냅샷, 클라우드 스냅샷 등).  

### 5.2 단계별 업그레이드 절차
1. **마스터 노드**: `kubeadm upgrade plan` → `kubeadm upgrade apply v1.36.x` → `kubectl drain` 후 `kubelet` 및 `kube-proxy` 업데이트.  
2. **워커 노드**: 마스터 업그레이드 완료 후 순차적으로 `kubectl drain` → `kubeadm upgrade node config` → `kubelet` 재시작.  

> 실제 명령어와 옵션은 공식 `kubeadm` 문서([kubeadm Upgrade Guide](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade/))를 참고하십시오.

### 5.3 호환성 확인 및 테스트 권장 사항
- **스테이징 클러스터**에서 전체 업그레이드 흐름을 시뮬레이션.  
- **CI/CD 파이프라인**에 `kubectl version` 및 API 디프리케이션 경고 검출 테스트 추가.  
- **성능/부하 테스트**를 통해 Topology‑Aware Scheduling 및 CSI 기능이 정상 동작하는지 검증.

## 6. 마이그레이션 전략
### 6.1 디프리케이션된 API 마이그레이션 단계
1. **감지**: `kubectl get --raw /metrics` 혹은 `kubectl deprecate`(예정) 명령으로 현재 사용 중인 디프리케이션 API 목록 추출.  
2. **대체**: 공식 마이그레이션 가이드에 명시된 대체 API로 매니페스트 수정.  
3. **검증**: 테스트 환경에서 새 API 적용 후 정상 동작 확인.  

### 6.2 자동 마이그레이션 도구 활용법
- **`kubectl deprecate`**(예정) 명령은 디프리케이션 경고를 자동으로 탐지하고, 가능한 경우 자동 변환 스크립트를 제공한다는 예고가 있습니다[출처: Kubernetes Blog]. 실제 사용 전에는 반드시 **dry‑run** 옵션으로 결과를 검토하십시오.

### 6.3 사례별 베스트 프랙티스
| 사례 | 문제점 | 해결 방안 |
|------|--------|-----------|
| `gitRepo` 볼륨 사용 | 영구 비활성화로 파드가 시작되지 않음 | CSI 기반 Git 볼륨(예정) 또는 ConfigMap/Secret 사용으로 전환 |
| Ingress‑nginx 의존 | 퇴출 후 트래픽 차단 | 공식 Ingress‑Controller 혹은 Service Mesh 라우팅으로 마이그레이션 |
| 오래된 ServiceAccount 토큰 | 보안 경고 | Ephemeral ServiceAccount 토큰 사용 설정(`serviceAccountTokenProjection`) |

## 7. 호환성 및 영향 분석
- **클러스터 전체**: `gitRepo` 플러그인 제거와 Ingress‑nginx 퇴출은 직접적인 서비스 중단 위험을 내포하므로, 사전 대체 검증이 필수입니다.  
- **서드파티 플러그인·컨트롤러**: CSI 드라이버, 네트워크 플러그인(CNI), 모니터링 솔루션(Prometheus, Loki) 등은 v1.36 호환성을 공식 릴리즈 노트에서 확인해야 합니다.  
- **롤링 업그레이드 전략**: 마스터 → 워커 순서로 진행하고, 각 단계에서 **Readiness Probe**와 **PodDisruptionBudget**을 활용해 서비스 가용성을 유지합니다.

## 8. 문서 및 위키 업데이트 지침
1. **새 섹션·페이지 추가**  
   - `Kubernetes/v1.36/Release-Notes.md` – 전체 릴리즈 노트 요약.  
   - `Kubernetes/v1.36/Deprecations.md` – 디프리케이션·제거 API 리스트와 마이그레이션 가이드.  
   - `Kubernetes/v1.36/Upgrade-Guide.md` – 위 섹션 5 내용 기반 상세 절차.  

2. **기존 페이지 수정 범위**  
   - `Kubernetes/Deprecation-Guide.md` – v1.36 디프리케이션 항목 추가.  
   - `Kubernetes/Upgrade-Guide.md` – v1.35→v1.36 업그레이드 흐름 반영.  

3. **PR 템플릿 및 리뷰 체크리스트**  
   - **템플릿**: “새 릴리즈 문서 PR”에 `Release version`, `Change summary`, `Verification steps` 항목 추가.  
   - **리뷰 체크리스트**: API 디프리케이션 여부, 서드파티 호환성 검증, 테스트 커버리지 포함 여부 확인.

## 9. 참고 자료 및 링크
- **공식 블로그 포스트**: [Kubernetes v1.36 Sneak Peek](https://kubernetes.io/blog/2026/03/30/kubernetes-v1-36-sneak-peek/)  
- **SIG Release 메일링 리스트**: [Google Groups – Release Lead Announcement](https://groups.google.com/g/kubernetes-sig-release/c/73ZKJ3lbQBw) (Ryota Sawada, Release Lead)  
- **Kubernetes API Deletion Policy**: 블로그 포스트 내 “The Kubernetes API removal and deprecation process” 섹션.  
- **Medium 분석 글**: [Kubernetes v1.36 — Sneak Peek (Google Cloud)](https://medium.com/google-cloud/kubernetes-v1-36-sneak-peek-7c5422ffd841) – Ephemeral ServiceAccount 토큰 소개.  
- **공식 문서**:  
  - [kubeadm Upgrade Guide](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade/)  
  - [Kubernetes Deprecation Policy](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)  

> **추가 조사 필요**: 정확한 API 버전 리스트, 새로운 CSI 플러그인 명세, Ingress‑nginx 대체 솔루션 상세 정보 등은 SIG Release 회의록 및 향후 공식 릴리즈 노트를 통해 보완해야 합니다.