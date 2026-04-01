---
title: Node.js 백엔드와 AWS 인프라를 위한 Shared Workflows 표준 가이드
author: SEPilot AI
status: draft
tags: ["ci/cd", "Shared Workflows", "Node.js", "AWS", "Terraform", "ECS", "ECR"]
redirect_from:
  - 342
quality_score: 82
---

## 1. 소개
이 문서는 **Node.js 백엔드**와 **AWS** 인프라를 대상으로 하는 **공유 워크플로우(Shared Workflows)** 를 정의하고, 조직 내 여러 레포지토리·팀이 재사용할 수 있도록 표준화하는 방법을 안내합니다.  
대상 독자는 다음과 같습니다.

- 백엔드 개발자 및 DevOps 엔지니어  
- GitHub Actions 를 사용해 CI/CD 파이프라인을 구축하려는 팀  
- Terraform 으로 인프라를 코드화(IaC) 하는 담당자  

공유 워크플로우를 도입하면 **중복 감소**, **보안·품질 일관성 확보**, **유지보수 비용 절감** 효과를 기대할 수 있습니다. 본 가이드는 **Node.js**, **GitHub Actions**, **AWS ECS/ECR**, **Terraform** 을 핵심 스택으로 사용합니다.

## 2. 배경 및 동기
다중 레포지토리·다중 팀 환경에서는 각 프로젝트가 자체적으로 **lint → test → build → deploy** 파이프라인을 구현합니다. 이는 다음과 같은 문제를 야기합니다.

| 문제 | 영향 |
|------|------|
| 파이프라인 중복 | 동일 로직을 여러 번 유지·업데이트해야 함 |
| 보안·품질 일관성 부족 | 팀마다 다른 검사 도구·버전 사용 |
| 높은 유지보수 비용 | 파이프라인 변경 시 모든 레포지토리 수정 필요 |

위와 같은 상황을 해결하고자 **재사용 가능한 워크플로우 세트** 를 정의해 **소비자 레포지토리** 가 최소 설정만으로 표준 파이프라인을 사용할 수 있도록 했습니다[[euno.news](https://euno.news/posts/ko/shared-workflows-minha-experincia-definindo-pipeli-2dc274)].

## 3. 워크플로우 아키텍처 개요
### 3.1 `workflow_call` 기반 재사용 구조
GitHub Actions 의 **`on: workflow_call`** 을 활용해 워크플로우를 **라이브러리 형태** 로 제공하고, 소비자는 `uses: org/shared-workflows@v1` 형태로 호출합니다. 중앙 레포지토리에서 버전(`@v1`, `@v2`)을 관리하면 **롤백** 및 **업그레이드** 가 용이합니다.

### 3.2 역할 분리
| 워크플로우 | 주요 역할 |
|------------|-----------|
| `shared-backend-ci.yml` | Lint, install, cache, unit/integration test, security scan (`yarn audit`) |
| `shared-terraform-ci.yml` | Terraform `fmt`, `init`, `plan` (Infra‑CI) |
| `shared-backend-deploy-ecs.yml` | Docker 이미지 빌드·푸시(ECR), Blue/Green 배포(ECS) |
| `shared-release.yml` | Release 브랜치 자동 생성, `main`에 PR 생성 |

각 워크플로우는 **독립적으로** 호출 가능하며, 필요에 따라 **래퍼(Wrapper)** 워크플로우가 순차 호출을 조정합니다.

## 4. Shared CI 워크플로우
### 4.1 주요 잡
- **lint** – `eslint` 실행  
- **install** – `yarn install` (캐시 활용)  
- **cache** – `actions/cache` 로 `node_modules` 및 `yarn cache` 저장  
- **test** – 단위·통합 테스트 실행 (`jest` 등)  
- **security scan** – `yarn audit` 수행 (옵션)

### 4.2 입력 파라미터
| 파라미터 | 설명 | 기본값 |
|----------|------|--------|
| `working_directory` | 프로젝트 루트 경로 | `.` |
| `node_version` | 사용 Node.js 버전 | `20` |
| `enable_security_scan` | 보안 스캔 활성화 여부 | `false` |

### 4.3 최소 권한 설정
```yaml
permissions:
  contents: read   # lint/test 단계
  actions: read   # 워크플로우 호출
```
시크릿은 `GITHUB_TOKEN` 만 필요합니다.

### 4.4 사용 예시
```yaml
jobs:
  ci:
    uses: ./.github/workflows/shared-backend-ci.yml
    with:
      working_directory: app
      node_version: '20'
      enable_security_scan: true
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 5. Shared Infra‑CI (Terraform) 워크플로우
### 5.1 단계
1. `terraform fmt` – 코드 포맷 검증  
2. `terraform init` – 백엔드 설정(예: S3)  
3. `terraform plan` – 변경 내용 미리 보기  

### 5.2 파라미터
| 파라미터 | 설명 |
|----------|------|
| `tf_backend_bucket` | Terraform 상태를 저장할 S3 버킷 |
| `tf_var_file` | 환경별 변수 파일 경로 |

### 5.3 시크릿 관리
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` – 최소 권한 IAM 사용자(읽기/쓰기 S3, Terraform 실행)  

### 5.4 사용 예시
```yaml
jobs:
  infra-ci:
    uses: ./.github/workflows/shared-terraform-ci.yml
    with:
      tf_backend_bucket: my-staging-state
      tf_var_file: envs/staging/variables.tfvars
    secrets:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 6. Shared CD 워크플로우 (ECR·ECS 배포)
### 6.1 이미지 빌드·푸시
- Dockerfile 기반 이미지 빌드  
- `aws ecr get-login-password` 로 인증 후 ECR에 푸시  

### 6.2 Blue/Green 배포
- ECS 서비스 업데이트 시 **새 태스크 정의** 를 등록하고, **배포 전략**(Blue/Green) 을 적용  
- 배포 성공 시 트래픽 전환, 실패 시 자동 롤백  

### 6.3 파라미터
| 파라미터 | 설명 |
|----------|------|
| `environment` | `staging` / `production` 등 배포 대상 |
| `image_tag` | Docker 이미지 태그 (예: `sha-${{ github.sha }}`) |

### 6.4 사용 예시
```yaml
jobs:
  deploy:
    uses: ./.github/workflows/shared-backend-deploy-ecs.yml
    with:
      environment: staging
      image_tag: sha-${{ github.sha }}
    secrets:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 7. Release 자동화 워크플로우
### 7.1 흐름
1. **Release 브랜치** 자동 생성 (`release/vX.Y.Z`)  
2. `main` 에 **Pull Request** 생성 및 자동 리뷰  
3. 태깅 및 **CHANGELOG** 자동 생성 (옵션)  

### 7.2 파라미터
| 파라미터 | 설명 |
|----------|------|
| `version` | Semantic Version (예: `1.2.3`) |
| `changelog` | 자동 생성 여부 (`true/false`) |

### 7.3 사용 예시
```yaml
jobs:
  release:
    uses: ./.github/workflows/shared-release.yml
    with:
      version: 1.2.3
      changelog: true
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 8. 워크플로우 래퍼(Wrapper) 패턴
### 8.1 순차 호출 예시
```yaml
jobs:
  ci:
    uses: ./.github/workflows/shared-backend-ci.yml
    ...

  deploy:
    needs: ci
    uses: ./.github/workflows/shared-backend-deploy-ecs.yml
    ...

  promote:
    needs: deploy
    if: ${{ needs.deploy.result == 'success' }}
    uses: ./.github/workflows/shared-release.yml
    ...
```
`needs` 와 `if` 조건을 활용해 **CI → Deploy → Release** 순서를 보장합니다.

### 8.2 중앙 레포지토리 태깅
소비자는 `uses: org/shared-workflows@v1` 형태로 호출하며, **버전 태그**(`@v1`) 를 통해 롤백 및 업데이트를 관리합니다.

## 9. 파라미터화 및 다중 프로젝트 지원
- **모노레포**: `app_path`, `image_tag`, `environment` 등 공통 파라미터를 워크플로우 입력으로 전달  
- **다중 앱**: 각 앱 별 `working_directory` 를 지정해 동일 워크플로우 재사용 가능  

## 10. 보안 및 최소 권한 원칙
| 작업 | 권한 |
|------|------|
| lint/test | `contents: read` |
| infra‑ci | `contents: read`, `id-token: write` (AWS OIDC) |
| deploy/release | `contents: write`, `pull_requests: write` (필요 시) |

시크릿은 **GitHub Secrets** 혹은 **AWS OIDC** 를 통해 전달하며, **`actionlint`**, **`checkov`** 로 권한·정책 검증을 자동화합니다[[euno.news](https://euno.news/posts/ko/shared-workflows-minha-experincia-definindo-pipeli-2dc274)].

## 11. 테스트·검증 도구와 CI 파이프라인
- **`act`** : 로컬에서 GitHub Actions 워크플로우 시뮬레이션  
- **`shellcheck`** : 쉘 스크립트 정적 분석  
- **`checkov`** : Terraform 보안·정책 검사  
- **`actionlint`** : 워크플로우 구문 및 권한 검증  

이 도구들을 **PR 검증 단계**에 포함시켜 회귀와 보안 이슈를 사전에 차단합니다.

## 12. 문서화·채택 가이드
1. **README 템플릿**에 워크플로우 호출 예시와 필수 시크릿 목록을 명시  
2. 시크릿·변수 명명 규칙 (`AWS_ACCESS_KEY_ID`, `ECR_REPO_NAME` 등) 을 표준화  
3. **파일럿 프로젝트**(예: `service-a`) 를 선정해 초기 적용 후 피드백 수집  

## 13. 마이그레이션 가이드
| 단계 | 내용 |
|------|------|
| 1️⃣ 기존 파이프라인 분석 | 현재 CI/CD 스크립트와 사용 도구 목록 파악 |
| 2️⃣ 공유 워크플로우 매핑 | 각 단계가 어느 공유 워크플로우에 대응되는지 매핑 |
| 3️⃣ 워크플로우 호출 추가 | 기존 `.github/workflows` 파일에 `uses:` 로 교체 |
| 4️⃣ 검증 | `act` 로 로컬 테스트 후 PR 머지 전 CI 통과 확인 |
| 5️⃣ 롤백 플랜 | 문제 발생 시 기존 스크립트로 되돌릴 수 있는 브랜치 유지 |

## 14. 베스트 프랙티스와 운영 팁
- **버전 관리**: `v1.0.0`, `v1.1.0` 등 **SemVer** 로 태깅하고 `@v1` 로 고정 사용  
- **업데이트 알림**: 워크플로우 레포에 **Release** 를 만들면 구독자에게 자동 알림  
- **모니터링**: 배포 성공/실패를 **AWS CloudWatch** 와 **GitHub Checks** 로 연동  
- **문제 발생 시**: `actions/checkout` 의 `fetch-depth: 0` 옵션을 사용해 전체 히스토리를 확보하면 롤백이 용이  

## 15. FAQ
**Q1. 파라미터를 지정하지 않으면 어떻게 되나요?**  
- 각 워크플로우는 `with` 에 정의된 기본값을 사용합니다(예: `node_version: '20'`).  

**Q2. `permissions` 를 별도로 지정하지 않으면 어떤 권한이 부여되나요?**  
- 기본적으로 `contents: read` 가 적용됩니다. 보안이 필요한 단계는 명시적으로 권한을 확대해야 합니다.  

**Q3. 워크플로우 실행 중 `permission denied` 오류가 발생합니다.**  
- 해당 잡에 필요한 권한(`contents: write`, `pull_requests: write` 등)이 `permissions` 섹션에 선언되었는지 확인하고, 시크릿이 올바르게 전달됐는지 점검합니다.  

## 16. 참고 자료·링크
- **Shared Workflows 경험 블로그** – euno.news (원문) [[euno.news](https://euno.news/posts/ko/shared-workflows-minha-experincia-definindo-pipeli-2dc274)]  
- **GitHub Actions 공식 문서** – `workflow_call` 사용법 <https://docs.github.com/en/actions/using-workflows/reusing-workflows>  
- **AWS Well‑Architected Framework** – 보안·운영 모범 사례 [[AWS Well‑Architected PDF](https://docs.aws.amazon.com/ko_kr/wellarchitected/2023-04-10/framework/wellarchitected-framework-2023-04-10.pdf)]  
- **actionlint** – 워크플로우 정적 검사 <https://github.com/rhysd/actionlint>  
- **checkov** – IaC 보안 검사 <https://github.com/bridgecrewio/checkov>  

--- 

*이 문서는 자동 감지된 뉴스 인텔리전스를 기반으로 작성되었습니다.*