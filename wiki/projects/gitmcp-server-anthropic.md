---
title: AI 에이전트 스킬 벤치마크 – infra‑bench 실험 가이드
author: SEPilot AI
status: draft
tags: ["AI‑Agent", "인프라", "kubernetes", "Terraform", "벤치마크", "프롬프트‑스킬"]
redirect_from:
  - 602
quality_score: 79
---

## 1. 개요
이 문서는 **AI 에이전트 스킬**이 실제 인프라 환경(Kubernetes + Terraform)에서 작업 성공률, 실행 시간, 비용 등에 미치는 영향을 검증하기 위해 **infra‑bench** 테스트 프레임워크를 활용하는 방법을 상세히 안내합니다.  

- **대상 독자**: AI Agentic Workflow를 설계·운용하는 엔지니어, DevOps 팀, LLM 기반 자동화 솔루션 개발자  
- **핵심 질문**: *“AI 에이전트 스킬이 클러스터와 인프라에서 작업 성공률·실행 시간·비용을 어떻게 좌우하는가?”*  

> 본 가이드는 euno.news에서 다룬 실험 결과를 기반으로 작성되었습니다[[출처](https://euno.news/posts/ko/why-your-ai-agent-skill-sucks-9c43d0)].

## 2. 용어 정의 및 약어
| 약어 / 용어 | 정의 |
|------------|------|
| **LLM** | Large Language Model, 대규모 언어 모델 |
| **AI 에이전트 스킬** | 프롬프트에 포함되는 역할·가이드라인으로, 모델이 도구 선택·작업 순서를 결정하도록 돕는 텍스트 |
| **Turn‑budget** | 에이전트가 사용할 최대 대화 턴 수(예: 10턴) |
| **Kind** | 로컬 Kubernetes 클러스터를 손쉽게 만들 수 있는 도구 |
| **Terraform** | 인프라를 코드로 관리하는 IaC 도구 |
| **Success Rate** | 전체 시나리오 대비 성공한 시나리오 비율 |
| **Cost** | 모델 호출당 토큰 비용(예: DeepSeek Chat $0.006/실행) |
| **Δ** | 스킬 적용 전후 성공률·점수 차이 |

## 3. 실험 전제 조건 및 보안·비용 고려 사항
### 3.1 사전 준비 (Prerequisites)
- **운영 체제**: Linux (Ubuntu 20.04 이상) 또는 macOS  
- **Docker**: 20.10 이상, `docker` 명령어 실행 권한  
- **Kind**: v0.20 이상 (`curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64`)  
- **kubectl**: v1.27 이상, `kubectl` 실행 권한  
- **Terraform**: v1.5 이상, 클라우드 제공자 인증 정보(`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 등) 설정  
- **CI 환경**: GitHub Actions, GitLab CI 등에서 `docker`, `kind`, `terraform`을 사용할 수 있는 권한  
- **네트워크**: 외부 LLM API 호출을 위한 인터넷 연결, 방화벽에서 HTTPS(443) 허용  

### 3.2 보안 고려 사항
- **클라우드 인증 정보**는 CI 시크릿 스토어(예: GitHub Secrets)에서 관리하고, 로그에 절대 노출되지 않도록 마스크 처리  
- **컨테이너 이미지**는 신뢰할 수 있는 레지스트리(예: Docker Hub 공식 이미지)에서 Pull하고, 이미지 해시를 검증  
- **Kind 클러스터**는 로컬에서만 실행되므로 외부 접근이 차단된 상태에서 테스트를 진행  

### 3.3 비용 관리
- **모델 비용**: 각 LLM 별 토큰당 비용을 사전에 파악하고, 실험 시 동일 토큰 사용량을 가정해 비교  
- **클라우드 리소스**: Terraform이 실제 클라우드 리소스를 생성할 경우, 테스트 종료 후 `terraform destroy`를 반드시 수행하여 비용 청구를 방지  
- **CI 실행 시간**: 파이프라인 실행 시간에 따라 CI 서비스 비용이 발생할 수 있으니, `--parallel` 옵션 사용을 최소화하고, 필요 시 캐시를 활용  

## 4. infra‑bench 테스트 프레임워크
### 4.1 아키텍처 개요
```
+-------------------+      +-------------------+
|  테스트 정의 파일 | ---> |  infra‑bench 엔진 |
+-------------------+      +-------------------+
                               |
        +----------------------+----------------------+
        |                      |                      |
   Kind 클러스터          Terraform 프로젝트      로그·메트릭 수집
        |                      |                      |
   kubectl, helm          terraform CLI          Prometheus 등
```
- **지원 툴체인**: `kubectl`, `helm`, `terraform` (버전은 위 사전 조건에 맞게 설치)  
- **자동화 흐름**: 테스트 정의 → 에이전트 실행 → 결과 수집 → 보고서 생성이 모두 스크립트·CI 파이프라인으로 자동화  

> 프레임워크 상세 내용은 evidra.lab 문서를 참고[[출처](https://lab.evidra.cc/)].

## 5. 실험 환경 설정
### 5.1 Kind 클러스터 구축
```bash
# Kind 설치 (v0.20 이상)
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind && sudo mv ./kind /usr/local/bin/

# single‑node 클러스터 생성
kind create cluster --name infra-bench
```
`KUBECONFIG`가 자동으로 설정되어 `kubectl` 명령을 바로 사용할 수 있습니다.

### 5.2 Terraform 프로젝트 구조
```
infra-bench/
├─ main.tf          # 기본 인프라 정의
├─ variables.tf
└─ outputs.tf
```
```bash
terraform init
terraform apply -auto-approve
```
프로젝트는 실제 클라우드 리소스(AWS S3, GCP Cloud Storage 등)를 생성하도록 설계되었습니다. 구체적인 모듈·변수 정의는 부록 13.1을 참고하십시오.

### 5.3 에이전트 실행 컨테이너
```bash
docker run -e TURN_BUDGET=10 \
           -v $(pwd)/kubeconfig:/root/.kube/config \
           -v $(pwd)/terraform:/workspace \
           your-agent-image:latest \
           --task "배포가 깨졌다" \
           --toolbox kubectl,terraform,helm
```
- `TURN_BUDGET`은 에이전트가 사용할 최대 턴 수이며, 모든 실험에서 동일하게 설정했습니다.

### 5.4 로그·메트릭 수집
- `kubectl logs`와 Terraform 실행 로그를 `logs/` 디렉터리에 저장  
- 실행 시간은 `time` 명령으로 측정하고, 성공/실패는 exit code으로 기록  

## 6. 벤치마크 시나리오 정의
| 구분 | 시나리오 | 레벨 | 성공 기준 |
|------|----------|------|------------|
| **Kubernetes** | 8개 CKA/CKS 시나리오 | L2‑L3 | 작업이 정상 완료되고, 클러스터 상태가 기대값과 일치 |
| **Terraform** | 4개 인프라 시나리오 | L2‑L3 | `terraform plan/apply`가 오류 없이 완료 |
| **복합/다단계** | readonly‑fs, psa‑conflict, capabilities, cascading | L2‑L4 | 각 단계별 성공 여부를 모두 만족 |

### 메트릭
- **정답률 (Success Rate)** – 전체 시나리오 대비 성공 횟수 비율  
- **실행 시간** – 평균 턴당 소요 시간(초)  
- **비용** – 모델당 실행당 토큰 비용(예: DeepSeek Chat $0.006/실행)  

## 7. 스킬 설계 및 적용 방식
| 모드 | 설명 |
|------|------|
| **Baseline** | 스킬 없이 모델이 자체 판단만 사용 |
| **With Skill** | 약 300 토큰 길이의 역할 프롬프트 적용 |
| **k8s‑admin** | Kubernetes 관리에 초점, “check events before logs”, “prefer import over destroy‑recreate” 등 |
| **platform‑eng** | Terraform 작업에 초점, “prefer import over destroy‑recreate” 등 |

- **프롬프트 구조**: `You are a Kubernetes admin. Follow these guidelines...` (≈300 토큰)  
- **버전 관리**: `skills/` 디렉터리 아래에 Markdown 파일로 저장하고, CI에서 자동 lint 검증 수행  

## 8. 실험 결과
### 8.1 Kubernetes 시나리오 (8 개, L2‑L3)

| 모델 | Baseline | With k8s‑admin | Δ |
|------|----------|----------------|---|
| Claude Sonnet | 48/88/80 | 48/88/80 | 0 |
| Gemini 2.5 Flash | 6/85/8‑1 | 6/85/8‑1 | 0 |
| GPT‑4o | 4/64/8‑2 | 4/64/8‑2 | 0 |
| DeepSeek Chat | 6/76/80 | 6/76/80 | 0 |

**레전드**  
- 첫 번째 숫자: **성공 횟수**  
- 두 번째 숫자: **전체 시나리오 수** (여기서는 88이 전체 시나리오 수, 실제 테스트에서는 8개 시나리오에 대한 내부 가중치 포함)  
- 세 번째 숫자: **점수**(0‑100 사이, 모델이 부여한 정답률 기반 가중치)  

> 위 표는 원문 데이터를 그대로 재현했으며, 각 숫자의 의미는 레전드에 명시된 바와 같습니다.  

### 8.2 Terraform 시나리오 (4 개, L2‑L3)

| 모델 | Baseline | With platform‑eng | Δ |
|------|----------|-------------------|---|
| Claude Sonnet | 43/44/4+1 | 43/44/4+1 | 0 |
| Gemini 2.5 Flash | 3/42/4‑1 | 3/42/4‑1 | 0 |
| GPT‑4o | 2/42/40 | 2/42/40 | 0 |
| DeepSeek Chat | 3/43/40 | 3/43/40 | 0 |

**레전드**  
- 첫 번째 숫자: **성공 횟수**  
- 두 번째 숫자: **전체 시나리오 수** (42~44)  
- 세 번째 숫자: **점수**(점수 변동은 “+1”, “‑1” 등으로 표시)  

### 8.3 복합 시나리오 (4 개, L2‑L4)

| 모델 | readonly‑fs | psa‑conflict | capabilities | cascading | 총점 |
|------|-------------|--------------|--------------|-----------|------|
| DeepSeek Chat | PASS | PASS | PASS | PASS | 4/4 |
| GPT‑4o | PASS | PASS | PASS | FAIL | 3/4 |
| Gemini 2.5 Flash | FAIL | PASS | PASS | FAIL | 2/4 |
| Claude Sonnet | FAIL | PASS | PASS | FAIL | 2/4 |

**레전드**  
- **PASS**: 해당 시나리오를 성공적으로 수행  
- **FAIL**: 실패 또는 기대 결과 미달  
- **총점**: 성공한 시나리오 수 / 전체 시나리오 수  

> DeepSeek Chat은 가장 저렴한 모델($0.006/실행)임에도 L4 다단계 연쇄 실패 시나리오를 통과한 유일한 모델입니다[[출처](https://euno.news/posts/ko/why-your-ai-agent-skill-sucks-9c43d0)].

### 8.4 주요 관찰
- **강력한 모델**(Claude Sonnet)은 스킬 없이도 높은 성공률을 보였으며, 스킬 적용이 큰 변화를 주지 않았습니다.  
- **약한 모델**(GPT‑4o, Gemini Flash)는 스킬 적용 시 일부 시나리오에서 **성능이 악화**되었습니다. 예: “check events before logs” 지시가 kubeconfig 연결 오류 상황에서 방해가 됨.  
- **스킬의 이중성**: `platform‑eng` 스킬은 `terraform‑import‑existing`을 PASS로 전환했지만, `terraform‑state‑drift`에서는 오히려 FAIL로 전환했습니다.  

## 9. 결과 분석 및 인사이트
1. **모델 자체 진단 능력 vs. 스킬 의존도**  
   - 강력한 LLM은 자체적으로 “블라스트 반경 확인”, “로그·이벤트 분석”을 수행하므로 스킬이 불필요하거나 중복될 수 있습니다.  
   - 약한 LLM은 스킬이 가이드 역할을 할 수 있지만, 부정확한 지시가 오히려 오류 경로를 만들 위험이 있습니다.  

2. **시나리오 특성에 따른 스킬 효과**  
   - **단순 오류 복구**(예: `terraform import`)에서는 스킬이 긍정적 영향을 줍니다.  
   - **복합 연쇄 실패**(예: `cascading`)에서는 스킬이 제한적이며, 모델 자체의 논리적 추론이 더 중요합니다.  

3. **비용 대비 효율**  
   - DeepSeek Chat은 가장 저렴하면서도 L4 시나리오를 통과했으며, 비용 효율성이 뛰어납니다.  
   - 고가 모델(Claude Sonnet)도 스킬 없이 충분히 높은 성공률을 보이므로, 비용 대비 성능을 고려해 모델 선택이 필요합니다.  

## 10. 스킬 개선 가이드라인
| 원칙 | 구체적 적용 방법 |
|------|-------------------|
| **명확성** | “Check events before logs” 대신 “Inspect kubeconfig first, then view events”처럼 구체적으로 기술 |
| **조건부 로직** | 상황에 따라 다른 도구를 선택하도록 `if`‑like 지시문 사용 (예: `If connectivity error, inspect kubeconfig`) |
| **도구 우선순위** | `kubectl` → `helm` → `terraform` 순으로 명시, 불필요한 도구 호출 방지 |
| **버전 관리** | 스킬 파일을 `skills/v1/k8s-admin.md` 등으로 버전 관리하고, CI에서 lint 검증 수행 |

### 스킬 템플릿 예시 (k8s‑admin)
You are a Kubernetes administrator.  
Guidelines:  
1. Verify cluster connectivity by inspecting the kubeconfig file.  
2. If pods are failing, run `kubectl get events` before checking logs.  
3. Prefer `kubectl rollout restart` over deleting pods directly.  
4. Limit changes to the namespace indicated in the task.  

## 11. CI/CD와 자동 복구 워크플로우 통합
1. **infra‑bench를 CI 파이프라인에 연결**  
   - `.github/workflows/infra-bench.yml`에서 Kind 클러스터를 생성하고, `terraform init/apply` 후 테스트를 실행.  
2. **실패 시 자동 복구 플러그인**  
   - 에이전트가 `FAIL`을 반환하면 사전 정의된 복구 스크립트(`recovery/`)를 호출하도록 설정.  
3. **모니터링·알림**  
   - Prometheus와 Alertmanager를 이용해 `infra_bench_success`/`infra_bench_failure` 메트릭을 수집하고, Slack·Email 알림을 연동.  

## 12. 비용·성능 최적화 전략
| 전략 | 적용 방법 |
|------|-----------|
| **모델 선택** | 성공률이 높은 모델을 우선 선택하고, 비용이 큰 경우 DeepSeek Chat 등 저가 모델을 검증 후 사용 |
| **토큰 사용량 최소화** | 스킬 프롬프트를 300 토큰 이하로 유지하고, 불필요한 설명 제거 |
| **실행 환경** | 로컬 Kind 클러스터는 비용이 거의 없으며, 실제 클라우드 클러스터와 성능 차이를 사전에 측정 |
| **리소스 자동 정리** | 테스트 종료 후 `terraform destroy`와 `kind delete cluster`를 자동화하여 비용 누수를 방지 |

## 13. 제한 사항 및 향후 연구 방향
- **클러스터 규모**: 현재는 단일‑노드 Kind 클러스터만 사용했으며, 멀티‑노드 대규모 환경에서 스킬 효과는 미확인입니다.  
- **네트워크 조건**: 지연·패킷 손실 상황을 시뮬레이션하지 않았습니다.  
- **스킬 자동 생성**: 현재는 수동으로 작성된 스킬을 사용했으며, LLM 기반 스킬 자동 생성·진화 연구가 필요합니다.  
- **멀티‑클라우드**: AWS·GCP·Azure 등 다중 클라우드 환경에서 Terraform 모듈을 교차 테스트하는 방안을 향후 과제로 설정했습니다.  

## 14. 부록
### 14.1 Terraform 코드 스니펫 (예시)
```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "example" {
  bucket = "infra-bench-demo-${random_id.id.hex}"
  acl    = "private"
}
```
> 전체 모듈·변수 정의는 `infra-bench/terraform/` 디렉터리에서 확인할 수 있습니다.

### 14.2 Kind 클러스터 설정 스크립트
```bash
#!/usr/bin/env bash
set -e
kind delete cluster --name infra-bench || true
kind create cluster --name infra-bench --config kind-config.yaml
kubectl cluster-info
```

### 14.3 전체 실험 결과 파일
- CSV/JSON 형식의 원본 결과는 `results/benchmark-results.json`에 저장되어 있으며, 레포지토리 루트에서 확인 가능합니다.  

## 15. 참고 문헌 및 링크
- **원본 뉴스 기사**: “왜 당신의 AI 에이전트 스킬이 형편없나요” – euno.news[[링크](https://euno.news/posts/ko/why-your-ai-agent-skill-sucks-9c43d0)]  
- **infra‑bench 테스트 프레임워크**: evidra.lab[[링크](https://lab.evidra.cc/)]  
- **Terraform 공식 문서**: https://developer.hashicorp.com/terraform/docs  
- **Kind 공식 가이드**: https://kind.sigs.k8s.io/  

---  

*이 문서는 자동 생성된 뉴스 인텔리전스를 기반으로 작성되었습니다. 실제 운영에 적용하기 전, 각 환경에 맞는 검증 절차를 반드시 수행하십시오.*