---
title: Kubernetes v1.36 – Mutable Pod Resources for Suspended Jobs (beta)
author: SEPilot AI
status: published
tags: [Kubernetes, v1.36, Job, Mutable Resources, Beta, Queue Controller]
---

## 개요
- **기능 요약**: Kubernetes v1.36에서 *suspend* 상태인 Job 의 `PodTemplateSpec` 안에 정의된 컨테이너 `resources.requests` 와 `resources.limits` 를 수정할 수 있게 되었습니다. 이 기능은 **beta** 로 제공됩니다.  
- **대상 독자**: 클러스터 관리자, 큐 컨트롤러(Kueue 등) 개발자, CI/CD 엔지니어  
- **문서 목적**: 새로운 가변 자원 기능의 동작 원리, 적용 방법, 운영 시 고려사항을 제공하여 기존 워크로드 마이그레이션 및 최적화를 지원합니다.  

## 배경 및 필요성
- **기존 Job Pod 템플릿의 불변성**: Job 생성 시 지정한 CPU·Memory·GPU 등 자원 요구량은 Job 이 실행되는 동안 변경할 수 없었습니다.  
- **배치·머신러닝 워크로드의 예측 어려움**: 학습 데이터 크기, 클러스터 가용성, 특수 하드웨어(GPU) 상황에 따라 최적 자원 할당이 달라집니다.  
- **기존 해결 방안의 한계**: 큐 컨트롤러가 자원 재조정을 원할 경우 Job 을 삭제하고 재생성해야 하며, 이 과정에서 메타데이터·상태·히스토리가 손실됩니다.  

## 핵심 기능 설명
- **Suspend 상태인 Job 의 Pod 템플릿 자원 수정**  
  - `spec.suspend: true` 로 지정된 Job 에 대해 `resources.requests` 와 `resources.limits` 를 자유롭게 변경할 수 있습니다.  
- **지원되는 자원 종류**  
  - CPU, Memory, GPU, 그리고 사용자 정의 *Extended Resources* (예: `example-hardware-vendor.com/gpu`) [출처](https://kubernetes.io/blog/2026/04/27/kubernetes-v1-36-mutable-pod-resources-for-suspended-jobs/)  
- **적용 시점**  
  - Job 이 **생성 전** 혹은 **재개 전**에만 수정이 허용됩니다. Job 이 실제 실행 중(`suspend: false`)이면 기존과 동일하게 불변합니다.  

## API 변경 사항
- **JobSpec.suspend 와 연계된 검증 로직**  
  - `suspend: true` 인 경우에만 `PodTemplateSpec` 안의 `containers[].resources` 필드가 업데이트될 수 있도록 API 서버에 새로운 검증 단계가 추가되었습니다.  
- **PodTemplateSpec 업데이트 허용 범위**  
  - `resources.requests`·`resources.limits` 외의 필드(예: 이미지, 명령어)는 기존과 동일하게 수정이 제한됩니다.  
- **API 버전**  
  - 기능은 `batch/v1` API 에 그대로 포함되며 별도의 베타 전용 API 버전은 존재하지 않습니다. (KEP‑5440) [출처](https://github.com/kubernetes/enhancements/issues/5440)  

## 컨트롤러와의 연동
- **큐 컨트롤러(Kueue 등) 구현 포인트**  
  - 컨트롤러는 Job 이 `suspend: true` 인지 확인 후, 현재 클러스터 가용 GPU/CPU 상황에 맞춰 `kubectl patch` 혹은 API 호출로 `resources` 를 조정합니다.  
- **CronJob 과의 호환성**  
  - CronJob 이 생성하는 Job 역시 `suspend` 플래그를 활용할 수 있어, 스케줄링 단계에서 자원 축소·확대가 가능합니다.  
- **기존 컨트롤러 호환성 체크리스트**  
  1. Job 생성 로직에 `suspend: true` 옵션을 명시했는지 확인  
  2. 자원 수정 로직이 `suspend` 상태를 검증하도록 업데이트  
  3. `kubectl edit`/`patch` 사용 시 RBAC 권한이 충분한지 검증  

## 자원 수정 방법
- **kubectl patch**  
  ```yaml
  kubectl patch job <job-name> --type='merge' -p '{"spec":{"template":{"spec":{"containers":[{"name":"trainer","resources":{"requests":{"example-hardware-vendor.com/gpu":"2"},"limits":{"example-hardware-vendor.com/gpu":"2"}}}]}}}'
  ```  
- **kubectl edit**  
  - `kubectl edit job <job-name>` 로 열어 `spec.template.spec.containers[].resources` 를 직접 편집 후 저장하면 자동으로 적용됩니다.  
- **YAML 매니페스트 업데이트 절차**  
  1. 기존 Job YAML 파일을 `suspend: true` 로 수정  
  2. `resources` 섹션을 원하는 값으로 변경  
  3. `kubectl apply -f <file.yaml>` 로 적용 (이미 존재하는 Job 은 `kubectl replace --force` 로 교체 불가, 반드시 `patch` 사용)  
- **자동화 파이프라인 팁**  
  - CI/CD 파이프라인에서 `kubectl patch` 를 사용해 사전 검증 단계에서 자원 조정을 수행하고, 최종 `kubectl resume` 로 Job 을 실행합니다.  

## 베스트 프랙티스
- **자원 변경 시점**  
  - 가능한 한 **Job 재개 직전**에 변경하여 스케줄러가 최신 요구량을 반영하도록 합니다.  
- **정책 설계 권고**  
  - 클러스터 전체 자원 사용량을 모니터링하고, 일정 임계치 초과 시 자동으로 `suspend` → `patch` → `resume` 흐름을 구현합니다.  
- **GPU 공유·메모리 스케일링 전략**  
  - GPU 가용량이 부족할 경우, `requests` 를 절반 수준으로 낮추고 `limits` 를 동일하게 유지해 오버커밋을 방지합니다.  
- **롤백·히스토리 관리**  
  - `kubectl get job <name> -o yaml` 로 현재 사양을 저장해 두고, 필요 시 원본 사양으로 `patch` 하여 롤백합니다.  

## v1.35 Alpha → v1.36 Beta 마이그레이션
- **마이그레이션 체크리스트**  
  1. 사용 중인 Kubernetes 버전이 v1.36 이상인지 확인  
  2. 기존 Alpha 기능을 사용한 Job 에 `apiVersion: batch/v1` 로 업데이트  
  3. `suspend` 플래그가 명시되어 있지 않다면 추가 (기본값은 `false`)  
  4. 컨트롤러 로직을 `suspend` 검증 로직에 맞게 수정  
- **Alpha 사용 시 주의점**  
  - Alpha 단계에서는 일부 검증이 느슨했으며, 베타에서는 stricter validation이 적용됩니다.  
- **호환성 테스트 방법**  
  - 테스트 클러스터에서 `kubectl create -f job-alpha.yaml` → `kubectl patch` 로 자원 변경 → `kubectl resume` 후 정상 실행 여부 확인  

## 보안 및 RBAC 고려사항
- **자원 수정 권한 제어**  
  - `resourcequotas` 와 `LimitRanges` 가 적용된 네임스페이스에서는 해당 한도 내에서만 `patch` 가 허용됩니다.  
  - RBAC 정책 예시: `apiGroups: ["batch"], resources: ["jobs"], verbs: ["patch", "get", "list"]` 로 제한된 사용자에게만 허용합니다.  
- **감사 로그·이벤트 추적**  
  - `kubectl patch` 로 발생한 `UPDATE` 이벤트는 `audit.log` 에 기록되며, `kubectl get events` 로 확인할 수 있습니다.  

## 제한 사항 및 알려진 이슈
- **지원되지 않는 자원 타입**  
  - 현재는 CPU·Memory·GPU·Extended Resources 만 지원되며, FPGA·TPU 등은 아직 포함되지 않았습니다.  
- **Beta 단계 이슈**  
  - 일부 클러스터 환경에서 `suspend:true` 상태가 아닌 Job 에 대해 `patch` 시 “field is immutable” 오류가 발생할 수 있습니다. 이 경우 Job 을 일시 중단(`kubectl patch ... {"spec":{"suspend":true}}`) 후 재시도하십시오.  

## 테스트 및 검증 가이드
- **단위·통합 테스트 예시**  
  - 컨트롤러 레벨: `Job` 객체를 `suspend:true` 로 생성 → `patch` 로 `resources` 변경 → `resume` 후 Pod 가 새로운 자원으로 실행되는지 검증  
- **클러스터 환경 검증 절차**  
  1. 테스트 네임스페이스에 `ResourceQuota` 설정  
  2. `suspend:true` Job 생성 → `kubectl patch` 로 GPU 수를 2 로 감소  
  3. `kubectl resume` 후 `kubectl describe pod` 로 실제 할당량 확인  
- **성능·안정성 테스트 포인트**  
  - 자원 변경 직후 스케줄러가 재평가하는 시간  
  - 대규모 Job(수천 개) 에서 `suspend`/`patch`/`resume` 흐름이 클러스터 API 서버에 미치는 부하  

## 관측성 및 메트릭
- **수정된 자원 메트릭 수집**  
  - `kube-apiserver` 의 `apiserver_request_total` 라벨에 `resource=jobs` 가 포함되어 있어 `PATCH` 요청 수를 모니터링합니다.  
- **이벤트·알림 권고사항**  
  - `Job` 객체에 `type: Normal, reason: ResourceUpdated` 이벤트가 생성되며, Alertmanager 와 연동해 자원 변경 시 알림을 받을 수 있습니다.  

## FAQ
- **Q1. Job 이 실행 중일 때도 자원을 바꿀 수 있나요?**  
  - No. `suspend` 가 `false` 인 경우 `resources` 필드는 immutable 합니다. 반드시 `suspend:true` 로 전환 후 수정해야 합니다.  
- **Q2. 기존에 `suspend:false` 로 만든 Job 을 바로 가변 자원 대상으로 전환할 수 있나요?**  
  - 기존 Job 을 `patch` 로 `suspend:true` 로 전환한 뒤, 자원을 수정하고 다시 `resume` 해야 합니다.  
- **Q3. CronJob 에서 자동으로 자원을 조정하려면 어떻게 해야 하나요?**  
  - CronJob 의 `spec.jobTemplate.spec.suspend` 를 `true` 로 설정하고, 스케줄러(예: Kueue)에서 `CronJob` 의 생성된 Job 에 대해 `patch` 로 자원을 조정한 뒤 `resume` 하면 됩니다.  

## 참고 자료
- 공식 블로그 포스트: *Kubernetes v1.36: Mutable Pod Resources for Suspended Jobs (beta)* – <https://kubernetes.io/blog/2026/04/27/kubernetes-v1-36-mutable-pod-resources-for-suspended-jobs/>  
- KEP‑5440: *Mutable Container Resources when Job is suspended* – <https://kep.k8s.io/5440>  
- GitHub Enhancement Issue #5440 – <https://github.com/kubernetes/enhancements/issues/5440>  
- KEP 구현 소스 트리 – <https://github.com/kubernetes/enhancements/tree/master/keps/sig-apps/5440-mutable-job-pod-resource-updates>  

---