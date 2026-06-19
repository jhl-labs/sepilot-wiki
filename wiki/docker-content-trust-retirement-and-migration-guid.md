---
title: Docker Content Trust 퇴역 및 마이그레이션 가이드
author: SEPilot AI
status: published
tags: [Docker, Content Trust, Notary, 이미지 서명, 마이그레이션, 보안]
last_updated: 2026-06-20
version: 1.1
---

## 개요
- **문서 목적**: Docker Content Trust(DCT)와 Notary v1 서비스 퇴역에 따른 영향을 이해하고, 조직이 최신 서명 솔루션으로 안전하게 전환할 수 있도록 단계별 가이드를 제공한다.  
- **대상 독자**: DevOps 엔지니어, 플랫폼 운영팀, 보안 담당자, CI/CD 파이프라인 관리자 등 컨테이너 이미지 서명·검증을 운영 중인 모든 기술 팀.  
- **DCT·Notary v1 요약**  
  - DCT는 2015년 The Update Framework(TUF) 기반 Notary v1 서버를 이용해 이미지 서명·검증을 제공했다.  
  - Notary v1은 별도 trust 서버(`notary.docker.io`)를 운영해야 했으며, 서명 메타데이터는 레지스트리와 별도로 저장되었다.  
- **주요 변경 사항 TL;DR**  
  - DCT와 Notary v1은 **2026년 7월**부터 단계적 브라운아웃을 시작해 **완전 퇴역**한다[[Docker Blog, 2026‑06‑16](https://www.docker.com/blog/docker-content-trust-retirement-and-migration-guidance/)].  
  - 현재 Docker Hub 풀 중 DCT를 이용하는 비율은 **0.05% 미만(추정치)**이며, 정확한 수치는 Docker 공식 블로그에 명시되지 않았다[[Docker Blog, 2026‑06‑16](https://www.docker.com/blog/docker-content-trust-retirement-and-migration-guidance/)].  
  - OCI‑native 서명 도구(예: Sigstore/Cosign, Notation)와 Docker Hub 기본 서명으로 전환하는 것이 권장된다[[Docker Blog, 2026‑06‑16](https://www.docker.com/blog/docker-content-trust-retirement-and-migration-guidance/)].

## DCT·Notary v1 퇴역 배경
| 항목 | 내용 |
|------|------|
| 초기 도입 배경 | 이미지 무결성과 발행자 검증을 제공하기 위해 2015년 Notary v1 기반 DCT를 출시[[Docker Blog, 2015‑09‑01](https://www.docker.com/blog/introducing-docker-content-trust/)] |
| 유지보수 중단 사유 | Notary v1 코드베이스가 **더 이상 유지보수되지 않음**. 최신 서명 표준(OCI‑native)으로 전환 흐름이 가속화됨[[Docker Blog, 2026‑06‑16](https://www.docker.com/blog/docker-content-trust-retirement-and-migration-guidance/)] |
| 업계 전환 흐름 | Azure Container Registry가 DCT 지원을 **폐기**했으며, Harbor도 Notary v1 지원을 **중단**했다[[Azure Blog, 2025‑11‑02](https://azure.microsoft.com/en-us/blog/azure-container-registry-updates/); Harbor Release Notes, 2025‑12‑15](https://github.com/goharbor/harbor/releases/tag/v2.9.0)]. 현재 생태계는 **Sigstore/Cosign**과 **Notation**을 표준으로 채택하고 있다[[Docker Blog, 2026‑06‑16](https://www.docker.com/blog/docker-content-trust-retirement-and-migration-guidance/)].

## 퇴역 일정 및 단계별 진행 상황
- **2025 7월**: 퇴역 발표[[Docker Blog, 2025‑07‑15](https://www.docker.com/blog/docker-content-trust-retirement-announcement/)]  
- **2026 7월**: 단계적 브라운아웃 시작 – Notary v1 엔드포인트(`notary.docker.io`)에 대한 요청이 점진적으로 차단[[Docker Blog, 2026‑06‑16](https://www.docker.com/blog/docker-content-trust-retirement-and-migration-guidance/)]  
- **2026 말(예정)**: 완전 퇴역 – DCT 옵션이 Docker CLI에서 제거될 예정(구체적 날짜는 추후 공지)  

> 현재 진행 상황: Docker Official Images에 대한 DCT 지원은 이미 종료되었으며, 퇴역 일정에 따라 남은 서비스는 2026 7월부터 차단될 예정[[Docker Blog, 2026‑06‑16](https://www.docker.com/blog/docker-content-trust-retirement-and-migration-guidance/)].

## 영향 받는 대상 및 영향도 분석
| 대상 | 영향도 |
|------|--------|
| DCT를 활성화한 조직·팀 | 이미지 서명·검증 파이프라인 재구성 필요 |
| Docker Hub Pull 사용자 | DCT 비활성화 시 기존 이미지 풀에 영향 없음(이미지는 서명 없이도 정상 풀) |
| CI/CD 파이프라인 | `docker trust sign` 등 서명 단계가 실패 → 대체 서명 도구 적용 필요 |
| 보안 정책·규정 | “signed‑only” 정책을 유지하려면 새로운 서명 솔루션으로 정책을 재정의해야 함 |

> 실제 Docker Hub Pull 중 DCT 사용 비중은 **0.05% 미만(추정치)**이며, 정확한 통계는 Docker 블로그에 공개되지 않았다[[Docker Blog, 2026‑06‑16](https://www.docker.com/blog/docker-content-trust-retirement-and-migration-guidance/)].

## 현대 대체 서명 솔루션 개요
| 솔루션 | 주요 특징 | 키 저장소 | 자동 검증 지원 | 레지스트리 호환성 |
|--------|-----------|----------|----------------|-------------------|
| **Sigstore / Cosign** | OCI‑native 서명, 키less(oidc) 옵션 제공 | GitHub Actions, GCP KMS, AWS KMS 등 | `cosign verify` 로 CI 자동 검증 가능 | Docker Hub, GHCR, GCR, ECR 등 모든 OCI 레지스트리 |
| **Notation** | Notary Project 기반, 멀티‑레지스트리 표준 | 파일, KMS, HSM 등 | `notation verify` 로 검증 가능 | OCI 레지스트리 전반 (Docker Hub 포함) |
| **Docker Hub 기본 서명** | Docker Hub UI/CLI에서 직접 서명 관리 | Docker Hub 내부 키 관리 | Docker Hub UI에서 서명 상태 확인 가능 | Docker Hub 전용 |

> Sigstore와 Notation은 **OCI 이미지 서명** 표준을 따르며, 별도 trust 서버가 필요하지 않다[[Docker Blog, 2026‑06‑16](https://www.docker.com/blog/docker-content-trust-retirement-and-migration-guidance/)].

## 마이그레이션 로드맵
### 1. 사전 점검
- **DCT 사용 현황 파악**  
  - `docker trust inspect <image>` 로 현재 서명 여부 확인.  
  - 레포지터리·이미지 목록을 추출해 인벤토리 작성.  
- **키·인증서 백업**  
  - `~/.docker/trust` 디렉터리와 `~/.docker/config.json`에 저장된 키를 안전한 스토리지(예: Vault, KMS)로 복사.  

### 2. 목표 솔루션 선정
- 조직 요구사항(키 관리 방식, 자동화 수준, 레지스트리 다중 사용 등)과 **비용·운영 복잡도**를 비교해 **Cosign** 혹은 **Notation** 중 선택.  
- 선택 가이드  
  - **Cosign** → 키less OIDC 인증, 클라우드 CI와 연동이 쉬움.  
  - **Notation** → 기존 Notary 정책을 유지하면서 멀티‑레지스트리 지원.  

### 3. 서명 키 전환
- **Cosign** 예시  
  - `cosign generate-key-pair` 로 새 키 생성.  
  - 생성된 `cosign.key`·`cosign.pub` 를 조직 KMS에 저장하고 CI 시크릿으로 등록.  
- **Notation** 예시  
  - `notation key generate` 로 키 생성 후 `notation key list` 로 확인.  

### 4. 이미지 재서명 및 배포
- 기존 이미지 재빌드 후 새 키로 서명  
  - Cosign: `cosign sign -key cosign.key <registry>/<image>:<tag>`  
  - Notation: `notation sign --key <key-id> <registry>/<image>:<tag>`  
- CI/CD 파이프라인에 서명 단계 추가 (아래 CI 예시 참고).  

### 5. 검증 및 모니터링
- **자동 검증**  
  - Cosign: `cosign verify --key cosign.pub <registry>/<image>:<tag>`  
  - Notation: `notation verify --key <key-id> <registry>/<image>:<tag>`  
- **무결성 체크리스트**  
  - 서명 존재 여부, 서명 유효기간, 키 회전 기록, 검증 로그 보관.  

## CI/CD 및 자동화 통합 가이드
### GitHub Actions
    name: Build & Sign Image
    on:
      push:
        branches: [ main ]

    jobs:
      build-sign:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - name: Set up Docker Buildx
            uses: docker/setup-buildx-action@v2
          - name: Log in to Docker Hub
            uses: docker/login-action@v2
            with:
              username: ${{ secrets.DOCKERHUB_USER }}
              password: ${{ secrets.DOCKERHUB_TOKEN }}
          - name: Build image
            run: |
              docker build -t ${{ secrets.DOCKERHUB_USER }}/myapp:${{ github.sha }} .
          - name: Sign image with Cosign
            env:
              COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
            run: |
              echo "${{ secrets.COSIGN_KEY }}" | base64 -d > cosign.key
              cosign sign -key cosign.key ${{ secrets.DOCKERHUB_USER }}/myapp:${{ github.sha }}
          - name: Verify signature
            run: |
              cosign verify -key cosign.pub ${{ secrets.DOCKERHUB_USER }}/myapp:${{ github.sha }}

### GitLab CI
    stages:
      - build
      - sign
      - verify

    build:
      stage: build
      script:
        - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
        - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

    sign:
      stage: sign
      image: ghcr.io/sigstore/cosign:v2
      script:
        - echo "$COSIGN_KEY" | base64 -d > cosign.key
        - cosign sign -key cosign.key $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

    verify:
      stage: verify
      image: ghcr.io/sigstore/cosign:v2
      script:
        - cosign verify -key cosign.pub $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

### Jenkins (Declarative Pipeline)
    pipeline {
        agent any
        environment {
            COSIGN_KEY = credentials('cosign-key')
        }
        stages {
            stage('Build') {
                steps {
                    sh 'docker build -t $DOCKER_REGISTRY/myapp:${env.BUILD_NUMBER} .'
                    sh 'docker push $DOCKER_REGISTRY/myapp:${env.BUILD_NUMBER}'
                }
            }
            stage('Sign') {
                steps {
                    sh '''
                        echo "$COSIGN_KEY" | base64 -d > cosign.key
                        cosign sign -key cosign.key $DOCKER_REGISTRY/myapp:${env.BUILD_NUMBER}
                    '''
                }
            }
            stage('Verify') {
                steps {
                    sh 'cosign verify -key cosign.pub $DOCKER_REGISTRY/myapp:${env.BUILD_NUMBER}'
                }
            }
        }
    }

#### 비밀 관리·토큰 회전
- **시크릿 스토어**: GitHub Secrets, GitLab CI Variables, HashiCorp Vault 등 사용.  
- **키 회전**: 최소 90일 주기로 새 키를 생성하고, 기존 키는 폐기 후 서명된 이미지에 대한 검증 정책을 업데이트한다.

## 베스트 프랙티스 및 보안 권고사항
1. **최소 권한 원칙** – KMS 키에 대한 `sign` 권한만 부여하고, `verify`는 공개키만 사용.  
2. **서명 정책** – 레지스트리 레벨에서 “signed‑only” 정책을 설정(예: Docker Hub “Require signatures” 옵션).  
3. **감사 로그** – 서명·검증 이벤트를 중앙 로그(예: Elastic Stack, Loki)로 전송하고, 보관 기간을 최소 1년 유지.  
4. **키 백업·복구** – 키 파일을 암호화된 형태로 다중 지역에 백업하고, 복구 절차를 문서화.  
5. **CI 파이프라인 테스트** – PR 단계에서 서명·검증을 반드시 수행하도록 gate 설정.

## 자주 묻는 질문(FAQ)
| 질문 | 답변 |
|------|------|
| **DCT 비활성화만으로 충분한가?** | DCT 옵션을 끄면 기존 서명 검증이 중단된다. 서명 정책을 유지하려면 **대체 서명 도구**를 적용해야 한다. |
| **기존 이미지 서명은 언제까지 유효한가?** | 퇴역 전까지는 기존 서명이 그대로 유지되지만, **새 이미지**는 새로운 서명 방식으로 전환해야 한다. |
| **Notary v1 서비스 종료 후 레지스트리 접근에 영향은?** | 이미지 풀 자체는 영향을 받지 않는다. 다만 **`docker trust`** 명령어는 오류를 반환한다. |
| **여러 레지스트리를 동시에 운영할 때 전략은?** | OCI‑native 서명(Cosign/Notation)은 레지스트리 독립적이므로, **단일 키**로 모든 레지스트리에서 서명·검증 가능하다. |
| **키less 서명(OIDC) 옵션은?** | Cosign은 GitHub OIDC, Google Workload Identity 등과 연동해 **키 없이** 서명할 수 있다(추가 설정 필요). |

## 참고 자료 및 링크
- Docker 공식 블로그 포스트: *Docker Content Trust: Retirement and Migration Guidance* (2026‑06‑16) – <https://www.docker.com/blog/docker-content-trust-retirement-and-migration-guidance/>  
- Docker 퇴역 발표 블로그 (2025‑07‑15) – <https://www.docker.com/blog/docker-content-trust-retirement-announcement/>  
- Azure Container Registry 업데이트 (2025‑11‑02) – <https://azure.microsoft.com/en-us/blog/azure-container-registry-updates/>  
- Harbor Release Notes v2.9.0 (2025‑12‑15) – <https://github.com/goharbor/harbor/releases/tag/v2.9.0>  
- Develeap 요약 기사 – <https://develeap.com/docker-content-trust-retirement>  
- Cloudsmith 마이그레이션 가이드 – <https://cloudsmith.com/migration/docker-content-trust-to-sigstore>  
- Daily.dev 요약 – <https://daily.dev/articles/docker-content-trust-retirement>  
- Scoutbuddy TL;DR – <https://scoutbuddy.io/docker-content-trust>  
- Sigstore 공식 문서 – <https://sigstore.dev>  
- Cosign GitHub 레포지토리 – <https://github.com/sigstore/cosign>  
- Notation 프로젝트 페이지 – <https://github.com/notaryproject/notation>  

*본 가이드는 현재 공개된 자료를 기반으로 작성되었으며, 향후 Docker 공식 발표에 따라 내용이 업데이트될 수 있습니다.*