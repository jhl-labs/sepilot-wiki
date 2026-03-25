---
title: Kubernetes 기반 AI 모델 GitOps & CI/CD 베스트 프랙티스
author: SEPilot AI
status: published
tags: [kubernetes, ai, gitops, ci/cd, mlops]
---

## 1. 서론
이 문서는 Kubernetes 환경에서 AI 모델을 안정적으로 운영하기 위해 GitOps와 CI/CD 를 결합한 베스트 프랙티스를 제공한다.  
대상 독자는 **클라우드 인프라 엔지니어**, **ML Ops 팀**, **데브옵스 담당자**이며, 모델 버전 관리·배포 자동화에 관심이 있는 모든 기술 실무자를 목표로 한다.  

Kubernetes 기반 AI 서비스는 **모델 버전 관리**, **리소스 최적화**, **배포 신뢰성** 등 여러 과제가 존재한다. GitOps 와 CI/CD 를 적용하면 선언적 인프라와 자동화된 파이프라인을 통해 이러한 과제를 체계적으로 해결할 수 있다.

## 2. 기본 전제조건
- **Kubernetes 클러스터**: 최신 안정 버전의 클러스터와 CNI 플러그인(예: Calico, Cilium) 사용을 권장한다.  
- **AI 모델 포맷**: ONNX, TensorFlow SavedModel, PyTorch TorchScript 등 표준 포맷을 저장소에 보관한다.  
- **GitOps 도구 선택**: Argo CD 혹은 Flux 중 조직 문화와 UI/CLI 지원 여부에 따라 선택한다.  
- **CI/CD 기본 구성**: Git 저장소, CI 엔진(예: GitHub Actions, GitLab CI, Tekton) 및 컨테이너 레지스트리(OCI 호환)를 준비한다.

## 3. 전체 아키텍처 개요
1. **모델 레지스트리** → 모델 아티팩트와 메타데이터를 관리한다.  
2. **GitOps 리포지터리** → Helm 차트 혹은 Kustomize 기반 선언적 배포 정의를 저장한다.  
3. **CI 파이프라인** → 코드·모델 변경을 감지 → Docker 이미지 빌드 → 레지스트리 푸시.  
4. **CD 파이프라인** → Argo CD/Flux 가 GitOps 리포지터리를 지속적으로 동기화 → Kubernetes 클러스터에 배포.  
5. **서비스 메쉬 / AI Gateway**와 연동해 트래픽 라우팅 및 정책 적용.  
6. **데이터 파이프라인**은 모델이 필요로 하는 입력 데이터를 별도 스토리지(S3, PVC 등)와 연결한다.

## 4. GitOps 워크플로우 설계
- **선언적 인프라**: Helm 차트 또는 Kustomize 디렉터리 구조로 모델 배포 매니페스트를 정의한다.  
- **모델 버전 메타데이터**: Git 커밋 SHA, 이미지 태그, 모델 레지스트리 ID 등을 `values.yaml`에 포함한다.  
- **자동 동기화**: Argo CD/Flux 의 자동 동기화 옵션을 활성화해 Git 변경 시 클러스터에 즉시 반영한다.  
- **롤백 메커니즘**: 이전 Git 커밋으로 되돌리면 자동으로 이전 배포 상태가 복구된다.  
- **PR 기반 검증**: 모든 배포 정의 변경은 Pull Request 로 진행하고, CI 단계에서 Helm lint, Kubeval 등 검증을 수행한다.

## 5. CI 파이프라인 상세
- **트리거**: 모델 파일·코드 변경이 감지되면 파이프라인이 시작된다.  
- **이미지 빌드**: 다중 단계 Dockerfile(빌드 단계 → 런타임 단계) 사용을 권장한다.  
- **CPU/GPU 이미지**: 동일 레포지터리에서 `--platform` 옵션을 활용해 CPU 전용 이미지와 GPU 전용 이미지를 각각 빌드한다.  
- **보안 스캔**: 이미지 빌드 후 Trivy 등으로 취약점 스캔을 수행하고, 결과가 허용 기준을 초과하면 배포를 차단한다.  
- **버전 태깅**: Git 커밋 SHA와 모델 레지스트리 버전을 조합한 태그를 이미지에 적용한다.  

## 6. CD 파이프라인 및 배포 패턴
- **Canary 배포**: 새로운 모델 버전을 소수 트래픽에만 노출하고, 성공 여부를 모니터링 후 전체 확대한다.  
- **Blue‑Green 배포**: 기존 서비스와 새로운 버전을 병렬로 운영하고, 검증이 끝나면 라우팅을 전환한다.  
- **자동 스케일링**: HPA와 VPA 를 조합해 CPU·메모리·GPU 사용량에 따라 파드 수와 리소스 요청을 자동 조정한다.  
- **롤아웃/롤백 자동화**: Argo CD 의 `syncPolicy`에 `automated`와 `prune` 옵션을 설정해 실패 시 자동 롤백을 수행한다.  
- **배포 후 검증**: Smoke Test(헬스 체크)와 Inference Test(샘플 입력에 대한 응답 검증)를 파이프라인에 포함한다.

## 7. 모델 버전 관리와 레지스트리 연동
- **모델 레지스트리**: MLflow, OCI Artifacts, 혹은 클라우드 객체 스토리지를 활용한다.  
- **GitOps 연동**: 모델 레지스트리에서 최신 모델 메타데이터를 가져와 GitOps `values.yaml`에 자동 삽입한다.  
- **버전 메타데이터 표준화**: `model_id`, `model_sha`, `artifact_uri`, `parameters` 필드를 일관되게 정의한다.  
- **아카이빙·폐기**: 일정 기간 사용되지 않은 모델은 레지스트리에서 아카이브하고, 필요 시 삭제 정책을 적용한다.

## 8. 시크릿·인프라 구성 관리
- **시크릿 관리**: Sealed Secrets 혹은 HashiCorp Vault 를 사용해 모델 인증키·API 토큰을 암호화한다.  
- **환경별 ConfigMap/Secret**: `dev`, `staging`, `prod` 네임스페이스마다 별도 ConfigMap 과 Secret 을 정의한다.  
- **RBAC·네임스페이스 격리**: 모델 배포 전용 ServiceAccount 과 RoleBinding 으로 최소 권한을 부여한다.

## 9. 모니터링·관측 및 품질 보증
- **메트릭 수집**: Prometheus 와 OpenTelemetry 를 이용해 추론 지연시간, 성공률, 리소스 사용량을 수집한다.  
- **자동 검증 파이프라인**: 배포 후 일정 주기로 샘플 입력에 대한 정확도·지연시간을 검증하고, 기준을 벗어나면 알림을 발생시킨다.  
- **대시보드**: Grafana 와 Kiali 로 모델 서비스 상태와 메쉬 트래픽을 시각화한다.  
- **로그·트레이싱**: Loki 혹은 Elastic Stack 으로 로그를 집계하고, OpenTelemetry 로 추론 요청 흐름을 추적한다.

## 10. 보안·컴플라이언스 고려사항
- **이미지 서명**: Cosign 혹은 Notary 로 컨테이너 이미지에 서명을 적용한다.  
- **데이터 프라이버시**: 모델이 접근하는 데이터는 최소 권한 원칙에 따라 스토리지와 연결하고, 전송 시 TLS 를 사용한다.  
- **감사 로그**: 모든 배포·롤백·시크릿 접근 기록을 중앙 로그에 저장하고, 정책 위반 시 자동 알림을 설정한다.

## 11. 성능 최적화 및 비용 관리
- **리소스 할당 최적화**: GPU 파드에 `requests` 와 `limits` 를 명확히 정의하고, 사용량 기반 자동 스케일링을 적용한다.  
- **모델 캐싱·프리워밍**: 자주 호출되는 모델은 워커 노드에 사전 로드해 초기 지연을 최소화한다.  
- **비용 추적**: 클라우드 비용 관리 도구와 Prometheus 를 연동해 GPU·CPU 사용량 기반 비용 대시보드를 구축한다.

## 12. 베스트 프랙티스 체크리스트
- GitOps 리포지터리와 모델 레지스트리 간 메타데이터 동기화가 자동화되어 있는가?  
- CI 단계에서 이미지 취약점 스캔과 서명이 수행되는가?  
- 배포 전략(Canary/Blue‑Green)과 자동 롤백이 정의되어 있는가?  
- 모델 추론 메트릭이 Prometheus 로 수집되고 알림이 설정되어 있는가?  
- 시크릿은 자동 암호화·복구 메커니즘을 통해 관리되는가?  
- 비용 모니터링 대시보드가 운영 중인가?  

## 13. 도구 및 기술 스택 추천
| 영역 | 주요 도구 | 선택 포인트 |
|------|-----------|--------------|
| GitOps | Argo CD, Flux | 선언적 배포, UI·CLI 지원, 자동 동기화 |
| CI | GitHub Actions, GitLab CI, Tekton | 컨테이너 이미지 빌드, 파이프라인 재사용성 |
| 모델 레지스트리 | MLflow, OCI Artifacts, S3 | 버전 관리, 메타데이터 저장 |
| 시크릿 관리 | Sealed Secrets, HashiCorp Vault | 자동 암호화·복구, 정책 기반 접근 제어 |
| 모니터링 | Prometheus, OpenTelemetry, Grafana | 추론 메트릭, 알림, 대시보드 |

## 14. 실전 구현 예시
### 샘플 Git 리포지터리 구조
```
├─ .github
│   └─ workflows
│       └─ ci.yml
├─ charts
│   └─ model-service
│       ├─ Chart.yaml
│       ├─ values.yaml
│       └─ templates
│           ├─ deployment.yaml
│           └─ service.yaml
├─ models
│   └─ latest
│       └─ model.onnx
├─ src
│   └─ inference.py
└─ Dockerfile
```

### CI 파이프라인 (GitHub Actions) 예시
```
name: Model CI

on:
  push:
    paths:
      - 'models/**'
      - 'src/**'
      - 'Dockerfile'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      - name: Build image
        run: |
          docker build -t ${{ secrets.REGISTRY }}/model-service:${{ github.sha }} .
      - name: Scan image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ secrets.REGISTRY }}/model-service:${{ github.sha }}
      - name: Push image
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login ${{ secrets.REGISTRY }} -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push ${{ secrets.REGISTRY }}/model-service:${{ github.sha }}
      - name: Update GitOps values
        run: |
          yq eval '.image.tag = "${{ github.sha }}"' -i charts/model-service/values.yaml
          git config user.name "ci-bot"
          git config user.email "ci@example.com"
          git add charts/model-service/values.yaml
          git commit -m "Update model image tag"
          git push
```

### Argo CD 애플리케이션 정의 예시
```
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: model-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/ai-gitops.git
    targetRevision: HEAD
    path: charts/model-service
  destination:
    server: https://kubernetes.default.svc
    namespace: ai-models
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Canary 배포 흐름
1. CI 파이프라인이 새로운 이미지와 `values.yaml`을 커밋한다.  
2. Argo CD 가 자동 동기화하여 `canary` 파드 비율을 5% 로 설정한다.  
3. Prometheus 로 Canary 파드의 메트릭을 모니터링한다.  
4. 기준을 만족하면 `canary` 비율을 100% 로 확대하고, 기존 파드를 삭제한다.  
5. 이상 징후 발생 시 Argo CD 가 자동 롤백을 수행한다.

## 15. 기존 시스템 마이그레이션 가이드
- **진단 체크리스트**: 현재 모델 배포 방식, CI 도구, 레지스트리, 모니터링 현황을 파악한다.  
- **준비 단계**: GitOps 리포지터리와 Helm 차트 템플릿을 만든다.  
- **파일링 단계**: 기존 Docker 이미지와 모델 아티팩트를 모델 레지스트리에 등록하고, 이미지 태그와 메타데이터를 정리한다.  
- **전환 단계**: CI 파이프라인을 위의 예시와 유사하게 재구성하고, Argo CD 로 초기 배포를 수행한다.  
- **검증 단계**: Canary 배포와 자동 테스트를 통해 정상 동작을 확인한다.  
- **롤백·리스크 관리**: 모든 단계에서 Git 커밋 기반 롤백이 가능하도록 하고, 중요한 변경은 PR 리뷰를 거친다.

## 16. FAQ
**Q1. 모델이 크게 변했을 때 버전 관리는 어떻게?**  
A) 모델 레지스트리에서 새로운 버전을 생성하고, GitOps `values.yaml` 에 해당 버전 ID와 이미지 태그를 업데이트한다. PR 로 검증 후 자동 배포한다.

**Q2. GPU 노드가 부족할 때 자동 스케일링은?**  
A) 클러스터 오토스케일러와 HPA 를 연계해 GPU 요청이 충족되지 않으면 신규 GPU 노드를 프로비저닝하도록 설정한다.

**Q3. CI 파이프라인에서 모델 테스트를 어떻게 구성?**  
A) 이미지 빌드 후 샘플 입력을 이용한 Inference Test 를 실행하고, 응답 지연시간·정확도가 사전 정의된 임계값을 초과하면 파이프라인을 실패 처리한다.

## 17. 참고 문서 및 링크
- **Argo CD 공식 문서** – https://argo-cd.readthedocs.io/  
- **Flux 공식 문서** – https://fluxcd.io/  
- **Tekton Pipelines 공식 문서** – https://tekton.dev/  
- **Prometheus 공식 문서** – https://prometheus.io/docs/  
- **OpenTelemetry 공식 문서** – https://opentelemetry.io/  
- **MLflow 모델 레지스트리 가이드** – https://mlflow.org/docs/latest/model-registry.html  
- **HashiCorp Vault 공식 문서** – https://www.vaultproject.io/docs  

*본 가이드는 일반적인 원칙을 제시하며, 실제 환경에 적용하기 전에는 각 도구와 서비스의 최신 공식 문서를 반드시 확인하시기 바랍니다.*