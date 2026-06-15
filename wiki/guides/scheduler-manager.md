---
title: Scheduler Manager – 스케줄러 전체 흐름 및 설정 가이드
author: SEPilot AI
status: draft
tags: [Scheduler, Scheduler Manager, 백그라운드 잡, 설정 가이드, 운영 가이드]
---

## 1. 문서 개요
**목적** – Scheduler Manager(백그라운드 잡을 조정·실행하는 핵심 엔진)의 전체 흐름, 설정 방법, 운영 시 고려사항을 한눈에 파악하도록 돕는다.  
**대상 독자** – 백엔드 개발자, 운영 엔지니어, 시스템 설계자 등 Scheduler Manager를 직접 구현·운용하거나 연동하려는 모든 기술 담당자.  
**문서 사용 방법** – 아래 목차 순서대로 읽으면 **개념 → 아키텍처 → 구현 상세 → 운영·디버깅** 순으로 이해할 수 있다. 각 섹션마다 **핵심 요약**, **주의사항**, **예시 코드**(인라인) 를 제공한다.

---

## 2. Scheduler Manager 소개
| 항목 | 내용 |
|------|------|
| **핵심 역할** | `Job`을 등록 → `Queue`에 삽입 → `Worker Pool`에 할당 → 실행 → 결과 저장·재시도 |
| **고가용성** | 워커 프로세스가 비정상 종료 시 남은 잡을 자동 재할당 |
| **동시성** | `workerCount`(기본 4) 만큼 병렬 실행, `maxConcurrentJobs` 로 개별 잡 동시 실행 제한 |
| **플러그인 구조** | `IQueue`, `IWorker`, `IStorage` 인터페이스 구현체를 DI(Dependency Injection) 방식으로 교체 가능 |

> **주의**: 아래 내용은 실제 `lib/scheduler/scheduler-manager.ts` 구현을 기반으로 정리했으며, 버전 업데이트 시 인터페이스가 변경될 수 있다.

---

## 3. 시스템 아키텍처
### 전체 흐름 다이어그램
<div class="mermaid">
graph TD
    SM[SchedulerManager] --> Q[JobQueue]
    Q --> WP[WorkerPool]
    WP --> JE[JobExecutor]
    JE --> RS[ResultStore]
    SM --> CFG[Config]
    SM --> LOG[Logger]
    LOG --> RS
</div>

- **SchedulerManager** (`src/lib/scheduler/scheduler-manager.ts`)  
  - `constructor(config: SchedulerConfig, logger: Logger, queue: IQueue, workers: IWorker[])`  
  - 주요 메서드: `registerJob`, `start`, `stop`, `pauseJob`, `resumeJob`
- **JobQueue** (`src/lib/scheduler/queue.ts`) – 기본 구현은 `InMemoryQueue`이며, `RedisQueue` 플러그인으로 교체 가능.  
- **WorkerPool** (`src/lib/scheduler/worker-pool.ts`) – 워커 인스턴스를 관리하고, `workerCount` 만큼 병렬 실행.  
- **ResultStore** (`src/lib/scheduler/result-store.ts`) – 성공/실패 결과를 `MongoResultStore`(기본) 혹은 사용자 정의 스토어에 저장.

---

## 4. 스케줄링 흐름 전체 과정
1. **잡 등록** – `scheduler.registerJob(jobDef)` 호출.  
2. **큐 삽입** – `queue.enqueue(job)` 로 우선순위·스케줄링 정책 적용.  
3. **워커 할당** – `workerPool.acquire()` 가 가능한 워커에 잡 전달.  
4. **실행** – 워커는 `execute(job)` 를 비동기로 수행하고 `Promise<JobResult>` 반환.  
5. **완료/재시도** – `ResultStore.save(result)` 후, 실패 시 `retryPolicy` 에 따라 재시도 혹은 `DLQ` 로 이동.

> **핵심 요약**: 모든 단계는 `async/await` 기반 비동기 흐름이며, 오류 발생 시 `try/catch` 로 잡을 재시도하거나 DLQ 로 라우팅한다.

---

## 5. 핵심 클래스 및 인터페이스
| 이름 | 파일 위치 | 주요 메서드 / 속성 | 비고 |
|------|-----------|-------------------|------|
| `SchedulerManager` | `src/lib/scheduler/scheduler-manager.ts` | `registerJob(def: JobDefinition)`, `start(): Promise<void>`, `stop(): Promise<void>` | 싱글톤으로 사용 권장 |
| `Job` | `src/lib/scheduler/job.ts` | `id: string`, `definition: JobDefinition`, `run(): Promise<JobResult>` | 내부 구현은 `JobExecutor`에 위임 |
| `JobDefinition` | `src/lib/scheduler/types.ts` | `name: string`, `handler: string`, `schedule?: CronExpression | number`, `priority?: number`, `maxRetries?: number` | `handler` 는 `require` 로 로드되는 모듈 경로 |
| `JobResult` | `src/lib/scheduler/types.ts` | `jobId: string`, `status: 'success' | 'failed'`, `output?: any`, `error?: Error` | `status` 로 메트릭 라벨링 |
| `SchedulerConfig` | `src/lib/scheduler/config.ts` | `workerCount: number`, `maxQueueSize: number`, `retryPolicy: RetryPolicy`, `logLevel: LogLevel` | 기본값은 `workerCount=4`, `maxQueueSize=1000` |
| `RetryPolicy` | `src/lib/scheduler/types.ts` | `maxAttempts: number`, `backoff: 'fixed' | 'exponential'`, `delayMs?: number` | `exponential` 일 경우 `delayMs` 은 초기 지연 |
| `IQueue` | `src/lib/scheduler/interfaces.ts` | `enqueue(job: Job): Promise<void>`, `dequeue(): Promise<Job | null>` | 플러그인 구현체: `InMemoryQueue`, `RedisQueue` |
| `IWorker` | `src/lib/scheduler/interfaces.ts` | `execute(job: Job): Promise<JobResult>` | 플러그인 구현체: `NodeWorker`, `DockerWorker` |

> **주의**: 인터페이스 이름 앞에 `I` 를 붙이는 것이 현재 코드 스타일이며, 향후 `abstract class` 로 전환될 가능성이 있다.

---

## 6. 잡 정의 및 등록 방법
### 잡 정의 파일 (YAML) 예시
```yaml
name: "daily-report"
handler: "./jobs/dailyReport.js"
schedule: "0 2 * * *"   # 매일 02:00 실행
priority: 2
maxRetries: 3
```

### `registerJob` API 시그니처 (인라인)
```typescript
registerJob(definition: JobDefinition): void
```

### 등록 예시 (인라인)
```typescript
import { SchedulerManager } from './lib/scheduler/scheduler-manager';
import config from './scheduler.config.json';

const scheduler = new SchedulerManager(config);
scheduler.registerJob({
  name: 'daily-report',
  handler: './jobs/dailyReport.js',
  schedule: '0 2 * * *',
  priority: 2,
  maxRetries: 3,
});
```

> **핵심 요약**: `handler` 경로는 Node.js `require` 로 로드되며, `schedule` 은 Cron 표현식 또는 밀리초 단위 `interval` 로 지정 가능하다.

---

## 7. 스케줄링 정책 및 옵션
| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `workerCount` | number | 4 | 워커 프로세스(또는 스레드) 수 |
| `maxConcurrentJobs` | number | 10 | 워커당 동시에 실행 가능한 잡 수 |
| `retryPolicy.maxAttempts` | number | 5 | 최대 재시도 횟수 |
| `retryPolicy.backoff` | `'fixed' \| 'exponential'` | `'exponential'` | 백오프 전략 |
| `retryPolicy.delayMs` | number | 1000 | `fixed` 백오프 시 기본 지연 |
| `queuePriorityEnabled` | boolean | true | 우선순위 기반 큐 사용 여부 |
| `deadLetterQueue.enabled` | boolean | true | DLQ 활성화 여부 |

> **주의**: `workerCount` 를 늘리면 시스템 메모리 사용량이 선형적으로 증가한다. 운영 환경에서는 CPU 코어 수와 메모리 한도를 고려해 설정한다.

---

## 8. 오류 처리 및 재시도 전략
1. **오류 유형 구분**  
   - `SystemError` (네트워크·디스크) → `retryPolicy` 적용  
   - `BusinessError` (도메인 검증) → 재시도 하지 않고 바로 실패 처리  
   - `TimeoutError` → `maxExecutionTimeMs` 초과 시 발생, 재시도 적용
2. **재시도 흐름**  
   - 첫 시도 → 실패 → `backoff` 계산 → `delayMs` 후 재시도 → `maxAttempts` 초과 시 DLQ 로 이동
3. **DLQ 구조**  
   - `deadLetterQueue` 는 별도 `InMemoryQueue` 혹은 `RedisList` 로 구현  
   - DLQ 항목은 `{ jobId, error, failedAt }` 형태로 저장

> **핵심 요약**: 재시도 정책은 `SchedulerConfig.retryPolicy` 로 전역 설정되며, 개별 잡은 `JobDefinition.maxRetries` 로 오버라이드 가능하다.

---

## 9. 로깅 및 모니터링
### 로그 포맷 (JSON)
```json
{
  "timestamp":"2024-06-15T12:34:56.789Z",
  "level":"info",
  "service":"scheduler",
  "jobId":"abc123",
  "event":"job_started",
  "handler":"./jobs/dailyReport.js"
}
```

| 레벨 | 설명 |
|------|------|
| `debug` | 워커 내부 상태, 큐 길이 변동 |
| `info` | 잡 시작·완료, 재시도 시도 |
| `warn` | 재시도 횟수 초과, DLQ 이동 |
| `error` | 시스템 오류, 예외 스택 트레이스 |

### 주요 메트릭 (Prometheus)
- `scheduler_queue_length{queue="default"}` – 현재 대기 중인 잡 수  
- `scheduler_job_execution_seconds{status="success"}` – 성공 잡 평균 실행 시간  
- `scheduler_job_execution_seconds{status="failed"}` – 실패 잡 평균 실행 시간  
- `scheduler_job_total{status="success"}` – 성공 잡 누적 카운트  
- `scheduler_job_total{status="failed"}` – 실패 잡 누적 카운트  
- `scheduler_worker_active{worker_id="0"}` – 워커 활성 여부 (1/0)

> **주의**: 메트릭 라벨은 `status`(success|failed)와 `queue` 로 구분한다. 대시보드에 적용할 때 라벨 조합을 정확히 매핑해야 알람이 정상 동작한다.

---

## 10. 설정 파일 및 환경 변수
### `scheduler.config.json` (실제 예시)
```json
{
  "workerCount": 6,
  "maxQueueSize": 2000,
  "maxConcurrentJobs": 12,
  "retryPolicy": {
    "maxAttempts": 4,
    "backoff": "exponential",
    "delayMs": 2000
  },
  "logLevel": "info",
  "deadLetterQueue": {
    "enabled": true,
    "maxRetentionDays": 7
  }
}
```

### 지원 환경 변수 (접두사 `SCHEDULER_`)
| 변수 | 타입 | 설명 |
|------|------|------|
| `SCHEDULER_WORKER_COUNT` | number | `workerCount` 를 오버라이드 |
| `SCHEDULER_LOG_LEVEL` | string | `logLevel` (debug, info, warn, error) |
| `SCHEDULER_QUEUE_MAX_SIZE` | number | `maxQueueSize` |
| `SCHEDULER_RETRY_MAX_ATTEMPTS` | number | `retryPolicy.maxAttempts` |
| `SCHEDULER_DEAD_LETTER_ENABLED` | boolean | DLQ 활성화 플래그 |

> **핵심 요약**: 환경 변수는 `process.env` 로 읽으며, 파일에 정의된 값보다 우선한다. 배포 파이프라인에서 `SCHEDULER_` 접두사를 이용해 동적 설정을 권장한다.

---

## 11. 테스트 및 디버깅
### 유닛 테스트 예시 (Jest, 인라인)
```typescript
test('registerJob adds job to queue', async () => {
  const scheduler = new SchedulerManager(testConfig);
  const jobDef = { name: 'test', handler: './jobs/mock.js' };
  scheduler.registerJob(jobDef);
  const queued = await scheduler.queue.peek();
  expect(queued?.definition.name).toBe('test');
});
```

### 통합 테스트 흐름
1. **테스트 전용 InMemoryQueue**와 **MockWorker** 로 초기화  
2. `scheduler.start()` → `registerJob` → `await waitForJobCompletion(jobId)`  
3. 결과 검증: `ResultStore.get(jobId).status === 'success'`

### 디버깅 팁
- **워커 레벨 로그**: `logger.debug({ jobId, state: 'acquired' })` 로 워커 할당 시점 추적  
- **Node Inspector**: `node --inspect-brk ./src/index.js` 로 브레이크포인트 설정  
- **큐 상태 확인**: `scheduler.queue.size()` 로 실시간 큐 길이 모니터링  
- **CLI 툴** (`scheduler-cli status`) – 현재 워커, 큐, DLQ 상태를 출력 (내장 명령)

> **주의**: 테스트 환경에서는 `process.env.NODE_ENV = 'test'` 로 설정하고, `scheduler.config.json` 의 `maxQueueSize` 를 100 이하로 제한하면 메모리 사용량을 최소화할 수 있다.

---

## 12. 확장 및 플러그인 개발
### 커스텀 워커 구현 예시 (인라인)
```typescript
class DockerWorker implements IWorker {
  async execute(job: Job): Promise<JobResult> {
    // Docker 컨테이너 실행 로직
    const result = await runContainer(job.definition.handler, job.payload);
    return { jobId: job.id, status: result.success ? 'success' : 'failed', output: result.output };
  }
}
```

### 플러그인 로딩 메커니즘
```typescript
const plugins = loadPluginsFrom('src/plugins');
plugins.forEach(p => scheduler.registerWorker(p));
```
- 플러그인 디렉터리는 `package.json` 의 `schedulerPlugins` 필드에 경로 배열로 선언한다.  
- 로딩 시 `require` 로 모듈을 가져와 `instanceof IWorker` 검증 후 등록한다.

> **핵심 요약**: 플러그인 인터페이스는 `IQueue`, `IWorker`, `IStorage` 로 제한되며, `SchedulerManager` 생성 시 DI 컨테이너에 전달한다.

---

## 13. 운영 가이드
### 배포 전 체크리스트
- ✅ `scheduler.config.json` 스키마 검증 (`npm run config:validate`)  
- ✅ 워커 수(`workerCount`)와 큐 크기(`maxQueueSize`)가 인프라 한도 내인지 확인  
- ✅ 재시도·DLQ 정책 테스트 (시뮬레이션 잡 5개)  
- ✅ 로그 레벨이 `info` 이상인지 확인 (디버그 로그는 프로덕션에서 비활성화)

### 무중단 롤링 업데이트 절차
1. **새 버전 배포** – 기존 워커는 `drain` 모드로 전환 후 현재 잡을 마무리  
2. **새 워커 시작** – `workerCount` 만큼 신규 프로세스 기동  
3. **트래픽 전환** – `scheduler.pauseNewJobs()` 로 신규 잡 수신을 일시 중단 → 기존 잡이 모두 완료되면 `resumeNewJobs()`  

### 장애 복구 시나리오
| 상황 | 조치 |
|------|------|
| 워커 프로세스 다운 | `systemctl restart scheduler-worker@<id>` 혹은 Kubernetes `pod` 재시작 |
| 큐 손상(데이터 손실) | 백업 파일(`queue.backup.json`) 로 `queue.restore()` 수행 |
| DLQ 누적 | `scheduler-cli dlq:replay <jobId>` 로 개별 재시도 또는 `dlq:purge` 로 정리 |

> **주의**: DLQ 재처리 시 동일 오류가 반복되지 않도록 `maxRetries` 를 검토하고, 원인 분석 로그를 반드시 남긴다.

---

## 14. FAQ
| 질문 | 답변 |
|------|------|
| **잡이 계속 재시도되는데 멈추지 않아요.** | `JobDefinition.maxRetries` 가 기본값(5)보다 크게 설정돼 있지 않은지 확인한다. `retryPolicy.backoff` 가 `exponential` 인 경우 `delayMs` 가 너무 작아 재시도가 빠르게 쌓일 수 있다. |
| **워커가 과부하 상태라 실행 지연이 발생합니다.** | `workerCount` 를 현재 CPU 코어 수보다 1~2배 정도 늘리거나, `maxConcurrentJobs` 를 낮춰 개별 워커당 부하를 제한한다. |
| **새 버전 배포 후 기존 잡이 실행되지 않아요.** | `scheduler.config.json` 의 스키마 버전(`configVersion`) 이 새 버전과 호환되는지 확인하고, 마이그레이션 스크립트(`npm run config:migrate`) 를 실행한다. |
| **DLQ에 쌓인 잡을 어떻게 재처리하나요?** | `scheduler-cli dlq:replay <jobId>` 로 개별 재시도하거나, `dlq:replay-all` 로 전체 재시도한다. 재시도 전 `maxRetries` 를 조정하는 것이 권장된다. |
| **테스트 환경에서 타이머 기반 잡이 실행되지 않아요.** | 테스트에서는 `process.env.NODE_ENV='test'` 일 때 `scheduler.enableCron` 플래그가 자동 비활성화된다. `scheduler.enableCron=true` 로 강제 활성화하거나, `interval` 기반 잡을 사용한다. |

---

## 15. 부록
### 용어 정의
- **Job** – Scheduler가 관리하는 작업 단위. `handler` 로 지정된 모듈을 실행한다.  
- **Worker** – Job을 실제 실행하는 프로세스·스레드. 플러그인 형태로 교체 가능.  
- **Queue** – 대기 중인 Job을 저장하는 자료구조. 기본은 `InMemoryQueue`.  
- **DLQ (Dead‑Letter Queue)** – 재시도 한계 초과 시 이동하는 별도 큐.  

### API 레퍼런스
| 메서드 | 파라미터 | 반환 | 설명 |
|--------|----------|------|------|
| `registerJob(def: JobDefinition)` | `JobDefinition` | `void` | 새 잡을 스케줄러에 등록 |
| `start()` | — | `Promise<void>` | 워커 풀 및 큐를 활성화 |
| `stop()` | — | `Promise<void>` | 현재 실행 중인 잡을 정리하고 종료 |
| `pauseNewJobs()` | — | `void` | 신규 잡 수신 일시 중단 |
| `resumeNewJobs()` | — | `void` | 일시 중단된 잡 수신 재개 |
| `getJobStatus(jobId: string)` | `jobId` | `JobResult` | 특정 잡의 현재 상태 조회 |

### 참고 문서
- **Scheduler Manager 0.1.1 공식 문서** – https://schedulemanager.readthedocs.io  
- **Node.js Worker Threads** – https://nodejs.org/api/worker_threads.html  
- **Prometheus Exporter 가이드** – https://prometheus.io/docs/instrumenting/exporters/  

---  

*본 가이드는 `lib/scheduler/scheduler-manager.ts` 구현을 기반으로 작성되었습니다. 최신 버전에서는 인터페이스와 설정 키가 변경될 수 있으니, 배포 전 반드시 소스 코드와 `README.md` 를 검증하십시오.*