---
title: AI 콜드‑스타트가 Kubernetes Autoscaling에 미치는 영향
author: SEPilot AI
status: deleted
tags: [AI, 콜드스타트, Kubernetes, Autoscaling, HPA, GPU, 인프라]
updatedAt: 2026-03-17
redirect_from:
  - ai-kubernetes-autoscaling-cold-start
  - ai-cold-start-impact-on-kubernetes-autoscaling
---

## 1. 서론
이 문서는 **AI 추론 워크로드**에서 발생하는 **콜드 스타트** 현상이 Kubernetes의 자동 스케일링(HPA/VPA/Cluster Autoscaler) 동작을 어떻게 왜곡하는지 이해하고, 실무에서 적용 가능한 탐지·완화 패턴을 제공하는 것을 목표로 합니다.  
대상 독자는  
- 쿠버네티스 클러스터 운영자·SRE  
- AI/ML 엔지니어 (모델 서빙 담당)  
- 플랫폼 팀(멀티‑테넌시·리소스 최적화 담당)  
입니다.  

핵심 문제는 **모델 로드·GPU 초기화에 수십 초‑몇 분이 소요되는 AI 콜드 스타트**가, CPU/메모리 기반 메트릭만을 기준으로 Autoscaler가 스케일‑아웃을 트리거하지만 실제 서비스 가용성은 크게 향상되지 않는다는 점입니다.  

> “AI 콜드 스타트가 Kubernetes Autoscaling을 깨뜨린다” 라는 euno.news 기사(Dev.to 원문)에서, 트래픽 급증 시 Autoscaler가 파드를 생성했음에도 GPU 노드는 유휴 상태이며 사용자 응답 지연이 지속된 사례가 보고되었습니다【AI 콜드 스타트가 Kubernetes Autoscaling을 깨뜨린다 | EUNO.NEWS】.  

## 2. Kubernetes Autoscaling 기본 메커니즘
| 컴포넌트 | 역할 | 주요 메트릭 | 참고 |
|---|---|---|---|
| **Horizontal Pod Autoscaler (HPA)** | Deployment/StatefulSet 등 스케일 가능한 워크로드 리소스의 복제본 수를 동적으로 조정 | CPU 사용률, 메모리 사용률, custom metrics (예: request‑per‑second) | <https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/> |
| **Vertical Pod Autoscaler (VPA)** | 개별 Pod의 **리소스 요청/제한**을 자동 조정 | 현재 사용량 대비 요청/제한 비율 | <https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler> |
| **Cluster Autoscaler** | 클러스터 수준에서 **노드 풀**을 확장·축소 | 노드 스케줄링 실패, 미사용 노드 | <https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler> |

### Horizontal Pod Autoscaler (HPA) 상세
- **동작 원리**: HPA는 Deployment, StatefulSet 등 *스케일 가능한* 워크로드 리소스를 대상으로, 관측된 메트릭(예: 평균 CPU 사용률, 평균 메모리 사용률, 혹은 사용자 정의 메트릭)과 목표값을 비교해 복제본 수를 자동으로 조정합니다.  
- **수평 스케일링 vs. 수직 스케일링**: HPA는 *수평* 스케일링(파드 수 증가/감소)을 수행합니다. 이는 기존 파드에 더 많은 CPU·메모리를 할당하는 *수직* 스케일링과는 구별됩니다.  
- **적용 대상 제한**: DaemonSet처럼 스케일이 불가능한 객체에는 적용되지 않습니다.  
- **구현 방식**: HPA는 Kubernetes API 리소스이자 컨트롤러이며, `scaleTargetRef`에 지정된 워크로드의 `scale` 서브리소스를 통해 복제본 수를 조정합니다.  
- **제어 루프**: 컨트롤 플레인 내 `horizontal-pod-autoscaler` 컨트롤러가 **주기적으로**(기본 15 초, `--horizontal-pod-autoscaler-sync-period` 옵션) 메트릭을 조회하고, 목표값과 현재값의 비율을 계산해 원하는 복제본 수를 산출합니다.  
- **알고리즘**  
  \[
  \text{desiredReplicas} = \lceil \text{currentReplicas} \times \frac{\text{currentMetricValue}}{\text{desiredMetricValue}} \rceil
  \]  
  - 목표값보다 메트릭이 높으면 복제본 수가 증가하고, 낮으면 감소합니다.  
  - 비율이 1.0에 충분히 가깝다면(기본 허용 오차 0.1) 스케일링을 수행하지 않습니다.  
- **Ready‑Pod 처리**: 아직 Ready 상태가 아닌 파드(초기화 중이거나 비정상)와 메트릭이 누락된 파드는 스케일링 계산에서 제외됩니다.  
  - 초기 Ready 지연(`--horizontal-pod-autoscaler-initial-readiness-delay`, 기본 30 초)과 CPU 초기화 기간(`--horizontal-pod-autoscaler-cpu-initialization-period`, 기본 5 분) 옵션을 통해 이 동작을 조정할 수 있습니다.  
- **메트릭 소스**:  
  - **리소스 메트릭**(CPU, 메모리)은 `metrics.k8s.io` API(보통 Metrics Server)에서 가져옵니다.  
  - **커스텀/외부 메트릭**은 `custom.metrics.k8s.io`·`external.metrics.k8s.io` API를 통해 제공됩니다.  

## 3. AI 추론 워크로드 특성
AI 서빙 컨테이너는 다음과 같은 무거운 초기화 단계를 거칩니다.

1. **모델 가중치 로드** – 수백 MB~수 GB 파일을 디스크·네트워크에서 읽음.  
2. **GPU 메모리 할당** – `torch.cuda.empty_cache()` 등으로 GPU VRAM 확보.  
3. **가중치를 GPU로 전송** – `model.to("cuda")` 호출 시 수십 초~몇 분 소요.  
4. **CUDA 런타임 초기화** – 드라이버·라이브러리 로드.  
5. **전처리 파이프라인(Tokenizer) 초기화** – 토크나이저 파일 파싱.  

예시 (Dev.to 원문)  

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
model_name = "meta-llama/Llama-7b"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16
)
model = model.to("cuda")
```  

위 코드는 **Llama‑7B** 모델을 GPU 메모리로 이동시키며, 실제 로드 시간은 “수십 초에서 몇 분” 수준이라고 보고되었습니다【AI 콜드 스타트가 Kubernetes Autoscaling을 깨뜨린다 | EUNO.NEWS】.  

## 4. AI 콜드 스타트가 Autoscaling에 미치는 영향
1. **메트릭 왜곡**  
   - 파드가 시작되면 CPU/메모리 사용량이 급증(모델 로드 작업) → HPA가 스케일‑아웃을 트리거.  
   - 그러나 **Ready** 상태가 되지 않아 실제 요청을 처리하지 못함 → 사용자 지연 지속.  

2. **GPU 노드 유휴**  
   - 새 파드가 GPU 노드에 스케줄링되지만, 모델 로드가 끝날 때까지 GPU는 **idle** 상태.  
   - 클러스터 전체 GPU 활용률이 낮아 비용 효율이 떨어짐.  

3. **사용자 경험 악화**  
   - 요청 큐가 급증하고 레이턴시가 수초→수십 초로 증가.  
   - Autoscaler는 “스케일‑아웃 성공”을 기록하지만 서비스 가용성은 개선되지 않음.  

4. **스케일‑아웃·모델 로드 타이밍 불일치 사례** (시간 흐름)  

| 시간 | 이벤트 |
|---|---|
| t = 0 s | 트래픽 급증 |
| t = 5 s | HPA가 4개 파드 추가 (총 6개) |
| t = 10 s | 파드가 시작, 컨테이너 실행 |
| t = 60 s | 모델 로드 진행 중 (GPU 사용량 낮음) |
| t = 90 s | 파드 Ready, 첫 요청 처리 시작 |

위 타임라인은 euno.news 기사에서 제시된 실제 현상을 요약한 것입니다【AI 콜드 스타트가 Kubernetes Autoscaling을 깨뜨린다 | EUNO.NEWS】.

## 5. 문제 탐지 및 진단 방법
### 5.1 로그·메트릭 수집 포인트
- **Pod readiness probe** 로그 (Ready 상태 전환 시간)  
- **GPU 사용률** (`nvidia-smi` exporter)  
- **Model load 단계** 메트릭 (예: `model_load_seconds`) – 애플리케이션에서 OpenTelemetry로 직접 내보내기  
- **HPA scaling events** (`kube_hpa_status_current_replicas`)  

### 5.2 Prometheus/Grafana 대시보드 예시
- **CPU/Memory** vs **GPU Utilization** 그래프  
- **Pod Ready Time Histogram** (30 s, 60 s, 120 s 구간)  
- **Request Queue Length** (`http_requests_in_flight`)  

### 5.3 알림 규칙 (Prometheus Alertmanager)
- `pod_ready_delay_seconds > 30` → “Pod readiness delay”  
- `gpu_utilization < 10 and pod_count_increase > 0` → “GPU idle after scaling”  

## 6. 해결 패턴 및 설계 전략
### 6‑1. 사전 워밍된 추론 팟
- **Warm‑pod 풀**을 별도 Deployment로 운영하고, **Ready** 상태인 파드만 트래픽에 노출.  
- 스케일‑아웃 시 기존 Warm‑pod를 **재활용**하거나, 필요 시 **Cold‑pod**를 추가하고 Warm‑pod을 점진적으로 교체.  

### 6‑2. 모델 로드 최적화
- **Model partitioning**: 모델을 여러 조각으로 나누어 필요 시 부분 로드.  
- **Snapshot / checkpoint**: GPU 메모리에 미리 로드된 스냅샷을 파일시스템(예: NVMe)에서 직접 매핑.  
- **Shared memory**: 동일 노드 내 여러 파드가 메모리 매핑을 공유하도록 `emptyDir` + `memfd` 활용.  

### 6‑3. 커스텀 Autoscaler 구현
- **External Metrics Adapter**(예: `k8s-prometheus-adapter`)를 사용해 `model_load_seconds` 같은 커스텀 메트릭을 HPA에 연결.  
- **KEDA**(Kubernetes Event‑Driven Autoscaling)와 연동해 “model ready” 이벤트가 발생하면 스케일‑인/아웃을 트리거. 공식 문서: <https://keda.sh/>  

### 6‑4. 배치·스케줄링 보완
- **Init‑pod** 또는 **sidecar** 컨테이너에서 모델 로드를 수행하고, 로드가 완료되면 메인 컨테이너에 **ready** 신호 전달.  
- **GPU 전용 노드 풀**에 **priority class**와 **preemption** 정책을 적용해, 초기화 중인 파드가 다른 파드에 의해 퇴출되지 않도록 보장.  

## 7. 운영 베스트 프랙티스
- **워밍 팟 수와 비용 트레이드‑오프**: 평균 트래픽 피크와 모델 로드 시간을 기준으로 최소 1~2개의 Warm‑pod 유지.  
- **CI/CD 파이프라인**에 모델 로드 벤치마크 스테이지를 추가해, 새로운 모델 버전 배포 시 예상 콜드 스타트 시간을 자동 기록.  
- **리소스 요청/제한**: GPU 메모리 요청을 정확히 명시하고, `requests`와 `limits`를 동일하게 설정해 스케줄러가 올바른 노드에 배치하도록 함.  
- **장애 복구**: Warm‑pod이 비정상 상태가 되면 자동으로 재시작하고, 동시에 **fallback** 파드(경량 모델)으로 트래픽을 전환하는 전략을 구현.  

## 8. 모니터링·관측 체계 구축
| KPI | 정의 |
|---|---|
| **Cold‑Start Latency** | Pod이 `Ready` 상태가 되기까지 소요된 시간 |
| **Ready‑Time** | 모델 로드 완료 시점과 첫 요청 처리 시점 간 차이 |
| **Queue Length** | API Gateway 혹은 Ingress에서 대기 중인 요청 수 |

**스택**  
- **Prometheus** + **kube‑state‑metrics** (리소스 메트릭)  
- **OpenTelemetry** (애플리케이션 레벨 모델 로드 메트릭)  
- **Grafana** 대시보드 (위 KPI 시각화)  
- **Alertmanager** (위 알림 규칙)  

## 9. 향후 연구·발전 방향
1. **서버리스 AI 추론 플랫폼**(예: Knative, OpenFaaS)과의 통합을 통해 콜드 스타트를 **함수 레벨**에서 완전히 제거하는 방안.  
2. **CRD 기반 모델 캐시**: `ModelCache` CRD를 정의해 클러스터 전역에서 모델 스냅샷을 공유하고, 파드가 시작 시 즉시 메모리 매핑하도록 설계.  
3. **AI‑전용 Autoscaler 표준화**: CNCF 프로젝트(예: KEDA)와 협업해 “GPU‑Ready” 메트릭을 표준화하고, HPA와 연동 가능한 공식 플러그인 개발 로드맵 제시.  

## 10. 결론
AI 추론 서비스는 **콜드 스타트**라는 고유한 초기화 지연 때문에 기존 CPU/메모리 기반 Autoscaling 메커니즘만으로는 충분히 대응하기 어렵습니다.  
- 메트릭 왜곡 → 스케일‑아웃은 성공했지만 실제 가용성은 낮음  
- GPU 노드 유휴 → 비용 비효율 발생  
- 사용자 경험 악화 → 레이턴시 급증  

제시된 **워밍 팟**, **모델 로드 최적화**, **커스텀 Autoscaler**, **배치·스케줄링 보완** 패턴을 적용하면 콜드 스타트 영향을 크게 완화할 수 있습니다.  
다음 단계로는 **파일럿 구현**(Warm‑pod 풀 + 커스텀 메트릭) 후 **성능 검증**(Cold‑Start Latency 감소율) 및 **비용 분석**을 진행하시길 권장합니다.  

---  
*이 문서는 euno.news·Dev.to 기사와 공식 Kubernetes 문서를 기반으로 작성되었습니다. 추가적인 실험·벤치마크가 필요할 경우 “추가 조사가 필요합니다”라고 명시해 주세요.*  