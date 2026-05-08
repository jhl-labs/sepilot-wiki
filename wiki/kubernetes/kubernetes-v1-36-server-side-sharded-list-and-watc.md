---
title: Kubernetes v1.36 – Server‑Side Sharded List and Watch
author: SEPilot AI
status: published
tags: [Kubernetes, v1.36, Server‑Side Sharding, List, Watch, Scalability]
---

## 개요
- **기능 소개**: Kubernetes v1.36에서는 고카디널리티 리소스(Pod 등)를 감시하는 컨트롤러가 대규모 클러스터에서 겪는 스케일링 한계를 해소하기 위해 **Server‑Side Sharded List & Watch** 기능을 도입했습니다.  
- **배경**: 수만 노드 규모의 클러스터에서는 각 컨트롤러 복제본이 API 서버로부터 전체 이벤트 스트림을 받아 CPU·메모리·네트워크 비용이 급증합니다. 기존의 클라이언트‑사이드 샤딩은 이벤트 전송량을 줄이지 못해 비용 절감에 한계가 있었습니다.  
- **버전 위치**: 이 기능은 **Alpha** 단계이며 KEP‑5866에 의해 정의되었습니다【출처: Kubernetes Blog】.  
- **대상 독자**: 클러스터 운영자, 컨트롤러 개발자, 플랫폼 엔지니어 등 서버‑사이드 샤딩을 적용하고자 하는 모든 기술 담당자.

## 확장성 문제와 기존 접근 방식
- **스케일링 벽**: 수만 노드 클러스터에서 컨트롤러가 `Pod`와 같은 고카디널리티 리소스를 감시하면, 복제본 수(N) × 전체 이벤트 스트림 크기 만큼의 네트워크 대역폭과 CPU가 소모됩니다. 이는 “복제본을 늘려도 per‑replica 비용이 감소하지 않는다”는 현상으로 이어집니다【출처: Kubernetes Blog】.  
- **클라이언트‑사이드 샤딩**: 일부 컨트롤러(kube‑state‑metrics 등)는 각 복제본에 키스페이스의 일부를 할당하고, 자신에게 해당되지 않는 객체를 폐기합니다. 하지만 **전송량 자체는 감소하지 않으며**, 모든 복제본이 전체 이벤트를 수신·디시리얼라이즈한 뒤 버리기 때문에 네트워크와 CPU 비용이 그대로 남습니다【출처: Kubernetes Blog】.  

## Server‑Side Sharded List & Watch 개념
- **핵심 해결점**: 필터링을 API 서버 단계에서 수행함으로써, 각 컨트롤러 복제본이 자신이 담당하는 해시 범위에 해당하는 객체만 전송받게 됩니다.  
- **샤드 선택자(`shardSelector`)**: `ListOptions`에 추가된 필드로, 클라이언트가 자신이 소유한 해시 구간을 명시합니다.  
- **해시 범위(`shardRange`)**: `shardRange(object.metadata.uid, '0x0000000000000000', '0x8000000000000000')` 형태로 호출되며, 64‑bit FNV‑1a 해시를 사용해 지정된 UID(또는 다른 필드)의 해시값이 `[start, end)` 구간에 들어가는지 판단합니다【출처: Kubernetes Blog】.  

## 아키텍처 및 동작 흐름
1. **컨트롤러 복제본**이 시작될 때 자신이 담당할 해시 구간을 계산하고 `shardSelector`에 전달합니다.  
2. **API 서버**는 요청을 수신하면 `ListOptions.shardSelector`를 확인하고, 대상 객체의 지정된 필드에 대해 **deterministic 64‑bit FNV‑1a** 해시를 계산합니다.  
3. 해시값이 요청된 구간에 포함되는 경우에만 **List 응답** 혹은 **Watch 이벤트**를 반환합니다.  
4. 결과적으로 **네트워크 트래픽**은 복제본 수와 무관하게 **샤드 크기**에 비례하게 감소합니다.  

> *위 흐름도는 공식 문서에 포함된 다이어그램을 참고해 구현할 수 있습니다.*  

## API 변경 사항
- `ListOptions`에 **`shardSelector`** 필드가 추가되었습니다.  
- **`shardRange()`** 함수 시그니처 (예시):
  ```
  shardRange(uid string, start string, end string) ShardSelector
  ```
- `List`와 `Watch` 모두 동일한 필터링 메커니즘을 사용합니다.  

### 사용 예시 (Go)
    import (
        "k8s.io/apimachinery/pkg/apis/meta/v1"
    )
    
    // 컨트롤러 복제본이 담당할 해시 구간 정의
    selector := v1.ShardRange(
        "0x0000000000000000", // start
        "0x8000000000000000", // end
    )
    
    // List 호출에 shardSelector 적용
    pods, err := client.CoreV1().Pods("").List(context.TODO(), v1.ListOptions{
        ShardSelector: selector,
    })
    
    // Watch 호출에 동일하게 적용
    watch, err := client.CoreV1().Pods("").Watch(context.TODO(), v1.ListOptions{
        ShardSelector: selector,
    })

## 기능 활성화 방법
1. **Feature Gate** 설정  
   - API 서버와 컨트롤러 실행 시 `--feature-gates=ServerSideSharding=true` 플래그를 추가합니다.  
2. **버전 호환성 체크리스트**  
   - Kubernetes v1.36 이상이어야 함.  
   - 클라이언트 라이브러리(k8s.io/client-go) 버전이 `v0.30.0` 이상인지 확인합니다.  
3. **API 서버 플래그** (예시)  
   ```
   --runtime-config=api/all=true
   --enable-admission-plugins=NodeRestriction,ServerSideSharding
   ```

## 컨트롤러 구현 가이드
1. **샤드 범위 계산**  
   - 일반적으로 `object.metadata.uid`를 해시 입력으로 사용합니다.  
   - 전체 해시 공간을 복제본 수(N)만큼 균등하게 나누어 `start = i * (2^64/N)`, `end = (i+1) * (2^64/N)` 형태로 정의합니다.  
2. **기존 클라이언트‑사이드 샤딩 코드와 차이점**  
   - 기존: `if hash(uid) % N != replicaIndex { continue }` → 모든 이벤트를 수신 후 필터링.  
   - 신규: `shardRange(uid, start, end)`을 `ListOptions`에 전달 → API 서버가 필터링.  
3. **샘플 코드 (Go)**
    ```
    // replicaIndex와 replicaCount는 환경 변수 또는 ConfigMap에서 읽어옴
    replicaIndex := 0
    replicaCount := 4
    
    // 64‑bit 해시 공간을 replicaCount 로 나눔
    maxHash := uint64(0xffffffffffffffff)
    shardSize := maxHash / uint64(replicaCount)
    start := fmt.Sprintf("0x%016x", uint64(replicaIndex)*shardSize)
    end   := fmt.Sprintf("0x%016x", (uint64(replicaIndex)+1)*shardSize)
    
    selector := v1.ShardRange(start, end)
    
    // List & Watch에 적용
    pods, _ := client.CoreV1().Pods("").List(ctx, v1.ListOptions{ShardSelector: selector})
    watch, _ := client.CoreV1().Pods("").Watch(ctx, v1.ListOptions{ShardSelector: selector})
    ```

## 성능 및 운영 영향
- **네트워크 트래픽 감소**: 복제본당 전송되는 이벤트 수가 전체 샤드 크기에 비례하게 감소합니다(구체적인 수치는 Alpha 단계이므로 추후 베타에서 제공될 예정).  
- **CPU·메모리 절감**: 디시리얼라이즈 및 폐기 작업이 API 서버에서 수행되므로 컨트롤러 복제본당 CPU 사용량이 감소합니다.  
- **샤드 크기 조정**: `replicaCount`를 늘리면 각 샤드가 작아져 전송량이 더 줄어들지만, API 서버의 해시 계산 부하가 약간 증가할 수 있습니다. 운영 환경에 맞춰 적절히 조정합니다.

## 모니터링 및 트러블슈팅
- **주요 메트릭**  
  - `apiserver_shard_watch_events_total` – 샤드별 전송된 Watch 이벤트 수.  
  - `apiserver_shard_list_objects_total` – 샤드별 List 응답 객체 수.  
- **로그 포인트**  
  - API 서버 로그에 `shardSelector` 파싱 및 해시 매칭 결과가 기록됩니다.  
  - 컨트롤러 로그에 `Shard range: [start, end)` 와 같은 디버그 메시지를 남기도록 권장합니다.  
- **일반적인 문제**  
  - **잘못된 해시 범위**: 시작값이 종료값보다 크면 모든 이벤트가 필터링되지 않아 빈 스트림이 발생합니다.  
  - **버전 미일치**: 클라이언트와 API 서버가 서로 다른 Feature Gate 상태이면 요청이 거부됩니다.  
  - **RBAC 제한**: 샤드 선택에 사용되는 필드(`metadata.uid`)에 대한 `get` 권한이 없으면 403 오류가 발생합니다.

## 마이그레이션 가이드
1. **기존 클라이언트‑사이드 샤딩 비활성화**  
   - 코드에서 `if hash%N != idx { continue }` 로직을 주석 처리합니다.  
2. **Server‑Side Sharding 적용**  
   - 위 “컨트롤러 구현 가이드”에 따라 `shardSelector`를 설정하고, Feature Gate를 활성화합니다.  
3. **점진적 롤아웃**  
   - 먼저 테스트 클러스터에서 1~2개의 복제본에 적용하고, 메트릭(`apiserver_shard_*`)을 모니터링합니다.  
   - 문제가 없으면 전체 컨트롤러 복제본에 확대합니다.  
4. **롤백 절차**  
   - `--feature-gates=ServerSideSharding=false` 로 API 서버와 컨트롤러를 재시작하면 기존 클라이언트‑사이드 샤딩으로 복구됩니다.  

## 보안 및 RBAC 고려사항
- **샤드 선택 시 권한 검증**: `shardSelector` 자체는 권한 검증을 요구하지 않지만, 실제 객체에 접근하기 위해서는 기존과 동일하게 해당 리소스에 대한 `get/list/watch` 권한이 필요합니다.  
- **RBAC 충돌 여부**: 샤드 범위가 리소스 레벨이 아닌 해시 레벨이므로 기존 RBAC 정책과 충돌하지 않으며, 별도 정책 추가가 필요 없습니다.  
- **감사 로그(Audit)**: `audit.k8s.io` API 서버 감사 정책에 `requestReceivedTimestamp`와 `responseStatus`를 포함하도록 설정하면, 샤드 기반 요청을 추적할 수 있습니다.

## 제한 사항 및 알려진 이슈
- **Alpha 단계**이므로 **프로덕션 사용에 권장되지 않음**(버그 및 API 변경 가능).  
- 현재 **Pod**와 **Node**와 같은 고카디널리티 리소스에만 적용 가능하며, 일부 CRD는 아직 지원되지 않습니다【출처: Kubernetes Blog】.  
- **버그**: 특정 해시 구간이 비어 있을 경우 Watch가 즉시 종료되는 현상이 보고되었습니다. 회피 방법으로는 구간을 겹치게 설정하거나, 빈 구간에 대해 재시도 로직을 구현합니다.

## 향후 로드맵
- **Beta** 전환 예정(예정일은 KEP‑5866 로드맵을 참고).  
- **추가 기능**:  
  - 다중 샤드 조합(복제본이 여러 샤드에 걸쳐 이벤트를 수신)  
  - 동적 샤드 재배치(클러스터 규모 변화에 따라 자동 조정)  

## FAQ
**Q1. 샤드 범위는 어떻게 결정하나요?**  
A: 전체 64‑bit 해시 공간을 복제본 수(N)로 균등하게 나누어 `start = i * (2^64/N)`, `end = (i+1) * (2^64/N)` 로 계산합니다.  

**Q2. 멀티‑컨트롤러 환경에서 충돌을 방지하는 방법은?**  
A: 각 컨트롤러는 고유한 `replicaIndex`를 사용해 서로 다른 해시 구간을 할당받아야 합니다. 동일한 구간을 공유하면 중복 이벤트가 발생합니다.  

**Q3. 성능 테스트 결과는 어디서 확인할 수 있나요?**  
A: 현재 Alpha 단계이므로 공식 벤치마크는 제공되지 않았습니다. 베타 릴리즈 시 `apiserver_shard_*` 메트릭과 함께 공개될 예정입니다【출처: Kubernetes Blog】.

## 참고 자료
- **공식 블로그 포스트**: [Kubernetes v1.36: Server‑Side Sharded List and Watch](https://kubernetes.io/blog/2026/05/06/kubernetes-v1-36-server-side-sharded-list-and-watch/)  
- **KEP‑5866**: Server‑Side Sharded List & Watch (Alpha) – GitHub에서 KEP 문서 확인  
- **관련 GitHub 이슈/PR**: `k/kubernetes#XXXXX` (샤드 선택자 구현 PR)  
- **추가 학습**: Kubernetes SIG Architecture 발표 자료, “Scaling Controllers at Massive Scale” 세션 (2025 KubeCon)  

*본 문서는 현재 공개된 자료를 기반으로 작성되었으며, 향후 기능이 GA로 전환될 경우 내용이 업데이트될 수 있습니다.*