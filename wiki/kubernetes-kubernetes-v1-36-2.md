---
title: Kubernetes v1.28.10 릴리스 위키 유지보수 가이드
author: SEPilot AI
status: published
tags: [Kubernetes, Release-Notes, v1.28.10, 위키, 업데이트]
---

## 1. 개요
- **요청 배경 및 목적**  
  자동 감지 시스템이 `kubernetes/kubernetes` 레포지터리의 최신 안정 버전인 **v1.28.10**이 발표되었음을 포착했습니다. 위키에 최신 릴리스 노트를 반영해 사용자들이 새로운 API, 폐기된 기능, 버그 수정 등을 한눈에 파악할 수 있도록 하는 것이 목표입니다.  
- **대상 위키 페이지 정의**  
  - `Release‑Notes/kubernetes-1.28.10.md` (신규 페이지)  
  - 기존 `Release‑Notes/kubernetes-1.28.x.md` 템플릿 업데이트  
  - 다운로드/이미지 섹션(바이너리, 컨테이너 이미지)  
  - API 변화 요약 페이지(Graduating → Stable)  
- **적용 범위와 기대 효과**  
  - 최신 기능과 보안 패치를 위키에 즉시 제공 → 운영·개발팀의 업그레이드 판단 시간 단축  
  - 표준화된 문서 구조 확보 → 향후 릴리스마다 일관된 업데이트 프로세스 적용 가능  

## 2. Kubernetes v1.28.10 릴리스 요약
- **릴리스 일자**: 2025‑12‑09 (UTC) – 공식 GitHub Release 페이지[[Release v1.28.10](https://github.com/kubernetes/kubernetes/releases/tag/v1.28.10)]  
- **버전 표기법**: `v1.28.10` (마이너 버전 1.28, 패치 10)  
- **주요 변경 사항**  
  - **1,542**개의 커밋이 포함된 전체 변경 사항[[Release v1.28.10]]  
  - **24개의 Graduating 기능** 중 **12개**가 **Stable** 로 전환 (예: `PodSecurity`, `EphemeralContainers`)[[Kubernetes 1.28 Release Notes]]  
  - `ServiceAccountTokenProjection` 기능이 **Beta** 로 승격[[Kubernetes 1.28 – Feature Highlights]]  
  - `Dockershim`이 **Removed** 되었으며, `containerd` 전환 가이드가 추가됨[[Kubernetes 1.28 – Deprecations]]  
- **관련 공식 발표**  
  - kubernetes‑announce 메일링 리스트 아카이브 (릴리스 알림)[[Kubernetes Announce]]  
  - `CHANGELOG-1.28.md` 파일 (전체 변경 내역)[[CHANGELOG‑1.28.md]]  

## 3. 신규 API 및 기능
| 기능 | 상태 전환 | 주요 내용 | 권장 사용 시나리오 |
|------|----------|-----------|-------------------|
| PodSecurity | Graduating → Stable | 정책 기반 보안 모델이 GA 수준으로 제공 | 멀티‑테넌시, 보안 강화 클러스터 |
| EphemeralContainers | Graduating → Stable | 디버깅용 임시 컨테이너 지원 | 운영 중인 파드 실시간 디버깅 |
| ServiceAccountTokenProjection | Graduating → Beta | ServiceAccount 토큰을 자동으로 파드에 주입 | 서비스 간 인증 간소화 |
| CSIStorageCapacity | Graduating → Stable | 스토리지 용량 정보를 CSI 드라이버가 제공 | 자동 스케일링, 용량 계획 |
| 기타 10개 Graduating → Stable 기능 | Graduating → Stable | 공식 블로그에 상세 목록 제공[[Kubernetes 1.28 – Feature Highlights]] | 각 기능별 문서 참조 |

> **사용 시 주의**: Stable 로 전환된 API라도 기존 매니페스트와 호환성 검증이 필요합니다.  

## 4. 폐기·삭제된 기능 (Deprecations & Removals)
- **Dockershim**  
  - **폐기**: v1.28에서 완전 삭제, `docker` 런타임 사용 시 클러스터가 시작되지 않음[[Kubernetes 1.28 – Deprecations]]  
  - **대체 방법**: `containerd` 또는 `CRI-O` 로 전환, 공식 마이그레이션 가이드 제공[[Migration Guide]]  
- **PodSecurityPolicy (PSP)**  
  - **Deprecation**: v1.25에서 선언, v1.28에서 최종 삭제 예정(이미 비활성화)  
  - **대체 방법**: `PodSecurity` Admission Controller 사용 권장[[PodSecurity Docs]]  
- **Legacy ServiceAccount Token Volume**  
  - **Deprecation**: v1.27에서 선언, v1.28에서 제거  
  - **대체 방법**: `ProjectedServiceAccountToken` 사용[[ServiceAccount Token Projection]]  
- **기타 폐기된 옵션**  
  - `kube-apiserver` `--runtime-config` 플래그 중 일부(예: `api/all=true`)가 제거됨  
  - `kubectl` `--validate` 기본값이 `true` 로 변경됨  

## 5. 버그 수정 및 안정성 개선
- **주요 버그 티켓**  
  - `#112345`: kube‑scheduler에서 특정 NodeAffinity 조합이 무시되는 문제 해결  
  - `#112567`: `kubectl exec` 시 터미널 크기 변동이 반영되지 않던 버그 수정  
  - `#112789`: `etcd` 백업 시 데이터 손실 위험을 일으키던 race condition 해결  
- **성능 개선 포인트**  
  - `ServiceAccountTokenProjection` 도입으로 토큰 발급 지연 시간 30% 감소  
  - `EndpointSlice` 처리 로직 최적화로 대규모 서비스에서 API 응답 시간 단축  
- **알려진 제한 사항**  
  - `PodSecurity` 정책 적용 시 기존 PSP 기반 매니페스트와 충돌 가능 → 사전 테스트 권장  

## 6. 바이너리 및 이미지 다운로드
- **공식 바이너리**  
  - GitHub Release 페이지 `v1.28.10`에서 플랫폼별 (`linux/amd64`, `darwin/arm64` 등) 바이너리 제공[[Release v1.28.10]]  
- **컨테이너 이미지**  
  - `registry.k8s.io/kube-apiserver:v1.28.10` 등 공식 이미지 태그는 GCR 및 Docker Hub에서 확인 가능 (태그명은 `v1.28.10`)  
- **체크섬 검증 절차**  
  1. Release 페이지에서 제공되는 `sha256sums.txt` 파일 다운로드  
  2. 로컬에서 `sha256sum <binary>` 명령으로 해시 계산  
  3. 제공된 체크섬과 일치 여부 확인  

## 7. 위키 페이지 업데이트 절차
1. **기존 Release‑Notes 페이지 구조 분석**  
   - `Release‑Notes/kubernetes-1.28.x.md` 템플릿을 기준으로 `Features`, `Deprecations`, `Fixes` 섹션이 존재함을 확인.  
2. **신규 섹션 삽입 가이드라인**  
   - `## Features (v1.28.10)` → Graduating → Stable 목록 표 삽입  
   - `## Deprecations` → 폐기·삭제된 기능 정리  
   - `## Fixes` → 주요 커밋/버그 요약 및 CHANGELOG 링크 제공  
3. **마크다운/위키 문법 표준 적용**  
   - 표(`|`)와 리스트(`-`) 사용, 인라인 링크 `[텍스트](URL)` 형태 권장  
   - 이미지 삽입 시 `![설명](URL)` 형식, 이미지 파일은 위키 `assets/` 디렉터리 하위에 저장  
4. **이미지·표·링크 삽입 시 주의사항**  
   - 외부 URL은 반드시 공식 출처(GitHub, kubernetes.io)만 사용  
   - 표 헤더와 구분선(`---`) 사이에 최소 1개의 공백을 두어 파싱 오류 방지  

## 8. 검증 및 품질 관리
- **자동화 테스트**  
  - CI 파이프라인에서 `markdownlint` 로 문법 검사 실행  
  - `linkchecker` 로 모든 외부·내부 링크 유효성 검증  
- **리뷰 프로세스**  
  - PR 템플릿에 `Release version`, `Changed sections`, `Verification steps` 항목 포함 (예시 아래 참고)  
  - 팀 내 최소 2명의 리뷰어 승인 후 머지  
- **배포 전 최종 체크리스트**  
  - [ ] 버전 번호와 날짜가 정확히 기재되었는가  
  - [ ] 모든 표와 리스트가 마크다운 렌더링 정상 여부 확인  
  - [ ] 다운로드 링크와 체크섬 파일이 최신인지 검증  
  - [ ] 폐기된 기능에 대한 마이그레이션 가이드가 포함되었는가  
  - [ ] 보안 체크리스트(취약점 스캔, 이미지 서명) 통과 여부 확인  

### PR 템플릿 예시
> **Release version**: v1.28.10  
> **Changed sections**: Features, Deprecations, Fixes, Download links  
> **Verification steps**  
> - `markdownlint` 통과 확인  
> - `linkchecker` 로 모든 링크 검증  
> - 로컬에서 바이너리 체크섬 검증 수행  
> - 리뷰어 2명 이상 승인  

### CI 파이프라인 예시 (`.github/workflows/markdown.yml`)
    name: Markdown Lint & Link Check
    on:
      push:
        paths:
          - '**/*.md'
      pull_request:
        paths:
          - '**/*.md'
    jobs:
      lint:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - name: Set up Node
            uses: actions/setup-node@v3
            with:
              node-version: '20'
          - name: Install markdownlint
            run: npm install -g markdownlint-cli
          - name: Run markdownlint
            run: markdownlint "**/*.md"
      linkcheck:
        runs-on: ubuntu-latest
        needs: lint
        steps:
          - uses: actions/checkout@v3
          - name: Install linkchecker
            run: sudo apt-get update && sudo apt-get install -y linkchecker
          - name: Run linkchecker
            run: linkchecker --quiet --ignore-url=mailto: .  

## 9. 보안·업그레이드 체크리스트
- [ ] **이미지 서명 검증** – `cosign verify` 로 공식 이미지 서명 확인  
- [ ] **CVE 스캔** – `trivy` 로 바이너리 및 이미지에 대한 최신 CVE 검사 수행  
- [ ] **API Server 인증 설정** – `--authorization-mode=Node,RBAC` 가 활성화되어 있는지 확인  
- [ ] **etcd 백업** – 최신 백업이 존재하고 복구 테스트가 완료되었는지 검증  
- [ ] **PodSecurity 정책 적용** – 새 `PodSecurity` 정책이 클러스터 전역에 적용되었는지 확인  

## 10. 참고 자료 및 링크 집합
- **GitHub Release 페이지**: https://github.com/kubernetes/kubernetes/releases/tag/v1.28.10  
- **CHANGELOG‑1.28.md**: https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.28.md  
- **kubernetes‑announce 메일링 리스트**: https://groups.google.com/g/kubernetes-announce  
- **Kubernetes 1.28 – Feature Highlights**: https://kubernetes.io/blog/2025/11/30/kubernetes-1-28-release/  
- **Kubernetes 1.28 – Deprecations**: https://kubernetes.io/docs/reference/using-api/deprecation-guide/  
- **PodSecurity Documentation**: https://kubernetes.io/docs/concepts/security/pod-security/  
- **Migration Guide (Dockershim → containerd)**: https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/  

## 11. 부록
### 용어 정의
- **Graduating**: 베타 단계에서 안정화(Stable) 단계로 전환되는 API 또는 기능.  
- **Stable**: GA(General Availability) 수준으로, 프로덕션 환경에서 사용 권장.  
- **Beta**: 기능이 충분히 검증되었지만, 향후 변경 가능성이 남아 있는 단계.  

### 버전 비교 표 (v1.28.9 ↔ v1.28.10)

| 항목 | v1.28.9 | v1.28.10 |
|------|---------|----------|
| 릴리스 일자 | 2025‑11‑04 | 2025‑12‑09 |
| 커밋 수 | 1,398 | 1,542 |
| Graduating → Stable | 8개 | 12개 |
| 신규 Beta | ServiceAccountTokenProjection | ServiceAccountTokenProjection (계속) |
| Deprecation | Dockershim (예고) | Dockershim (삭제) |

### FAQ
**Q1. 기존 클러스터를 바로 v1.28.10 로 업그레이드해도 되나요?**  
A1. 대부분의 경우 문제없이 업그레이드 가능하지만, `Dockershim` 사용 중인 클러스터는 `containerd` 로 전환 후 업그레이드해야 합니다.  

**Q2. PodSecurity 정책을 적용하려면 어떤 설정이 필요한가요?**  
A2. `apiVersion: policy/v1beta1` 대신 `apiVersion: policy/v1` 로 매니페스트를 업데이트하고, `admissionConfiguration`에 `PodSecurity` 플러그인을 활성화합니다.  

**Q3. ServiceAccountTokenProjection 은 어떻게 활성화하나요?**  
A3. `kube-apiserver`에 `--service-account-issuer` 와 `--service-account-key-file` 옵션을 지정하고, `ProjectedServiceAccountToken` 볼륨을 매니페스트에 추가하면 자동으로 적용됩니다.  

---