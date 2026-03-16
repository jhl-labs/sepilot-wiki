---
title: AI 콜드 스타트가 Kubernetes Autoscaling을 무력화할 때의 해결 가이드
author: SEPilot AI
status: draft
tags: [AI, Kubernetes, Autoscaling, Cold Start, Inference, Helm, Prometheus]
redirect_from:
  - 470
---

## 1. 문제 정의
- **콜드 스타트 지연**: AI 추론 파드가 시작될 때 모델 가중치 로드·GPU 메모리 할당·CUDA 초기화 등 복합적인 초기화 과정이 필요해 수십 초에서 몇 분까지 걸림[[출처](https://euno.news/posts/ko/the-ai-cold-start-that-breaks-kubernetes-autoscali-77ecde)].
- **GPU 자원 비활성**: 파드가 GPU 노드에 스케줄링되었지만 모델 로드가 끝나기 전까지 GPU는 유휴 상태로 남음.
- **메트릭·레텐시 불일치**: 자동 스케일러는 파드 수를 늘려도 실제 처리 용량이 증가하지 않아 요청 큐가 급증하고 레텐시가 크게 상승함.

## 2. 기존 쿠버네티스 자동 스케일링 동작
| 요소 | 설명 | 일반 마이크로‑서비스에서의 특징 |
|------|------|--------------------------------|
| **HPA / VPA** | CPU·메모리 혹은 Custom Metrics 기반으로 파드 수 조정 | 수초 내에 파드가 `Ready` 상태가 되어 트래픽을 처리 |
| **스케일링 사이클** | 감지 → 스케일 → 준비 | 짧고 예측 가능, 대부분 `runtime start → code load → DB connect` 정도만 소요 |
| **Reference** | <https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/> |

## 3. AI 추론 워크로드 특성
- **대용량 모델 가중치 로드**: 수 GB~수십 GB 파일을 디스크·네트워크에서 읽어 메모리·GPU에 복사.
- **GPU 메모리 할당·CUDA 초기화**: CUDA 런타임과 드라이버 초기화가 필요.
- **전처리 파이프라인 초기화**: 토크나이저, 전처리 스크립트 로드.
- **초기화 시간**: “수십 초에서 몇 분”까지 소요[[출처](https://euno.news/posts/ko/the-ai-cold-start-that-breaks-kubernetes-autoscali-77ecde)].

예시 코드 (Python, `transformers` 사용):

    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    model_name = "meta-llama/Llama-7b"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16
    )
    # Move the model to GPU memory
    model = model.to("cuda")

## 4. 콜드 스타트 현상과 시스템 영향
- **GPU 유휴**: 파드가 `Running`이지만 `Ready`가 아니므로 GPU는 할당만 되고 실제 연산에 사용되지 않음.
- **실제 처리 용량 정체**: HPA가 파드 수를 늘려도 요청을 처리할 파드가 부족해 큐가 급증.
- **사용자 경험 악화**: 레텐시 급등, 오류율 증가, 서비스 신뢰도 하락.

## 5. 모니터링 및 지표 왜곡
- **GPU 사용률**: 초기화 단계에서 낮게 표시돼 “리소스 낭비”로 오인 가능.
- **CPU/메모리 메트릭**: 초기화 시점에 비정상적으로 낮아 HPA가 스케일링을 멈출 수 있음.
- **Ready vs Available**: `kubectl get pods`에서 `READY`가 `0/1`인 파드가 실제 서비스 가능 파드와 동일하게 취급돼 혼동 발생.

**추천 대시보드**: Prometheus + Grafana에서 `model_load_time_seconds`, `gpu_memory_used_bytes`, `pod_ready` 등을 시각화.

## 6. 해결 패턴 1 – 사전 워밍된 추론 파드
1. **Warm Pod**를 일정 수 유지해 모델을 미리 로드.
2. **로드밸런싱**: 서비스 파드와 워밍 파드 사이에 트래픽 라우팅 정책 적용 (예: `service.spec.sessionAffinity: None`).
3. **자동 조정**: `CronJob`이나 KEDA를 이용해 트래픽 패턴에 따라 워밍 파드 수를 동적으로 조절[[KEDA Docs](https://keda.sh/docs/)].

## 7. 해결 패턴 2 – 모델 로드 최적화
- **Lazy vs Eager Loading**: 필요 시점에만 로드하거나, 시작 시점에 전체 로드.
- **가중치 압축·분할**: `torch.save` 시 `torch.save(..., _use_new_zipfile_serialization=False)` 등으로 파일 크기 감소.
- **GPU 메모리 공유**: NVIDIA MIG 혹은 `nvidia.com/gpu` 멀티‑테넌시 활용[[NVIDIA MIG](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/)].

## 8. 해결 패턴 3 – 스케줄러·리소스 예약 강화
- **Node Affinity / Tolerations**: GPU 전용 노드에 우선 스케줄링하도록 `nodeSelector`와 `tolerations` 설정.
- **Pod Disruption Budget**와 **Pre‑Stop Hook**: 롤링 업데이트 시 기존 파드가 완전히 준비될 때까지 새 파드 생성 지연.
- **Custom Scheduler** 또는 **Extended Resource Metrics**: 모델 로드 시간을 예측해 스케줄링 우선순위에 반영.

## 9. 구현 가이드

### 9‑1. Helm 차트 예시
```yaml
apiVersion: v2
name: inference-service
description: AI 추론 서비스 with warm pods
type: application
version: 0.1.0
appVersion: "1.0"

# values.yaml (간략)
replicaCount: 2          # 일반 파드
warmReplicaCount: 1      # 워밍 파드
image:
  repository: myrepo/inference
  tag: latest
resources:
  limits:
    nvidia.com/gpu: 1
  requests:
    cpu: "500m"
    memory: "1Gi"
nodeSelector:
  kubernetes.io/hostname: gpu-node-01
tolerations:
- key: "nvidia.com/gpu"
  operator: "Exists"
  effect: "NoSchedule"
```

### 9‑2. HPA에 Custom Metric 연동
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: inference-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: inference-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: External
    external:
      metric:
        name: model_load_time_seconds
        selector:
          matchLabels:
            model: llama-7b
      target:
        type: AverageValue
        averageValue: 30
```
*`model_load_time_seconds`*는 Prometheus exporter가 제공하도록 구현한다.

### 9‑3. Init Container를 이용한 모델 사전 다운로드
```yaml
initContainers:
- name: model-downloader
  image: alpine:3.18
  command: ["sh", "-c"]
  args:
    - |
      wget -O /model/llama-7b.pt https://model-repo.example.com/llama-7b.pt
  volumeMounts:
  - name: model-volume
    mountPath: /model
containers:
- name: inference
  image: myrepo/inference:latest
  volumeMounts:
  - name: model-volume
    mountPath: /app/model
volumes:
- name: model-volume
  emptyDir: {}
```

## 10. 베스트 프랙티스 및 운영 팁
- **Rolling Update**: `strategy.type: RollingUpdate`와 `maxSurge`, `maxUnavailable`을 조정해 새 파드가 완전히 로드될 때까지 기존 파드가 서비스 유지.
- **대시보드**: Grafana에 `model_load_time_seconds`, `gpu_memory_used_bytes`, `pod_ready` 패널 추가.
- **주기적 Load Test**: `k6` 혹은 `locust`를 이용해 트래픽 피크 시 워밍 파드 수를 검증하고 조정.
- **로그**: 모델 로드 단계별 로그 레벨을 `INFO`로 설정해 로드 시간 추적.

## 11. 한계와 향후 연구 방향
- **대형 모델 비용**: 수백 GB 모델은 워밍 파드 유지 비용이 급증, 비용‑성능 트레이드오프 필요.
- **Serverless GPU**: Knative, OpenFaaS 등 서버리스 GPU 플랫폼과의 연계 가능성 탐색[[Knative Docs](https://knative.dev/docs/)].
- **ML 기반 스케줄링**: 과거 트래픽·모델 로드 히스토리를 학습해 스케일링 시점을 예측하는 모델 개발 필요.

---  
*📰 이 문서는 뉴스 인텔리전스에 의해 자동 생성되었습니다.*