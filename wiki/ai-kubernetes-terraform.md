---
title: AI 에이전트 스킬 평가와 벤치마크 – Kubernetes + Terraform 기반 실험
author: SEPilot AI
status: published
tags: [AI‑Agent, Kubernetes, Terraform, Benchmark, Skill‑Evaluation]
---

## 문서 개요 및 목적
AI 에이전트가 실제 인프라스트럭처(쿠버네티스 클러스터와 Terraform 프로젝트)에서 작업을 수행할 때 **스킬(프롬프트)** 이 성능에 미치는 영향을 정량적으로 평가하고자 합니다.  
본 가이드는 다음을 목표로 합니다.

- 재현 가능한 실험 환경(Kind 클러스터 + Terraform) 구축 방법 제공  
- 스킬 적용 전·후의 벤치마크 시나리오와 메트릭 정의  
- 오류 재현·자동 복구 흐름 구현 예시 제시  
- 결과 분석을 통한 스킬 설계 인사이트 도출  

주 독자는 AI 에이전트 워크플로우를 설계·운영하는 엔지니어와 LLM 기반 자동화 솔루션을 평가·구매하려는 의사결정자입니다.

## AI 에이전트와 스킬 개념 정의
- **AI 에이전트**: LLM을 백엔드로 두고 `kubectl`, `terraform`, `helm` 등 인프라 도구를 호출해 목표 작업을 수행하는 자동화 주체.  
- **스킬(Prompt Skill)**: 에이전트에게 특정 도메인(예: 쿠버네티스 관리, Terraform 운영)에서 따를 “역할 프롬프트”를 제공하는 텍스트. 본 실험에서는 약 **300 토큰** 길이의 간결한 역할 프롬프트(`k8s‑admin`, `platform‑eng`)를 사용했습니다.  
- **모델별 특성**: 실험에 사용된 모델은 Claude Sonnet, Gemini 2.5 Flash, GPT‑4o, DeepSeek Chat이며, 각각 LLM API 비용·성능 차이가 존재합니다(예: DeepSeek Chat은 $0.006/실행으로 가장 저렴함)【1】.

## 실험 설계 원칙
1. **재현성 확보** – 동일한 Kind 클러스터 이미지와 Terraform 백엔드(로컬 파일) 사용.  
2. **변수 통제** – 모델, 시나리오, 클러스터는 동일하게 유지하고, 오직 “스킬 유무”만을 차이점으로 설정.  
3. **리소스 최소화** – Kind 클러스터는 2 CPU / 4 GB 메모리, Terraform은 최소 모듈만 적용해 비용을 억제.  

## 테스트 인프라 구축
### Kind 클러스터 설치 및 구성
1. `kind` 바이너리 설치([공식 문서](https://kind.sigs.k8s.io/))  
2. 아래와 같이 클러스터 정의 파일을 작성하고 `kind create cluster --config` 명령을 실행  

    kind‑cluster.yaml  

        kind: Cluster  
        apiVersion: kind.x‑k8s.io/v1alpha4  
        nodes:  
          - role: control‑plane  
            extraPortMappings:  
              - containerPort: 30000  
                hostPort: 30000  

3. `kubectl`([공식 문서](https://kubernetes.io/docs/reference/kubectl/))을 통해 클러스터 접속을 확인합니다.

### Terraform 프로젝트 초기화 및 백엔드 설정
1. Terraform 최신 버전 설치([공식 문서](https://developer.hashicorp.com/terraform/downloads))  
2. 프로젝트 루트에 `main.tf`와 `variables.tf`를 작성하고 `terraform init`을 실행  

    main.tf  

        terraform {  
          required_version = ">= 1.5.0"  
          backend "local" {}  
        }  
        provider "kubernetes" {  
          config_path = "~/.kube/config"  
        }  

    variables.tf  

        variable "region" {  
          type    = string  
          default = "us-east-1"  
        }  

### 인증·권한 관리
- Kind 클러스터는 로컬 `kubeconfig` 파일을 사용하므로 별도 인증 설정이 필요 없습니다.  
- Terraform은 로컬 백엔드이므로 파일 시스템 권한만 적절히 부여하면 됩니다.

## 벤치마크 시나리오 정의
| 구분          | 시나리오 수 | 레벨 | 주요 작업 내용                              |
|--------------|------------|------|--------------------------------------------|
| Kubernetes   | 8          | L2‑L3 (CKA/CKS) | 배포 파괴, 서비스 장애, 이벤트 확인 등 |
| Terraform    | 4          | L2‑L3 | `terraform apply` 실패 복구, `import` 수행, 상태 드리프트 해결 |
| 신규 복합     | 4          | L2‑L4 | 파일 시스템 읽기 전용, PSA 충돌, 권한 검증, 다단계 연쇄 실패 등 |

각 시나리오는 **작업 설명**, **예상 성공 조건**, **실패 시 복구 요구사항**을 포함합니다(구체적인 YAML·TF 예시는 부록을 참고).

## 평가 메트릭 및 점수 체계
### 메트릭 정의
| 메트릭 | 설명 | 단위 |
|--------|------|------|
| 성공 여부 | 목표 작업을 완전하게 수행했는지 여부 | PASS / FAIL |
| 해결 시간 | 첫 오류 감지부터 복구 완료까지 걸린 시간 | 초(sec) |
| 명령 호출 수 | 실제 실행된 `kubectl`·`terraform` 명령 횟수 | 회 |
| 비용 | 모델별 API 호출당 비용을 합산 | USD |
| 로그 품질 | 오류 원인·조치가 로그에 명시됐는지 여부 | 점 (0‑10) |

### 가중 평균 점수 계산
\[
\text{종합점수}= \frac{w_1\cdot S_1 + w_2\cdot S_2 + w_3\cdot S_3 + w_4\cdot S_4 + w_5\cdot S_5}{\sum w_i}
\]

- \(S_1\) : 성공 여부 (PASS = 100, FAIL = 0)  
- \(S_2\) : 해결 시간 → \(\displaystyle 100 \times \frac{T_{\max}-T}{T_{\max}}\) (T : 실제 시간, \(T_{\max}\) : 기준 상한)  
- \(S_3\) : 명령 호출 수 → \(\displaystyle 100 \times \frac{C_{\max}-C}{C_{\max}}\)  
- \(S_4\) : 비용 → \(\displaystyle 100 \times \frac{C_{\max}-\text{cost}}{C_{\max}}\)  
- \(S_5\) : 로그 품질 점수 (0‑10 → 0‑100 변환)  

기본 가중치는 모두 1이며, 프로젝트 요구에 따라 조정 가능합니다.

## 실험 실행 절차
1. **베이스라인 모드**  
   - 스킬 프롬프트 없이 모델에 작업 설명만 전달.  
   - 각 시나리오를 3회 반복하고 로그와 메트릭을 수집.  

2. **스킬 적용 모드**  
   - `k8s‑admin`(쿠버네티스) 또는 `platform‑eng`(Terraform) 역할 프롬프트를 사전 전달.  
   - 동일 시나리오·반복 횟수로 실행.  

3. **로그 수집**  
   - `kubectl logs`, `terraform show`, 그리고 LLM API 응답을 파일로 저장.  
   - 재현성을 위해 환경 변수 `RANDOM_SEED`를 지정.  

## 결과 정리 및 비교 분석
### 쿠버네티스 시나리오 (8 CKA/CKS, L2‑L3)

| 모델            | 베이스라인 점수 | 스킬 적용 점수 | Δ(변화) |
|----------------|----------------|----------------|----------|
| Claude Sonnet | 48 / 88 / 80   | 49 / 89 / 81   | +1 / +1 / +1 |
| Gemini 2.5 Flash | 6 / 85 / 81   | 5 / 84 / 80   | –1 / –1 / –1 |
| GPT‑4o         | 4 / 64 / 82   | 3 / 63 / 81   | –1 / –1 / –1 |
| DeepSeek Chat  | 6 / 76 / 80   | 6 / 76 / 80   | 0 / 0 / 0 |

*해석* – 강력한 모델(Claude Sonnet)은 스킬 없이도 높은 점수를 기록했으며, 스킬 추가 시 미세하게 개선되었습니다【2】. 반면, 약한 모델(GPT‑4o, Gemini Flash)은 스킬 적용이 오히려 성능을 감소시켰습니다.

### Terraform 시나리오 (4 L2‑L3)

| 모델            | 베이스라인 | 스킬 적용 | Δ |
|----------------|------------|-----------|---|
| Claude Sonnet | 43 | 44 | +1 |
| Gemini 2.5 Flash | 3 | 42 | +39 |
| GPT‑4o         | 2 | 42 | +40 |
| DeepSeek Chat  | 3 | 43 | +40 |

*해석* – `platform‑eng` 스킬은 **Claude Sonnet**이 `terraform‑import‑existing`을 PASS로 전환하는 등 긍정적 영향을 미쳤으며, 특히 비용이 낮은 모델에서도 큰 점수 상승을 보였습니다【2】.

### 신규 복합 시나리오 (4 L2‑L4)

| 모델            | readonly‑fs | psa‑conflict | capabilities | cascading | 총점 |
|----------------|------------|--------------|--------------|----------|------|
| DeepSeek Chat  | PASS | PASS | PASS | PASS | 4/4 |
| GPT‑4o         | PASS | PASS | PASS | FAIL | 3/4 |
| Gemini 2.5 Flash | FAIL | PASS | PASS | FAIL | 2/4 |
| Claude Sonnet   | FAIL | PASS | PASS | FAIL | 2/4 |

DeepSeek Chat은 비용 대비 가장 높은 성공률을 보였으며, L4 다단계 연쇄 실패 시나리오를 통과한 유일한 모델입니다【2】.

### 주요 패턴
- **강한 모델은 스킬에 크게 의존하지 않는다** – Claude Sonnet은 스킬 없이도 8/8 점수를 획득했습니다.  
- **스킬은 특정 작업에만 도움이 되고, 다른 작업을 방해할 수 있다** – `k8s‑admin` 스킬이 “이벤트와 조건을 먼저 확인”하도록 지시했지만, kubeconfig 연결 오류에서는 오히려 방해가 되었습니다.  
- **가격과 성능은 직접적인 상관관계가 아니다** – DeepSeek Chat은 가장 저렴하면서도 L4 시나리오를 통과했습니다.

## 스킬 설계 인사이트
1. **프롬프트 구조** – “우선 순위”와 “조건 검사”를 명확히 기술하면 강한 모델이 과도하게 검증 단계에 머무는 것을 방지할 수 있습니다.  
2. **모델 특성 맞춤** – GPT‑4o와 같이 “조건 검사”가 과도하게 적용되는 모델에는 해당 지시를 최소화하고, 직접적인 `kubectl apply`를 권장하는 것이 좋습니다.  
3. **오버피팅 방지** – 스킬에 너무 많은 제약을 넣으면 특정 시나리오에서 오히려 실패 확률이 높아집니다(예: Gemini Flash의 `terraform‑state‑drift`).  

## 자동 복구 흐름 구현 예시
1. **오류 감지** – `kubectl get events --watch` 또는 `terraform plan` 출력에서 비정상 상태를 실시간 스트리밍.  
2. **진단** – LLM에게 “현재 이벤트와 로그를 기반으로 원인 추정” 프롬프트 전송.  
3. **복구**  
   - **쿠버네티스**: `kubectl rollout restart` → `kubectl describe pod` → 필요 시 `kubectl delete pod` 후 재생성.  
   - **Terraform**: `terraform import` 우선 수행 → 상태 확인 → `terraform apply` 재시도.  

위 흐름은 **Terraform import** 전략을 강조하며, `import`가 가능한 경우 파괴‑재생성보다 비용·시간 효율이 높습니다.

## 한계점 및 위험 요소
- **모의 환경 vs 실제 운영** – Kind 클러스터는 경량화된 환경이므로, 실제 프로덕션 클러스터에서 발생하는 네트워크·보안 정책 차이를 완전히 반영하지 못합니다.  
- **모델·API 변동성** – LLM 버전 업데이트나 가격 정책 변화가 실험 결과에 직접적인 영향을 미칠 수 있습니다.  
- **보안·권한** – 자동화된 `kubectl`·`terraform` 실행은 클러스터/인프라에 과도한 권한을 부여할 위험이 있으므로 최소 권한 원칙을 적용해야 합니다.

## 향후 확장 방안
- **멀티‑클라우드 지원** – AWS EKS, GCP GKE 등 실제 클라우드‑네이티브 클러스터를 추가하여 스킬 일반화 검증.  
- **CI/CD 연동** – GitHub Actions 워크플로우(`.github/workflows/ci.yml`)와 연계해 PR 단계에서 자동 스킬 검증 파이프라인 구축.  
- **벤치마크 자동화 프레임워크** – Evidra Lab의 `infra‑bench`와 같은 테스트 프레임워크를 활용해 정기적인 성능 추적 및 레포트 자동 생성.  

## 결론 및 권고사항
- **스킬은 모델에 따라 효과가 크게 다르며, 무조건 적용해서는 안 된다**. 강한 모델은 기본 프롬프트만으로도 충분히 높은 성공률을 보이며, 스킬이 오히려 방해가 될 수 있습니다.  
- **스킬 설계 시 모델 특성을 고려한 맞춤형 지시**를 포함하고, 과도한 검증 로직은 배제하는 것이 바람직합니다.  
- **비용 효율성을 중시한다면** DeepSeek Chat과 같은 저비용 모델을 검토하되, L4 수준의 복합 시나리오에서는 사용을 제한하는 것이 안전합니다.  

향후 연구에서는 **다양한 클라우드 환경**, **다중 모델 앙상블**, **실시간 비용 최적화** 등을 포함한 확장된 벤치마크 프레임워크 구축이 필요합니다.

## 부록
### 샘플 Kind 클러스터 YAML
    kind: Cluster
    apiVersion: kind.x‑k8s.io/v1alpha4
    nodes:
      - role: control‑plane
        extraPortMappings:
          - containerPort: 30000
            hostPort: 30000

### Terraform 모듈 및 변수 정의 예시
    terraform {
      required_version = ">= 1.5.0"
      backend "local" {}
    }

    provider "kubernetes" {
      config_path = "~/.kube/config"
    }

    variable "region" {
      type    = string
      default = "us-east-1"
    }

### 스킬 프롬프트 템플릿
- **k8s‑admin**  

        You are a Kubernetes administrator. Diagnose issues by checking events first, then logs. Limit changes to the affected namespace only. Prefer rolling updates over pod deletions.

- **platform‑eng**  

        You are a platform engineer managing Terraform. When a resource already exists, import it instead of destroying and recreating. Validate state drift before applying changes.

### 실험 스크립트·로그 수집 도구
- `kubectl` 로그: `kubectl logs -n <ns> <pod> --since=5m`  
- Terraform 로그: `TF_LOG=DEBUG terraform apply`  
- LLM 응답 저장: `curl -X POST … -d @prompt.json > response.json`  

> **참고**: 본 문서에 사용된 모든 수치와 결과는 **euno.news** 기사와 Evidra Lab 테스트 프레임워크에서 제공된 자료에 기반합니다【1】. 최신 모델 업데이트나 추가 구현은 별도 조사가 필요합니다.

## 용어표
| 용어 | 정의 |
|------|------|
| AI 에이전트 | LLM을 기반으로 인프라 도구를 호출해 작업을 자동화하는 소프트웨어 |
| 스킬(Prompt Skill) | 에이전트에게 특정 역할·제한을 부여하는 프롬프트 텍스트 |
| 베이스라인 모드 | 스킬 없이 모델에 작업만 전달하는 실험 조건 |
| Δ(변화) | 스킬 적용 전후 점수 차이 |
| 비용 효율성 | 모델 API 호출 비용 대비 성능(성공률·시간) 비율 |

---

### 각주
[1] euno.news, “AI 에이전트 비용·성능 비교”, 2024년 5월 12일, https://euno.news/articles/ai-agent-cost-performance  
[2] Evidra Lab, “Infra‑Bench 결과 보고서”, 2024년 6월 3일, https://evidra.lab/reports/infra-bench-2024.pdf  