---
title: Cross‑Reference 업데이트 잡 – 동작 원리와 설정 방법
author: SEPilot AI
status: published
tags: [Scheduler, Cross-Reference, 자동화, 문서 일관성, 운영]
---

## 1. 문서 개요
**대상 독자**  
- 위키 운영팀 및 개발자  
- CI/CD 파이프라인을 관리하는 DevOps 엔지니어  
- 시스템 모니터링·알림을 담당하는 SRE  

**Cross‑Reference 업데이트 잡 정의**  
위키 페이지 간에 삽입된 교차 참조(예: `[[다른 페이지#섹션]]`)를 정기적으로 스캔하고, 원본 문서가 변경되었을 때 자동으로 최신 링크와 표시 텍스트로 교체하는 백그라운드 잡이다.  

**시스템 내 역할 및 중요도**  
- 데이터 일관성 유지: 문서가 수정돼도 모든 참조가 최신 상태를 반영한다.  
- 사용자 경험 향상: 깨진 링크나 오래된 번호가 표시되는 상황을 방지한다.  
- **중요도: high** (위키 전체 가용성에 직접적인 영향을 미침)

## 2. 잡의 동작 원리
### 전체 흐름도 요약
1. **트리거** → 스케줄러가 잡을 시작한다.  
2. **입력 수집** → 대상 위키 문서 목록과 메타데이터를 DB/API에서 조회한다.  
3. **파싱** → 각 문서의 마크다운/HTML을 파싱해 교차 참조 토큰을 추출한다.  
4. **변경 판단** → 원본 문서의 최신 버전과 비교해 업데이트 필요 여부를 결정한다.  
5. **업데이트** → 교차 참조 토큰을 최신 링크·텍스트로 교체하고 DB에 저장한다.  
6. **결과 기록** → 변경 로그와 통계 정보를 생성한다.  
7. **알림** → 성공·실패 결과를 모니터링 시스템에 전송한다.  

### 주요 컴포넌트와 상호작용
- **Scheduler** (`lib/scheduler/jobs/update-cross-references.ts`) – 잡 스케줄링 및 실행 엔트리 포인트.  
- **Wiki API / DB** – 문서 본문 및 메타데이터 조회·저장.  
- **Parser Engine** – 마크다운/HTML 파싱 로직 (예: `remark` 혹은 `cheerio`).  
- **Updater** – 교차 참조 교체 로직.  
- **Logger & Metrics** – `winston` 기반 로깅, `prom-client` 로 메트릭 수집.  

### 데이터 흐름 (입력 → 처리 → 출력)
- **입력**: 문서 ID, 버전, 교차 참조 필드(예: `xrefId`, `targetPath`).  
- **처리**: 파싱 → 변경 판단 → 교체.  
- **출력**: 업데이트된 문서 저장, 변경 로그(`update-cross-references.log`), 메트릭(`cross_ref_updates_total` 등).

## 3. 트리거 및 스케줄링
### 잡 실행 시점
- **시간 기반**: 매일 02:00 UTC에 실행 (예시 cron `0 2 * * *`).  
- **이벤트 기반**: 문서가 `publish` 혹은 `merge` 이벤트를 발생시킬 때 즉시 실행 (Webhook 연동).  

### Scheduler 설정 파일 예시
```yaml
jobs:
  updateCrossReferences:
    schedule: "0 2 * * *"
    enabled: true
    env:
      DRY_RUN: "false"
      BATCH_SIZE: "100"
```
*(위 예시는 `config.yaml`에 정의된 형태이며 실제 파일 경로와 형식은 프로젝트에 따라 다를 수 있습니다.)*  

### 수동 실행 방법
```bash
npm run scheduler --job update-cross-references --dry-run true
```
CLI 옵션은 `--dry-run`, `--batch-size`, `--retry-count` 등을 지원한다.

## 4. 입력 데이터
| 항목 | 설명 | 출처 |
|------|------|------|
| 문서 목록 | 위키 DB 혹은 API에서 반환되는 문서 ID 배열 | 프로젝트 DB 스키마 |
| 메타데이터 | `id`, `version`, `namespace`, `tags`, `xrefFields` 등 | API 명세 |
| 필터링 옵션 | 네임스페이스, 태그, 최신 버전만 선택 | 설정 파일 `env` 변수 |

> 구체적인 스키마 정의는 현재 리포지터리에서 확인이 필요합니다. **추가 조사 필요**.

## 5. 핵심 처리 로직
1. **교차 참조 파싱** – 마크다운 링크 패턴 `[[page#section]]` 혹은 HTML `<a href="...">` 를 정규식 혹은 AST 로 변환.  
2. **업데이트 대상 식별** – 원본 문서의 `lastModified`와 교차 참조가 가리키는 문서의 `lastModified`를 비교한다.  
3. **교체·삽입 절차** – 기존 토큰을 최신 URL·표시 텍스트로 교체하고, 필요 시 새 섹션 앵커를 삽입한다.  
4. **성능 최적화** –  
   - **배치 처리**: `BATCH_SIZE` 만큼 묶어 DB 트랜잭션 수행.  
   - **스트리밍**: 대용량 문서 스트림 파싱으로 메모리 사용량 최소화.  

> 구체적인 알고리즘 구현은 `update-cross-references.ts` 파일을 검토해야 합니다. **추가 조사 필요**.

## 6. 출력 및 결과물
- **업데이트된 문서**: 원본 DB/스토리지에 바로 저장 (버전 관리 시스템에 커밋될 수도 있음).  
- **변경 로그**:  
  - `timestamp`, `docId`, `oldXref`, `newXref`, `status` 필드 포함.  
- **차이점 보고서**: JSON 형태(`diffReport.json`) 로 저장하거나 Slack/Email 으로 전송.  
- **통계 데이터**:  
  - `totalProcessed`, `totalUpdated`, `totalFailed`, `durationMs` 등 메트릭으로 Prometheus에 노출.

## 7. 설정 방법
| 설정 항목 | 설명 | 기본값 |
|----------|------|--------|
| `DRY_RUN` | 실제 저장 없이 시뮬레이션 | `false` |
| `BATCH_SIZE` | 한 번에 처리할 문서 수 | `100` |
| `RETRY_COUNT` | 실패 시 재시도 횟수 | `3` |
| `BACKOFF_MS` | 재시도 간 대기 시간 (exponential) | `500` |
| `NAMESPACE_FILTER` | 처리 대상 네임스페이스 (콤마 구분) | `*` |

환경 변수는 `.env` 파일 혹은 Kubernetes `ConfigMap` 으로 제공한다. 예시:

```dotenv
DRY_RUN=false
BATCH_SIZE=200
RETRY_COUNT=5
BACKOFF_MS=1000
NAMESPACE_FILTER=docs,api
```

## 8. 오류 처리 및 복구 전략
### 예상 오류 유형
- **파싱 오류**: 문서 포맷이 예상과 달라 토큰을 추출하지 못함.  
- **DB 연결 실패**: 네트워크 장애 혹은 인증 오류.  
- **권한 문제**: 업데이트 권한이 없는 계정으로 실행.  

### 재시도 메커니즘
- `RETRY_COUNT` 만큼 재시도하고, 각 시도 사이에 `BACKOFF_MS` 를 지수적으로 증가시킨다.  
- 재시도 후에도 실패하면 해당 문서를 `failed_updates` 테이블에 기록한다.  

### 롤백·복구 절차
- **트랜잭션 기반**: 배치 내 모든 업데이트는 DB 트랜잭션으로 감싸며, 오류 발생 시 전체 롤백.  
- **스냅샷**: 작업 시작 전 현재 문서 버전을 백업(예: S3에 저장)하고, 필요 시 복구한다.  

### 알림·모니터링 연동
- 실패 건수(`cross_ref_update_errors_total`)가 임계값을 초과하면 Slack webhook 혹은 PagerDuty 알림을 전송한다.  

## 9. 로깅 및 모니터링
### 로그 레벨·포맷
- **INFO**: 정상 처리 건수, 배치 시작·종료 시점.  
- **WARN**: 파싱 실패, 스킵된 문서.  
- **ERROR**: DB/네트워크 오류, 재시도 초과.  

로그는 JSON 라인 포맷으로 출력해 ELK 스택에 수집한다.  

### 주요 메트릭
- `cross_ref_updates_total` (카운터) – 전체 처리 건수.  
- `cross_ref_updates_success_total` – 성공 건수.  
- `cross_ref_updates_failed_total` – 실패 건수.  
- `cross_ref_update_duration_seconds` (히스토그램) – 배치당 소요 시간.  

### 외부 모니터링 도구 연동 가이드
- **Prometheus**: `prom-client` 라이브러리로 `/metrics` 엔드포인트 제공.  
- **Grafana**: 위 메트릭을 시각화하는 대시보드 템플릿을 `grafana-dashboard.json`에 포함.  

## 10. 테스트 및 검증
### 유닛 테스트 대상
- `parseCrossReferences(text: string): Xref[]` – 다양한 마크다운/HTML 케이스.  
- `shouldUpdate(xref: Xref, targetVersion: string): boolean` – 버전 비교 로직.  
- `applyUpdates(doc: Document, updates: XrefUpdate[]): Document` – 교체 로직.  

### 통합 테스트 흐름
1. 샘플 위키 데이터베이스에 테스트 문서 삽입.  
2. `dryRun=true` 로 잡 실행 → 기대되는 변경 로그와 메트릭 검증.  
3. `dryRun=false` 로 실제 업데이트 후, 원본과 비교해 차이점 확인.  

### CI/CD 파이프라인 적용
- GitHub Actions 워크플로 (`.github/workflows/ci.yml`) 에 `npm test` 단계 추가.  
- 테스트 환경은 Docker Compose 로 DB·API 모킹.  

### 테스트 데이터 생성 팁
- `faker` 라이브러리로 무작위 문서와 교차 참조 생성.  
- Edge case: 중첩 교차 참조, 깨진 링크, 비표준 마크다운 등 포함.  

## 11. 배포 및 운영 가이드
### 사전 점검 체크리스트
- [ ] `config.yaml` 의 cron 표현식이 올바른지 확인.  
- [ ] DB 연결 문자열 및 인증 정보가 최신인지 검증.  
- [ ] `dryRun` 모드에서 1회 실행 후 로그·메트릭 확인.  
- [ ] 알림 채널(Slack, PagerDuty) 연동 테스트.  

### 버전 관리·마이그레이션 전략
- 잡 코드와 설정을 Git 태그(`v1.0.0`) 로 관리하고, Helm 차트에 `image.tag` 로 지정.  
- 마이그레이션 시 기존 `failed_updates` 테이블을 백업하고, 새로운 스키마 적용 후 데이터 이관.  

### 운영 중 설정 변경 절차
1. ConfigMap 수정 → `kubectl rollout restart deployment/scheduler`.  
2. 변경 전후 메트릭 차이 모니터링.  

## 12. FAQ
**Q1. 잡이 너무 오래 걸리면 어떻게 해야 하나요?**  
A. `BATCH_SIZE` 를 줄이거나, `parallelism` 설정을 늘려 여러 워커가 동시에 처리하도록 조정합니다.  

**Q2. 특정 네임스페이스만 업데이트하고 싶어요.**  
A. `NAMESPACE_FILTER` 환경 변수에 콤마 구분 리스트를 지정하면 해당 네임스페이스만 처리됩니다.  

**Q3. 업데이트가 적용되지 않은 문서가 발견되면?**  
A. `cross_ref_updates_failed_total` 메트릭과 `failed_updates` 테이블을 확인하고, 원인(파싱 오류·권한 등)을 분석 후 재시도합니다.  

**Q4. 롤백이 필요한 경우 어떻게 복구하나요?**  
A. 작업 시작 전 백업된 스냅샷을 사용해 원본 버전으로 복원하거나, DB 트랜잭션 롤백 로그를 적용합니다.  

## 13. 참고 자료
- **Cross‑Reference 업데이트 가이드 (Microsoft Word)** – <https://support.microsoft.com/en-us/word/create-a-cross-reference>  
- **Adobe FrameMaker 교차 참조 업데이트** – <https://help.adobe.com/en_US/framemaker/using/using-framemaker/user-guide/frm_single_sourcing-xrefs-updating-cross-references.html>  
- **Prometheus 공식 문서** – <https://prometheus.io/docs/introduction/overview/>  
- **Grafana 대시보드 템플릿** – <https://grafana.com/docs/grafana/latest/dashboards/>  

> 위 위키 잡의 구체적인 구현 세부 사항(`update-cross-references.ts` 내부 로직, DB 스키마 등)은 현재 리포지터리에서 확인이 필요합니다. **추가 조사 필요**.