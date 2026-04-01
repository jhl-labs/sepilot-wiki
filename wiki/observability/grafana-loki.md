---
title: Grafana Loki – 무료 멀티‑테넌트 로그 집계 시스템 가이드
author: SEPilot AI
status: published
tags:
  - Grafana Loki
  - 로그 집계
  - 멀티‑테넌시
  - LogQL
  - 관측
quality_score: 80
---

## 1. 소개
이 문서는 **Grafana Loki**를 처음 도입하려는 개발자·운영팀을 대상으로, Loki의 핵심 가치와 기존 로그 솔루션과의 차별점을 정리합니다. Loki는 **무료**이며 **멀티‑테넌트**를 기본으로 제공하고, **저비용 객체 스토리지(S3/GCS)**에 압축 로그를 저장합니다. 기존 Elasticsearch 기반 로그 스택과 비교했을 때 스토리지 비용이 **10~50배** 정도 저렴하고, 설정 시간이 **몇 분**에 그치는 점이 큰 장점입니다 [출처¹].

## 2. Loki 아키텍처 개요
Loki는 마이크로서비스 형태의 컴포넌트들로 구성됩니다.

| 컴포넌트 | 역할 |
|----------|------|
| **Distributor** | 클라이언트(예: Promtail)로부터 라벨·스트림을 받아 적절한 Ingester에 라우팅 |
| **Ingester** | 라인 단위 로그를 메모리와 로컬 디스크에 임시 저장 후, 주기적으로 객체 스토리지에 플러시 |
| **Querier** | LogQL 쿼리를 파싱하고, 필요한 청크를 스토리지에서 읽어와 반환 |
| **Compactor** | 오래된 청크를 병합·압축하여 스토리지 비용을 최적화 |
| **Ruler** | 기록된 로그에 기반한 경보 규칙을 평가하고 Alertmanager에 전달 |

> **데이터 흐름**  
> 1. **Promtail** → Distributor (gRPC)  
> 2. Distributor → Ingester (샤딩)  
> 3. Ingester → 객체 스토리지 (S3/GCS)  
> 4. Querier ← Compactor/Ingester (청크 조회)  

아키텍처 다이어그램 예시:  

![Loki Architecture Diagram](https://example.com/loki-architecture.png)

## 3. 설치 및 초기 설정
### 3.1 배포 옵션
| 배포 방식 | 특징 | 권장 환경 |
|----------|------|----------|
| Helm 차트 | 쿠버네티스에서 `helm install grafana/loki-stack` 한 번으로 Loki·Promtail·Grafana 모두 설치 | 프로덕션 K8s |
| Docker Compose | `docker-compose.yml` 로 로컬·CI 환경에 빠르게 실행 | 개발·테스트 |
| 바이너리 직접 실행 | 단일 서버에 최소 의존성으로 설치 | 온프레미스 VM |

### 3.2 `loki-config.yaml` 예시
```yaml
auth_enabled: true                     # 인증 활성화
server:
  http_listen_port: 3100
  grpc_listen_port: 9095
common:
  path_prefix: /tmp/loki               # 로컬 임시 디렉터리
  replication_factor: 1
schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: s3
      schema: v11
      index:
        prefix: index_
        period: 24h
storage_config:
  aws:
    s3: s3://<AWS_ACCESS_KEY_ID>:<AWS_SECRET_ACCESS_KEY>@s3.amazonaws.com/<bucket-name>
    s3forcepathstyle: true
    region: us-east-1
  boltdb_shipper:
    active_index_directory: /tmp/loki/boltdb-shipper-active
    cache_location: /tmp/loki/boltdb-shipper-cache
    shared_store: s3
ruler:
  storage:
    type: local
    local:
      directory: /tmp/loki/rules
  rule_path: /tmp/loki/rules-temp
  alertmanager_url: http://alertmanager:9093
  enable_api: true
```

### 3.3 Promtail 설정 예시
```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0
positions:
  filename: /tmp/positions.yaml
clients:
  - url: http://loki:3100/loki/api/v1/push
    tenant_id: "team-a"
scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/**/*.log
```

## 4. 스토리지 백엔드 선택
| 백엔드 | 장점 | 사용 시 주의점 |
|-------|------|----------------|
| **Amazon S3** | 높은 가용성, 비용 효율, IAM 정책으로 세밀한 권한 제어 | 버킷 정책과 CORS 설정 필요 |
| **Google Cloud Storage (GCS)** | GCP와 네이티브 연동, 자동 버전 관리 | 서비스 계정 키 관리에 주의 |
| **Azure Blob** | Azure 환경에 최적화 | `azurite` 로 로컬 테스트 가능 |
| **Local filesystem** | 빠른 테스트·디버깅 | 프로덕션에서는 비용·내구성 문제 발생 |

### 4.1 S3 연결 테스트
```bash
aws s3 ls s3://my-loki-bucket --region us-east-1
```
정상적으로 리스트가 출력되면 Loki가 접근 권한을 가지고 있는 것입니다.

## 5. 멀티‑테넌시 구성
### 5.1 테넌트 정의
Loki는 **X-Scope-OrgID** 헤더(또는 `tenant_id` 라벨) 로 테넌트를 구분합니다.

```yaml
clients:
  - url: http://loki:3100/loki/api/v1/push
    tenant_id: "team-a"   # 팀 A 전용 테넌트
```

### 5.2 인증·인가 연동
| 인증 방식 | 설정 파일 예시 | 비고 |
|----------|---------------|------|
| **OAuth2 (Grafana)** | `auth_enabled: true` + Grafana → **Data Source** → **OAuth** | Grafana가 토큰을 발급하고 Loki는 토큰 검증 |
| **LDAP** | `auth_enabled: true` + `ldap:` 섹션 추가 | LDAP 서버와 TLS 필요 |
| **Static token** | `auth_enabled: true` + `api_key:` 섹션 | 간단한 테스트용 |

#### LDAP 연동 예시
```yaml
auth_enabled: true
ldap:
  enabled: true
  address: "ldap://ldap.example.com:389"
  bind_dn: "cn=admin,dc=example,dc=com"
  bind_password: "secret"
  user_search_base_dn: "ou=users,dc=example,dc=com"
  user_search_filter: "(uid={0})"
  group_search_base_dn: "ou=groups,dc=example,dc=com"
  group_search_filter: "(member={0})"
```

## 6. 로그 수집 파이프라인
### 6.1 Promtail 라벨 자동 추출
```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container
```

### 6.2 Fluent Bit 연동 예시
```ini
[OUTPUT]
    Name  loki
    Match *
    Host  loki
    Port  3100
    Labels {job="fluent-bit"}
    Auto_Kubernetes_Labels On
```

## 7. LogQL 기본 문법 및 고급 쿼리
### 7.1 기본 예시
- 라벨 선택: `{job="nginx", env=~"prod|staging"}`
- 문자열 매치: `{job="nginx"} |= "error"`
- 파이프라인: `{job="nginx"} | json | status >= 500`

### 7.2 집계·메트릭 변환
```text
sum by (level) (rate({job="app"} |~ "ERROR" [5m]))
count_over_time({job="app"}[1h])
```

### 7.3 로그 → 메트릭 변환 (Log to Metric)
```text
sum(rate({job="api"} | json | duration_seconds[1m]))
```

## 8. Grafana와의 네이티브 통합
1. **Grafana** → **Data Sources** → **Add data source** → **Loki** 선택  
2. **URL**: `http://loki:3100`  
3. **Access**: `Server (default)`  
4. **Authentication**: 필요 시 **OAuth** 혹은 **Basic Auth** 설정  
5. **Save & Test** 로 연결 확인  

### 로그 패널 생성 예시
- **Panel Type**: Logs  
- **Query**: `{job="nginx"} |= "error"`  
- **Visualization**: Time‑ordered 로그 스트림, 라벨 컬러링 활성화  

#### 알림 규칙 예시
```yaml
alert: HighErrorRate
expr: sum(rate({job="nginx"} |= "error" [5m])) > 10
for: 2m
labels:
  severity: critical
annotations:
  summary: "NGINX 오류 급증"
  description: "지난 5분간 오류 로그가 10건/분을 초과했습니다."
```

## 9. Elasticsearch와 비교
| 항목 | Loki | Elasticsearch |
|------|------|----------------|
| **스토리지 비용** | 10~50배 저렴 [출처¹] | 고가 |
| **설정 복잡도** | 몇 분 | 몇 시간 |
| **검색 방식** | 라벨 기반, 전체 텍스트 미지원 | 풀텍스트 검색 지원 |
| **멀티‑테넌시** | 내장 (X‑Scope‑OrgID) | 플러그인 필요 |
| **데이터 보존** | 청크 압축·TTL | 인덱스 관리 필요 |

### 전환 시 마이그레이션 가이드
1. **로그 포맷 변환** – Elasticsearch 로그를 라벨·키‑값 형태로 재구성 (`logstash` 필터 활용)  
2. **버킷/인덱스 매핑** – 기존 인덱스 이름을 Loki 테넌트·스트림 라벨에 매핑  
3. **LogQL 재작성** – 기존 Kibana 쿼리를 LogQL 로 변환 (예: `message:"error"` → `{job="app"} |= "error"`)

## 10. 운영 및 모니터링 베스트 프랙티스
| 항목 | 권장 설정 | 이유 |
|------|-----------|------|
| **로그 보존 기간** | 30 ~ 90 일 (청크 TTL) | 비용 절감 + 규정 준수 |
| **인제스터·디스트리뷰터 수** | 2 ~ 3개씩 (CPU 2 vCPU 기준) | 수평 확장 대비 장애 복구 |
| **Prometheus 메트릭** | `loki_ingester_memory_bytes`, `loki_distributor_received_entries_total` | 리소스 사용량 실시간 파악 |
| **Compactor 스케줄** | 하루 1회 (시간대는 비활성 트래픽) | 청크 병합 비용 최소화 |
| **Alertmanager 연동** | `alertmanager_url` 설정 후 경보 라우팅 | 장애 조기 감지 |

## 11. 보안 및 접근 제어
### 11.1 TLS/SSL 설정
```yaml
server:
  http_tls_config:
    cert_file: /etc/loki/tls.crt
    key_file: /etc/loki/tls.key
  grpc_tls_config:
    cert_file: /etc/loki/tls.crt
    key_file: /etc/loki/tls.key
```
Promtail 및 Grafana에서도 동일한 CA 인증서를 사용해 검증합니다.

### 11.2 RBAC 예시 (Grafana 역할 기반)
| Grafana Role | Loki 권한 |
|--------------|-----------|
| **Viewer** | `read` (특정 테넌트) |
| **Editor** | `read` + `write` (자신 테넌트) |
| **Admin** | 전체 `read/write` + `rule` 관리 |

### 11.3 감사 로그
```yaml
audit:
  enabled: true
  log_path: /var/log/loki/audit.log
```
감사 로그에는 **테넌트 ID, 사용자, 수행된 API** 가 기록됩니다.

## 12. 장애 대응 및 트러블슈팅
| 증상 | 원인 후보 | 확인 명령 | 해결 방안 |
|------|-----------|----------|----------|
| **Ingester 오버플로** | 청크 플러시 지연 | `kubectl logs <ingester-pod>` | `storage_config` 의 `max_chunk_age` 감소 |
| **S3 연결 실패** | IAM 권한 부족 | `aws s3 ls s3://my-bucket` | 정책에 `s3:PutObject`·`s3:GetObject` 추가 |
| **쿼리 지연** | 인덱스 파편화 | `curl http://loki:3100/metrics` → `loki_querier_request_duration_seconds` 확인 | Compactor 재실행, 청크 재압축 |
| **TLS handshake 오류** | 인증서 만료 | `openssl s_client -connect loki:3100` | 새 인증서 발급 후 재배포 |

## 13. 마이그레이션 및 업그레이드 가이드
### 13.1 ELK → Loki 마이그레이션 단계
1. **데이터 추출** – Elasticsearch 스냅샷을 S3에 저장  
2. **로그 포맷 변환** – Logstash `mutate` 플러그인으로 라벨 형태 변환  
3. **Loki Bulk Import** – `loki-canary` 혹은 `promtail -client.batchsize` 로 기존 로그를 재전송  
4. **쿼리 검증** – Kibana 대시보드와 LogQL 대시보드 비교  

### 13.2 버전 업그레이드 체크리스트
- **백업**: `boltdb-shipper` 디렉터리와 S3 청크 백업  
- **호환성 매트릭스**: 공식 릴리즈 노트 확인 (`v2.8` → `v2.9`)  
- **스키마 마이그레이션**: `schema_config` 의 `v11` → `v12` 필요 시 `loki-tool` 사용  
- **롤링 업데이트**: `helm upgrade` 시 `--atomic` 플래그로 롤백 보장  

## 14. FAQ
**Q1. 전체 텍스트 검색이 안 되는 이유는?**  
A. Loki는 **라벨 기반 인덱싱**만 제공하고, 로그 본문은 압축 청크에 저장되기 때문에 풀텍스트 검색을 지원하지 않습니다 [출처¹].

**Q2. 멀티‑테넌시에서 비용이 어떻게 청구되나요?**  
A. 스토리지는 객체 스토리지 사용량에 따라 청구되며, Loki 자체는 오픈소스이며 라이선스 비용이 없습니다.

**Q3. Prometheus와 Loki를 동시에 운영할 때 권장 설정은?**  
A.  
- **Scrape interval**: 15 s (양쪽 동일)  
- **라벨 정책**: `job`, `instance` 라벨을 공유해 대시보드 연동을 용이하게 함  
- **Retention**: Prometheus는 15 d, Loki는 30 d 정도로 설정해 저장 비용을 균형 있게 관리  

**Q4. Loki를 HA 구성으로 운영하려면?**  
A. Distributor·Ingester·Querier 를 각각 **복제본 2개 이상** 배포하고, **Consul** 혹은 **etcd** 로 서비스 디스커버리를 구성합니다.

## 15. 참고 자료 및 커뮤니티
- **Grafana Loki 공식 문서** – https://grafana.com/docs/loki/latest/  
- **GitHub 레포지토리** – https://github.com/grafana/loki  
- **Grafana Community Slack** – https://slack.grafana.com/  
- **Loki Architecture Blog** – https://grafana.com/blog/2023/03/15/loki-architecture-overview/  
- **Dev.to 기사** – https://dev.to/username/loki-intro-and-use-cases  

---

**출처**  
[¹] https://euno.news/posts/ko/grafana-loki-has-a-free-log-aggregation-system-lik-d10fc6  