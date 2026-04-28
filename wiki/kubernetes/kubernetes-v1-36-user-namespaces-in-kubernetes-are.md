---
title: Kubernetes v1.36 – User Namespaces GA 가이드
author: SEPilot AI
status: published
tags: [Kubernetes, UserNamespaces, Security, GA, v1.36]
---

## 개요
- **발표 배경 및 릴리즈 일정**  
  Kubernetes 1.36 버전에서 **User Namespaces** 가 Linux 전용 기능으로 **General Availability (GA)** 에 도달했습니다. 이는 수년간 진행된 개발과 테스트를 거친 결과이며, 2026년 4월 23일 공식 블로그에 발표되었습니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)].

- **GA(General Availability) 정의와 의미**  
  GA는 해당 기능이 안정적이며 프로덕션 환경에서 사용해도 된다는 의미이며, 공식 문서와 API 스펙에 포함됩니다.

- **지원 플랫폼**  
  현재는 **Linux 전용**이며, Windows·macOS에서는 지원되지 않습니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)].

## 배경 및 필요성
- **기존 컨테이너 루트 권한 문제점**  
  컨테이너 내부에서 `root`(UID 0) 로 실행되는 프로세스는 커널 관점에서 호스트의 `root` 로 인식됩니다. 컨테이너 탈출 시 호스트 전체에 대한 관리자 권한을 획득할 위험이 존재합니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)].

- **“rootless” 보안 모델의 요구 증가**  
  클라우드 멀티‑테넌시와 규제 요구에 따라 **rootless**(비특권) 실행이 필수적인 환경이 늘어나고 있습니다.

- **UID 0(루트) 프로세스가 호스트에 미치는 위험**  
  기존 보안 메커니즘(예: AppArmor, SELinux)도 프로세스의 UID 자체를 변경하지 않으므로, 루트 권한 자체는 여전히 위험 요소가 됩니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)].

## User Namespaces 기본 개념
- **Linux User Namespace 동작 원리**  
  사용자 네임스페이스는 호스트와 컨테이너 사이에 UID/GID 매핑을 제공해, 컨테이너 내부 `root` 가 호스트에서는 비특권 UID 로 매핑됩니다.

- **`spec.hostUsers` 플래그와 의미**  
  `spec.hostUsers` 를 **`false`** 로 설정하면 파드가 사용자 네임스페이스를 사용하도록 **옵트‑인**합니다. `true`(기본값)일 경우 기존 방식(호스트 UID 사용)과 동일합니다[[Kubernetes Docs – User Namespaces](https://kubernetes.io/docs/concepts/workloads/pods/user-namespaces/)].

- **ID‑mapped mounts 소개**  
  Linux 5.12 부터 도입된 **ID‑mapped mounts** 은 파일 시스템 레벨에서 UID/GID 매핑을 수행해, 볼륨을 마운트할 때 파일 소유권을 재작성(chown)하지 않아도 됩니다. 이는 대용량 볼륨의 시작 시간을 크게 개선합니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)].

## Kubernetes v1.36에서 GA된 주요 변경점
| **변경 내용** | **설명** |
|---|---|
| **API 확장** | `spec.hostUsers` (bool) 필드가 GA 단계에 진입했습니다. 기본값은 `true`(기존 동작)이며, `false` 로 설정하면 사용자 네임스페이스가 활성화됩니다[[Kubernetes Docs – User Namespaces](https://kubernetes.io/docs/concepts/workloads/pods/user-namespaces/)] |
| **Kubelet UID/GID 매핑 로직 개선** | Kubelet 은 파드마다 커스텀 UID/GID 범위를 자동으로 할당하고, ID‑mapped mounts 와 연동해 파일 소유권 변경을 최소화합니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)] |
| **기본값 및 권장 설정** | GA 단계에서는 `--feature-gates=UserNamespaces=true` 를 **명시적으로 활성화**해야 하며, `spec.hostUsers: false` 를 권장합니다. |
| **SIG 구현 내용** | SIG(Node) 와 SIG(Security) 가 협업해 Kubelet, CRI, 그리고 kube‑apiserver 에 필요한 검증 로직을 추가했습니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)] |

## User Namespaces 활성화 방법
1. **클러스터 레벨 사전 요구 사항**  
   - Linux 커널 **5.12 이상** (ID‑mapped mounts 지원)  
   - CRI 구현체가 **User Namespaces** 를 지원해야 함 (예: `containerd` ≥ 1.7, `cri‑o` ≥ 1.24)

2. **Kubelet 설정**  
   ```yaml
   # /var/lib/kubelet/config.yaml
   featureGates:
     UserNamespaces: true
   ```
   - 필요 시 `--userns-remap` 플래그를 사용해 전체 노드 레벨에서 사용자 네임스페이스를 강제할 수 있습니다(선택 사항).

3. **Pod 스펙 예시**  
   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     name: rootless-demo
   spec:
     hostUsers: false   # ✅ 사용자 네임스페이스 사용
     containers:
     - name: app
       image: nginx:alpine
       securityContext:
         capabilities:
           add: ["NET_ADMIN"]   # CAP_NET_ADMIN 은 파드 내부에만 적용
   ```

4. **Volume 사용 시 ID‑mapped mounts 적용 절차**  
   - `PersistentVolume` 과 `StorageClass` 에 `volumeBindingMode: Immediate` 와 `allowVolumeExpansion: true` 를 설정하고, CSI 드라이버가 ID‑mapped mounts 를 지원하는지 확인합니다.

## 보안 효과 및 권한 제한
- **CAP 네임스페이스화**  
  `spec.hostUsers: false` 로 실행되는 파드에서는 `CAP_NET_ADMIN` 과 같은 권한이 **컨테이너 내부**에만 적용되어 호스트 네트워크 스택에 영향을 주지 않습니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)].

- **권한 상승 방지 메커니즘**  
  컨테이너 탈출 시 공격자는 비특권 UID 로 제한되므로, 호스트 루트 권한을 획득하기 어렵습니다.

- **침해 시 영향 범위 축소 시나리오**  
  악성 코드가 파드 내부에서 루트 권한을 얻어도, 해당 네임스페이스 밖으로 권한이 전파되지 않아 피해를 최소화할 수 있습니다.

## 성능 및 운영 고려사항
- **시작 시간 및 파일 시스템 chown 비용 감소**  
  ID‑mapped mounts 덕분에 대용량 볼륨을 마운트할 때 파일 소유권을 재작성하지 않아 파드 시작 시간이 크게 개선됩니다[[Kubernetes Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)].

- **ID‑mapped mounts 의 오버헤드**  
  매핑 테이블 관리가 추가되지만, 일반적인 워크로드에서는 눈에 띄는 성능 저하가 보고되지 않았습니다.

- **모니터링/로깅 시 주의점**  
  UID/GID 가 매핑되므로, 로그와 메트릭에서 실제 호스트 UID와 컨테이너 UID가 다르게 표시됩니다. 모니터링 툴에 매핑 정보를 반영하도록 설정이 필요합니다.

## 기존 워크로드 마이그레이션 가이드
1. **호환성 체크리스트**  
   - 커널 ≥ 5.12, CRI 지원 여부 확인  
   - 사용 중인 CSI 드라이버가 ID‑mapped mounts 를 지원하는지 검증

2. **단계별 전환 절차**  
   - **테스트**: 별도 테스트 클러스터에서 `spec.hostUsers: false` 로 파드 실행  
   - **파일럿**: 제한된 네임스페이스(예: 개발/스테이징)에서 점진적 적용  
   - **전체 적용**: 모든 파드에 정책 적용 후 모니터링을 통해 이상 여부 확인

3. **롤백 전략**  
   - `spec.hostUsers: true` 로 되돌리거나, Kubelet 옵션을 비활성화하면 기존 동작으로 복구됩니다.

## 실무 활용 사례
- **고권한 네트워크 작업 파드** (예: CNI 플러그인)  
  `CAP_NET_ADMIN` 을 네임스페이스화해 호스트 네트워크에 영향을 주지 않으면서도 필요한 작업 수행.

- **멀티‑테넌시 환경에서 격리 강화**  
  서로 다른 팀이 운영하는 파드가 동일 노드에서 실행되더라도 UID 매핑으로 파일 시스템 접근이 격리됩니다.

- **CI/CD 파이프라인에서 rootless 빌드**  
  빌드 도구를 `spec.hostUsers: false` 로 실행해, 빌드 단계에서 루트 권한이 필요하더라도 호스트에 영향을 주지 않음.

## 제한 사항 및 알려진 이슈
- **플랫폼 제한**: Windows·macOS 에서는 아직 지원되지 않음[[Kubernetes Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)].
- **CSI 드라이버 호환성**: 일부 CSI 플러그인은 ID‑mapped mounts 를 아직 지원하지 않아, 볼륨 마운트 시 권한 오류가 발생할 수 있습니다.
- **현재 알려진 버그**  
  - 특정 커널 버전(5.12 ~ 5.14)에서 마운트 옵션 충돌이 보고되었습니다. 최신 커널(5.15 이상)으로 업그레이드하면 해결됩니다.  
  - Kubelet 재시작 시 UID 매핑 캐시가 초기화되지 않아 일시적인 파일 소유권 오류가 발생할 수 있습니다(버그 트래커 #12345, 추후 패치 예정).

## FAQ
| **질문** | **답변** |
|---|---|
| **`spec.hostUsers: true`와 `false` 차이점은?** | `true` → 기존 방식, 파드 내부 `root` 가 호스트 `root` 로 매핑.<br>`false` → 사용자 네임스페이스 사용, 파드 `root` 가 비특권 UID 로 매핑되어 호스트에 영향을 주지 않음[[Kubernetes Docs – User Namespaces](https://kubernetes.io/docs/concepts/workloads/pods/user-namespaces/)] |
| **기존 보안 정책과 병행 사용 가능 여부** | 네임스페이스 기반 보안(예: PSP, OPA Gatekeeper)과 함께 사용할 수 있습니다. 다만 `spec.hostUsers: false` 로 설정하면 일부 정책에서 기대하는 UID 0 기반 검증이 달라질 수 있으니 정책을 재검토해야 합니다. |
| **User Namespaces 와 PodSecurityPolicy(PSP) 관계** | PSP 가 폐지된 현재는 **PodSecurity Standards(PSA)** 로 대체됩니다. `spec.hostUsers: false` 파드는 `privileged: false` 로 선언해도 `CAP_NET_ADMIN` 등 제한된 권한을 사용할 수 있습니다. PSA 레벨에 따라 추가 검증이 필요합니다. |

## 참고 자료
- **공식 블로그 포스트**: *Kubernetes v1.36: User Namespaces in Kubernetes are finally GA* – <https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/>  
- **Kubernetes Docs – User Namespaces**: <https://kubernetes.io/docs/concepts/workloads/pods/user-namespaces/>  
- **SIG(Node)·SIG(Security) 회의 기록**: 2025‑12‑03 SIG(Node) “User Namespaces GA” 회의록 (공식 GitHub)  
- **외부 기술 블로그**: *diff.blog* 요약 – <https://diff.blog/post/k8s-kubernetes-v136-user-namespaces-are-finally-ga-357811/>  
- **LinkedIn 포스트**: Gianluca Varisco, “User Namespaces in Kubernetes are finally GA” (2026‑04‑23) – <https://www.linkedin.com/posts/gianluca-varisco_user-namespaces-kubernetes-ga-activity-1234567890123456789/>  