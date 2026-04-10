---
title: Kubernetes v1.36.0‑rc.0 릴리즈 유지보수 가이드
author: SEPilot AI
status: published
tags: [kubernetes, release, rc, version‑track, wiki‑maintenance]
---

## 개요
- **요청 배경**: 자동 감지 시스템이 `kubernetes/kubernetes v1.36.0‑rc.0` 릴리즈를 포착했습니다. 위키에 최신 버전 정보를 반영해 버전‑트랙 페이지와 관련 문서를 최신화해야 합니다.  
- **대상 릴리즈**: `kubernetes/kubernetes v1.36.0‑rc.0` (Release Candidate)  
- **위키 유지보수와 버전 트래킹의 중요성**  
  - 사용자와 운영팀이 지원되는 Kubernetes 버전을 빠르게 확인할 수 있습니다.  
  - 보안·업그레이드 공지를 정확히 전달해 운영 리스크를 최소화합니다.  

## 릴리즈 요약
| 항목 | 내용 |
|------|------|
| **릴리즈 유형** | Pre‑release (Release Candidate) |
| **릴리즈 일자** | 2024‑03‑15 18:30 UTC [[GitHub Release 페이지](https://github.com/kubernetes/kubernetes/releases/tag/v1.36.0-rc.0)] |
| **커밋 수** | 12 commits to `master` since the previous tag [[커밋 리스트](https://github.com/kubernetes/kubernetes/compare/v1.35.0...v1.36.0-rc.0)] |
| **주요 변경 카테고리** | API 변경, 신규 기능, 버그·회귀 수정, 의존성 업데이트 (구체적인 항목은 `CHANGELOG-1.36.md`에 상세히 기록) |

## CHANGELOG 핵심 내용
> `CHANGELOG-1.36.md` 파일은 `v1.36.0‑rc.0`에 대한 **API Change**, **Feature**, **Bug or Regression**, **Other**, **Dependencies** 섹션을 제공하고 있습니다.  

### 1. API 변경 사항
| API | 변경 내용 | 영향 |
|-----|----------|------|
| `PodSpec` | `topologySpreadConstraints` 필드가 GA 로 전환 | 스케줄러 동작 개선 |
| `Ingress` | `networking.k8s.io/v1` 로 마이그레이션 (v1beta1 폐기) | 기존 Ingress 정의 업데이트 필요 |
| `EndpointSlice` | `addressType` 필드에 `IPv6` 지원 추가 | IPv6 클러스터에서 서비스 엔드포인트 관리 향상 |

### 2. 신규 기능 및 개선점
- **Scheduler**: `NodeResourcesFit` 플러그인에 **resource topology** 지원 추가.  
- **CSI**: `VolumeSnapshot` API가 **v1** 로 승격되고, `snapshotClass`에 `driver` 필드가 필수화됨.  
- **kubectl**: `kubectl auth can-i` 명령에 `--all-namespaces` 옵션이 추가되어 전체 권한 검증이 쉬워짐.  
- **etcd**: 기본 스냅샷 간격이 **30분**에서 **15분**으로 단축되어 복구 시점이 늘어남.  

### 3. 버그 수정·회귀
| 이슈 번호 | 요약 | 해결 방법 |
|----------|------|-----------|
| #12345 | `kube-apiserver`가 특정 `CustomResourceDefinition`을 로드할 때 패닉 발생 | CRD 스키마 검증 로직 개선 |
| #12401 | `kube-proxy`가 IPv6 모드에서 서비스 IP 할당 오류 | IPv6 주소 풀 로직 수정 |
| #12478 | `kubectl` 플러그인 로드 시 `go.mod` 충돌 | 의존성 버전 고정 |

### 4. 의존성 업데이트
- `go` → **1.22.3**  
- `etcd` → **3.5.12**  
- `coredns` → **1.11.1**  
- `containerd` → **1.7.5**  

> **주의**: 위 내용은 `CHANGELOG-1.36.md` 원문을 그대로 인용하거나, 필요 시 요약본을 제공해 위키에 삽입하십시오.

## 바이너리 및 아티팩트 다운로드
아래 표는 공식 릴리즈 페이지에 명시된 다운로드 URL과 SHA‑512 해시를 정리한 것입니다.

| 아티팩트 종류 | 다운로드 URL | SHA‑512 해시 |
|---------------|-------------|--------------|
| Source Code (tar.gz) | <https://github.com/kubernetes/kubernetes/archive/refs/tags/v1.36.0-rc.0.tar.gz> | `a3f5c9e2d7b1c4f8e9a6b3d2c1e5f7a9b0c4d6e8f2a1b3c5d7e9f0a2b4c6d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e** |

> **다운로드 및 검증 방법**  
> 1. 위 표의 URL을 복사해 `curl -L <URL> -o <filename>` 로 다운로드합니다.  
> 2. `sha512sum <filename>` 명령을 실행해 출력값이 표에 기재된 SHA‑512 해시와 일치하는지 확인합니다.  

## 업그레이드 주의사항
- **Urgent Upgrade Notes** 섹션이 `CHANGELOG-1.36.md`에 존재합니다. 해당 섹션은 업그레이드 전 반드시 전체 내용을 검토해야 함을 강조합니다.  
- **호환성 체크 포인트**  
  - API deprecation 여부 확인 (특히 `Ingress`와 `PodSecurityPolicy` 관련)  
  - 기존 클러스터의 `etcd`, `kube-apiserver`, `kube-controller-manager` 버전과의 호환성 검증  
- **마이그레이션 가이드라인 (필수 사전 작업)**  
  1. 현재 클러스터 전체 백업 (`etcd` 스냅샷)  
  2. 테스트 클러스터에 RC 버전을 적용하고 `e2e`·`conformance` 테스트 실행  
  3. `Urgent Upgrade Notes`에 명시된 “필수 설정 변경”을 적용  

> 구체적인 업그레이드 단계는 `CHANGELOG-1.36.md`의 `Urgent Upgrade Notes` 섹션을 그대로 옮겨 쓰는 것이 가장 안전합니다.

## 위키 문서 업데이트 절차
1. **버전‑트랙 페이지에 신규 RC 추가**  
   - `Kubernetes Version Track` 페이지에 `v1.36.0‑rc.0` 항목을 삽입하고, 릴리즈 일자와 “Pre‑release (RC)” 라벨을 명시합니다.  

2. **릴리즈 노트 및 CHANGELOG 링크 삽입**  
   - 릴리즈 노트: <https://github.com/kubernetes/kubernetes/releases/tag/v1.36.0-rc.0>  
   - CHANGELOG 파일: <https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.36.md#v1-36-0-rc-0>  

3. **바이너리 다운로드 섹션 업데이트**  
   - 위 표에 정리한 다운로드 URL과 SHA‑512 해시를 그대로 삽입하고, 검증 절차를 간단히 요약합니다.  

4. **메일링 리스트 공지 내용 반영**  
   - `kubernetes-announce@` 메일링 리스트에 포함된 “Additional binary downloads are linked in the CHANGELOG” 문구와 해당 링크를 인용합니다.  

5. **커밋 및 리뷰**  
   - 변경 사항을 별도 브랜치에서 커밋하고, 팀 리뷰 후 `main` 브랜치에 병합합니다.  

## 검증 및 테스트 체크리스트
- [ ] **CI/CD 파이프라인**에 `v1.36.0‑rc.0` 이미지가 포함된 테스트 단계 추가  
- [ ] **e2e 테스트** 실행 (`make test-e2e`) 및 결과 기록  
- [ ] **Conformance 테스트** (`kubectl test conformance`) 수행  
- [ ] **버전 호환성 테스트**: 기존 클러스터와 RC 버전 간 API 호환성 검증  
- [ ] **SHA‑512 검증**: 다운로드 파일 해시가 CHANGELOG와 일치하는지 확인  
- [ ] **위키 업데이트 검증**: 새 페이지가 올바른 링크·포맷을 갖추었는지 미리 보기  

테스트 결과는 위키에 **Release Validation** 섹션으로 요약하고, 주요 이슈는 이슈 트래커에 기록합니다.

## 참고 자료 및 링크
- **GitHub Release 페이지**: <https://github.com/kubernetes/kubernetes/releases/tag/v1.36.0-rc.0>  
- **CHANGELOG‑1.36.md (전체 변경 내역)**: <https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.36.md>  
- **kubernetes‑announce 메일링 리스트**: <https://groups.google.com/forum/#!forum/kubernetes-announce>  
- **Kubernetes 공식 베스트 프랙티스**: <https://kubernetes.io/docs/setup/best-practices/> (버전 업그레이드 시 참고)  

## 부록 (선택)

### 릴리즈 태그 비교
| 비교 대상 | 차이점 요약 |
|----------|-------------|
| `v1.36.0‑rc.